// Studio portraits of the Kinder Hospitals Cherthala doctors, supplied by the
// hospital in "Cherthala Doctors Profile Photos.docx" (8 Oct 2026), each
// captioned with the doctor's name (content/doctor-photos/cherthala). Each is
// copied into the media library (Media in the admin) and set as that
// doctor's photo.
//
// These are the hospital's own new portraits, so they replace the photo a
// doctor had before; the earlier photo's address is noted in the doctor's
// review notes so it can be put back. Each doctor is done once, so a photo
// changed in the admin afterwards is kept. A portrait whose doctor is not on
// the site yet (Dr Ashby Joseph, Dr Meera Mohan, Dr Remya) waits in the media
// library and is attached on a later start, once the doctor is added.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');

const DIR = path.join(__dirname, '..', '..', 'content', 'doctor-photos', 'cherthala');
const FLAG = (slug) => `bootstrap.cherthalaDoctorPhotos.${slug}`;
const STORED = (slug) => `bootstrap.cherthalaDoctorPhotos.${slug}.url`;

// file -> the doctor it shows, as captioned in the hospital's document
const PHOTOS = [
  { file: 'ananthen-k-s.jpg', name: 'Dr Ananthen K S' },
  { file: 'ashby-joseph.jpg', name: 'Dr Ashby Joseph' },
  { file: 'jeevan-raj-c-n.jpg', name: 'Dr Jeevan Raj CN' },
  { file: 'kevin-george.jpg', name: 'Dr Kevin George' },
  { file: 'meera-mohan.jpg', name: 'Dr Meera Mohan' },
  { file: 'neena-ananthen.jpg', name: 'Dr Neena Ananthen' },
  { file: 'rahul-k-h.jpg', name: 'Dr Rahul KH' },
  { file: 'remya.jpg', name: 'Dr Remya' },
  { file: 'reshmy-j-r.jpg', name: 'Dr Reshmy J R' },
  { file: 'shilpa-govind.jpg', name: 'Dr Shilpa Govind' },
  { file: 'thankachy-roy.jpg', name: 'Dr Thankachy Roy' },
  { file: 'vijitha-a-s.jpg', name: 'Dr Vijitha A S' },
];

// "Dr. Jeevan Raj C N" -> ["jeevan", "raj", "c", "n"]
const words = (name) => String(name || '').toLowerCase()
  .replace(/^\s*dr\.?\s*/, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
const compact = (name) => words(name).join('');
const atCherthala = (doc) => /\bcherthala\b/i.test(String(doc.location || ''));

// The Cherthala doctor a portrait belongs to: the same name (ignoring spaces
// in initials, so "CN" = "C N"); else the same first and last name ("Kevin
// George" = "Kevin Antony George"); else the one doctor with that first name.
function doctorFor(entry, doctors) {
  const one = (list) => (list.length === 1 ? list[0] : null);
  const want = words(entry.name);
  return one(doctors.filter((d) => compact(d.name) === compact(entry.name)))
    || (want.length > 1 && one(doctors.filter((d) => { const w = words(d.name); return w[0] === want[0] && w[w.length - 1] === want[want.length - 1]; })))
    || one(doctors.filter((d) => words(d.name)[0] === want[0]));
}

async function storePhoto(db, entry, store) {
  const buffer = fs.readFileSync(path.join(DIR, entry.file));
  const { fileName, url } = await store({ buffer, originalname: `cherthala-${entry.file}`, mimetype: 'image/jpeg' }, 'doctors');
  if (db.media) {
    await db.media.create({ data: { fileName, url, mimeType: 'image/jpeg', sizeBytes: buffer.length, folder: 'doctors' } });
  }
  return url;
}

async function bootstrapCherthalaDoctorPhotos(db = prisma, { store = storeFile } = {}) {
  const doctors = (await db.doctor.findMany()).filter(atCherthala);
  let added = 0;
  for (const entry of PHOTOS) {
    const slug = entry.file.replace(/\.jpg$/, '');
    if (await db.setting.findUnique({ where: { key: FLAG(slug) } })) continue;
    const kept = await db.setting.findUnique({ where: { key: STORED(slug) } });
    const url = kept?.value || (await storePhoto(db, entry, store));
    if (!kept) await db.setting.create({ data: { key: STORED(slug), value: url } });

    const doc = doctorFor(entry, doctors);
    if (!doc) continue; // attached once the doctor is added in the admin
    const before = String(doc.imageUrl || '').trim();
    const data = { imageUrl: url };
    if (before && before !== url) {
      data.reviewNotes = [String(doc.reviewNotes || '').trim(), `Previous photo (before the Oct 2026 studio portrait): ${before}`].filter(Boolean).join('\n');
    }
    await db.doctor.update({ where: { id: doc.id }, data });
    await db.setting.create({ data: { key: FLAG(slug), value: 'done' } });
    added++;
  }
  if (added) console.log(`Added ${added} Kinder Hospitals Cherthala doctor portrait${added === 1 ? '' : 's'}`);
}

module.exports = { bootstrapCherthalaDoctorPhotos, doctorFor, PHOTOS };
