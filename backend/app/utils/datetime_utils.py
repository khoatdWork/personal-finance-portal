from datetime import datetime
import os
from zoneinfo import ZoneInfo


def local_tz() -> ZoneInfo:
    return ZoneInfo(os.getenv("TIMEZONE", "Asia/Ho_Chi_Minh"))


def now_local() -> datetime:
    return datetime.now(local_tz())


def normalize_local(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=local_tz())
    return value.astimezone(local_tz())


def iso(value: datetime) -> str:
    return normalize_local(value).isoformat(timespec="seconds")
