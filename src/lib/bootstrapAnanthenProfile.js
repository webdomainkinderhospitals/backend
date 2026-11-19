// Dr Ananthen K S's profile as the hospital sent it (19 Nov 2026), set out
// in paragraphs with his areas of interest (doctorProfileAnanthen.json), and
// his qualifications as the short bio. Applied once: only where the profile
// is empty or still the unformatted text from the website import, and the
// short bio only where it is empty or broken ("Dr."), so an edit made in the
// admin is never overwritten.
const prisma = require('./prisma');
const PROFILE = require('./doctorProfileAnanthen.json');

const FLAG = 'bootstrap.ananthenProfile.v1';
const key = (name) => String(name || '').toLowerCase().replace(/\bdr\b\.?/g, ' ').replace(/[^a-z]/g, '');
const letters = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

async function bootstrapAnanthenProfile(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const doc = (await db.doctor.findMany()).find((d) => key(d.name) === key(PROFILE.name));
  if (!doc) return; // tried again on a later start
  const data = {};
  const current = String(doc.fullBio || '').trim();
  if (!current || letters(current).startsWith(letters(PROFILE.earlierStart))) {
    if (current !== PROFILE.fullBio) data.fullBio = PROFILE.fullBio;
  }
  if (String(doc.bio || '').trim().length < 6) data.bio = PROFILE.qualifications;
  if (Object.keys(data).length) await db.doctor.update({ where: { id: doc.id }, data });
  await db.setting.create({ data: { key: FLAG, value: Object.keys(data).join(', ') || 'kept admin edits' } });
  if (Object.keys(data).length) console.log(`Dr Ananthen K S: set ${Object.keys(data).join(' and ')}`);
}

module.exports = { bootstrapAnanthenProfile, PROFILE };
