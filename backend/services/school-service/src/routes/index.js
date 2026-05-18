function mountBackendRoute(app, backendRequire, basePath, routeFile) {
  const router = backendRequire(`routes/${routeFile}`);
  app.use(basePath, router);
  app.use(`/api${basePath}`, router);
}

function schoolContextHandler(req, res) {
  if (!req.school) return res.json({ success: true, data: null });
  return res.json({
    success: true,
    data: {
      id: req.school.id,
      local_school_id: req.school_id || 1,
      name: req.school.name,
      slug: req.school.slug,
      code: req.school.code,
      domain: req.school.domain,
      subdomain: req.school.subdomain,
      database_status: req.school.database_status || null
    }
  });
}

function mountRoutes(app, backendRequire) {
  app.get('/school-context', schoolContextHandler);
  app.get('/api/school-context', schoolContextHandler);
  mountBackendRoute(app, backendRequire, '/super-admin/schools', 'schools.routes');
  mountBackendRoute(app, backendRequire, '/super-admin/analytics', 'super_admin_analytics.routes');
  mountBackendRoute(app, backendRequire, '/super-admin/site-builder', 'super_admin_site_builder.routes');
  mountBackendRoute(app, backendRequire, '/super-admin/audit-logs', 'super_admin_audit_logs.routes');
  mountBackendRoute(app, backendRequire, '/super-admin/plans', 'super_admin_plans.routes');
  mountBackendRoute(app, backendRequire, '/super-admin/impersonate', 'super_admin_impersonate.routes');
}

module.exports = { mountRoutes };
