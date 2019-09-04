const nunjucks = require('nunjucks');
const fs = require('fs');
const path = require('path');

const exclude = [
  'index.js',
  'sample.js'
];

/**
 * sets up all the filters
 * @param {nunjucks.Environment} njs 
 */
function setup(njs) {
  fs.readdirSync(__dirname)
  .filter(f => !(exclude.includes(f) || f.startsWith('#')))
  .map(f => {
    let name = path.parse(f).name;
    let mod = require(path.join(__dirname, f));

    return {name, mod};
  })
  .forEach(el => {
    njs.addFilter(el.name, el.mod);
  })
}

module.exports.setup = setup;