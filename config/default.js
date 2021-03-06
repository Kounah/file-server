const path = require('path');
// const fs = require('fs');

//#region credentials
let credentials = {
  mongo: {
    username: '',
    password: ''
  }
};

module.exports.credentials = credentials;
//#endregion

//#region mongo
let mongo = {
  pathname: 'simple-file-server',
  protocol: 'mongodb',
  hostname: '127.0.0.1',
  port:     '27017',
  auth:     '',
  slashes:  true
};

if(typeof credentials === 'object' && credentials !== null) {
  if(typeof credentials.mongo === 'object' && credentials.mongo !== null) {
    if(credentials.mongo.username && credentials.mongo.password) {
      mongo.auth =  encodeURIComponent(credentials.mongo.username) +
                    ':' +
                    encodeURIComponent(credentials.mongo.password);
    }
  }
}

module.exports.mongo = mongo;
//#endregion

//#region server
let server = {
  port: 42069
};

module.exports.server = server;
//#endregion

//#region api
let api = {
  file: {
    core: {
      root: '',
    },
    resize: {
      noCache: false,
      storage: 'cache/resize',
      index: 'cache/resize/index.json',
      except: [
        'image/gif',
        'image/svg',
        'image/svg+xml',
        'application/xml',
        'image/x-icon',
        'image/vnd.microsoft.icon'
      ]
    },
    preview: {
      gif: {
        noCache: false,
        storage: 'cache/preview/gif',
        index: 'cache/preview/gif/index.json'
      },
      video: {
        noCache: false,
        storage: 'cache/preview/video',
        index: 'cache/preview/video/index.json',
        options: {
          count: 16
        }
      }
    },
    handlers: {
      get: {
        enabled: true
      }
    }
  },
  web: {
    core: {
      noCache: false,
      cacheMaxAge: 1000 * 60 * 60,
      assetsPath: path.join(__dirname, '../.assets')
    },
    handlers: {
      getAsset: {
        enabled: true
      }
    }
  }
};

module.exports.api = api;
//#endregion

//#region nunjucks
let nunjucks = {
  noCache: false,
  autoescape: true,
  properties: {
    themeColor: '#000000'
  },
  global: {
    protocol: 'http://',
    host: 'localhost:42069'
  }
};

module.exports.nunjucks = nunjucks;
//#endregion