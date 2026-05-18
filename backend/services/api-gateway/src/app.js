require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const routes = require('./config/routes');
const { health, status } = require('./controllers/health.controller');
const { httpLogger } = require('./utils/logger');
const { createMetrics } = require('./utils/metrics');

const serviceName = process.env.SERVICE_NAME || 'api-gateway';
const app = express();
const metrics = createMetrics(serviceName);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(httpLogger(serviceName));
app.use(metrics.middleware);

app.get('/health', health);
app.get('/api/status', status);
app.get('/metrics', metrics.handler);

for (const route of routes) {
  const target = process.env[route.targetEnv] || route.target;
  app.use(route.prefix, createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path, req) => req.originalUrl,
    proxyTimeout: Number(process.env.UPSTREAM_TIMEOUT_MS || 30000),
    timeout: Number(process.env.UPSTREAM_TIMEOUT_MS || 30000),
    on: {
      error: (err, req, res) => {
        req.log?.error({ err, target }, 'gateway proxy failed');
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ success: false, message: 'Upstream service unavailable', target }));
      }
    }
  }));
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Gateway route not found' });
});

module.exports = app;
