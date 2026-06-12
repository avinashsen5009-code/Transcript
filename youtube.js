const {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError
} = require('youtube-transcript');

/**
 * Maps youtube-transcript custom errors to standard Errors with status codes.
 */
function mapError(error) {
  const name = error.constructor.name;
  const message = error.message || '';

  let mappedError;
  if (error instanceof YoutubeTranscriptDisabledError || name === 'YoutubeTranscriptDisabledError') {
    mappedError = new Error('Transcripts are disabled for this video by the uploader.');
    mappedError.status = 403;
  } else if (error instanceof YoutubeTranscriptVideoUnavailableError || name === 'YoutubeTranscriptVideoUnavailableError') {
    mappedError = new Error('The video is no longer available or the video ID is invalid.');
    mappedError.status = 404;
  } else if (error instanceof YoutubeTranscriptNotAvailableError || name === 'YoutubeTranscriptNotAvailableError') {
    mappedError = new Error('No transcript found. The video may not have captions available.');
    mappedError.status = 404;
  } else if (error instanceof YoutubeTranscriptTooManyRequestError || name === 'YoutubeTranscriptTooManyRequestError') {
    mappedError = new Error('YouTube is rate-limiting requests. Please try again in a minute.');
    mappedError.status = 429;
  } else if (message.includes('too many requests') || message.includes('429')) {
    mappedError = new Error('YouTube is rate-limiting requests. Please try again in a minute.');
    mappedError.status = 429;
  } else {
    mappedError = new Error(message || 'Failed to fetch transcript. Please verify the URL and try again.');
    mappedError.status = 502;
  }
  return mappedError;
}

/**
 * Helper to normalize millisecond/second values to seconds.
 */
function normalizeTime(val, isMs) {
  const factor = isMs ? 1000 : 1;
  return Math.round((val / factor) * 1000) / 1000;
}

/**
 * Normalizes time units, removes newlines, and deduplicates consecutive duplicate segments.
 */
function processTranscript(rawSegments) {
  if (!rawSegments || rawSegments.length === 0) {
    return { segments: [], fullText: '' };
  }

  // 1. Detect if time is in milliseconds or seconds
  let totalDuration = 0;
  for (const seg of rawSegments) {
    totalDuration += seg.duration || 0;
  }
  const avgDuration = totalDuration / rawSegments.length;
  const hasDecimals = rawSegments.some(seg => (seg.offset % 1 !== 0) || (seg.duration % 1 !== 0));
  const isMs = !hasDecimals && (avgDuration > 50);

  // 2. Deduplicate consecutive segments and convert time to seconds
  const cleanSegments = [];
  for (const segment of rawSegments) {
    // Replace newlines and extra spaces
    const text = segment.text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const normText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, ' ').trim();
    const offset = normalizeTime(segment.offset, isMs);
    const duration = normalizeTime(segment.duration, isMs);

    if (cleanSegments.length > 0) {
      const lastSeg = cleanSegments[cleanSegments.length - 1];
      const lastNormText = lastSeg.text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, ' ').trim();

      if (lastNormText === normText) {
        // Merge duration
        lastSeg.duration = Math.round((lastSeg.duration + duration) * 1000) / 1000;
        continue;
      }
    }

    cleanSegments.push({ text, offset, duration });
  }

  const fullText = cleanSegments.map(s => s.text).join(' ');
  return { segments: cleanSegments, fullText };
}

/**
 * Fetch the transcript for a YouTube video by its ID.
 *
 * Returns an object with:
 *   - segments: Array of { text, offset, duration }
 *   - fullText: The entire transcript as a single string
 *
 * Throws a descriptive error if the transcript is unavailable.
 */
async function fetchTranscript(videoId) {
  let rawSegments;
  let usedLang = 'default';

  try {
    rawSegments = await YoutubeTranscript.fetchTranscript(videoId);
    usedLang = rawSegments[0]?.lang || 'unknown';
  } catch (err) {
    throw mapError(err);
  }

  const isEnglishOrHindi = usedLang && (usedLang.startsWith('en') || usedLang.startsWith('hi'));

  if (!isEnglishOrHindi) {
    try {
      rawSegments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
      usedLang = 'en';
    } catch (enErr) {
      try {
        rawSegments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'hi' });
        usedLang = 'hi';
      } catch (hiErr) {
        // If fallbacks fail, we stick to the default transcript retrieved initially
      }
    }
  }

  return processTranscript(rawSegments);
}

module.exports = { fetchTranscript };