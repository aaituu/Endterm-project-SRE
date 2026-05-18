const promClient = require('prom-client');

function createMetrics(serviceName) {
  promClient.collectDefaultMetrics({ labels: { service: serviceName } });
  const httpDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['service', 'method', 'route', 'status_code'],
    buckets: [0.005, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
  });
  const middleware = (req, res, next) => {
    const route = req.path.split('/').slice(0, 3).join('/') || req.path;
    const end = httpDuration.startTimer({ service: serviceName, method: req.method, route });
    res.on('finish', () => end({ status_code: res.statusCode }));
    next();
  };
  const handler = async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  };
  return { middleware, handler };
}

module.exports = { createMetrics };
