'use strict';
/**
 * ToolHub AI — Real-time Analytics
 * Tracks every page view, tool use, and active visitor.
 * Provides SSE stream for live admin dashboard.
 */

const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// ── In-memory active visitor store ────────────────────────────────────────────
// Key: IP+UA fingerprint  |  Value: { ip, page, ua, country, time, userId }
const ACTIVE_VISITORS = new Map();
const VISITOR_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Recent events ring buffer (last 200 events)
const RECENT_EVENTS = [];
const MAX_EVENTS = 200;

function pushEvent(ev) {
  RECENT_EVENTS.unshift({ ...ev, ts: Date.now() });
  if (RECENT_EVENTS.length > MAX_EVENTS) RECENT_EVENTS.length = MAX_EVENTS;
  broadcastSSE({ type: 'event', data: RECENT_EVENTS[0] });
}

function updateVisitor(fingerprint, info) {
  ACTIVE_VISITORS.set(fingerprint, { ...info, time: Date.now() });
  broadcastSSE({ type: 'visitors', data: getActiveVisitors() });
}

function pruneVisitors() {
  const cutoff = Date.now() - VISITOR_TIMEOUT;
  for (const [k, v] of ACTIVE_VISITORS) {
    if (v.time < cutoff) ACTIVE_VISITORS.delete(k);
  }
}

function getActiveVisitors() {
  pruneVisitors();
  return Array.from(ACTIVE_VISITORS.values()).map(v => ({
    page: v.page,
    ip: v.ip ? v.ip.replace(/\.\d+$/, '.xxx') : '—',   // anonymise last octet
    ua: v.ua || '—',
    time: v.time,
    userId: v.userId || null,
  }));
}

setInterval(pruneVisitors, 30_000);

// ── SSE subscribers ────────────────────────────────────────────────────────────
const SSE_CLIENTS = new Set();

function broadcastSSE(payload) {
  const str = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of SSE_CLIENTS) {
    try { res.write(str); } catch { SSE_CLIENTS.delete(res); }
  }
}

// ── Express middleware to auto-track every request ────────────────────────────
function trackingMiddleware(req, res, next) {
  // Skip assets, API calls, and the SSE stream itself
  const skip = ['/css/','/js/','/favicon','/api/admin/analytics','.map','.ico','.png','.jpg','.svg','.woff'];
  if (skip.some(s => req.path.includes(s))) return next();

  const ip  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
  const ua  = req.headers['user-agent'] || '';
  const fp  = ip + '||' + ua.slice(0, 60);  // fingerprint (no cookies needed)
  const page = req.path;

  // Update in-memory visitor
  updateVisitor(fp, { ip, ua, page, userId: req.session?.userId || null });

  // Track page view for API routes we don't want double-counted
  if (!req.path.startsWith('/api/')) {
    const userId = req.session?.userId || null;
    db.trackPageView(page, ip, userId, ua).catch(() => {});
    pushEvent({ kind: 'pageview', page, ip: ip.replace(/\.\d+$/, '.xxx'), ua: parseUA(ua) });
  }

  next();
}

function parseUA(ua = '') {
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// SSE stream — admin only
router.get('/stream', requireAdmin, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send initial snapshot
  res.write(`data: ${JSON.stringify({ type: 'snapshot', visitors: getActiveVisitors(), events: RECENT_EVENTS.slice(0, 50) })}\n\n`);

  SSE_CLIENTS.add(res);

  // Heartbeat every 20s
  const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch { clearInterval(hb); } }, 20_000);

  req.on('close', () => {
    SSE_CLIENTS.delete(res);
    clearInterval(hb);
  });
});

// Real-time stats snapshot
router.get('/realtime', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const minutesAgo5  = new Date(now - 5  * 60 * 1000).toISOString();
    const minutesAgo60 = new Date(now - 60 * 60 * 1000).toISOString();
    const today = now.toISOString().split('T')[0];

    const [viewsToday, viewsHour, viewsMin5, toolUsesToday, newUsersToday, topPages, topTools, deviceBreakdown, hourlyToday] = await Promise.all([
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE DATE(created_at)=$1`, [today]),
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE created_at >= $1`, [minutesAgo60]),
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE created_at >= $1`, [minutesAgo5]),
      db.get(`SELECT COUNT(*) as c FROM tool_usage WHERE DATE(created_at)=$1`, [today]),
      db.get(`SELECT COUNT(*) as c FROM users WHERE DATE(created_at)=$1`, [today]),
      db.all(`SELECT page, COUNT(*) as c FROM page_views WHERE created_at >= $1 GROUP BY page ORDER BY c DESC LIMIT 10`, [minutesAgo60]),
      db.all(`SELECT tool_name, COUNT(*) as c FROM tool_usage WHERE DATE(created_at)=$1 GROUP BY tool_name ORDER BY c DESC LIMIT 10`, [today]),
      db.all(`SELECT user_agent, COUNT(*) as c FROM page_views WHERE created_at >= $1 GROUP BY user_agent ORDER BY c DESC LIMIT 100`, [minutesAgo60]),
      db.all(`SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as c FROM page_views WHERE DATE(created_at)=$1 GROUP BY hour ORDER BY hour`, [today]),
    ]);

    // Aggregate device types
    const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
    (deviceBreakdown || []).forEach(r => { const t = parseUA(r.user_agent); devices[t] = (devices[t] || 0) + parseInt(r.c); });

    res.json({
      activeNow: getActiveVisitors().length,
      viewsToday: parseInt(viewsToday?.c || 0),
      viewsHour: parseInt(viewsHour?.c || 0),
      viewsMin5: parseInt(viewsMin5?.c || 0),
      toolUsesToday: parseInt(toolUsesToday?.c || 0),
      newUsersToday: parseInt(newUsersToday?.c || 0),
      topPages: topPages || [],
      topTools: topTools || [],
      devices,
      hourlyToday: hourlyToday || [],
      activeVisitors: getActiveVisitors(),
      recentEvents: RECENT_EVENTS.slice(0, 30),
    });
  } catch (err) {
    console.error('Realtime analytics error:', err);
    res.status(500).json({ error: 'Analytics unavailable.' });
  }
});

// Historical stats (30 days)
router.get('/historical', requireAdmin, async (req, res) => {
  try {
    const [daily30, totalUsers, totalViews, totalUses, allTopTools, allTopPages, countryBreakdown, retentionUsers] = await Promise.all([
      db.all(`SELECT date, page_views, tool_uses, new_users, premium_revenue FROM daily_stats ORDER BY date DESC LIMIT 30`),
      db.get(`SELECT COUNT(*) as c FROM users WHERE role != 'admin'`),
      db.get(`SELECT COUNT(*) as c FROM page_views`),
      db.get(`SELECT COUNT(*) as c FROM tool_usage`),
      db.all(`SELECT tool_name, COUNT(*) as c FROM tool_usage GROUP BY tool_name ORDER BY c DESC LIMIT 20`),
      db.all(`SELECT page, COUNT(*) as c FROM page_views GROUP BY page ORDER BY c DESC LIMIT 20`),
      db.all(`SELECT ip_address, COUNT(*) as c FROM page_views GROUP BY ip_address ORDER BY c DESC LIMIT 5`),
      db.all(`SELECT DATE(created_at) as d, COUNT(*) as c FROM users WHERE role != 'admin' GROUP BY d ORDER BY d DESC LIMIT 30`),
    ]);

    res.json({
      daily30: (daily30 || []).reverse(),
      totals: {
        users: parseInt(totalUsers?.c || 0),
        pageViews: parseInt(totalViews?.c || 0),
        toolUses: parseInt(totalUses?.c || 0),
      },
      allTopTools: allTopTools || [],
      allTopPages: allTopPages || [],
      retentionUsers: retentionUsers || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Historical analytics unavailable.' });
  }
});

module.exports = { router, trackingMiddleware, getActiveVisitors, pushEvent };
