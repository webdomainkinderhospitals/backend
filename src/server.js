require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const collectionRoutes = require('./routes/collections');
const settingsRoutes = require('./routes/settings');
const mediaRoutes = require('./routes/media');

const app = express();
app.set('trust proxy', 1); // behind Cloud Run / Cloudflare

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '2mb' }));

// Only allow the frontend + admin origins (comma-separated in CORS_ORIGINS)
const origins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));

// Local uploads fallback for development (production uses Google Cloud Storage)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/website-import', require('./routes/websiteImport'));
app.use('/api/enquiries', require('./routes/enquiries').enquiryRouter());
app.use('/api', collectionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const port = process.env.PORT || 8080;
// Content bootstraps run before the server starts taking traffic. Cloud Run
// gives a container its full CPU only while it is starting up (or serving a
// request); work begun after `listen` is throttled to almost nothing and can
// stall, or be cut off when the instance scales down — which left the later
// bootstraps (leadership, the Cherthala portraits) unapplied. They are
// idempotent and mostly one quick check each, so this costs a few seconds.
// If they take longer than START_BUDGET_MS the server starts anyway and they
// finish in the background, so a slow database can never block a deploy.
const START_BUDGET_MS = 90000;
const started = Date.now();
const bootstraps = require('./lib/startupTasks').runStartupTasks()
  .then(() => console.log(`Startup bootstraps finished in ${((Date.now() - started) / 1000).toFixed(1)}s`));
Promise.race([bootstraps, new Promise((resolve) => setTimeout(resolve, START_BUDGET_MS))]).then(() => {
  app.listen(port, () => console.log(`Kinder Hospitals API listening on :${port}`));
});
