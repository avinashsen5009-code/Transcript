# TranscriptGrab — YouTube Transcript Extractor

A fast, modern web application that extracts and displays transcripts from YouTube videos.

![Dark mode UI](https://img.shields.io/badge/UI-Dark_Mode-1e1e24?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Features

- **Paste & Extract** — Paste any YouTube URL and get the full transcript instantly.
- **One-Click Copy** — Copy the entire transcript with a single click.
- **Timestamp Toggle** — View transcript with or without timestamps.
- **Multiple URL Formats** — Supports `youtube.com/watch`, `youtu.be`, shorts, embeds, and live links.
- **Graceful Errors** — Friendly error messages for videos without transcripts.
- **Rate Limited** — Built-in protection against abuse.
- **Mobile-First** — Fully responsive, works beautifully on all devices.
- **Accessible** — ARIA labels, keyboard navigation, screen reader support.
- **Secure** — Helmet headers, CORS, HPP, input validation.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Setup

```bash
# 1. Navigate to the project directory
cd transcript

# 2. Install dependencies
npm install

# 3. Copy environment config (optional — defaults work out of the box)
copy .env.example .env

# 4. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Production

```bash
# Set NODE_ENV
set NODE_ENV=production

# Start the server
npm start
```

---

## Configuration

All settings are optional. Defaults are production-ready.

| Variable                  | Default    | Description                          |
|--------------------------|------------|--------------------------------------|
| `PORT`                   | `3000`     | Server port                          |
| `NODE_ENV`               | `production` | Environment (`development` or `production`) |
| `RATE_LIMIT_WINDOW_MS`  | `900000`   | Rate limit window in milliseconds (15 min) |
| `RATE_LIMIT_MAX_REQUESTS`| `30`       | Max requests per window per IP       |

---

## Project Structure

```
transcript/
├── server.js                    # Express entry point
├── package.json
├── .env / .env.example
├── public/                      # Static frontend assets
│   ├── index.html
│   ├── favicon.svg
│   ├── css/
│   │   └── styles.css           # Design system & styles
│   └── js/
│       └── app.js               # Client-side application
└── src/                         # Backend source
    ├── routes/
    │   └── transcript.js        # POST /api/transcript
    ├── services/
    │   └── youtube.js           # Transcript fetching logic
    ├── middleware/
    │   └── rateLimiter.js       # Rate limiting config
    └── utils/
        └── validators.js        # URL parsing & validation
```

---

## API Reference

### `POST /api/transcript`

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "segments": [
      { "text": "We're no strangers to love", "offset": 18, "duration": 3 }
    ],
    "fullText": "We're no strangers to love ...",
    "segmentCount": 42,
    "charCount": 1830
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": "No transcript found. The video may not have captions available."
}
```

---

## Deployment

### Docker (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### Platform Deployment

Works out of the box on:
- **Railway** — Push to deploy
- **Render** — Set build command: `npm install`, start command: `npm start`
- **Fly.io** — `fly launch`
- **VPS** — Use PM2: `pm2 start server.js`

---

## License

MIT
