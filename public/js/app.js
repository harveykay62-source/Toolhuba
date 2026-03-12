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
    if (APP.session.role === 'admin') {
      setupAdminTopbar();
      document.getElementById('adminFab').classList.remove('hidden');
    }
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
  if (path === '/dashboard') { renderDashboard(); return; }
  if (path === '/admin') { history.replaceState({},'','/'); openAdminDrawer(); renderHome(); return; }
  renderHome();
}

function navigate(page, id='') {
  if (page === 'home')      { history.pushState({},'','/');           renderHome(); }
  else if (page === 'tool') { history.pushState({},'',`/tool/${id}`); const t=APP.tools.find(t=>t.id===id); if(t) renderToolPage(t); }
  else if (page === 'dashboard') { history.pushState({},'','/dashboard'); renderDashboard(); }
  else if (page === 'admin') { openAdminDrawer(); return; }
  window.scrollTo({top:0,behavior:'smooth'});
}

window.addEventListener('popstate', handleRoute);

// ── Header ────────────────────────────────────────────────────────────────────
function setupHeader() {
  const ua = document.getElementById('userArea');
  const isPremium = APP.session.role === 'premium' || APP.session.role === 'admin';

  // Premium banner for non-premium users
  const banner = document.getElementById('premiumBanner');
  if (!isPremium && !localStorage.getItem('premiumBannerClosed')) {
    banner.classList.remove('hidden');
  }

  if (APP.session.loggedIn) {
    const initials = APP.session.name ? APP.session.name.slice(0,2).toUpperCase() : '?';
    ua.innerHTML = `
      <div class="user-area">
        ${APP.session.role==='admin' ? `<button class="btn-admin-pill" onclick="openAdminDrawer()">🛡️ Admin</button>` : ''}
        <button class="btn-ghost btn-sm" onclick="navigate('dashboard')">Dashboard</button>
        ${isPremium ? `<span class="tag tag-success" style="font-size:11px">👑 Premium</span>` : `<button class="btn-signup btn-sm" onclick="showPremiumModal()">Upgrade</button>`}
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
  const isPremium = APP.session.role === 'premium' || APP.session.role === 'admin';
  if (isPremium || !APP.settings.adsEnabled) return;

  const client = APP.settings.adsenseClient;
  const banner = APP.settings.adsenseBanner;
  if (!client || client === 'ca-pub-XXXXXXXXXXXXXXXX') return;

  // Inject AdSense script
  const s = document.getElementById('adsenseScript');
  if (s) {
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.setAttribute('crossorigin','anonymous');
    s.setAttribute('async','true');
  }

  // Show top ad bar
  const topBar = document.getElementById('adBarTop');
  topBar.classList.remove('hidden');
  document.getElementById('adTop').innerHTML = `
    <ins class="adsbygoogle" style="display:inline-block;width:728px;height:90px"
      data-ad-client="${client}" data-ad-slot="${banner}"></ins>
    <script>(adsbygoogle=window.adsbygoogle||[]).push({});<\/script>`;

  const bottomBar = document.getElementById('adBarBottom');
  bottomBar.classList.remove('hidden');
  document.getElementById('adBottom').innerHTML = `
    <ins class="adsbygoogle" style="display:inline-block;width:728px;height:90px"
      data-ad-client="${client}" data-ad-slot="${banner}"></ins>
    <script>(adsbygoogle=window.adsbygoogle||[]).push({});<\/script>`;
}

function getToolPageAd() {
  const isPremium = APP.session.role === 'premium' || APP.session.role === 'admin';
  if (isPremium || !APP.settings.adsEnabled) return '';
  const client = APP.settings.adsenseClient;
  const banner = APP.settings.adsenseBanner;
  if (!client || client === 'ca-pub-XXXXXXXXXXXXXXXX') return '';
  return `
    <div class="tool-ad">
      <div class="ad-label">Advertisement</div>
      <ins class="adsbygoogle" style="display:inline-block;width:100%;min-height:90px"
        data-ad-client="${client}" data-ad-slot="${banner}"></ins>
      <script>(adsbygoogle=window.adsbygoogle||[]).push({});<\/script>
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
        (t.tags||[]).some(tag => tag.includes(q.toLowerCase())))
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

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); openSearch(); }
    if (e.key==='Escape') { closeSearch(); closeAdminDrawer(); closeModal('authModal'); closeModal('premiumModal'); closeModal('limitModal'); }
  });
}

// ── Admin Topbar ──────────────────────────────────────────────────────────────
function setupAdminTopbar() {
  const header = document.getElementById('siteHeader');
  const bar = document.createElement('div');
  bar.id = 'adminTopbar';
  bar.className = 'admin-topbar';
  bar.innerHTML = `
    <span class="admin-topbar-label">🛡️ Admin Mode</span>
    <span class="admin-topbar-stat" id="topbarUsers">…</span>
    <span class="admin-topbar-stat" id="topbarUses">…</span>
    <span class="admin-topbar-stat" id="topbarRevenue">…</span>
    <div class="admin-topbar-actions">
      <button class="admin-topbar-btn" onclick="openAdminDrawer()">Open Admin Panel</button>
      <button class="admin-topbar-btn danger" id="maintBtn" onclick="toggleMaintMode()">Maintenance Off</button>
    </div>`;
  header.insertAdjacentElement('afterend', bar);
  // Load quick stats silently
  apiFetch('/api/admin/stats').then(d => {
    document.getElementById('topbarUsers').textContent = `${d.overview.totalUsers} users`;
    document.getElementById('topbarUses').textContent = `${d.overview.totalToolUses.toLocaleString()} uses`;
    document.getElementById('topbarRevenue').textContent = `$${parseFloat(d.revenue.premium||0).toFixed(2)} revenue`;
    const maint = d.settings.maintenance_mode === 'true';
    const btn = document.getElementById('maintBtn');
    if (btn) { btn.textContent = maint ? 'Maintenance ON' : 'Maintenance Off'; btn.style.background = maint ? 'rgba(239,68,68,.4)' : ''; }
    // Cache stats for drawer
    window._adminStats = d;
  }).catch(()=>{});
}

async function toggleMaintMode() {
  const current = window._adminStats?.settings?.maintenance_mode === 'true';
  const next = !current;
  await apiFetch('/api/admin/settings', 'POST', { key:'maintenance_mode', value: next?'true':'false' });
  if (window._adminStats) window._adminStats.settings.maintenance_mode = next?'true':'false';
  const btn = document.getElementById('maintBtn');
  if (btn) { btn.textContent = next ? 'Maintenance ON' : 'Maintenance Off'; btn.style.background = next ? 'rgba(239,68,68,.4)' : ''; }
  toast(next ? '⚠️ Maintenance mode enabled.' : '✅ Maintenance mode off.', next?'warn':'success');
}

// ── Admin Drawer ──────────────────────────────────────────────────────────────
let _adminDrawerTab = 'overview';
let _adminDrawerLoaded = false;

function openAdminDrawer() {
  if (APP.session.role !== 'admin') return;
  document.getElementById('adminDrawer').classList.add('open');
  document.getElementById('adminDrawerBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  loadAdminDrawer();
}

function closeAdminDrawer() {
  document.getElementById('adminDrawer').classList.remove('open');
  document.getElementById('adminDrawerBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

async function loadAdminDrawer(forceReload) {
  if (_adminDrawerLoaded && !forceReload && window._adminStats) {
    renderAdminDrawerContent(window._adminStats);
    return;
  }
  try {
    const d = await apiFetch('/api/admin/stats');
    window._adminStats = d;
    _adminDrawerLoaded = true;
    renderAdminDrawerContent(d);
    // Update topbar stats too
    const tu = document.getElementById('topbarUsers'); if(tu) tu.textContent = `${d.overview.totalUsers} users`;
    const tuse = document.getElementById('topbarUses'); if(tuse) tuse.textContent = `${d.overview.totalToolUses.toLocaleString()} uses`;
    const tr = document.getElementById('topbarRevenue'); if(tr) tr.textContent = `$${parseFloat(d.revenue.premium||0).toFixed(2)} revenue`;
  } catch(e) {
    document.getElementById('adminDrawerContent').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load admin data.</div>`;
  }
}

function renderAdminDrawerContent(d) {
  const el = document.getElementById('adminDrawerContent');
  el.innerHTML = `
    <div class="admin-quick-stats">
      <div class="admin-qs-item">
        <div class="admin-qs-val">${d.overview.totalUsers.toLocaleString()}</div>
        <div class="admin-qs-lbl">Total Users</div>
      </div>
      <div class="admin-qs-item">
        <div class="admin-qs-val" style="color:var(--amber)">${d.overview.premiumUsers}</div>
        <div class="admin-qs-lbl">Premium</div>
      </div>
      <div class="admin-qs-item">
        <div class="admin-qs-val">${d.overview.totalToolUses.toLocaleString()}</div>
        <div class="admin-qs-lbl">Tool Uses</div>
      </div>
      <div class="admin-qs-item">
        <div class="admin-qs-val" style="color:var(--green)">$${parseFloat(d.revenue.premium||0).toFixed(2)}</div>
        <div class="admin-qs-lbl">Revenue</div>
      </div>
    </div>
    <div class="admin-drawer-tabs">
      <button class="admin-drawer-tab ${_adminDrawerTab==='overview'?'active':''}" data-tab="overview" onclick="switchDrawerTab('overview')">📊 Overview</button>
      <button class="admin-drawer-tab ${_adminDrawerTab==='users'?'active':''}" data-tab="users" onclick="switchDrawerTab('users')">👥 Users</button>
      <button class="admin-drawer-tab ${_adminDrawerTab==='tools'?'active':''}" data-tab="top-tools" onclick="switchDrawerTab('top-tools')">🔥 Top Tools</button>
      <button class="admin-drawer-tab ${_adminDrawerTab==='manage-tools'?'active':''}" data-tab="manage-tools" onclick="switchDrawerTab('manage-tools')">🛠 Enable/Disable</button>
      <button class="admin-drawer-tab ${_adminDrawerTab==='settings'?'active':''}" data-tab="settings" onclick="switchDrawerTab('settings')">⚙️ Settings</button>
      <button class="admin-drawer-tab ${_adminDrawerTab==='transactions'?'active':''}" data-tab="transactions" onclick="switchDrawerTab('transactions')">💳 Transactions</button>
    </div>
    <div id="drawerTabBody" class="admin-drawer-tab-body"></div>`;
  renderDrawerTab(_adminDrawerTab, d);
}

function switchDrawerTab(tab) {
  _adminDrawerTab = tab;
  document.querySelectorAll('.admin-drawer-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderDrawerTab(tab, window._adminStats);
}

function renderDrawerTab(tab, d) {
  const body = document.getElementById('drawerTabBody');
  if (!body) return;

  if (tab === 'overview') {
    body.innerHTML = `
      <div style="margin-bottom:20px">
        <div class="dash-section-title" style="margin-bottom:12px">System Status</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div class="workspace-panel" style="padding:14px;margin:0">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:6px">Uptime</div>
            <div style="font-size:18px;font-weight:700">${d.system.uptime}</div>
          </div>
          <div class="workspace-panel" style="padding:14px;margin:0">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:6px">Memory</div>
            <div style="font-size:18px;font-weight:700">${d.system.memoryMB} MB</div>
          </div>
          <div class="workspace-panel" style="padding:14px;margin:0">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:6px">Active (24h)</div>
            <div style="font-size:18px;font-weight:700">${d.overview.activeUsers}</div>
          </div>
          <div class="workspace-panel" style="padding:14px;margin:0">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin-bottom:6px">Page Views</div>
            <div style="font-size:18px;font-weight:700">${d.overview.totalPageViews.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div class="dash-section-title" style="margin-bottom:12px">Recent Signups</div>
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody>${d.recentUsers.slice(0,8).map(u=>`
            <tr>
              <td>${u.name}</td>
              <td style="font-size:12px;color:var(--text-muted)">${u.email}</td>
              <td><span class="tool-cat-tag cat-${u.role==='premium'?'text':'utility'}">${u.role}</span></td>
              <td style="font-size:12px">${new Date(u.created_at).toLocaleDateString()}</td>
              <td style="color:${u.is_active?'var(--green)':'var(--red)'}">●</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  } else if (tab === 'users') {
    body.innerHTML = `
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>${d.recentUsers.map(u=>`
            <tr>
              <td style="font-weight:600">${u.name}</td>
              <td style="font-size:12px;color:var(--text-muted)">${u.email}</td>
              <td>
                <select style="padding:3px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)" onchange="setUserRole(${u.id},this.value)">
                  <option value="free" ${u.role==='free'?'selected':''}>Free</option>
                  <option value="premium" ${u.role==='premium'?'selected':''}>Premium</option>
                </select>
              </td>
              <td style="font-size:12px">${u.last_login?new Date(u.last_login).toLocaleDateString():'Never'}</td>
              <td>
                <button style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid;cursor:pointer;color:${u.is_active?'#ef4444':'#22c55e'};border-color:${u.is_active?'#ef444430':'#22c55e30'};background:${u.is_active?'#ef444410':'#22c55e10'}" onclick="toggleUser(${u.id},${u.is_active})">${u.is_active?'Ban':'Unban'}</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  } else if (tab === 'top-tools') {
    body.innerHTML = `
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>#</th><th>Tool</th><th>Category</th><th>Uses</th><th>Bar</th></tr></thead>
          <tbody>${d.topTools.map((t,i)=>{
            const maxUses = d.topTools[0]?.uses || 1;
            const pct = Math.round((t.uses/maxUses)*100);
            return `<tr>
              <td style="color:var(--text-muted);font-size:12px">${i+1}</td>
              <td style="font-weight:600">${t.tool_name}</td>
              <td><span class="tool-cat-tag cat-${t.category}">${t.category}</span></td>
              <td style="font-weight:700;color:var(--accent)">${t.uses.toLocaleString()}</td>
              <td style="width:100px"><div style="background:var(--bg-muted);border-radius:3px;height:6px;overflow:hidden"><div style="background:var(--accent);height:100%;width:${pct}%;border-radius:3px"></div></div></td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`;

  } else if (tab === 'manage-tools') {
    body.innerHTML = '<div style="padding:20px;text-align:center"><div class="spinner"></div></div>';
    apiFetch('/api/admin/tools').then(td => {
      const cats = {};
      for (const t of td.tools) { if (!cats[t.category]) cats[t.category] = []; cats[t.category].push(t); }
      const catLabels = { text:'📝 Text', media:'🎬 Media', utility:'⚙️ Utility' };
      let html = '';
      Object.entries(cats).forEach(([cat, tools]) => {
        html += `<div style="margin-bottom:20px">
          <div class="dash-section-title" style="margin-bottom:10px">${catLabels[cat]||cat} <span style="font-weight:400;color:var(--text-3)">(${tools.length})</span></div>
          <div class="tool-toggle-grid">`;
        tools.forEach(t => {
          html += `<div class="tool-toggle-card ${t.enabled?'':'disabled'}">
            <div class="tool-toggle-card-info">
              <div class="tool-toggle-card-name">${t.icon} ${t.name}</div>
              <div class="tool-toggle-card-cat">${t.category}</div>
            </div>
            <label class="switch" style="flex-shrink:0">
              <input type="checkbox" ${t.enabled?'checked':''} onchange="toggleTool('${t.id}',this.checked)">
              <span class="switch-track"></span>
            </label>
          </div>`;
        });
        html += `</div></div>`;
      });
      body.innerHTML = html;
    }).catch(()=>{ body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">Failed to load tools.</p>'; });

  } else if (tab === 'settings') {
    const s = d.settings;
    body.innerHTML = `
      <div style="margin-bottom:20px">
        <div class="dash-section-title" style="margin-bottom:14px">💼 Site Settings</div>
        ${drawerSettingRow('Site Name', 'site_name', s.site_name, 'text')}
        ${drawerSettingRow('Free Daily Limit', 'free_daily_limit', s.free_daily_limit, 'number')}
        ${drawerSettingRow('Premium Price (USD)', 'premium_price', s.premium_price, 'text')}
        <div class="drawer-setting-row">
          <div><div class="drawer-setting-label">Maintenance Mode</div><div class="drawer-setting-sub">Show maintenance notice to all users</div></div>
          <label class="switch"><input type="checkbox" ${s.maintenance_mode==='true'?'checked':''} onchange="saveSetting('maintenance_mode',this.checked?'true':'false');"><span class="switch-track"></span></label>
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div class="dash-section-title" style="margin-bottom:14px">💰 Revenue</div>
        <div class="drawer-setting-row" style="padding:14px 0">
          <div><div class="drawer-setting-label">Auto-calculated Revenue</div><div class="drawer-setting-sub">Completed PayPal transactions</div></div>
          <span style="font-size:24px;font-weight:800;color:var(--green)">$${parseFloat(d.revenue?.premium||0).toFixed(2)}</span>
        </div>
        ${drawerSettingRow('Manual Revenue Override (USD)', 'revenue_earned', s.revenue_earned||'0', 'number')}
      </div>
      <div style="margin-bottom:20px">
        <div class="dash-section-title" style="margin-bottom:14px">📢 AdSense</div>
        ${drawerSettingRow('Publisher ID (ca-pub-...)', 'adsense_client', s.adsense_client, 'text')}
        ${drawerSettingRow('Banner Slot ID', 'adsense_slot_banner', s.adsense_slot_banner, 'text')}
        <div class="drawer-setting-row">
          <div><div class="drawer-setting-label">Enable Ads</div><div class="drawer-setting-sub">Show AdSense banners to free users</div></div>
          <label class="switch"><input type="checkbox" ${s.ads_enabled==='true'?'checked':''} onchange="saveSetting('ads_enabled',this.checked?'true':'false')"><span class="switch-track"></span></label>
        </div>
      </div>
      <div>
        <div class="dash-section-title" style="margin-bottom:14px">🅿️ PayPal</div>
        ${drawerSettingRow('PayPal Client ID', 'paypal_client_id', s.paypal_client_id, 'text')}
        <div style="margin-top:14px">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Add Custom PayPal Button</div>
          <textarea class="tool-textarea" id="ppBtnHtml" placeholder="Paste PayPal button HTML…" rows="4" style="margin-bottom:8px"></textarea>
          <div style="display:grid;grid-template-columns:1fr 1fr 120px;gap:8px;margin-bottom:8px">
            <input class="drawer-setting-input" style="width:100%" id="ppBtnName" placeholder="Button name">
            <input class="drawer-setting-input" style="width:100%" type="number" id="ppBtnPrice" placeholder="Price (9.99)" step="0.01">
            <select class="drawer-setting-input" style="width:100%" id="ppBtnType">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="onetime">One-time</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="savePaypalBtn()">💾 Save Button</button>
        </div>
        ${d.paypalButtons?.length ? `
          <div style="margin-top:14px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">SAVED BUTTONS</div>
            ${d.paypalButtons.map(b=>`
              <div class="drawer-setting-row">
                <span class="drawer-setting-label">${b.name} — $${b.price}/${b.plan_type}</span>
                <span style="color:${b.is_active?'var(--green)':'var(--text-muted)'}">● ${b.is_active?'Active':'Inactive'}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;

  } else if (tab === 'transactions') {
    if (!d.transactions?.length) {
      body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No transactions yet.</div>`;
      return;
    }
    body.innerHTML = `
      <div style="overflow-x:auto">
        <table class="admin-table">
          <thead><tr><th>User</th><th>Amount</th><th>Plan</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${d.transactions.map(t=>`
            <tr>
              <td>
                <div style="font-weight:600;font-size:13px">${t.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${t.email}</div>
              </td>
              <td style="font-weight:700;color:var(--green)">$${parseFloat(t.amount).toFixed(2)}</td>
              <td><span class="tool-cat-tag cat-text">${t.plan}</span></td>
              <td style="font-size:12px">${new Date(t.created_at).toLocaleDateString()}</td>
              <td style="color:${t.status==='completed'?'var(--green)':'var(--amber)'}">● ${t.status}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
}

function drawerSettingRow(label, key, value, type) {
  return `<div class="drawer-setting-row">
    <div><div class="drawer-setting-label">${label}</div></div>
    <input type="${type||'text'}" class="drawer-setting-input" value="${value||''}" onblur="saveSetting('${key}',this.value)">
  </div>`;
}

// ── Home ──────────────────────────────────────────────────────────────────────
let activeCategory = 'all';

function renderHome() {
  const toolCount = APP.tools.length;
  document.title = `ToolHub AI — ${toolCount} Free Online Tools`;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="hero">
      <div class="hero-badge">✦ ${toolCount} Free Tools — No Sign-up Required</div>
      <h1 class="hero-title">Every tool you need,<br>completely free.</h1>
      <p class="hero-sub">AI Humanizer, AI Detector, Paraphraser, Image Tools, Calculators, Code Formatters and more — all in one place, all free, forever.</p>
      <div class="hero-cta-row">
        <button class="btn btn-primary btn-lg" onclick="document.getElementById('categoryFilter').scrollIntoView({behavior:'smooth'})">Browse All ${toolCount} Tools</button>
        <button class="btn btn-secondary btn-lg" onclick="openSearch()">🔍 Search Tools</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="hero-stat-num">${toolCount}</div><div class="hero-stat-label">Free Tools</div></div>
        <div class="hero-stat"><div class="hero-stat-num">3</div><div class="hero-stat-label">Categories</div></div>
        <div class="hero-stat"><div class="hero-stat-num">0</div><div class="hero-stat-label">Sign-ups needed</div></div>
        <div class="hero-stat"><div class="hero-stat-num">∞</div><div class="hero-stat-label">Free uses/day</div></div>
      </div>
    </div>

    <div class="home-features-bar">
      <div class="home-features-inner">
        <div class="home-feature"><span>⚡</span> Instant results — no loading screens</div>
        <div class="home-feature"><span>🔒</span> Your text never leaves your browser for rule-based tools</div>
        <div class="home-feature"><span>📱</span> Works on desktop, tablet, and mobile</div>
        <div class="home-feature"><span>🆓</span> 100% free — no credit card, no limits</div>
      </div>
    </div>

    <div class="container" style="padding-top:28px">
      <div class="section-title">🔥 Trending Now</div>
      <div class="trending-strip" id="trendingStrip"></div>

      <div class="home-categories-intro">
        <div class="home-cat-card cat-text-bg" onclick="filterCategory('text')">
          <div class="home-cat-icon">📝</div>
          <div class="home-cat-name">Text Tools</div>
          <div class="home-cat-desc">Humanizer, Detector, Grammar, Paraphraser &amp; more</div>
          <div class="home-cat-count">${APP.tools.filter(t=>t.category==='text').length} tools</div>
        </div>
        <div class="home-cat-card cat-media-bg" onclick="filterCategory('media')">
          <div class="home-cat-icon">🎬</div>
          <div class="home-cat-name">Media Tools</div>
          <div class="home-cat-desc">Image converter, QR codes, Color palettes &amp; more</div>
          <div class="home-cat-count">${APP.tools.filter(t=>t.category==='media').length} tools</div>
        </div>
        <div class="home-cat-card cat-utility-bg" onclick="filterCategory('utility')">
          <div class="home-cat-icon">⚙️</div>
          <div class="home-cat-name">Utility Tools</div>
          <div class="home-cat-desc">Calculators, Converters, Formatters &amp; more</div>
          <div class="home-cat-count">${APP.tools.filter(t=>t.category==='utility').length} tools</div>
        </div>
      </div>

      <div class="cat-tabs" id="categoryFilter"></div>
      <div id="toolsContainer"></div>
    </div>

    <div class="home-why-section">
      <div class="container">
        <div class="section-title" style="text-align:center;margin-bottom:24px">Why ToolHub AI?</div>
        <div class="home-why-grid">
          <div class="home-why-card">
            <div class="home-why-icon">🤖</div>
            <div class="home-why-title">AI-Powered Text Tools</div>
            <div class="home-why-text">Our AI Humanizer uses 50+ linguistic rules to make AI text sound natural. Our AI Detector spots AI writing using 15 statistical signals. No black boxes — pure rules.</div>
          </div>
          <div class="home-why-card">
            <div class="home-why-icon">🔐</div>
            <div class="home-why-title">Privacy First</div>
            <div class="home-why-text">Rule-based tools (like converters, formatters, and calculators) run entirely in your browser. Your data stays with you.</div>
          </div>
          <div class="home-why-card">
            <div class="home-why-icon">⚡</div>
            <div class="home-why-title">Genuinely Fast</div>
            <div class="home-why-text">No round-trips to expensive AI APIs for most tools. Results in milliseconds. Our server-side tools are lightweight and quick too.</div>
          </div>
          <div class="home-why-card">
            <div class="home-why-icon">🧩</div>
            <div class="home-why-title">Modular Architecture</div>
            <div class="home-why-text">Every tool is independently maintained in its own module. This means rock-solid stability — one tool updating never breaks another.</div>
          </div>
        </div>
      </div>
    </div>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-logo">⚡ ToolHub AI</div>
        <div class="footer-links">
          <a onclick="navigate('home')">Home</a>
          <a onclick="navigate('tool','ai-detector')">AI Detector</a>
          <a onclick="navigate('tool','ai-humanizer')">AI Humanizer</a>
          <a onclick="navigate('tool','paraphraser')">Paraphraser</a>
          <a onclick="navigate('tool','grammar-fixer')">Grammar Fixer</a>
          <a onclick="navigate('tool','text-diff')">Text Diff</a>
          <a onclick="navigate('tool','qr-generator')">QR Generator</a>
          <a onclick="navigate('tool','json-formatter')">JSON Formatter</a>
          <a onclick="navigate('tool','color-contrast')">Color Contrast</a>
          <a onclick="navigate('tool','uuid-generator')">UUID Generator</a>
          <a onclick="navigate('tool','pomodoro-timer')">Pomodoro Timer</a>
          <a onclick="navigate('tool','csv-to-json')">CSV to JSON</a>
          <a onclick="navigate('tool','typing-test')">Typing Test</a>
          <a onclick="navigate('tool','password-generator')">Password Generator</a>
        </div>
        <div class="footer-copy">© ${new Date().getFullYear()} ToolHub AI — ${toolCount} free online tools. No sign-up. No limits.</div>
      </div>
    </footer>`;

  const trending = APP.tools.filter(t => t.trending);
  document.getElementById('trendingStrip').innerHTML = trending.map(t => `
    <div class="trending-chip" onclick="navigate('tool','${t.id}')">
      ${t.icon} ${t.name} <span class="chip-fire">HOT</span>
    </div>`).join('');

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
    <div class="tool-card${t.trending?' featured':''}" onclick="navigate('tool','${t.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')navigate('tool','${t.id}')">
      <div class="tool-card-top">
        <div class="tool-icon cat-${t.category}">${t.icon}</div>
        ${t.trending?`<span class="tool-badge trending">🔥 Hot</span>`:''}
      </div>
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.description}</div>
      <div class="tool-card-footer">
        <span class="tool-cat-tag cat-${t.category}">${APP.categories[t.category]?.name||t.category}</span>
        <button class="btn-run" onclick="event.stopPropagation();navigate('tool','${t.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run
        </button>
      </div>
    </div>`;
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
        <input class="modal-input" id="loginPassword" type="password" placeholder="Password" autocomplete="current-password">
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
        <input class="modal-input" id="regPassword" type="password" placeholder="Password (min 6 chars)" autocomplete="new-password">
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

init();
