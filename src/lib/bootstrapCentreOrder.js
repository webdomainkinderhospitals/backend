// The hospital's order for its centres, everywhere hospitals are listed
// (header menus, homepage cards, the locations page, the contacts dropdown):
// Cherthala, Kochi, Aranmula, Kollam. Any other centre (a clinic, Bengaluru,
// Singapore) follows in its existing order.
//
// Runs once, like the earlier "Kochi first" update. After that the admin's
// "Display order" field and the contacts list decide, so a later change made
// in the admin is never undone.
const prisma = require('./prisma');

const FLAG = 'bootstrap.centreOrder.v1';
const ORDER = [/^cherthala$/i, /^(kochi|cochin)$/i, /^aranmula$/i, /^kollam$/i];
const CONTACTS_KEY = 'helplineContacts';

const rank = (name) => {
  const i = ORDER.findIndex((re) => re.test(String(name || '').trim()));
  return i === -1 ? ORDER.length : i;
};

// Stable: centres outside the list keep their existing order, after it.
function orderCentres(locations) {
  return locations.map((loc, i) => ({ loc, i }))
    .sort((a, b) => rank(a.loc.name) - rank(b.loc.name) || a.i - b.i)
    .map(({ loc }) => loc);
}

// "Kinder Hospitals Kochi | phone | email" lines, by the centre in the name.
function orderContacts(text) {
  const lines = String(text || '').split('\n');
  const centreOf = (line) => {
    const name = line.split('|')[0].replace(/^\s*Kinder\s+Hospitals?\s*/i, '').trim();
    return rank(name.split(/\s*[&,]\s*/)[0]);
  };
  return lines.map((line, i) => ({ line, i }))
    .sort((a, b) => centreOf(a.line) - centreOf(b.line) || a.i - b.i)
    .map(({ line }) => line).join('\n');
}

async function bootstrapCentreOrder(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  const all = await db.location.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  for (const [i, loc] of orderCentres(all).entries()) {
    if (loc.sortOrder !== i + 1) await db.location.update({ where: { id: loc.id }, data: { sortOrder: i + 1 } });
  }

  const contacts = await db.setting.findUnique({ where: { key: CONTACTS_KEY } });
  if (contacts && typeof contacts.value === 'string' && contacts.value.trim()) {
    const next = orderContacts(contacts.value);
    if (next !== contacts.value) await db.setting.update({ where: { key: CONTACTS_KEY }, data: { value: next } });
  }

  console.log('Ordered the centres: Cherthala, Kochi, Aranmula, Kollam');
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapCentreOrder, orderCentres, orderContacts, FLAG };
