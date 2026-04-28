const express = require('express');
const mongoose = require('mongoose');
const { client, httpRequestDurationMicroseconds } = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));
} else {
  console.log('No MONGO_URI provided. Skipping DB connection.');
}

// Middleware to measure request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
