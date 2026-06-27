from fastapi import APIRouter

from app.schemas.finance import BankLoan, IncomeSource, SavingGoal
from app.services.finance_service import finance_service

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/saving-goals")
def list_saving_goals():
    return {"items": finance_service.list_saving_goals()}


@router.post("/saving-goals")
def create_saving_goal(payload: SavingGoal):
    return finance_service.create_saving_goal(payload)


@router.get("/bank-loans")
def list_bank_loans():
    return {"items": finance_service.list_bank_loans()}


@router.post("/bank-loans")
def create_bank_loan(payload: BankLoan):
    return finance_service.create_bank_loan(payload)


@router.get("/income-sources")
def list_income_sources():
    return {"items": finance_service.list_income_sources()}


@router.post("/income-sources")
def create_income_source(payload: IncomeSource):
    return finance_service.create_income_source(payload)
