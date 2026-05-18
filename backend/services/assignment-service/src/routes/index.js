function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function mountRoutes(app, backendRequire) {
  mountBackendRoute(app, backendRequire, '/assignments', 'assignments.routes');
  mountBackendRoute(app, backendRequire, '/tasks', 'tasks.routes');
  mountBackendRoute(app, backendRequire, '/monthly-plans', 'monthly_plans.routes');
  mountBackendRoute(app, backendRequire, '/teacher/dashboard', 'teacher_profile.routes');
  mountBackendRoute(app, backendRequire, '/teacher-materials', 'teacher_materials.routes');
  mountBackendRoute(app, backendRequire, '/teacher-courses', 'teacher_courses.routes');
  mountBackendRoute(app, backendRequire, '/teacher-qmg', 'teacher_qmg.routes');
  mountBackendRoute(app, backendRequire, '/messages', 'messages.routes');
}

module.exports = { mountRoutes };
