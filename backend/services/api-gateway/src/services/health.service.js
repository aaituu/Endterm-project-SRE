const routes = require('../config/routes');

async function checkServices(timeoutMs = 3000) {
  const uniqueTargets = new Map();
  for (const route of routes) {
    uniqueTargets.set(route.targetEnv, process.env[route.targetEnv] || route.target);
  }

  const checks = await Promise.all(Array.from(uniqueTargets.entries()).map(async ([name, target]) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${target}/health`, { signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      return { service: name.replace('_SERVICE_URL', '').toLowerCase(), target, status: response.ok ? (body.status || 'ok') : 'down' };
    } catch (error) {
      return { service: name.replace('_SERVICE_URL', '').toLowerCase(), target, status: 'down', error: error.message };
    } finally {
      clearTimeout(timer);
    }
  }));

  return checks;
}

module.exports = { checkServices };
