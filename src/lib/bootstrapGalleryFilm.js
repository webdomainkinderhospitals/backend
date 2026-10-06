// The first item in the website's Gallery: Kinder Hospitals Kochi's Water
// Birthing film (content/gallery), shared by the hospital. Its video and cover
// image are copied into storage and the media library (Media in the admin),
// and it is added as the featured video on the home page. From then on it is
// an ordinary Gallery item: the team can edit, hide or replace it in the admin.
//
// Done once. The flag is claimed before the upload, so when several Cloud Run
// instances start together only one of them adds the film; if the upload
// fails the claim is released and a later start tries again.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');

const FLAG = 'bootstrap.galleryWaterBirthingFilm';
const DIR = path.join(__dirname, '..', '..', 'content', 'gallery');

const FILM = {
  title: 'Water Birthing at Kinder Hospitals Kochi',
  caption: 'Step inside our water birthing suite — a calm, warm-water space for labour, with a dedicated team beside you.',
  location: 'Kochi',
  video: 'water-birthing.mp4',
  poster: 'water-birthing-poster.webp',
};

async function keep(db, store, file, mimetype) {
  const buffer = fs.readFileSync(path.join(DIR, file));
  const { fileName, url } = await store({ buffer, originalname: file, mimetype }, 'gallery');
  if (db.media) await db.media.create({ data: { fileName, url, mimeType: mimetype, sizeBytes: buffer.length, folder: 'gallery' } });
  return url;
}

async function bootstrapGalleryFilm(db = prisma, { store = storeFile } = {}) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  try {
    await db.setting.create({ data: { key: FLAG, value: 'adding' } });
  } catch (e) {
    return; // another instance is adding it
  }
  try {
    const mediaUrl = await keep(db, store, FILM.video, 'video/mp4');
    const posterUrl = await keep(db, store, FILM.poster, 'image/webp');
    await db.galleryItem.create({
      data: {
        title: FILM.title, caption: FILM.caption, kind: 'video', mediaUrl, posterUrl,
        location: FILM.location, showOnHome: true, featured: true, sortOrder: 0, published: true,
      },
    });
    await db.setting.update({ where: { key: FLAG }, data: { value: 'done' } });
    console.log('Added the Water Birthing film to the Gallery');
  } catch (e) {
    await db.setting.delete({ where: { key: FLAG } }).catch(() => {});
    throw e;
  }
}

module.exports = { bootstrapGalleryFilm, FILM, FLAG };
