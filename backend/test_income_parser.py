from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.income_parser import parse_income_message


BASE = datetime(2026, 6, 27, 12, 0, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))


def test_examples():
    assert parse_income_message("+500k freelance hôm nay 20:30", BASE)["amount"] == 500000
    assert parse_income_message("+1.2m chạy xe 26/06 22:15", BASE)["source"] == "chạy xe"
    assert parse_income_message("thu nhập 350000 bán hàng sáng nay", BASE)["earned_at"].hour == 8
    assert parse_income_message("lương công ty 35m ngày 25/06", BASE)["income_type"] == "fixed"
    assert parse_income_message("+700k bán hàng hôm qua 21:00", BASE)["earned_at"].day == 26
    assert parse_income_message("+2tr bonus", BASE)["amount"] == 2000000


    assert parse_income_message("50+", BASE)["amount"] == 50000
    assert parse_income_message("50-", BASE)["amount"] == -50000
    assert parse_income_message("500k", BASE)["amount"] == 500000
    assert parse_income_message("500k", BASE)["source"] == "Chạy xe"
    assert parse_income_message("mua 120k", BASE)["amount"] == -120000
    assert parse_income_message("mua 120k", BASE)["source"] == "Chạy xe"
    assert parse_income_message("Tiền lương 10m", BASE)["amount"] == 10000000

if __name__ == "__main__":
    test_examples()
