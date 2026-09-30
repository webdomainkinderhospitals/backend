// The Kochi landing-page corrections the hospital sent on 30 September 2026
// ("website updates — Kochi landing page", 13 numbered notes, plus the Kochi
// doctor directory). Applied once, straight into the records the admin portal
// edits — nothing here is hard-wired into the website, and anything changed
// in the admin afterwards is never touched again.
//
//   1  Header: "Since 2018" is replaced by the NABH emblem
//   2  Contact: 0484 666 00 00 · contactus@kinderkochi.com
//   3  The Celebrate Pregnancy / Premium Birthing strip is removed (frontend)
//   4  Tagline: 35 specialities, no "in Edappally"
//   5  Hospital + office addresses, two numbers, Google Maps directions,
//      no "Visit kinderkochi.com"
//   6  New About text and facilities list
//   7  No address caption under the building illustration (frontend)
//   9  Care cards: Multispeciality Services, Obstetrics & Gynaecology, IVF,
//      Premium Birthing Services, Packages
//  10  No department count / care-pages link on the departments block (frontend)
//  11  Departments in two groups: Multispeciality Services and the
//      Women & Fertility Centre
//  12  Pregnancy Club Membership and Mammogram Booking in patient services;
//      Patient Rights moves to the group footer (frontend)
//  13  Footer number and "35"
const prisma = require('./prisma');
const DIRECTORY = require('./data/kochiDoctors.json');

const FLAG = 'bootstrap.kochiClientUpdates.v1';
const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';

const DIRECTIONS = 'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Kinder Hospital, Metro Pillar P/345, Pathadipalam, Kalamassery, Kochi, Kerala 682033');

const LOCATION = {
  since: '',
  accreditation: 'NABH Accredited',
  accreditationLogoUrl: `${SITE_ASSETS}/nabh-badge.png`,
  tagline: 'A 125-bed multispeciality hospital with 35 specialities.',
  phone: '0484 666 00 00',
  phone2: '+91 97466 00600',
  email: 'contactus@kinderkochi.com',
  address: 'Metro Pillar P/345, Pathadipalam, Kalamassery, Kochi, Ernakulam, Kerala — 682033',
  officeAddress:
    'Kindorama Health Care Private Limited, XXXIII/1233-B, First Floor, Kadavil Castle, Pukkattupady Road, Toll Junction, Edappally, Kerala — 682024',
  mapUrl: DIRECTIONS,
  website: '',
  websiteLabel: '',
  description:
    "Kinder Multispeciality Hospital, Kochi brings comprehensive multispeciality care, advanced surgical and critical care services, and dedicated mother-and-child expertise together under one roof at Kochi. Alongside orthopaedics with total knee replacement, general and laparoscopic surgery, gastroenterology, cardiology, and plastic & cosmetic surgery, the hospital runs a well-equipped Surgical ICU backed by an experienced critical care team — built to support patients through complex, high-acuity conditions, not only planned procedures. Mother and child care remains one of the hospital's defining strengths, with obstetrics & gynaecology, IVF, a dedicated Level 3 NICU, and paediatric sub-specialities spanning cardiology, neurology, urology & endocrinology.",
  highlights: [
    '125 beds · 35 specialities under one roof',
    'State-of-the-art NICU & ICU',
    'General & laparoscopic surgery, incl. hernia, gallbladder & piles/fistula · female surgeon available',
    'Obstetrics & gynaecology · IVF & fertility services',
    'Orthopaedics & spine surgery, incl. replacement surgeries',
    'Paediatric surgery & paediatric urology',
    'Plastic & cosmetic surgery · dermatology',
    '24/7 emergency & pharmacy',
  ].join('\n'),
};

// Note 11 — the department flow, in the hospital's own order.
const MULTI = 'Multispeciality Services';
const WOMEN = 'Women & Fertility Centre';
const DEPARTMENTS = [
  [MULTI, 'General Medicine & Diabetology', 'Diagnosis and long-term care of adult illness, with dedicated management of diabetes and its complications.'],
  [MULTI, 'Orthopaedics & Sports Medicine', 'Fractures, arthroscopy, sports injuries and joint problems, from first assessment to rehabilitation.'],
  [MULTI, 'General & Laparoscopic Surgery', 'Hernia, gallbladder, breast and piles/fistula surgery with minimally invasive techniques — a female surgeon is available.'],
  [MULTI, 'ENT', 'Ear, nose and throat care, including endoscopic ear, sinus and skull-base surgery.'],
  [MULTI, 'Urology', 'Kidney stones, prostate and urinary tract conditions, treated medically and surgically.'],
  [MULTI, 'Pulmonology', 'Asthma, COPD, lung infections and sleep-related breathing disorders.'],
  [MULTI, 'Radiology', 'Ultrasound, X-ray and cross-sectional imaging reported by experienced radiologists.'],
  [MULTI, 'Emergency & Trauma Care', 'Round-the-clock emergency and trauma care, backed by ICU and surgical teams.'],
  [MULTI, 'Dentistry', 'General and preventive dentistry, oral and maxillofacial surgery and dental implants.'],
  [MULTI, 'Dermatology & Cosmetology', 'Skin, hair and nail conditions, with clinical and cosmetic dermatology.'],
  [MULTI, 'Plastic & Cosmetic Surgery', 'Reconstructive and aesthetic surgery planned around each patient.'],
  [MULTI, 'Gastroenterology', 'Digestive, stomach and bowel conditions, with endoscopic diagnosis and treatment.'],
  [MULTI, 'Hepatology & Liver Transplant Medicine', 'Care for liver disease, and medical support before and after liver transplantation.'],
  [MULTI, 'Neurosurgery', 'Surgical care for conditions of the brain, spine and nerves.'],
  [MULTI, 'Neurology', 'Headache, epilepsy, stroke and other disorders of the brain and nervous system.'],
  [MULTI, 'Ophthalmology', 'Eye examinations and treatment for conditions affecting vision.'],
  [MULTI, 'Cardiology', 'Heart assessment, prevention and treatment by experienced cardiologists.'],
  [MULTI, 'Nephrology', 'Kidney disease, hypertension and dialysis care.'],
  [MULTI, 'Joint Replacement & Spine Surgery', 'Knee and hip replacement and spine surgery to restore movement and relieve pain.'],
  [MULTI, 'Geriatrics', 'Coordinated care for older adults and the conditions that come with age.'],
  [MULTI, 'Andrology', "Men's reproductive and sexual health, including male infertility."],
  [MULTI, 'Anaesthesiology & Critical Care', 'Safe anaesthesia for every procedure and intensive care in the Surgical ICU.'],
  [MULTI, 'Psychiatry & Clinical Psychology', 'Assessment, therapy and treatment for emotional and mental health.'],
  [WOMEN, 'Paediatric Surgery', 'Surgery for babies and children, planned with the child and family in mind.'],
  [WOMEN, 'Paediatric Urology', 'Kidney, bladder and urinary conditions in children.'],
  [WOMEN, 'Paediatric Orthopaedics', "Bone and joint conditions in children, from birth injuries to growth problems."],
  [WOMEN, 'Obstetrics & Gynaecology', 'Pregnancy care, high-risk pregnancy, painless labour and complete gynaecology care.'],
  [WOMEN, 'Reproductive Medicine', 'Fertility evaluation and treatment, including IUI, IVF and ICSI.'],
  [WOMEN, 'Paediatrics', 'Care for infants, children and adolescents — vaccinations, growth and illness.'],
  [WOMEN, 'Gynaecological Oncology', 'Diagnosis and surgical treatment of cancers of the female reproductive system.'],
  [WOMEN, 'Fetomaternal Medicine', 'Specialist scans and care for high-risk pregnancies and the unborn baby.'],
  [WOMEN, 'Neonatology with Level 3 NICU Care', 'Round-the-clock care for premature and critically ill newborns in a Level 3 NICU.'],
  [WOMEN, 'Endocrinology', 'Hormone and gland conditions, including thyroid and growth disorders.'],
  [WOMEN, 'Cosmetic Gynaecology', 'Aesthetic and functional gynaecological procedures.'],
];

const KOCHI_CARE = 'Kochi Care';
// Still readable at /hospitals/kochi/care/<slug>, linked from the pages that
// cover them, but no longer one of the five cards on the Kochi home page.
const LINKED = 'Kochi Care (linked page)';

const PHONE = LOCATION.phone;
const multispecialityList = DEPARTMENTS.filter(([g]) => g === MULTI).map(([, name]) => `- ${name}`).join('\n');

const NEW_PAGES = [
  {
    slug: 'kochi-multispeciality-services',
    title: 'Multispeciality Services at Kinder Hospital, Kochi',
    excerpt:
      'Comprehensive multispeciality, surgical and critical care under one roof — from orthopaedics and cardiology to general & laparoscopic surgery, backed by a well-equipped Surgical ICU.',
    sortOrder: 1,
    body: [
      '## Overview',
      'Kinder Multispeciality Hospital, Kochi brings comprehensive multispeciality care, advanced surgical and critical care services, and dedicated mother-and-child expertise together under one roof.',
      'Alongside orthopaedics with total knee replacement, general and laparoscopic surgery, gastroenterology, cardiology, and plastic & cosmetic surgery, the hospital runs a well-equipped Surgical ICU backed by an experienced critical care team — built to support patients through complex, high-acuity conditions, not only planned procedures.',
      '## Our departments',
      multispecialityList,
      '## Surgery & critical care',
      '- General & laparoscopic surgery, including hernia, gallbladder and piles/fistula — a female surgeon is available\n- Orthopaedics & spine surgery, including joint replacement\n- Plastic & cosmetic surgery\n- Surgical ICU with an experienced critical care team\n- 24/7 emergency & pharmacy',
      '[Read about General & Laparoscopic Surgery →](/hospitals/kochi/care/kochi-general-laparoscopic-surgery)',
      '## Frequently asked questions',
      `### How do I see a specialist?\nChoose a doctor and a day on our booking page, or call ${PHONE}. Our coordinators will confirm your appointment.`,
      '### Is emergency care available at night?\nYes. Emergency care and the pharmacy are open 24 hours a day, 7 days a week.',
    ].join('\n\n'),
  },
  {
    slug: 'kochi-ivf-fertility',
    title: 'IVF & Fertility Care at Kinder Hospital, Kochi',
    excerpt:
      'Fertility evaluation and treatment — IUI, IVF and ICSI — from a group with 15 years of proven expertise in IVF, with counselling and support at every step.',
    sortOrder: 3,
    body: [
      '## Overview',
      'Kinder Hospitals has 15 years of proven expertise in IVF treatment. At Kinder Hospital, Kochi, our reproductive medicine team works alongside obstetrics, fetal medicine and a Level 3 NICU — so care continues from the first consultation through a safe pregnancy and birth.',
      '## Treatments',
      '- Intrauterine Insemination (IUI)\n- In Vitro Fertilisation (IVF)\n- Intracytoplasmic Sperm Injection (ICSI)\n- Sperm retrieval — PESA, TESA and TESE\n- Semen freezing\n- Frozen embryo transfer',
      '## Fertility evaluation',
      '- Semen analysis\n- Hormonal assays\n- Follicular studies\n- Hysterosalpingogram and sonosalpingogram\n- Endometrial biopsy',
      '## Our fertility team',
      '- Dr. Abhishek Radhakrishnan — Visiting Consultant, Reproductive Medicine\n- Dr. Priyanka — Reproductive Medicine',
      '## Frequently asked questions',
      `### When should we see a fertility specialist?\nIf you have been trying to conceive for a year — or six months if the woman is over 35 — or sooner if there is a known concern, a consultation is a good next step.\n### How do we book a consultation?\nChoose a reproductive medicine specialist on our booking page, or call ${PHONE}.`,
    ].join('\n\n'),
  },
];

// Pages that already exist on the live site, re-arranged per note 9.
const EXISTING = {
  'kochi-obstetrics-gynaecology': { category: KOCHI_CARE, sortOrder: 2 },
  'kochi-premium-birthing-centre': {
    category: KOCHI_CARE,
    sortOrder: 4,
    retitle: ['Premium Birthing Centre at Kinder Hospital, Kochi', 'Premium Birthing Services at Kinder Hospital, Kochi'],
  },
  'kochi-general-laparoscopic-surgery': { category: LINKED, sortOrder: 11 },
  'kochi-water-birthing-suite': { category: LINKED, sortOrder: 12 },
  // Tharattazhaku belongs with the pregnancy club, not the clinical services.
  'kochi-tharattazhaku': { category: 'Celebrate Pregnancy' },
};

// "Dr Vinay Raj", "Dr. Vinay Raj" and "Brigadier (Dr.) A P Radhakrishnan"
// are matched by the name alone.
function personKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/brigadier|\(dr\.?\)|\bdr\b\.?/g, '')
    .replace(/[^a-z]/g, '');
}

const isKochi = (value) => String(value || '').split(',').some((n) => /^(kochi|cochin)$/i.test(n.trim()));
const withKochi = (value) => (isKochi(value) ? value : [value, 'Kochi'].filter((v) => String(v || '').trim()).join(', '));

function designationOf(entry) {
  return String(entry.designation || '')
    .replace(/^Sr\.\s*/i, 'Senior ')
    .replace(/Gynec(?!ologic)/g, 'Gynaec')
    .replace(/Gynecological/g, 'Gynaecological');
}

async function updateLocation(db) {
  const kochi = (await db.location.findMany()).find((l) => /^(kochi|cochin)$/i.test(String(l.name).trim()));
  if (!kochi) return false;
  await db.location.update({ where: { id: kochi.id }, data: LOCATION });
  return true;
}

async function ensureDepartments(db) {
  const existing = (await db.speciality.findMany()).filter((s) => isKochi(s.location));
  const have = new Set(existing.map((s) => personKey(s.name)));
  let created = 0;
  for (const [i, [category, name, description]] of DEPARTMENTS.entries()) {
    if (have.has(personKey(name))) continue;
    await db.speciality.create({
      data: { name, category, description, location: 'Kochi', sortOrder: 200 + i, published: true },
    });
    created++;
  }
  return created;
}

async function arrangeCarePages(db) {
  let changed = 0;
  for (const page of NEW_PAGES) {
    if (await db.contentPage.findUnique({ where: { slug: page.slug } })) continue;
    await db.contentPage.create({ data: { ...page, category: KOCHI_CARE, location: 'Kochi', published: true } });
    changed++;
  }
  for (const [slug, plan] of Object.entries(EXISTING)) {
    const page = await db.contentPage.findUnique({ where: { slug } });
    if (!page) continue;
    const data = {};
    if (plan.category && page.category !== plan.category) data.category = plan.category;
    if (plan.sortOrder !== undefined && page.sortOrder !== plan.sortOrder) data.sortOrder = plan.sortOrder;
    if (plan.retitle && page.title === plan.retitle[0]) data.title = plan.retitle[1];
    if (Object.keys(data).length) {
      await db.contentPage.update({ where: { id: page.id }, data });
      changed++;
    }
  }
  return changed;
}

// The directory is the hospital's current Kochi roster. Listed doctors are
// added or brought up to date (their photo is never touched); a doctor shown
// at Kochi who is not listed is taken off the Kochi page with a note saying
// why, so the admin can put them back in one click.
async function syncDoctors(db) {
  const all = await db.doctor.findMany();
  const byKey = new Map(all.map((d) => [personKey(d.name), d]));
  const listed = new Set();
  let sort = all.reduce((m, d) => Math.max(m, d.sortOrder || 0), 0);
  const result = { created: 0, updated: 0, hidden: [] };

  for (const entry of DIRECTORY) {
    const key = personKey(entry.name);
    listed.add(key);
    const current = byKey.get(key);
    const designation = designationOf(entry);
    if (!current) {
      await db.doctor.create({
        data: {
          name: entry.name,
          designation,
          speciality: entry.department,
          location: 'Kochi',
          bio: entry.qualifications,
          fullBio: entry.profile,
          sourceFiles: `Kinder Hospitals Kochi Doctor Directory · ${entry.url}`,
          sortOrder: ++sort,
          published: true,
        },
      });
      result.created++;
      continue;
    }
    // An unpublished draft may carry a centre nobody has confirmed yet; only
    // the Kochi assignment the directory vouches for goes live.
    const draft = current.published === false;
    const data = {
      location: draft ? 'Kochi' : withKochi(current.location),
      speciality: entry.department,
      bio: entry.qualifications,
      published: true,
    };
    if (draft && String(current.location || '').trim() && !isKochi(current.location)) {
      data.reviewNotes = `Published for Kochi from the Kochi doctor directory. The draft also listed: ${current.location} — add it back once confirmed.`;
    }
    // The department now shows as its own label, so a stale one in the old
    // designation ("Consultant — Internal Medicine") is trimmed to the rank.
    if (designation) data.designation = designation;
    else if (/\s[—–-]\s/.test(current.designation || '')) data.designation = current.designation.split(/\s[—–-]\s/)[0].trim();
    if (entry.profile && !String(current.fullBio || '').trim()) data.fullBio = entry.profile;
    await db.doctor.update({ where: { id: current.id }, data });
    result.updated++;
  }

  const note = 'Not in the Kochi doctor directory of 30 Sep 2026, so removed from the Kochi page. Put Kochi back (and publish) if this doctor still consults there.';
  for (const doc of all) {
    if (doc.published === false || !isKochi(doc.location) || listed.has(personKey(doc.name))) continue;
    const others = String(doc.location).split(',').map((n) => n.trim()).filter((n) => n && !isKochi(n));
    const data = others.length
      ? { location: others.join(', '), reviewNotes: note }
      : { published: false, reviewNotes: note };
    await db.doctor.update({ where: { id: doc.id }, data });
    result.hidden.push(doc.name);
  }
  return result;
}

async function bootstrapKochiUpdates(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  if (await updateLocation(db)) console.log('Applied the Kochi landing-page updates to the Kochi hospital record');
  const departments = await ensureDepartments(db);
  if (departments) console.log(`Added ${departments} Kochi departments`);
  const pages = await arrangeCarePages(db);
  if (pages) console.log(`Arranged ${pages} Kochi care pages`);
  const doctors = await syncDoctors(db);
  console.log(`Kochi doctors: ${doctors.created} added, ${doctors.updated} updated, ${doctors.hidden.length} not in the directory${doctors.hidden.length ? ` (${doctors.hidden.join('; ')})` : ''}`);

  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = {
  bootstrapKochiUpdates, FLAG, LOCATION, DEPARTMENTS, NEW_PAGES, EXISTING, DIRECTORY, LINKED, personKey,
};
