// The commissioned watercolour elevations of each centre.
//
// The buildings ship with the frontend, in its public/hospitals folder, so
// they are referenced by absolute URL the same way the seeded doctor
// portraits are: the admin portal runs on its own origin and would not
// resolve a site-relative path.
//
// Each centre is updated only while it is still carrying the stock
// photography that shipped with the design. The moment someone uploads their
// own image — or swaps one of these — this step leaves that centre alone
// forever after.
const prisma = require('./prisma');

const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const FLAG = 'bootstrap.elevations.v2';

const ELEVATIONS = {
  Cherthala: 'cherthala',
  Kochi: 'kochi',
  Kollam: 'kollam',
  Aranmula: 'aranmula',
};

// Kept in step with the admin's own definition of a sample image.
const STOCK = /images\.unsplash\.com|picsum\.photos|placehold\.(co|it)|via\.placeholder/i;

// A field is ours to fill only while it is empty or still carrying the stock
// photography that shipped with the design.
const replaceable = (value) => !String(value || '').trim() || STOCK.test(value);

async function bootstrapElevations(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  let updated = 0;
  for (const [name, file] of Object.entries(ELEVATIONS)) {
    const loc = await db.location.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (!loc) continue;

    // The card and the page banner are considered separately: v1 filled the
    // card, so on an existing install only the banner is still stock.
    const url = `${SITE_ASSETS}/hospitals/${file}.webp`;
    const data = {};
    if (replaceable(loc.imageUrl)) data.imageUrl = url;
    if (replaceable(loc.heroImageUrl)) data.heroImageUrl = url;
    if (!Object.keys(data).length) continue;

    await db.location.update({ where: { id: loc.id }, data });
    updated++;
  }
  if (updated) console.log(`Set the building elevation on ${updated} centres`);
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapElevations, ELEVATIONS, FLAG };
