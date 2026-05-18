const app = require('./app');

const serviceName = process.env.SERVICE_NAME || 'api-gateway';
const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: serviceName, message: `listening on ${port}` }));
});
