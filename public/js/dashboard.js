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

        ${['gamemaster','admin'].includes(d.user.role) ? `
        <div class="gm-panel glass-card" style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="font-size:36px">🎓</div>
            <div>
              <div style="font-size:18px;font-weight:700;color:#7c3aed">Game Master — Verified Educator</div>
              <div style="font-size:13px;color:var(--text-muted)">All educator perks are active on your account</div>
            </div>
            <div style="margin-left:auto;background:linear-gradient(135deg,#7c3aed,#10b981);color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700">✓ ACTIVE</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px">
            <div class="gm-perk">🚫 Ads permanently removed</div>
            <div class="gm-perk">📛 Verified Educator badge</div>
            <div class="gm-perk">📄 Export quiz data to PDF/CSV</div>
            <div class="gm-perk">⚡ Unlimited bot test sessions</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="exportQuizData('pdf')">📄 Export Quiz Data (PDF)</button>
            <button class="btn btn-secondary btn-sm" onclick="exportQuizData('csv')">📊 Export Quiz Data (CSV)</button>
          </div>
        </div>` : `
        <div class="gm-promo-panel glass-card" style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
            <div style="font-size:32px">🔑</div>
            <div>
              <div style="font-size:17px;font-weight:700">Educator Promo Code</div>
              <div style="font-size:13px;color:var(--text-muted)">Enter your school promo code to unlock Game Master status</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" id="promoCodeInput" placeholder="e.g. TEACHER2026" class="tool-input" style="flex:1;min-width:200px;max-width:320px;font-size:15px;letter-spacing:0.06em;font-family:monospace;text-transform:uppercase" oninput="this.value=this.value.toUpperCase()" />
            <button class="btn btn-primary" onclick="redeemPromoCode()">🔓 Activate</button>
          </div>
          <div id="promoStatus" style="margin-top:10px;font-size:13px"></div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">Game Master perks: remove all ads · Verified Educator badge · export quiz data to PDF/CSV · unlimited bot test sessions</div>
        </div>`}

        <div class="dash-section glass-card" style="margin-bottom:28px">
          <div class="dash-section-title" style="margin-bottom:16px">⚙️ Account Settings</div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Change Password</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <input type="password" id="newPassInput" placeholder="New password (min 6 chars)" class="tool-input" style="flex:1;min-width:200px" />
              <button class="btn btn-secondary btn-sm" onclick="changePassword()">Update Password</button>
            </div>
            <div id="passStatus" style="margin-top:8px;font-size:12px"></div>
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

async function redeemPromoCode() {
  const input = document.getElementById('promoCodeInput');
  const status = document.getElementById('promoStatus');
  const code = input?.value?.trim();
  if (!code) { if(status) status.innerHTML = '<span style="color:var(--red)">Please enter a code first.</span>'; return; }
  try {
    const r = await apiFetch('/api/auth/redeem-promo', 'POST', { code });
    if (r.success) {
      if (status) status.innerHTML = `<span style="color:#10b981;font-weight:600">${escHtml(r.message)}</span>`;
      // Reload after 1.5s to refresh the dashboard with new role
      setTimeout(() => renderDashboard(), 1500);
    } else {
      if (status) status.innerHTML = `<span style="color:var(--red)">${escHtml(r.error || 'Invalid code')}</span>`;
    }
  } catch(e) {
    if (status) status.innerHTML = `<span style="color:var(--red)">${escHtml(e.message)}</span>`;
  }
}

async function exportQuizData(format) {
  try {
    const resp = await fetch(`/api/quiz/export?format=${format}`, { credentials: 'include' });
    if (!resp.ok) { toast('Export failed — no quiz data found.', 'error'); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-data-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Quiz data exported as ${format.toUpperCase()}!`, 'success');
  } catch(e) {
    toast('Export failed: ' + e.message, 'error');
  }
}

async function changePassword() {
  const input = document.getElementById('newPassInput');
  const status = document.getElementById('passStatus');
  const pass = input?.value?.trim();
  if (!pass || pass.length < 6) {
    if(status) status.innerHTML = '<span style="color:var(--red)">Password must be at least 6 characters.</span>';
    return;
  }
  try {
    await apiFetch('/api/auth/change-password', 'POST', { newPassword: pass });
    if(status) status.innerHTML = '<span style="color:#10b981">✅ Password updated successfully!</span>';
    if(input) input.value = '';
  } catch(e) {
    if(status) status.innerHTML = `<span style="color:var(--red)">${escHtml(e.message)}</span>`;
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
