const nunjucks = require('nunjucks');
const fs = require('fs-extra');
const path = require('path');

const exclude = [
  'index.js',
  'sample.js'
]

/**
 * sets up all the extensions
 * @param {nunjucks.Environment} njs
 */
function setup(njs) {
  fs.readdirSync(__dirname)
  .filter(f => !(exclude.includes(f) || f.startsWith('#')))
  .map(f => {
    let name = path.parse(f).name;
    let mod = require(path.join(__dirname, f));

    return({name, mod});
  }).forEach(el => {
    njs.addExtension(name, {
      parse: el.mod['parse'],
      tags: el.mod['tags']
    })
  })
}

module.exports.setup = setup;