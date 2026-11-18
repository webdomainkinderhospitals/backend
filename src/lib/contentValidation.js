function publicRecord(row) {
  const { sourceKey, sourceFiles, reviewNotes, ...content } = row;
  return content;
}
// `current` is the record as stored, when an existing one is being edited.
// Review notes stop a record going live, not an edit to one that is already
// on the website: a doctor whose notes only record their earlier photo can
// still have their photo or text changed in the admin.
function validatePublication(collection, data, current = null) {
  if (!['pages', 'doctors', 'specialities'].includes(collection)) return;
  const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
  if (collection === 'pages' && (!data.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))) {
    fail('Page address must use lowercase letters, numbers and single hyphens.');
  }
  if (data.published && !current?.published && String(data.reviewNotes || '').trim()) {
    fail('Resolve the content review notes and clear them before publishing.');
  }
  if (collection === 'pages' && data.published && !String(data.body || '').trim()) {
    fail('Add the page content before publishing.');
  }
}
// A doctor's serial number at each hospital, as the admin sends it: an
// object or JSON text. Kept as JSON text of whole numbers from 1; anything
// else (blank, 0, text) is dropped, so a doctor without a number at a
// hospital simply follows the numbered ones there.
function cleanHospitalOrder(value) {
  let raw = value;
  if (typeof raw === 'string') {
    if (!raw.trim()) return '';
    try { raw = JSON.parse(raw); } catch { return ''; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const out = {};
  for (const [hospital, n] of Object.entries(raw)) {
    const name = String(hospital).trim();
    const num = Number(n);
    if (name && Number.isInteger(num) && num > 0 && num < 100000) out[name] = num;
  }
  return Object.keys(out).length ? JSON.stringify(out) : '';
}
module.exports = { publicRecord, validatePublication, cleanHospitalOrder };
