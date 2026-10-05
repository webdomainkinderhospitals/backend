// The brand is "Kinder Hospitals" — plural, as on the logo — so a hospital
// reads "Kinder Hospitals Kochi" and the group "Kinder Hospitals". Text that
// came in with the singular "Kinder Hospital" (imported pages, seeded
// settings, profiles) is brought in line once. Afterwards the admin's own
// wording is never touched again.
//
// Only the capitalised brand is changed: "every Kinder hospital" is ordinary
// English and stays, and domains such as kinderhospital.in have no space so
// never match. Patient testimonials keep their own words, and postal
// addresses are left exactly as registered.
const prisma = require('./prisma');

const FLAG = 'bootstrap.brandPlural.v1';

function pluralBrand(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(/(?<![A-Za-z])Kinder Hospital(['’])s\b/g, 'Kinder Hospitals$1')
    .replace(/(?<![A-Za-z])Kinder Hospital(?![A-Za-z])/g, 'Kinder Hospitals')
    .replace(/(?<![A-Za-z])KINDER HOSPITAL(?![A-Za-z])/g, 'KINDER HOSPITALS');
}

// model → the text fields visitors read
const FIELDS = {
  location: ['tagline', 'description', 'highlights', 'since', 'accreditation', 'websiteLabel', 'promoAlt', 'promo2Alt', 'promo3Alt'],
  speciality: ['name', 'description', 'fullDescription'],
  doctor: ['designation', 'bio', 'fullBio'],
  newsPost: ['title', 'excerpt', 'body'],
  procedure: ['name', 'description'],
  contentPage: ['title', 'excerpt', 'body'],
};

async function bootstrapBrandPlural(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  let changed = 0;

  for (const [model, fields] of Object.entries(FIELDS)) {
    if (!db[model]) continue;
    const rows = await db[model].findMany();
    for (const row of rows) {
      const data = {};
      for (const f of fields) {
        const next = pluralBrand(row[f]);
        if (next !== row[f]) data[f] = next;
      }
      if (Object.keys(data).length) {
        await db[model].update({ where: { id: row.id }, data });
        changed++;
      }
    }
  }

  // Site settings (contact list, footer text, slides…); the bootstrap flags are not text.
  const settings = await db.setting.findMany();
  for (const row of settings) {
    if (row.key.startsWith('bootstrap.')) continue;
    const next = pluralBrand(row.value);
    if (next !== row.value) {
      await db.setting.update({ where: { key: row.key }, data: { value: next } });
      changed++;
    }
  }

  if (changed) console.log(`Brand name: "Kinder Hospital" → "Kinder Hospitals" in ${changed} records`);
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapBrandPlural, pluralBrand, FLAG };
