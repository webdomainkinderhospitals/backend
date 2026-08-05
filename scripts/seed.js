// Seeds the database with the first admin user and the exact content the
// corporate website ships with, so the admin portal controls everything the
// site displays from day one. Safe to re-run: content is only inserted when
// its table is empty (the admin user is always upserted).
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Doctor portraits bundled with the frontend deployment.
const SITE_ASSETS = process.env.SITE_ASSETS_URL || 'https://frontend-lime-six-70.vercel.app';

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@kinderhospitals.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Site Admin', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Admin user ready: ${email}`);

  // SEED_RESET=1 wipes all website content (never admin users or media
  // records) and reloads the canonical site content below.
  if (process.env.SEED_RESET === '1') {
    await prisma.speciality.deleteMany();
    await prisma.location.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.newsPost.deleteMany();
    await prisma.procedure.deleteMany();
    await prisma.setting.deleteMany();
    console.log('SEED_RESET: cleared existing website content');
  }

  const settings = {
    siteName: 'Kinder Hospitals',
    tagline: 'Kindness at the heart of every tiny heartbeat.',
    helplinePhone: '+91 80 2888 8880',
    emergencyPhone: '+91 8618 999 833',
    email: 'contactus@kinderhospital.in',
    heroTitle: 'Kindness at the heart of <em>every tiny heartbeat</em>',
    heroSubtitle:
      "A women's & children's healthcare network spanning 5 hospitals across Cherthala, Kochi, Bengaluru, Alappuzha and Singapore. From IVF to neonatology — one promise of kindness, in every city we serve.",
    heroImageUrl:
      'https://images.unsplash.com/photo-1519824145371-296894a0daa9?auto=format&fit=crop&w=1920&q=80',
    logoUrl: '',
    announcement: '',
    stats: [
      { label: 'Women Treated', value: '6L+' },
      { label: 'Births Delivered', value: '13,000+' },
      { label: 'IVF Successes', value: '1,500+' },
      { label: 'Senior Consultants', value: '60+' },
    ],
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log('Settings ready');

  if ((await prisma.speciality.count()) === 0) {
    const specialities = [
      ['Obstetrics', 'heart-pin'], ['Maternity', 'pin-dot'], ['Infertility & IVF', 'heart'],
      ['Paediatrics', 'child'], ['Neonatology', 'target'], ['Gynaec & Laparoscopic', 'star'],
      ['Fetal Medicine', 'thermometer'], ['General Medicine', 'check-circle'],
      ['General Surgery', 'scalpel'], ['Dermatology', 'hearts'], ['Plastic & Cosmetic', 'mirror'],
      ['Endocrinology', 'gland'], ['General ENT', 'clock'], ['Anesthesiology & Pain', 'anesthesia'],
      ['Dietetics & Nutrition', 'home'], ['Physiotherapy', 'orbit'],
    ];
    await prisma.speciality.createMany({
      data: specialities.map(([name, icon], i) => ({ name, icon, sortOrder: i + 1 })),
    });
    console.log(`Seeded ${specialities.length} specialities`);
  }

  if ((await prisma.location.count()) === 0) {
    await prisma.location.createMany({
      data: [
        {
          name: 'Cherthala', slug: 'cherthala',
          tagline: "The only NABH-accredited women, newborn & fertility hospital in Alappuzha.",
          description: "Kinder Women's Hospital & Fertility Centre Cherthala opened in 2011, blending expertise from Singapore and India in a 100-bed facility. It is the only NABH-accredited women, newborn and fertility hospital in Alappuzha district — first with a Level 3 NICU, and first to bring ART/IVF fertility technology to Alappuzha. Over 6,00,000 women treated and 18,000+ childbirths, with specialities spanning obstetrics, gynaecology, reproductive medicine, neonatology, paediatrics and dermatology & cosmetic surgery.",
          highlights: "Only NABH-accredited women & newborn hospital in Alappuzha\n100-bed facility · international standards\nFirst Level 3 NICU in Alappuzha\nFirst ART / IVF fertility centre in Alappuzha\n18,000+ childbirths · 6,00,000+ women treated\nObstetrics · Gynaecology · Reproductive Medicine · Neonatology · Paediatrics\nNursing Excellence accreditation", city: 'Cherthala', country: 'India',
          address: 'The flagship — first NABH-accredited women & children hospital in Alappuzha. Maruthorvattom Temple Road, near NH 66.',
          phone: '+91 478 2830000', email: 'contactus@kinderhospital.in',
          mapUrl: 'https://kinderhospital.in',
          imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
          since: 'Since 2011', website: 'https://kinderhospital.in',
          websiteLabel: 'Visit kinderhospital.in →', international: false, sortOrder: 1,
        },
        {
          name: 'Kochi', slug: 'kochi',
          tagline: "A 125-bed multispeciality hospital with 25 specialities in Edappally.",
          description: "Kinder Multispeciality Hospital Kochi is a premier 125-bed hospital at Toll Junction, Edappally, housing around 25 specialities — obstetrics & gynaecology, paediatrics & neonatology, IVF, general medicine, orthopaedics & total knee replacement, gastroenterology, cardiology, plastic & cosmetic surgery, and dermatology. State-of-the-art NICU and ICU facilities are staffed by experienced neonatologists and critical-care specialists, with paediatric sub-specialities from cardiology and neurology to endocrinology and emergency medicine.",
          highlights: "125 beds · ~25 specialities under one roof\nState-of-the-art NICU & ICU\nPaediatric sub-specialities: cardiology, neurology, endocrinology & more\nIVF & fertility services\nOrthopaedics incl. total knee replacement\nPlastic & cosmetic surgery · dermatology\n24/7 emergency & pharmacy", city: 'Kochi', country: 'India',
          address: 'A 125-bed multispeciality with 25 specialities. Kadavil Castle, Pukkattupady Road, Toll Junction, Edappally — Kochi 682024.',
          phone: '+91 484 405 4000', email: 'contactus@kinderhospital.in',
          mapUrl: 'https://www.kinderkochi.com',
          imageUrl: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80',
          since: 'Since 2018', website: 'https://www.kinderkochi.com',
          websiteLabel: 'Visit kinderkochi.com →', international: false, sortOrder: 2,
        },
        {
          name: 'Bengaluru', slug: 'bengaluru',
          tagline: "Whitefield's premier women's hospital — among Bangalore's best IVF centres.",
          description: "Kinder Women's Hospital & Fertility Centre Bengaluru is a 125-bed women's healthcare facility in Whitefield (Hoodi, Graphite India Main Road), part of the Kinder Medical Group — Singapore's largest paediatric group. Widely regarded as one of the best IVF centres in Bangalore, it offers obstetrics, gynaecology, fertility & IVF, neonatology, neonatal surgery and paediatrics, alongside cosmetic surgery, general surgery and ENT — rated 4.8/5 by over 3,000 patients.",
          highlights: "125-bed women's healthcare facility in Whitefield\nAmong Bangalore's best-known IVF & fertility centres\nObstetrics · high-risk pregnancy · painless delivery\nNeonatology & neonatal surgery\nPaediatrics, cosmetic surgery, general surgery & ENT\nRated 4.8/5 by 3,000+ patients", city: 'Bengaluru', country: 'India',
          address: "Whitefield's premier women's hospital & fertility centre. 17 specialities. Doddanekundi, Hoodi Village, Krishnarajapura.",
          phone: '+91 80 2888 8880', email: 'contactus@kinderhospital.in',
          mapUrl: 'https://kinderhospitals.com',
          imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
          since: 'Since 2022', website: 'https://kinderhospitals.com',
          websiteLabel: 'Visit kinderhospitals.com →', international: false, sortOrder: 3,
        },
        {
          name: 'Alappuzha', slug: 'alappuzha',
          tagline: "Kinder care for women & children, in the heart of Alappuzha town.",
          description: "Kinder Women's & Children's Clinic Alappuzha opened in March 2023 at Thottunkal Plaza near Kidangamparambu Sree Bhuvaneswari Temple. An initiative of the Kinder group, it brings antenatal care, gynaecology consultations, paediatric clinics and diagnostics closer to Alappuzha families — expectant mothers can complete every test and check-up here right up to the ninth month, travelling to our Cherthala hospital only for delivery.",
          highlights: "Women's & children's OPD clinics\nComplete antenatal care & tests up to the 9th month\nPaediatric & vaccination clinic\nLab, scans & pharmacy\nDelivery at Kinder Cherthala — one seamless journey", city: 'Alappuzha', country: 'India',
          address: "Thottunkal Plaza, near Kidangamparambu Sree Bhuvaneswari Temple, East of Thathampally, Alappuzha.",
          phone: '+91 478 2830000', email: 'contactus@kinderhospital.in',
          mapUrl: 'https://kinderhospital.in/kinder_alleppey',
          imageUrl: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
          since: 'Since 2023', website: 'https://kinderhospital.in/kinder_alleppey',
          websiteLabel: 'Visit Alappuzha →', international: false, sortOrder: 4,
        },
        {
          name: 'Singapore', slug: 'singapore',
          tagline: "One of Singapore's largest paediatric group practices — since 2000.",
          description: "Kinder Clinic Pte Ltd is one of Singapore's largest paediatric group practices, established in 2000, and the international home of the Kinder Medical Group. From The Paragon on Orchard Road, its specialists provide the full range of paediatric care — newborn intensive care, general paediatrics, and sub-specialities including nephrology, respiratory medicine, allergy & immunology, rheumatology, dermatology, endocrinology, infectious disease and paediatric sleep — practising at all major private hospitals in Singapore.",
          highlights: "Established 2000 · Singapore's largest paediatric group practices\nNewborn intensive care & neonatal transport\nSub-specialities: nephrology, respiratory, allergy & immunology, endocrinology\nImmunisation, travel medicine & child development\nConsultants practise at all major private hospitals in Singapore\nThe Paragon, 290 Orchard Road #07-02/03", city: 'Singapore', country: 'Singapore',
          address: 'The Paragon, 290 Orchard Road, Unit #07-02/03, Singapore 238859.',
          phone: '+65 6732 4718', email: 'kparagon@kinderclinic.com.sg',
          mapUrl: 'https://www.kinderclinic.com.sg',
          imageUrl: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=800&q=80',
          since: 'International HQ', website: 'https://www.kinderclinic.com.sg',
          websiteLabel: 'Visit kinderclinic.com.sg →', international: true, sortOrder: 5,
        },
      ],
    });
    console.log('Seeded 5 locations');
  }

  if ((await prisma.doctor.count()) === 0) {
    await prisma.doctor.createMany({
      data: [
        {
          name: 'Brigadier (Dr.) A P Radhakrishnan',
          designation: 'Senior Consultant — General Medicine & Diabetology',
          speciality: 'General Medicine', location: 'Kochi',
          bio: 'BSc, MBBS, MD (General Medicine) · Former Director, Military Hospital Jaipur & Shillong',
          imageUrl: 'https://www.kinderkochi.com/uploads/doctors/main/Dr.A_P_Radhakrishnan_1_.jpeg',
          sortOrder: 1,
        },
        {
          name: 'Dr. Roshna Ramachandran',
          designation: 'Consultant — Internal Medicine',
          speciality: 'Internal Medicine', location: 'Kochi',
          bio: '15+ years of clinical experience · Diagnosis & comprehensive disease management',
          imageUrl: `${SITE_ASSETS}/doctors/dr-roshna-ramachandran.jpg`,
          sortOrder: 2,
        },
        {
          name: 'Dr. Rita K M',
          designation: 'Senior Consultant — General & Paediatric Surgery',
          speciality: 'Paed. Surgery', location: 'Kochi',
          bio: 'MBBS (Kerala), MS General Surgery (Calicut, 1989), MCh Paediatric Surgery (Calicut, 1996) · 30+ yrs',
          imageUrl: `${SITE_ASSETS}/doctors/dr-rita-k-m.jpg`,
          sortOrder: 3,
        },
        {
          name: 'Dr. Shirley Joan Fernandez',
          designation: 'Senior Consultant — Obstetrics & Gynaecology',
          speciality: 'Obstetrics', location: 'Kochi',
          bio: '14+ years of experience · Clinical attachments at University Hospital UK & Toronto, Canada',
          imageUrl: `${SITE_ASSETS}/doctors/dr-shirley-joan-fernandez.jpg`,
          sortOrder: 4,
        },
        {
          name: 'Dr. Madhuja Gopishyam',
          designation: 'Consultant — Obstetrician & Gynec Laparoscopic Surgeon',
          speciality: 'Gynec Laparoscopy', location: 'Kochi',
          bio: 'MBBS, DGO, DNB, FMAS, MRCOG · 10+ yrs · Hysterectomy, myomectomy, cystectomy & high-risk pregnancy',
          imageUrl: 'https://www.kinderkochi.com/uploads/doctors/main/Dr.Madhuja_Gopishyam_1_.jpeg',
          sortOrder: 5,
        },
      ],
    });
    console.log('Seeded 5 doctors');
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          patientName: 'Swami Chakra Reddy', relation: 'Bengaluru · IVF',
          quote: 'We visited Kinder for IVF and pregnancy treatment, and we received excellent care throughout our journey. Special thanks to Dr. Nidhi Jhawar for her guidance — we conceived with healthy twin heartbeats.',
          rating: 5,
          imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
        },
        {
          patientName: 'Srikkanth Iyer', relation: 'Bengaluru · Obstetrics',
          quote: 'Honestly, the best maternity hospital in Bangalore — cost, care, labour room, everything. Dr. Sreeja Rani is just too good. Out of words to describe her expertise. 10/10.',
          rating: 5,
          imageUrl: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=800&q=80',
        },
        {
          patientName: 'Reeja Stephen', relation: 'Cherthala · Maternity',
          quote: 'Best hospital in Cherthala for women & child care. Thanks to Dr. Neena, Dr. Vennila, and all the nurses for providing the best service. Heartfelt thanks to staff Mrs. Annamma Chechi for helping us throughout this journey.',
          rating: 5,
          imageUrl: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=800&q=80',
        },
      ],
    });
    console.log('Seeded 3 testimonials');
  }

  if ((await prisma.newsPost.count()) === 0) {
    await prisma.newsPost.createMany({
      data: [
        {
          title: 'What to Be Careful About in the First Trimester of Pregnancy',
          slug: 'first-trimester-care', category: 'Pregnancy Care',
          imageUrl: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?auto=format&fit=crop&w=800&q=80',
          author: 'Dr. Sreeja Rani V R', publishedAt: new Date('2026-04-20'),
        },
        {
          title: 'IVF Diet Guide: Foods to Avoid for Better Fertility Success',
          slug: 'ivf-diet-guide', category: 'Fertility',
          imageUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=800&q=80',
          author: 'Dr. Nidhi Jhawar', publishedAt: new Date('2026-04-12'),
        },
        {
          title: 'Hand, Foot and Mouth Disease in Kids: Symptoms, Treatment & Prevention',
          slug: 'hand-foot-mouth-disease-kids', category: 'Paediatrics',
          imageUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80',
          author: 'Dr. Sampat Kumar Shettigar', publishedAt: new Date('2026-04-03'),
        },
      ],
    });
    console.log('Seeded 3 news posts');
  }

  if ((await prisma.procedure.count()) === 0) {
    await prisma.procedure.createMany({
      data: [
        {
          name: 'IVF (In Vitro Fertilisation)', icon: 'ivf',
          description: 'End-to-end IVF support — from counselling and stimulation to embryo transfer — within a fully ART-certified IVF laboratory. 1,500+ successful cycles to date.',
          sortOrder: 1,
        },
        {
          name: 'IUI & ICSI', icon: 'plus-circle',
          description: "Intrauterine insemination and intracytoplasmic sperm injection — personalised fertility pathways tailored to each couple's unique journey.",
          sortOrder: 2,
        },
        {
          name: 'Painless Delivery', icon: 'waves',
          description: 'Labour & delivery pain management with epidural analgesia and birthing techniques designed for a calmer, more comfortable experience.',
          sortOrder: 3,
        },
        {
          name: 'High-Risk Pregnancy Care', icon: 'pulse',
          description: 'Specialist obstetric care for complex pregnancies, with fetal medicine support, advanced imaging, and a multi-disciplinary team on standby.',
          sortOrder: 4,
        },
        {
          name: 'Laparoscopic Gynaec Surgery', icon: 'clipboard',
          description: 'Minimally invasive keyhole gynaecological surgery — for fibroids, endometriosis, hysterectomy & more. Smaller scars, faster recovery.',
          sortOrder: 5,
        },
        {
          name: 'Level III NICU Care', icon: 'shield-check',
          description: 'For premature and critically ill newborns — round-the-clock neonatology with neonatal transport, ventilation, and gentle developmental care.',
          sortOrder: 6,
        },
      ],
    });
    console.log('Seeded 6 procedures');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
