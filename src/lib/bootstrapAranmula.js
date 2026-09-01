// One-time bootstraps for Kinder Women & Children's Hospital – Aranmula
// (kinderaranmula.com, a unit of St. Thomas Hospital Malakara).
//
// v1 creates the location + specialities; v2 refreshes the content to match
// the hospital's own website (welcome text, SICU/NICU facility details,
// Radiology & Diagnostics, professional images). Each step is guarded by a
// Setting flag and NEVER overwrites a field the admin has already changed.
const prisma = require('./prisma');

const FLAG_V1 = 'bootstrap.aranmula';
const FLAG_V2 = 'bootstrap.aranmula.v2';

// v1 texts — kept verbatim so v2 can tell "untouched" apart from admin edits.
const V1_DESCRIPTION =
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
  'lab diagnostics.';

const V1_HIGHLIGHTS =
  'A unit of St. Thomas Hospital, Malakara\n' +
  'Complete maternity care — normal & high-risk deliveries\n' +
  'Advanced neonatal care for premature & high-risk newborns\n' +
  'Two fully equipped labour rooms · two modern operation theatres\n' +
  "Personalised women's healthcare — PCOD/PCOS, fibroids, infertility evaluation, menopause\n" +
  'Paediatric & adolescent care with vaccinations and growth monitoring\n' +
  'In-house ultrasound, X-ray and lab diagnostics';

// v2 — matches kinderaranmula.com's own welcome text and facilities.
const V2_DESCRIPTION =
  "Kinder Women & Children's Hospital, Aranmula is dedicated to providing " +
  'compassionate, advanced and holistic healthcare for women and children. ' +
  'As a trusted unit of St. Thomas Hospital, Malakara, it continues a ' +
  'legacy of excellence and patient-centred care. An expert team of ' +
  'obstetricians, gynaecologists, paediatricians and neonatologists ' +
  'delivers comprehensive care — from pregnancy and childbirth to ' +
  'paediatric and adolescent health — in a safe and supportive ' +
  'environment. Facilities include two fully equipped labour rooms with ' +
  'advanced fetal monitoring, two state-of-the-art operation theatres for ' +
  'obstetric, gynaecological and paediatric surgery, a three-bedded ' +
  'Surgical ICU, a five-bedded Level 3 NICU for premature and high-risk ' +
  'newborns, and in-house ultrasound, X-ray and lab diagnostics. With ' +
  'modern infrastructure, advanced technology and a warm, family-friendly ' +
  'atmosphere, Kinder Aranmula ensures comfort, safety and quality care ' +
  'at every stage of life.';

const V2_HIGHLIGHTS =
  'A unit of St. Thomas Hospital, Malakara\n' +
  'Expert obstetricians, gynaecologists, paediatricians & neonatologists\n' +
  'Two fully equipped labour rooms with advanced fetal monitoring\n' +
  'Two state-of-the-art operation theatres — obstetric, gynaec & paediatric surgery\n' +
  'Three-bedded Surgical ICU (SICU) with continuous monitoring\n' +
  'Five-bedded Level 3 NICU for premature & high-risk newborns\n' +
  "Personalised women's healthcare — PCOD/PCOS, fibroids, infertility evaluation, menopause\n" +
  'In-house ultrasound, X-ray and lab diagnostics';

// Professional stock photography already proven good in this project.
const CARD_IMAGE =
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80';
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=1920&q=80';

const LOCATION = {
  name: 'Aranmula',
  slug: 'aranmula',
  city: 'Aranmula',
  country: 'India',
  tagline: "Women & children's hospital — a unit of St. Thomas Hospital, Malakara.",
  description: V2_DESCRIPTION,
  highlights: V2_HIGHLIGHTS,
  address:
    'St. Thomas Hospital campus, Malakkara – Kurichimuttom Road (SH 10), Aranmula, Pathanamthitta, Kerala 689532',
  phone: '+91 468 231 7494',
  email: 'contactus@kinderhospital.in',
  website: 'https://kinderaranmula.com',
  websiteLabel: 'Visit kinderaranmula.com →',
  since: "Women & Children's · Pathanamthitta",
  imageUrl: CARD_IMAGE,
  heroImageUrl: HERO_IMAGE,
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
  'Radiology & Diagnostics',
];

const FLAG_V3 = 'bootstrap.aranmula.v3';

// The Aranmula medical team as published on kinderaranmula.com.
// Photos are not seeded — upload each doctor's real portrait via the admin
// (Services & Doctors → edit doctor → upload photo); a branded placeholder
// shows until then.
const DOCTORS = [
  { name: 'Dr. Aswathi A. S', designation: 'MBBS, MS (Obstetrics & Gynaecology)', speciality: 'Obstetrics & Gynaecology' },
  { name: 'Dr. Milena Kamal', designation: 'MBBS, MS (Obstetrics & Gynaecology) — Neonatology and Paediatrics', speciality: 'Obstetrics & Gynaecology' },
  { name: 'Dr. Sethulakshmi S', designation: 'MBBS, DNB, MNAMS · Diploma in Cosmetic Gynaecology · Fellowship in Laparoscopy & NDVH', speciality: 'Gynaecology' },
  { name: 'Dr. Jeswin Mary James', designation: 'MBBS, DCH, DNB (Paediatrics)', speciality: 'Paediatrics' },
  { name: 'Dr. Ganga M P', designation: 'MBBS, DGO', speciality: 'Obstetrics & Gynaecology' },
];

const norm = (s) => String(s || '').trim().toLowerCase();

async function ensureSpecialities() {
  const existing = await prisma.speciality.findMany({ where: { location: 'Aranmula' } });
  const have = new Set(existing.map((s) => norm(s.name)));
  let sort = existing.reduce((m, s) => Math.max(m, s.sortOrder || 0), 0);
  for (const name of SPECIALITIES) {
    if (have.has(norm(name))) continue;
    await prisma.speciality.create({
      data: { name, location: 'Aranmula', sortOrder: ++sort, published: true },
    });
  }
}

async function bootstrapAranmula() {
  const findLoc = () =>
    prisma.location.findFirst({ where: { name: { equals: 'Aranmula', mode: 'insensitive' } } });

  // v1 — create everything on installs that never had Aranmula.
  if (!(await prisma.setting.findUnique({ where: { key: FLAG_V1 } }))) {
    if (!(await findLoc())) {
      const maxSort = await prisma.location.aggregate({ _max: { sortOrder: true } });
      await prisma.location.create({
        data: { ...LOCATION, sortOrder: (maxSort._max.sortOrder || 0) + 1 },
      });
      console.log('Bootstrapped Kinder Aranmula location');
    }
    await ensureSpecialities();
    await prisma.setting.create({ data: { key: FLAG_V1, value: 'done' } });
  }

  // v2 — refresh installs that got v1: better copy, SICU/NICU facilities,
  // images and the Radiology & Diagnostics speciality. Only fields still
  // carrying the v1 text (or empty) are touched; admin edits always win.
  if (!(await prisma.setting.findUnique({ where: { key: FLAG_V2 } }))) {
    const loc = await findLoc();
    if (loc) {
      const data = {};
      if (!loc.description || loc.description === V1_DESCRIPTION) data.description = V2_DESCRIPTION;
      if (!loc.highlights || loc.highlights === V1_HIGHLIGHTS) data.highlights = V2_HIGHLIGHTS;
      if (!loc.imageUrl) data.imageUrl = CARD_IMAGE;
      if (!loc.heroImageUrl) data.heroImageUrl = HERO_IMAGE;
      if (Object.keys(data).length) {
        await prisma.location.update({ where: { id: loc.id }, data });
      }
      await ensureSpecialities();
      console.log('Refreshed Kinder Aranmula content (v2)');
    }
    await prisma.setting.create({ data: { key: FLAG_V2, value: 'done' } });
  }

  // v3 — the published Aranmula doctor roster. Created once; never touches
  // doctors that already exist (by name) or later admin edits/deletions.
  if (!(await prisma.setting.findUnique({ where: { key: FLAG_V3 } }))) {
    const existing = await prisma.doctor.findMany();
    const have = new Set(existing.map((d) => norm(d.name)));
    let sort = existing.reduce((m, d) => Math.max(m, d.sortOrder || 0), 0);
    let created = 0;
    for (const doc of DOCTORS) {
      if (have.has(norm(doc.name))) continue;
      await prisma.doctor.create({
        data: { ...doc, location: 'Aranmula', sortOrder: ++sort, published: true },
      });
      created++;
    }
    if (created) console.log(`Bootstrapped ${created} Aranmula doctors`);
    await prisma.setting.create({ data: { key: FLAG_V3, value: 'done' } });
  }
}

module.exports = { bootstrapAranmula };
