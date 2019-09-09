const path = require('path');
const fs = require('fs-extra');

module.exports = function(p) {
  return fs.readFileSync(path.resolve(p)).toString('utf-8');
};