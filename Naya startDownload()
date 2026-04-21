// ==============================
// UPDATED startDownload FUNCTION
// app.js mein replace karo
// ==============================

async function startDownload() {
  const urlInput = document.getElementById('videoUrl');
  const url = urlInput.value.trim();

  if (!url) {
    showToast('⚠️ Please paste a video URL!');
    urlInput.focus();
    return;
  }

  if (!isValidUrl(url)) {
    showToast('⚠️ Enter valid URL (https://...)');
    return;
  }

  const platform = detectPlatform(url);

  // Show loader
  document.getElementById('loader').style.display = 'block';
  document.getElementById('resultSection').style.display = 'none';

  // Reset progress bar
  const progress = document.getElementById('loaderProgress');
  progress.style.width = '0%';
  void progress.offsetWidth;
  progress.style.animation = 'none';
  void progress.offsetWidth;
  progress.style.animation = 'progress 2.5s ease-in-out forwards';

  try {
    // ✅ CALL OUR BACKEND API
    const apiUrl = `/api/download?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    const data = await response.json();

    document.getElementById('loader').style.display = 'none';

    if (data.success && data.formats && data.formats.length > 0) {
      displayResults(data, url, data.platform || platform);
      saveToHistory(url, data.platform || platform);
    } else {
      throw new Error('No formats found');
    }

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('loader').style.display = 'none';
    showToast('⚠️ Trying backup method...');

    // Show fallback buttons
    const fallback = {
      title: platform + ' Video',
      thumbnail: '',
      duration: 'N/A',
      formats: getFallbackFormats(url)
    };
    displayResults(fallback, url, platform);
  }
}

// ==============================
// FALLBACK FORMATS (Frontend)
// ==============================
function getFallbackFormats(url) {
  const encoded = encodeURIComponent(url);
  return [
    {
      label: '⬇ Download HD',
      url: `https://api.vevioz.com/api/button/mp4/${encoded}`,
      isMP3: false
    },
    {
      label: '⬇ Download 720p',
      url: `https://api.vevioz.com/api/button/mp4/720/${encoded}`,
      isMP3: false
    },
    {
      label: '⬇ Download 480p',
      url: `https://api.vevioz.com/api/button/mp4/480/${encoded}`,
      isMP3: false
    },
    {
      label: '🎵 MP3 Audio',
      url: `https://api.vevioz.com/api/button/mp3/${encoded}`,
      isMP3: true
    }
  ];
}
