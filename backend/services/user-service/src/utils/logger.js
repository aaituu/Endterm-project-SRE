const pinoHttp = require('pino-http');

function httpLogger(serviceName) {
  return pinoHttp({ customProps: () => ({ service: serviceName }) });
}

module.exports = { httpLogger };
