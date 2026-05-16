from datetime import datetime, UTC

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.chat.manager import manager
from api.chat.schemas import ChatMessage


chat_router = APIRouter(tags=["chat"])


@chat_router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, username: str):
    await manager.connect(websocket, room_id)

    join_msg = ChatMessage(
        type="join",
        room_id=room_id,
        username=username,
        text="",
        timestamp=datetime.now(UTC),
    )
    await manager.broadcast(room_id, join_msg.model_dump_json())

    try:
        while True:
            data = await websocket.receive_text()
            msg = ChatMessage(
                type="message",
                room_id=room_id,
                username=username,
                text=data if isinstance(data, str) else data,
                timestamp=datetime.now(UTC),
            )

            try:
                import json
                payload = json.loads(data)
                msg = ChatMessage(
                    type="message",
                    room_id=room_id,
                    username=username,
                    text=payload.get("text", data),
                    timestamp=datetime.now(UTC),
                )
            except Exception:
                pass

            await manager.broadcast(room_id, msg.model_dump_json())

    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_id)
        leave_msg = ChatMessage(
            type="leave",
            room_id=room_id,
            username=username,
            text="",
            timestamp=datetime.now(UTC),
        )
        await manager.broadcast(room_id, leave_msg.model_dump_json())


@chat_router.get("/rooms/{room_id}/history")
async def get_history(room_id: str, limit: int = 50):
    history = manager.get_history(room_id, limit)
    return {"room_id": room_id, "messages": history}