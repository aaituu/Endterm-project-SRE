const path = require('path');

const backendSrcPath = process.env.BACKEND_SRC_PATH || path.resolve(__dirname, '../../../../src');

function backendRequire(modulePath) {
  return require(path.join(backendSrcPath, modulePath));
}

module.exports = { backendSrcPath, backendRequire };
