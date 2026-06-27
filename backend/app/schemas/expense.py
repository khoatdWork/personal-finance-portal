from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field

ExpenseSource = Literal["Web", "Telegram"]
ExpenseType = Literal["Fixed", "Flexible"]

class ExpenseCategory(BaseModel):
    name: str = Field(min_length=1)
    type: ExpenseType
    icon: str = ""
    color: str = "#64748b"
    active: bool = True

class ExpenseCategoryResponse(ExpenseCategory):
    id: str

class ExpenseBase(BaseModel):
    amount: float = Field(gt=0)
    category: str = "Other"
    expense_type: ExpenseType = "Flexible"
    description: str = ""
    date: date
    time: time
    payment_method: str = "Cash"
    source: ExpenseSource = "Web"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str
    created_at: str

class FixedExpense(BaseModel):
    name: str = Field(min_length=1)
    amount: float = Field(gt=0)
    category: str
    payment_day: int = Field(ge=1, le=31)
    start_date: date
    end_date: date | None = None
    status: Literal["Active", "Inactive", "Paused"] = "Active"
    notes: str = ""

class FixedExpenseResponse(FixedExpense):
    id: str

class ListResponse(BaseModel):
    items: list[dict]
    total: int
    limit: int
    offset: int
