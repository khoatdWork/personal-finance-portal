from datetime import date

from fastapi import APIRouter, Query

from app.schemas.expense import ExpenseCategory, ExpenseCreate, FixedExpense
from app.services.expense_service import expense_service

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.get("/dashboard")
def dashboard():
    return expense_service.dashboard()

@router.post("")
def create_expense(payload: ExpenseCreate):
    return expense_service.create_expense(payload)

@router.get("")
def list_expenses(
    from_date: date | None = None,
    to_date: date | None = None,
    category: str | None = None,
    source: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return expense_service.list_expenses(from_date, to_date, category, source, limit, offset)

@router.post("/categories")
def create_category(payload: ExpenseCategory):
    return expense_service.create_category(payload)

@router.get("/categories/list")
def list_categories():
    return {"items": expense_service.list_categories()}

@router.put("/categories/{category_id}")
def update_category(category_id: str, payload: ExpenseCategory):
    return expense_service.update_category(category_id, payload)

@router.delete("/categories/{category_id}")
def delete_category(category_id: str):
    return expense_service.delete_category(category_id)

@router.post("/fixed")
def create_fixed(payload: FixedExpense):
    return expense_service.create_fixed(payload)

@router.get("/fixed/list")
def list_fixed():
    return {"items": expense_service.list_fixed()}

@router.put("/fixed/{fixed_id}")
def update_fixed(fixed_id: str, payload: FixedExpense):
    return expense_service.update_fixed(fixed_id, payload)

@router.delete("/fixed/{fixed_id}")
def delete_fixed(fixed_id: str):
    return expense_service.delete_fixed(fixed_id)

@router.get("/{expense_id}")
def get_expense(expense_id: str):
    return expense_service.get_expense(expense_id)

@router.put("/{expense_id}")
def update_expense(expense_id: str, payload: ExpenseCreate):
    return expense_service.update_expense(expense_id, payload)

@router.delete("/{expense_id}")
def delete_expense(expense_id: str):
    return expense_service.delete_expense(expense_id)
