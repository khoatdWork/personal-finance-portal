from typing import Any

from app.schemas.finance import BankLoan, IncomeSource, SavingGoal
from app.services.google_sheets_service import sheets_service
from app.utils.id_utils import bank_loan_id, income_source_id, saving_goal_id


class FinanceService:
    def list_saving_goals(self) -> list[dict[str, Any]]:
        return sheets_service.get_rows("saving_goals")

    def create_saving_goal(self, data: SavingGoal) -> dict[str, Any]:
        return sheets_service.append_row("saving_goals", {"id": saving_goal_id(), **self._dump(data)})

    def list_bank_loans(self) -> list[dict[str, Any]]:
        return sheets_service.get_rows("bank_loans")

    def create_bank_loan(self, data: BankLoan) -> dict[str, Any]:
        return sheets_service.append_row("bank_loans", {"id": bank_loan_id(), **self._dump(data)})

    def list_income_sources(self) -> list[dict[str, Any]]:
        return sheets_service.get_rows("income_sources")

    def create_income_source(self, data: IncomeSource) -> dict[str, Any]:
        return sheets_service.append_row("income_sources", {"id": income_source_id(), **self._dump(data)})

    @staticmethod
    def _dump(data):
        return {
            key: value.isoformat() if hasattr(value, "isoformat") else value
            for key, value in data.model_dump().items()
        }


finance_service = FinanceService()
