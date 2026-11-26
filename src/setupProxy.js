// CRA dev server: the same origin and room protocol used by NOMA Hosting.
module.exports = app => {
  let handler;
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api/canvas3d/')) return next();
    if (!handler) handler = require('../services/canvas3d/server.cjs').createHandler();
    return handler(req, res, next);
  });
};
