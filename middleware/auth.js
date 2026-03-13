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
    const userId = req.session?.userId;
    const role   = req.session?.role;

    if (!userId) {
      const today = new Date().toISOString().split('T')[0];
      const ip = req.ip || '';
      const row = await db.get(
        `SELECT COUNT(*) as count FROM tool_usage WHERE ip_address=$1 AND DATE(created_at)=$2 AND user_id IS NULL`,
        [ip, today]
      );
      if (row && parseInt(row.count) >= 3) {
        return res.status(429).json({ error: 'Daily limit reached', message: 'Sign up free for 10 uses/day!', limitReached: true });
      }
      return next();
    }

    if (role === 'premium' || role === 'admin' || role === 'educator') return next();

    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = parseInt(await db.getSetting('free_daily_limit') || '10');
    const usage = await db.getDailyUsage(userId, today);

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
    next(); // fail open — don't block users on a DB hiccup
  }
};

module.exports = { requireAuth, requireAdmin, checkUsageLimit };
