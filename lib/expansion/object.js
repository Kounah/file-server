/**
 * updates obj0 with properties of obj1
 * @param {*} obj0
 * @param {*} obj1
 */
function __recursiveUpdate(obj0, obj1) {
  if(typeof obj0 === 'object' && obj0 !== null) {
    if(typeof obj1 === 'object' && obj1 !== null) {
      Object.entries(obj0).forEach(entry => {
        if(typeof obj1[entry[0]] !== 'undefined') {
          obj0[entry[0]] = __recursiveUpdate(obj0[entry[0]], obj1[entry[0]]);
        }
      });
      return obj0;
    } else {
      return obj1;
    }
  } else {
    if(typeof obj0 !== 'undefined') {
      return obj1;
    }
  }
}

/**
 * updates the object in the this parameter with the properties\
 * set in the obj parameter
 * @this {object}
 * @param {object} obj
 */
function update(obj) {
  if(typeof this !== 'object' || this === null)
    throw new TypeError('\'this\' is null or not an object');

  if(typeof obj !== 'object' || obj === null)
    throw new TypeError('\'obj\' is null or not an object');

  this = __recursiveUpdate(this, obj);

  return this;
}
Object.prototype.update = update;
module.exports.update = update;