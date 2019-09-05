// async middleware

/**
 * creates a middleware function from fn
 * @param {(req: express.Request, res: express.Response, next: () => void) => void} fn
 * @returns {(req: express.Request, res: express.Response, next: () => void) => void}
 */
function amw(fn) {
  return function amwWrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).then(() => {
      next();
    }).catch(err => {
      next(err);
    });
  };
}

module.exports = amw;