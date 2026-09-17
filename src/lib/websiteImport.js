const pack = require('./contentPack');
const models = { doctors: 'doctor', specialities: 'speciality', pages: 'contentPage' };

// Match a source key first, then a name and exact hospital assignment. Never
// replace an editor's work or turn an existing published record into a draft.
async function existingRecord(db, record) {
  const model = db[models[record.collection]];
  const source = await model.findUnique({ where: { sourceKey: record.data.sourceKey } });
  if (source) return source;
  if (record.collection === 'pages') return model.findUnique({ where: { slug: record.data.slug } });
  return model.findFirst({ where: {
    name: { equals: record.data.name, mode: 'insensitive' },
    location: { equals: record.data.location, mode: 'insensitive' },
  } });
}

async function previewImport(db) {
  const items = [];
  for (const record of pack.records) {
    const existing = await existingRecord(db, record);
    items.push({ collection: record.collection, title: record.data.title || record.data.name,
      location: record.data.location, notes: record.data.reviewNotes,
      proposedText: record.data.fullBio || record.data.fullDescription || record.data.body,
      action: existing ? 'preserve' : 'create', existingId: existing?.id });
  }
  return { version: pack.version, unavailable: pack.unavailable, items };
}

async function importContent(prisma) {
  return prisma.$transaction(async (db) => {
    // Serialize concurrent imports across Cloud Run instances.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(19860915)`;
    let created = 0, preserved = 0;
    for (const record of pack.records) {
      if (await existingRecord(db, record)) { preserved++; continue; }
      await db[models[record.collection]].create({ data: { ...record.data, published: false } });
      created++;
    }
    return { created, preserved, version: pack.version, unavailable: pack.unavailable };
  }, { timeout: 60000 });
}

module.exports = { previewImport, importContent };
