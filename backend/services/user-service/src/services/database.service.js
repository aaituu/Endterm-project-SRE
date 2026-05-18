const { backendRequire } = require('../config/backend');

async function checkDatabase() {
  const { query } = backendRequire('config/db');
  await query('SELECT 1');
}

module.exports = { checkDatabase };
