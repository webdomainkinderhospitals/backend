const original = require('../../content/website-content.json');
const kochi = require('../../content/kochi-content.json');
module.exports = {
  ...original,
  version: `${original.version}+${kochi.version}`,
  sources: [...original.sources, ...kochi.sources],
  records: [...original.records, ...kochi.records],
};
