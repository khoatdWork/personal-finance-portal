from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


IncomeType = Literal["fixed", "daily", "freelance", "other"]
CreatedFrom = Literal["web", "telegram"]


class IncomeBase(BaseModel):
    amount: float
    source: str = Field(min_length=1)
    income_type: IncomeType
    earned_at: datetime
    note: str | None = None


class IncomeCreate(IncomeBase):
    created_from: CreatedFrom = "web"
    telegram_message_id: str | None = None
    telegram_chat_id: str | None = None
    raw_input: str | None = None


class IncomeResponse(BaseModel):
    id: str
    amount: float
    source: str
    income_type: str
    earned_date: str
    earned_time: str
    earned_at: str
    note: str | None
    created_from: str
    telegram_message_id: str | None
    telegram_chat_id: str | None
    raw_input: str | None
    created_at: str
    updated_at: str


class IncomeListResponse(BaseModel):
    items: list[IncomeResponse]
    total: int
    limit: int
    offset: int
