async function fetchTranscript(videoId) {
  try {
    const response = await fetch(
      `https://youtube-transcript.ai/transcript/${videoId}.txt`
    );

    if (!response.ok) {
      const err = new Error(
        `Failed to fetch transcript (HTTP ${response.status})`
      );
      err.status = response.status;
      throw err;
    }

    const text = (await response.text()).trim();

    if (!text) {
      const err = new Error('Transcript is empty');
      err.status = 404;
      throw err;
    }

    const lines = text.split(/\r?\n/);

    const segments = [];
    const timestampRegex = /^\[(?:(\d+):)?(\d+):(\d+)\]\s*(.*)$/;

    for (let line of lines) {
      line = line.trim();

      const match = line.match(timestampRegex);

      if (!match) continue;

      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);

      const offset =
        hours * 3600 +
        minutes * 60 +
        seconds;

      const transcriptText = match[4]
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!transcriptText) continue;

      segments.push({
        text: transcriptText,
        offset,
        duration: 0
      });
    }

    if (segments.length === 0) {
      return {
        segments: [
          {
            text,
            offset: 0,
            duration: 0
          }
        ],
        fullText: text
      };
    }

    // Calculate durations
    for (let i = 0; i < segments.length - 1; i++) {
      segments[i].duration = Math.max(
        0,
        segments[i + 1].offset - segments[i].offset
      );
    }

    segments[segments.length - 1].duration = 5;

    // Remove duplicate captions
    const cleanedSegments = [];

    for (const segment of segments) {
      const current = segment.text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!current) continue;

      if (cleanedSegments.length === 0) {
        cleanedSegments.push(segment);
        continue;
      }

      const previous = cleanedSegments[
        cleanedSegments.length - 1
      ].text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Exact duplicate
      if (current === previous) {
        continue;
      }

      // Current contains previous
      if (
        current.length > previous.length &&
        current.includes(previous)
      ) {
        cleanedSegments[cleanedSegments.length - 1] = segment;
        continue;
      }

      // Previous contains current
      if (
        previous.length > current.length &&
        previous.includes(current)
      ) {
        continue;
      }

      cleanedSegments.push(segment);
    }

    const fullText = cleanedSegments
      .map(segment => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      segments: cleanedSegments,
      fullText
    };
  } catch (error) {
    const err = new Error(
      error.message || 'Failed to fetch transcript.'
    );

    err.status = error.status || 502;

    throw err;
  }
}

module.exports = { fetchTranscript };
