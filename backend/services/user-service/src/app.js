require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { backendRequire } = require('./config/backend');
const { createHealthController } = require('./controllers/health.controller');
const { mountRoutes } = require('./routes');
const { httpLogger } = require('./utils/logger');
const { createMetrics } = require('./utils/metrics');

const serviceName = process.env.SERVICE_NAME || 'user-service';
const app = express();
const metrics = createMetrics(serviceName);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(httpLogger(serviceName));
app.use(metrics.middleware);
app.get('/health', createHealthController(serviceName));
app.get('/metrics', metrics.handler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(backendRequire('middleware/tenant').resolveSchoolContext);

mountRoutes(app, backendRequire);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', service: serviceName });
});
app.use(backendRequire('middleware/error'));

module.exports = app;
