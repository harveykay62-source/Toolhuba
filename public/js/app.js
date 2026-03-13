/* ── ToolHub AI — app.js ──────────────────────────────────────────────────── */
'use strict';

let APP = { session:{}, settings:{}, tools:[], categories:{} };

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const data = await apiFetch('/api/init');
    APP = { ...data, tools: (data.tools||[]).filter(t => t.enabled !== false) };
    applyTheme(localStorage.getItem('theme') || 'light');
    setupHeader();
    setupSearch();
    setupAds();
    handleRoute();
    setupKeyboardShortcuts();
  } catch(e) {
    document.getElementById('app').innerHTML = `<div class="page-loading"><p style="color:var(--text-muted)">Failed to load. Please refresh.</p></div>`;
  }
}

// ── Routing ───────────────────────────────────────────────────────────────────
function handleRoute() {
  const path = window.location.pathname;
  if (path.startsWith('/tool/')) {
    const id = path.replace('/tool/','');
    const tool = APP.tools.find(t => t.id === id);
    if (tool) { renderToolPage(tool); return; }
    navigate('home'); return;
  }
  if (path.startsWith('/category/')) {
    const cat = path.replace('/category/','');
    renderHome(cat); return;
  }
  if (path === '/dashboard') { renderDashboard(); return; }
  if (path === '/admin') { window.location.href = '/admin'; return; }
  if (path.startsWith('/live')) {
    const code = path.replace('/live/','').replace('/live','');
    if (code && code.length === 6) { renderJoinScreen(code); }
    else { renderMultiplayerHub(); }
    return;
  }
  if (path === '/teacher-quizzes') { renderTeacherQuizzes(); return; }
  if (path.startsWith('/quiz/')) { const id = path.replace('/quiz/',''); renderQuizPlay(id); return; }
  if (path.startsWith('/quizzes') || path === '/quiz') { renderQuizHub(); return; }
  renderHome();
}

function navigate(page, id='') {
  // Clean up any running timers/intervals before navigating
  if (window._pomInterval) { clearInterval(window._pomInterval); window._pomInterval = null; }
  if (window._typingInterval) { clearInterval(window._typingInterval); window._typingInterval = null; }
  if (page === 'home')        { history.pushState({},'','/');             renderHome(); }
  else if (page === 'tool')   { history.pushState({},'',`/tool/${id}`);  const t=APP.tools.find(t=>t.id===id); if(t) renderToolPage(t); else { toast('Tool not found or disabled.','warn'); navigate('home'); return; } }
  else if (page === 'dashboard') { history.pushState({},'','/dashboard'); renderDashboard(); }
  else if (page === 'admin')  { window.location.href = '/admin'; return; }
  else if (page === 'live')   { history.pushState({},'','/live');         renderMultiplayerHub(); }
  else if (page === 'quizzes'){ history.pushState({},'','/quizzes');      destroyQuizThree(); renderQuizHub(); }
  else if (page === 'category') { history.pushState({},'',`/category/${id}`); renderHome(id); }
  window.scrollTo({top:0,behavior:'smooth'});
  document.getElementById('navTools')?.classList.toggle('active', page==='home'||page==='tool'||page==='category');
  document.getElementById('navQuizzes')?.classList.toggle('active', page==='quizzes');
  document.getElementById('navLive')?.classList.toggle('active', page==='live');
}

window.addEventListener('popstate', handleRoute);

// ── Header ────────────────────────────────────────────────────────────────────
function setupHeader() {
  const ua = document.getElementById('userArea');
  const isPremium = APP.session.role === 'premium' || APP.session.role === 'admin' || APP.session.role === 'educator';
  const isEducator = APP.session.isVerifiedEducator || APP.session.role === 'educator';

  const banner = document.getElementById('premiumBanner');
  if (!isPremium && !isEducator && !localStorage.getItem('premiumBannerClosed')) {
    banner.classList.remove('hidden');
  }

  // Educators get ad-free experience
  if (isEducator) {
    document.querySelectorAll('.ad-bar, [id*="adBar"]').forEach(el => el.style.display = 'none');
  }

  if (APP.session.loggedIn) {
    const initials = APP.session.name ? APP.session.name.slice(0,2).toUpperCase() : '?';
    ua.innerHTML = `
      <div class="user-area">
        ${APP.session.role==='admin' ? `<a class="btn-admin-pill" href="/admin">🛡️ Admin</a>` : ''}
        ${isEducator ? `<span class="tag" style="font-size:11px;background:#059669;color:#fff;padding:3px 8px;border-radius:6px">🎓 Educator</span>` : ''}
        <button class="btn-ghost btn-sm" onclick="navigate('dashboard')">Dashboard</button>
        ${isPremium && !isEducator ? `<span class="tag tag-success" style="font-size:11px">👑 Premium</span>` : !isPremium ? `<button class="btn-signup btn-sm" onclick="showPremiumModal()">Upgrade</button>` : ''}
        <button class="avatar-btn" style="background:${APP.session.avatarColor||'#6366f1'}" onclick="confirmLogout()">${initials}</button>
      </div>`;
  } else {
    ua.innerHTML = `
      <div class="user-area">
        <button class="btn-login" onclick="showLogin()">Sign in</button>
        <button class="btn-signup" onclick="showSignup()">Sign up free</button>
      </div>`;
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme')==='light' ? 'dark' : 'light';
    applyTheme(next);
  });

  document.getElementById('headerSearch').addEventListener('click', openSearch);
}

function closePremiumBanner() {
  document.getElementById('premiumBanner').classList.add('hidden');
  localStorage.setItem('premiumBannerClosed','1');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// ── Ads ───────────────────────────────────────────────────────────────────────
function setupAds() {
  const isPremium = APP.session.role === 'premium' || APP.session.role === 'admin' || APP.session.role === 'educator';
  const isEducator = APP.session.isVerifiedEducator;
  if (isPremium || isEducator || !APP.settings.adsEnabled) return;

  const client = APP.settings.adsenseClient || 'ca-pub-6454181337553477';
  const slot   = APP.settings.adsenseBanner  || '';

  const topBar = document.getElementById('adBarTop');
  if (topBar) {
    topBar.classList.remove('hidden');
    document.getElementById('adTop').innerHTML = `
      <ins class="adsbygoogle" style="display:block;width:100%;min-height:90px"
        data-ad-client="${client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  }

  const bottomBar = document.getElementById('adBarBottom');
  if (bottomBar) {
    bottomBar.classList.remove('hidden');
    document.getElementById('adBottom').innerHTML = `
      <ins class="adsbygoogle" style="display:block;width:100%;min-height:90px"
        data-ad-client="${client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  }
}

function getToolPageAd() {
  const isPremium = APP.session.role === 'premium' || APP.session.role === 'admin' || APP.session.role === 'educator';
  if (isPremium || APP.session.isVerifiedEducator || !APP.settings.adsEnabled) return '';
  const client = APP.settings.adsenseClient || 'ca-pub-6454181337553477';
  const slot   = APP.settings.adsenseBanner  || '';
  setTimeout(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  }, 100);
  return `
    <div class="tool-ad">
      <div class="ad-label">Advertisement</div>
      <ins class="adsbygoogle" style="display:block;width:100%;min-height:90px"
        data-ad-client="${client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>`;
}

// ── Search ────────────────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderSearchResults(input.value.trim(), results), 120);
  });
  renderSearchResults('', results);
}

function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchInput').focus(), 50);
}
function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchInput').value = '';
  renderSearchResults('', document.getElementById('searchResults'));
}

function renderSearchResults(q, container) {
  const filtered = q
    ? APP.tools.filter(t =>
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.description.toLowerCase().includes(q.toLowerCase()) ||
        (t.tags||[]).some(tag => tag.toLowerCase().includes(q.toLowerCase())))
    : APP.tools;
  if (!filtered.length) {
    container.innerHTML = `<div class="search-empty">No tools found for "${q}"</div>`;
    return;
  }
  container.innerHTML = filtered.slice(0,20).map(t => `
    <div class="search-result-item" onclick="closeSearch();navigate('tool','${t.id}')">
      <div class="search-result-icon">${t.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="search-result-name">${t.name}</div>
        <div class="search-result-desc">${t.description.slice(0,60)}…</div>
      </div>
      <span class="tool-cat-tag cat-${t.category} search-result-cat">${APP.categories[t.category]?.name||t.category}</span>
    </div>`).join('');
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); openSearch(); }
    if (e.key==='Escape') { closeSearch(); closeModal('authModal'); closeModal('premiumModal'); closeModal('limitModal'); }
  });
}

// ── Home ──────────────────────────────────────────────────────────────────────
let activeCategory = 'all';

function renderHome(initialCat) {
  if (initialCat) activeCategory = initialCat;
  const toolCount = APP.tools.length;
  document.title = `ToolHub AI — ${toolCount} Free Online Tools`;
  const app = document.getElementById('app');

  const catDescriptions = {
    text: { icon: '📝', name: 'Text Tools', tagline: 'Humanizer, Detector, Grammar, Paraphraser & more', bg: 'cat-text-bg' },
    media: { icon: '🎬', name: 'Media Tools', tagline: 'Image converter, QR codes, Color palettes & more', bg: 'cat-media-bg' },
    utility: { icon: '⚙️', name: 'Utility Tools', tagline: 'Calculators, Converters, Formatters & more', bg: 'cat-utility-bg' },
  };

  app.innerHTML = `
    <div class="hero">
      <div class="hero-badge">✦ ${toolCount} Free Tools — No Sign-up Required</div>
      <h1 class="hero-title">Every tool you need,<br>completely free.</h1>
      <p class="hero-sub">Text humanizer, AI detector, paraphraser, image tools, calculators, code formatters and dozens more. One place, zero cost.</p>
      <div class="hero-cta-row">
        <button class="btn btn-primary btn-lg" onclick="document.getElementById('categoryFilter').scrollIntoView({behavior:'smooth'})">Browse All ${toolCount} Tools</button>
        <button class="btn btn-secondary btn-lg" onclick="navigate('live')">⚡ Live Multiplayer</button>
      </div>
        <div class="hero-stats">
        <div class="hero-stat"><div class="hero-stat-num">${toolCount}</div><div class="hero-stat-label">Free Tools</div></div>
        <div class="hero-stat"><div class="hero-stat-num">3</div><div class="hero-stat-label">Categories</div></div>
        <div class="hero-stat"><div class="hero-stat-num">0</div><div class="hero-stat-label">Sign-ups needed</div></div>
        <div class="hero-stat"><div class="hero-stat-num">10</div><div class="hero-stat-label">Free uses/day</div></div>
      </div>
    </div>

    <div class="home-features-bar">
      <div class="home-features-inner">
        <div class="home-feature"><span>⚡</span> Results in milliseconds, not seconds</div>
        <div class="home-feature"><span>🔒</span> Rule-based tools run entirely in your browser</div>
        <div class="home-feature"><span>📱</span> Works on any device, any screen size</div>
        <div class="home-feature"><span>🆓</span> Properly free — no credit card, no tricks</div>
      </div>
    </div>

    <div class="container" style="padding-top:28px">
      <div class="section-title">🔥 Trending Now</div>
      <div class="trending-strip" id="trendingStrip"></div>

      <div class="home-categories-intro">
        ${Object.entries(catDescriptions).map(([catId, cat]) => `
          <a href="/category/${catId}" class="home-cat-card ${cat.bg}" onclick="event.preventDefault();navigate('category','${catId}')">
            <div class="home-cat-icon">${cat.icon}</div>
            <div class="home-cat-name">${cat.name}</div>
            <div class="home-cat-desc">${cat.tagline}</div>
            <div class="home-cat-count">${APP.tools.filter(t=>t.category===catId).length} tools</div>
          </a>`).join('')}
      </div>

      <div class="cat-tabs" id="categoryFilter"></div>
      <div id="toolsContainer"></div>
    </div>

    <!-- Live Games Banner -->
    <div style="max-width:1200px;margin:32px auto;padding:0 20px">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 50%,#f59e0b 100%);border-radius:20px;padding:40px 32px;color:#fff;display:flex;align-items:center;gap:32px;flex-wrap:wrap;cursor:pointer;transition:transform 0.2s" onclick="navigate('live')" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size:56px">⚡</div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:24px;font-weight:800;margin-bottom:4px">ToolHub Live — Multiplayer Quiz Games</div>
          <div style="opacity:0.9;font-size:15px">Host real-time games for your class. Three game modes, Blook avatars, teacher dashboard, and zero student data stored.</div>
        </div>
        <div style="background:rgba(255,255,255,0.2);padding:12px 24px;border-radius:12px;font-weight:700;white-space:nowrap;backdrop-filter:blur(4px)">Play Now →</div>
      </div>
    </div>

    <div class="home-why-section">
      <div class="container">
        <div class="section-title" style="text-align:center;margin-bottom:24px">Why people use ToolHub</div>
        <div class="home-why-grid">
          <div class="home-why-card">
            <div class="home-why-icon">🤖</div>
            <div class="home-why-title">Text Tools That Actually Work</div>
            <div class="home-why-text">The humanizer applies 50+ linguistic transformations. The detector scores writing across 15 statistical dimensions. These aren't wrappers around ChatGPT.</div>
          </div>
          <div class="home-why-card">
            <div class="home-why-icon">🔐</div>
            <div class="home-why-title">Your Data Stays Local</div>
            <div class="home-why-text">Converters, formatters, and calculators run in your browser. Nothing is uploaded. Server-side tools process and discard — we don't keep your text.</div>
          </div>
          <div class="home-why-card">
            <div class="home-why-icon">⚡</div>
            <div class="home-why-title">No Loading Spinners</div>
            <div class="home-why-text">Most tools return results in under 100ms. No queuing behind API rate limits. Rule-based tools are instant; server tools are lightweight.</div>
          </div>
          <div class="home-why-card">
            <div class="home-why-icon">🎓</div>
            <div class="home-why-title">Built for Classrooms</div>
            <div class="home-why-text">Live multiplayer quiz games, teacher dashboards, accessibility mode, and GDPR-compliant student sessions. Educators with .edu emails get ad-free access.</div>
          </div>
        </div>
      </div>
    </div>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-logo">⚡ ToolHub AI</div>
        <div class="footer-links">
          <a href="/" onclick="event.preventDefault();navigate('home')">Home</a>
          <a href="/live" onclick="event.preventDefault();navigate('live')">Live Games</a>
          <a href="/category/text" onclick="event.preventDefault();navigate('category','text')">Text Tools</a>
          <a href="/category/media" onclick="event.preventDefault();navigate('category','media')">Media Tools</a>
          <a href="/category/utility" onclick="event.preventDefault();navigate('category','utility')">Utility Tools</a>
          <a href="/quizzes" onclick="event.preventDefault();navigate('quizzes')">Quizzes</a>
          <a href="/tool/ai-detector" onclick="event.preventDefault();navigate('tool','ai-detector')">AI Detector</a>
          <a href="/tool/ai-humanizer" onclick="event.preventDefault();navigate('tool','ai-humanizer')">AI Humanizer</a>
          <a href="/tool/paraphraser" onclick="event.preventDefault();navigate('tool','paraphraser')">Paraphraser</a>
        </div>
        <div class="footer-copy">© ${new Date().getFullYear()} ToolHub AI — ${toolCount} free online tools. No account required.</div>
      </div>
    </footer>`;

  const trending = APP.tools.filter(t => t.trending);
  document.getElementById('trendingStrip').innerHTML = trending.map(t => `
    <a href="/tool/${t.id}" class="trending-chip" onclick="event.preventDefault();navigate('tool','${t.id}')">
      ${t.icon} ${t.name} <span class="chip-fire">HOT</span>
    </a>`).join('');

  renderCategoryFilter();
  renderToolsGrid(activeCategory);
}

function renderCategoryFilter() {
  const cats = [
    {id:'all',name:'All Tools',icon:'⊞'},
    ...Object.entries(APP.categories).map(([id,c])=>({id,name:c.name,icon:c.icon}))
  ];
  document.getElementById('categoryFilter').innerHTML = cats.map(c => `
    <button class="cat-btn ${activeCategory===c.id?'active':''}" onclick="filterCategory('${c.id}')">
      ${c.icon} ${c.name}
      <span class="cat-count">${c.id==='all'?APP.tools.length:APP.tools.filter(t=>t.category===c.id).length}</span>
    </button>`).join('');
}

function filterCategory(cat) {
  activeCategory = cat;
  renderCategoryFilter();
  renderToolsGrid(cat);
}

function renderToolsGrid(cat) {
  const tools = cat==='all' ? APP.tools : APP.tools.filter(t=>t.category===cat);
  document.getElementById('toolsContainer').innerHTML = `
    <div class="tools-grid">${tools.map(renderToolCard).join('')}</div>`;
}

function renderToolCard(t) {
  return `
    <a href="/tool/${t.id}" class="tool-card${t.trending?' featured':''}" onclick="event.preventDefault();navigate('tool','${t.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')navigate('tool','${t.id}')">
      <div class="tool-card-top">
        <div class="tool-icon cat-${t.category}">${t.icon}</div>
        ${t.trending?`<span class="tool-badge trending">🔥 Hot</span>`:''}
      </div>
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.description}</div>
      <div class="tool-card-footer">
        <span class="tool-cat-tag cat-${t.category}">${APP.categories[t.category]?.name||t.category}</span>
        <button class="btn-run" onclick="event.stopPropagation();event.preventDefault();navigate('tool','${t.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run
        </button>
      </div>
    </a>`;
}

// ── Premium Modal ─────────────────────────────────────────────────────────────
async function showPremiumModal() {
  openModal('premiumModal');
  try {
    const data = await apiFetch('/api/paypal-button');
    const wrap = document.getElementById('premiumPaypalBtn');
    if (data && data.html) {
      wrap.innerHTML = data.html;
    } else {
      wrap.innerHTML = `<button class="paypal-btn" onclick="toast('Contact support to upgrade.','info')">💳 Pay via PayPal — $9.99/mo</button>`;
    }
  } catch(e) {
    document.getElementById('premiumPaypalBtn').innerHTML = `<button class="paypal-btn" onclick="toast('Contact admin@toolhub.ai to upgrade.','info')">💳 Pay via PayPal — $9.99/mo</button>`;
  }
}

// ── Usage Limit Handler ───────────────────────────────────────────────────────
function handleLimitReached(data) {
  const title = document.getElementById('limitModalTitle');
  const msg   = document.getElementById('limitModalMsg');
  if (title) title.textContent = 'Daily Limit Reached';
  if (msg)   msg.textContent = data.message || 'You have reached your daily usage limit.';
  openModal('limitModal');
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function showLogin(msg='') {
  document.getElementById('authModalContent').innerHTML = `
    <div class="modal">
      <button class="modal-x" onclick="closeModal('authModal')">×</button>
      <h2>Welcome back</h2>
      <p>Sign in to your ToolHub account.</p>
      ${msg?`<div class="modal-error">${msg}</div>`:''}
      <div id="authErr"></div>
      <div class="modal-input-group">
        <input class="modal-input" id="loginEmail" type="email" placeholder="Email address" autocomplete="email">
        <input class="modal-input" id="loginPassword" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()">
      </div>
      <button class="btn btn-primary w-full" onclick="doLogin()">Sign in</button>
      <div class="modal-divider">Don't have an account? <span class="modal-link" onclick="showSignup()">Sign up free</span></div>
    </div>`;
  openModal('authModal');
  setTimeout(()=>document.getElementById('loginEmail')?.focus(),100);
}

function showSignup() {
  document.getElementById('authModalContent').innerHTML = `
    <div class="modal">
      <button class="modal-x" onclick="closeModal('authModal')">×</button>
      <h2>Create account</h2>
      <p>Free forever. No credit card required.</p>
      <div id="authErr"></div>
      <div class="modal-input-group">
        <input class="modal-input" id="regName" type="text" placeholder="Your name" autocomplete="name">
        <input class="modal-input" id="regEmail" type="email" placeholder="Email address" autocomplete="email">
        <input class="modal-input" id="regPassword" type="password" placeholder="Password (min 6 chars)" autocomplete="new-password" onkeydown="if(event.key==='Enter')doSignup()">
      </div>
      <button class="btn btn-primary w-full" onclick="doSignup()">Create free account</button>
      <div class="modal-divider">Already have an account? <span class="modal-link" onclick="showLogin()">Sign in</span></div>
    </div>`;
  openModal('authModal');
  setTimeout(()=>document.getElementById('regName')?.focus(),100);
}

async function doLogin() {
  const email=document.getElementById('loginEmail')?.value.trim();
  const password=document.getElementById('loginPassword')?.value;
  if (!email||!password) { showAuthError('Please fill in all fields.'); return; }
  try {
    const data = await apiFetch('/api/auth/login','POST',{email,password});
    if (data.success) location.href = data.redirect||'/';
  } catch(e) { showAuthError(e.message||'Login failed.'); }
}

async function doSignup() {
  const name=document.getElementById('regName')?.value.trim();
  const email=document.getElementById('regEmail')?.value.trim();
  const password=document.getElementById('regPassword')?.value;
  if (!name||!email||!password) { showAuthError('Please fill in all fields.'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  try {
    const data = await apiFetch('/api/auth/register','POST',{name,email,password});
    if (data.success) location.href = data.redirect||'/';
  } catch(e) { showAuthError(e.message||'Registration failed.'); }
}

function showAuthError(msg) {
  const el = document.getElementById('authErr');
  if (el) el.innerHTML = `<div class="modal-error">${msg}</div>`;
}

async function confirmLogout() {
  if (!confirm('Sign out?')) return;
  await apiFetch('/api/auth/logout','POST');
  location.href='/';
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type='info', duration=3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type==='success'?'✓':type==='error'?'✕':type==='warn'?'⚠':'ℹ';
  el.innerHTML = `<span>${icon}</span> ${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>el.remove(), duration);
}

// ── API ───────────────────────────────────────────────────────────────────────
async function apiFetch(url, method='GET', body=null) {
  const opts = { method, headers:{}, credentials:'include' };
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type']='application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  const res = await fetch(url, opts);
  if (res.headers.get('content-type')?.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      if (data.limitReached) { handleLimitReached(data); }
      throw new Error(data.error||data.message||'Request failed');
    }
    return data;
  }
  if (!res.ok) throw new Error('Request failed');
  return res;
}

// ── Clipboard & Download ──────────────────────────────────────────────────────
async function copyText(text, label='Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} to clipboard!`, 'success');
  } catch {
    toast('Copy failed. Select and copy manually.', 'error');
  }
}
function downloadText(text, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text],{type:'text/plain'}));
  a.download = filename; a.click();
}
function downloadDataURL(dataUrl, filename) {
  const a = document.createElement('a'); a.href = dataUrl; a.download = filename; a.click();
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ICONS = {
  copy:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  refresh:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  back:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  run:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
};

// ── Mobile Navigation ─────────────────────────────────────────────────────────
function toggleMobileNav() {
  const drawer = document.getElementById('mobileNavDrawer');
  const btn = document.getElementById('mobileMenuBtn');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  if (btn) btn.textContent = open ? '✕' : '☰';
  if (open) {
    const loggedIn = APP.session?.loggedIn;
    const isAdmin = APP.session?.role === 'admin';
    const el = (id) => document.getElementById(id);
    if (el('mobileNavDash'))   el('mobileNavDash').style.display   = loggedIn ? 'flex' : 'none';
    if (el('mobileNavAdmin'))  el('mobileNavAdmin').style.display  = isAdmin  ? 'flex' : 'none';
    if (el('mobileNavLogin'))  el('mobileNavLogin').style.display  = !loggedIn ? 'flex' : 'none';
    if (el('mobileNavSignup')) el('mobileNavSignup').style.display = !loggedIn ? 'flex' : 'none';
  }
}

function closeMobileNav() {
  const drawer = document.getElementById('mobileNavDrawer');
  const btn = document.getElementById('mobileMenuBtn');
  if (drawer) drawer.classList.remove('open');
  if (btn) btn.textContent = '☰';
}

document.addEventListener('click', (e) => {
  const drawer = document.getElementById('mobileNavDrawer');
  const btn = document.getElementById('mobileMenuBtn');
  if (drawer?.classList.contains('open') && !drawer.contains(e.target) && e.target !== btn) {
    closeMobileNav();
  }
});

init();
