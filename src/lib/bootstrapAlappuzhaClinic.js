// Kinder Women's & Children's Clinic, Alappuzha — listed under the new
// "Clinics" menu.
//
// Runs once. If the centre already exists it is marked as a clinic and shown
// on the website; if it doesn't, it is created from the details the group
// site already carries. No stock photograph is set: the card shows the site's
// placeholder until the team uploads the clinic's own photo in the admin. After this, the admin's Type and visibility settings
// decide everything.
const prisma = require('./prisma');

const FLAG = 'bootstrap.alappuzhaClinic.v1';

const LOCATION = {
  name: 'Alappuzha',
  slug: 'alappuzha',
  kind: 'clinic',
  city: 'Alappuzha',
  country: 'India',
  since: 'Since 2023',
  tagline: 'Kinder care for women & children, in the heart of Alappuzha town.',
  description:
    "Kinder Women's & Children's Clinic Alappuzha opened in March 2023 at Thottunkal Plaza near Kidangamparambu Sree Bhuvaneswari Temple. An initiative of the Kinder group, it brings antenatal care, gynaecology consultations, paediatric clinics and diagnostics closer to Alappuzha families — expectant mothers can complete every test and check-up here right up to the ninth month, travelling to our Cherthala hospital only for delivery.",
  highlights:
    "Women's & children's OPD clinics\nComplete antenatal care & tests up to the 9th month\nPaediatric & vaccination clinic\nLab, scans & pharmacy\nDelivery at Kinder Cherthala — one seamless journey",
  address: 'Thottunkal Plaza, near Kidangamparambu Sree Bhuvaneswari Temple, East of Thathampally, Alappuzha.',
  phone: '+91 478 2830000',
  email: 'contactus@kinderhospital.in',
  mapUrl: 'https://kinderhospital.in/kinder_alleppey',
  website: 'https://kinderhospital.in/kinder_alleppey',
  websiteLabel: 'Visit Alappuzha →',
  published: true,
};

async function bootstrapAlappuzhaClinic(db = prisma) {
  if (await db.setting.findUnique({ where: { key: FLAG } })) return;

  const existing = await db.location.findFirst({
    where: { name: { equals: LOCATION.name, mode: 'insensitive' } },
  });
  if (existing) {
    await db.location.update({ where: { id: existing.id }, data: { kind: 'clinic', published: true } });
    console.log('Marked Kinder Alappuzha as a clinic');
  } else {
    const maxSort = await db.location.aggregate({ _max: { sortOrder: true } });
    await db.location.create({ data: { ...LOCATION, sortOrder: (maxSort._max.sortOrder || 0) + 1 } });
    console.log('Added the Kinder Alappuzha clinic');
  }
  await db.setting.create({ data: { key: FLAG, value: 'done' } });
}

module.exports = { bootstrapAlappuzhaClinic, LOCATION, FLAG };
