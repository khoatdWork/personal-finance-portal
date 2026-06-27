from datetime import date
from typing import Any

from fastapi import HTTPException

from app.schemas.expense import ExpenseCategory, ExpenseCreate, FixedExpense
from app.services.google_sheets_service import sheets_service
from app.utils.datetime_utils import iso, now_local
from app.utils.id_utils import expense_category_id, expense_id, fixed_expense_id

class ExpenseService:
    def create_expense(self, data: ExpenseCreate) -> dict[str, Any]:
        record = {
            "id": expense_id(),
            "date": data.date.isoformat(),
            "time": data.time.strftime("%H:%M"),
            "amount": data.amount,
            "category": data.category,
            "expense_type": data.expense_type,
            "description": data.description,
            "payment_method": data.payment_method,
            "source": data.source,
            "created_at": iso(now_local()),
        }
        return sheets_service.append_row("expenses", record)

    def list_expenses(self, from_date: date | None, to_date: date | None, category: str | None, source: str | None, limit: int, offset: int) -> dict[str, Any]:
        rows = sheets_service.get_rows("expenses")
        if from_date:
            rows = [row for row in rows if row.get("date") and row["date"] >= from_date.isoformat()]
        if to_date:
            rows = [row for row in rows if row.get("date") and row["date"] <= to_date.isoformat()]
        if category:
            rows = [row for row in rows if row.get("category") == category]
        if source:
            rows = [row for row in rows if row.get("source") == source]
        rows = sorted(rows, key=lambda row: f"{row.get('date') or ''} {row.get('time') or ''}", reverse=True)
        return {"items": rows[offset:offset + limit], "total": len(rows), "limit": limit, "offset": offset}

    def get_expense(self, record_id: str) -> dict[str, Any]:
        record = sheets_service.find_by_id("expenses", record_id)
        if not record:
            raise HTTPException(status_code=404, detail="Không tìm thấy khoản chi")
        return record

    def update_expense(self, record_id: str, data: ExpenseCreate) -> dict[str, Any]:
        return sheets_service.update_row("expenses", record_id, self._expense_payload(data))

    def delete_expense(self, record_id: str) -> dict[str, bool]:
        return sheets_service.delete_row("expenses", record_id)

    def create_expense_from_telegram(self, parsed: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        parsed["description"] = f"{parsed.get('description') or parsed['category']} [tg:{context['chat_id']}:{context['message_id']}]"
        return self.create_expense(ExpenseCreate(**parsed))

    def create_category(self, data: ExpenseCategory) -> dict[str, Any]:
        return sheets_service.append_row("expense_categories", {"id": expense_category_id(), **data.model_dump()})

    def list_categories(self) -> list[dict[str, Any]]:
        return sheets_service.get_rows("expense_categories")

    def update_category(self, record_id: str, data: ExpenseCategory) -> dict[str, Any]:
        return sheets_service.update_row("expense_categories", record_id, data.model_dump())

    def delete_category(self, record_id: str) -> dict[str, bool]:
        return sheets_service.delete_row("expense_categories", record_id)

    def create_fixed(self, data: FixedExpense) -> dict[str, Any]:
        return sheets_service.append_row("fixed_expenses", {"id": fixed_expense_id(), **self._fixed_payload(data)})

    def list_fixed(self) -> list[dict[str, Any]]:
        return sheets_service.get_rows("fixed_expenses")

    def update_fixed(self, record_id: str, data: FixedExpense) -> dict[str, Any]:
        return sheets_service.update_row("fixed_expenses", record_id, self._fixed_payload(data))

    def delete_fixed(self, record_id: str) -> dict[str, bool]:
        return sheets_service.delete_row("fixed_expenses", record_id)

    def dashboard(self) -> dict[str, Any]:
        rows = sheets_service.get_rows("expenses")
        fixed = sheets_service.get_rows("fixed_expenses")
        today = now_local().date().isoformat()
        month = today[:7]
        by_category: dict[str, float] = {}
        monthly: dict[str, float] = {}
        for row in rows:
            amount = float(row.get("amount") or 0)
            by_category[row.get("category") or "Other"] = by_category.get(row.get("category") or "Other", 0) + amount
            key = (row.get("date") or "")[:7]
            if key:
                monthly[key] = monthly.get(key, 0) + amount
        return {
            "today": sum(float(row.get("amount") or 0) for row in rows if row.get("date") == today),
            "month": sum(float(row.get("amount") or 0) for row in rows if (row.get("date") or "").startswith(month)),
            "fixed": sum(float(row.get("amount") or 0) for row in fixed if row.get("status") == "Active"),
            "flexible": sum(float(row.get("amount") or 0) for row in rows if row.get("expense_type") == "Flexible" and (row.get("date") or "").startswith(month)),
            "by_category": [{"label": key, "value": value} for key, value in by_category.items()],
            "monthly": [{"label": key, "value": monthly[key]} for key in sorted(monthly)],
        }

    @staticmethod
    def _expense_payload(data: ExpenseCreate) -> dict[str, Any]:
        dumped = data.model_dump()
        dumped["date"] = data.date.isoformat()
        dumped["time"] = data.time.strftime("%H:%M")
        return dumped

    @staticmethod
    def _fixed_payload(data: FixedExpense) -> dict[str, Any]:
        dumped = data.model_dump()
        dumped["start_date"] = data.start_date.isoformat()
        dumped["end_date"] = data.end_date.isoformat() if data.end_date else None
        return dumped

expense_service = ExpenseService()
