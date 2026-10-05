// Studio portraits of the Kochi doctors, shared by the hospital on Google
// Drive (folder "Profiles", 25–28 Sep 2026), each file named after its doctor
// ("Dr Afshana - Fetomaternal Medicine.jpg"). The originals are 6–13 MB, so
// each is fetched from Google already resized for the web (1200 px), copied
// into the media library (Media in the admin) and set as the doctor's photo.
//
// These are the hospital's own new portraits, so they replace the photo a
// doctor had before (often the one copied from kinderkochi.com). The earlier
// photo's address is kept in the doctor's review notes, so it can be put back.
// Each doctor is done once: a photo changed in the admin afterwards is kept.
//
// The Drive files must be shared as "Anyone with the link". A photo that
// can't be fetched is tried again on the next start, up to MAX_ATTEMPTS.
const prisma = require('./prisma');
const { storeFile } = require('./storage');
const { personKey } = require('./bootstrapKochiUpdates');

const FLAG = (id) => `bootstrap.kochiStudioPortraits.${id}`;
const ATTEMPTS = 'bootstrap.kochiStudioPortraits.attempts';
const MAX_ATTEMPTS = 5;

// Drive file -> the doctor it shows, as the hospital named the file.
const PORTRAITS = [
  { id: '1vRt5IuRB0TC6RRNcxWiVjtvSOxulVZmi', file: 'Dr Afshana - Fetomaternal Medicine', name: 'Dr. Afshana Sidhik' },
  { id: '1HzshGn0JP2VF1BiBc6wLzv3spsJsdugV', file: 'Dr anooj - Dental', name: 'Dr. Anooj' },
  { id: '1Id7wUNB3Qn6qpekePq65o1Ua-1oR3GgD', file: 'Dr Ap radhakrishnan - General medicine', name: 'Brigadier (Dr.) A P Radhakrishnan' },
  { id: '16Uc7y89nP7gudQyHy9zoVMONqx0y1OJQ', file: 'Dr George - Pediatrics & Neonatology', name: 'Dr. George Joseph P' },
  { id: '1X47TgzWAE6g0RUp5M11V2cYUS0AL8CAB', file: 'Dr madhuja - Obg & Genecology', name: 'Dr. Madhuja Gopishyam' },
  { id: '1CH2jslp7TKuB6zIGUZfpSOZkIAaP922b', file: 'Dr Mahesh - Urology', name: 'Dr. Mahesh Krishnaswamy' },
  { id: '1wLFvgYfLe7SGli9c_humcoavdv_d7bL8', file: 'Dr manoj - Orthopaedics', name: 'Dr. Manoj M' },
  { id: '122BnGQokHhPQSnB4NWAmzuh2hzLapnl5', file: 'Dr mithun - Radiology', name: 'Dr. Mithun Mathew' },
  { id: '1DMy1vSo4wtVpMoI_uO17TwVoylmbailH', file: 'Dr Nasna - Gynecology & Obg', name: 'Dr. Nasna Majeed' },
  { id: '12Pog_MzS7rNfg7Zj9cviwyIFAkhKPe6u', file: 'Dr Noorjahan - Obg & Gynecology', name: 'Dr. Noorjahan P P' },
  { id: '1tdUsXQrNZ0KpppILSm_ocqckuJ1yfm20', file: 'Dr Parvathy - Ent', name: 'Dr. Parvathy AP' },
  { id: '1jbHVUw0n1ezSPCkURXCwuk9n0-vaTo4h', file: 'Dr praveen - Orthopaedics', name: 'Dr. Praveen Kumar K S' },
  { id: '1BE7XJXmlB_5UnK4GaZLSBrocGEGTYz9L', file: 'Dr Priyanka - Reproductive Medicine', name: 'Dr. Priyanka' },
  { id: '1jcjgVmXReV_9Qmn6DV-Bv0GzQs_K37es', file: 'Dr reema - Obg & Genecology', name: 'Dr. Reema Poyil Kunhammed' },
  { id: '1pIlGK3wL24bDGBNV3khUrsYmdT8zgeFn', file: 'Dr Reju - Pediatrics Urology & Surgery', name: 'Dr. Reju Joseph Thomas' },
  { id: '1D0wl5I5UuT8PRtvAiKHze8q4lNYao8Wh', file: 'Dr Rohith - General Surgery', name: 'Dr. Rohith Pillai' },
  { id: '1rxxOIjoTSKXVcn4L94jvay1a_X6wH0Qv', file: 'Dr Roshna - General Medicine & Dibetology', name: 'Dr. Roshna Ramachandran' },
  { id: '14qSHZoABUW5tCiXkar2wbvi413xd2lIM', file: 'Dr Saranya - General Surgery', name: 'Dr. Saranya Rajendran' },
  { id: '1qjuEqRT9FY4gJK23XIA76msrzNCzrLbg', file: 'Dr sherly - General Medicine & Geriatrics', name: 'Dr. Shirley Joan Fernandez' },
  { id: '1AWYHoI7IXDYrVLCzgXgl7NYvzg2FIU_k', file: 'Dr Shine Shukoor - Pulmonology', name: 'Dr. Shine Shukoor' },
  { id: '1wHaIQOEkMGUs6DSopLXJhKnYFkiRjNm8', file: 'Dr sindu - Neonatology & Pediatrics', name: 'Dr. Sindhu Karthika Ammini' },
  { id: '1EsCguGeMv3rRU2kWA1sOKXLKgIwh7kVw', file: 'Dr Sivji - Neonatology & Pediatrics', name: 'Dr. Shivji Ramachandra Hedgon' },
  // "Dr smitha – OBG": the folder has Dr Smitha Pratheesh's portrait under
  // her full name, so this is the other Smitha in OBG, Dr. Smitha Surendran.
  { id: '1CucV5alsdzDVHFb5-ULosrhXlU1i34N0', file: 'Dr smitha - Obg & Genecology', name: 'Dr. Smitha Surendran' },
  { id: '1YNLKnqr2ywoq5so30-w4ooluOvMzQrPg', file: 'Dr Smitha Pratheesh', name: 'Dr. Smitha Pratheesh' },
  { id: '1_l4NYi-z1aiYRuDrfa0LsK85HrLojSH3', file: 'Dr Vinay - ENT', name: 'Dr. Vinay Raj' },
];

// Google serves a resized copy of a link-shared Drive image at these.
const sources = (id) => [
  `https://lh3.googleusercontent.com/d/${id}=w1200`,
  `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'image/jpeg,image/png,image/*;q=0.8',
};

// A real image (not a sign-in page), of a sensible size for the web.
function imageType(buffer) {
  if (buffer.length < 10 * 1024 || buffer.length > 5 * 1024 * 1024) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return { ext: '.jpg', mimetype: 'image/jpeg' };
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return { ext: '.png', mimetype: 'image/png' };
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return { ext: '.webp', mimetype: 'image/webp' };
  return null;
}

async function fetchPortrait(id, fetchImpl) {
  for (const url of sources(id)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetchImpl(url, { headers: HEADERS, signal: controller.signal, redirect: 'follow' });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const type = imageType(buffer);
      if (type) return { buffer, ...type };
    } catch (e) {
      // try the next source
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const slugOf = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function bootstrapKochiStudioPortraits(db = prisma, { fetchImpl = globalThis.fetch, store = storeFile } = {}) {
  // Runs once the directory has been imported.
  if (!(await db.setting.findUnique({ where: { key: 'bootstrap.kochiClientUpdates.v1' } }))) return;
  const attemptsRow = await db.setting.findUnique({ where: { key: ATTEMPTS } });
  const attempts = Number(attemptsRow?.value || 0);
  if (attempts >= MAX_ATTEMPTS) return;

  const doctors = await db.doctor.findMany();
  let added = 0;
  let pending = 0;
  let failedInARow = 0;
  for (const entry of PORTRAITS) {
    if (await db.setting.findUnique({ where: { key: FLAG(entry.id) } })) continue;
    const doc = doctors.find((d) => personKey(d.name) === personKey(entry.name));
    if (!doc) { pending++; continue; } // attached once the doctor is on the site
    // Google unreachable from here: stop this start's pass early.
    if (failedInARow >= 3) { pending++; continue; }

    const image = await fetchPortrait(entry.id, fetchImpl);
    if (!image) { pending++; failedInARow++; continue; }
    failedInARow = 0;

    const { fileName, url } = await store({ buffer: image.buffer, originalname: `${slugOf(entry.name)}${image.ext}`, mimetype: image.mimetype }, 'doctors');
    if (db.media) {
      await db.media.create({ data: { fileName, url, mimeType: image.mimetype, sizeBytes: image.buffer.length, folder: 'doctors' } });
    }
    const data = { imageUrl: url };
    const previous = String(doc.imageUrl || '').trim();
    if (previous) {
      const note = `Photo replaced on deploy with the hospital's studio portrait ("${entry.file}", Sep 2026). Previous photo: ${previous}`;
      data.reviewNotes = [String(doc.reviewNotes || '').trim(), note].filter(Boolean).join('\n');
    }
    await db.doctor.update({ where: { id: doc.id }, data });
    await db.setting.create({ data: { key: FLAG(entry.id), value: url } });
    added++;
  }

  if (added) console.log(`Added ${added} Kochi studio portrait${added === 1 ? '' : 's'}`);
  if (pending) {
    const next = attempts + 1;
    console.log(`${pending} Kochi studio portrait${pending === 1 ? '' : 's'} still to add (attempt ${next}/${MAX_ATTEMPTS})`);
    await db.setting.upsert({ where: { key: ATTEMPTS }, update: { value: String(next) }, create: { key: ATTEMPTS, value: String(next) } });
  }
}

module.exports = { bootstrapKochiStudioPortraits, PORTRAITS, imageType, FLAG };
