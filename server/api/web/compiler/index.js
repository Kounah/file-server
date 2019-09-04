const fs = require('fs-extra');
const path = require('path');

const exclude = [
  'index.js',
  'sample.js'
]

/**
 * @typedef {Object} CompilerModule
 * @prop {Array.<string>} extensions
 * @prop {{(fname: string) => Promise.<Buffer>}|{(fname: string) => Buffer}} compile
 * @prop {string} type
 */

/**@type {Array.<CompilerModule>} */
let compilerModules = fs.readdirSync(__dirname)
.filter(fname => !(exclude.includes(fname) || fname.startsWith('#')))
.map(fname => require(path.join(__dirname, fname)));

/**
 * checks if the file needs compilation
 * @param {string} fname 
 * @returns {boolean}
 */
function needed(fname) {
  return compilerModules
  .filter(cmod => {
    return cmod.extensions.includes(path.parse(fname).ext)
  }).length > 0;
}

module.exports.needed = needed;

/**
 * gets the compiler module for the file
 * @param {string} fname 
 * @returns {CompilerModule}
 */
function getCompilerModule(fname) {
  return compilerModules
  .filter(cmod =>
    cmod.extensions.includes(path.parse(fname).ext))
  .shift();
}

module.exports.getCompilerModule = getCompilerModule;

/**
 * compiles the file
 * @typedef {Object} CompileResult
 * @prop {Buffer} data
 * @prop {string} type
 * @param {string} fname
 * @returns {Promise.<CompileResult>}
 */
async function compile(fname) {
  let cmod = getCompilerModule(fname);

  return {
    data: await Promise.resolve(cmod.compile(fname)),
    type: cmod.type
  }
}

module.exports.compile = compile;