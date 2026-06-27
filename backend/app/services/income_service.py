import logging
from datetime import date
from typing import Any

from fastapi import HTTPException

from app.schemas.income import IncomeCreate
from app.services.google_sheets_service import sheets_service
from app.utils.datetime_utils import iso, now_local, normalize_local
from app.utils.id_utils import income_id

logger = logging.getLogger(__name__)


class IncomeService:
    def create_income(self, data: IncomeCreate) -> dict[str, Any]:
        earned = normalize_local(data.earned_at)
        now = now_local()
        record = {
            "id": income_id(),
            "amount": data.amount,
            "source": data.source.strip(),
            "income_type": data.income_type,
            "earned_date": earned.strftime("%Y-%m-%d"),
            "earned_time": earned.strftime("%H:%M"),
            "earned_at": iso(earned),
            "note": data.note,
            "created_from": data.created_from,
            "telegram_message_id": data.telegram_message_id,
            "telegram_chat_id": data.telegram_chat_id,
            "raw_input": data.raw_input,
            "created_at": iso(now),
            "updated_at": iso(now),
        }
        sheets_service.append_income(record)
        logger.info("Income created from %s", record["created_from"])
        return record

    def list_income(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
        income_type: str | None = None,
        created_from: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        rows = sheets_service.get_income_rows()
        if from_date:
            rows = [row for row in rows if row.get("earned_date") and row["earned_date"] >= from_date.isoformat()]
        if to_date:
            rows = [row for row in rows if row.get("earned_date") and row["earned_date"] <= to_date.isoformat()]
        if income_type:
            rows = [row for row in rows if row.get("income_type") == income_type]
        if created_from:
            rows = [row for row in rows if row.get("created_from") == created_from]
        rows = sorted(rows, key=lambda row: row.get("earned_at") or "", reverse=True)
        return {"items": rows[offset:offset + limit], "total": len(rows), "limit": limit, "offset": offset}

    def get_income_by_id(self, income_id: str) -> dict[str, Any]:
        record = sheets_service.find_income_by_id(income_id)
        if not record:
            raise HTTPException(status_code=404, detail="Không tìm thấy khoản thu")
        return record

    def create_income_from_telegram(self, parsed_data: dict[str, Any], telegram_context: dict[str, Any]) -> dict[str, Any]:
        data = IncomeCreate(
            **parsed_data,
            created_from="telegram",
            telegram_message_id=str(telegram_context["message_id"]),
            telegram_chat_id=str(telegram_context["chat_id"]),
            raw_input=telegram_context["raw_input"],
        )
        return self.create_income(data)


income_service = IncomeService()
