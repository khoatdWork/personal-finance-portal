# Khoa Portal API

FastAPI backend for income records stored in Google Sheets and created from the web portal or Telegram.

## Local Development

```bash
cd backend
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Mac/Linux:

```bash
source .venv/bin/activate
```

Install and run:

```bash
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Server: `http://localhost:8000`

Docs: `http://localhost:8000/docs`

Health check:

```bash
curl http://localhost:8000/api/health
```

## Environment

Do not commit `.env` or Google credential JSON files.

```env
APP_NAME=Khoa Portal API
ENV=development
API_PREFIX=/api
FRONTEND_URL=http://localhost:5173
TIMEZONE=Asia/Ho_Chi_Minh

GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_CREDENTIALS_FILE=credentials/google-service-account.json
GOOGLE_SHEETS_INCOME_SHEET_NAME=Income
GOOGLE_SHEETS_INCOME_RANGE=Income!A:N

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_USER_IDS=
```

## Google Sheets Setup

1. Create a Google Cloud project.
2. Enable Google Sheets API.
3. Create a Service Account.
4. Download the service account JSON.
5. Place it at `backend/credentials/google-service-account.json`.
6. Create a Google Sheet.
7. Add a tab named `Income`.
8. Add this header row:

```text
id,amount,source,income_type,earned_date,earned_time,earned_at,note,created_from,telegram_message_id,telegram_chat_id,raw_input,created_at,updated_at
```

9. Share the Google Sheet with the service account email.
10. Copy the Spreadsheet ID into `.env`.
11. Verify it:

```bash
python check_integrations.py
```

## Telegram Setup

1. Open Telegram.
2. Search for `@BotFather`.
3. Create a new bot.
4. Copy the bot token to `.env`.
5. Get your Telegram user ID.
6. Add your user ID to `TELEGRAM_ALLOWED_USER_IDS`.
7. Expose local FastAPI:

```bash
ngrok http 8000
```

8. Set the webhook:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://your-ngrok-url/api/integrations/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Verify the token:

```bash
python check_integrations.py
```

## API

```http
GET /api/health
POST /api/income
GET /api/income
GET /api/income/{income_id}
POST /api/integrations/telegram/webhook
```

Example web income:

```json
{
  "amount": 500000,
  "source": "Freelance",
  "income_type": "daily",
  "earned_at": "2026-06-27T20:30:00+07:00",
  "note": "Website input"
}
```

Telegram examples:

```text
+500k freelance hôm nay 20:30
+1.2m chạy xe 26/06 22:15
thu nhập 350000 bán hàng sáng nay
lương công ty 35m ngày 25/06
```

React should call FastAPI only. It should not read Google Sheets or expose Telegram or Google credentials.
