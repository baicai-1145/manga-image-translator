import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

DB_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DB_DIR / "tasks.db"

_LOCK = threading.Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                mode TEXT,
                config TEXT,
                queue_position INTEGER,
                result_path TEXT,
                error TEXT,
                meta TEXT,
                created_at TEXT NOT NULL,
                started_at TEXT,
                finished_at TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)"
        )


def _serialize_json(value: Optional[Dict[str, Any]]) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def create_task(
    task_id: str,
    user_id: str,
    mode: str,
    config: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    now = _utc_now()
    payload = (
        task_id,
        user_id,
        "queued",
        mode,
        _serialize_json(config),
        None,
        None,
        None,
        _serialize_json(meta),
        now,
        None,
        None,
        now,
    )
    with _LOCK:
        with _get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO tasks (
                    id,
                    user_id,
                    status,
                    mode,
                    config,
                    queue_position,
                    result_path,
                    error,
                    meta,
                    created_at,
                    started_at,
                    finished_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                payload,
            )


def update_task(
    task_id: str,
    *,
    status: Optional[str] = None,
    queue_position: Optional[int] = None,
    result_path: Optional[str] = None,
    error: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
    started_at: Optional[str] = None,
    finished_at: Optional[str] = None,
) -> None:
    fields: List[str] = []
    values: List[Any] = []
    if status is not None:
        fields.append("status = ?")
        values.append(status)
    if queue_position is not None:
        fields.append("queue_position = ?")
        values.append(queue_position)
    if result_path is not None:
        fields.append("result_path = ?")
        values.append(result_path)
    if error is not None:
        fields.append("error = ?")
        values.append(error)
    if meta is not None:
        fields.append("meta = ?")
        values.append(_serialize_json(meta))
    if started_at is not None:
        fields.append("started_at = ?")
        values.append(started_at)
    if finished_at is not None:
        fields.append("finished_at = ?")
        values.append(finished_at)

    if not fields:
        return

    fields.append("updated_at = ?")
    values.append(_utc_now())
    values.append(task_id)

    query = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"

    with _LOCK:
        with _get_connection() as conn:
            conn.execute(query, tuple(values))


def list_tasks(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    with _LOCK:
        with _get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT
                    id,
                    user_id,
                    status,
                    mode,
                    config,
                    queue_position,
                    result_path,
                    error,
                    meta,
                    created_at,
                    started_at,
                    finished_at,
                    updated_at
                FROM tasks
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, limit),
            )
            rows = cursor.fetchall()
    return [_row_to_dict(row) for row in rows]


def get_task(user_id: str, task_id: str) -> Optional[Dict[str, Any]]:
    with _LOCK:
        with _get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT
                    id,
                    user_id,
                    status,
                    mode,
                    config,
                    queue_position,
                    result_path,
                    error,
                    meta,
                    created_at,
                    started_at,
                    finished_at,
                    updated_at
                FROM tasks
                WHERE user_id = ? AND id = ?
                """,
                (user_id, task_id),
            )
            row = cursor.fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    data = dict(row)  # type: ignore[arg-type]
    for key in ("config", "meta"):
        if data.get(key):
            try:
                data[key] = json.loads(data[key])
            except json.JSONDecodeError:
                data[key] = None
        else:
            data[key] = None
    return data
