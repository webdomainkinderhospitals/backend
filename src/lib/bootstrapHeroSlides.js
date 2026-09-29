// The first homepage slider banners: "Comprehensive healthcare, curated for
// you" and the IVF "The future you dreamed of begins here". Both images ship
// with the frontend (public/banners) and are referenced by absolute URL, the
// same way the seeded doctor portraits and hospital elevations are, so the
// admin — on its own origin — can show them too.
//
// Seeded once, and only into an empty slider: if anyone has already set a
// slider banner in Site Settings, nothing here runs. Afterwards they are
// ordinary settings, changed or removed from Site Settings → Homepage slider
// banners.
const prisma = require('./prisma');

const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const FLAG = 'bootstrap.heroSlides';

const SLIDES = {
  heroSlideImageUrl: `${SITE_ASSETS}/banners/hero-comprehensive-care.webp`,
  heroSlideLink: '/book',
  heroSlideAlt: 'Comprehensive healthcare, curated for you — Kinder Hospitals',
  heroSlide2ImageUrl: `${SITE_ASSETS}/banners/hero-ivf-future.webp`,
  heroSlide2Link: '/services#fertility',
  heroSlide2Alt: 'The future you dreamed of begins here — 15 years of proven expertise in IVF treatments at Kinder Hospitals',
};

async function bootstrapHeroSlides(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const existing = await db.setting.findMany({
    where: { key: { in: ['heroSlideImageUrl', 'heroSlide2ImageUrl', 'heroSlide3ImageUrl'] } },
  });
  const inUse = existing.some((row) => String(row.value || '').trim());
  if (!inUse) {
    for (const [key, value] of Object.entries(SLIDES)) {
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    console.log('Seeded the homepage slider banners');
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapHeroSlides, SLIDES, FLAG };
