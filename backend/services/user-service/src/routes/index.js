function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function mountRoutes(app, backendRequire) {
  mountBackendRoute(app, backendRequire, '/users', 'users.routes');
  mountBackendRoute(app, backendRequire, '/roles', 'roles.routes');
  mountBackendRoute(app, backendRequire, '/user-import', 'import.routes');
  mountBackendRoute(app, backendRequire, '/teachers', 'teachers.routes');
  mountBackendRoute(app, backendRequire, '/students', 'students.routes');
  mountBackendRoute(app, backendRequire, '/student-reports', 'student_reports.routes');
  mountBackendRoute(app, backendRequire, '/student-profiles', 'student_profiles.routes');
  mountBackendRoute(app, backendRequire, '/student-achievements', 'student_achievements.routes');
}

module.exports = { mountRoutes };
