# MapLeads

MapLeads is a Firebase-based lead generation platform built with React + Vite.

## Stack

- React + TypeScript + Tailwind + shadcn/ui
- Firebase Auth
- Cloud Firestore
- Firebase Cloud Functions (v2 callable)
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

## Firebase Functions Setup

1. Install function deps:

```bash
cd functions
npm install
```

2. Build functions:

```bash
npm run build
```

3. Set runtime env vars (Firebase Functions):
- `APIFY_TOKEN` (optional, demo mode if missing)
- `SUPERADMIN_EMAIL` (optional, default `afiliadosprobusiness@gmail.com`)

4. Deploy:

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes
```

## Important Notes

- Do not commit private service account keys.
- Firestore indexes are defined in `firestore.indexes.json`.
- Security rules are defined in `firestore.rules`.
