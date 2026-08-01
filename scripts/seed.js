// Seeds the database with the first admin user and the content that is
// currently hard-coded in the corporate site design. Safe to re-run: it only
// inserts when tables are empty (admin user is always upserted).
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@kinderhospitals.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Site Admin', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Admin user ready: ${email}`);

  const settings = {
    siteName: 'Kinder Hospitals',
    tagline: 'Multispeciality hospital for women & children',
    helplinePhone: '1800 891 8918',
    emergencyPhone: '+91 478 2812345',
    email: 'info@kinderhospitals.com',
    heroTitle: 'Exceptional care for women & children',
    heroSubtitle:
      'NABH accredited maternity, IVF, neonatology and paediatrics across India and Singapore. 6 lakh+ women treated, 13,000+ births since 2011.',
    heroImageUrl: '',
    logoUrl: '',
    announcement: '',
    stats: [
      { value: '6,00,000+', label: 'Women treated' },
      { value: '13,000+', label: 'Births since 2011' },
      { value: '25+', label: 'Specialities' },
      { value: '5', label: 'Centres' },
    ],
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  if ((await prisma.location.count()) === 0) {
    await prisma.location.createMany({
      data: [
        { name: 'Kinder Women’s Hospital & Fertility Centre', city: 'Cherthala', country: 'India', phone: '+91 478 2812345', sortOrder: 1 },
        { name: 'Kinder Multispeciality Hospital', city: 'Kochi', country: 'India', phone: '+91 484 2412345', sortOrder: 2 },
        { name: 'Kinder Women & Children Hospital', city: 'Bengaluru', country: 'India', phone: '+91 80 41212345', sortOrder: 3 },
        { name: 'Kinder Speciality Clinic', city: 'Alappuzha', country: 'India', phone: '+91 477 2212345', sortOrder: 4 },
        { name: 'Kinder Medical Group', city: 'Singapore', country: 'Singapore', phone: '+65 6812 3456', sortOrder: 5 },
      ],
    });
    console.log('Seeded 5 locations');
  }

  if ((await prisma.speciality.count()) === 0) {
    const names = [
      ['Obstetrics & Gynaecology', '🤰'], ['Fertility & IVF', '🧬'], ['Neonatology & NICU', '👶'],
      ['Paediatrics', '🧒'], ['Paediatric Surgery', '🩺'], ['Foetal Medicine', '🫄'],
      ['Gynaec Oncology', '🎗️'], ['Urogynaecology', '💜'], ['Breast Clinic', '🌸'],
      ['Laparoscopic Surgery', '🔬'], ['Anaesthesiology', '💉'], ['Radiology & Imaging', '🩻'],
      ['General Medicine', '⚕️'], ['Dermatology', '🧴'], ['ENT', '👂'],
      ['Ophthalmology', '👁️'], ['Dental Care', '🦷'], ['Physiotherapy', '🏃‍♀️'],
      ['Nutrition & Dietetics', '🥗'], ['Psychology & Counselling', '🧠'],
    ];
    await prisma.speciality.createMany({
      data: names.map(([name, icon], i) => ({ name, icon, sortOrder: i + 1 })),
    });
    console.log(`Seeded ${names.length} specialities`);
  }

  if ((await prisma.procedure.count()) === 0) {
    await prisma.procedure.createMany({
      data: [
        { name: 'Painless Delivery', description: 'Epidural analgesia for a comfortable birthing experience.', sortOrder: 1 },
        { name: 'High-Risk Pregnancy Care', description: 'Dedicated foetal medicine and maternal ICU support.', sortOrder: 2 },
        { name: 'IVF & ICSI', description: 'Advanced assisted reproduction with high success rates.', sortOrder: 3 },
        { name: 'Level III NICU', description: 'Round-the-clock intensive care for premature and sick newborns.', sortOrder: 4 },
        { name: 'Laparoscopic Gynaec Surgery', description: 'Minimally invasive keyhole surgery, faster recovery.', sortOrder: 5 },
        { name: 'Paediatric Vaccination', description: 'Complete immunisation programmes for every age.', sortOrder: 6 },
      ],
    });
    console.log('Seeded procedures');
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({
      data: [
        { patientName: 'Anjali R.', relation: 'Mother, Cherthala', quote: 'The doctors and nurses made my delivery feel safe and special. Forever grateful to the Kinder family.', rating: 5 },
        { patientName: 'Divya & Arun', relation: 'IVF parents, Kochi', quote: 'After years of waiting, Kinder’s fertility team gave us our miracle. Professional, kind, and honest at every step.', rating: 5 },
        { patientName: 'Meera S.', relation: 'Mother of twins, Bengaluru', quote: 'Our premature twins spent three weeks in the NICU. The neonatology team was simply world-class.', rating: 5 },
      ],
    });
    console.log('Seeded testimonials');
  }

  if ((await prisma.newsPost.count()) === 0) {
    await prisma.newsPost.createMany({
      data: [
        { title: 'Free antenatal camp this month', slug: 'free-antenatal-camp', category: 'Camp', excerpt: 'Free consultations and scans for expecting mothers at all our Kerala centres.' },
        { title: 'Kinder Hospitals receives NABH accreditation', slug: 'nabh-accreditation', category: 'News', excerpt: 'Recognised for quality and patient safety standards across our network.' },
        { title: 'World Prematurity Day awareness drive', slug: 'world-prematurity-day', category: 'Event', excerpt: 'Celebrating our NICU graduates and raising awareness on preterm birth.' },
      ],
    });
    console.log('Seeded news');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
