import json
import logging
from typing import Any

from fastapi import HTTPException
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

INCOME_HEADERS = [
    "id",
    "amount",
    "source",
    "income_type",
    "earned_date",
    "earned_time",
    "earned_at",
    "note",
    "created_from",
    "telegram_message_id",
    "telegram_chat_id",
    "raw_input",
    "created_at",
    "updated_at",
]
EXPENSE_CATEGORY_HEADERS = ["id", "name", "type", "icon", "color", "active"]
EXPENSE_HEADERS = ["id", "date", "time", "amount", "category", "expense_type", "description", "payment_method", "source", "created_at"]
FIXED_EXPENSE_HEADERS = ["id", "name", "amount", "category", "payment_day", "start_date", "end_date", "status", "notes"]
SAVING_GOAL_HEADERS = ["id", "goalName", "targetAmount", "currentAmount", "monthlyContribution", "targetDate", "status"]
BANK_LOAN_HEADERS = ["id", "bankName", "originalLoanAmount", "remainingBalance", "interestRate", "monthlyPayment", "remainingTermMonths", "dueDate", "startDate", "endDate", "status"]
INCOME_SOURCE_HEADERS = ["id", "name", "type", "categoryId", "recurring", "recurringDay", "startDate", "endDate", "defaultAmount", "status", "description", "color", "icon"]

TABLES = {
    "income": (INCOME_HEADERS, lambda settings: settings.GOOGLE_SHEETS_INCOME_RANGE),
    "expense_categories": (EXPENSE_CATEGORY_HEADERS, lambda settings: settings.GOOGLE_SHEETS_EXPENSE_CATEGORIES_RANGE),
    "expenses": (EXPENSE_HEADERS, lambda settings: settings.GOOGLE_SHEETS_EXPENSES_RANGE),
    "fixed_expenses": (FIXED_EXPENSE_HEADERS, lambda settings: settings.GOOGLE_SHEETS_FIXED_EXPENSES_RANGE),
    "saving_goals": (SAVING_GOAL_HEADERS, lambda settings: settings.GOOGLE_SHEETS_SAVING_GOALS_RANGE),
    "bank_loans": (BANK_LOAN_HEADERS, lambda settings: settings.GOOGLE_SHEETS_BANK_LOANS_RANGE),
    "income_sources": (INCOME_SOURCE_HEADERS, lambda settings: settings.GOOGLE_SHEETS_INCOME_SOURCES_RANGE),
}


class GoogleSheetsService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._service = None

    def _client(self):
        if self._service:
            return self._service
        if not self.settings.GOOGLE_SHEETS_SPREADSHEET_ID:
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets")
        try:
            scopes = ["https://www.googleapis.com/auth/spreadsheets"]
            credentials = (
                Credentials.from_service_account_info(json.loads(self.settings.GOOGLE_SHEETS_CREDENTIALS_JSON), scopes=scopes)
                if self.settings.GOOGLE_SHEETS_CREDENTIALS_JSON
                else Credentials.from_service_account_file(self.settings.google_sheets_credentials_path, scopes=scopes)
            )
            self._service = build("sheets", "v4", credentials=credentials, cache_discovery=False).spreadsheets()
            logger.info("Google Sheets connection initialized")
            return self._service
        except Exception as exc:
            logger.error("Google Sheets connection failed: %s", exc.__class__.__name__)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def _values(self):
        return self._client().values()

    def ensure_header(self, table: str = "income") -> None:
        headers, range_getter = TABLES[table]
        sheet_range = range_getter(self.settings)
        sheet_name = sheet_range.split("!", 1)[0]
        last_column = chr(ord("A") + len(headers) - 1)
        try:
            result = self._values().get(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self._range(sheet_name, "1:1"),
            ).execute(num_retries=3)
            values = result.get("values") or [[]]
            if values[0] != headers:
                self._values().update(
                    spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                    range=self._range(sheet_name, f"A1:{last_column}1"),
                    valueInputOption="RAW",
                    body={"values": [headers]},
                ).execute(num_retries=3)
        except HttpError as exc:
            if exc.status_code == 400:
                self._create_sheet(sheet_name)
                self._values().update(
                    spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                    range=self._range(sheet_name, f"A1:{last_column}1"),
                    valueInputOption="RAW",
                    body={"values": [headers]},
                ).execute(num_retries=3)
                return
            logger.error("Google Sheets header check failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc
        except Exception as exc:
            logger.error("Google Sheets header check failed: %s", exc.__class__.__name__)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def get_income_rows(self) -> list[dict[str, Any]]:
        self.ensure_header()
        try:
            result = self._values().get(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self.settings.GOOGLE_SHEETS_INCOME_RANGE,
            ).execute(num_retries=3)
            rows = result.get("values", [])[1:]
            return [self.row_to_dict(row, INCOME_HEADERS) for row in rows if row]
        except HttpError as exc:
            logger.error("Google Sheets read failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc
        except Exception as exc:
            logger.error("Google Sheets read failed: %s", exc.__class__.__name__)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def append_income(self, record: dict[str, Any]) -> dict[str, Any]:
        self.ensure_header()
        try:
            self._values().append(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self.settings.GOOGLE_SHEETS_INCOME_RANGE,
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": [self.dict_to_row(record, INCOME_HEADERS)]},
            ).execute(num_retries=3)
            return record
        except HttpError as exc:
            logger.error("Google Sheets append failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc
        except Exception as exc:
            logger.error("Google Sheets append failed: %s", exc.__class__.__name__)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def find_income_by_id(self, income_id: str) -> dict[str, Any] | None:
        return next((row for row in self.get_income_rows() if row.get("id") == income_id), None)

    def exists_by_telegram_message_id(self, message_id: str | None, chat_id: str | None = None) -> bool:
        if not message_id:
            return False
        return any(
            row.get("telegram_message_id") == str(message_id)
            and (chat_id is None or row.get("telegram_chat_id") == str(chat_id))
            for row in self.get_income_rows()
        )

    def get_rows(self, table: str) -> list[dict[str, Any]]:
        headers, range_getter = TABLES[table]
        self.ensure_header(table)
        try:
            result = self._values().get(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self._safe_range(range_getter(self.settings)),
            ).execute(num_retries=3)
            return [self.row_to_dict(row, headers) for row in result.get("values", [])[1:] if any(row)]
        except HttpError as exc:
            logger.error("Google Sheets read failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def append_row(self, table: str, record: dict[str, Any]) -> dict[str, Any]:
        headers, range_getter = TABLES[table]
        self.ensure_header(table)
        try:
            self._values().append(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self._safe_range(range_getter(self.settings)),
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": [self.dict_to_row(record, headers)]},
            ).execute(num_retries=3)
            return record
        except HttpError as exc:
            logger.error("Google Sheets append failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def update_row(self, table: str, record_id: str, record: dict[str, Any]) -> dict[str, Any]:
        headers, range_getter = TABLES[table]
        row_number = self._row_number(table, record_id)
        if not row_number:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
        sheet_name = range_getter(self.settings).split("!", 1)[0]
        last_column = chr(ord("A") + len(headers) - 1)
        next_record = {**self.find_by_id(table, record_id), **record, "id": record_id}
        try:
            self._values().update(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self._range(sheet_name, f"A{row_number}:{last_column}{row_number}"),
                valueInputOption="RAW",
                body={"values": [self.dict_to_row(next_record, headers)]},
            ).execute(num_retries=3)
            return next_record
        except HttpError as exc:
            logger.error("Google Sheets update failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def delete_row(self, table: str, record_id: str) -> dict[str, bool]:
        headers, range_getter = TABLES[table]
        row_number = self._row_number(table, record_id)
        if not row_number:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
        sheet_name = range_getter(self.settings).split("!", 1)[0]
        last_column = chr(ord("A") + len(headers) - 1)
        try:
            self._values().clear(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                range=self._range(sheet_name, f"A{row_number}:{last_column}{row_number}"),
            ).execute(num_retries=3)
            return {"ok": True}
        except HttpError as exc:
            logger.error("Google Sheets delete failed: %s", exc.status_code)
            raise HTTPException(status_code=503, detail="Không thể kết nối Google Sheets") from exc

    def find_by_id(self, table: str, record_id: str) -> dict[str, Any] | None:
        return next((row for row in self.get_rows(table) if row.get("id") == record_id), None)

    def exists_telegram_expense(self, message_id: str | None, chat_id: str | None = None) -> bool:
        if not message_id:
            return False
        raw = str(message_id)
        return any(
            row.get("source") == "Telegram"
            and row.get("description")
            and f"tg:{chat_id}:{raw}" in row.get("description")
            for row in self.get_rows("expenses")
        )

    def _row_number(self, table: str, record_id: str) -> int | None:
        headers, range_getter = TABLES[table]
        self.ensure_header(table)
        result = self._values().get(
            spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
            range=self._safe_range(range_getter(self.settings)),
        ).execute(num_retries=3)
        for index, row in enumerate(result.get("values", [])[1:], start=2):
            if self.row_to_dict(row, headers).get("id") == record_id:
                return index
        return None

    @staticmethod
    def row_to_dict(row: list[Any], headers: list[str]) -> dict[str, Any]:
        padded = row + [""] * (len(headers) - len(row))
        data = dict(zip(headers, padded))
        if "amount" in data:
            data["amount"] = float(data["amount"] or 0)
        return {key: (value if value != "" else None) for key, value in data.items()}

    @staticmethod
    def dict_to_row(record: dict[str, Any], headers: list[str]) -> list[Any]:
        return ["" if record.get(header) is None else record.get(header) for header in headers]


    def _create_sheet(self, sheet_name: str) -> None:
        try:
            self._client().batchUpdate(
                spreadsheetId=self.settings.GOOGLE_SHEETS_SPREADSHEET_ID,
                body={"requests": [{"addSheet": {"properties": {"title": sheet_name}}}]},
            ).execute(num_retries=3)
        except HttpError as exc:
            if exc.status_code != 400:
                raise

    @classmethod
    def _safe_range(cls, sheet_range: str) -> str:
        sheet_name, cells = sheet_range.split("!", 1)
        return cls._range(sheet_name, cells)

    @staticmethod
    def _range(sheet_name: str, cells: str) -> str:
        escaped = sheet_name.replace("'", "''")
        return f"'{escaped}'!{cells}"

sheets_service = GoogleSheetsService()
