# Kinder Hospitals — Backend API

Content API for the Kinder Hospitals corporate site and admin portal.

**Stack:** Node.js 20 · Express · Prisma · PostgreSQL (Neon) · Google Cloud Storage · Docker · GCP Cloud Run

## What it does

- Serves all site content to the public frontend in one call: `GET /api/content`
- Admin login (JWT): `POST /api/auth/login`
- CRUD for every section (admin token required for writes):
  `specialities`, `locations`, `doctors`, `testimonials`, `news`, `procedures`
  - Public list: `GET /api/<collection>` · Admin list incl. drafts: `GET /api/<collection>/all`
  - `POST /api/<collection>` · `PUT /api/<collection>/:id` · `DELETE /api/<collection>/:id`
- Site settings (hero text, phones, stats…): `GET /api/settings`, `PUT /api/settings`
- Image uploads to Google Cloud Storage: `GET/POST /api/media`, `DELETE /api/media/:id`
  (multipart field `file`, optional `folder`)
- Health check: `GET /healthz`

## Run locally

```bash
npm install
cp .env.example .env        # fill DATABASE_URL (Neon) + JWT_SECRET
npx prisma migrate dev --name init
npm run seed                # creates admin user + starter content
npm run dev                 # http://localhost:8080
```

Without `GCS_BUCKET` set, uploads are stored in `./uploads` and served at `/uploads/...` — perfect for development.

## Deploy to GCP Cloud Run

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Build & deploy straight from source
gcloud run deploy kinder-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=postgresql://...,JWT_SECRET=...,GCS_BUCKET=kinder-hospitals-media,CORS_ORIGINS=https://www.yourdomain.com,https://admin.yourdomain.com"
```

Create the image bucket once:

```bash
gsutil mb -l asia-south1 gs://kinder-hospitals-media
gsutil iam ch allUsers:objectViewer gs://kinder-hospitals-media   # public read for site images
```

Cloud Run's default service account needs `Storage Object Admin` on the bucket.

Run migrations + seed once (from your laptop against the Neon URL):

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass npm run seed
```

## Migrating Neon → GCP Cloud SQL later (heavy traffic)

The code never knows which Postgres it talks to — only `DATABASE_URL` does.

1. Create a Cloud SQL for PostgreSQL instance.
2. Export/import: `pg_dump "$NEON_URL" | psql "$CLOUDSQL_URL"` (or use `pg_dump -Fc` + `pg_restore`).
3. Update `DATABASE_URL` on the Cloud Run service and redeploy. Done.
