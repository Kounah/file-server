const def = require('./default');
const instance = require('../lib/instance');
const expansion = require('../lib/expansion');

/**
 * loads the configuration
 * @returns {def}
 */
function loadConfig() {
  if(instance.exists('config.json')) {
    let instanceConfig = instance.loadJSON('config.json');
    return expansion.object.update.call(def, instanceConfig);
  } else return def;
}
module.exports = loadConfig();