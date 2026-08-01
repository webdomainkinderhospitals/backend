# Kinder Hospitals — Step-by-Step Deployment Guide

Follow these steps in order. Total time: about 1–2 hours the first time.
You will need accounts on: [neon.tech](https://neon.tech), [console.cloud.google.com](https://console.cloud.google.com), [vercel.com](https://vercel.com), [cloudflare.com](https://cloudflare.com) — all have free tiers.

---

## Step 1 — Create the database on Neon (5 min)

1. Go to **neon.tech** → sign up → **New Project**.
2. Name: `kinder-hospitals`, region: **AWS Asia Pacific (Singapore)** (closest to Kerala + Singapore users).
3. Copy the **connection string** shown (looks like `postgresql://user:pass@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).
4. Keep it safe — this is your `DATABASE_URL`.

## Step 2 — Set up the database tables and admin login (5 min)

On your computer (Node.js 20+ installed):

```bash
git clone https://github.com/webdomainkinderhospitals/backend.git
cd backend
npm install
```

Create a `.env` file (copy `.env.example`) and fill in:

- `DATABASE_URL` = the Neon string from Step 1
- `JWT_SECRET` = any long random text (e.g. run `openssl rand -hex 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` = the login you want for the admin portal

Then run:

```bash
npx prisma migrate dev --name init   # creates all tables in Neon
npm run seed                         # creates your admin user + starter content
npm run dev                          # test locally at http://localhost:8080/api/content
```

## Step 3 — Create the image bucket on GCP (5 min)

1. In **console.cloud.google.com** create a project, e.g. `kinder-hospitals`.
2. Open **Cloud Shell** (the `>_` icon top right) and run:

```bash
gcloud config set project YOUR_PROJECT_ID
gsutil mb -l asia-south1 gs://kinder-hospitals-media
gsutil iam ch allUsers:objectViewer gs://kinder-hospitals-media
```

This bucket stores every image you upload from the admin portal; `objectViewer` makes them publicly viewable on the website.

## Step 4 — Deploy the backend to Cloud Run (15 min)

Still in Cloud Shell:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
git clone https://github.com/webdomainkinderhospitals/backend.git && cd backend

gcloud run deploy kinder-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=YOUR_NEON_URL,JWT_SECRET=YOUR_SECRET,GCS_BUCKET=kinder-hospitals-media,CORS_ORIGINS=*"
```

(You'll tighten `CORS_ORIGINS` in Step 8.)

When it finishes it prints a URL like `https://kinder-api-xxxx-el.a.run.app`.
Test it: open `https://.../api/content` — you should see JSON. **Save this URL.**

Give Cloud Run permission to write images: **IAM & Admin → IAM** → find the service account ending in `-compute@developer.gserviceaccount.com` → add role **Storage Object Admin**.

## Step 5 — Deploy the frontend website to Vercel (10 min)

1. **vercel.com** → **Add New → Project** → import `webdomainkinderhospitals/Frontend`.
2. Framework: **Next.js** (auto-detected).
3. Environment variable: `NEXT_PUBLIC_API_URL` = the Cloud Run URL from Step 4 (no trailing slash).
4. **Deploy.** Your site is live at `frontend-xxxx.vercel.app`.

## Step 6 — Deploy the admin portal to Vercel (10 min)

1. **Add New → Project** → import `webdomainkinderhospitals/admin`.
2. Framework: **Vite** (auto-detected).
3. Environment variable: `VITE_API_URL` = the same Cloud Run URL.
4. **Deploy**, open it, and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from Step 2.
5. Try it: **Media Library → Upload images**, edit a doctor, change the hero title in **Site Settings** — refresh the website after ~1 minute and see your change live.

## Step 7 — Put Cloudflare in front (20 min)

1. **cloudflare.com** → **Add a site** → enter your domain (e.g. `kinderhospitals.com`) → Free plan.
2. Cloudflare shows two **nameservers** — set them at your domain registrar (GoDaddy/Namecheap/etc.). Wait for "Active".
3. **DNS records** (all with the orange cloud ☁️ ON = proxied):
   - `www` → CNAME → your Vercel frontend domain (Vercel → Project → Settings → Domains: add `www.kinderhospitals.com` first, Vercel tells you the exact CNAME target)
   - `admin` → CNAME → your Vercel admin domain (same process)
   - `api` → CNAME → your Cloud Run domain (Cloud Run → **Manage custom domains** → add `api.kinderhospitals.com`, follow its DNS instructions)
4. **SSL/TLS** → mode **Full (strict)**.
5. Recommended security (all free):
   - **Security → WAF**: turn on managed rules.
   - **Zero Trust → Access**: create an application for `admin.kinderhospitals.com` allowing only your team's email addresses — now the admin portal is invisible to the public.
   - **Security → Bots**: enable Bot Fight Mode.

## Step 8 — Lock down and finish (5 min)

Update the backend env vars to only allow your real domains:

```bash
gcloud run services update kinder-api --region asia-south1 \
  --set-env-vars "CORS_ORIGINS=https://www.kinderhospitals.com,https://admin.kinderhospitals.com"
```

Update the Vercel env vars to use `https://api.kinderhospitals.com` and redeploy both projects.
Finally, open your SuperAdmin dashboard and click **Set URL** on the three Kinder cards so you can launch/monitor everything from one place.

---

## Later: migrating Neon → GCP Cloud SQL (when traffic gets heavy)

Nothing in the code changes — only `DATABASE_URL`.

1. Create a **Cloud SQL for PostgreSQL** instance (same region `asia-south1`, enable private IP or authorized networks).
2. Copy the data:
   ```bash
   pg_dump --no-owner --format=custom "NEON_URL" -f kinder.dump
   pg_restore --no-owner -d "CLOUDSQL_URL" kinder.dump
   ```
3. Point Cloud Run at the new database:
   ```bash
   gcloud run services update kinder-api --region asia-south1 \
     --set-env-vars "DATABASE_URL=CLOUDSQL_URL"
   ```
4. Verify the site and admin portal, then pause/delete the Neon project.

Best practice for near-zero downtime: put the site in a short maintenance window, or run the dump/restore twice (once ahead of time, once final) to minimise the gap.

## Costs at typical traffic

| Service | Free tier covers | Paid starts around |
|---|---|---|
| Neon | 0.5 GB storage, generous compute | $19/mo |
| Cloud Run | 2M requests/mo | pennies after |
| Cloud Storage | 5 GB + CDN via Cloudflare | ~$0.02/GB/mo |
| Vercel | Hobby tier (both apps) | $20/mo Pro |
| Cloudflare | DNS, SSL, WAF basics, Access (50 users) | $0 |
