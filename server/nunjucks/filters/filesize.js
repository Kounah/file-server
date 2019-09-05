const filesize = require('filesize');
module.exports = function(data, params) {
  return filesize(data, params);
};