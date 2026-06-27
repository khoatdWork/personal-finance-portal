from datetime import datetime

from app.services.expense_parser import parse_expense_message

BASE = datetime.fromisoformat("2026-06-27T12:00:00+07:00")

def test_expense_parser_examples():
    assert parse_expense_message("coffee 45k", BASE)["amount"] == 45000
    assert parse_expense_message("mua coffee 45k", BASE)["category"] == "Coffee"
    assert parse_expense_message("- coffee 45k", BASE)["category"] == "Coffee"
    assert parse_expense_message("fuel 300k", BASE)["amount"] == 300000
    assert parse_expense_message("shopping 1.5m", BASE)["amount"] == 1500000
    other = parse_expense_message("mua bánh mì 25k", BASE)
    assert other["category"] == "Other"
    assert other["description"] == "bánh mì"
    assert parse_expense_message("500k", BASE) is None
