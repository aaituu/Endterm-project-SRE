const { checkDatabase } = require('../services/database.service');

function createHealthController(serviceName) {
  return async (req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ok', service: serviceName, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({ status: 'down', service: serviceName, error: error.message });
    }
  };
}

module.exports = { createHealthController };
