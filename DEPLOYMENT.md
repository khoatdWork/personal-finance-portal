# Deployment

This repo is ready for Git-based deploys on Render using `render.yaml`.

## Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USER/personal-finance-portal.git
git push -u origin main
```

## Render

1. In Render, create a new Blueprint from the GitHub repo.
2. Set these backend environment variables:
   - `FRONTEND_URL`: Render static site URL
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_CREDENTIALS_JSON`: full Google service account JSON
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `TELEGRAM_ALLOWED_USER_IDS`
3. Set the frontend environment variable:
   - `VITE_API_BASE_URL`: Render API URL ending in `/api`

Render will build the frontend with `npm ci && npm run build` and start the API with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
