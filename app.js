// ==============================
// SNAPVID — APP.JS PART 3A
// Navigation + Modal + Download
// ==============================

// ---- PAGE NAVIGATION ----
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  const target = document.getElementById('page-' + pageName);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (pageName === 'history') loadHistory();

  // Close mobile menu
  document.getElementById('navLinks').classList.remove('open');
}

// ---- HAMBURGER MENU ----
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ---- MODAL FUNCTIONS ----
function openModal(type) {
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('authModal').classList.add('active');
  switchModalTab(type || 'login');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.getElementById('authModal').classList.remove('active');
  document.body.style.overflow = '';
}

function switchModalTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

function handleAuth(e, type) {
  e.preventDefault();
  closeModal();
  showToast(
    type === 'login'
      ? '✅ Logged in successfully! Welcome back!'
      : '✅ Account created! Welcome to SnapVid!'
  );
}

function googleLogin() {
  closeModal();
  showToast('🔵 Google login coming soon!');
}

// ---- DARK MODE ----
function toggleDarkMode() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  showToast(isLight ? '☀️ Light mode enabled' : '🌙 Dark mode enabled');
}

// ---- TOAST NOTIFICATION ----
function showToast(message, duration) {
  duration = duration || 3000;
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.style.display = 'none';
  }, duration);
}

// ---- VALIDATE URL ----
function isValidUrl(url) {
  try {
    var u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// ---- DETECT PLATFORM ----
function detectPlatform(url) {
  url = url.toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('vimeo.com')) return 'Vimeo';
  if (url.includes('dailymotion.com')) return 'Dailymotion';
  if (url.includes('twitch.tv')) return 'Twitch';
  if (url.includes('reddit.com')) return 'Reddit';
  if (url.includes('pinterest.com')) return 'Pinterest';
  return 'Video';
}

// ---- MAIN DOWNLOAD FUNCTION ----
async function startDownload() {
  const urlInput = document.getElementById('videoUrl');
  const url = urlInput.value.trim();

  if (!url) {
    showToast('⚠️ Please paste a video URL first!');
    urlInput.focus();
    return;
  }

  if (!isValidUrl(url)) {
    showToast('⚠️ Please enter a valid URL starting with https://');
    return;
  }

  const platform = detectPlatform(url);

  // Show loader, hide result
  document.getElementById('loader').style.display = 'block';
  document.getElementById('resultSection').style.display = 'none';

  // Reset progress bar animation
  const progress = document.getElementById('loaderProgress');
  progress.style.width = '0%';
  void progress.offsetWidth; // force reflow
  progress.style.animation = 'none';
  void progress.offsetWidth;
  progress.style.animation = 'progress 2.5s ease-in-out forwards';

  try {
    const data = await fetchVideoInfo(url, platform);
    document.getElementById('loader').style.display = 'none';
    displayResults(data, url, platform);
    saveToHistory(url, platform);
  } catch (error) {
    document.getElementById('loader').style.display = 'none';
    showToast('❌ Could not fetch video. Try another URL!');
    console.error('Download error:', error);
    // Show fallback anyway
    const fallback = generateFallback(url, platform);
    displayResults(fallback, url, platform);
  }
}

// ---- DISPLAY RESULTS ----
function displayResults(data, url, platform) {
  const section = document.getElementById('resultSection');
  section.style.display = 'block';

  document.getElementById('videoTitle').textContent =
    data.title || (platform + ' Video — Ready to Download');

  document.getElementById('videoDuration').innerHTML =
    '<i class="fas fa-clock"></i> Duration: ' + (data.duration || 'N/A');

  document.getElementById('videoPlatform').innerHTML =
    '<i class="fas fa-globe"></i> Platform: ' + platform;

  const thumb = document.getElementById('videoThumb');
  if (data.thumbnail) {
    thumb.src = data.thumbnail;
    thumb.style.display = 'block';
  } else {
    thumb.style.display = 'none';
  }

  const grid = document.getElementById('qualityGrid');
  grid.innerHTML = '';

  const formats = data.formats || generateFallback(url, platform).formats;

  formats.forEach(function(format) {
    const btn = document.createElement('a');
    btn.className = 'quality-btn' + (format.isMP3 ? ' mp3' : '');
    btn.href = format.url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.innerHTML =
      '<i class="fas fa-' + (format.isMP3 ? 'music' : 'video') + '"></i> ' +
      format.label;
    grid.appendChild(btn);
  });

  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('✅ Video found! Choose your quality below.');
}
// ==============================
// SNAPVID — APP.JS PART 3B
// History + Settings + Init
// ==============================

// ---- SAVE TO HISTORY ----
function saveToHistory(url, platform) {
  const toggle = document.getElementById('historyToggle');
  if (toggle && !toggle.checked) return;

  var history = JSON.parse(
    localStorage.getItem('snapvid_history') || '[]'
  );

  // Avoid duplicate
  history = history.filter(function(h) { return h.url !== url; });

  history.unshift({
    id: Date.now(),
    url: url,
    platform: platform,
    date: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  });

  // Keep only last 50 items
  if (history.length > 50) history = history.slice(0, 50);

  localStorage.setItem('snapvid_history', JSON.stringify(history));
}

// ---- LOAD HISTORY PAGE ----
function loadHistory() {
  const list = document.getElementById('historyList');
  const history = JSON.parse(
    localStorage.getItem('snapvid_history') || '[]'
  );

  if (history.length === 0) {
    list.innerHTML = [
      '<div class="empty-state">',
      '  <div class="empty-icon">📭</div>',
      '  <h3>No Downloads Yet</h3>',
      '  <p>Your download history will appear here</p>',
      '</div>'
    ].join('');
    return;
  }

  list.innerHTML = history.map(function(item) {
    return [
      '<div class="history-item" id="hitem-' + item.id + '">',
      '  <div style="min-width:0;flex:1;">',
      '    <div class="history-url" title="' + item.url + '">' + item.url + '</div>',
      '    <div class="history-date">',
      '      📌 ' + item.platform + ' &nbsp;|&nbsp; 🕐 ' + item.date,
      '    </div>',
      '  </div>',
      '  <div class="history-actions">',
      '    <button class="re-download-btn"',
      '      onclick="reDownload(\'' + encodeURIComponent(item.url) + '\')">',
      '      ⬇ Again',
      '    </button>',
      '    <button class="delete-btn"',
      '      onclick="deleteHistoryItem(' + item.id + ')">',
      '      🗑',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('');
  }).join('');
}

// ---- RE-DOWNLOAD FROM HISTORY ----
function reDownload(encodedUrl) {
  var url = decodeURIComponent(encodedUrl);
  showPage('home');
  setTimeout(function() {
    document.getElementById('videoUrl').value = url;
    startDownload();
  }, 400);
}

// ---- DELETE SINGLE HISTORY ITEM ----
function deleteHistoryItem(id) {
  var history = JSON.parse(
    localStorage.getItem('snapvid_history') || '[]'
  );
  history = history.filter(function(h) { return h.id !== id; });
  localStorage.setItem('snapvid_history', JSON.stringify(history));

  var el = document.getElementById('hitem-' + id);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.3s';
    setTimeout(function() {
      el.remove();
      if (history.length === 0) loadHistory();
    }, 300);
  }
  showToast('🗑 Removed from history');
}

// ---- CLEAR ALL HISTORY ----
function clearHistory() {
  if (confirm('Clear all download history? This cannot be undone.')) {
    localStorage.removeItem('snapvid_history');
    loadHistory();
    showToast('✅ History cleared!');
  }
}

// ---- FORMAT DURATION ----
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'N/A';
  seconds = parseInt(seconds);
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  if (h > 0) {
    return h + ':' + pad(m) + ':' + pad(s);
  }
  return m + ':' + pad(s);
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

// ---- EXTRACT YOUTUBE ID ----
function extractYouTubeId(url) {
  var patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\/\s]{11})/,
    /youtube\.com\/shorts\/([^&?\/\s]{11})/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = url.match(patterns[i]);
    if (match) return match[1];
  }
  return '';
}

// ---- INIT ON PAGE LOAD ----
document.addEventListener('DOMContentLoaded', function() {

  // Enter key support
  var input = document.getElementById('videoUrl');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') startDownload();
    });
  }

  // Navbar scroll shadow
  window.addEventListener('scroll', function() {
    var nav = document.getElementById('navbar');
    if (nav) {
      nav.style.boxShadow =
        window.scrollY > 50
          ? '0 4px 30px rgba(0,0,0,0.5)'
          : 'none';
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // Paste from clipboard support
  if (navigator.clipboard) {
    document.getElementById('videoUrl')
      .addEventListener('focus', function() {
        navigator.clipboard.readText()
          .then(function(text) {
            if (
              text &&
              text.startsWith('http') &&
              !document.getElementById('videoUrl').value
            ) {
              document.getElementById('videoUrl').value = text;
              showToast('📋 URL pasted from clipboard!');
            }
          })
          .catch(function() {});
      });
  }

  console.log('✅ SnapVid loaded successfully!');
}); 