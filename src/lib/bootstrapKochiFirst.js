// Kinder Kochi leads every list of hospitals — the header menu, the homepage
// cards and the locations page all follow Location.sortOrder.
//
// Runs once: Kochi becomes 1 and the other centres follow in their existing
// order as 2, 3, 4… After that the "Display order" field in the admin portal
// is the only thing that decides, so a later reorder there is never undone.
const prisma = require('./prisma');

const FLAG = 'bootstrap.kochiFirst.v1';

async function bootstrapKochiFirst(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  const all = await db.location.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  const kochi = all.find((l) => String(l.name).trim().toLowerCase() === 'kochi');
  if (kochi) {
    const ordered = [kochi, ...all.filter((l) => l !== kochi)];
    for (const [i, loc] of ordered.entries()) {
      if (loc.sortOrder !== i + 1) await db.location.update({ where: { id: loc.id }, data: { sortOrder: i + 1 } });
    }
    console.log('Moved Kinder Kochi to the top of the hospital list');
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapKochiFirst, FLAG };
