const express = require('express');
const { extractVideoId, isValidUrl } = require('./validators');
const { fetchTranscript } = require('./youtube');
const router = express.Router();

/**
 * POST /api/transcript
 * Body: { url: string }
 * Returns: { success, data: { videoId, segments, fullText } }
 */
router.post('/', async (req, res, next) => {
  try {
    const { url } = req.body;

    // ── Input validation ───────────────────────────────────────────
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid YouTube URL.',
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error:
          'Could not recognize this URL. Please paste a standard YouTube video link.',
      });
    }

    // ── Fetch transcript ───────────────────────────────────────────
    const { segments, fullText } = await fetchTranscript(videoId);

    return res.json({
      success: true,
      data: {
        videoId,
        segments,
        fullText,
        segmentCount: segments.length,
        charCount: fullText.length,
      },
    });
  } catch (error) {
    if (error.status && error.status < 500) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

module.exports = router;
