/* ── ToolHub AI — admin.js ─────────────────────────────────────────────────
   Admin action functions (used by the admin drawer in app.js).
   The drawer UI itself is rendered in app.js renderDrawerTab().
   ────────────────────────────────────────────────────────────────────────── */

// Legacy renderAdmin() — now opens the drawer instead of a full page
function renderAdmin() {
  if (!APP.session.loggedIn || APP.session.role !== 'admin') { navigate('home'); return; }
  openAdminDrawer();
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function saveSetting(key, value) {
  try {
    await apiFetch('/api/admin/settings', 'POST', { key, value });
    toast('Setting saved.', 'success');
    // Keep cache in sync
    if (window._adminStats?.settings) window._adminStats.settings[key] = value;
  } catch (e) { toast(e.message || 'Failed to save setting.', 'error'); }
}

async function setUserRole(id, role) {
  try {
    await apiFetch(`/api/admin/users/${id}/role`, 'POST', { role });
    toast('Role updated.', 'success');
    if (window._adminStats) {
      const u = window._adminStats.recentUsers.find(u => u.id === id);
      if (u) u.role = role;
    }
  } catch (e) { toast(e.message || 'Failed to update role.', 'error'); }
}

async function toggleUser(id, current) {
  if (!confirm(current ? 'Ban this user?' : 'Unban this user?')) return;
  try {
    await apiFetch(`/api/admin/users/${id}/toggle`, 'POST');
    toast(current ? 'User banned.' : 'User unbanned.', 'success');
    loadAdminDrawer(true);
  } catch (e) { toast(e.message || 'Failed.', 'error'); }
}

async function savePaypalBtn() {
  const button_html = document.getElementById('ppBtnHtml')?.value.trim();
  const name        = document.getElementById('ppBtnName')?.value.trim();
  const price       = document.getElementById('ppBtnPrice')?.value;
  const plan_type   = document.getElementById('ppBtnType')?.value;
  if (!button_html || !name || !price) { toast('Fill in all PayPal button fields.', 'warn'); return; }
  try {
    await apiFetch('/api/admin/paypal-buttons', 'POST', { button_html, name, price, plan_type });
    toast('PayPal button saved!', 'success');
    loadAdminDrawer(true);
  } catch (e) { toast(e.message || 'Failed.', 'error'); }
}

async function toggleTool(toolId, enabled) {
  try {
    await apiFetch(`/api/admin/tools/${toolId}/toggle`, 'POST', { enabled });
    toast(enabled ? 'Tool enabled.' : 'Tool disabled and hidden.', 'success');
    if (window._adminStats) {
      // Update local tool enabled state
      const t = window._adminStats.topTools?.find(t => t.tool_id === toolId);
      if (t) t.enabled = enabled;
    }
  } catch (e) {
    toast(e.message || 'Failed to update tool.', 'error');
  }
}
