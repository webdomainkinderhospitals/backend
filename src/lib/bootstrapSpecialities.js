// The corporate services catalogue — the four groups shown on the corporate
// Services page and in the header mega menu. On every boot we make sure each
// service exists as a Speciality row and that existing rows are filed under
// the right group, WITHOUT ever overwriting names, descriptions, images or
// categories an admin has already set.
const prisma = require('./prisma');

const CATEGORIES = [
  'Maternity & Pregnancy',
  'Fertility & Gynaecology',
  "Children's Care",
  'Allied & Wellness',
];

// [canonical name, category, aliases already used by seeded/legacy rows]
const CATALOGUE = [
  ['Obstetrics', CATEGORIES[0]],
  ['Maternity', CATEGORIES[0]],
  ['High Risk Pregnancy', CATEGORIES[0]],
  ['Mother & Child Care Programme', CATEGORIES[0]],
  ['Fetal Medicine', CATEGORIES[0]],
  ['Labor & Delivery Pain Management', CATEGORIES[0]],
  ['Lactation Support', CATEGORIES[0]],
  ['ANC Classes', CATEGORIES[0]],

  ['Infertility Treatment', CATEGORIES[1], ['Infertility & IVF']],
  ['IVF', CATEGORIES[1]],
  ['IUI', CATEGORIES[1]],
  ['ICSI', CATEGORIES[1]],
  ['Gynecology & Laparoscopic Surgery', CATEGORIES[1], ['Gynaec & Laparoscopic']],
  ['Reproductive Medicine', CATEGORIES[1]],
  ['Gynaec Oncology', CATEGORIES[1]],
  ["Women's Wellness", CATEGORIES[1]],

  ['Paediatrics', CATEGORIES[2]],
  ['General Paediatrics', CATEGORIES[2]],
  ['Paediatric Surgery', CATEGORIES[2], ['Paed. Surgery']],
  ['Neonatology', CATEGORIES[2]],
  ['Pediatric Intensivist (PICU)', CATEGORIES[2]],
  ['Pediatric Anesthesia', CATEGORIES[2]],
  ['Pediatric Nephrology', CATEGORIES[2]],
  ['Audiology & Speech Therapy', CATEGORIES[2]],

  ['General Medicine', CATEGORIES[3]],
  ['General Surgery', CATEGORIES[3]],
  ['Dermatology & Cosmetology', CATEGORIES[3], ['Dermatology']],
  ['Orthopaedics & Sports Med', CATEGORIES[3]],
  ['Plastic & Cosmetic Surgery', CATEGORIES[3], ['Plastic & Cosmetic']],
  ['General ENT', CATEGORIES[3]],
  ['Anesthesiology & Pain', CATEGORIES[3]],
  ['Endocrinology', CATEGORIES[3]],
  ['Dietetics & Nutrition', CATEGORIES[3]],
  ['Physiotherapy', CATEGORIES[3]],
];

const norm = (s) => String(s || '').trim().toLowerCase();

async function bootstrapSpecialities() {
  const existing = await prisma.speciality.findMany();
  const byName = new Map(existing.map((s) => [norm(s.name), s]));

  let created = 0;
  let categorised = 0;
  let sortOrder = existing.reduce((m, s) => Math.max(m, s.sortOrder || 0), 0);

  for (const [name, category, aliases = []] of CATALOGUE) {
    const match = byName.get(norm(name)) || aliases.map((a) => byName.get(norm(a))).find(Boolean);
    if (match) {
      // never overwrite a category the admin has chosen — only file uncategorised rows
      if (!match.category) {
        await prisma.speciality.update({ where: { id: match.id }, data: { category } });
        categorised++;
      }
      continue;
    }
    sortOrder += 1;
    await prisma.speciality.create({
      data: { name, category, sortOrder, location: '', published: true },
    });
    created++;
  }
  if (created || categorised) {
    console.log(`Specialities catalogue: created ${created}, categorised ${categorised}`);
  }
}

module.exports = { bootstrapSpecialities, CATALOGUE, CATEGORIES };
