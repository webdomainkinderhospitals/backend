// The hospital's news archive (Kinder news, Nov 2026): 21 stories from 2021
// to 2025 with their photos (content/news). Each story becomes a News post —
// listed under News in the admin, where the team can edit, hide or replace
// it — with its cover as the post's picture and its other photos as the
// post's gallery. Every photo is also copied into the media library.
//
// Each story is added once. Its flag is claimed before the upload, so when
// several Cloud Run instances start together only one adds it; if an upload
// fails the claim is released and a later start tries again. A story whose
// address is already taken (added by hand in the admin) is left alone.
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');
const { storeFile } = require('./storage');

const DIR = path.join(__dirname, '..', '..', 'content', 'news');
const STORIES = JSON.parse(fs.readFileSync(path.join(DIR, 'stories.json'), 'utf8'));
const FLAG = (slug) => `bootstrap.kinderNews.${slug}`;

async function keep(db, store, slug, file) {
  const buffer = fs.readFileSync(path.join(DIR, slug, file));
  const { fileName, url } = await store({ buffer, originalname: `${slug}-${file}`, mimetype: 'image/webp' }, 'news');
  if (db.media) await db.media.create({ data: { fileName, url, mimeType: 'image/webp', sizeBytes: buffer.length, folder: 'news' } });
  return url;
}

async function addStory(db, store, story) {
  const key = FLAG(story.slug);
  if (await db.setting.findUnique({ where: { key } })) return false;
  try {
    await db.setting.create({ data: { key, value: 'adding' } });
  } catch (e) {
    return false; // another instance is adding it
  }
  try {
    if (await db.newsPost.findUnique({ where: { slug: story.slug } })) {
      await db.setting.update({ where: { key }, data: { value: 'already there' } });
      return false;
    }
    const imageUrl = await keep(db, store, story.slug, story.cover);
    const gallery = [];
    for (const photo of story.photos) gallery.push(await keep(db, store, story.slug, photo));
    await db.newsPost.create({
      data: {
        title: story.title, slug: story.slug, category: story.category, excerpt: story.excerpt,
        body: story.body, imageUrl, galleryUrls: gallery.join('\n'), author: story.author,
        location: story.location, publishedAt: new Date(`${story.date}T10:00:00+05:30`), published: true,
      },
    });
    await db.setting.update({ where: { key }, data: { value: 'done' } });
    return true;
  } catch (e) {
    await db.setting.delete({ where: { key } }).catch(() => {});
    throw e;
  }
}

async function bootstrapKinderNews(db = prisma, { store = storeFile } = {}) {
  let added = 0;
  for (const story of STORIES) if (await addStory(db, store, story)) added++;
  if (added) console.log(`Added ${added} Kinder news ${added === 1 ? 'story' : 'stories'}`);
}

module.exports = { bootstrapKinderNews, STORIES, FLAG };
