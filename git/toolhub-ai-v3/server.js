require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Sessions ──────────────────────────────────────────────────────────────────
const sessionsDir = path.join(__dirname, 'db', 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

app.use(session({
  store: new FileStore({ path: sessionsDir, ttl: 604800, retries: 1, logFn: () => {} }),
  secret: process.env.SESSION_SECRET || 'toolhub_secret_change_me_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' },
  name: 'toolhub.sid'
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/tools', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/auth',  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/tools', require('./routes/tools-extra'));
app.use('/api',       require('./routes/dashboard'));

// ── Init data endpoint ────────────────────────────────────────────────────────
app.get('/api/init', (req, res) => {
  const db = require('./db/database');
  const { getAllTools, CATEGORIES, getTrending } = require('./db/tools');
  res.json({
    session: {
      loggedIn: !!req.session.userId,
      name: req.session.name || '',
      role: req.session.role || 'guest',
      avatarColor: req.session.avatarColor || '#10b981'
    },
    settings: {
      siteName: db.getSetting('site_name') || 'ToolHub AI',
      adsEnabled: db.getSetting('ads_enabled') === 'true',
      adsenseClient: db.getSetting('adsense_client') || '',
      adsenseBanner: db.getSetting('adsense_slot_banner') || '',
      maintenance: db.getSetting('maintenance_mode') === 'true',
    },
    tools: getAllTools(),
    categories: CATEGORIES,
    trending: getTrending()
  });
});

// ── SPA Catch-all ─────────────────────────────────────────────────────────────
const serveApp = (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'));
['/', '/tool/:id', '/dashboard', '/admin', '/login', '/register'].forEach(r => app.get(r, serveApp));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
function startServer(port) {
  const server = app.listen(port, '0.0.0.0');
  server.on('listening', () => {
    console.log(`\n✅ ToolHub AI running at http://localhost:${port}`);
    console.log(`   Admin: ${process.env.ADMIN_EMAIL || 'admin@toolhub.ai'} / Admin@123\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') startServer(port + 1);
    else { console.error('Server error:', err.message); process.exit(1); }
  });
}

const { initDB, getDisabledTools } = require('./db/database');
const { setDisabledTools, getAllTools } = require('./db/tools');
initDB().then(() => {
  // Load persisted disabled tools from DB into memory
  setDisabledTools(getDisabledTools());
  startServer(PORT);
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});

module.exports = app;
