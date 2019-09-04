const sass = require('node-sass');

module.exports.extensions = [
  '.sass',
  '.scss'
];

async function compile(fname) {
  return await new Promise((resolve, reject) => {
    sass.render({
      file: fname,
      sourceMap: false,
      outputStyle: 'expanded'
    }, (err, data) => {
      if(err) {
        reject(err);
        return;
      }

      resolve(data.css);
    })
  });
}
module.exports.compile = compile;

module.exports.type = 'text/css';