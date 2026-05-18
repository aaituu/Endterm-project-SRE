function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function mountRoutes(app, backendRequire) {
  mountBackendRoute(app, backendRequire, '/academic', 'academic.routes');
  mountBackendRoute(app, backendRequire, '/attendance', 'attendance.routes');
  mountBackendRoute(app, backendRequire, '/lesson-observations', 'lesson_observations.routes');
  mountBackendRoute(app, backendRequire, '/lesson-visits', 'lesson_visits.routes');
  mountBackendRoute(app, backendRequire, '/attestations', 'attestations.routes');
  mountBackendRoute(app, backendRequire, '/medical', 'medical.routes');
}

module.exports = { mountRoutes };
