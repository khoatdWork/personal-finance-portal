import logging

from fastapi import APIRouter, Header, HTTPException

from app.core.config import get_settings
from app.schemas.telegram import TelegramUpdate
from app.services.expense_parser import parse_expense_message
from app.services.expense_service import expense_service
from app.services.google_sheets_service import sheets_service
from app.services.income_parser import parse_income_message
from app.services.income_service import income_service
from app.services.telegram_service import telegram_service

router = APIRouter(prefix="/integrations/telegram", tags=["telegram"])
logger = logging.getLogger(__name__)

UNAUTHORIZED = "Bạn không được phép dùng bot này."
PARSE_FAILED = """âŒ MĂ¬nh chÆ°a hiá»ƒu khoáº£n thu nháº­p nĂ y.

VĂ­ dá»¥:
+500k freelance hĂ´m nay 20:30
+1.2m cháº¡y xe 26/06 22:15
thu nháº­p 350000 bĂ¡n hĂ ng sĂ¡ng nay
lÆ°Æ¡ng cĂ´ng ty 35m ngĂ y 25/06"""
DUPLICATE = "Giao dịch Telegram này đã được lưu trước đó."


@router.post("/webhook")
async def telegram_webhook(update: TelegramUpdate, x_telegram_bot_api_secret_token: str | None = Header(None)):
    settings = get_settings()
    if settings.TELEGRAM_WEBHOOK_SECRET and x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Mã bảo mật Telegram webhook không hợp lệ")

    message = update.message or {}
    text = message.get("text")
    chat_id = message.get("chat", {}).get("id")
    user_id = message.get("from", {}).get("id")
    message_id = message.get("message_id")
    if not text or not chat_id or not message_id:
        return {"ok": True}

    if not telegram_service.is_allowed(user_id):
        logger.warning("Unauthorized Telegram access: %s", user_id)
        await telegram_service.send_message(chat_id, UNAUTHORIZED)
        return {"ok": True}

    if sheets_service.exists_by_telegram_message_id(str(message_id), str(chat_id)) or sheets_service.exists_telegram_expense(str(message_id), str(chat_id)):
        await telegram_service.send_message(chat_id, DUPLICATE)
        return {"ok": True}

    expense = parse_expense_message(text)
    if expense:
        record = expense_service.create_expense_from_telegram(expense, {
            "message_id": message_id,
            "chat_id": chat_id,
            "raw_input": text,
        })
        await telegram_service.send_message(chat_id, _expense_confirmation(record))
        logger.info("Expense created from Telegram")
        return {"ok": True}

    parsed = parse_income_message(text)
    if not parsed:
        logger.info("Telegram parser failed")
        await telegram_service.send_message(chat_id, PARSE_FAILED)
        return {"ok": True}

    record = income_service.create_income_from_telegram(parsed, {
        "message_id": message_id,
        "chat_id": chat_id,
        "raw_input": text,
    })
    await telegram_service.send_message(chat_id, _confirmation(record))
    logger.info("Income created from Telegram")
    return {"ok": True}


def _confirmation(record: dict) -> str:
    amount = f"{record['amount']:+,.0f}\u0111"
    return f"""\u2705 \u0110\u00e3 l\u01b0u giao d\u1ecbch

S\u1ed1 ti\u1ec1n: {amount}
Lo\u1ea1i: {record['source']}
Ngu\u1ed3n: Telegram"""

def _expense_confirmation(record: dict) -> str:
    amount = f"-{record['amount']:,.0f}đ"
    category = {
        "Coffee": "Cà phê",
        "Food": "Ăn uống",
        "Fuel": "Xăng xe",
        "Shopping": "Mua sắm",
        "Entertainment": "Giải trí",
        "Medical": "Y tế",
        "Parking": "Gửi xe",
        "Travel": "Du lịch",
        "Other": "Khác",
    }.get(record["category"], record["category"])
    return f"""Đã lưu khoản chi

Số tiền: {amount}
Danh mục: {category}
Nguồn: Telegram"""
