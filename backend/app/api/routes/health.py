from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "service": get_settings().APP_NAME}
