// GET /api/content — one public payload with everything the frontend needs.
// The Next.js site calls this every 60s (ISR), so one query batch is plenty.
const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [settingRows, specialities, locations, doctors, testimonials, news, procedures] =
      await prisma.$transaction([
        prisma.setting.findMany(),
        prisma.speciality.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
        prisma.location.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
        prisma.doctor.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
        prisma.testimonial.findMany({ where: { published: true }, orderBy: { id: 'desc' } }),
        prisma.newsPost.findMany({ where: { published: true }, orderBy: { publishedAt: 'desc' }, take: 12 }),
        prisma.procedure.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
      ]);

    const settings = {};
    for (const row of settingRows) settings[row.key] = row.value;

    res.set('Cache-Control', 'public, max-age=60'); // let Cloudflare cache it too
    res.json({ settings, specialities, locations, doctors, testimonials, news, procedures });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
