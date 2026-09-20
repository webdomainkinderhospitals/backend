// One-time bootstrap for Kinder Hospitals Kollam (kinderkollam.com).
//
// Creates the Kollam centre and everything its website shows — the hospital
// record (so the admin's on/off switch has something to toggle), its
// specialities, facilities, doctor roster and privacy policy page. Every step
// is guarded by a Setting flag and NEVER overwrites a field an admin has
// already edited, so the API can run this on every startup.
const prisma = require('./prisma');

const FLAG_V1 = 'bootstrap.kollam';

const TAGLINE = 'Where Every Tiny Heartbeat Is Cherished with Kindness';

// The four paragraphs from the Kollam home page. One paragraph per line —
// the hospital page renders each as its own paragraph.
const DESCRIPTION = [
  'At Kinder Hospital, we specialize in delivering exceptional, patient-centered care for women and children, with dedicated expertise in pregnancy, childbirth, and newborn health. Located in Kollam, our hospital combines advanced medical technology with compassionate care to ensure safety, comfort, and clinical excellence at every stage of motherhood.',
  'Pregnancy is a life-changing journey filled with emotion, hope, and anticipation. Our experienced obstetricians, neonatologists, pediatricians, and skilled nursing team are committed to providing personalized attention—from preconception counseling and routine antenatal checkups to high-risk pregnancy management, safe delivery, and postnatal support.',
  'With modern infrastructure and comprehensive maternity and neonatal services, we ensure both mother and baby receive the highest standard of care under one roof.',
  'At Kinder Hospital, Kollam, we create a warm and reassuring environment where families feel supported, informed, and confident. Through open communication and individualized care plans, we stand beside you—protecting and nurturing every precious heartbeat.',
].join('\n');

// Facilities are stored one per line as "Name — description"; the website
// shows the name in bold with its description beneath.
const HIGHLIGHTS = [
  'Labour Rooms — Two fully equipped labour rooms offering a safe, hygienic, and comfortable birthing environment, with advanced fetal monitoring, emergency support, and an experienced maternity care team for mother and baby.',
  'Operation Theatres — Two state-of-the-art operation theatres equipped for obstetric, gynaecological, and paediatric surgeries, featuring advanced technology, strict sterilisation, modern anaesthesia, and the highest standards of surgical safety.',
  'Level 3 NICU — A five-bedded Level 3 NICU offering specialised, round-the-clock care for premature, low birth weight, and high-risk newborns, with advanced neonatal technology, respiratory support, thermoregulation, and expert neonatology teams.',
  'Surgical ICU (SICU) — A three-bedded SICU providing advanced postoperative and critical care with continuous monitoring, specialised nursing, and expert medical supervision in a secure environment.',
].join('\n');

// The commissioned watercolour elevation of the Kollam building, shipped with
// the frontend. Absolute, because the admin portal serves from its own origin.
const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';
const CARD_IMAGE = `${SITE_ASSETS}/hospitals/kollam.webp`;
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1920&q=80';

const LOCATION = {
  name: 'Kollam',
  slug: 'kollam',
  city: 'Kollam',
  country: 'India',
  tagline: TAGLINE,
  description: DESCRIPTION,
  highlights: HIGHLIGHTS,
  address: 'Bldg No: 3324-2932, Randamkutty, Kilikollor PO, Kollam, Kerala - 691004',
  phone: '0474-2550000',
  email: 'contactus@kinderkollam.com',
  website: 'https://kinderkollam.com',
  websiteLabel: 'Visit kinderkollam.com →',
  bookingUrl: 'https://mobapp.kinderhospitals.com',
  since: 'Since 2026',
  imageUrl: CARD_IMAGE,
  heroImageUrl: HERO_IMAGE,
  international: false,
  published: true,
};

// "Dedicated to Nurturing Every Precious Heartbeat" — the five departments the
// Kollam site lists, with the description each one carries.
const SPECIALITIES = [
  {
    name: 'Obstetrics',
    category: 'Maternity & Pregnancy',
    description:
      'Complete maternity care from pregnancy to postnatal recovery, including normal and high-risk deliveries, antenatal education, and personalised care in modern, well-monitored labour suites.',
  },
  {
    name: 'Gynaecology',
    category: 'Fertility & Gynaecology',
    description:
      "Complete women's healthcare, including menstrual issues, PCOD/PCOS, fibroids, endometriosis, infertility evaluation, and menopausal care, with precise diagnosis and minimally invasive treatment.",
  },
  {
    name: 'Paediatrics',
    category: "Children's Care",
    description:
      'Dedicated care for infants, children, and adolescents, focusing on vaccinations, growth and development monitoring, early diagnosis, and infection management in a child-friendly, caring environment.',
  },
  {
    name: 'Neonatology',
    category: "Children's Care",
    description:
      'Specialised care for newborns, including premature and high-risk babies, with advanced neonatal facilities, expert monitoring, and skilled neonatologists.',
  },
  {
    name: 'Radiology & Diagnostics',
    category: 'Allied & Wellness',
    description:
      'Accurate and timely diagnostics including ultrasound, X-ray, and lab tests, supported by modern equipment and skilled technicians for reliable results.',
  },
];

// The Kollam medical team. `designation` is the role shown on the card,
// `bio` carries the qualifications. Portraits are uploaded from the admin
// (Services & Doctors → edit doctor → photo); initials show until then.
const DOCTORS = [
  {
    name: 'Dr. Reshmy R Pillai',
    designation: 'Consultant — Paediatrics',
    speciality: 'Paediatrics',
    bio: 'MBBS, DCH, MRCPCH (UK)',
  },
  {
    name: 'Dr. Praveen Krishna K P',
    designation: 'Senior Consultant — Neonatology',
    speciality: 'Neonatology',
    bio: 'MBBS, MD (Paediatrics), DM Neonatology',
  },
  {
    name: 'Dr. Manju V K',
    designation: 'Consultant — Obstetrics & Gynaecology · Laparoscopic Surgeon',
    speciality: 'Obstetrics',
    bio: 'MBBS, MS, DNB (O&G), MNAMS, FMAS',
  },
  {
    name: 'Dr. Jilu Fathima Y',
    designation: 'Junior Consultant — Paediatrics',
    speciality: 'Paediatrics',
    bio: 'MBBS, MD (Paediatrics)',
  },
  {
    name: 'Dr. Beegam Raheena',
    designation: 'Consultant — Obstetrics & Gynaecology',
    speciality: 'Obstetrics',
    bio: 'MBBS, DNB (OBG), MNAMS, FMIS',
  },
  {
    name: 'Dr. Shalini Mahapatra',
    designation: 'Consultant — Fetal Medicine',
    speciality: 'Fetal Medicine',
    bio: 'MBBS, MS (Obstetrics & Gynaecology), DNB, PDF (Fetal Medicine)',
  },
  {
    name: 'Dr. Deepthi Prem',
    designation: 'Senior Consultant — Obstetrics and Gynaecology',
    speciality: 'Obstetrics',
    bio: 'MBBS, MD (O&G)',
  },
  {
    name: 'Dr. Karthik Prakash',
    designation: 'Junior Consultant — Orthopaedics',
    speciality: 'Orthopaedics',
    bio: 'MBBS, MS Orthopaedics',
  },
  {
    name: 'Dr. Vijayamohan N',
    designation: 'Visiting Consultant — Dermatology',
    speciality: 'Dermatology',
    bio: 'MBBS, DVD, DNB',
  },
];

// The Kollam privacy policy, as supplied. The source leaves the contact
// address blank in three places; each is filled with the centre's published
// email so the published page is usable, and the whole text stays editable
// in the admin's Content Library.
const PRIVACY_EMAIL = 'contactus@kinderkollam.com';

const PRIVACY_PAGE = {
  title: 'Privacy Policy — Kinder Hospitals, Kollam',
  slug: 'kollam-privacy-policy',
  category: 'Legal',
  location: 'Kollam',
  excerpt:
    'How Kinder Hospitals, Kollam collects, uses and protects the personal and medical information you share with us.',
  body: [
    'Kinder Hospitals is committed to protecting the Privacy of every individual who shares data with us, directly or through our website. Your Privacy is important to us and we take the utmost care to protect the data you provide us with, such as your personal information, medical information and activity on our website. This Privacy Policy has been created accordingly to effectuate transparency and trust between the user and Kinder Hospitals.',
    'The Hospital and all its representatives take all possible measures to ensure that the data provided by users remain confidential and is only used according to the Consent by the user.',
    'In this regard, we strictly adhere to the governance of prevalent laws in India such as:',
    '- Section 43A of The Information Technology Act, 2000',
    '- Regulation 4 of the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Information) Rules, 2011 (the "SPI Rules")',
    '- Regulation 3(1) of the Information Technology (Intermediaries Guidelines) Rules, 2011.',
    '## Consent',
    `By continuing to use this website and all of its functions and services, You affirm that you understand and agree to abide by the provisions of this Privacy Policy and have freely consented to the collection, use, processing and disclosure of your personal information as provided within this Privacy Policy. You have the right to withdraw your consent at any given time by writing to us at ${PRIVACY_EMAIL}.`,
    '## Communication',
    `We may reach out to you via different means of communication such as phone, email, SMS, through our website and online messengers (including Facebook Messenger, WhatsApp etc.) to update you with information pertaining to your treatment, medical history, appointments and other updates. If you do not wish to receive such communication, you can inform us of the same at ${PRIVACY_EMAIL}.`,
    '## Collection and Use of Data',
    'Most of the Services on this website require us to know who you are, in order to best meet your needs. We collect Information directly from you or from third-parties. Information regarding the type of device you are using, IP Address and the time that you are logged on to this website for.',
    `The Personal Information that we may collect from you, but may not be limited to: Your Name, Birth Date/Age, Gender, Address, Email Address, Phone Number, Personal Medical Records and History, and Insurance Data, and any other information you may voluntarily provide us with. You may modify your personal information at any time by writing to us at ${PRIVACY_EMAIL}. We shall use this personal information that you have provided us with to communicate, and provide you with the services that Kinder Hospitals provide.`,
    'We hold in high regard, the privacy and confidentiality of our customers’ information and for the same, we employ industry-standard security measures to safeguard your information. However, we do not guarantee or assure that the electronic or physical communications received from you, stored on our databases are completely immune to unauthorized access. We will not be liable in any manner regarding breach of security or unintended disclosure of your Personal Information.',
    'If required by law, we may provide such personal information that is stored by us to government agencies in order to comply with a court order or other legally enforceable duty.',
    '## Changes to This Privacy Policy',
    'We reserve and maintain the right to update, change or modify this Privacy Policy at any time. The amended Policy shall be effective from the date it has been issued and is reflected on this website, or through bulletins at our hospital premises. Your continued use of this website and its services shall indicate that you approve of the changes made.',
    '## Third Party References and Links',
    'We may provide links on our website that may redirect you to other third-party websites.',
    'We do not extend our security measures, or promote the use/disuse of such third-party website. We are not responsible for the content, terms of use, or policies of third-party websites. Any information exchange that you may indulge in with the third-party website shall be at your own risk.',
    '## Law and Jurisdiction',
    'All the information provided under this website and related terms and conditions and policies are governed by and to be interpreted in accordance with the Laws of India.',
    'Any dispute that may arise from your use of this website whether in contract, tort or otherwise, shall be subject to the jurisdiction of the courts in Bengaluru, Karnataka for its resolution.',
  ].join('\n\n'),
  sortOrder: 90,
  published: true,
};

const norm = (s) => String(s || '').trim().toLowerCase();

async function ensureSpecialities(db) {
  const existing = await db.speciality.findMany({ where: { location: 'Kollam' } });
  const have = new Set(existing.map((s) => norm(s.name)));
  let sort = existing.reduce((m, s) => Math.max(m, s.sortOrder || 0), 0);
  let created = 0;
  for (const spec of SPECIALITIES) {
    if (have.has(norm(spec.name))) continue;
    await db.speciality.create({
      data: { ...spec, location: 'Kollam', sortOrder: ++sort, published: true },
    });
    created++;
  }
  return created;
}

async function ensureDoctors(db) {
  const existing = await db.doctor.findMany();
  const have = new Set(existing.map((d) => norm(d.name)));
  let sort = existing.reduce((m, d) => Math.max(m, d.sortOrder || 0), 0);
  let created = 0;
  for (const doc of DOCTORS) {
    if (have.has(norm(doc.name))) continue;
    await db.doctor.create({
      data: { ...doc, location: 'Kollam', sortOrder: ++sort, published: true },
    });
    created++;
  }
  return created;
}

async function ensurePrivacyPage(db) {
  const existing = await db.contentPage.findUnique({ where: { slug: PRIVACY_PAGE.slug } });
  if (existing) return 0;
  await db.contentPage.create({ data: PRIVACY_PAGE });
  return 1;
}

async function bootstrapKollam(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG_V1 } })) return;

  const existing = await db.location.findFirst({
    where: { name: { equals: 'Kollam', mode: 'insensitive' } },
  });
  if (!existing) {
    const maxSort = await db.location.aggregate({ _max: { sortOrder: true } });
    await db.location.create({
      data: { ...LOCATION, sortOrder: (maxSort._max.sortOrder || 0) + 1 },
    });
    console.log('Bootstrapped Kinder Kollam location');
  }

  const specialities = await ensureSpecialities(db);
  const doctors = await ensureDoctors(db);
  const pages = await ensurePrivacyPage(db);
  if (specialities) console.log(`Bootstrapped ${specialities} Kollam specialities`);
  if (doctors) console.log(`Bootstrapped ${doctors} Kollam doctors`);
  if (pages) console.log('Bootstrapped the Kollam privacy policy page');

  await db.setting.create({ data: { key: FLAG_V1, value: 'done' } });
}

module.exports = { bootstrapKollam, LOCATION, SPECIALITIES, DOCTORS, PRIVACY_PAGE, FLAG_V1 };
