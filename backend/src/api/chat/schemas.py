from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    type: Literal["message", "join", "leave"]
    room_id: str
    username: str
    text: str
    timestamp: datetime
