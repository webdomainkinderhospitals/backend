// The IVF campaign banners on the corporate homepage and the Kinder Kochi page.
//
// The artwork ships with the frontend, in its public/banners folder, and is
// referenced by absolute URL (like the building elevations) so the admin
// portal can preview it from its own origin. Both places rotate the same two
// posters — the homepage leads with the mother, Kochi with the father.
//
// Each version runs once and only fills a slot that is still empty, so
// nothing set, changed or cleared in the admin portal is ever overwritten.
const prisma = require('./prisma');

const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const FLAG = 'bootstrap.promoBanners.v1';
const FLAG_V2 = 'bootstrap.promoBanners.v2';

const MOTHER = {
  image: 'home-ivf-mother.jpg',
  alt: 'Congrats! You are going to be a mother — let your baby dream come true at Kinder Hospitals, with 15 years of IVF legacy. Call +91 484 666 0000.',
};
const FATHER = {
  image: 'kochi-ivf-father.jpg',
  alt: 'Congrats! You are going to be a father — let your baby dream come true at Kinder Hospitals, with 15 years of IVF legacy. Call +91 484 666 0000.',
};
const KOCHI = 'Kochi';

// Slot n → field prefix: 1 is the original banner, 2 and 3 rotate with it.
const n = (i) => (i === 1 ? '' : String(i));
const url = (poster) => `${SITE_ASSETS}/banners/${poster.image}`;
const blank = (value) => !String(value ?? '').trim();

async function fillSetting(db, slot, poster) {
  const key = `homePromo${n(slot)}ImageUrl`;
  const row = await db.setting.findUnique({ where: { key } });
  if (row && !blank(row.value)) return false;
  for (const [k, value] of [[key, url(poster)], [`homePromo${n(slot)}Alt`, poster.alt]]) {
    await db.setting.upsert({ where: { key: k }, update: { value }, create: { key: k, value } });
  }
  return true;
}

async function fillKochi(db, slot, poster) {
  const loc = await db.location.findFirst({ where: { name: { equals: KOCHI, mode: 'insensitive' } } });
  const image = `promo${n(slot)}ImageUrl`;
  const alt = `promo${n(slot)}Alt`;
  if (!loc || !blank(loc[image])) return false;
  await db.location.update({
    where: { id: loc.id },
    data: { [image]: url(poster), [alt]: blank(loc[alt]) ? poster.alt : loc[alt] },
  });
  return true;
}

async function once(db, flag, run) {
  if (await db.setting.findUnique({ where: { key: flag } })) return;
  await run();
  await db.setting.create({ data: { key: flag, value: 'done' } });
}

async function bootstrapPromoBanners(db = prisma) {
  // v1: one banner each.
  await once(db, FLAG, async () => {
    if (await fillSetting(db, 1, MOTHER)) console.log('Set the homepage IVF banner');
    if (await fillKochi(db, 1, FATHER)) console.log('Set the Kinder Kochi IVF banner');
  });
  // v2: the other poster joins each as a second, rotating banner.
  await once(db, FLAG_V2, async () => {
    if (await fillSetting(db, 2, FATHER)) console.log('Added a second homepage IVF banner');
    if (await fillKochi(db, 2, MOTHER)) console.log('Added a second Kinder Kochi IVF banner');
  });
}

module.exports = { bootstrapPromoBanners, FLAG, FLAG_V2 };
