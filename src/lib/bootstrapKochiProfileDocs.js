// Doctor profiles the Kochi team sent as Word documents (Drive folder
// "Doctor's profile updated", 26 Sep 2026). Each document is the doctor's own
// profile with a portrait, and goes further than the doctor directory.
//
//  - The profile replaces the one on the site only while the site still
//    shows the directory's text (as imported, or as first written up) or
//    nothing; a profile edited in the admin is kept.
//  - The portrait is copied into the media library (Media in the admin) and
//    set as the doctor's photo only when they have none; a photo already on
//    the site is never replaced.
// Each doctor is handled once.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');
const { DIRECTORY, personKey } = require('./bootstrapKochiUpdates');

const PROFILES = require('./data/kochiDoctorProfiles.json');
const DIR = path.join(__dirname, '..', '..', 'content', 'doctor-photos', 'kochi');
const FLAG = (slug) => `bootstrap.kochiProfileDocs.${slug}`;

const DOCS = [
  {
    name: 'Brigadier (Dr.) A P Radhakrishnan',
    photo: 'brigadier-dr-a-p-radhakrishnan.jpg',
    // The write-up of the directory text that the site carried before.
    earlier: "Brigadier (Dr.) A P Radhakrishnan is a Senior Consultant in General Medicine & Diabetology, and has served as a consultant in several zonal Armed Forces hospitals since 1990.\n\n### Experience\n\n- Director and Consultant in Medicine, Military Hospital Jaipur\n- Director and Consultant in Medicine, Military Hospital Shillong\n- Senior Adviser Medicine and Non-Invasive Cardiologist, Military Hospital Secunderabad\n- Senior Consultant Medicine, Aster Medcity, Kochi",
  },
];

const same = (a, b) => String(a || '').trim() === String(b || '').trim();

async function bootstrapKochiProfileDocs(db = prisma, { store = storeFile } = {}) {
  // Runs once the directory has been imported.
  if (!(await db.setting.findUnique({ where: { key: 'bootstrap.kochiClientUpdates.v1' } }))) return;
  const doctors = await db.doctor.findMany();
  for (const entry of DOCS) {
    const slug = entry.photo.replace(/\.jpg$/, '');
    if (await db.setting.findUnique({ where: { key: FLAG(slug) } })) continue;
    const doc = doctors.find((d) => personKey(d.name) === personKey(entry.name));
    if (!doc) continue; // tried again on a later start
    const directory = DIRECTORY.find((d) => personKey(d.name) === personKey(entry.name));
    const data = {};
    const current = String(doc.fullBio || '').trim();
    if (!current || same(current, entry.earlier) || same(current, directory?.profile)) data.fullBio = PROFILES[entry.name];
    if (!String(doc.imageUrl || '').trim()) {
      const buffer = fs.readFileSync(path.join(DIR, entry.photo));
      const { fileName, url } = await store({ buffer, originalname: entry.photo, mimetype: 'image/jpeg' }, 'doctors');
      if (db.media) {
        await db.media.create({ data: { fileName, url, mimeType: 'image/jpeg', sizeBytes: buffer.length, folder: 'doctors' } });
      }
      data.imageUrl = url;
    }
    if (Object.keys(data).length) {
      await db.doctor.update({ where: { id: doc.id }, data });
      console.log(`Kochi profile document: updated ${entry.name} (${Object.keys(data).join(', ')})`);
    }
    await db.setting.create({ data: { key: FLAG(slug), value: Object.keys(data).join(', ') || 'kept admin edits' } });
  }
}

module.exports = { bootstrapKochiProfileDocs, DOCS };
