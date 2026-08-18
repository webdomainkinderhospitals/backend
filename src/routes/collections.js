// Generic CRUD for every content collection, driven by one config table.
// Public:  GET /api/<collection>            (published items only)
// Admin:   GET /api/<collection>/all, POST /api/<collection>,
//          PUT /api/<collection>/:id, DELETE /api/<collection>/:id
const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const COLLECTIONS = {
  specialities: {
    model: 'speciality',
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    fields: ['name', 'category', 'description', 'icon', 'imageUrl', 'location', 'sortOrder', 'published'],
    required: ['name'],
  },
  locations: {
    model: 'location',
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    fields: ['name', 'city', 'country', 'address', 'phone', 'email', 'mapUrl', 'imageUrl', 'since', 'slug', 'tagline', 'description', 'heroImageUrl', 'highlights', 'website', 'websiteLabel', 'international', 'sortOrder', 'published'],
    required: ['name'],
  },
  doctors: {
    model: 'doctor',
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    fields: ['name', 'designation', 'speciality', 'location', 'bio', 'imageUrl', 'sortOrder', 'published'],
    required: ['name'],
  },
  testimonials: {
    model: 'testimonial',
    orderBy: [{ id: 'desc' }],
    fields: ['patientName', 'relation', 'quote', 'rating', 'imageUrl', 'location', 'published'],
    required: ['patientName', 'quote'],
  },
  news: {
    model: 'newsPost',
    orderBy: [{ publishedAt: 'desc' }],
    fields: ['title', 'slug', 'category', 'excerpt', 'body', 'imageUrl', 'author', 'location', 'publishedAt', 'published'],
    required: ['title'],
  },
  procedures: {
    model: 'procedure',
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    fields: ['name', 'description', 'icon', 'imageUrl', 'location', 'sortOrder', 'published'],
    required: ['name'],
  },
};

function pick(body, fields) {
  const data = {};
  for (const f of fields) {
    if (body[f] === undefined) continue;
    if (f === 'sortOrder' || f === 'rating') data[f] = parseInt(body[f], 10) || 0;
    else if (f === 'published' || f === 'international') data[f] = Boolean(body[f]);
    else if (f === 'publishedAt') data[f] = new Date(body[f]);
    else data[f] = String(body[f]);
  }
  return data;
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

for (const [name, cfg] of Object.entries(COLLECTIONS)) {
  const db = () => prisma[cfg.model];

  router.get(`/${name}`, async (req, res, next) => {
    try {
      res.json(await db().findMany({ where: { published: true }, orderBy: cfg.orderBy }));
    } catch (e) { next(e); }
  });

  router.get(`/${name}/all`, requireAuth, async (req, res, next) => {
    try {
      res.json(await db().findMany({ orderBy: cfg.orderBy }));
    } catch (e) { next(e); }
  });

  router.post(`/${name}`, requireAuth, async (req, res, next) => {
    try {
      for (const f of cfg.required) {
        if (!req.body?.[f]) return res.status(400).json({ error: `"${f}" is required` });
      }
      const data = pick(req.body, cfg.fields);
      if (name === 'news' && !data.slug) data.slug = slugify(data.title) + '-' + Date.now();
      res.status(201).json(await db().create({ data }));
    } catch (e) { next(e); }
  });

  router.put(`/${name}/:id`, requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      res.json(await db().update({ where: { id }, data: pick(req.body, cfg.fields) }));
    } catch (e) { next(e); }
  });

  router.delete(`/${name}/:id`, requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db().delete({ where: { id } });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}

module.exports = router;
module.exports.COLLECTIONS = COLLECTIONS;
