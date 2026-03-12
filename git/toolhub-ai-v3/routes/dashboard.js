const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { setDisabledTools, getAllTools, TOOLS } = require('../db/tools');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/dashboard', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const today = new Date().toISOString().split('T')[0];

  const totalUses = db.get('SELECT COUNT(*) as count FROM tool_usage WHERE user_id=?', [userId]);
  const todayUses = db.get(`SELECT COUNT(*) as count FROM tool_usage WHERE user_id=? AND DATE(created_at)=?`, [userId, today]);
  const favTool = db.get(`SELECT tool_name, COUNT(*) as count FROM tool_usage WHERE user_id=? GROUP BY tool_id ORDER BY count DESC LIMIT 1`, [userId]);
  const history = db.all(`SELECT tool_name,category,created_at FROM tool_usage WHERE user_id=? ORDER BY created_at DESC LIMIT 20`, [userId]);
  const weeklyData = db.all(`SELECT DATE(created_at) as date, COUNT(*) as count FROM tool_usage WHERE user_id=? AND created_at >= datetime('now','-7 days') GROUP BY DATE(created_at) ORDER BY date`, [userId]);
  const dailyLimit = parseInt(db.getSetting('free_daily_limit') || '10');
  const user = db.get('SELECT * FROM users WHERE id=?', [userId]);
  const adsEnabled = db.getSetting('ads_enabled') === 'true';
  const paypalButtons = db.all('SELECT * FROM paypal_buttons WHERE is_active=1');

  res.json({
    user: { name: req.session.name, email: req.session.email, role: req.session.role, avatarColor: req.session.avatarColor, created_at: user ? user.created_at : null, premium_expires_at: user ? user.premium_expires_at : null },
    stats: { totalUses: totalUses ? totalUses.count : 0, todayUses: todayUses ? todayUses.count : 0, dailyLimit: req.session.role === 'free' ? dailyLimit : 'unlimited', favoriteTool: favTool ? favTool.tool_name : 'None yet' },
    history, weeklyData,
    adsEnabled: req.session.role === 'free' ? adsEnabled : false,
    paypalButtons
  });
});

router.get('/admin/stats', requireAdmin, (req, res) => {
  const totalUsers = db.get(`SELECT COUNT(*) as count FROM users WHERE role!='admin'`);
  const premiumUsers = db.get(`SELECT COUNT(*) as count FROM users WHERE role='premium'`);
  const totalToolUses = db.get('SELECT COUNT(*) as count FROM tool_usage');
  const totalPageViews = db.get('SELECT COUNT(*) as count FROM page_views');
  const activeUsers = db.get(`SELECT COUNT(DISTINCT user_id) as count FROM tool_usage WHERE created_at >= datetime('now','-24 hours')`);
  const dailyStats = db.all(`SELECT * FROM daily_stats ORDER BY date DESC LIMIT 14`).reverse();
  const topTools = db.all(`SELECT tool_name,tool_id,category,COUNT(*) as uses FROM tool_usage GROUP BY tool_id ORDER BY uses DESC LIMIT 10`);
  const recentUsers = db.all(`SELECT id,name,email,role,created_at,last_login,is_active FROM users WHERE role!='admin' ORDER BY created_at DESC LIMIT 20`);
  const premiumRevenue = db.get(`SELECT COALESCE(SUM(amount),0) as total FROM premium_transactions WHERE status='completed'`);
  const transactions = db.all(`SELECT pt.*,u.name,u.email FROM premium_transactions pt JOIN users u ON u.id=pt.user_id ORDER BY pt.created_at DESC LIMIT 20`);
  const settingRows = db.all('SELECT key,value FROM settings');
  const settings = {};
  settingRows.forEach(r => settings[r.key] = r.value);
  const paypalButtons = db.all('SELECT * FROM paypal_buttons ORDER BY created_at DESC');
  const uptime = process.uptime();
  const mem = process.memoryUsage();

  res.json({
    overview: { totalUsers: totalUsers ? totalUsers.count : 0, premiumUsers: premiumUsers ? premiumUsers.count : 0, totalToolUses: totalToolUses ? totalToolUses.count : 0, totalPageViews: totalPageViews ? totalPageViews.count : 0, activeUsers: activeUsers ? activeUsers.count : 0 },
    dailyStats, topTools, recentUsers,
    revenue: { premium: premiumRevenue ? premiumRevenue.total : 0, estimated_ad: ((totalPageViews ? totalPageViews.count : 0) * 0.002).toFixed(2) },
    transactions, settings, paypalButtons,
    system: { uptime: Math.floor(uptime/3600)+'h '+Math.floor((uptime%3600)/60)+'m', memoryMB: Math.round(mem.rss/1024/1024), nodeVersion: process.version, platform: process.platform }
  });
});

router.post('/admin/settings', requireAdmin, (req, res) => {
  const allowed = ['ads_enabled','free_daily_limit','premium_price','site_name','adsense_client','adsense_slot_banner','adsense_slot_sidebar','paypal_client_id','maintenance_mode','revenue_earned'];
  const { key, value } = req.body;
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid setting' });
  db.setSetting(key, value);
  res.json({ success: true });
});

router.post('/admin/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['free','premium'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.run('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
  res.json({ success: true });
});

router.post('/admin/users/:id/toggle', requireAdmin, (req, res) => {
  const user = db.get('SELECT is_active FROM users WHERE id=?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newStatus = user.is_active ? 0 : 1;
  db.run('UPDATE users SET is_active=? WHERE id=?', [newStatus, req.params.id]);
  res.json({ success: true, is_active: newStatus });
});

router.post('/admin/paypal-buttons', requireAdmin, (req, res) => {
  const { name, plan_type, button_html, price } = req.body;
  if (!name || !button_html || !price) return res.status(400).json({ error: 'All fields required' });
  const result = db.run(`INSERT INTO paypal_buttons (name,plan_type,button_html,price) VALUES (?,?,?,?)`,
    [name, plan_type || 'monthly', button_html, parseFloat(price)]);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.delete('/admin/paypal-buttons/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM paypal_buttons WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

router.post('/premium/activate', requireAuth, (req, res) => {
  const { transaction_id, plan } = req.body;
  const userId = req.session.userId;
  const amount = parseFloat(db.getSetting('premium_price') || '9.99');
  const expires = new Date();
  expires.setMonth(expires.getMonth() + (plan === 'yearly' ? 12 : 1));

  db.run(`INSERT INTO premium_transactions (user_id,paypal_transaction_id,amount,plan,status) VALUES (?,?,?,?,'completed')`,
    [userId, transaction_id || 'manual', amount, plan || 'monthly']);
  db.run(`UPDATE users SET role='premium',premium_expires_at=?,paypal_subscription_id=? WHERE id=?`,
    [expires.toISOString(), transaction_id, userId]);
  req.session.role = 'premium';

  const today = new Date().toISOString().split('T')[0];
  db.run(`INSERT INTO daily_stats (date,premium_revenue) VALUES (?,?) ON CONFLICT(date) DO UPDATE SET premium_revenue=premium_revenue+?`,
    [today, amount, amount]);

  res.json({ success: true, message: 'Premium activated!' });
});

router.post('/track/pageview', (req, res) => {
  const { page } = req.body;
  db.trackPageView(page || '/', req.ip, req.session.userId || null, req.headers['user-agent']);
  res.json({ ok: true });
});

// ── Admin: Tool Management ─────────────────────────────────────────────────
router.get('/admin/tools', requireAdmin, (req, res) => {
  const disabledIds = db.getDisabledTools();
  const tools = TOOLS.map(t => ({ ...t, enabled: !disabledIds.includes(t.id) }));
  res.json({ tools });
});

router.post('/admin/tools/:toolId/toggle', requireAdmin, (req, res) => {
  const { toolId } = req.params;
  const { enabled } = req.body; // boolean
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  // disabled = !enabled
  const updated = db.setDisabledTool(toolId, !enabled);
  setDisabledTools(updated);
  res.json({ success: true, toolId, enabled: !!enabled });
});

router.post('/admin/tools/bulk', requireAdmin, (req, res) => {
  const { disabledIds } = req.body; // array of tool ids to disable
  if (!Array.isArray(disabledIds)) return res.status(400).json({ error: 'disabledIds must be array' });
  db.setSetting('disabled_tools', disabledIds.join(','));
  setDisabledTools(disabledIds);
  res.json({ success: true, disabledCount: disabledIds.length });
});

// Public endpoint for premium PayPal button
router.get('/paypal-button', (req, res) => {
  const btn = db.get('SELECT * FROM paypal_buttons WHERE is_active=1 ORDER BY id LIMIT 1');
  if (!btn) return res.json({ html: null });
  res.json({ html: btn.button_html, price: btn.price, plan: btn.plan_type });
});

module.exports = router;
