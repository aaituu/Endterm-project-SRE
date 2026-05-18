const app = require('./app');

const serviceName = process.env.SERVICE_NAME || 'analytics-service';
const port = Number(process.env.PORT || 3007);

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: serviceName, message: `listening on ${port}` }));
});
