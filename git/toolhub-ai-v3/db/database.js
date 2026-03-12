// ─── Database (sql.js — pure JavaScript SQLite, works on Android/Termux) ──────
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const DB_PATH = path.join(__dirname, 'toolhub.db');

let SQL = null;
let db = null;

function saveDb() {
  if (db && SQL) {
    try {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch(e) { console.error('Save error:', e.message); }
  }
}

setInterval(saveDb, 30000);
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

async function initDB() {
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL,
    role TEXT DEFAULT 'free', avatar_color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME,
    is_active INTEGER DEFAULT 1, paypal_subscription_id TEXT, premium_expires_at DATETIME
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tool_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, tool_id TEXT NOT NULL,
    tool_name TEXT NOT NULL, category TEXT NOT NULL, ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, ip_address TEXT,
    user_id INTEGER, user_agent TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS premium_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    paypal_transaction_id TEXT, amount REAL NOT NULL, plan TEXT NOT NULL,
    status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS paypal_buttons (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, plan_type TEXT NOT NULL,
    button_html TEXT NOT NULL, price REAL NOT NULL, is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE,
    page_views INTEGER DEFAULT 0, tool_uses INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0, premium_revenue REAL DEFAULT 0
  )`);

  const defaults = [
    ['ads_enabled','true'],['free_daily_limit','10'],['premium_price','9.99'],
    ['site_name','ToolHub AI'],
    ['adsense_client', process.env.ADSENSE_CLIENT_ID || 'ca-pub-XXXXXXXXXXXXXXXX'],
    ['adsense_slot_banner', process.env.ADSENSE_SLOT_BANNER || '1234567890'],
    ['adsense_slot_sidebar', process.env.ADSENSE_SLOT_SIDEBAR || '0987654321'],
    ['paypal_client_id', process.env.PAYPAL_CLIENT_ID || ''],
    ['maintenance_mode','false'],
    ['disabled_tools',''],
    ['revenue_earned','0'],
  ];
  for (const [k,v] of defaults) db.run(`INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)`,[k,v]);

  const adminRows = db.exec(`SELECT id FROM users WHERE role='admin'`);
  if (!adminRows.length || !adminRows[0].values.length) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    db.run(`INSERT INTO users (uuid,email,password,name,role) VALUES (?,?,?,'Admin','admin')`,
      [uuidv4(), process.env.ADMIN_EMAIL || 'admin@toolhub.ai', hash]);
    console.log('✅ Admin created:', process.env.ADMIN_EMAIL || 'admin@toolhub.ai');
  }

  const btnRows = db.exec(`SELECT id FROM paypal_buttons LIMIT 1`);
  if (!btnRows.length || !btnRows[0].values.length) {
    db.run(`INSERT INTO paypal_buttons (name,plan_type,button_html,price) VALUES (?,?,?,?)`,
      ['Premium Monthly','monthly',
       `<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
<input type="hidden" name="cmd" value="_xclick">
<input type="hidden" name="business" value="YOUR_PAYPAL_EMAIL">
<input type="hidden" name="item_name" value="ToolHub AI Premium">
<input type="hidden" name="amount" value="9.99">
<input type="hidden" name="currency_code" value="USD">
<button type="submit" class="paypal-btn">Pay $9.99/month via PayPal</button>
</form>`, 9.99]);
  }

  saveDb();
  console.log('✅ Database ready');
  return db;
}

function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) { const r = stmt.getAsObject(); stmt.free(); return r; }
    stmt.free(); return null;
  } catch(e) { console.error('DB get:', e.message); return null; }
}

function all(sql, params = []) {
  try {
    const results = db.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return values.map(row => { const o={}; columns.forEach((c,i)=>o[c]=row[i]); return o; });
  } catch(e) { console.error('DB all:', e.message); return []; }
}

function run(sql, params = []) {
  try {
    db.run(sql, params);
    const r = db.exec('SELECT last_insert_rowid() as id');
    const lastId = r.length ? r[0].values[0][0] : null;
    saveDb();
    return { lastInsertRowid: lastId };
  } catch(e) { console.error('DB run:', e.message); throw e; }
}

function getSetting(key) {
  const r = get('SELECT value FROM settings WHERE key=?',[key]);
  return r ? r.value : null;
}
function setSetting(key, value) {
  run(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,datetime('now'))`,[key,String(value)]);
}
function trackToolUse(userId, toolId, toolName, category, ip) {
  run(`INSERT INTO tool_usage (user_id,tool_id,tool_name,category,ip_address,created_at) VALUES (?,?,?,?,?,datetime('now'))`,
    [userId||null,toolId,toolName,category,ip||'']);
  const today = new Date().toISOString().split('T')[0];
  run(`INSERT INTO daily_stats (date,tool_uses) VALUES (?,1) ON CONFLICT(date) DO UPDATE SET tool_uses=tool_uses+1`,[today]);
}
function trackPageView(page, ip, userId, userAgent) {
  run(`INSERT INTO page_views (page,ip_address,user_id,user_agent,created_at) VALUES (?,?,?,?,datetime('now'))`,
    [page||'/',ip||'',userId||null,userAgent||'']);
  const today = new Date().toISOString().split('T')[0];
  run(`INSERT INTO daily_stats (date,page_views) VALUES (?,1) ON CONFLICT(date) DO UPDATE SET page_views=page_views+1`,[today]);
}
function getDailyUsage(userId, date) {
  const r = get(`SELECT COUNT(*) as count FROM tool_usage WHERE user_id=? AND DATE(created_at)=?`,[userId,date]);
  return r ? (r.count||0) : 0;
}

function getDisabledTools() {
  const val = getSetting('disabled_tools') || '';
  return val ? val.split(',').filter(Boolean) : [];
}
function setDisabledTool(toolId, disabled) {
  const current = getDisabledTools();
  const updated = disabled
    ? [...new Set([...current, toolId])]
    : current.filter(id => id !== toolId);
  setSetting('disabled_tools', updated.join(','));
  return updated;
}
module.exports = { initDB, get, all, run, getSetting, setSetting, trackToolUse, trackPageView, getDailyUsage, saveDb, getDisabledTools, setDisabledTool };
