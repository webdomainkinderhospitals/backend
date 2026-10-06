// Requested source content, seeded once as ordinary Admin Content Library pages.
// Existing records (including drafts) and subsequent editorial changes are preserved.
const FLAG = 'bootstrap.pregnancyHighlights.20261006';
const SOURCE = 'https://kinderhospital.in/celebrate-your-pregnancy';
const WATER_SOURCE = 'https://www.kinderkochi.com/water-birth';
const ASSETS = (process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app').replace(/\/$/, '');
const definitions = [
  ['spandanam', 'Spandanam · Music & Motherhood', 'Cherthala', 'spandanam',
    'A musical celebration that gives expectant mothers a stage to share their talent and joy.',
    'Spandanam brings mothers-to-be together through music at Kinder Cherthala. Past editions welcomed participants from across Kerala.\n\n## Join the celebration\n\nContact the Cherthala team for upcoming editions and registration details.'],
  ['tharattazhaku', 'Tharattazhaku · Celebrate Your Confidence', 'Kochi', 'tharatazhakku',
    'A fashion-show celebration of pregnancy, confidence and memorable moments with family.',
    'Kinder Tharattazhaku celebrates expectant mothers on the runway. The source features the 2024 season; it is event history, not a current registration announcement.\n\n## Take part\n\nAsk Kinder Kochi about the next edition.'],
  ['mom-to-be', 'Mom-to-be · Baby Shower Celebrations', 'Cherthala', 'mom-to-be',
    'Celebrate the mother-to-be with a special ceremony, shared happiness and family moments.',
    'Crowning, sweet treats, hospital visits and activities bring families together to celebrate the approaching arrival.\n\n## Plan your visit\n\nAsk the Cherthala team about current baby shower programmes.'],
  ['antenatal-classes', 'Antenatal Classes · Learn with Confidence', 'Cherthala', 'antenatal-classes',
    'Expert-led learning and practical conversations to help you prepare for birth and parenthood.',
    'Sessions cover pregnancy care, nutrition, anaesthesia, stem-cell awareness, neonatal care and breastfeeding, with questions, a hospital tour and celebrations.\n\n## Book a session\n\nConfirm current class dates with Kinder Cherthala.'],
  ['mom-mix', 'Mom Mix · Shared Joy, Sweet Memories', 'Kochi', 'cake-mixing',
    'A cake-mixing celebration bringing expectant parents together for a joyful shared experience.',
    'Kinder Kochi’s Mom Mix brings couples together in a festive cake-mixing event.\n\n## Upcoming events\n\nContact Kochi for the latest programme and registration details.'],
  ['water-birth', 'Water Birth · A Calmer Space for Labour', 'Kochi', '',
    'Explore warm-water labour support and Kinder Kochi’s dedicated water birthing centre with your maternity team.',
    'Kinder Kochi describes themed birthing suites, a dedicated team and infection-prevention protocols. Water immersion during labour may support comfort and relaxation. Labouring in water and giving birth in water are distinct choices to discuss with your obstetrician.\n\n## Is it suitable for me?\n\nEligibility depends on your pregnancy, your health, your baby’s position and wellbeing, and how labour progresses. Your clinical team will assess suitability and explain the available alternatives.\n\n## Care throughout labour\n\nThe team monitors mother and baby, including temperature, pulse, blood pressure and the baby’s heartbeat. You may need to leave the pool for additional pain relief, monitoring or a change in your care needs.\n\n## Discuss your birth preferences\n\nAsk the Kochi maternity team about eligibility, benefits, risks, availability and your individual birth plan.'],
];
definitions.push(['first-moments', 'A Welcome to Remember', 'Cherthala', '',
  'From keepsake fingerprints and tiny footprints to a joyful homecoming, celebrate the beginning of life together.',
  'Kinder Cherthala describes a personal welcome for each new family: parents’ fingerprints collected at admission join the baby’s footprints in a keepsake card. A birthday song, decorated cradle, balloons and gifts mark the arrival.\n\n## Taking your memories home\n\nThe welcome experience also describes a decorated homecoming car and a tree sapling, symbolising your child’s growing journey. Ask the Cherthala team about current arrangements and availability.']);
const PAGES = definitions.map(([short, title, location, image, excerpt, body], i) => ({
  slug: `celebrate-${short}`, title, location, category: 'Celebrate Pregnancy', excerpt, body,
  imageUrl: image ? `${ASSETS}/celebrate-pregnancy/${image}.webp` : '', galleryUrls: '',
  sourceKey: `pregnancy-highlights-20261006-${short}`,
  sourceFiles: short === 'water-birth' ? WATER_SOURCE : SOURCE,
  reviewNotes: '', published: true, sortOrder: 30 + i,
}));
async function bootstrapPregnancyHighlights(db = require('./prisma')) {
  return db.$transaction(async (tx) => {
    // Serialize competing Cloud Run startup instances before checking the flag.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261006, 613)`;
    if (await tx.setting.findUnique({ where: { key: FLAG } })) return;
    for (const page of PAGES) {
      const existing = await tx.contentPage.findFirst({ where: { OR: [{ slug: page.slug }, { sourceKey: page.sourceKey }] } });
      if (!existing) await tx.contentPage.create({ data: page });
    }
    await tx.setting.create({ data: { key: FLAG, value: 'done' } });
  }, { maxWait: 10000, timeout: 30000 });
}
module.exports = { bootstrapPregnancyHighlights, PAGES, FLAG };
