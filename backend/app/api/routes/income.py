from datetime import date

from fastapi import APIRouter, Query

from app.schemas.income import IncomeCreate, IncomeListResponse, IncomeResponse
from app.services.income_service import income_service

router = APIRouter(prefix="/income", tags=["income"])


@router.post("", response_model=IncomeResponse)
def create_income(payload: IncomeCreate):
    return income_service.create_income(payload)


@router.get("", response_model=IncomeListResponse)
def list_income(
    from_date: date | None = None,
    to_date: date | None = None,
    income_type: str | None = None,
    created_from: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return income_service.list_income(from_date, to_date, income_type, created_from, limit, offset)


@router.get("/{income_id}", response_model=IncomeResponse)
def get_income(income_id: str):
    return income_service.get_income_by_id(income_id)
