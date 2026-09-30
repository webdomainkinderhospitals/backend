// The group's brand philosophy, from the Kinder Hospitals brand book: vision,
// mission, core values, what the brand mark stands for, and the core idea.
// The About page shows these; each is an ordinary Site Setting afterwards,
// edited under Site Settings → Brand philosophy. Seeded once, and a key that
// already has a value is left as it is.
const prisma = require('./prisma');

const FLAG = 'bootstrap.brandPhilosophy.v1';

const BRAND = {
  brandVision: 'To be a trusted healthcare partner offering compassionate, advanced, and affordable care.',
  brandMission:
    'To make available high-quality, personalised care with specialised and comprehensive range of services, in a cost-effective health care facility in India at par with international standards.',
  brandValues: ['Compassion', 'Integrity', 'Excellence', 'Innovation', 'Accessibility'].join('\n'),
  brandMark:
    "The red form represents a mother, symbolising love, care, protection and nurturing, while the blue form represents a child, reflecting innocence, trust and the promise of a healthy future. Together, the two forms create a warm and distinctive symbol of the unbreakable bond between mother and child, embodying Kinder Hospitals' commitment to nurturing life with compassion and care.",
  brandCoreIdea: 'A caring presence protecting and nurturing life.',
};

async function bootstrapBrandPhilosophy(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  let seeded = 0;
  for (const [key, value] of Object.entries(BRAND)) {
    const row = await db.setting.findUnique({ where: { key } });
    if (row && String(row.value || '').trim()) continue;
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    seeded++;
  }
  if (seeded) console.log('Seeded the brand philosophy settings');
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapBrandPhilosophy, BRAND, FLAG };
