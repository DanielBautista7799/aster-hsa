import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.enums import CardStatus
from app.schemas.common import RequestModel


class CardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_id: uuid.UUID
    last_four: str
    status: CardStatus
    created_at: datetime


class CardStatusUpdate(RequestModel):
    status: CardStatus
