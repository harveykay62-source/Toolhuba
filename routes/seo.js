'use strict';
/**
 * ToolHub AI — SEO Helper
 * Injects fully customised <title>, <meta>, Open Graph,
 * Twitter Card, and JSON-LD structured data into the SPA
 * index.html shell for every server-rendered route so that
 * every sub-page gets its own rich Google search listing.
 */

const fs   = require('fs');
const path = require('path');

const SITE_NAME = 'ToolHub AI';
const SITE_URL  = process.env.SITE_URL || 'https://toolhuba.onrender.com';

// Cache the template per dir — reset on process restart
const _tplCache = new Map();
function getTemplate(dir) {
  if (!_tplCache.has(dir)) {
    _tplCache.set(dir, fs.readFileSync(path.join(dir, 'public', 'index.html'), 'utf8'));
  }
  return _tplCache.get(dir);
}

// ── Tag-stripping helpers ─────────────────────────────────────────────────────
const STRIP = [
  /<title>[^<]*<\/title>/i,
  /<meta\s+name="description"[^>]*>/i,
  /<meta\s+name="keywords"[^>]*>/i,
  /<meta\s+name="robots"[^>]*>/i,
  /<link\s+rel="canonical"[^>]*>/i,
  /<meta\s+property="og:title"[^>]*>/i,
  /<meta\s+property="og:description"[^>]*>/i,
  /<meta\s+property="og:url"[^>]*>/i,
  /<meta\s+property="og:type"[^>]*>/i,
  /<meta\s+property="og:image"[^>]*>/i,
  /<meta\s+name="twitter:card"[^>]*>/i,
  /<meta\s+name="twitter:title"[^>]*>/i,
  /<meta\s+name="twitter:description"[^>]*>/i,
  /<meta\s+name="twitter:image"[^>]*>/i,
  /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
];

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Build a complete <head> injection block and return the
 * final HTML string ready to send to the browser.
 *
 * @param {string}  __dirname  - server root (pass from server.js)
 * @param {object}  opts
 *   title       {string}  — full <title> text
 *   description {string}  — meta description (max ~160 chars for Google)
 *   keywords    {string}  — comma-separated keywords
 *   canonical   {string}  — absolute URL (no trailing slash)
 *   ogType      {string}  — default 'website'
 *   robots      {string}  — default 'index, follow'
 *   jsonLd      {object|null}  — structured data object (will be stringified)
 */
function buildPage(dir, opts) {
  const {
    title,
    description,
    keywords  = '',
    canonical,
    ogType    = 'website',
    robots    = 'index, follow',
    jsonLd    = null,
  } = opts;

  const safeTitle = esc(title);
  const safeDesc  = esc(description);
  const safeKw    = esc(keywords);
  const safeUrl   = esc(canonical);

  const block = [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDesc}">`,
    keywords ? `<meta name="keywords" content="${safeKw}">` : '',
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${safeUrl}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${safeDesc}">`,
    `<meta property="og:url" content="${safeUrl}">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:image" content="${esc(SITE_URL)}/og-image.png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${safeTitle}">`,
    `<meta name="twitter:description" content="${safeDesc}">`,
    `<meta name="twitter:image" content="${esc(SITE_URL)}/og-image.png">`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>` : '',
  ].filter(Boolean).join('\n');

  let html = getTemplate(dir);
  // Strip all old generic tags
  for (const re of STRIP) html = html.replace(re, '');
  // Inject new block right after <head>
  html = html.replace('<head>', '<head>\n' + block + '\n');

  return html;
}

// ── Page definitions ──────────────────────────────────────────────────────────

// HOME  /
function home(dir) {
  return buildPage(dir, {
    title: 'ToolHub AI — 66 Free Online Tools | AI Detector, Humanizer, Paraphraser & More',
    description: '66 free online tools including AI content detector, AI humanizer, paraphraser, grammar fixer, image converter, QR code generator, calculators, and more. No sign-up required — instant results in your browser.',
    keywords: 'free online tools, AI detector, AI humanizer, paraphraser, grammar fixer, text tools, image tools, QR code generator, word counter, password generator, unit converter, calculator, base64 encoder',
    canonical: SITE_URL + '/',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': SITE_NAME,
      'url': SITE_URL,
      'description': '66 free online tools — AI detector, humanizer, paraphraser, image tools, calculators and more. No account needed.',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${SITE_URL}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      },
      'publisher': {
        '@type': 'Organization',
        'name': SITE_NAME,
        'url': SITE_URL
      }
    }
  });
}

// INDIVIDUAL TOOL  /tool/:id
function tool(dir, toolObj) {
  const toolUrl = `${SITE_URL}/tool/${toolObj.id}`;
  const catNames = { text: 'Text Tool', media: 'Media Tool', utility: 'Utility Tool' };
  const catName  = catNames[toolObj.category] || 'Online Tool';
  const kws = [
    toolObj.name,
    ...toolObj.tags,
    'free online tool',
    catName,
    SITE_NAME,
    toolObj.name + ' online',
    toolObj.name + ' free',
    'no sign up ' + toolObj.name,
  ].join(', ');

  // Build a longer, richer description that Google will reward
  const longDesc = `${toolObj.description} Use ${toolObj.name} free online — no account or download required. ${catName} by ${SITE_NAME}.`;

  return buildPage(dir, {
    title: `${toolObj.name} — Free Online ${catName} | ${SITE_NAME}`,
    description: longDesc.slice(0, 300),
    keywords: kws,
    canonical: toolUrl,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': toolObj.name,
      'description': toolObj.description,
      'url': toolUrl,
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem': 'Web',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'featureList': toolObj.tags,
      'provider': { '@type': 'Organization', 'name': SITE_NAME, 'url': SITE_URL },
      'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': SITE_URL }
    }
  });
}

// QUIZ HUB  /quizzes
function quizzes(dir) {
  return buildPage(dir, {
    title: 'Free Online Quizzes — General Knowledge, Science, Geography & More | ToolHub AI',
    description: 'Play free interactive quizzes on general knowledge, science, geography, pop culture and more. Challenge yourself, compete on leaderboards, and build your own quizzes — no sign-up required.',
    keywords: 'free online quizzes, general knowledge quiz, science quiz, geography quiz, pop culture quiz, trivia quiz, interactive quiz, quiz game, quiz builder, leaderboard',
    canonical: SITE_URL + '/quizzes',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Free Online Quizzes — ToolHub AI',
      'description': 'Play free interactive quizzes on dozens of topics — or build your own in minutes.',
      'url': SITE_URL + '/quizzes',
      'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': SITE_URL }
    }
  });
}

// INDIVIDUAL QUIZ  /quiz/:id
function quizPage(dir, quizObj) {
  if (!quizObj) return quizzes(dir); // fallback if quiz not found
  const quizUrl = `${SITE_URL}/quiz/${quizObj.id}`;
  const catLabel = (quizObj.category || 'general').replace(/-/g, ' ');
  const emoji = quizObj.cover_emoji || '🎮';
  const plays = parseInt(quizObj.plays || 0).toLocaleString();
  const qCount = quizObj.questions_count || quizObj.questions?.length || 10;

  return buildPage(dir, {
    title: `${quizObj.title} — Free ${catLabel} Quiz (${qCount} Questions) | ${SITE_NAME}`,
    description: quizObj.description
      ? `${quizObj.description.slice(0, 200)} Play this free ${catLabel} quiz with ${qCount} questions. ${plays} plays so far.`
      : `Play "${quizObj.title}" — a free ${catLabel} quiz with ${qCount} questions on ${SITE_NAME}. ${plays} plays. No sign-up needed.`,
    keywords: [
      quizObj.title,
      catLabel + ' quiz',
      'free quiz',
      'trivia',
      'online quiz',
      SITE_NAME,
      quizObj.tags || '',
    ].filter(Boolean).join(', '),
    canonical: quizUrl,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Quiz',
      'name': quizObj.title,
      'description': quizObj.description || `A free ${catLabel} quiz with ${qCount} questions.`,
      'url': quizUrl,
      'numberOfQuestions': qCount,
      'educationalLevel': 'general',
      'about': { '@type': 'Thing', 'name': catLabel },
      'provider': { '@type': 'Organization', 'name': SITE_NAME, 'url': SITE_URL },
      'interactivityType': 'active',
      'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': SITE_URL }
    }
  });
}

// QUIZ BUILDER  /quizzes/build
function quizBuild(dir) {
  return buildPage(dir, {
    title: 'Build Your Own Quiz — Free Quiz Creator | ToolHub AI',
    description: 'Create and publish your own interactive quiz for free. Add multiple-choice questions, set time limits, enable wildcards, and share with the world in minutes. No sign-up required to start building.',
    keywords: 'quiz builder, create a quiz, quiz maker, make a quiz free, online quiz creator, custom quiz, quiz generator, interactive quiz builder',
    canonical: SITE_URL + '/quizzes/build',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'ToolHub AI Quiz Builder',
      'description': 'Free online quiz creator — build and publish interactive quizzes in minutes.',
      'url': SITE_URL + '/quizzes/build',
      'applicationCategory': 'EducationalApplication',
      'operatingSystem': 'Web',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'provider': { '@type': 'Organization', 'name': SITE_NAME, 'url': SITE_URL }
    }
  });
}

// QUIZ PROFILE  /quizzes/profile
function quizProfile(dir) {
  return buildPage(dir, {
    title: 'My Quiz Profile & Creator Studio | ToolHub AI',
    description: 'View your quiz history, scores, leaderboard rankings, and manage the quizzes you have created. Track your progress across all quiz categories on ToolHub AI.',
    keywords: 'quiz profile, quiz history, quiz leaderboard, quiz scores, quiz creator studio, my quizzes',
    canonical: SITE_URL + '/quizzes/profile',
    robots: 'noindex, follow', // private user page
    jsonLd: null,
  });
}

// LOGIN  /login
function login(dir) {
  return buildPage(dir, {
    title: 'Sign In to ToolHub AI — Access Free Online Tools',
    description: 'Sign in to your ToolHub AI account to access all 66 free online tools, track your usage history, and unlock premium features including unlimited tool uses and an ad-free experience.',
    keywords: 'ToolHub AI login, sign in, access tools, ToolHub account',
    canonical: SITE_URL + '/login',
    robots: 'noindex, follow', // login pages should not be indexed
    jsonLd: null,
  });
}

// REGISTER  /register
function register(dir) {
  return buildPage(dir, {
    title: 'Create a Free Account — ToolHub AI | 66 Online Tools',
    description: 'Sign up for a free ToolHub AI account to save your tool usage history, increase your daily tool limit from 3 to 10 uses, and access exclusive features. No credit card required.',
    keywords: 'ToolHub AI sign up, create account, free account, register, join ToolHub',
    canonical: SITE_URL + '/register',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Create a Free ToolHub AI Account',
      'description': 'Sign up free for 10 tool uses per day, usage history, and more.',
      'url': SITE_URL + '/register',
      'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': SITE_URL }
    }
  });
}

// DASHBOARD  /dashboard
function dashboard(dir) {
  return buildPage(dir, {
    title: 'My Dashboard — ToolHub AI',
    description: 'View your ToolHub AI usage statistics, tool history, and account settings. Upgrade to Premium for unlimited tool uses and an ad-free experience.',
    keywords: 'ToolHub dashboard, tool history, usage stats',
    canonical: SITE_URL + '/dashboard',
    robots: 'noindex, follow', // private
    jsonLd: null,
  });
}

// TEXT CATEGORY  (served if someone navigates to /?category=text)
// These are SPA routes handled client-side, but we expose them for any
// server-side crawl via the main / route's sitemap entries:
function categoryPage(dir, cat) {
  const catData = {
    text: {
      title: 'Free Text Tools Online — AI Detector, Paraphraser, Grammar Fixer & More | ToolHub AI',
      description: '26 free text tools: AI content detector, AI humanizer, paraphraser, grammar fixer, word counter, tone analyzer, text cleaner, summarizer, cliché detector, and more. No sign-up needed.',
      kws: 'free text tools, AI detector, paraphraser, grammar fixer, word counter, text summarizer, AI humanizer, sentence expander, tone analyzer, readability checker',
    },
    media: {
      title: 'Free Media & Image Tools — QR Generator, Image Converter, Color Picker | ToolHub AI',
      description: '12 free media tools: image converter, image resizer, QR code generator, color palette generator, base64 encoder, OCR image-to-text, favicon generator, CSS gradient generator and more.',
      kws: 'free image tools, QR code generator, image converter, image resizer, color picker, base64 encoder, OCR, favicon generator, GIF maker, screenshot resizer',
    },
    utility: {
      title: 'Free Utility Tools — Calculator, Currency Converter, JSON Formatter | ToolHub AI',
      description: '28 free utility tools: scientific calculator, currency converter, JSON formatter, password generator, unit converter, UUID generator, regex tester, age calculator, timezone converter, and more.',
      kws: 'free utility tools, calculator, currency converter, JSON formatter, password generator, UUID generator, unit converter, regex tester, age calculator, pomodoro timer',
    },
  };
  const data = catData[cat] || catData.text;
  return buildPage(dir, {
    title: data.title,
    description: data.description,
    keywords: data.kws,
    canonical: `${SITE_URL}/category/${cat}`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': data.title,
      'description': data.description,
      'url': `${SITE_URL}/category/${cat}`,
      'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': SITE_URL }
    }
  });
}

module.exports = { home, tool, quizzes, quizPage, quizBuild, quizProfile, login, register, dashboard, categoryPage, SITE_URL, SITE_NAME };
