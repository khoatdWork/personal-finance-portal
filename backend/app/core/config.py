from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "Khoa Portal API"
    ENV: Literal["development", "production", "test"] = "development"
    API_PREFIX: str = "/api"
    FRONTEND_URL: str = "http://localhost:5173"
    TIMEZONE: str = "Asia/Ho_Chi_Minh"

    GOOGLE_SHEETS_SPREADSHEET_ID: str = ""
    GOOGLE_SHEETS_CREDENTIALS_JSON: str = ""
    GOOGLE_SHEETS_CREDENTIALS_FILE: str = "credentials/google-service-account.json"
    GOOGLE_SHEETS_INCOME_SHEET_NAME: str = "Income"
    GOOGLE_SHEETS_INCOME_RANGE: str = "Income!A:N"
    GOOGLE_SHEETS_EXPENSE_CATEGORIES_RANGE: str = "Expense Categories!A:F"
    GOOGLE_SHEETS_EXPENSES_RANGE: str = "Expenses!A:J"
    GOOGLE_SHEETS_FIXED_EXPENSES_RANGE: str = "Fixed Expenses!A:I"
    GOOGLE_SHEETS_SAVING_GOALS_RANGE: str = "Saving Goals!A:G"
    GOOGLE_SHEETS_BANK_LOANS_RANGE: str = "Bank Loans!A:K"
    GOOGLE_SHEETS_INCOME_SOURCES_RANGE: str = "Income Sources!A:M"

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""
    TELEGRAM_ALLOWED_USER_IDS: str = ""

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    @property
    def allowed_telegram_user_ids(self) -> set[str]:
        return {item.strip() for item in self.TELEGRAM_ALLOWED_USER_IDS.split(",") if item.strip()}

    @property
    def cors_origins(self) -> list[str]:
        return sorted({self.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"})

    @property
    def google_sheets_credentials_path(self) -> Path:
        path = Path(self.GOOGLE_SHEETS_CREDENTIALS_FILE)
        return path if path.is_absolute() else BASE_DIR / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
