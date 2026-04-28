const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// Custom metric: HTTP request duration
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000] // Define buckets for response times
});

module.exports = { client, httpRequestDurationMicroseconds };
