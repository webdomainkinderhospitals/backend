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
app.use('/api', collectionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Kinder Hospitals API listening on :${port}`);
  // File existing specialities under their corporate service groups and add
  // any missing catalogue services. Idempotent; never blocks startup.
  require('./lib/bootstrapSpecialities')
    .bootstrapSpecialities()
    .catch((e) => console.error('Speciality bootstrap failed:', e.message));
});
