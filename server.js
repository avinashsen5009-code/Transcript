require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const path = require('path');

const transcriptRouter = require('./transcript');
const { apiLimiter } = require('./rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
  })
);

app.use(hpp());

// Body parsing
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: false, limit: '1kb' }));

// Static files
app.use(
  express.static(__dirname, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
  })
);

// API routes
app.use('/api', apiLimiter);
app.use('/api/transcript', transcriptRouter);

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
