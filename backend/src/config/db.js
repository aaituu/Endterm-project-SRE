const { AsyncLocalStorage } = require('async_hooks');
const { Pool } = require('pg');

const baseConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'school_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const tenantContext = new AsyncLocalStorage();
const tenantPools = new Map();

function createPool(config, label = config.database) {
  const createdPool = new Pool(config);
  createdPool.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Connected to PostgreSQL (${label})`);
    }
  });
  createdPool.on('error', (err) => {
    console.error(`❌ PostgreSQL pool error (${label}):`, err.message);
  });
  return createdPool;
}

const pool = createPool(baseConfig, 'central');

function getCurrentTenant() {
  return tenantContext.getStore() || null;
}

function getPoolForDatabase(databaseName) {
  if (!databaseName || databaseName === baseConfig.database) return pool;
  if (tenantPools.has(databaseName)) return tenantPools.get(databaseName);

  const tenantPool = createPool({ ...baseConfig, database: databaseName }, databaseName);
  tenantPools.set(databaseName, tenantPool);
  return tenantPool;
}

function getActivePool() {
  const context = getCurrentTenant();
  return context?.databaseName ? getPoolForDatabase(context.databaseName) : pool;
}

function withTenantDatabase(databaseName, meta, callback) {
  if (!databaseName) return callback();
  return tenantContext.run({ databaseName, ...(meta || {}) }, callback);
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
const query = async (text, params) => {
  const start = Date.now();
  const activePool = getActivePool();
  try {
    const result = await activePool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      // console.log('Query:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('DB Query Error:', err.message, '\nQuery:', text);
    throw err;
  }
};

const centralQuery = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      // console.log('Central query:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('Central DB Query Error:', err.message, '\nQuery:', text);
    throw err;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = () => getActivePool().connect();
const getCentralClient = () => pool.connect();

async function endTenantPools() {
  await Promise.all([...tenantPools.values()].map((tenantPool) => tenantPool.end()));
  tenantPools.clear();
}

module.exports = {
  query,
  getClient,
  pool,
  centralQuery,
  getCentralClient,
  getCurrentTenant,
  getPoolForDatabase,
  withTenantDatabase,
  endTenantPools,
  baseConfig
};
