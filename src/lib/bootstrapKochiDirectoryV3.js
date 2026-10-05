// Third copy of the Kochi doctor directory (checked 30 Sep 2026, same 41
// doctors). Only one record reads differently from the earlier copies:
// Dr. Reju Joseph Thomas belongs to Paediatric Surgery & Paediatric Urology,
// which the earlier copy had put in the role line instead of the department.
// With the full department he is also listed on the Paediatric Urology page.
//
// Each field changes only while it still holds the earlier copy's value, so
// anything edited in the admin since is left alone.
const prisma = require('./prisma');
const { personKey } = require('./bootstrapKochiUpdates');

const FLAG = 'bootstrap.kochiDirectoryV3';

const CORRECTIONS = [
  {
    name: 'Dr. Reju Joseph Thomas',
    fields: {
      speciality: ['Paediatric Surgery', 'Paediatric Surgery & Paediatric Urology'],
      designation: ['Paediatric Surgery & Paediatric Urology', ''],
    },
  },
];

async function bootstrapKochiDirectoryV3(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  // Runs once the directory has been imported.
  if (!(await db.setting.findUnique({ where: { key: 'bootstrap.kochiClientUpdates.v1' } }))) return;

  const doctors = await db.doctor.findMany();
  const corrected = [];
  for (const fix of CORRECTIONS) {
    const doc = doctors.find((d) => personKey(d.name) === personKey(fix.name));
    if (!doc) continue;
    const data = {};
    for (const [field, [before, after]] of Object.entries(fix.fields)) {
      if (String(doc[field] ?? '').trim() === before) data[field] = after;
    }
    if (Object.keys(data).length) {
      await db.doctor.update({ where: { id: doc.id }, data });
      corrected.push(fix.name);
    }
  }
  if (corrected.length) console.log(`Kochi directory (30 Sep copy): updated ${corrected.join(', ')}`);
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapKochiDirectoryV3, CORRECTIONS, FLAG };
