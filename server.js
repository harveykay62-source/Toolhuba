require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const helmet    = require('helmet');
const compression = require('compression');
const morgan    = require('morgan');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');

// ── Data dirs ─────────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const QUIZ_DATA_DIR = path.join(DATA_DIR, 'quizzes');
[DATA_DIR, QUIZ_DATA_DIR].forEach(dir => {
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch(e) {}
});
global.DATA_DIR = DATA_DIR;

const app  = express();
const PORT = parseInt(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Trust proxy (required on Render / behind load balancers) ──────────────────
// Without this req.ip returns the proxy's IP, breaking per-IP rate limits
app.set('trust proxy', 1);

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Sessions ──────────────────────────────────────────────────────────────────
const { pool: pgPool } = require('./db/database');
app.use(session({
  store: new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'toolhub_secret_change_me_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: IS_PROD },
  name: 'toolhub.sid',
}));

// ── Analytics tracking middleware ─────────────────────────────────────────────
const analytics = require('./routes/analytics');
app.use(analytics.trackingMiddleware);

// ── Rate limits ───────────────────────────────────────────────────────────────
app.use('/api/tools', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/auth',  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/tools',           require('./routes/tools'));
app.use('/api/tools',           require('./routes/tools-extra'));
app.use('/api',                 require('./routes/dashboard'));
app.use('/api/quiz',            require('./routes/quiz'));
app.use('/api/admin/analytics', analytics.router);

// ── /api/init ────────────────────────────────────────────────────────────────
app.get('/api/init', async (req, res) => {
  try {
    const db = require('./db/database');
    const { getAllTools, CATEGORIES, getTrending } = require('./db/tools');
    const [siteName, adsEnabled, adsenseClient, adsenseBanner, maintenance] = await Promise.all([
      db.getSetting('site_name'), db.getSetting('ads_enabled'),
      db.getSetting('adsense_client'), db.getSetting('adsense_slot_banner'),
      db.getSetting('maintenance_mode'),
    ]);
    res.json({
      session: { loggedIn: !!req.session.userId, name: req.session.name || '',
        role: req.session.role || 'guest', avatarColor: req.session.avatarColor || '#10b981',
        isVerifiedEducator: req.session.isVerifiedEducator || false,
        email: req.session.email || '' },
      settings: { siteName: siteName || 'ToolHub AI', adsEnabled: adsEnabled === 'true',
        adsenseClient: adsenseClient || '', adsenseBanner: adsenseBanner || '',
        maintenance: maintenance === 'true' },
      tools: getAllTools(), categories: CATEGORIES, trending: getTrending(),
    });
  } catch(err) {
    console.error('/api/init error:', err.message);
    res.status(500).json({ error: 'Init failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEO-RENDERED PAGE ROUTES
// Every public page gets its own unique <title>, <meta description>, <keywords>,
// canonical URL, Open Graph tags, and JSON-LD structured data so Google
// can index and display each page with a meaningful search snippet.
// ═══════════════════════════════════════════════════════════════════════════════
const SEO = require('./routes/seo');
const { getToolById } = require('./db/tools');
const { getQuizWithQuestions } = require('./db/quiz-db');

const HTML = (res, html) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

// ── Home  / ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => HTML(res, SEO.home(__dirname)));

// ── Login  /login ─────────────────────────────────────────────────────────────
app.get('/login', (req, res) => HTML(res, SEO.login(__dirname)));

// ── Register  /register ───────────────────────────────────────────────────────
app.get('/register', (req, res) => HTML(res, SEO.register(__dirname)));

// ── Dashboard  /dashboard ─────────────────────────────────────────────────────
app.get('/dashboard', (req, res) => HTML(res, SEO.dashboard(__dirname)));

// ── Quiz Hub  /quizzes ────────────────────────────────────────────────────────
app.get('/quizzes', (req, res) => HTML(res, SEO.quizzes(__dirname)));

// ── Quiz Builder  /quizzes/build ──────────────────────────────────────────────
app.get('/quizzes/build', (req, res) => HTML(res, SEO.quizBuild(__dirname)));

// ── Quiz Profile  /quizzes/profile ────────────────────────────────────────────
app.get('/quizzes/profile', (req, res) => HTML(res, SEO.quizProfile(__dirname)));

// ── Individual Tool  /tool/:id ────────────────────────────────────────────────
app.get('/tool/:id', (req, res, next) => {
  const t = getToolById(req.params.id);
  if (!t) return next(); // → 404 / SPA fallback
  HTML(res, SEO.tool(__dirname, t));
});

// ── Individual Quiz  /quiz/:id ────────────────────────────────────────────────
// Fetches the quiz from DB so the title/description are real.
app.get('/quiz/:id', async (req, res, next) => {
  try {
    const quiz = await getQuizWithQuestions(req.params.id);
    HTML(res, SEO.quizPage(__dirname, quiz));
  } catch {
    // If DB unavailable, fall back to generic quiz SEO page
    HTML(res, SEO.quizzes(__dirname));
  }
});

// ── Category pages  /category/:cat ───────────────────────────────────────────
// These give Google crawlable, SEO-rich pages for each category
app.get('/category/:cat', (req, res, next) => {
  const cat = req.params.cat;
  if (!['text', 'media', 'utility'].includes(cat)) return next();
  HTML(res, SEO.categoryPage(__dirname, cat));
});

// ── Admin  /admin — Protected, NOT indexed ────────────────────────────────────
app.get('/admin', (req, res) => {
  if (!req.session || req.session.role !== 'admin') {
    return res.redirect('/login?redirect=/admin&reason=admin_only');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── Dynamic Sitemap ───────────────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  const { getAllTools } = require('./db/tools');
  const { getQuizList } = require('./db/quiz-db');
  const now = new Date().toISOString().split('T')[0];

  const tools = getAllTools().filter(t => t.enabled);

  let quizRows = [];
  try { quizRows = await getQuizList({ status: 'approved', limit: 200 }); } catch {}

  const staticPages = [
    { url: '/',                  priority: '1.0', freq: 'daily'   },
    { url: '/register',          priority: '0.7', freq: 'monthly' },
    { url: '/quizzes',           priority: '0.8', freq: 'daily'   },
    { url: '/quizzes/build',     priority: '0.6', freq: 'weekly'  },
    { url: '/category/text',     priority: '0.9', freq: 'weekly'  },
    { url: '/category/media',    priority: '0.9', freq: 'weekly'  },
    { url: '/category/utility',  priority: '0.9', freq: 'weekly'  },
  ];

  const toolPages = tools.map(t => ({
    url: `/tool/${t.id}`,
    priority: t.trending ? '0.9' : '0.8',
    freq: 'weekly',
  }));

  const quizPages = quizRows.map(q => ({
    url: `/quiz/${q.id}`,
    priority: '0.7',
    freq: 'weekly',
  }));

  const all = [...staticPages, ...toolPages, ...quizPages];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    all.map(p =>
      `  <url>\n    <loc>${SEO.SITE_URL}${p.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    ).join('\n') + `\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

// ── Robots.txt ────────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /admin\n` +
    `Disallow: /dashboard\n` +
    `Disallow: /api/\n` +
    `Disallow: /login\n\n` +
    `Sitemap: ${SEO.SITE_URL}/sitemap.xml`
  );
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
function startServer(port) {
  const server = app.listen(port, '0.0.0.0');
  server.on('listening', () => {
    console.log(`\n✅ ToolHub AI → http://localhost:${port}`);
    console.log(`   Admin → http://localhost:${port}/admin  (admin@toolhub.ai / Admin@123)\n`);
  });
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') startServer(port + 1);
    else { console.error('Server error:', err.message); process.exit(1); }
  });
}

const { initDB, getDisabledTools } = require('./db/database');
const { initQuizDB } = require('./db/quiz-db');
const { setDisabledTools } = require('./db/tools');
(async () => {
  try {
    await initDB();
    await initQuizDB();
    setDisabledTools(await getDisabledTools());
    startServer(PORT);
  } catch (err) {
    console.error('DB init failed:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
