// ─── Database (PostgreSQL — persistent on Render) ─────────────────────────────
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('PG pool error:', err.message));

// Convert SQLite ? placeholders to PostgreSQL $1, $2, ...
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Normalize SQLite-specific SQL syntax to PostgreSQL
function normalizeSql(sql) {
  return sql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\('now',\s*'-([\d]+\s+\w+)'\)/gi, (_, interval) => `NOW() - INTERVAL '${interval}'`);
}

async function query(sql, params = []) {
  const pgSql = normalizeSql(toPositional(sql));
  return pool.query(pgSql, params);
}

async function get(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows[0] || null;
}

async function all(sql, params = []) {
  const { rows } = await query(sql, params);
  return rows;
}

async function run(sql, params = []) {
  const trimmed = sql.trim().toUpperCase();
  let pgSql = sql;
  if (trimmed.startsWith('INSERT') && !trimmed.includes('RETURNING')) {
    pgSql = sql + ' RETURNING id';
  }
  const { rows } = await query(pgSql, params);
  return { lastInsertRowid: rows[0]?.id || null };
}

async function initDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add a PostgreSQL database in Render dashboard and link it via the DATABASE_URL env var.');
  }
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    throw new Error('Cannot connect to PostgreSQL: ' + err.message);
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, uuid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL,
    role TEXT DEFAULT 'free', avatar_color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW(), last_login TIMESTAMP,
    is_active INTEGER DEFAULT 1, paypal_subscription_id TEXT, premium_expires_at TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tool_usage (
    id SERIAL PRIMARY KEY, user_id INTEGER, tool_id TEXT NOT NULL,
    tool_name TEXT NOT NULL, category TEXT NOT NULL, ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY, page TEXT NOT NULL, ip_address TEXT,
    user_id INTEGER, user_agent TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS premium_transactions (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
    paypal_transaction_id TEXT, amount REAL NOT NULL, plan TEXT NOT NULL,
    status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS paypal_buttons (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, plan_type TEXT NOT NULL,
    button_html TEXT NOT NULL, price REAL NOT NULL, is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS bug_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_email TEXT,
    tool_name TEXT,
    description TEXT NOT NULL,
    user_agent TEXT,
    url TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY, date TEXT NOT NULL UNIQUE,
    page_views INTEGER DEFAULT 0, tool_uses INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0, premium_revenue REAL DEFAULT 0
  )`);

  const defaults = [
    ['ads_enabled','true'],['free_daily_limit','10'],['premium_price','9.99'],
    ['site_name','ToolHub AI'],
    ['adsense_client', process.env.ADSENSE_CLIENT_ID || 'ca-pub-6454181337553477'],
    ['adsense_slot_banner', process.env.ADSENSE_SLOT_BANNER || '1234567890'],
    ['adsense_slot_sidebar', process.env.ADSENSE_SLOT_SIDEBAR || '0987654321'],
    ['paypal_client_id', process.env.PAYPAL_CLIENT_ID || ''],
    ['maintenance_mode','false'],['disabled_tools',''],['revenue_earned','0'],
  ];
  for (const [k, v] of defaults) {
    await pool.query(`INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`, [k, v]);
  }

  const { rows: adminRows } = await pool.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
  if (!adminRows.length) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    await pool.query(
      `INSERT INTO users (uuid,email,password,name,role) VALUES ($1,$2,$3,'Admin','admin') ON CONFLICT (email) DO NOTHING`,
      [uuidv4(), process.env.ADMIN_EMAIL || 'admin@toolhub.ai', hash]
    );
    console.log('✅ Admin created:', process.env.ADMIN_EMAIL || 'admin@toolhub.ai');
  }

  const { rows: btnRows } = await pool.query(`SELECT id FROM paypal_buttons LIMIT 1`);
  if (!btnRows.length) {
    await pool.query(
      `INSERT INTO paypal_buttons (name,plan_type,button_html,price) VALUES ($1,$2,$3,$4)`,
      ['Premium Monthly','monthly',
       `<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
<input type="hidden" name="cmd" value="_xclick">
<input type="hidden" name="business" value="YOUR_PAYPAL_EMAIL">
<input type="hidden" name="item_name" value="ToolHub AI Premium">
<input type="hidden" name="amount" value="9.99">
<input type="hidden" name="currency_code" value="USD">
<button type="submit" class="paypal-btn">Pay $9.99/month via PayPal</button>
</form>`, 9.99]
    );
  }

  // ── School domains & teacher/student flags (multiplayer system) ────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS school_domains (
    id SERIAL PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,
    school_name TEXT NOT NULL,
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS teacher_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    school_name TEXT DEFAULT '',
    domain TEXT DEFAULT '',
    created_by_admin INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`);

  // ── Multiplayer game results (persistent) ──────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS multiplayer_results (
    id SERIAL PRIMARY KEY,
    room_code TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    quiz_id TEXT,
    quiz_title TEXT,
    host_id INTEGER,
    host_name TEXT,
    players_json TEXT DEFAULT '[]',
    final_scores TEXT DEFAULT '{}',
    started_at TIMESTAMP,
    ended_at TIMESTAMP DEFAULT NOW()
  )`);

  console.log('✅ Database ready (PostgreSQL)');
}

async function getSetting(key) {
  const row = await get('SELECT value FROM settings WHERE key=?', [key]);
  return row ? row.value : null;
}

async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,NOW())
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [key, String(value)]
  );
}

async function trackToolUse(userId, toolId, toolName, category, ip) {
  await pool.query(
    `INSERT INTO tool_usage (user_id,tool_id,tool_name,category,ip_address,created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
    [userId || null, toolId, toolName, category, ip || '']
  );
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    `INSERT INTO daily_stats (date,tool_uses) VALUES ($1,1) ON CONFLICT (date) DO UPDATE SET tool_uses=daily_stats.tool_uses+1`,
    [today]
  );
}

async function trackPageView(page, ip, userId, userAgent) {
  await pool.query(
    `INSERT INTO page_views (page,ip_address,user_id,user_agent,created_at) VALUES ($1,$2,$3,$4,NOW())`,
    [page || '/', ip || '', userId || null, userAgent || '']
  );
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    `INSERT INTO daily_stats (date,page_views) VALUES ($1,1) ON CONFLICT (date) DO UPDATE SET page_views=daily_stats.page_views+1`,
    [today]
  );
}

async function getDailyUsage(userId, date) {
  const row = await get(`SELECT COUNT(*) as count FROM tool_usage WHERE user_id=$1 AND DATE(created_at)=$2`, [userId, date]);
  return row ? parseInt(row.count || 0) : 0;
}

async function getDisabledTools() {
  const val = await getSetting('disabled_tools') || '';
  return val ? val.split(',').filter(Boolean) : [];
}

async function setDisabledTool(toolId, disabled) {
  const current = await getDisabledTools();
  const updated = disabled
    ? [...new Set([...current, toolId])]
    : current.filter(id => id !== toolId);
  await setSetting('disabled_tools', updated.join(','));
  return updated;
}

module.exports = {
  pool, initDB, get, all, run,
  getSetting, setSetting,
  trackToolUse, trackPageView,
  getDailyUsage, getDisabledTools, setDisabledTool,
  getApprovedDomains, isApprovedDomain, addSchoolDomain, removeSchoolDomain,
  createTeacherProfile, getTeacherProfile,
};

// ── School domain helpers ─────────────────────────────────────────────────────
async function getApprovedDomains() {
  const { rows } = await pool.query(`SELECT domain, school_name FROM school_domains ORDER BY domain`);
  return rows;
}

async function isApprovedDomain(email) {
  if (!email) return false;
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  const { rows } = await pool.query(`SELECT id FROM school_domains WHERE domain = $1`, [domain]);
  return rows.length > 0;
}

async function addSchoolDomain(domain, schoolName, adminId) {
  await pool.query(
    `INSERT INTO school_domains (domain, school_name, approved_by) VALUES ($1,$2,$3)
     ON CONFLICT (domain) DO UPDATE SET school_name=EXCLUDED.school_name`,
    [domain.toLowerCase(), schoolName, adminId]
  );
}

async function removeSchoolDomain(domain) {
  await pool.query(`DELETE FROM school_domains WHERE domain = $1`, [domain.toLowerCase()]);
}

// ── Teacher profile helpers ───────────────────────────────────────────────────
async function createTeacherProfile(userId, schoolName, domain, adminId) {
  await pool.query(
    `INSERT INTO teacher_profiles (user_id, school_name, domain, created_by_admin)
     VALUES ($1,$2,$3,$4) ON CONFLICT (user_id)
     DO UPDATE SET school_name=EXCLUDED.school_name, domain=EXCLUDED.domain`,
    [userId, schoolName, domain, adminId]
  );
}

async function getTeacherProfile(userId) {
  const { rows } = await pool.query(`SELECT * FROM teacher_profiles WHERE user_id=$1`, [userId]);
  return rows[0] || null;
}
