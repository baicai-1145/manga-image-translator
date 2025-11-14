#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minimal API test for server/main.py

Features:
- Optionally spawn the API server (uvicorn) as a subprocess
- Health check on "/" and "/queue-size"
- Test translate endpoints:
  * /translate/with-form/json (multipart)
  * /translate/json (base64 data URL)
  * /translate/image (PNG stream)
- Task endpoints:
  * /api/tasks
  * /api/tasks/{id}

Defaults choose a lightweight config to avoid downloading heavy models:
- translator.none + detector.none
- server launched with --models-ttl=60 to disable eager preloading
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

import requests


def wait_for_http_ok(url: str, timeout: int = 60, interval: float = 0.5) -> None:
    start = time.time()
    last_err: Optional[Exception] = None
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=5)
            if r.status_code < 500:
                return
        except Exception as e:
            last_err = e
        time.sleep(interval)
    raise RuntimeError(f"Server not responding at {url} within {timeout}s; last_err={last_err}")


def spawn_server(host: str, port: int, extra: list[str]) -> subprocess.Popen:
    cmd = [
        sys.executable,
        "server/main.py",
        "--host", host,
        "--port", str(port),
        "--models-ttl", "60",
        "--ignore-errors",
    ] + extra
    print("Spawning:", " ".join(cmd))
    # run from repo root
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def b64_data_url(img_bytes: bytes, mime: str = "image/jpeg") -> str:
    return f"data:{mime};base64," + base64.b64encode(img_bytes).decode("ascii")


def main():
    parser = argparse.ArgumentParser(description="Test API for server/main.py")
    parser.add_argument("--host", default="127.0.0.1", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--no-spawn", action="store_true", help="Do not spawn server, assume it's already running")
    parser.add_argument("--image", default="test.jpg", help="Image path to use for tests")
    parser.add_argument("--detector", default="none", help="Detector to use in config (e.g., none|default|rapidocr)")
    parser.add_argument("--ocr", default=None, help="OCR to use in config (e.g., ocr48px|mocr|rapidocr). If omitted, keep default.")
    parser.add_argument("--translator", default="none", help="Translator to use (e.g., none|original|sugoi)")
    parser.add_argument("--timeout", type=int, default=90, help="Wait timeout seconds for server readiness and requests")
    args, extra = parser.parse_known_args()

    base = f"http://{args.host}:{args.port}"
    proc: Optional[subprocess.Popen] = None
    log_tail: list[str] = []
    try:
        if not args.no_spawn:
            proc = spawn_server(args.host, args.port, extra)
            # Background log collector (best-effort)
            start = time.time()
            while time.time() - start < 5 and proc and proc.poll() is None:
                line = proc.stdout.readline() if proc.stdout else ""
                if not line:
                    break
                log_tail.append(line.rstrip())

        # Wait for readiness
        wait_for_http_ok(f"{base}/", timeout=args.timeout)
        wait_for_http_ok(f"{base}/queue-size", timeout=args.timeout)
        print("[OK] server ready")

        # Prepare config (lightweight)
        cfg = {
            "translator": {"translator": args.translator},
            "detector": {"detector": args.detector},
        }
        if args.ocr:
            cfg["ocr"] = {"ocr": args.ocr}

        # Locate image
        img_path = Path(args.image)
        if not img_path.exists():
            # try repo root fallbacks
            for p in [Path("test.jpg"), Path("test1.jpeg")]:
                if p.exists():
                    img_path = p
                    break
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found: {args.image}")

        # 1) form-data json
        with img_path.open("rb") as f:
            files = {"image": (img_path.name, f, "image/jpeg")}
            data = {"config": json.dumps(cfg, ensure_ascii=False)}
            r = requests.post(f"{base}/translate/with-form/json", files=files, data=data, timeout=args.timeout)
        assert r.status_code == 200, f"form/json failed: {r.status_code} {r.text[:200]}"
        task_id = r.headers.get("X-Task-Id", "")
        payload = r.json()
        assert "translations" in payload and isinstance(payload["translations"], list)
        print(f"[OK] /translate/with-form/json, task_id={task_id}, translations={len(payload['translations'])}")

        # 2) json with data URL
        img_bytes = img_path.read_bytes()
        data_url = b64_data_url(img_bytes, "image/jpeg")
        r2 = requests.post(
            f"{base}/translate/json",
            json={"image": data_url, "config": cfg},
            timeout=args.timeout,
        )
        assert r2.status_code == 200, f"json failed: {r2.status_code} {r2.text[:200]}"
        task_id2 = r2.headers.get("X-Task-Id", "")
        payload2 = r2.json()
        assert "translations" in payload2 and isinstance(payload2["translations"], list)
        print(f"[OK] /translate/json, task_id={task_id2}, translations={len(payload2['translations'])}")

        # 3) image stream
        r3 = requests.post(
            f"{base}/translate/image",
            json={"image": data_url, "config": cfg},
            timeout=args.timeout,
            stream=True,
        )
        assert r3.status_code == 200, f"image failed: {r3.status_code}"
        assert r3.headers.get("content-type", "").startswith("image/png")
        chunk = next(r3.iter_content(chunk_size=1024))
        assert chunk, "empty image stream"
        print(f"[OK] /translate/image, received PNG stream chunk={len(chunk)} bytes")

        # 4) queue size
        q = requests.post(f"{base}/queue-size", timeout=args.timeout)
        assert q.status_code == 200
        print(f"[OK] /queue-size => {q.json()}")

        # 5) tasks list + detail
        t = requests.get(f"{base}/api/tasks", timeout=args.timeout)
        assert t.status_code == 200 and isinstance(t.json(), list)
        print(f"[OK] /api/tasks => {len(t.json())} tasks")
        if task_id2:
            t2 = requests.get(f"{base}/api/tasks/{task_id2}", timeout=args.timeout)
            assert t2.status_code == 200
            print(f"[OK] /api/tasks/{task_id2} => status={t2.json().get('status')}")

        print("\nAll tests passed.")

    finally:
        if proc and proc.poll() is None:
            try:
                # Graceful shutdown
                if os.name == "nt":
                    proc.terminate()
                else:
                    os.kill(proc.pid, signal.SIGINT)
                try:
                    proc.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    proc.kill()
            except Exception:
                proc.kill()
        if log_tail:
            print("\n--- server startup logs (tail) ---")
            for line in log_tail[-20:]:
                print(line)


if __name__ == "__main__":
    main()
