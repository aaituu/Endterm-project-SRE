const serviceName = process.env.SERVICE_NAME || 'notification-service';
const port = Number(process.env.PORT || 3008);
const app = require('./app');

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: serviceName, message: `listening on ${port}` }));
});
