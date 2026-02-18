# MapLeads

MapLeads is a lead generation platform built with React + Vite, Firebase Auth/Firestore, and a Cloud Run backend API.

## Stack

- React + TypeScript + Tailwind + shadcn/ui
- Firebase Auth
- Cloud Firestore
- Cloud Run backend API (`map-leads-backend`)
- Apify for Google Maps extraction

## Local Setup

1. Install frontend deps:

```bash
npm install
```

2. Configure env vars using `.env.example`.

3. Start frontend:

```bash
npm run dev
```

## Backend API Setup

Set frontend environment variable:

```bash
VITE_BACKEND_API_URL=https://your-cloud-run-url.a.run.app
```

If `VITE_BACKEND_API_URL` is missing in local development, frontend falls back to `http://localhost:8080`.

Deploy backend from `map-leads-backend` with Cloud Run.

## Important Notes

- Do not commit private service account keys.
- Firestore indexes are defined in `firestore.indexes.json`.
- Security rules are defined in `firestore.rules`.
