import re
from datetime import datetime

from app.services.income_parser import AMOUNT_RE, DATE_RE, TIME_RE, _amount, _parse_datetime
from app.utils.datetime_utils import now_local

CATEGORY_ALIASES = {
    "coffee": {"coffee", "cafe", "ca phe", "cà phê"},
    "food": {"food", "an uong", "ăn uống"},
    "fuel": {"fuel", "xang", "xăng"},
    "shopping": {"shopping", "mua sam", "mua sắm"},
    "entertainment": {"entertainment", "game", "movie", "phim"},
    "medical": {"medical", "thuoc", "thuốc", "benh vien", "bệnh viện"},
    "parking": {"parking", "gui xe", "gửi xe"},
    "travel": {"travel", "du lich", "du lịch"},
}
EXPENSE_PREFIX_RE = re.compile(r"^\s*(?:-|mua|chi|xai|xài|tra|trả|thanh toán|thanh toan)(?:\b|$)", re.IGNORECASE)

def parse_expense_message(text: str, base: datetime | None = None) -> dict | None:
    base = base or now_local()
    match = _amount_match(text)
    if not match:
        return None
    body = _description(text, match.group(0))
    category = _category(body)
    explicit = bool(EXPENSE_PREFIX_RE.search(text))
    if not explicit and category == "Other":
        return None
    paid_at = _parse_datetime(text, base)
    description = _strip_prefix(body)
    return {
        "amount": abs(_amount(match)),
        "category": category,
        "expense_type": "Flexible",
        "description": "" if category != "Other" and description.lower() == category.lower() else description,
        "date": paid_at.date(),
        "time": paid_at.time().replace(second=0, microsecond=0),
        "payment_method": "Cash",
        "source": "Telegram",
    }

def _amount_match(text: str):
    for match in AMOUNT_RE.finditer(text):
        if match.group("unit") or len(match.group("num").replace(".", "").replace(",", "")) >= 4:
            return match
    return None

def _description(text: str, amount_text: str) -> str:
    cleaned = re.sub(re.escape(amount_text), " ", text, count=1, flags=re.IGNORECASE)
    cleaned = DATE_RE.sub(" ", cleaned)
    cleaned = TIME_RE.sub(" ", cleaned)
    cleaned = re.sub(r"\b(hom nay|hôm nay|hom qua|hôm qua|sang nay|sáng nay|chieu nay|chiều nay|toi nay|tối nay|ngay|ngày)\b", " ", cleaned, flags=re.IGNORECASE)
    return " ".join(cleaned.split())

def _strip_prefix(text: str) -> str:
    return " ".join(EXPENSE_PREFIX_RE.sub(" ", text).split()) or "Expense"

def _category(text: str) -> str:
    lower = _strip_prefix(text).lower()
    for category, words in CATEGORY_ALIASES.items():
        if any(word in lower for word in words):
            return category.title()
    return "Other"
