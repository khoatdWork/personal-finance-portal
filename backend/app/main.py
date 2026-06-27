import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import expense, finance, health, income, telegram
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title=settings.APP_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(income.router, prefix=settings.API_PREFIX)
app.include_router(expense.router, prefix=settings.API_PREFIX)
app.include_router(finance.router, prefix=settings.API_PREFIX)
app.include_router(telegram.router, prefix=settings.API_PREFIX)


@app.on_event("startup")
async def startup() -> None:
    logger.info("%s started", settings.APP_NAME)


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, __: ValueError):
    return JSONResponse(status_code=400, content={"detail": "Dữ liệu tài chính không hợp lệ"})
