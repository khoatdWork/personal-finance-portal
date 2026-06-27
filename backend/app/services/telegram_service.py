import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class TelegramService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def send_message(self, chat_id: str | int, text: str) -> None:
        if not self.settings.TELEGRAM_BOT_TOKEN:
            logger.warning("Telegram bot token is not configured")
            return
        url = f"https://api.telegram.org/bot{self.settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json={"chat_id": chat_id, "text": text})

    def is_allowed(self, user_id: str | int) -> bool:
        allowed = self.settings.allowed_telegram_user_ids
        return bool(allowed) and str(user_id) in allowed


telegram_service = TelegramService()
