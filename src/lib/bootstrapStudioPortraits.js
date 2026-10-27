// Studio portraits for every doctor whose photo the hospital has supplied
// (Kochi, Cherthala, Kollam), all on the same studio-blue backdrop as the
// Cherthala set, so the doctor cards read as one professional series
// (27 Oct 2026). The Kochi and Kollam photos were taken on grey or beige
// backgrounds; each was cut out and placed on that backdrop
// (content/doctor-photos/studio, 640 x 800).
//
// Each portrait is copied into the media library (Media in the admin) and set
// as the doctor's photo. The doctor's earlier photo address is kept in their
// review notes, so it can be put back. Each doctor is done once: a photo
// changed in the admin afterwards is kept. A portrait whose doctor is not on
// the site yet waits and is attached on a later start.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');

const DIR = path.join(__dirname, '..', '..', 'content', 'doctor-photos', 'studio');
const FLAG = (slug) => `bootstrap.studioPortraits.${slug}`;
const STORED = (slug) => `bootstrap.studioPortraits.${slug}.url`;

// file -> the doctor it shows and their centre
const PORTRAITS = [
  { file: 'cherthala-ananthen-k-s.webp', name: "Dr Ananthen K S", centre: 'Cherthala' },
  { file: 'cherthala-ashby-joseph.webp', name: "Dr Ashby Joseph", centre: 'Cherthala' },
  { file: 'cherthala-jeevan-raj-c-n.webp', name: "Dr Jeevan Raj CN", centre: 'Cherthala' },
  { file: 'cherthala-kevin-george.webp', name: "Dr Kevin George", centre: 'Cherthala' },
  { file: 'cherthala-meera-mohan.webp', name: "Dr Meera Mohan", centre: 'Cherthala' },
  { file: 'cherthala-neena-ananthen.webp', name: "Dr Neena Ananthen", centre: 'Cherthala' },
  { file: 'cherthala-rahul-k-h.webp', name: "Dr Rahul KH", centre: 'Cherthala' },
  { file: 'cherthala-remya.webp', name: "Dr Remya", centre: 'Cherthala' },
  { file: 'cherthala-reshmy-j-r.webp', name: "Dr Reshmy J R", centre: 'Cherthala' },
  { file: 'cherthala-shilpa-govind.webp', name: "Dr Shilpa Govind", centre: 'Cherthala' },
  { file: 'cherthala-thankachy-roy.webp', name: "Dr Thankachy Roy", centre: 'Cherthala' },
  { file: 'cherthala-vijitha-a-s.webp', name: "Dr Vijitha A S", centre: 'Cherthala' },
  { file: 'kochi-abhishek-radhakrishnan.webp', name: "Dr. Abhishek Radhakrishnan", centre: 'Kochi' },
  { file: 'kochi-aruna-chandra-babu.webp', name: "Dr. Aruna Chandra Babu", centre: 'Kochi' },
  { file: 'kochi-bipin-johny.webp', name: "Dr. Bipin Johny", centre: 'Kochi' },
  { file: 'kochi-boban-abraham.webp', name: "Dr. Boban Abraham", centre: 'Kochi' },
  { file: 'kochi-brigadier-dr-a-p-radhakrishnan.webp', name: "Brigadier (Dr.) A P Radhakrishnan", centre: 'Kochi' },
  { file: 'kochi-denny-paul-kuttikkat.webp', name: "Dr. Denny Paul Kuttikkat", centre: 'Kochi' },
  { file: 'kochi-madhuja-gopishyam.webp', name: "Dr. Madhuja Gopishyam", centre: 'Kochi' },
  { file: 'kochi-manoj-m.webp', name: "Dr. Manoj M", centre: 'Kochi' },
  { file: 'kochi-mariea-george.webp', name: "Mariea George", centre: 'Kochi' },
  { file: 'kochi-minu-george.webp', name: "Dr. Minu George", centre: 'Kochi' },
  { file: 'kochi-mithun-mathew.webp', name: "Dr. Mithun Mathew", centre: 'Kochi' },
  { file: 'kochi-nasna-majeed.webp', name: "Dr. Nasna Majeed", centre: 'Kochi' },
  { file: 'kochi-nikhil-v-mathew.webp', name: "Dr. Nikhil V. Mathew", centre: 'Kochi' },
  { file: 'kochi-noorjahan-p-p.webp', name: "Dr. Noorjahan P P", centre: 'Kochi' },
  { file: 'kochi-praveen-kumar-k-s.webp', name: "Dr. Praveen Kumar K S", centre: 'Kochi' },
  { file: 'kochi-priyanka.webp', name: "Dr. Priyanka", centre: 'Kochi' },
  { file: 'kochi-reju-joseph-thomas.webp', name: "Dr. Reju Joseph Thomas", centre: 'Kochi' },
  { file: 'kochi-rekha-b-nair.webp', name: "Dr. Rekha B Nair", centre: 'Kochi' },
  { file: 'kochi-rohith-pillai.webp', name: "Dr. Rohith Pillai", centre: 'Kochi' },
  { file: 'kochi-roshna-ramachandran.webp', name: "Dr. Roshna Ramachandran", centre: 'Kochi' },
  { file: 'kochi-sajitha-surendran.webp', name: "Dr. Sajitha Surendran", centre: 'Kochi' },
  { file: 'kochi-saranya-rajendran.webp', name: "Dr. Saranya Rajendran", centre: 'Kochi' },
  { file: 'kochi-shine-shukoor.webp', name: "Dr. Shine Shukoor", centre: 'Kochi' },
  { file: 'kochi-shirley-joan-fernandez.webp', name: "Dr. Shirley Joan Fernandez", centre: 'Kochi' },
  { file: 'kochi-shivji-ramachandra-hedgon.webp', name: "Dr. Shivji Ramachandra Hedgon", centre: 'Kochi' },
  { file: 'kochi-sindhu-karthika-ammini.webp', name: "Dr. Sindhu Karthika Ammini", centre: 'Kochi' },
  { file: 'kochi-smitha-pratheesh.webp', name: "Dr. Smitha Pratheesh", centre: 'Kochi' },
  { file: 'kochi-smitha-surendran.webp', name: "Dr. Smitha Surendran", centre: 'Kochi' },
  { file: 'kochi-sooraj-menon-r.webp', name: "Dr. Sooraj Menon R", centre: 'Kochi' },
  { file: 'kochi-tehmina-asif.webp', name: "Dr. Tehmina Asif", centre: 'Kochi' },
  { file: 'kochi-vinay-raj.webp', name: "Dr. Vinay Raj", centre: 'Kochi' },
  { file: 'kollam-beegam-raheena.webp', name: "Dr. Beegam Raheena", centre: 'Kollam' },
  { file: 'kollam-deepthi-prem.webp', name: "Dr. Deepthi Prem", centre: 'Kollam' },
  { file: 'kollam-hira.webp', name: "Dr. Hira", centre: 'Kollam' },
  { file: 'kollam-jilu-fathima-y.webp', name: "Dr. Jilu Fathima Y", centre: 'Kollam' },
  { file: 'kollam-manju-v-k.webp', name: "Dr. Manju V K", centre: 'Kollam' },
  { file: 'kollam-praveen-krishna-k-p.webp', name: "Dr. Praveen Krishna K P", centre: 'Kollam' },
  { file: 'kollam-reshmy-r-pillai.webp', name: "Dr. Reshmy R Pillai", centre: 'Kollam' },
  { file: 'kollam-shalini-mahapatra.webp', name: "Dr. Shalini Mahapatra", centre: 'Kollam' },
  { file: 'kollam-shoji.webp', name: "Dr. Shoji", centre: 'Kollam' },
];

// "Dr. Jeevan Raj C N" -> ["jeevan", "raj", "c", "n"]
const words = (name) => String(name || '').toLowerCase()
  .replace(/^\s*dr\.?\s*/, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
const CENTRE = { Kochi: /\b(kochi|cochin)\b/i, Cherthala: /\bcherthala\b/i, Kollam: /\bkollam\b/i };

// The doctor at that centre with the same name — the letters of the name, so
// "Jeevan Raj CN" and "Jeevan Raj C N" agree — or else the one doctor there
// whose name holds every word of the portrait's ("Kevin George" is
// "Dr. Kevin Antony George"; "Hira" is "Dr. Hira Fathima").
function doctorFor(entry, doctors) {
  const here = doctors.filter((d) => CENTRE[entry.centre].test(String(d.location || '')));
  const want = words(entry.name);
  const exact = here.filter((d) => words(d.name).join('') === want.join(''));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const holds = here.filter((d) => { const have = words(d.name); return want.every((w) => have.includes(w)); });
  return holds.length === 1 ? holds[0] : null;
}

async function storePhoto(db, entry, store) {
  const buffer = fs.readFileSync(path.join(DIR, entry.file));
  const { fileName, url } = await store({ buffer, originalname: entry.file, mimetype: 'image/webp' }, 'doctors');
  if (db.media) {
    await db.media.create({ data: { fileName, url, mimeType: 'image/webp', sizeBytes: buffer.length, folder: 'doctors' } });
  }
  return url;
}

async function bootstrapStudioPortraits(db = prisma, { store = storeFile } = {}) {
  const doctors = await db.doctor.findMany();
  let added = 0;
  for (const entry of PORTRAITS) {
    const slug = entry.file.replace(/\.webp$/, '');
    if (await db.setting.findUnique({ where: { key: FLAG(slug) } })) continue;
    const doc = doctorFor(entry, doctors);
    if (!doc) continue; // attached once the doctor is added in the admin

    const kept = await db.setting.findUnique({ where: { key: STORED(slug) } });
    const url = kept?.value || (await storePhoto(db, entry, store));
    if (!kept) await db.setting.create({ data: { key: STORED(slug), value: url } });
    const data = { imageUrl: url };
    const before = String(doc.imageUrl || '').trim();
    if (before && before !== url) {
      const note = `Earlier photo (before the studio portrait): ${before}`;
      data.reviewNotes = [String(doc.reviewNotes || '').trim(), note].filter(Boolean).join('\n');
    }
    await db.doctor.update({ where: { id: doc.id }, data });
    await db.setting.create({ data: { key: FLAG(slug), value: 'done' } });
    added++;
  }
  if (added) console.log(`Set ${added} studio doctor portrait${added === 1 ? '' : 's'}`);
}

module.exports = { bootstrapStudioPortraits, PORTRAITS, doctorFor };
