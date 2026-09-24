// Kinder Tharattazhaku — the pregnant women's fashion show contest, published
// as one of Kinder Kochi's own pages, beside the Premium Birthing Centre.
//
// Source: the visible content of kinderkochi.com/tharattazhaku, captured
// 24 September 2026 and kept verbatim in content/tharattazhaku-source.txt.
// This is a light copyedit of it: grammar and spelling tidied, the Season 3
// announcement (written in 2024 in the future tense) put in the past tense.
// Every fact, figure and name is unchanged. Hidden parts of that page — the
// partner logo walls, a 2023 registration notice, the prize list — are not
// shown to its visitors and are not carried over.
//
// Created once, published, and never touched again: it is edited in the
// admin's Content Library like any other page.
const prisma = require('./prisma');

const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const IMG = `${SITE_ASSETS}/kochi/tharattazhaku`;
const FLAG = 'bootstrap.tharattazhaku';

const PAGE = {
  sourceKey: 'kinderkochi-20260924:tharattazhaku',
  sourceFiles: 'https://www.kinderkochi.com/tharattazhaku',
  reviewNotes: '',
  title: 'Tharattazhaku — Celebrate Pregnancy',
  slug: 'kochi-tharattazhaku',
  category: 'Kochi Care',
  location: 'Kochi',
  excerpt:
    "Kinder Tharattazhaku is our pregnant women's fashion show contest — a memorable ramp walk for expecting mothers on Mother's Day, under the tagline “Let's Celebrate Pregnancy”.",
  imageUrl: `${IMG}/season-2-stage.webp`,
  sortOrder: 5,
  published: true,
  body: [
    `![Kinder Tharattazhaku Season 3 — Let's Celebrate Pregnancy](${IMG}/season-3-wordmark.webp)`,

    "India is the second most populous country, with a large number of infants born every year — yet pregnancy is often treated as a condition that demands only a clinical approach, not as a time to celebrate and cherish. Whether you're a first-time mom-to-be or pregnant with your second child (or third, or more!), the nine months leading up to birth are an undeniably wondrous and life-changing experience that deserves to be celebrated.",

    "Gone are the days of overly staid restrictions imposed by family and society, and of unsolicited advice for women during pregnancy. Today, expecting mothers see pregnancy as a time to rejoice — to capture pregnancy moments, prepare a baby's journal and create a family tree — not to hide the baby bump behind layers.",

    "Birth is the epicentre of women's power. At Kinder Hospitals we relish every moment of “pregnancy happiness” with expecting mothers.",

    "The Kinder Tharattazhaku Pregnant Women's Fashion Show Contest was designed for expecting mothers: a joyful pregnancy, celebrated with a memorable ramp walk on Mother's Day every year.",

    `![A mother-to-be in her Tharattazhaku gown](${IMG}/mother-to-be.webp)\n![Contestants on the Tharattazhaku ramp](${IMG}/ramp-walk.webp)`,

    '## Recognition',
    'The largest pregnant women\'s fashion show contest. This event achieved records with:',
    `![Logo: Asia Book of Records](${IMG}/asia-book-of-records.webp)\n![Logo: India Book of Records](${IMG}/india-book-of-records.webp)`,

    '## Watch the show',
    'https://www.youtube.com/watch?v=mX63GHhASzs',

    '## Season 3 · 2024',
    "Kinder Tharattazhaku Season 3 — the Pregnant Women's Fashion Show Contest 2024 — was presented under the brand of Kinder Women's Hospital & Fertility Centre, as another grand season of our signature event.",
    'Under the tagline “Let\'s Celebrate Pregnancy”, the season brought together several events:',
    [
      "- Pregnant Women's Fashion Show Contest",
      '- MomMix — Cake Mixing Ceremony',
      "- Spandanan — Pregnant Women's Music Competition",
      '- Kin Baby Bloom — Baby Shower Fest',
      '- Exclusive antenatal classes',
    ].join('\n'),
    'Season 3 set out on a world record attempt with more than 101 participants, in collaboration with a leading channel, brands and experts. Gifts, goodies and the winner\'s prize were worth a total of ₹25 lakh, and the show was set to stream live on YouTube, including on our own channel.',
    [
      '- Invitees: from all over India',
      '- Expected participants: 100+ pregnant women',
    ].join('\n'),
    'Season 3 was presented by KLF Nirmal.',
    `![Logo: KLF Nirmal Cold Pressed Virgin Coconut Oil](${IMG}/klf-nirmal.webp)`,

    '## Season 2 · 2023',
    "Kinder Tharattazhaku Season 2 — the Pregnant Women's Fashion Show Contest 2023 — drew a large audience and was a milestone in participation: 100 pregnant women stepped on to the ramp, and the event achieved records with the India Book of Records and the Asia Book of Records on stage.",
    'It generated millions of impressions on social media and was associated with 15 leading brands, including national brands, with artists, fashion icons and renowned personalities from various industries in attendance.',
    `![Season 2 on stage](${IMG}/season-2-stage.webp "Kinder Tharattazhaku Season 2 · 2023")`,

    '## Season 1 · 2022',
    "Kinder Tharattazhaku Season 1 — the Pregnant Women's Fashion Show Contest 2022 — touched many people and was a great success in participation, enthusiasm and online engagement, ultimately bringing joy to the “Little Hearts”.",
    [
      '- Nearly 70 pregnant women were screened',
      '- 48 expecting mothers stepped on to the ramp',
      '- 20+ eminent personalities, distinguished guests and companies took part',
      '- Nearly 10,000+ online and live spectators',
      '- 600 people and families attended the event',
    ].join('\n'),
    'The programme was covered by print and visual media and across social media platforms.',

    '## Celebrating pregnancy, every year',
    'After the success of 2022 and 2023, we are happy to host the event again — with the vibrant rhythm of ramp beats to which the little baby bump shall bounce. A platform this large helps spread the motto across India, and educate people across the country about the significance of pregnancy.',
  ].join('\n\n'),
};

async function bootstrapTharattazhaku(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;
  const existing =
    (await db.contentPage.findUnique({ where: { slug: PAGE.slug } })) ||
    (await db.contentPage.findUnique({ where: { sourceKey: PAGE.sourceKey } }));
  if (!existing) {
    await db.contentPage.create({ data: PAGE });
    console.log('Published the Kinder Kochi Tharattazhaku page');
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapTharattazhaku, PAGE, FLAG };
