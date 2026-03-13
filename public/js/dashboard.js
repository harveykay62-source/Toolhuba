/* ── ToolHub AI — dashboard.js ────────────────────────────────────────────── */

async function renderDashboard() {
  // Fix: check session properly and redirect to login if not logged in
  if (!APP.session || !APP.session.loggedIn) {
    document.getElementById('app').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px;text-align:center;padding:40px">
        <div style="font-size:48px">🔐</div>
        <h2 style="margin:0">Sign in to view your dashboard</h2>
        <p style="color:var(--text-muted);margin:0">Create a free account or sign in to track your usage and history.</p>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button class="btn btn-primary" onclick="showLogin()">Sign in</button>
          <button class="btn btn-secondary" onclick="showSignup()">Create free account</button>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('home')" style="margin-top:8px">← Back to tools</button>
      </div>`;
    return;
  }

  document.getElementById('app').innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  try {
    const d = await apiFetch('/api/dashboard');
    document.title = 'Dashboard — ToolHub AI';

    const usedPct = d.stats.dailyLimit === 'unlimited' ? 100 : Math.round((d.stats.todayUses / d.stats.dailyLimit) * 100);
    const limitLabel = d.stats.dailyLimit === 'unlimited' ? '∞' : d.stats.dailyLimit;
    const isOver = d.stats.dailyLimit !== 'unlimited' && d.stats.todayUses >= d.stats.dailyLimit;

    document.getElementById('app').innerHTML = `
      <div class="container" style="max-width:860px;padding-top:32px;padding-bottom:60px">

        <div class="dash-header">
          <div>
            <div class="dash-title">Hello, ${escHtml(d.user.name.split(' ')[0])} 👋</div>
            <div style="color:var(--text-2);font-size:14px;margin-top:4px">${escHtml(d.user.email)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="dash-role-badge ${d.user.role === 'premium' ? 'premium' : 'free'}">
              ${d.user.role === 'premium' ? '⭐ Premium' : '🆓 Free'}
            </span>
            ${d.user.role === 'free' ? `<button class="btn-signup btn-sm" onclick="showPremiumModal()">Upgrade</button>` : ''}
          </div>
        </div>

        <div class="dash-stats">
          <div class="dash-stat">
            <div class="dash-stat-val">${d.stats.totalUses.toLocaleString()}</div>
            <div class="dash-stat-label">Total tool uses</div>
          </div>
          <div class="dash-stat">
            <div class="dash-stat-val">${d.stats.todayUses}</div>
            <div class="dash-stat-label">Uses today</div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" style="width:${Math.min(usedPct,100)}%;background:${isOver?'var(--red)':'var(--accent)'}"></div>
            </div>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">${d.stats.todayUses} / ${limitLabel}</div>
          </div>
          <div class="dash-stat">
            <div class="dash-stat-val" style="font-size:18px">${escHtml(d.stats.favoriteTool)}</div>
            <div class="dash-stat-label">Favorite tool</div>
          </div>
          <div class="dash-stat">
            <div class="dash-stat-val">${d.user.created_at ? new Date(d.user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—'}</div>
            <div class="dash-stat-label">Member since</div>
          </div>
        </div>

        ${d.user.role === 'free' && isOver ? `
          <div class="info-panel" style="border-color:var(--red);margin-bottom:20px">
            <h3 style="color:var(--red)">Daily limit reached</h3>
            <p>You've used all ${limitLabel} free uses for today. Limit resets at midnight.</p>
            <button class="btn btn-primary btn-sm" onclick="showPremiumModal()">Upgrade for unlimited ↗</button>
          </div>` : ''}

        <div class="dash-section">
          <div class="dash-section-title">Recent Activity</div>
          ${d.history.length ? `
            <div class="history-list">
              ${d.history.slice(0,15).map(h => `
                <div class="history-item">
                  <span class="tool-cat-tag cat-${h.category}">${h.category}</span>
                  <span class="history-item-tool">${escHtml(h.tool_name)}</span>
                  <span class="history-item-time">${timeSince(h.created_at)}</span>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="const tid=toolIdFromName('${escHtml(h.tool_name)}');if(tid)navigate('tool',tid);" title="Open tool">▶</button>
                </div>`).join('')}
            </div>` : `<p class="text-muted">No activity yet. <a onclick="navigate('home')" style="cursor:pointer;color:var(--accent)">Try a tool!</a></p>`}
        </div>

        <div class="dash-section">
          <div class="dash-section-title">🐛 Report a Bug</div>
          <div class="bug-report-form">
            <select class="tool-textarea" id="bugTool" style="height:auto;padding:10px 12px;margin-bottom:10px">
              <option value="">— Select a tool (optional) —</option>
              ${(APP.tools||[]).map(t=>`<option value="${escHtml(t.name)}">${escHtml(t.name)}</option>`).join('')}
            </select>
            <textarea class="tool-textarea" id="bugDesc" placeholder="Describe the bug — what happened, what you expected, any error messages…" rows="4" style="margin-bottom:10px"></textarea>
            <button class="btn btn-primary btn-sm" onclick="submitBugReport()">📤 Submit Report</button>
            <div id="bugStatus" style="margin-top:10px;font-size:13px"></div>
          </div>
        </div>

        <div class="action-bar">
          <button class="btn btn-primary" onclick="navigate('home')">Explore Tools</button>
          <button class="btn btn-ghost" onclick="confirmLogout()">Sign out</button>
        </div>
      </div>`;

  } catch (e) {
    document.getElementById('app').innerHTML = `<p class="text-muted text-center" style="padding:40px">Failed to load dashboard. <button class="btn btn-ghost btn-sm" onclick="renderDashboard()">Retry</button> <button class="btn btn-ghost btn-sm" onclick="navigate('home')">Go home</button></p>`;
  }
}

async function submitBugReport() {
  const tool = document.getElementById('bugTool')?.value || '';
  const desc = document.getElementById('bugDesc')?.value?.trim() || '';
  const status = document.getElementById('bugStatus');
  if (!desc) { if(status) status.innerHTML = '<span style="color:var(--red)">Please describe the bug first.</span>'; return; }
  try {
    await apiFetch('/api/bug-report', 'POST', {
      tool,
      description: desc,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    if(status) status.innerHTML = '<span style="color:var(--green)">✅ Bug report submitted — thank you!</span>';
    const bugDesc = document.getElementById('bugDesc');
    if(bugDesc) bugDesc.value = '';
  } catch(e) {
    if(status) status.innerHTML = `<span style="color:var(--red)">Failed to submit: ${e.message}</span>`;
  }
}

function timeSince(dateStr) {
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function toolIdFromName(name) {
  const tool = APP.tools.find(t => t.name === name);
  return tool ? tool.id : '';
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
