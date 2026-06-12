/**
 * TranscriptGrab — Frontend Application
 * Handles form submission, API communication, transcript rendering, and copy.
 */
(function () {
  'use strict';

  // ── DOM references ──────────────────────────────────────────────
  const form          = document.getElementById('transcript-form');
  const urlInput      = document.getElementById('url-input');
  const clearBtn      = document.getElementById('clear-btn');
  const submitBtn     = document.getElementById('submit-btn');
  const btnText       = document.getElementById('btn-text');
  const btnSpinner    = document.getElementById('btn-spinner');
  const errorDisplay  = document.getElementById('error-display');
  const errorText     = document.getElementById('error-text');
  const resultSection = document.getElementById('result-section');
  const videoThumb    = document.getElementById('video-thumb');
  const segmentCount  = document.getElementById('segment-count');
  const charCount     = document.getElementById('char-count');
  const toggleTs      = document.getElementById('toggle-timestamps');
  const copyBtn       = document.getElementById('copy-btn');
  const copyIcon      = document.getElementById('copy-icon');
  const checkIcon     = document.getElementById('check-icon');
  const copyText      = document.getElementById('copy-text');
  const copyTextBtn   = document.getElementById('copy-text-btn');
  const transcriptBox = document.getElementById('transcript-content');

  // ── State ───────────────────────────────────────────────────────
  let currentData = null;
  let showTimestamps = true;
  let isLoading = false;

  // ── Helpers ─────────────────────────────────────────────────────
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showError(message) {
    errorText.textContent = message;
    errorDisplay.classList.remove('hidden');
    resultSection.classList.add('hidden');
    errorDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorDisplay.classList.add('hidden');
  }

  function setLoading(loading) {
    isLoading = loading;
    submitBtn.disabled = loading;
    btnText.textContent = loading ? 'Fetching…' : 'Get Transcript';
    btnSpinner.classList.toggle('hidden', !loading);
    btnSpinner.setAttribute('aria-hidden', String(!loading));
    urlInput.readOnly = loading;
  }

  function showSkeleton() {
    resultSection.classList.remove('hidden');
    transcriptBox.innerHTML = '';
    transcriptBox.className = 'transcript-box';

    for (let i = 0; i < 8; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton--line';
      if (i === 7) line.style.width = '45%';
      else if (i === 6) line.style.width = '72%';
      transcriptBox.appendChild(line);
    }
  }

  // ── Rendering ───────────────────────────────────────────────────
  function renderTranscript() {
    if (!currentData) return;

    transcriptBox.innerHTML = '';

    if (showTimestamps) {
      transcriptBox.className = 'transcript-box';
      const fragment = document.createDocumentFragment();

      currentData.segments.forEach((seg) => {
        const row = document.createElement('div');
        row.className = 'segment';

        const time = document.createElement('span');
        time.className = 'segment__time';
        time.textContent = formatTime(seg.offset);

        const text = document.createElement('span');
        text.className = 'segment__text';
        text.textContent = seg.text;

        row.appendChild(time);
        row.appendChild(text);
        fragment.appendChild(row);
      });

      transcriptBox.appendChild(fragment);
    } else {
      transcriptBox.className = 'transcript-box transcript-box--continuous';
      transcriptBox.textContent = currentData.fullText;
    }
  }

  function displayResult(data) {
    currentData = data;

    // Thumbnail
    videoThumb.src = `https://i.ytimg.com/vi/${data.videoId}/mqdefault.jpg`;
    videoThumb.alt = `Thumbnail for YouTube video ${data.videoId}`;

    // Stats
    segmentCount.textContent = `${data.segmentCount} segments`;
    charCount.textContent = `${data.charCount.toLocaleString()} characters`;

    // Render transcript
    renderTranscript();

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── API call ────────────────────────────────────────────────────
  async function fetchTranscript(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Server responded with ${response.status}`);
      }

      return result.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Event handlers ──────────────────────────────────────────────

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const url = urlInput.value.trim();
    if (!url) {
      showError('Please paste a YouTube URL.');
      urlInput.focus();
      return;
    }

    hideError();
    setLoading(true);
    showSkeleton();

    try {
      const data = await fetchTranscript(url);
      displayResult(data);
    } catch (error) {
      resultSection.classList.add('hidden');
      showError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // Clear button
  urlInput.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', urlInput.value.length === 0);
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.classList.add('hidden');
    urlInput.focus();
    hideError();
  });

  // Toggle timestamps
  toggleTs.addEventListener('click', () => {
    showTimestamps = !showTimestamps;
    toggleTs.setAttribute('aria-pressed', String(showTimestamps));
    renderTranscript();
  });

  // ── Copy helper ────────────────────────────────────────────────
  async function copyToClipboard(text, btn, iconEl, checkEl, labelEl, defaultLabel) {
    try {
      await navigator.clipboard.writeText(text);

      iconEl.classList.add('hidden');
      checkEl.classList.remove('hidden');
      labelEl.textContent = 'Copied!';
      btn.classList.add('btn--copied');

      showToast('Transcript copied to clipboard');

      setTimeout(() => {
        iconEl.classList.remove('hidden');
        checkEl.classList.add('hidden');
        labelEl.textContent = defaultLabel;
        btn.classList.remove('btn--copied');
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('Transcript copied to clipboard');
      } catch {
        showToast('Failed to copy. Please select and copy manually.');
      }
      document.body.removeChild(textarea);
    }
  }

  // Copy with timestamps
  copyBtn.addEventListener('click', async () => {
    if (!currentData) return;
    const textToCopy = currentData.segments
      .map((s) => `[${formatTime(s.offset)}] ${s.text}`)
      .join('\n');
    await copyToClipboard(textToCopy, copyBtn, copyIcon, checkIcon, copyText, 'Copy with Timestamps');
  });

  // Copy text only (no timestamps)
  copyTextBtn.addEventListener('click', async () => {
    if (!currentData) return;
    const iconEl = copyTextBtn.querySelector('.copy-text-btn__icon');
    const checkEl = copyTextBtn.querySelector('.copy-text-btn__check');
    const labelEl = copyTextBtn.querySelector('.copy-text-btn__label');
    await copyToClipboard(currentData.fullText, copyTextBtn, iconEl, checkEl, labelEl, 'Copy Text Only');
  });

  // Keyboard: Ctrl/Cmd + Enter to submit
  urlInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      form.requestSubmit();
    }
  });

  // ── Toast ───────────────────────────────────────────────────────
  let toastTimeout;
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('toast--visible');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('toast--visible');
    }, 2500);
  }

  // ── Auto-paste detection (optional UX) ──────────────────────────
  urlInput.addEventListener('paste', () => {
    // Small delay to let the paste value populate
    setTimeout(() => {
      const val = urlInput.value.trim();
      if (val && (val.includes('youtube.com') || val.includes('youtu.be'))) {
        clearBtn.classList.remove('hidden');
      }
    }, 50);
  });

})();
