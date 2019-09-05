const path = require('path');

module.exports = function(data) {
  return String(data).split(path.sep).map(seg => encodeURIComponent(seg)).join('/');
};