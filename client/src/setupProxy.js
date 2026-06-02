const proxy = require('http-proxy-middleware');

const target = process.env.DOUDIZHU_BACKEND_PROXY || 'http://127.0.0.1:8081';

module.exports = function setupProxy(app) {
  app.use(proxy('/ws', {
    target,
    ws: true,
  }));

  app.use(proxy([
    '/healthz',
    '/login',
    '/userinfo',
    '/admin',
    '/social/config',
    '/social/index',
  ], {
    target,
  }));
};
