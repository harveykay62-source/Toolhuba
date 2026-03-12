/* ── ToolHub AI — dashboard.js ────────────────────────────────────────────── */

async function renderDashboard() {
  if (!APP.session.loggedIn) {
    showLogin('Please sign in to view your dashboard.');
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
      <div class="dash-header">
        <div>
          <div class="dash-title">Hello, ${d.user.name.split(' ')[0]} 👋</div>
          <div style="color:var(--text-2);font-size:14px;margin-top:4px">${d.user.email}</div>
        </div>
        <div>
          <span class="dash-role-badge ${d.user.role === 'premium' ? 'premium' : 'free'}">
            ${d.user.role === 'premium' ? '⭐ Premium' : '🆓 Free'}
          </span>
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
          <div class="dash-stat-val" style="font-size:18px">${d.stats.favoriteTool}</div>
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
        </div>` : ''}

      <div class="dash-section">
        <div class="dash-section-title">Recent Activity</div>
        ${d.history.length ? `
          <div class="history-list">
            ${d.history.slice(0,15).map(h => `
              <div class="history-item">
                <span class="tool-cat-tag cat-${h.category}">${h.category}</span>
                <span class="history-item-tool">${h.tool_name}</span>
                <span class="history-item-time">${timeSince(h.created_at)}</span>
                <button class="btn btn-ghost btn-sm btn-icon" onclick="navigate('tool','${toolIdFromName(h.tool_name)}')" title="Open tool">▶</button>
              </div>`).join('')}
          </div>` : `<p class="text-muted">No activity yet. Try a tool!</p>`}
      </div>

      <div class="action-bar">
        <button class="btn btn-primary" onclick="navigate('home')">Explore Tools</button>
        <button class="btn btn-ghost" onclick="confirmLogout()">Sign out</button>
      </div>`;
  } catch (e) {
    document.getElementById('app').innerHTML = `<p class="text-muted text-center" style="padding:40px">Failed to load dashboard. <button class="btn btn-ghost btn-sm" onclick="navigate('home')">Go home</button></p>`;
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
