# Deployment (SCRUM-79 / S3-015)

ATS for Candidates runs as two deployed services:

- **Frontend** (React/Vite) → Vercel
- **Backend** (Node/Express) → Render

## Backend — Render

- **Root directory:** `backend`
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Node version:** 22 (from `.nvmrc` / `engines`)

### Required environment variables (set in the Render dashboard)

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string |
| `FIREBASE_SERVICE_ACCOUNT` | Full Firebase service-account JSON, pasted as the value |
| `OPENAI_API_KEY` | OpenAI API key for AI draft generation |

`PORT` is provided automatically by Render and read via `process.env.PORT`.
Never commit secret values — set them only in the dashboard.

## Frontend — Vercel

- **Root directory:** `frontend`
- **Framework preset:** Vite (auto-detected)
- **Build command:** `npm run build`
- **Output directory:** `dist`

### Required environment variables (set in the Vercel dashboard)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Public URL of the deployed backend (e.g. `https://<service>.onrender.com`) |

## Post-deploy verification (S3-BR-017)

After the backend deploys, confirm the health check responds:

## Local development

The backend verifies Firebase ID tokens using the Firebase Admin SDK, which
needs service-account credentials. `firebase-admin.js` looks for them in this
order:

1. `FIREBASE_SERVICE_ACCOUNT` environment variable (used in cloud/Render)
2. A local `backend/serviceAccountKey.json` file (used for local dev)

For local development, download a service account key and place it at
`backend/serviceAccountKey.json`:

1. Firebase console → Project settings → Service accounts
2. Generate new private key → download the JSON
3. Save it as `backend/serviceAccountKey.json`

This file is gitignored and must never be committed. Individual Firebase
values in `.env` are no longer used for Admin SDK credentials; without one of
the two sources above, authenticated requests will fail with
"Unable to detect a Project Id in the current environment."