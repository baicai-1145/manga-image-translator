import asyncio
import builtins
import io
import pickle
import re
from base64 import b64decode
from datetime import datetime, timezone
from typing import Union
from uuid import uuid4

import requests
from PIL import Image
from fastapi import HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from manga_translator import Config
from server.myqueue import BatchQueueElement, QueueElement, task_queue, wait_in_queue
from server.storage import create_task, update_task
from server.streaming import stream


def _timestamp_safe() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_user_id(req: Request) -> str:
    header = req.headers.get("X-User-Id")
    if header and header.strip():
        return header.strip()
    cookie_user = req.cookies.get("mt-user-id")
    if cookie_user:
        return cookie_user
    client = req.client
    if client:
        return f"ip:{client.host}"
    return "anonymous"

class TranslateRequest(BaseModel):
    """This request can be a multipart or a json request"""
    image: bytes|str
    """can be a url, base64 encoded image or a multipart image"""
    config: Config = Config()
    """in case it is a multipart this needs to be a string(json.stringify)"""

class BatchTranslateRequest(BaseModel):
    """Batch translation request"""
    images: list[bytes|str]
    """List of images, can be URLs, base64 encoded strings, or binary data"""
    config: Config = Config()
    """Translation configuration"""
    batch_size: int = 4
    """Batch size, default is 4"""

async def to_pil_image(image: Union[str, bytes]) -> Image.Image:
    try:
        if isinstance(image, builtins.bytes):
            image = Image.open(io.BytesIO(image))
            return image
        else:
            if re.match(r'^data:image/.+;base64,', image):
                value = image.split(',', 1)[1]
                image_data = b64decode(value)
                image = Image.open(io.BytesIO(image_data))
                return image
            else:
                response = requests.get(image)
                image = Image.open(io.BytesIO(response.content))
                return image
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


async def get_ctx(req: Request, config: Config, image: str|bytes):
    image = await to_pil_image(image)

    user_id = resolve_user_id(req)
    task_id = uuid4().hex
    req.state.current_task_id = task_id
    try:
        config_dump = config.model_dump(mode="json")
    except Exception:
        config_dump = None
    create_task(
        task_id=task_id,
        user_id=user_id,
        mode="single",
        config=config_dump,
        meta={"stream": False},
    )

    task = QueueElement(req, image, config, 0, task_id, user_id)
    task_queue.add_task(task)

    return await wait_in_queue(task, None)

async def while_streaming(req: Request, transform, config: Config, image: bytes | str):
    image = await to_pil_image(image)

    user_id = resolve_user_id(req)
    task_id = uuid4().hex
    req.state.current_task_id = task_id
    try:
        config_dump = config.model_dump(mode="json")
    except Exception:
        config_dump = None
    task_meta = {"stream": True}
    create_task(
        task_id=task_id,
        user_id=user_id,
        mode="stream",
        config=config_dump,
        meta=task_meta,
    )

    task = QueueElement(req, image, config, 0, task_id, user_id)
    task_queue.add_task(task)

    messages = asyncio.Queue()

    def notify_internal(code: int, data: bytes) -> None:
        if code == 0:
            ctx = pickle.loads(data)
            debug_folder = getattr(ctx, "debug_folder", None)
            meta = {"debug_folder": debug_folder, **task_meta} if debug_folder else task_meta
            update_task(
                task_id,
                status="completed",
                finished_at=_timestamp_safe(),
                result_path=debug_folder,
                meta=meta,
            )
            result_bytes = transform(ctx)
            encoded_result = b"\x00" + len(result_bytes).to_bytes(4, "big") + result_bytes
            messages.put_nowait(encoded_result)
        else:
            if code == 2:
                update_task(
                    task_id,
                    status="failed",
                    error=data.decode("utf-8", "ignore"),
                    finished_at=_timestamp_safe(),
                )
            elif code == 3:
                try:
                    queue_pos = int(data.decode("utf-8"))
                    update_task(task_id, queue_position=queue_pos)
                except ValueError:
                    pass
            messages.put_nowait(code.to_bytes(1, "big") + len(data).to_bytes(4, "big") + data)

    streaming_response = StreamingResponse(stream(messages), media_type="application/octet-stream")
    streaming_response.headers["X-Task-Id"] = task_id
    asyncio.create_task(wait_in_queue(task, notify_internal))
    return streaming_response

async def get_batch_ctx(req: Request, config: Config, images: list[str|bytes], batch_size: int = 4):
    """Process batch translation request"""
    # Convert images to PIL Image objects
    pil_images = []
    for img in images:
        pil_img = await to_pil_image(img)
        pil_images.append(pil_img)
    
    # Create batch task
    user_id = resolve_user_id(req)
    task_id = uuid4().hex
    req.state.current_task_id = task_id
    try:
        config_dump = config.model_dump(mode="json")
    except Exception:
        config_dump = None
    create_task(
        task_id=task_id,
        user_id=user_id,
        mode="batch",
        config=config_dump,
        meta={"stream": False, "total_images": len(pil_images), "batch_size": batch_size},
    )

    batch_task = BatchQueueElement(req, pil_images, config, batch_size, task_id, user_id)
    task_queue.add_task(batch_task)
    
    return await wait_in_queue(batch_task, None)
