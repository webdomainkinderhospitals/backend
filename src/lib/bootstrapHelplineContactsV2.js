// The header's hospital contacts, as the hospital asked on 7 Oct 2026:
// Cherthala's line is "Kinder Hospitals Cherthala" (no "& Alappuzha"), and
// Kochi is reached on its landline, 0484 666 0000. Only those two fields
// change, once; every other line, and anything else edited in the admin,
// is kept as it is.
const prisma = require('./prisma');

const FLAG = 'bootstrap.helplineContacts.v2';
const KEY = 'helplineContacts';
const KOCHI_PHONE = '0484 666 0000';

function updateContacts(text) {
  return String(text || '').split('\n').map((line) => {
    const parts = line.split('|');
    if (parts.length < 2) return line;
    const name = parts[0].trim();
    if (/cherthala/i.test(name) && /&\s*alappuzha/i.test(name)) {
      parts[0] = parts[0].replace(/\s*&\s*Alappuzha/i, '');
    } else if (/\b(kochi|cochin)\b/i.test(name)) {
      parts[1] = ` ${KOCHI_PHONE} `;
    }
    return parts.join('|');
  }).join('\n');
}

async function bootstrapHelplineContactsV2(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const row = await db.setting.findUnique({ where: { key: KEY } });
  if (row && typeof row.value === 'string' && row.value.trim()) {
    const next = updateContacts(row.value);
    if (next !== row.value) {
      await db.setting.update({ where: { key: KEY }, data: { value: next } });
      console.log('Updated the header hospital contacts (Cherthala name, Kochi landline)');
    }
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapHelplineContactsV2, updateContacts, FLAG, KEY, KOCHI_PHONE };
