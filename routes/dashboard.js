const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { setDisabledTools, getAllTools, TOOLS } = require('../db/tools');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const today = new Date().toISOString().split('T')[0];

    const [totalUses, todayUses, favTool, history, weeklyData, user, paypalButtons] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM tool_usage WHERE user_id=?', [userId]),
      db.get(`SELECT COUNT(*) as count FROM tool_usage WHERE user_id=? AND DATE(created_at)=?`, [userId, today]),
      db.get(`SELECT tool_name, COUNT(*) as count FROM tool_usage WHERE user_id=? GROUP BY tool_id ORDER BY count DESC LIMIT 1`, [userId]),
      db.all(`SELECT tool_name,category,created_at FROM tool_usage WHERE user_id=? ORDER BY created_at DESC LIMIT 20`, [userId]),
      db.all(`SELECT DATE(created_at) as date, COUNT(*) as count FROM tool_usage WHERE user_id=? AND created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date`, [userId]),
      db.get('SELECT * FROM users WHERE id=?', [userId]),
      db.all('SELECT * FROM paypal_buttons WHERE is_active=1'),
    ]);

    const dailyLimit = parseInt(await db.getSetting('free_daily_limit') || '10');
    const adsEnabled = await db.getSetting('ads_enabled') === 'true';

    res.json({
      user: { name: req.session.name, email: req.session.email, role: req.session.role, avatarColor: req.session.avatarColor, created_at: user ? user.created_at : null, premium_expires_at: user ? user.premium_expires_at : null },
      stats: { totalUses: totalUses ? parseInt(totalUses.count) : 0, todayUses: todayUses ? parseInt(todayUses.count) : 0, dailyLimit: (req.session.role === 'free') ? dailyLimit : 'unlimited', favoriteTool: favTool ? favTool.tool_name : 'None yet' },
      history, weeklyData,
      adsEnabled: (req.session.role === 'free') ? adsEnabled : false,
      paypalButtons
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, premiumUsers, totalToolUses, totalPageViews, activeUsers, dailyStats, topTools, recentUsers, premiumRevenue, transactions, settingRows, paypalButtons] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM users WHERE role!='admin'`),
      db.get(`SELECT COUNT(*) as count FROM users WHERE role='premium'`),
      db.get('SELECT COUNT(*) as count FROM tool_usage'),
      db.get('SELECT COUNT(*) as count FROM page_views'),
      db.get(`SELECT COUNT(DISTINCT user_id) as count FROM tool_usage WHERE created_at >= NOW() - INTERVAL '24 hours'`),
      db.all(`SELECT * FROM daily_stats ORDER BY date DESC LIMIT 14`),
      db.all(`SELECT tool_name,tool_id,category,COUNT(*) as uses FROM tool_usage GROUP BY tool_id,tool_name,category ORDER BY uses DESC LIMIT 10`),
      db.all(`SELECT id,name,email,role,created_at,last_login,is_active FROM users WHERE role!='admin' ORDER BY created_at DESC LIMIT 20`),
      db.get(`SELECT COALESCE(SUM(amount),0) as total FROM premium_transactions WHERE status='completed'`),
      db.all(`SELECT pt.*,u.name,u.email FROM premium_transactions pt JOIN users u ON u.id=pt.user_id ORDER BY pt.created_at DESC LIMIT 20`),
      db.all('SELECT key,value FROM settings'),
      db.all('SELECT * FROM paypal_buttons ORDER BY created_at DESC'),
    ]);

    const settings = {};
    settingRows.forEach(r => settings[r.key] = r.value);
    const uptime = process.uptime();
    const mem = process.memoryUsage();

    res.json({
      overview: { totalUsers: parseInt(totalUsers?.count||0), premiumUsers: parseInt(premiumUsers?.count||0), totalToolUses: parseInt(totalToolUses?.count||0), totalPageViews: parseInt(totalPageViews?.count||0), activeUsers: parseInt(activeUsers?.count||0) },
      dailyStats: dailyStats.reverse(), topTools, recentUsers,
      revenue: { premium: parseFloat(premiumRevenue?.total||0), estimated_ad: (parseInt(totalPageViews?.count||0) * 0.002).toFixed(2) },
      transactions, settings, paypalButtons,
      system: { uptime: Math.floor(uptime/3600)+'h '+Math.floor((uptime%3600)/60)+'m', memoryMB: Math.round(mem.rss/1024/1024), nodeVersion: process.version, platform: process.platform }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

router.post('/admin/settings', requireAdmin, async (req, res) => {
  const allowed = ['ads_enabled','free_daily_limit','premium_price','site_name','adsense_client','adsense_slot_banner','adsense_slot_sidebar','paypal_client_id','maintenance_mode','revenue_earned'];
  const { key, value } = req.body;
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid setting' });
  await db.setSetting(key, value);
  res.json({ success: true });
});

router.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['free','premium'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    await db.run('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Set role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.post('/admin/users/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const user = await db.get('SELECT is_active FROM users WHERE id=?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = user.is_active ? 0 : 1;
    await db.run('UPDATE users SET is_active=? WHERE id=?', [newStatus, req.params.id]);
    res.json({ success: true, is_active: newStatus });
  } catch (err) {
    console.error('Toggle user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/admin/paypal-buttons', requireAdmin, async (req, res) => {
  const { name, plan_type, button_html, price } = req.body;
  if (!name || !button_html || !price) return res.status(400).json({ error: 'All fields required' });
  const result = await db.run(`INSERT INTO paypal_buttons (name,plan_type,button_html,price) VALUES (?,?,?,?)`,
    [name, plan_type || 'monthly', button_html, parseFloat(price)]);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.delete('/admin/paypal-buttons/:id', requireAdmin, async (req, res) => {
  await db.run('DELETE FROM paypal_buttons WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

router.post('/premium/activate', requireAuth, async (req, res) => {
  const { transaction_id, plan } = req.body;
  const userId = req.session.userId;
  const amount = parseFloat(await db.getSetting('premium_price') || '9.99');
  const expires = new Date();
  expires.setMonth(expires.getMonth() + (plan === 'yearly' ? 12 : 1));

  await db.run(`INSERT INTO premium_transactions (user_id,paypal_transaction_id,amount,plan,status) VALUES (?,?,?,?,'completed')`,
    [userId, transaction_id || 'manual', amount, plan || 'monthly']);
  await db.run(`UPDATE users SET role='premium',premium_expires_at=?,paypal_subscription_id=? WHERE id=?`,
    [expires.toISOString(), transaction_id, userId]);
  req.session.role = 'premium';

  const today = new Date().toISOString().split('T')[0];
  await db.run(
    `INSERT INTO daily_stats (date,premium_revenue) VALUES (?,?) ON CONFLICT(date) DO UPDATE SET premium_revenue=daily_stats.premium_revenue+?`,
    [today, amount, amount]
  );

  res.json({ success: true, message: 'Premium activated!' });
});

router.post('/track/pageview', async (req, res) => {
  const { page } = req.body;
  await db.trackPageView(page || '/', req.ip, req.session.userId || null, req.headers['user-agent']);
  res.json({ ok: true });
});

// ── Admin: Tool Management ─────────────────────────────────────────────────
router.get('/admin/tools', requireAdmin, async (req, res) => {
  const disabledIds = await db.getDisabledTools();
  const tools = TOOLS.map(t => ({ ...t, enabled: !disabledIds.includes(t.id) }));
  res.json({ tools });
});

router.post('/admin/tools/:toolId/toggle', requireAdmin, async (req, res) => {
  const { toolId } = req.params;
  const { enabled } = req.body;
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  const updated = await db.setDisabledTool(toolId, !enabled);
  setDisabledTools(updated);
  res.json({ success: true, toolId, enabled: !!enabled });
});

router.post('/admin/tools/bulk', requireAdmin, async (req, res) => {
  const { disabledIds } = req.body;
  if (!Array.isArray(disabledIds)) return res.status(400).json({ error: 'disabledIds must be array' });
  await db.setSetting('disabled_tools', disabledIds.join(','));
  setDisabledTools(disabledIds);
  res.json({ success: true, disabledCount: disabledIds.length });
});

router.get('/paypal-button', async (req, res) => {
  const btn = await db.get('SELECT * FROM paypal_buttons WHERE is_active=1 ORDER BY id LIMIT 1');
  if (!btn) return res.json({ html: null });
  res.json({ html: btn.button_html, price: btn.price, plan: btn.plan_type });
});

// ── Bug Reports ────────────────────────────────────────────────────────────────
router.post('/bug-report', async (req, res) => {
  try {
    const { tool, description, userAgent, url } = req.body;
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description required' });
    const userId = req.session.userId || null;
    const userEmail = req.session.email || null;
    await db.run(
      `INSERT INTO bug_reports (user_id, user_email, tool_name, description, user_agent, url) VALUES (?,?,?,?,?,?)`,
      [userId, userEmail, tool || null, description.trim(), userAgent || '', url || '']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Bug report error:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// ── Admin: Bug Reports ────────────────────────────────────────────────────────
router.get('/admin/bug-reports', requireAdmin, async (req, res) => {
  const reports = await db.all(`SELECT * FROM bug_reports ORDER BY created_at DESC LIMIT 100`);
  res.json({ reports });
});

router.post('/admin/bug-reports/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['open','resolved','wontfix'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.run('UPDATE bug_reports SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
