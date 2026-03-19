require('dotenv').config();
const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const session     = require('express-session');
const pgSession   = require('connect-pg-simple')(session);
const rateLimit   = require('express-rate-limit');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const cors        = require('cors');
const path        = require('path');
const fs          = require('fs');

// ── Data dirs ─────────────────────────────────────────────────────────────────
const DATA_DIR      = process.env.DATA_DIR || path.join(__dirname, 'data');
const QUIZ_DATA_DIR = path.join(DATA_DIR, 'quizzes');
[DATA_DIR, QUIZ_DATA_DIR].forEach(dir => {
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch(e) {}
});
global.DATA_DIR = DATA_DIR;

const app    = express();
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

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
const sessionMiddleware = session({
  store: new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'toolhub_secret_change_me_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: IS_PROD },
  name: 'toolhub.sid',
});
app.use(sessionMiddleware);

// ── Socket.io (shares express sessions) ───────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  transports: ['websocket','polling'],
});
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});
require('./lib/socketHandler')(io);
require('./lib/battleSocket')(io);
app.set('io', io); // make io available in routes if needed

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
app.use('/api/multiplayer',     require('./routes/multiplayer'));
app.use('/api/politibattle',    require('./routes/politibattle'));

// ── /api/init ─────────────────────────────────────────────────────────────────
app.get('/api/init', async (req, res) => {
  try {
    const db = require('./db/database');
    const { getAllTools, CATEGORIES, getTrending } = require('./db/tools');
    const [siteName, adsEnabled, adsenseClient, adsenseBanner, maintenance] = await Promise.all([
      db.getSetting('site_name'), db.getSetting('ads_enabled'),
      db.getSetting('adsense_client'), db.getSetting('adsense_slot_banner'),
      db.getSetting('maintenance_mode'),
    ]);

    const isStudent = req.session.isStudent || req.session.role === 'student';
    const showAds   = adsEnabled === 'true' && !isStudent;

    res.json({
      session: {
        loggedIn: !!req.session.userId, name: req.session.name || '',
        role: req.session.role || 'guest', avatarColor: req.session.avatarColor || '#10b981',
        isVerifiedEducator: req.session.isVerifiedEducator || false,
        isStudent: req.session.isStudent || false,
        isTeacher: req.session.isTeacher || false,
        email: req.session.email || '',
      },
      settings: {
        siteName: siteName || 'ToolHub AI',
        adsEnabled: showAds,          // false for students
        adsenseClient: adsenseClient || '',
        adsenseBanner: adsenseBanner || '',
        maintenance: maintenance === 'true',
        googleClientId: process.env.GOOGLE_CLIENT_ID || '394997878191-osk9fvaq9s6fm3sa5a613cbe1e5916b2.apps.googleusercontent.com',
      },
      tools: getAllTools(), categories: CATEGORIES, trending: getTrending(),
    });
  } catch(err) {
    console.error('/api/init error:', err.message);
    res.status(500).json({ error: 'Init failed' });
  }
});

// ── SEO page routes ───────────────────────────────────────────────────────────
const SEO = require('./routes/seo');
const { getToolById } = require('./db/tools');
const { getQuizWithQuestions } = require('./db/quiz-db');

const HTML = (res, html) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

app.get('/',                (req, res) => HTML(res, SEO.home(__dirname)));
app.get('/login',           (req, res) => HTML(res, SEO.login(__dirname)));
app.get('/register',        (req, res) => HTML(res, SEO.register(__dirname)));
app.get('/dashboard',       (req, res) => HTML(res, SEO.dashboard(__dirname)));
app.get('/quizzes',         (req, res) => HTML(res, SEO.quizzes(__dirname)));
app.get('/quizzes/build',   (req, res) => HTML(res, SEO.quizBuild(__dirname)));
app.get('/quizzes/profile', (req, res) => HTML(res, SEO.quizProfile(__dirname)));

app.get('/tool/:id', (req, res, next) => {
  const t = getToolById(req.params.id);
  if (!t) return next();
  HTML(res, SEO.tool(__dirname, t));
});

app.get('/quiz/:id', async (req, res) => {
  try {
    const quiz = await getQuizWithQuestions(req.params.id);
    HTML(res, SEO.quizPage(__dirname, quiz));
  } catch {
    HTML(res, SEO.quizzes(__dirname));
  }
});

app.get('/category/:cat', (req, res, next) => {
  const cat = req.params.cat;
  if (!['text','media','utility'].includes(cat)) return next();
  HTML(res, SEO.categoryPage(__dirname, cat));
});

// ── Multiplayer pages (serve standalone HTML files directly) ──────────────────
app.get('/multiplayer',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'multiplayer.html')));
app.get('/host-game',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'host-game.html')));
app.get('/join-game',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'join-game.html')));
app.get('/game-room',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'game-room.html')));
app.get('/leaderboard',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')));
app.get('/politibattle', (req, res) => res.sendFile(path.join(__dirname, 'public', 'politibattle.html')));
app.get('/politibattle-multi', (req, res) => res.sendFile(path.join(__dirname, 'public', 'politibattle-multi.html')));
app.get('/arena', (req, res) => res.sendFile(path.join(__dirname, 'public', 'arena.html')));
app.get('/privacy',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));

// ── Teacher dashboard ─────────────────────────────────────────────────────────
app.get('/teacher', (req, res) => {
  if (!req.session || !['teacher','admin'].includes(req.session.role)) {
    return res.redirect('/login?redirect=/teacher');
  }
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// ── Admin ─────────────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  if (!req.session || req.session.role !== 'admin') {
    return res.redirect('/login?redirect=/admin&reason=admin_only');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── Dynamic Sitemap ───────────────────────────────────────────────────────────
let _sitemapCache = { xml: '', ts: 0 };
app.get('/sitemap.xml', async (req, res) => {
  // Cache for 1 hour
  if (_sitemapCache.xml && Date.now() - _sitemapCache.ts < 3600000) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.send(_sitemapCache.xml);
  }
  const { getAllTools } = require('./db/tools');
  const { getQuizList } = require('./db/quiz-db');
  const now = new Date().toISOString().split('T')[0];
  const tools = getAllTools().filter(t => t.enabled);
  let quizRows = [];
  try { quizRows = await getQuizList({ status: 'approved', limit: 500 }); } catch {}

  const pages = [
    { url: '/',                 priority: '1.0', freq: 'daily'   },
    { url: '/register',         priority: '0.6', freq: 'monthly' },
    { url: '/privacy',          priority: '0.3', freq: 'yearly'  },
    { url: '/quizzes',          priority: '0.8', freq: 'daily'   },
    { url: '/quizzes/build',    priority: '0.6', freq: 'weekly'  },
    { url: '/multiplayer',      priority: '0.7', freq: 'weekly'  },
    { url: '/category/text',    priority: '0.9', freq: 'weekly'  },
    { url: '/category/media',   priority: '0.9', freq: 'weekly'  },
    { url: '/category/utility', priority: '0.9', freq: 'weekly'  },
    ...tools.map(t => ({ url: `/tool/${t.id}`, priority: t.trending ? '0.9' : '0.8', freq: 'weekly' })),
    ...quizRows.map(q => ({ url: `/quiz/${q.id}`, priority: '0.7', freq: 'weekly' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map(p =>
      `  <url>\n    <loc>${SEO.SITE_URL}${p.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    ).join('\n') + `\n</urlset>`;

  _sitemapCache = { xml, ts: Date.now() };
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(
    `User-agent: *\nAllow: /\nAllow: /tool/\nAllow: /quiz/\nAllow: /category/\nAllow: /multiplayer\nAllow: /privacy\n\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /api/\nDisallow: /login\nDisallow: /teacher\nDisallow: /host-game\nDisallow: /join-game\nDisallow: /game-room\nDisallow: /leaderboard\nDisallow: /quizzes/profile\n\nSitemap: ${SEO.SITE_URL}/sitemap.xml`
  );
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
function startServer(port) {
  server.listen(port, '0.0.0.0');
  server.on('listening', () => {
    console.log(`\n✅ ToolHub AI → http://localhost:${port}`);
    console.log(`   Admin      → http://localhost:${port}/admin  (admin@toolhub.ai / Admin@123)`);
    console.log(`   Multiplayer → http://localhost:${port}/multiplayer\n`);
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
