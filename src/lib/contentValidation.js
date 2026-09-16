function publicRecord(row) {
  const { sourceKey, sourceFiles, reviewNotes, ...content } = row;
  return content;
}
function validatePublication(collection, data) {
  if (!['pages', 'doctors', 'specialities'].includes(collection)) return;
  const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
  if (collection === 'pages' && (!data.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))) {
    fail('Page address must use lowercase letters, numbers and single hyphens.');
  }
  if (data.published && String(data.reviewNotes || '').trim()) {
    fail('Resolve the content review notes and clear them before publishing.');
  }
  if (collection === 'pages' && data.published && !String(data.body || '').trim()) {
    fail('Add the page content before publishing.');
  }
}
module.exports = { publicRecord, validatePublication };
