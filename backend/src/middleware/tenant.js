const { centralQuery, withTenantDatabase } = require('../config/db');
const { LOCAL_SCHOOL_ID } = require('../services/tenantDatabaseService');

const normalizeTenantSlug = (value) => {
  if (!value) return null;
  return String(value).trim().toLowerCase();
};

const resolveSchoolSlug = (req) => {
  const headerSlug = req.headers['x-school-slug'];
  if (headerSlug) return normalizeTenantSlug(headerSlug);

  const host = req.headers.host;
  if (host) {
    const hostname = host.split(':')[0];
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Public tunnel hosts should not be treated as school tenant subdomains.
      if (
        hostname.endsWith('.ngrok.io') ||
        hostname.endsWith('.ngrok-free.dev') ||
        hostname.endsWith('.ngrok.app') ||
        hostname.endsWith('.ngrok.dev')
      ) {
        return null;
      }
      const parts = hostname.split('.');
      if (hostname.endsWith('.localhost') && parts.length >= 2) {
        return normalizeTenantSlug(parts[0]);
      }
      if (parts.length > 2) {
        return normalizeTenantSlug(parts[0]);
      }
    }
  }

  return null;
};

const resolveHostName = (req) => {
  const host = req.headers.host;
  return host ? normalizeTenantSlug(host.split(':')[0]) : null;
};

const resolveSchoolContext = async (req, res, next) => {
  const tenantSlug = resolveSchoolSlug(req);
  if (!tenantSlug) return next();

  if (req.path.startsWith('/api/super-admin')) {
    return next();
  }

  try {
    const hostName = resolveHostName(req);
    const result = await centralQuery(
      `SELECT id, name, slug, code, domain, subdomain, database_name, database_status
       FROM schools
       WHERE is_active = TRUE
         AND (
           LOWER(subdomain) = LOWER($1)
           OR LOWER(slug) = LOWER($1)
           OR LOWER(code) = LOWER($1)
           OR ($2::text IS NOT NULL AND LOWER(domain) = LOWER($2))
         )
       LIMIT 1`,
      [tenantSlug, hostName]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
    }

    const school = result.rows[0];
    req.school = school;
    req.central_school_id = school.id;
    req.school_id = LOCAL_SCHOOL_ID;

    if (!school.database_name) {
      if (req.path === '/api/school-context') return next();
      return res.status(503).json({
        success: false,
        message: 'Бұл мектептің жеке дерекқоры әлі дайын емес'
      });
    }

    return withTenantDatabase(school.database_name, { school }, () => next());
  } catch (error) {
    console.error('School context resolution failed:', error.message);
    return res.status(500).json({ success: false, message: 'Мектеп контекстін анықтау мүмкін болмады' });
  }
};

const attachSchoolContext = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Авторизация талап етіледі' });
  }

  if (req.user.role === 'super_admin' && !req.school) {
    req.school_id = null;
    return next();
  }

  req.school_id = req.school_id || req.user.school_id;
  if (!req.school_id) {
    return res.status(403).json({ success: false, message: 'Мектеп контексті белгісіз' });
  }

  next();
};

const safeSchoolFilter = (req, alias = 'school_id') => {
  if (req.user?.role === 'super_admin' && !req.school) {
    return { clause: '', params: [] };
  }
  return { clause: `${alias} = $1`, params: [req.school_id] };
};

module.exports = { attachSchoolContext, safeSchoolFilter, resolveSchoolContext };
