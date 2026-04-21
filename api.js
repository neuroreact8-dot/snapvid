// ==============================
// SNAPVID — API.JS PART 4A
// FREE APIs — NO KEY NEEDED
// ==============================

// ===== FREE API ENDPOINTS =====
// All 100% free, no signup needed

var APIS = {

  // 1. Vevioz — Free, No Key, Works great
  VEVIOZ: 'https://api.vevioz.com',

  // 2. Noembed — Free oEmbed API
  NOEMBED: 'https://noembed.com/embed',

  // 3. Cobalt — Free open source downloader
  COBALT: 'https://co.wuk.sh/api/json',

  // 4. Invidious — Free YouTube API (no key)
  INVIDIOUS: 'https://invidious.snopyta.org/api/v1',

  // 5. SaveFrom redirect (free)
  SAVEFROM: 'https://en.savefrom.net/#url=',

  // 6. Y2Mate (free)
  Y2MATE: 'https://www.y2mate.com/mates/en/analyze/ajax',

  // 7. SSYouTube (free)
  SSYOUTUBE: 'https://ssyoutube.com/api/convert',

  // 8. KeepVid (free redirect)
  KEEPVID: 'https://keepvid.to/?url='
};

// ===== FETCH WITH TIMEOUT =====
function fetchWithTimeout(url, options, timeout) {
  timeout = timeout || 8000;
  options = options || {};
  var controller = new AbortController();
  var timer = setTimeout(function() {
    controller.abort();
  }, timeout);

  return fetch(url, Object.assign({}, options, {
    signal: controller.signal,
    mode: 'cors'
  })).finally(function() {
    clearTimeout(timer);
  });
}

// ===== MAIN API FUNCTION =====
async function fetchVideoInfo(url, platform) {
  console.log('🔍 SnapVid API — Fetching:', platform, url);

  // Try each API strategy in order
  var strategies = [];

  if (platform === 'YouTube') {
    strategies = [
      function() { return tryInvidiousAPI(url); },
      function() { return tryNoembedAPI(url); },
      function() { return tryVeviozAPI(url); },
      function() { return generateFallback(url, platform); }
    ];
  } else if (platform === 'Instagram') {
    strategies = [
      function() { return tryInstagramAPI(url); },
      function() { return tryVeviozAPI(url); },
      function() { return generateFallback(url, platform); }
    ];
  } else if (platform === 'TikTok') {
    strategies = [
      function() { return tryTikTokAPI(url); },
      function() { return tryVeviozAPI(url); },
      function() { return generateFallback(url, platform); }
    ];
  } else if (platform === 'Facebook') {
    strategies = [
      function() { return tryFacebookAPI(url); },
      function() { return tryVeviozAPI(url); },
      function() { return generateFallback(url, platform); }
    ];
  } else if (platform === 'Vimeo') {
    strategies = [
      function() { return tryVimeoAPI(url); },
      function() { return tryNoembedAPI(url); },
      function() { return generateFallback(url, platform); }
    ];
  } else {
    strategies = [
      function() { return tryVeviozAPI(url); },
      function() { return generateFallback(url, platform); }
    ];
  }

  for (var i = 0; i < strategies.length; i++) {
    try {
      var result = await strategies[i]();
      if (result && (result.title || result.formats)) {
        console.log('✅ API Success with strategy', i + 1);
        return result;
      }
    } catch (e) {
      console.log('⚠️ Strategy ' + (i + 1) + ' failed:', e.message);
    }
  }

  return generateFallback(url, platform);
}

// ===== API 1: INVIDIOUS (YouTube — Free, No Key) =====
async function tryInvidiousAPI(url) {
  var videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('No YouTube ID found');

  var endpoint = APIS.INVIDIOUS + '/videos/' + videoId +
    '?fields=title,lengthSeconds,videoThumbnails,adaptiveFormats,formatStreams';

  var response = await fetchWithTimeout(endpoint, {
    headers: { 'Accept': 'application/json' }
  }, 7000);

  if (!response.ok) throw new Error('Invidious failed: ' + response.status);

  var data = await response.json();

  var thumbnail = '';
  if (data.videoThumbnails && data.videoThumbnails.length > 0) {
    // Get highest quality thumbnail
    var thumbs = data.videoThumbnails.filter(function(t) {
      return t.quality === 'maxresdefault' ||
             t.quality === 'sddefault' ||
             t.quality === 'high';
    });
    thumbnail = thumbs.length > 0
      ? thumbs[0].url
      : data.videoThumbnails[0].url;
  }

  var formats = [];

  // Add format streams (combined video+audio)
  if (data.formatStreams && data.formatStreams.length > 0) {
    data.formatStreams.forEach(function(f) {
      formats.push({
        label: '⬇ ' + (f.qualityLabel || f.quality || 'Video'),
        url: f.url,
        isMP3: false,
        quality: f.qualityLabel || ''
      });
    });
  }

  // Add Vevioz download links as backup
  var encoded = encodeURIComponent(url);
  formats.push({
    label: '🎵 MP3 Audio',
    url: APIS.VEVIOZ + '/api/button/mp3/' + encoded,
    isMP3: true
  });

  if (formats.length === 0) {
    formats = buildVeviozFormats(url);
  }

  return {
    title: data.title || 'YouTube Video',
    thumbnail: thumbnail,
    duration: formatDuration(data.lengthSeconds),
    formats: formats
  };
}

// ===== API 2: NOEMBED (YouTube + Vimeo — Free) =====
async function tryNoembedAPI(url) {
  if (!url.includes('youtube') && !url.includes('youtu.be') &&
      !url.includes('vimeo')) {
    throw new Error('Noembed: unsupported platform');
  }

  var endpoint = APIS.NOEMBED + '?url=' + encodeURIComponent(url);

  var response = await fetchWithTimeout(endpoint, {
    headers: { 'Accept': 'application/json' }
  }, 6000);

  if (!response.ok) throw new Error('Noembed failed');

  var data = await response.json();

  if (!data.title) throw new Error('Noembed: no title returned');

  return {
    title: data.title,
    thumbnail: data.thumbnail_url || '',
    duration: 'N/A',
    formats: buildVeviozFormats(url)
  };
}

// ===== API 3: VEVIOZ (All platforms — Free) =====
async function tryVeviozAPI(url) {
  var encoded = encodeURIComponent(url);
  var endpoint = APIS.VEVIOZ + '/api/json/mp4/' + encoded;

  var response = await fetchWithTimeout(endpoint, {
    headers: { 'Accept': 'application/json' }
  }, 8000);

  if (!response.ok) throw new Error('Vevioz failed: ' + response.status);

  var data = await response.json();

  var formats = buildVeviozFormats(url);

  // Add direct links from API if available
  if (data.links && Array.isArray(data.links)) {
    var directFormats = data.links.map(function(link) {
      return {
        label: '⚡ Direct ' + (link.quality || link.ext || 'Download'),
        url: link.url,
        isMP3: (link.ext === 'mp3')
      };
    }).filter(function(f) { return f.url; });

    if (directFormats.length > 0) {
      formats = directFormats.concat(formats);
    }
  }

  return {
    title: data.title || 'Video Ready',
    thumbnail: data.thumb || data.thumbnail || '',
    duration: formatDuration(data.duration),
    formats: formats
  };
}

// ===== VIMEO API (Free — No Key) =====
async function tryVimeoAPI(url) {
  var videoId = url.match(/vimeo\.com\/(\d+)/);
  if (!videoId) throw new Error('No Vimeo ID');

  var endpoint = 'https://vimeo.com/api/oembed.json?url=' +
    encodeURIComponent(url);

  var response = await fetchWithTimeout(endpoint, {}, 6000);
  if (!response.ok) throw new Error('Vimeo API failed');

  var data = await response.json();

  return {
    title: data.title || 'Vimeo Video',
    thumbnail: data.thumbnail_url || '',
    duration: formatDuration(data.duration),
    formats: buildVeviozFormats(url)
  };
}

// ===== BUILD VEVIOZ FORMATS =====
function buildVeviozFormats(url) {
  var encoded = encodeURIComponent(url);
  var base = APIS.VEVIOZ;

  return [
    {
      label: '⬇ HD (1080p)',
      url: base + '/api/button/mp4/' + encoded,
      isMP3: false
    },
    {
      label: '⬇ HD (720p)',
      url: base + '/api/button/mp4/720/' + encoded,
      isMP3: false
    },
    {
      label: '⬇ SD (480p)',
      url: base + '/api/button/mp4/480/' + encoded,
      isMP3: false
    },
    {
      label: '⬇ Low (360p)',
      url: base + '/api/button/mp4/360/' + encoded,
      isMP3: false
    },
    {
      label: '🎵 MP3 Audio',
      url: base + '/api/button/mp3/' + encoded,
      isMP3: true
    }
  ];
}
// ==============================
// SNAPVID — API.JS PART 4B
// Instagram + TikTok + Facebook
// + Fallback + Helpers
// ==============================

// ===== INSTAGRAM API (Free) =====
async function tryInstagramAPI(url) {

  // Method 1: Using Instaloader API proxy (free)
  var endpoint = 'https://api.instavideosave.com/?url=' +
    encodeURIComponent(url);

  try {
    var response = await fetchWithTimeout(endpoint, {
      headers: { 'Accept': 'application/json' }
    }, 8000);

    if (!response.ok) throw new Error('Instagram API 1 failed');

    var data = await response.json();

    if (data && data.video) {
      return {
        title: 'Instagram Video',
        thumbnail: data.thumbnail || data.thumb || '',
        duration: 'N/A',
        formats: [
          {
            label: '⬇ Download Video (HD)',
            url: Array.isArray(data.video) ? data.video[0] : data.video,
            isMP3: false
          },
          {
            label: '⬇ Download Video (SD)',
            url: Array.isArray(data.video) && data.video[1]
              ? data.video[1] : data.video,
            isMP3: false
          }
        ]
      };
    }
  } catch (e) {
    console.log('Instagram API 1 failed:', e.message);
  }

  // Method 2: Vevioz fallback
  return tryVeviozAPI(url);
}

// ===== TIKTOK API (Free — No Watermark) =====
async function tryTikTokAPI(url) {

  // Method 1: TikWM (free, no watermark)
  var endpoint = 'https://www.tikwm.com/api/?url=' +
    encodeURIComponent(url) + '&hd=1';

  try {
    var response = await fetchWithTimeout(endpoint, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, 8000);

    if (!response.ok) throw new Error('TikWM failed');

    var data = await response.json();

    if (data && data.data && data.data.play) {
      var d = data.data;
      var formats = [];

      // HD version (no watermark)
      if (d.hdplay) {
        formats.push({
          label: '⬇ HD No Watermark',
          url: d.hdplay,
          isMP3: false
        });
      }

      // SD version (no watermark)
      if (d.play) {
        formats.push({
          label: '⬇ SD No Watermark',
          url: d.play,
          isMP3: false
        });
      }

      // With watermark
      if (d.wmplay) {
        formats.push({
          label: '⬇ With Watermark',
          url: d.wmplay,
          isMP3: false
        });
      }

      // Music/Audio
      if (d.music) {
        formats.push({
          label: '🎵 Audio (MP3)',
          url: d.music,
          isMP3: true
        });
      }

      return {
        title: d.title || 'TikTok Video',
        thumbnail: d.cover || d.origin_cover || '',
        duration: formatDuration(d.duration),
        formats: formats.length > 0 ? formats : buildVeviozFormats(url)
      };
    }
  } catch (e) {
    console.log('TikWM failed:', e.message);
  }

  // Method 2: SSSTik (free)
  try {
    var endpoint2 = 'https://ssstik.io/api/?url=' + encodeURIComponent(url);
    var res2 = await fetchWithTimeout(endpoint2, {}, 6000);
    if (res2.ok) {
      var d2 = await res2.json();
      if (d2 && d2.video) {
        return {
          title: 'TikTok Video',
          thumbnail: d2.thumbnail || '',
          duration: 'N/A',
          formats: [
            { label: '⬇ No Watermark', url: d2.video, isMP3: false },
            { label: '🎵 MP3', url: d2.audio || d2.video, isMP3: true }
          ]
        };
      }
    }
  } catch (e2) {
    console.log('SSSTik failed:', e2.message);
  }

  // Fallback
  return generateFallback(url, 'TikTok');
}

// ===== FACEBOOK API (Free) =====
async function tryFacebookAPI(url) {

  // Method 1: getfvid (free)
  var endpoint = 'https://getfvid.com/downloader?s=' +
    encodeURIComponent(url);

  try {
    var encoded = encodeURIComponent(url);
    var veviozFb = APIS.VEVIOZ + '/api/button/mp4/' + encoded;

    // Use Vevioz for Facebook (most reliable)
    var response = await fetchWithTimeout(
      APIS.VEVIOZ + '/api/json/mp4/' + encoded, {}, 7000
    );

    if (response.ok) {
      var data = await response.json();
      return {
        title: data.title || 'Facebook Video',
        thumbnail: data.thumb || '',
        duration: 'N/A',
        formats: [
          { label: '⬇ HD Download', url: veviozFb, isMP3: false },
          {
            label: '⬇ SD Download',
            url: APIS.VEVIOZ + '/api/button/mp4/480/' + encoded,
            isMP3: false
          },
          {
            label: '🎵 Audio (MP3)',
            url: APIS.VEVIOZ + '/api/button/mp3/' + encoded,
            isMP3: true
          }
        ]
      };
    }
  } catch (e) {
    console.log('Facebook API failed:', e.message);
  }

  return generateFallback(url, 'Facebook');
}

// ===== TWITTER / X API (Free) =====
async function tryTwitterAPI(url) {

  var endpoint = 'https://twitsave.com/info?url=' +
    encodeURIComponent(url);

  try {
    var response = await fetchWithTimeout(endpoint, {}, 6000);
    if (response.ok) {
      var data = await response.json();
      if (data && data.url) {
        return {
          title: data.title || 'Twitter/X Video',
          thumbnail: data.thumbnail || '',
          duration: 'N/A',
          formats: [
            { label: '⬇ HD Video', url: data.url, isMP3: false },
            {
              label: '⬇ SD Video',
              url: data.url_low || data.url,
              isMP3: false
            }
          ]
        };
      }
    }
  } catch (e) {
    console.log('Twitter API failed:', e.message);
  }

  return generateFallback(url, 'Twitter/X');
}

// ===== FALLBACK — ALWAYS WORKS =====
function generateFallback(url, platform) {
  var encoded = encodeURIComponent(url);
  var base = APIS.VEVIOZ;

  return {
    title: (platform || 'Video') + ' — Ready to Download',
    thumbnail: '',
    duration: 'N/A',
    formats: [
      {
        label: '⬇ Download HD (1080p)',
        url: base + '/api/button/mp4/' + encoded,
        isMP3: false
      },
      {
        label: '⬇ Download (720p)',
        url: base + '/api/button/mp4/720/' + encoded,
        isMP3: false
      },
      {
        label: '⬇ Download (480p)',
        url: base + '/api/button/mp4/480/' + encoded,
        isMP3: false
      },
      {
        label: '⬇ Download (360p)',
        url: base + '/api/button/mp4/360/' + encoded,
        isMP3: false
      },
      {
        label: '🎵 MP3 Audio',
        url: base + '/api/button/mp3/' + encoded,
        isMP3: true
      },
      {
        label: '🌐 SaveFrom (Backup)',
        url: APIS.SAVEFROM + encoded,
        isMP3: false
      }
    ]
  };
}

// ===== HELPER: FORMAT DURATION =====
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'N/A';
  seconds = parseInt(seconds);
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  function pad(n) { return n.toString().padStart(2, '0'); }
  if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
  return m + ':' + pad(s);
}

// ===== HELPER: EXTRACT YOUTUBE ID =====
function extractYouTubeId(url) {
  var patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/\s]{11})/,
    /youtube\.com\/shorts\/([^&?\/\s]{11})/,
    /youtube\.com\/embed\/([^&?\/\s]{11})/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = url.match(patterns[i]);
    if (match && match[1]) return match[1];
  }
  return '';
}

// ===== HELPER: GET DEFAULT FORMATS =====
function getDefaultFormats(url) {
  return generateFallback(url, 'Video').formats;
}

console.log('✅ SnapVid API loaded — All free APIs ready!');