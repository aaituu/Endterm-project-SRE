function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function mountRoutes(app, backendRequire) {
  mountBackendRoute(app, backendRequire, '/slides', 'slides.routes');
  mountBackendRoute(app, backendRequire, '/news', 'news.routes');
  mountBackendRoute(app, backendRequire, '/gallery', 'gallery.routes');
  mountBackendRoute(app, backendRequire, '/administration', 'administration.routes');
  mountBackendRoute(app, backendRequire, '/contact', 'contact.routes');
  mountBackendRoute(app, backendRequire, '/site-content', 'site_content.routes');
  mountBackendRoute(app, backendRequire, '/events', 'events.routes');
  mountBackendRoute(app, backendRequire, '/event-types', 'event_types.routes');
  mountBackendRoute(app, backendRequire, '/library', 'library.routes');
}

module.exports = { mountRoutes };
