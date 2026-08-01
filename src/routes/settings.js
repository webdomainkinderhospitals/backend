const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public read — the frontend needs settings too
router.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

// Admin: upsert any set of keys in one call — body is { key: value, ... }
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const entries = Object.entries(req.body || {});
    if (!entries.length) return res.status(400).json({ error: 'No settings provided' });
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );
    res.json({ ok: true, updated: entries.map(([k]) => k) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
