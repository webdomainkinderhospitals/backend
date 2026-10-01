// The header's "Contact a hospital" dropdown: one line per hospital,
// "Name | Phone | Email", edited in the admin under Site Settings → Hospital
// contact numbers. Seeded once with the numbers the hospitals gave on
// 30 Sep 2026; a value already set in the admin is left alone.
const prisma = require('./prisma');

const FLAG = 'bootstrap.helplineContacts.v1';
const KEY = 'helplineContacts';

const CONTACTS = [
  'Kinder Hospital Cherthala & Alappuzha | +91 94466 54500 | marketing@kinderhospital.in',
  'Kinder Hospital Kochi | +91 97466 00600 | contactus@kinderkochi.com',
  'Kinder Hospital Kollam | +91 79944 45542 | contactus@kinderkollam.com',
  'Kinder Hospital Aranmula | +91 91884 01767 | marketing@kinderaranmula.com',
].join('\n');

async function bootstrapHelplineContacts(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const row = await db.setting.findUnique({ where: { key: KEY } });
  if (!row || !String(row.value || '').trim()) {
    await db.setting.upsert({ where: { key: KEY }, update: { value: CONTACTS }, create: { key: KEY, value: CONTACTS } });
    console.log('Seeded the header hospital contact numbers');
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapHelplineContacts, CONTACTS, KEY, FLAG };
