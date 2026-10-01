// Second pass over the Kochi doctor directory (re-sent 1 Oct 2026, same 41
// doctors). Since the first import, records can have been added or edited in
// the admin; this makes sure the live list still matches the directory:
//
//  - a directory doctor missing from the site is added;
//  - a directory doctor's empty fields (role, department, qualifications,
//    profile) are filled — anything already written is left alone;
//  - a profile still holding the directory's raw notes (or nothing) gets the
//    professionally written version; a profile edited in the admin is kept;
//  - an incomplete entry that is not in the directory (no department and no
//    qualifications, e.g. a stray "Dr.Roshan") is hidden, with a note saying
//    which directory doctor it most likely duplicates. One click in the admin
//    brings it back.
const prisma = require('./prisma');
const { DIRECTORY, personKey } = require('./bootstrapKochiUpdates');
// The directory's profile notes, rewritten to read as a profile: a lead
// sentence, then Expertise / Education & training lists. Same facts only.
const PROFILES = require('./data/kochiDoctorProfiles.json');

const FLAG = 'bootstrap.kochiDirectoryCheck.v1';
const blank = (v) => !String(v ?? '').trim();
const isKochi = (value) => String(value || '').split(',').some((n) => /^(kochi|cochin)$/i.test(n.trim()));

function designationOf(entry) {
  return String(entry.designation || '').replace(/^Sr\.\s*/i, 'Senior ').replace(/Gynec(?!ologic)/g, 'Gynaec').replace(/Gynecological/g, 'Gynaecological');
}

// The directory doctor a stray record most likely stands for: the same or a
// near-identical first name ("Dr.Roshan" → "Dr. Roshna Ramachandran").
const firstName = (name) => String(name || '')
  .replace(/brigadier|\(dr\.?\)|\bdr\b\.?/gi, ' ')
  .trim().split(/[\s.]+/).find((w) => w.length > 1)?.toLowerCase() || '';

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

function likelyDuplicateOf(name) {
  const first = firstName(name);
  if (first.length < 4) return null;
  return DIRECTORY.find((d) => distance(firstName(d.name), first) <= 2) || null;
}

async function bootstrapKochiDirectoryCheck(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  // Runs after the first directory import has had its turn.
  if (!(await db.setting.findUnique({ where: { key: 'bootstrap.kochiClientUpdates.v1' } }))) return;

  const all = await db.doctor.findMany();
  const byKey = new Map(all.map((d) => [personKey(d.name), d]));
  let sort = all.reduce((m, d) => Math.max(m, d.sortOrder || 0), 0);
  const listed = new Set();
  const result = { added: [], filled: [], hidden: [] };

  for (const entry of DIRECTORY) {
    const key = personKey(entry.name);
    listed.add(key);
    const doc = byKey.get(key);
    if (!doc) {
      await db.doctor.create({
        data: {
          name: entry.name, designation: designationOf(entry), speciality: entry.department, location: 'Kochi',
          bio: entry.qualifications, fullBio: PROFILES[entry.name] || entry.profile, sortOrder: ++sort, published: true,
          sourceFiles: `Kinder Hospitals Kochi Doctor Directory · ${entry.url}`,
        },
      });
      result.added.push(entry.name);
      continue;
    }
    const data = {};
    if (blank(doc.designation) && designationOf(entry)) data.designation = designationOf(entry);
    if (blank(doc.speciality)) data.speciality = entry.department;
    if (blank(doc.bio)) data.bio = entry.qualifications;
    const polished = PROFILES[entry.name];
    const raw = String(doc.fullBio || '').trim();
    if (polished && (!raw || raw === String(entry.profile || '').trim())) data.fullBio = polished;
    else if (!raw && entry.profile) data.fullBio = entry.profile;
    if (!isKochi(doc.location)) data.location = [doc.location, 'Kochi'].filter((v) => !blank(v)).join(', ');
    if (Object.keys(data).length) {
      await db.doctor.update({ where: { id: doc.id }, data });
      result.filled.push(entry.name);
    }
  }

  for (const doc of all) {
    if (doc.published === false || listed.has(personKey(doc.name))) continue;
    if (!(isKochi(doc.location) || blank(doc.location))) continue;
    if (!blank(doc.speciality) || !blank(doc.bio)) continue;
    const twin = likelyDuplicateOf(doc.name);
    await db.doctor.update({
      where: { id: doc.id },
      data: {
        published: false,
        reviewNotes: `Hidden on 1 Oct 2026: incomplete profile (no department or qualifications) and not in the Kochi doctor directory${twin ? ` — it looks like a duplicate of ${twin.name}` : ''}. Complete it and switch “Show on the website” back on if this doctor is real.`,
      },
    });
    result.hidden.push(doc.name);
  }

  console.log(`Kochi directory check: ${result.added.length} added, ${result.filled.length} completed, ${result.hidden.length} incomplete entries hidden${result.hidden.length ? ` (${result.hidden.join('; ')})` : ''}`);
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapKochiDirectoryCheck, likelyDuplicateOf, FLAG };
