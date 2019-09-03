// async middleware

/**
 * creates a middleware function from fn
 * @param {Promise|{(req: express.Request, res: express.Response, next: () => void) => void}} fn 
 */
function amw(fn) {
  return function(req, res, next) {
    Promise.resolve(fn).then(() => {
      next();
    }).catch(err => {
      next(err);
    })
  }
}

module.exports = amw;