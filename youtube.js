async function fetchTranscript(videoId) {
  try {
    const response = await fetch(
      `https://youtube-transcript.ai/transcript/${videoId}.txt`
    );

    if (!response.ok) {
      const err = new Error('Failed to fetch transcript');
      err.status = response.status;
      throw err;
    }

    const text = await response.text();

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

      const offset = hours * 3600 + minutes * 60 + seconds;

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

    for (let i = 0; i < segments.length - 1; i++) {
      segments[i].duration =
        segments[i + 1].offset - segments[i].offset;
    }

    if (segments.length > 0) {
      segments[segments.length - 1].duration = 5;
    }

    const fullText = segments
      .map(segment => segment.text)
      .join(' ');

    return {
      segments,
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
