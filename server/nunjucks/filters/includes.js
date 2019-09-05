module.exports = function(a, b) {
  if(typeof a === 'string') {
    return a.includes(b);
  } else if(typeof a === 'object' && a !== null && Array.isArray(a)) {
    return a.includes(b);
  } else return false;
};