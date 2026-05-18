const app = require('./app');

const serviceName = process.env.SERVICE_NAME || 'assignment-service';
const port = Number(process.env.PORT || 3005);

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: serviceName, message: `listening on ${port}` }));
});
