// Clinics now live under their home hospital's sub-site instead of the group
// site's menu. Kinder Alappuzha belongs to Kinder Cherthala (mothers deliver
// there), so it is assigned once. After that the admin's "Clinic of" field
// decides — a cleared or changed value is never overwritten.
const prisma = require('./prisma');

const FLAG = 'bootstrap.clinicParents.v1';
const PARENTS = { alappuzha: 'Cherthala' };

async function bootstrapClinicParents(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  const clinics = await db.location.findMany({ where: { kind: 'clinic' } });
  for (const clinic of clinics) {
    const key = String(clinic.slug || clinic.name || '').trim().toLowerCase();
    const parent = PARENTS[key];
    if (parent && !String(clinic.parentHospital || '').trim()) {
      await db.location.update({ where: { id: clinic.id }, data: { parentHospital: parent } });
      console.log(`Listed Kinder ${clinic.name} under Kinder Hospitals ${parent}`);
    }
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapClinicParents, FLAG };
