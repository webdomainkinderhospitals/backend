// Doctor profiles the Kochi team sent as Word documents (Google Drive,
// "Doctor's profile updated", Sep 2026) — one per doctor, each with the
// doctor's studio portrait. They go further than the doctor directory:
// education, experience, publications, awards and memberships.
//
//  - Profile: the written-up document (data/kochiDoctorProfiles.json)
//    replaces the one on the site only while the site still shows what the
//    import put there (the directory's notes, their first write-up, or
//    nothing). A profile edited in the admin is kept.
//  - Qualifications: the card's short line is updated where the document
//    adds to it, again only if it still reads as imported.
//  - Photo: the portrait is copied into the media library (Media in the
//    admin) and set as the doctor's photo. These are the hospital's new
//    portraits, so they replace an earlier photo, whose address is kept in
//    the doctor's review notes.
// Each doctor is handled once, so anything changed in the admin afterwards
// is kept. A doctor not on the site yet is handled on a later start.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');
const { DIRECTORY, personKey } = require('./bootstrapKochiUpdates');

const PROFILES = require('./data/kochiDoctorProfiles.json');
// The profiles as first written up from the directory, before these documents.
const EARLIER = require('./data/kochiDoctorProfilesEarlier.json');
const DIR = path.join(__dirname, '..', '..', 'content', 'doctor-photos', 'kochi');
const FLAG = (name) => `bootstrap.kochiProfileDocs.${slugOf(name)}`;

const DOCS = [
  { name: "Brigadier (Dr.) A P Radhakrishnan", photo: "brigadier-dr-a-p-radhakrishnan.jpg", profile: true },
  { name: "Dr. Abhishek Radhakrishnan", photo: "dr-abhishek-radhakrishnan.jpg", profile: true },
  { name: "Dr. Aruna Chandra Babu", photo: "dr-aruna-chandra-babu.jpg", profile: true },
  { name: "Dr. Bipin Johny", photo: "dr-bipin-johny.jpg" },
  { name: "Dr. Boban Abraham", photo: "dr-boban-abraham.jpg" },
  { name: "Dr. Denny Paul Kuttikkat", photo: "dr-denny-paul-kuttikkat.jpg" },
  { name: "Dr. Madhuja Gopishyam", photo: "dr-madhuja-gopishyam.jpg", profile: true },
  { name: "Dr. Mahesh Krishnaswamy", profile: true },
  { name: "Dr. Manoj M", photo: "dr-manoj-m.jpg", profile: true },
  { name: "Mariea George", photo: "mariea-george.jpg", profile: true },
  { name: "Dr. Minu George", photo: "dr-minu-george.jpg", qualifications: "MBBS, MD, DM, Fellow of the European Board of Neurology" },
  { name: "Dr. Mithun Mathew", photo: "dr-mithun-mathew.jpg", profile: true },
  { name: "Dr. Nasna Majeed", photo: "dr-nasna-majeed.jpg", profile: true, qualifications: "MBBS, DGO, DNB, FAMS, DAMS, FIH, MCCG" },
  { name: "Dr. Nikhil V. Mathew", photo: "dr-nikhil-v-mathew.jpg", profile: true },
  { name: "Dr. Noorjahan P P", photo: "dr-noorjahan-p-p.jpg", profile: true },
  { name: "Dr. Praveen Kumar K S", photo: "dr-praveen-kumar-k-s.jpg", profile: true },
  { name: "Dr. Priyanka", photo: "dr-priyanka.jpg", profile: true },
  { name: "Dr. Reju Joseph Thomas", photo: "dr-reju-joseph-thomas.jpg", profile: true, qualifications: "MBBS, MS, FRCSEd & DNB (General Surgery), MCh & DNB (Paediatric Surgery), Masters in Minimal Access Surgery (UK), Fellowship in Robotic Surgery, MBA, AHMP (ISB)" },
  { name: "Dr. Rekha B Nair", photo: "dr-rekha-b-nair.jpg" },
  { name: "Dr. Rohith Pillai", photo: "dr-rohith-pillai.jpg", profile: true },
  { name: "Dr. Roshna Ramachandran", photo: "dr-roshna-ramachandran.jpg", profile: true },
  { name: "Dr. Sajitha Surendran", photo: "dr-sajitha-surendran.jpg", profile: true },
  { name: "Dr. Saranya Rajendran", photo: "dr-saranya-rajendran.jpg", profile: true },
  { name: "Dr. Shine Shukoor", photo: "dr-shine-shukoor.jpg", profile: true, qualifications: "MBBS, MD (Pulmonology), FCCP, MHA" },
  { name: "Dr. Shirley Joan Fernandez", photo: "dr-shirley-joan-fernandez.jpg", profile: true },
  { name: "Dr. Shivji Ramachandra Hedgon", photo: "dr-shivji-ramachandra-hedgon.jpg", profile: true },
  { name: "Dr. Sindhu Karthika Ammini", photo: "dr-sindhu-karthika-ammini.jpg", profile: true },
  { name: "Dr. Smitha Pratheesh", photo: "dr-smitha-pratheesh.jpg", profile: true },
  { name: "Dr. Smitha Surendran", photo: "dr-smitha-surendran.jpg", profile: true },
  { name: "Dr. Sooraj Menon R", photo: "dr-sooraj-menon-r.jpg", profile: true },
  { name: "Dr. Tehmina Asif", photo: "dr-tehmina-asif.jpg", profile: true },
  { name: "Dr. Vinay Raj", photo: "dr-vinay-raj.jpg", profile: true },
];

function slugOf(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
const same = (a, b) => String(a || '').trim() === String(b || '').trim();

async function bootstrapKochiProfileDocs(db = prisma, { store = storeFile } = {}) {
  // Runs once the directory has been imported.
  if (!(await db.setting.findUnique({ where: { key: 'bootstrap.kochiClientUpdates.v1' } }))) return;
  const doctors = await db.doctor.findMany();
  const updated = [];
  for (const entry of DOCS) {
    if (await db.setting.findUnique({ where: { key: FLAG(entry.name) } })) continue;
    const doc = doctors.find((d) => personKey(d.name) === personKey(entry.name));
    if (!doc) continue; // tried again on a later start
    const listed = DIRECTORY.find((d) => personKey(d.name) === personKey(entry.name)) || {};
    const data = {};

    const current = String(doc.fullBio || '').trim();
    if (entry.profile && PROFILES[entry.name] && !same(current, PROFILES[entry.name])
      && (!current || same(current, EARLIER[entry.name]) || same(current, listed.profile))) {
      data.fullBio = PROFILES[entry.name];
    }
    if (entry.qualifications && same(doc.bio, listed.qualifications)) data.bio = entry.qualifications;

    if (entry.photo) {
      const buffer = fs.readFileSync(path.join(DIR, entry.photo));
      const { fileName, url } = await store({ buffer, originalname: entry.photo, mimetype: 'image/jpeg' }, 'doctors');
      if (db.media) {
        await db.media.create({ data: { fileName, url, mimeType: 'image/jpeg', sizeBytes: buffer.length, folder: 'doctors' } });
      }
      data.imageUrl = url;
      const previous = String(doc.imageUrl || '').trim();
      if (previous) {
        const note = `Photo replaced on deploy with the portrait from the hospital's profile document (Sep 2026). Previous photo: ${previous}`;
        data.reviewNotes = [String(doc.reviewNotes || '').trim(), note].filter(Boolean).join('\n');
      }
    }

    if (Object.keys(data).length) {
      await db.doctor.update({ where: { id: doc.id }, data });
      updated.push(entry.name);
    }
    await db.setting.create({ data: { key: FLAG(entry.name), value: Object.keys(data).join(', ') || 'kept admin edits' } });
  }
  if (updated.length) console.log(`Kochi profile documents: updated ${updated.length} doctor${updated.length === 1 ? '' : 's'}`);
}

module.exports = { bootstrapKochiProfileDocs, DOCS, FLAG };
