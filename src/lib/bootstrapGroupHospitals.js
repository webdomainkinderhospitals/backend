// The group site lists four hospitals: Cherthala, Kochi, Aranmula, Kollam.
// Singapore and Bengaluru are taken off the site (unpublished, not deleted, so
// the admin can bring either back), Aranmula is made sure to be a published
// hospital, and the four are put first in that order.
//
// Runs once. After that the admin's Published and Display order fields
// decide, so a later change made in the admin is never undone.
const prisma = require('./prisma');
const { orderCentres } = require('./bootstrapCentreOrder');

const FLAG = 'bootstrap.groupHospitals.v1';
const HIDE = /^(singapore|bengaluru|bangalore)$/i;

async function bootstrapGroupHospitals(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  const all = await db.location.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  for (const loc of all) {
    const name = String(loc.name || '').trim();
    if (HIDE.test(name) && loc.published) {
      await db.location.update({ where: { id: loc.id }, data: { published: false } });
    } else if (/^aranmula$/i.test(name) && (!loc.published || loc.kind === 'clinic')) {
      await db.location.update({ where: { id: loc.id }, data: { published: true, kind: 'hospital' } });
    }
  }
  for (const [i, loc] of orderCentres(all).entries()) {
    if (loc.sortOrder !== i + 1) await db.location.update({ where: { id: loc.id }, data: { sortOrder: i + 1 } });
  }

  console.log('Group hospitals: Cherthala, Kochi, Aranmula, Kollam (Singapore & Bengaluru unpublished)');
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapGroupHospitals, FLAG };
