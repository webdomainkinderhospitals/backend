// The IVF campaign banners: one on the corporate homepage, one on the Kinder
// Kochi page.
//
// The artwork ships with the frontend, in its public/banners folder, and is
// referenced by absolute URL (like the building elevations) so the admin
// portal can preview it from its own origin. From then on both banners are
// managed in the admin portal: this step runs once and never refills a slot
// someone has changed or cleared.
const prisma = require('./prisma');

const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const FLAG = 'bootstrap.promoBanners.v1';

const HOME = {
  image: 'home-ivf-mother.jpg',
  alt: 'Congrats! You are going to be a mother — let your baby dream come true at Kinder Hospitals, with 15 years of IVF legacy. Call +91 484 666 0000.',
};
const KOCHI = {
  name: 'Kochi',
  image: 'kochi-ivf-father.jpg',
  alt: 'Congrats! You are going to be a father — let your baby dream come true at Kinder Hospitals, with 15 years of IVF legacy. Call +91 484 666 0000.',
};

const blank = (value) => !String(value ?? '').trim();

async function bootstrapPromoBanners(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  const home = await db.setting.findUnique({ where: { key: 'homePromoImageUrl' } });
  if (!home || blank(home.value)) {
    for (const [key, value] of [
      ['homePromoImageUrl', `${SITE_ASSETS}/banners/${HOME.image}`],
      ['homePromoAlt', HOME.alt],
    ]) {
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    console.log('Set the homepage IVF banner');
  }

  const loc = await db.location.findFirst({
    where: { name: { equals: KOCHI.name, mode: 'insensitive' } },
  });
  if (loc && blank(loc.promoImageUrl)) {
    await db.location.update({
      where: { id: loc.id },
      data: {
        promoImageUrl: `${SITE_ASSETS}/banners/${KOCHI.image}`,
        promoAlt: blank(loc.promoAlt) ? KOCHI.alt : loc.promoAlt,
      },
    });
    console.log('Set the Kinder Kochi IVF banner');
  }

  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapPromoBanners, FLAG };
