function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function mountRoutes(app, backendRequire) {
  mountBackendRoute(app, backendRequire, '/notifications', 'notifications.routes');
  mountBackendRoute(app, backendRequire, '/telegram', 'telegram.routes');
}

module.exports = { mountRoutes };
