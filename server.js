require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const path = require('path');

const transcriptRouter = require('./transcript');
const { apiLimiter } = require('./rateLimiter');
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ── Security middleware ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https://i.ytimg.com", "https://img.youtube.com", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : '*' }));
app.use(hpp());

// ── Body parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: false, limit: '1kb' }));

// ── Static files ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// ── API routes ───────────────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/transcript', transcriptRouter);

// ── SPA fallback ─────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

// ── Start server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
});
