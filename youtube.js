const { YoutubeTranscript } = require('youtube-transcript');

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
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    if (!segments || segments.length === 0) {
      const err = new Error('No transcript available for this video.');
      err.status = 404;
      throw err;
    }

    const formattedSegments = segments.map((seg) => ({
      text: seg.text
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      offset: Math.round(seg.offset / 1000),
      duration: Math.round(seg.duration / 1000),
    })).filter((seg) => seg.text.length > 0);

    const fullText = formattedSegments.map((s) => s.text).join(' ');

    return { segments: formattedSegments, fullText };
  } catch (error) {
    if (error.status) throw error;

    const message = error.message || '';

    if (
      message.includes('disabled') ||
      message.includes('Transcript is disabled')
    ) {
      const err = new Error(
        'Transcripts are disabled for this video by the uploader.'
      );
      err.status = 403;
      throw err;
    }

    if (
      message.includes('not find') ||
      message.includes('Could not get')
    ) {
      const err = new Error(
        'No transcript found. The video may not have captions available.'
      );
      err.status = 404;
      throw err;
    }

    if (message.includes('Too Many')) {
      const err = new Error(
        'YouTube is rate-limiting requests. Please try again in a minute.'
      );
      err.status = 429;
      throw err;
    }

    const err = new Error(
      'Failed to fetch transcript. Please verify the URL and try again.'
    );
    err.status = 502;
    throw err;
  }
}

module.exports = { fetchTranscript };
