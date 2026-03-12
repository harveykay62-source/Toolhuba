const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  if (req.headers.accept && req.headers.accept.includes('application/json'))
    return res.status(401).json({ error: 'Authentication required' });
  res.redirect('/login');
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required' });
};

const checkUsageLimit = async (req, res, next) => {
  try {
    const db = require('../db/database');

    if (!req.session.userId) {
      const today = new Date().toISOString().split('T')[0];
      const row = await db.get(
        `SELECT COUNT(*) as count FROM tool_usage WHERE ip_address=$1 AND DATE(created_at)=$2 AND user_id IS NULL`,
        [req.ip, today]
      );
      if (row && parseInt(row.count) >= 3) {
        return res.status(429).json({ error: 'Daily limit reached', message: 'Sign up free for 10 uses/day!', limitReached: true });
      }
      return next();
    }

    if (req.session.role === 'premium' || req.session.role === 'admin') return next();

    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = parseInt(await db.getSetting('free_daily_limit') || '10');
    const usage = await db.getDailyUsage(req.session.userId, today);

    if (usage >= dailyLimit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `Free accounts are limited to ${dailyLimit} uses/day. Upgrade to Premium for unlimited!`,
        limitReached: true, limit: dailyLimit, used: usage
      });
    }
    next();
  } catch (err) {
    console.error('checkUsageLimit error:', err.message);
    next();
  }
};

module.exports = { requireAuth, requireAdmin, checkUsageLimit };
