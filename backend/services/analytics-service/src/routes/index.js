function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function mountRoutes(app, backendRequire) {
  mountBackendRoute(app, backendRequire, '/stats', 'stats.routes');
  mountBackendRoute(app, backendRequire, '/analytics', 'analytics.routes');
  mountBackendRoute(app, backendRequire, '/reports', 'reports.routes');
  mountBackendRoute(app, backendRequire, '/ratings', 'ratings.routes');
  mountBackendRoute(app, backendRequire, '/rating-types', 'rating_types.routes');
  mountBackendRoute(app, backendRequire, '/competition-dictionaries', 'competition_dictionaries.routes');
  mountBackendRoute(app, backendRequire, '/competition-names', 'competition_names.routes');
  mountBackendRoute(app, backendRequire, '/olympiads', 'olympiads.routes');
}

module.exports = { mountRoutes };
