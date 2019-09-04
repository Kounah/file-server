const path = require('path');
const fs = require('fs-extra');
const YAML = require('yaml');
const ini = require('ini');

let instancedir = path.join(__dirname, '../.instance');
if(!fs.existsSync(instancedir) || fs.statSync(instancedir).isDirectory()) {
  fs.mkdirpSync(instancedir);
}
module.exports.dir = instancedir;

/**
 * checks if the instance file exists
 * @param  {...string} subpath 
 */
function exists(...subpath) {
  return fs.existsSync(path.join(instancedir, ...subpath))
}
module.exports.exists = exists;

/**
 * gets the stats for the file
 * @param  {...string} subpath 
 * @returns {fs.Stats}
 */
function stat(...subpath) {
  let p = path.join(instancedir, ...subpath);

  if(exists(...subpath)) {
    return fs.statSync(p);
  } else throw new Error('the file \'' + p + '\' could not be found');
}

module.exports.stat = stat;

/**
 * loads an instance file
 * @param  {...string} subpath
 * @returns {Buffer}
 */
function load(...subpath) {
  let p = path.join(instancedir, ...subpath);

  if(fs.existsSync(p)) {
    return fs.readFileSync(p);
  } else throw new Error('the file \'' + p + '\' could not be found');
}
module.exports.load = load;

/**
 * loads an instance file
 * @param  {...string} subpath
 * @returns {string}
 */
function loadStr(...subpath) {
  return load(...subpath).toString('utf-8');
}

module.exports.loadStr = loadStr;

/**
 * loads an instance file and parses it as JSON
 * @param  {...string} subpath 
 * @returns {*}
 */
function loadJSON(...subpath) {
  return JSON.parse(loadStr(...subpath));
}
module.exports.loadJSON = loadJSON;

/**
 * loads an instance file and parses it as YAML
 * @param  {...string} subpath 
 * @returns {*}
 */
function loadYAML(...subpath) {
  return YAML.parse(loadStr(...subpath));
}
module.exports.loadYAML = loadYAML;

/**
 * loads an instance file and parses it as INI
 * @param  {...string} subpath
 * @returns {object.<string, *>}
 */
function loadINI(...subpath) {
  return ini.parse(loadStr(...subpath));
}
module.exports.loadINI = loadINI;

/**
 * saves data to an instance file
 * @param {string|Buffer} data 
 * @param  {...any} subpath 
 */
function save(data, ...subpath) {
  let p = path.join(instancedir, ...subpath);

  let dirp = path.parse(p).dir;
  if(!(fs.existsSync(dirp) && fs.statSync(dirp).isDirectory())) {
    fs.mkdirp(dirp);
  }

  fs.writeFileSync(p, data, {
    encoding: 'utf-8'
  });
}
module.exports.save = save;

/**
 * saves data as JSON string to an instance file
 * @param {*} data 
 * @param  {...string} subpath 
 */
function saveJSON(data, ...subpath) {
  save(JSON.stringify(data, null, '  '), ...subpath);
}
module.exports.saveJSON = saveJSON;

/**
 * saves data as YAML string to an instance file
 * @param {*} data 
 * @param  {...string} subpath 
 */
function saveYAML(data, ...subpath) {
  save(YAML.stringify(data), ...subpath);
}
module.exports.saveYAML = saveYAML;

/**
 * saves data as INI string to an instance file
 * @param {*} data 
 * @param  {...string} subpath 
 */
function saveINI(data, ...subpath) {
  save(ini.stringify(data, {
    whitespace: true
  }), ...subpath);
}
module.exports.saveINI = saveINI;