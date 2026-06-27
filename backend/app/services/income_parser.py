import re
from datetime import datetime, time, timedelta

from app.utils.datetime_utils import local_tz, now_local

DATE_RE = re.compile(r"(?P<day>\d{1,2})/(?P<month>\d{1,2})(?:/(?P<year>\d{4}))?")
AMOUNT_RE = re.compile(r"(?P<num>\d+(?:[.,]\d+)?)\s*(?P<unit>k|m|tr|triệu)?\s*(?P<sign>[+-])?", re.IGNORECASE)
TIME_RE = re.compile(r"(?P<hour>\d{1,2})(?::|h)(?P<minute>\d{2})?|(?P<pm>\d{1,2})\s*pm", re.IGNORECASE)


def parse_income_message(text: str, base: datetime | None = None) -> dict | None:
    base = base or now_local()
    amount_match = _amount_match(text)
    if not amount_match:
        return None
    earned_at = _parse_datetime(text, base)
    source = _source(text, amount_match.group(0))
    amount = _amount(amount_match)
    if _is_expense(text) and amount > 0:
        amount = -amount
    return {
        "amount": amount,
        "source": source,
        "income_type": _income_type(text, source),
        "earned_at": earned_at,
        "note": None,
    }


def _amount_match(text: str):
    for match in AMOUNT_RE.finditer(text):
        if match.group("sign") or match.group("unit") or len(match.group("num").replace(".", "").replace(",", "")) >= 4:
            return match
    return None


def _amount(match) -> float:
    value = float(match.group("num").replace(",", "."))
    unit = (match.group("unit") or "").lower()
    if match.group("sign") and not unit:
        value *= 1_000
    elif unit == "k":
        value *= 1_000
    elif unit in {"m", "tr", "triệu"}:
        value *= 1_000_000
    return -value if match.group("sign") == "-" else value

def _is_expense(text: str) -> bool:
    lower = text.lower()
    return bool(re.search(r"\b(mua|chi|xài|trả|tra|thanh toán|thanh toan)\b", lower))


def _parse_datetime(text: str, base: datetime) -> datetime:
    lower = text.lower()
    day = base.date()
    date_match = DATE_RE.search(lower)
    if "hôm qua" in lower:
        day = day - timedelta(days=1)
    elif date_match:
        year = int(date_match.group("year") or base.year)
        day = day.replace(year=year, month=int(date_match.group("month")), day=int(date_match.group("day")))

    vague_time = None
    if "sáng nay" in lower:
        vague_time = time(8, 0)
    elif "chiều nay" in lower:
        vague_time = time(15, 0)
    elif "tối nay" in lower:
        vague_time = time(20, 0)

    time_match = TIME_RE.search(lower)
    if time_match:
        if time_match.group("pm"):
            hour = int(time_match.group("pm"))
            clock = time(hour + 12 if hour < 12 else hour, 0)
        else:
            clock = time(int(time_match.group("hour")), int(time_match.group("minute") or 0))
    else:
        clock = vague_time or base.time().replace(second=0, microsecond=0)
    return datetime.combine(day, clock, tzinfo=local_tz())


def _income_type(text: str, source: str) -> str:
    lower = f"{text} {source}".lower()
    if any(word in lower for word in ["lương", "salary"]):
        return "fixed"
    if any(word in lower for word in ["freelance", "job ngoài"]):
        return "freelance"
    if any(word in lower for word in ["chạy xe", "xanhsm", "grab", "be"]):
        return "daily"
    return "daily" if source != "Unknown" else "other"


def _source(text: str, amount_text: str) -> str:
    lower = text.lower()
    cleaned = re.sub(re.escape(amount_text), " ", lower, count=1)
    cleaned = re.sub(r"^\s*(thu nhập|\+|mua|chi|xài|trả|tra|thanh toán|thanh toan)", " ", cleaned)
    cleaned = re.sub(r"\b(hôm nay|hôm qua|sáng nay|chiều nay|tối nay|ngày)\b", " ", cleaned)
    cleaned = DATE_RE.sub(" ", cleaned)
    cleaned = TIME_RE.sub(" ", cleaned)
    cleaned = " ".join(cleaned.split())
    return cleaned or "Chạy xe"
