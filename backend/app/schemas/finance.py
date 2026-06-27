from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class SavingGoal(BaseModel):
    goalName: str = Field(min_length=1)
    targetAmount: float = Field(ge=0)
    currentAmount: float = Field(ge=0)
    monthlyContribution: float = Field(ge=0)
    targetDate: date
    status: Literal["Active", "Paused", "Completed"] = "Active"


class BankLoan(BaseModel):
    bankName: str = Field(min_length=1)
    originalLoanAmount: float = Field(ge=0)
    remainingBalance: float = Field(ge=0)
    interestRate: float = Field(ge=0)
    monthlyPayment: float = Field(ge=0)
    remainingTermMonths: int = Field(ge=0)
    dueDate: date
    startDate: date
    endDate: date
    status: Literal["Active", "Closing", "Paid"] = "Active"


class IncomeSource(BaseModel):
    name: str = Field(min_length=1)
    type: str = "fixed"
    categoryId: str
    recurring: bool = True
    recurringDay: int = Field(ge=1, le=31)
    startDate: date
    endDate: date | None = None
    defaultAmount: float = Field(ge=0)
    status: Literal["active", "paused", "inactive"] = "active"
    description: str = ""
    color: str = "#0066cc"
    icon: str = "Briefcase"
