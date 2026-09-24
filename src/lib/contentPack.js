const original = require('../../content/website-content.json');
const kochi = require('../../content/kochi-content.json');
const pregnancy = require('../../content/kochi-pregnancy.json');
module.exports = {
  ...original,
  version: `${original.version}+${kochi.version}+${pregnancy.version}`,
  sources: [...original.sources, ...kochi.sources, ...pregnancy.sources],
  records: [...original.records, ...kochi.records, ...pregnancy.records],
};
