const { checkServices } = require('../services/health.service');

function health(req, res) {
  res.json({ status: 'ok', service: process.env.SERVICE_NAME || 'api-gateway', timestamp: new Date().toISOString() });
}

async function status(req, res) {
  const checks = await checkServices();
  const ok = checks.every((check) => check.status === 'ok');
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', service: 'api-gateway', checks });
}

module.exports = { health, status };
