// 1 Oct 2026: the homepage hero goes back to its original headline slides,
// and the "Comprehensive healthcare, curated for you" artwork moves down to
// the campaign banner under the hero, followed by the IVF "future you dreamed
// of" artwork. The Kochi IVF mother/father posters stay on the Kochi page.
//
// Runs once. Afterwards both are ordinary Site Settings: "Homepage slider
// banners" (left empty = headline slides) and "Homepage campaign banners".
const prisma = require('./prisma');

const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const FLAG = 'bootstrap.homeBannerSwap.v1';

const SLOTS = ['', '2', '3'];
const CLEAR_HERO = Object.fromEntries(
  SLOTS.flatMap((n) => [[`heroSlide${n}ImageUrl`, ''], [`heroSlide${n}Link`, ''], [`heroSlide${n}Alt`, '']])
);
const CAMPAIGN = {
  homePromoImageUrl: `${SITE_ASSETS}/banners/hero-comprehensive-care.webp`,
  homePromoLink: '/book',
  homePromoAlt: 'Comprehensive healthcare, curated for you — Kinder Hospitals',
  homePromo2ImageUrl: `${SITE_ASSETS}/banners/hero-ivf-future.webp`,
  homePromo2Link: '/services#fertility',
  homePromo2Alt: 'The future you dreamed of begins here — 15 years of proven expertise in IVF treatments at Kinder Hospitals',
  homePromo3ImageUrl: '',
  homePromo3Link: '',
  homePromo3Alt: '',
};

async function bootstrapHomeBannerSwap(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  // Blank rather than deleted: the website fills missing keys from its
  // built-in defaults, and a blank slider is what brings the slides back.
  for (const [key, value] of Object.entries({ ...CLEAR_HERO, ...CAMPAIGN })) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log('Homepage: headline slides restored; Comprehensive healthcare banner moved to the campaign banner');
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapHomeBannerSwap, CLEAR_HERO, CAMPAIGN, FLAG };
