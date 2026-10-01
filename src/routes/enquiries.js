// Appointment requests and enquiries from the website.
//
// POST is public (the booking page, the header's call-back form and the
// contact page send here). Everything else is for signed-in staff, who work
// the requests from the admin portal: list, filter, change status, add notes.
const express = require('express');
const { requireAuth } = require('../middleware/auth');

const TYPES = ['appointment', 'callback', 'enquiry', 'feedback'];
const STATUSES = ['new', 'contacted', 'confirmed', 'closed'];
const LIMITS = {
  hospital: 120, doctor: 120, speciality: 120, preferredDate: 60, preferredTime: 40,
  name: 100, phone: 30, email: 120, patientType: 40, subject: 120, message: 2000, source: 300,
};

const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

// Returns { data } ready to store, or { error } to show the visitor.
function validateEnquiry(body = {}) {
  const data = {};
  for (const [key, max] of Object.entries(LIMITS)) data[key] = clean(body[key], max);
  data.type = TYPES.includes(body.type) ? body.type : 'enquiry';
  if (data.name.length < 2) return { error: 'Please enter your name.' };
  const digits = data.phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return { error: 'Please enter a valid phone number.' };
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: 'Please check the email address.' };
  if (data.type === 'appointment' && !data.doctor) return { error: 'Please choose a doctor.' };
  return { data };
}

// A few requests per visitor per window is plenty for a real person; it stops
// a script from filling the inbox. In-memory is fine: Cloud Run instances are
// few, and a restart only resets the counters.
function rateLimiter({ max = 8, windowMs = 10 * 60 * 1000 } = {}) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(now); hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}

function enquiryRouter(db = require('../lib/prisma'), { limiter = rateLimiter() } = {}) {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
    try {
      // Honeypot: a hidden field people never fill in. Bots get a quiet 201.
      if (String(req.body?.website || '').trim()) return res.status(201).json({ ok: true });
      if (!limiter(req.ip || 'unknown')) {
        return res.status(429).json({ error: 'Too many requests — please call the hospital directly.' });
      }
      const { data, error } = validateEnquiry(req.body);
      if (error) return res.status(400).json({ error });
      const saved = await db.enquiry.create({ data });
      res.status(201).json({ ok: true, id: saved.id });
    } catch (e) { next(e); }
  });

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const where = {};
      if (STATUSES.includes(req.query.status)) where.status = req.query.status;
      if (TYPES.includes(req.query.type)) where.type = req.query.type;
      if (req.query.hospital) where.hospital = String(req.query.hospital);
      const q = String(req.query.q || '').trim();
      if (q) {
        where.OR = ['name', 'phone', 'email', 'doctor', 'message', 'hospital'].map((field) => ({
          [field]: { contains: q, mode: 'insensitive' },
        }));
      }
      const [items, grouped] = await Promise.all([
        db.enquiry.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
        db.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);
      const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      for (const g of grouped) counts[g.status] = g._count._all;
      res.json({ items, counts });
    } catch (e) { next(e); }
  });

  router.patch('/:id', requireAuth, async (req, res, next) => {
    try {
      const data = {};
      if (req.body?.status !== undefined) {
        if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Unknown status' });
        data.status = req.body.status;
      }
      if (req.body?.notes !== undefined) data.notes = clean(req.body.notes, 2000);
      const updated = await db.enquiry.update({ where: { id: Number(req.params.id) }, data });
      res.json(updated);
    } catch (e) { next(e); }
  });

  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      await db.enquiry.delete({ where: { id: Number(req.params.id) } });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { enquiryRouter, validateEnquiry, rateLimiter, TYPES, STATUSES };
