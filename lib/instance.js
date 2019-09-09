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
async function exists(...subpath) {
  return new Promise(resolve => {
    fs.exists(path.join(instancedir, ...subpath), exists => {
      resolve(exists);
    });
  });
}
module.exports.exists = exists;

/**
 * gets the stats for the file
 * @param  {...string} subpath
 * @returns {fs.Stats}
 */
async function stat(...subpath) {
  let p = path.join(instancedir, ...subpath);

  if(await exists(...subpath)) {
    return await new Promise((resolve, reject) => {
      fs.stat(p, (err, stats) => {
        if(err) {
          reject(err);
          return;
        }

        resolve(stats);
      });
    });
  } else throw new Error('the file \'' + p + '\' could not be found');
}

module.exports.stat = stat;

/**
 * loads an instance file
 * @param  {...string} subpath
 * @returns {Buffer}
 */
async function load(...subpath) {
  let p = path.join(instancedir, ...subpath);

  return new Promise((resolve, reject) => {
    if(fs.exists(p, (exists) => {
      if(exists) {
        fs.readFile(p, (err, data) => {
          if(err) {
            reject(err);
            return;
          }
  
          resolve(data);
        });
      } else throw new Error('the file \'' + p + '\' could not be found');
    }));
  });
}
module.exports.load = load;

/**
 * loads an instance file
 * @param  {...string} subpath
 * @returns {Promise.<string>}
 */
async function loadStr(...subpath) {
  return (await load(...subpath)).toString('utf-8');
}

module.exports.loadStr = loadStr;

/**
 * loads an instance file and parses it as JSON
 * @param  {...string} subpath
 * @returns {Promise.<*>}
 */
async function loadJSON(...subpath) {
  return JSON.parse(await loadStr(...subpath));
}
module.exports.loadJSON = loadJSON;

/**
 * loads an instance file and parses it as YAML
 * @param  {...string} subpath
 * @returns {Promsie.<*>}
 */
async function loadYAML(...subpath) {
  return YAML.parse(await loadStr(...subpath));
}
module.exports.loadYAML = loadYAML;

/**
 * loads an instance file and parses it as INI
 * @param  {...string} subpath
 * @returns {Promise.<object.<string, *>>}
 */
async function loadINI(...subpath) {
  return ini.parse(await loadStr(...subpath));
}
module.exports.loadINI = loadINI;

/**
 * saves data to an instance file
 * @param {string|Buffer} data
 * @param  {...any} subpath
 */
async function save(data, ...subpath) {
  let p = path.join(instancedir, ...subpath);

  let dirp = path.parse(p).dir;

  let mkdirProm =  new Promise((resolve, reject) => {
    fs.mkdirp(dirp, err => {
      if(err) {
        reject(err);
        return;
      }

      resolve();
    });
  });

  await new Promise((resolve, reject) => {
    fs.exists(dirp, exists => {
      if(!exists) {
        mkdirProm.then(resolve).catch(reject);
      } else resolve();
    });
  });
  
  return await new Promise((resolve, reject) => {
    fs.writeFile(p, data, {
      encoding: 'utf-8'
    }, err => {
      if(err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}
module.exports.save = save;

/**
 * saves data as JSON string to an instance file
 * @param {*} data
 * @param  {...string} subpath
 */
async function saveJSON(data, ...subpath) {
  await save(JSON.stringify(data, null, '  '), ...subpath);
}
module.exports.saveJSON = saveJSON;

/**
 * saves data as YAML string to an instance file
 * @param {*} data
 * @param  {...string} subpath
 */
async function saveYAML(data, ...subpath) {
  await save(YAML.stringify(data), ...subpath);
}
module.exports.saveYAML = saveYAML;

/**
 * saves data as INI string to an instance file
 * @param {*} data
 * @param  {...string} subpath
 */
async function saveINI(data, ...subpath) {
  await save(ini.stringify(data, {
    whitespace: true
  }), ...subpath);
}
module.exports.saveINI = saveINI;