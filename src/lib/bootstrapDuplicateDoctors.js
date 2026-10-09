// Hides the incomplete copy of a doctor who is listed twice: a record with no
// written profile whose first name matches, letter for letter (allowing two
// swapped letters, "Dr.Roshan" / "Dr. Roshna"), a doctor at the same hospital
// who has a full profile. The copy is switched off ("Show on the website"),
// never deleted, with a note naming the doctor it duplicates — one click in
// the admin brings it back. Runs once.
const prisma = require('./prisma');

const FLAG = 'bootstrap.duplicateDoctors.v1';
const firstName = (name) => String(name || '')
  .replace(/brigadier|\(dr\.?\)|\bdr\b\.?/gi, ' ')
  .trim().split(/[\s.]+/).find((w) => w.length > 1)?.toLowerCase() || '';
const letters = (s) => [...s].sort().join('');
const placesOf = (doc) => String(doc.location || '').split(',').map((s) => s.trim().toLowerCase().replace(/^cochin$/, 'kochi')).filter(Boolean);
const hasProfile = (doc) => String(doc.fullBio || '').trim().length >= 80;

function samePerson(a, b) {
  const fa = firstName(a.name), fb = firstName(b.name);
  if (fa.length < 3 || fb.length < 3 || letters(fa) !== letters(fb)) return false;
  const pa = placesOf(a), pb = placesOf(b);
  return !pa.length || !pb.length || pa.some((p) => pb.includes(p));
}

async function bootstrapDuplicateDoctors(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const doctors = (await db.doctor.findMany()).filter((d) => d.published !== false);
  const hidden = [];
  for (const doc of doctors) {
    if (hasProfile(doc)) continue;
    const twin = doctors.find((other) => other !== doc && hasProfile(other) && samePerson(doc, other));
    if (!twin) continue;
    await db.doctor.update({
      where: { id: doc.id },
      data: {
        published: false,
        reviewNotes: [String(doc.reviewNotes || '').trim(), `Hidden on 9 Oct 2026: a duplicate of ${twin.name}, who has the full profile. Switch “Show on the website” back on if this is a different doctor.`].filter(Boolean).join('\n'),
      },
    });
    hidden.push(`${doc.name} (copy of ${twin.name})`);
  }
  if (hidden.length) console.log(`Hid ${hidden.length} duplicate doctor record${hidden.length === 1 ? '' : 's'}: ${hidden.join('; ')}`);
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapDuplicateDoctors, samePerson };
