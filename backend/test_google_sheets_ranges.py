from app.services.google_sheets_service import TABLES, GoogleSheetsService


def test_safe_range_quotes_sheet_names():
    assert GoogleSheetsService._safe_range("Fixed Expenses!A:I") == "'Fixed Expenses'!A:I"
    assert GoogleSheetsService._safe_range("Bob's Expenses!A:J") == "'Bob''s Expenses'!A:J"


def test_finance_tables_are_registered():
    assert {"saving_goals", "bank_loans", "income_sources"} <= set(TABLES)


if __name__ == "__main__":
    test_safe_range_quotes_sheet_names()
    test_finance_tables_are_registered()
