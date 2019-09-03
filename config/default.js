//#region credentials
let credentials = {
  mongo: {
    username: '',
    password: ''
  }
}

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
}

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
}

module.exports.server = server;
//#endregion

//#region api
let api = {
  file: {
    core: {
      root: ''
    },
    handlers: {
      get: {
        enabled: true
      }
    }
  }
}

module.exports.api = api;
//#endregion