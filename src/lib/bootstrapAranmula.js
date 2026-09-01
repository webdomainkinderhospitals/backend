// One-time bootstrap: adds Kinder Women & Children's Hospital – Aranmula
// (kinderaranmula.com, a unit of St. Thomas Hospital Malakara) as a location,
// with its centre-specific specialities, so it shows up in the admin's
// Hospitals screen (with the visibility toggle) and gets its own sub-site.
//
// Runs once, guarded by a Setting flag — after that the admin owns the
// content entirely: edits, hiding or deleting it are never overridden.
const prisma = require('./prisma');

const FLAG = 'bootstrap.aranmula';

const LOCATION = {
  name: 'Aranmula',
  slug: 'aranmula',
  city: 'Aranmula',
  country: 'India',
  tagline: "Women & children's hospital — a unit of St. Thomas Hospital, Malakara.",
  description:
    "Kinder Women & Children's Hospital, Aranmula brings the Kinder Group's " +
    'kindness-first care to Pathanamthitta as a trusted unit of St. Thomas ' +
    'Hospital, Malakara. The centre offers complete maternity care including ' +
    'normal and high-risk deliveries with antenatal education, personalised ' +
    "women's healthcare — menstrual issues, PCOD/PCOS, fibroids, " +
    'endometriosis, infertility evaluation and menopausal care — and ' +
    'dedicated care for infants, children and adolescents with vaccinations ' +
    'and growth monitoring. Newborns, including premature and high-risk ' +
    'babies, are looked after with advanced neonatal facilities and expert ' +
    'monitoring, supported by two fully equipped labour rooms, two ' +
    'state-of-the-art operation theatres and in-house ultrasound, X-ray and ' +
    'lab diagnostics.',
  highlights:
    'A unit of St. Thomas Hospital, Malakara\n' +
    'Complete maternity care — normal & high-risk deliveries\n' +
    'Advanced neonatal care for premature & high-risk newborns\n' +
    'Two fully equipped labour rooms · two modern operation theatres\n' +
    "Personalised women's healthcare — PCOD/PCOS, fibroids, infertility evaluation, menopause\n" +
    'Paediatric & adolescent care with vaccinations and growth monitoring\n' +
    'In-house ultrasound, X-ray and lab diagnostics',
  address:
    'St. Thomas Hospital campus, Malakkara – Kurichimuttom Road (SH 10), Aranmula, Pathanamthitta, Kerala 689532',
  phone: '+91 468 231 7494',
  email: 'contactus@kinderhospital.in',
  website: 'https://kinderaranmula.com',
  websiteLabel: 'Visit kinderaranmula.com →',
  since: "Women & Children's · Pathanamthitta",
  international: false,
  published: true,
};

const SPECIALITIES = [
  'Obstetrics',
  'Maternity',
  'High Risk Pregnancy',
  'Gynaecology',
  "Women's Wellness",
  'Paediatrics',
  'Neonatology',
];

async function bootstrapAranmula() {
  const done = await prisma.setting.findUnique({ where: { key: FLAG } });
  if (done) return;

  const existing = await prisma.location.findFirst({
    where: { name: { equals: 'Aranmula', mode: 'insensitive' } },
  });
  if (!existing) {
    const maxSort = await prisma.location.aggregate({ _max: { sortOrder: true } });
    await prisma.location.create({
      data: { ...LOCATION, sortOrder: (maxSort._max.sortOrder || 0) + 1 },
    });
    let specSort = 0;
    for (const name of SPECIALITIES) {
      await prisma.speciality.create({
        data: { name, location: 'Aranmula', sortOrder: ++specSort, published: true },
      });
    }
    console.log('Bootstrapped Kinder Aranmula location + specialities');
  }
  await prisma.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapAranmula };
