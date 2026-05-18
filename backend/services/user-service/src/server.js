const serviceName = process.env.SERVICE_NAME || 'user-service';
const port = Number(process.env.PORT || 3002);
const app = require('./app');

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: serviceName, message: `listening on ${port}` }));
});
