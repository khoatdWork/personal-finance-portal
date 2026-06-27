import sys

import httpx
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

from app.core.config import get_settings
from app.services.google_sheets_service import INCOME_HEADERS


def main() -> int:
    settings = get_settings()
    missing = [
        key
        for key, value in {
            "GOOGLE_SHEETS_SPREADSHEET_ID": settings.GOOGLE_SHEETS_SPREADSHEET_ID,
            "TELEGRAM_BOT_TOKEN": settings.TELEGRAM_BOT_TOKEN,
            "TELEGRAM_ALLOWED_USER_IDS": settings.TELEGRAM_ALLOWED_USER_IDS,
        }.items()
        if not value
    ]
    if not settings.google_sheets_credentials_path.exists():
        missing.append(str(settings.google_sheets_credentials_path))
    if missing:
        print("Missing: " + ", ".join(missing))
        return 1

    telegram = httpx.get(f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe", timeout=10)
    telegram.raise_for_status()
    if not telegram.json().get("ok"):
        print("Telegram token rejected")
        return 1
    print("Telegram: ok")

    credentials = Credentials.from_service_account_file(
        settings.google_sheets_credentials_path,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    sheets = build("sheets", "v4", credentials=credentials, cache_discovery=False).spreadsheets()
    header = sheets.values().get(
        spreadsheetId=settings.GOOGLE_SHEETS_SPREADSHEET_ID,
        range=f"{settings.GOOGLE_SHEETS_INCOME_SHEET_NAME}!1:1",
    ).execute().get("values", [[]])[0]
    if header != INCOME_HEADERS:
        print("Google Sheets header mismatch")
        print("Expected: " + ",".join(INCOME_HEADERS))
        print("Found: " + ",".join(header))
        return 1
    print("Google Sheets: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
