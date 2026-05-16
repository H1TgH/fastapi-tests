from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.history: dict[str, list[str]] = {}

    async def connect(self, websocket: WebSocket, room_id: str) -> None:
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
            self.history[room_id] = []
        self.active_connections[room_id].append(websocket)

    async def disconnect(self, websocket: WebSocket, room_id: str) -> None:
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: str, message: str) -> None:
        self.history[room_id].append(message)
        for connection in self.active_connections.get(room_id, []):
            await connection.send_text(message)

    def get_history(self, room_id: str, limit: int = 50) -> list[str]:
        return self.history.get(room_id, [])[-limit:]


manager = ConnectionManager()
