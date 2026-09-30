// Portraits for the Kochi doctor directory, taken from each doctor's profile
// page on kinderkochi.com and copied into the site's own media library (so
// they keep working if that site changes, and appear under Media in the admin).
//
// Best effort, and only for doctors who have no photo yet — a portrait
// uploaded in the admin is never replaced. kinderkochi.com rejects requests
// that don't look like a browser, hence the headers. If the site can't be
// reached at all the pass is retried on a later start, up to MAX_ATTEMPTS.
const prisma = require('./prisma');
const { storeFile } = require('./storage');
const { DIRECTORY, personKey } = require('./bootstrapKochiUpdates');

const FLAG = 'bootstrap.kochiDoctorPhotos.v1';
const ATTEMPTS = 'bootstrap.kochiDoctorPhotos.attempts';
const MAX_ATTEMPTS = 5;
const ORIGIN = 'https://www.kinderkochi.com';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// The portrait on a profile page: the site files them under /uploads/doctors/.
function photoUrlFrom(html) {
  const match = String(html || '').match(/(?:https?:\/\/(?:www\.)?kinderkochi\.com)?\/uploads\/doctors\/[^"'\s)>]+?\.(?:jpe?g|png|webp)/i);
  if (!match) return '';
  return match[0].startsWith('http') ? match[0] : `${ORIGIN}${match[0]}`;
}

async function get(url, fetchImpl, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: HEADERS, signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function bootstrapKochiDoctorPhotos(db = prisma, { fetchImpl = globalThis.fetch, store = storeFile } = {}) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  // Runs after the directory sync has created the doctors.
  if (!(await db.setting.findUnique({ where: { key: 'bootstrap.kochiClientUpdates.v1' } }))) return;

  const doctors = await db.doctor.findMany();
  const byKey = new Map(doctors.map((d) => [personKey(d.name), d]));
  let reached = 0;
  let added = 0;
  for (const entry of DIRECTORY) {
    const doc = byKey.get(personKey(entry.name));
    if (!doc || String(doc.imageUrl || '').trim() || !entry.url) continue;
    try {
      const page = await get(entry.url, fetchImpl);
      reached++;
      const src = photoUrlFrom(await page.text());
      if (!src) continue;
      const image = await get(src, fetchImpl);
      const ext = (src.match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0].toLowerCase();
      const buffer = Buffer.from(await image.arrayBuffer());
      if (buffer.length < 1024) continue;
      const mimetype = TYPES[ext] || 'image/jpeg';
      const { fileName, url } = await store({ buffer, originalname: `doctor${ext}`, mimetype }, 'doctors');
      if (db.media) {
        await db.media.create({ data: { fileName, url, mimeType: mimetype, sizeBytes: buffer.length, folder: 'doctors' } });
      }
      await db.doctor.update({ where: { id: doc.id }, data: { imageUrl: url } });
      added++;
    } catch (e) {
      // One unreachable profile shouldn't stop the rest.
    }
  }
  if (added) console.log(`Imported ${added} Kochi doctor photos`);

  const attempts = Number((await db.setting.findUnique({ where: { key: ATTEMPTS } }))?.value || 0) + 1;
  if (reached || attempts >= MAX_ATTEMPTS) {
    await db.setting.create({ data: { key: FLAG, value: 'done' } });
  } else {
    console.log(`kinderkochi.com unreachable for doctor photos (attempt ${attempts}/${MAX_ATTEMPTS})`);
    await db.setting.upsert({ where: { key: ATTEMPTS }, update: { value: String(attempts) }, create: { key: ATTEMPTS, value: String(attempts) } });
  }
}

module.exports = { bootstrapKochiDoctorPhotos, photoUrlFrom, FLAG };
