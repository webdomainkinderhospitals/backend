// Portraits for the Kinder Hospitals Kollam doctors, supplied by the hospital
// and named by the hospital (content/doctor-photos/kollam). Each is copied
// into the site's media library (so it appears under Media in the admin) and
// set as that doctor's photo.
//
// A portrait already uploaded in the admin is never replaced. A photo whose
// doctor is not on the site yet (Dr. Shoji, Dr. Hira) goes into the media
// library now and is attached on a later start, once the doctor is added in
// the admin. Each photo is handled once.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');

const DIR = path.join(__dirname, '..', '..', 'content', 'doctor-photos', 'kollam');
const FLAG = (slug) => `bootstrap.kollamDoctorPhotos.${slug}`;
const STORED = (slug) => `bootstrap.kollamDoctorPhotos.${slug}.url`;

// file -> the doctor it shows, as the hospital named them
const PHOTOS = [
  { file: 'reshmy-r-pillai.jpg', name: 'Dr. Reshmy R Pillai' },
  { file: 'praveen-krishna-k-p.jpg', name: 'Dr. Praveen Krishna K P' },
  { file: 'manju-v-k.jpg', name: 'Dr. Manju V K' },
  { file: 'jilu-fathima-y.jpg', name: 'Dr. Jilu Fathima Y' },
  { file: 'beegam-raheena.jpg', name: 'Dr. Beegam Raheena' },
  { file: 'shalini-mahapatra.jpg', name: 'Dr. Shalini Mahapatra' },
  { file: 'deepthi-prem.jpg', name: 'Dr. Deepthi Prem' },
  { file: 'shoji.jpg', name: 'Dr. Shoji' },
  { file: 'hira.jpg', name: 'Dr. Hira' },
];

// "Dr. Reshmy R. Pillai" -> ["reshmy", "r", "pillai"]
const words = (name) => String(name || '').toLowerCase()
  .replace(/^\s*dr\.?\s*/, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
const atKollam = (doc) => /\bkollam\b/i.test(String(doc.location || ''));

// The Kollam doctor a photo belongs to: the same full name, or — for a photo
// named by first name only — the one Kollam doctor with that first name.
function doctorFor(entry, doctors) {
  const want = words(entry.name).join(' ');
  const exact = doctors.filter((d) => words(d.name).join(' ') === want);
  if (exact.length === 1) return exact[0];
  const first = words(entry.name)[0];
  const byFirst = doctors.filter((d) => words(d.name)[0] === first);
  return byFirst.length === 1 ? byFirst[0] : null;
}

async function storePhoto(db, entry, store) {
  const buffer = fs.readFileSync(path.join(DIR, entry.file));
  const { fileName, url } = await store({ buffer, originalname: entry.file, mimetype: 'image/jpeg' }, 'doctors');
  if (db.media) {
    await db.media.create({ data: { fileName, url, mimeType: 'image/jpeg', sizeBytes: buffer.length, folder: 'doctors' } });
  }
  return url;
}

async function bootstrapKollamDoctorPhotos(db = prisma, { store = storeFile } = {}) {
  const doctors = (await db.doctor.findMany()).filter(atKollam);
  let added = 0;
  for (const entry of PHOTOS) {
    const slug = entry.file.replace(/\.jpg$/, '');
    if (await db.setting.findUnique({ where: { key: FLAG(slug) } })) continue;

    const doc = doctorFor(entry, doctors);
    const kept = await db.setting.findUnique({ where: { key: STORED(slug) } });
    if (doc && String(doc.imageUrl || '').trim()) {
      // The team has already given this doctor a photo.
      await db.setting.create({ data: { key: FLAG(slug), value: 'kept admin photo' } });
      continue;
    }
    const url = kept?.value || (await storePhoto(db, entry, store));
    if (!kept) await db.setting.create({ data: { key: STORED(slug), value: url } });
    if (!doc) continue; // attached once the doctor is added in the admin
    await db.doctor.update({ where: { id: doc.id }, data: { imageUrl: url } });
    await db.setting.create({ data: { key: FLAG(slug), value: 'done' } });
    added++;
  }
  if (added) console.log(`Added ${added} Kinder Hospitals Kollam doctor photo${added === 1 ? '' : 's'}`);
}

module.exports = { bootstrapKollamDoctorPhotos, PHOTOS, doctorFor };
