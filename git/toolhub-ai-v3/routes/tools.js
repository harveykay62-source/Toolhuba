/**
 * ToolHub AI — Tool Routes
 * Text tools are modular — each lives in routes/api/text/.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkUsageLimit } = require('../middleware/auth');
const { getToolById, searchTools, getAllTools, isEnabled } = require('../db/tools');
const QRCode = require('qrcode');

// ── Modular text-tool imports ─────────────────────────────────────────────────
const Humanizer    = require('./api/text/humanizer');
const Paraphraser  = require('./api/text/paraphraser');
const Summarizer   = require('./api/text/summarizer');
const GrammarFixer = require('./api/text/grammarFixer');
const WordCounter  = require('./api/text/wordCounter');
const PasswordGen  = require('./api/text/passwordGenerator');
// ── v4 new tools ───────────────────────────────────────────────────────────────
const ToneAnalyzer     = require('./api/text/toneAnalyzer');
const SentenceExpander = require('./api/text/sentenceExpander');
const TextCleaner      = require('./api/text/textCleaner');
const BulletPoints     = require('./api/text/bulletPoints');
const ClicheDetector   = require('./api/text/clicheDetector');
// ── v5 new tools ───────────────────────────────────────────────────────────────
const AIDetector       = require('./api/text/aiDetector');

// ─── Helper: track usage ──────────────────────────────────────────────────────
function track(req, toolId) {
  const tool = getToolById(toolId);
  if (tool) db.trackToolUse(req.session.userId || null, toolId, tool.name, tool.category, req.ip);
}

// Middleware: reject requests to disabled tools
function checkToolEnabled(toolId) {
  return (req, res, next) => {
    if (!isEnabled(toolId)) {
      return res.status(403).json({ error: 'This tool is currently disabled by the administrator.' });
    }
    next();
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────
router.get('/search', (req, res) => {
  const { q } = req.query;
  res.json({ tools: q ? searchTools(q) : getAllTools().filter(t => t.enabled) });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

// ── TEXT TOOL ROUTES (delegated to modular files) ──────────────────────────
// Each tool module (humanizer.js, paraphraser.js, etc.) handles all logic.
// This router only manages HTTP transport: parse → call module → respond.

// ─── Humanizer ────────────────────────────────────────────────────────────────
router.post('/ai-humanizer', checkToolEnabled('ai-humanizer'), checkUsageLimit, (req, res) => {
  const { text } = req.body;
  const output = Humanizer.run(text);
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'ai-humanizer');
  res.json(output);
});

// ─── Paraphraser ─────────────────────────────────────────────────────────────
router.post('/paraphraser', checkToolEnabled('paraphraser'), checkUsageLimit, (req, res) => {
  const { text, mode, count } = req.body;
  const output = Paraphraser.run(text, { mode, count });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'paraphraser');
  res.json(output);
});

// ─── Summarizer ───────────────────────────────────────────────────────────────
router.post('/summarizer', checkToolEnabled('summarizer'), checkUsageLimit, (req, res) => {
  const { text, length } = req.body;
  const output = Summarizer.run(text, { length });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'summarizer');
  res.json(output);
});

// ─── Grammar Fixer ───────────────────────────────────────────────────────────
router.post('/grammar-fixer', checkToolEnabled('grammar-fixer'), checkUsageLimit, (req, res) => {
  const { text } = req.body;
  const output = GrammarFixer.run(text);
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'grammar-fixer');
  res.json(output);
});

// ─── Word / Character Counter ─────────────────────────────────────────────────
router.post('/word-counter', (req, res) => {
  const text = req.body.text;
  if (text === undefined) return res.status(400).json({ error: 'Text field is required.' });
  const output = WordCounter.run(text);
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'word-counter');
  res.json(output);
});

// ─── Case Converter ───────────────────────────────────────────────────────────
router.post('/case-converter', (req, res) => {
  const { text, mode } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required.' });

  const smallWords = new Set(['a','an','the','and','but','or','nor','for','yet','so','in','on','at','to','by','up','as','of','off','per','via']);
  let result;

  switch (mode) {
    case 'upper':    result = text.toUpperCase(); break;
    case 'lower':    result = text.toLowerCase(); break;
    case 'title':
      result = text.toLowerCase().replace(/\b\w+/g, (w, idx) =>
        idx > 0 && smallWords.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1));
      result = result.replace(/^\w/, c => c.toUpperCase());
      break;
    case 'sentence':
      result = text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase()); break;
    case 'camel':
      result = text.trim().toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()); break;
    case 'pascal':
      result = text.trim().toLowerCase()
        .replace(/(^|[^a-zA-Z0-9]+)(.)/g, (_, __, c) => c.toUpperCase()); break;
    case 'snake':
      result = text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); break;
    case 'kebab':
      result = text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); break;
    case 'alternating':
      result = text.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''); break;
    case 'inverse':
      result = text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''); break;
    default:
      return res.status(400).json({ error: 'Invalid mode.' });
  }

  track(req, 'case-converter');
  res.json({ result });
});

// ─── Password Generator ───────────────────────────────────────────────────────
router.post('/password-generator', (req, res) => {
  const {
    length, count, uppercase, lowercase, numbers, symbols,
    exclude, noAmbiguous, noRepeat, mode, wordCount, separator
  } = req.body;

  const output = PasswordGen.run({
    length, count, uppercase, lowercase, numbers, symbols,
    exclude, noAmbiguous, noRepeat, mode, wordCount, separator
  });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'password-generator');
  res.json(output);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/qr-generator', checkUsageLimit, async (req, res) => {
  try {
    const { text, size = 300, color = '#000000', bgcolor = '#ffffff' } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter text or a URL.' });
    if (text.length > 2953) return res.status(400).json({ error: 'Content too long for a QR code.' });
    const safeSize = Math.min(Math.max(parseInt(size) || 300, 100), 1000);
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: safeSize, color: { dark: color || '#000000', light: bgcolor || '#ffffff' }, margin: 2, errorCorrectionLevel: 'M',
    });
    track(req, 'qr-generator');
    res.json({ result: qrDataUrl, size: safeSize });
  } catch (err) {
    res.status(500).json({ error: 'QR code generation failed. Please try again.' });
  }
});

router.post('/yt-thumbnail', checkUsageLimit, (req, res) => {
  const { url } = req.body;
  if (!url || !url.trim()) return res.status(400).json({ error: 'Please enter a YouTube URL.' });

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  let videoId = null;
  for (const p of patterns) { const m = url.match(p); if (m) { videoId = m[1]; break; } }
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL. Please paste the full video URL.' });

  const thumbnails = {
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    high:   `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    default:`https://img.youtube.com/vi/${videoId}/default.jpg`,
  };
  track(req, 'yt-thumbnail');
  res.json({ videoId, thumbnails });
});

router.post('/color-palette', (req, res) => {
  const { color, scheme = 'analogous', count = 5 } = req.body;
  if (!color) return res.status(400).json({ error: 'Please provide a base color.' });
  const hexClean = color.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hexClean)) return res.status(400).json({ error: 'Invalid hex color. Use format #RRGGBB.' });

  const r = parseInt(hexClean.substr(0, 2), 16);
  const g = parseInt(hexClean.substr(2, 2), 16);
  const b = parseInt(hexClean.substr(4, 2), 16);
  const [h, s, l] = rgbToHsl(r, g, b);
  const n = Math.min(Math.max(parseInt(count) || 5, 2), 10);
  const palette = [];

  switch (scheme) {
    case 'analogous':
      for (let i = 0; i < n; i++) palette.push(hslToHex((h + (i - Math.floor(n / 2)) * 30 + 360) % 360, s, l)); break;
    case 'monochromatic':
      for (let i = 0; i < n; i++) palette.push(hslToHex(h, s, 10 + (80 / (n - 1)) * i)); break;
    case 'complementary':
      palette.push(hslToHex(h, s, l)); palette.push(hslToHex((h + 180) % 360, s, l));
      for (let i = 2; i < n; i++) palette.push(hslToHex((h + (i % 2 === 0 ? 15 : 195)) % 360, s, Math.max(20, l - 10 + i * 5))); break;
    case 'triadic':
      for (let i = 0; i < n; i++) palette.push(hslToHex((h + i * (360 / Math.max(n, 3))) % 360, s, l)); break;
    default:
      return res.status(400).json({ error: 'Invalid scheme. Use: analogous, monochromatic, complementary, or triadic.' });
  }

  const enriched = palette.map(hex => {
    const hr = parseInt(hex.slice(1, 3), 16), hg = parseInt(hex.slice(3, 5), 16), hb = parseInt(hex.slice(5, 7), 16);
    return { hex, rgb: `rgb(${hr}, ${hg}, ${hb})` };
  });

  track(req, 'color-palette');
  res.json({ palette: enriched, base: '#' + hexClean });
});

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

router.post('/base64', (req, res) => {
  const { text, mode } = req.body;
  if (!text) return res.status(400).json({ error: 'Input is required.' });
  if (!['encode', 'decode'].includes(mode)) return res.status(400).json({ error: 'Mode must be encode or decode.' });
  try {
    let result;
    if (mode === 'encode') {
      result = Buffer.from(text, 'utf8').toString('base64');
    } else {
      if (!/^[A-Za-z0-9+/\s]*={0,2}$/.test(text.trim())) return res.status(400).json({ error: 'Invalid Base64 input.' });
      result = Buffer.from(text.trim().replace(/\s/g, ''), 'base64').toString('utf8');
    }
    track(req, 'base64');
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: 'Conversion failed. Check your input.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/timestamp-converter', (req, res) => {
  const { value, mode } = req.body;
  if (!value || !value.toString().trim()) return res.status(400).json({ error: 'Please enter a value to convert.' });
  try {
    let result = {};
    if (mode === 'toHuman') {
      let ts = parseFloat(value);
      if (isNaN(ts)) return res.status(400).json({ error: 'Invalid timestamp. Enter a Unix timestamp number.' });
      if (ts > 1e12) ts = ts / 1000;
      const date = new Date(ts * 1000);
      if (isNaN(date.getTime())) return res.status(400).json({ error: 'Timestamp out of range.' });
      result = {
        utc: date.toUTCString(), iso: date.toISOString(),
        local: date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' }),
        relative: getRelativeTime(date),
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      };
    } else {
      const date = new Date(value);
      if (isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date format. Try "2024-01-15" or "January 15 2024".' });
      result = { unix: Math.floor(date.getTime() / 1000), milliseconds: date.getTime(), iso: date.toISOString(), utc: date.toUTCString() };
    }
    track(req, 'timestamp-converter');
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: 'Conversion failed. Please check your input.' });
  }
});

function getRelativeTime(date) {
  const secs = Math.floor((new Date() - date) / 1000);
  const abs = Math.abs(secs), future = secs < 0;
  const pre = future ? 'in ' : '', suf = future ? '' : ' ago';
  if (abs < 60) return `${pre}${abs} seconds${suf}`;
  if (abs < 3600) return `${pre}${Math.floor(abs / 60)} minutes${suf}`;
  if (abs < 86400) return `${pre}${Math.floor(abs / 3600)} hours${suf}`;
  if (abs < 2592000) return `${pre}${Math.floor(abs / 86400)} days${suf}`;
  return `${pre}${Math.floor(abs / 2592000)} months${suf}`;
}

router.post('/json-formatter', (req, res) => {
  const { text, mode = 'format', indent = 2 } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some JSON.' });
  try {
    const parsed = JSON.parse(text);
    let result;
    const spaces = Math.min(Math.max(parseInt(indent) || 2, 1), 8);
    if (mode === 'minify') result = JSON.stringify(parsed);
    else if (mode === 'sort') result = JSON.stringify(sortKeys(parsed), null, spaces);
    else result = JSON.stringify(parsed, null, spaces);
    track(req, 'json-formatter');
    res.json({ result, valid: true });
  } catch (err) {
    res.status(400).json({ error: `Invalid JSON: ${err.message}`, valid: false });
  }
});

function sortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = sortKeys(obj[k]); return acc; }, {});
  }
  return obj;
}

const nameData = {
  male: ['James', 'Oliver', 'Henry', 'Sebastian', 'Theodore', 'Maxwell', 'Harrison', 'Elliot', 'Archer', 'Jasper', 'Atticus', 'Ezra', 'Finn', 'Leo', 'Miles', 'Noah', 'Ethan', 'Liam', 'Lucas', 'Mason'],
  female: ['Aurora', 'Celeste', 'Vivienne', 'Isadora', 'Penelope', 'Evangeline', 'Seraphina', 'Ophelia', 'Arabella', 'Valentina', 'Lydia', 'Iris', 'Eloise', 'Margot', 'Claire', 'Violet', 'Naomi', 'Stella', 'Elena', 'Hazel'],
  neutral: ['River', 'Sage', 'Avery', 'Quinn', 'Jordan', 'Taylor', 'Morgan', 'Blake', 'Riley', 'Casey', 'Phoenix', 'Skylar', 'Rowan', 'Finley', 'Reese', 'Alex', 'Cameron', 'Hayden', 'Emery', 'Remy'],
  last: ['Ashford', 'Blackwood', 'Caldwell', 'Davenport', 'Everett', 'Fairfax', 'Gallagher', 'Harrington', 'Ingram', 'Kingsley', 'Langford', 'Mercer', 'Nightingale', 'Pemberton', 'Sterling', 'Thorne', 'Whitmore', 'Bennett', 'Hayes', 'Collins', 'Parker', 'Rhodes', 'Turner', 'Lawson'],
};

router.post('/name-generator', (req, res) => {
  const { gender = 'neutral', count = 5, type = 'full' } = req.body;
  const safeCount = Math.min(Math.max(parseInt(count) || 5, 1), 20);
  const pool = nameData[gender] || nameData.neutral;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const used = new Set();
  const names = [];
  let attempts = 0;
  while (names.length < safeCount && attempts < 100) {
    attempts++;
    const first = pick(pool), last = pick(nameData.last);
    const name = type === 'full' ? `${first} ${last}` : type === 'first' ? first : last;
    if (!used.has(name)) { used.add(name); names.push(name); }
  }
  track(req, 'name-generator');
  res.json({ names });
});

const conversions = {
  length: { m: 1, km: 1e-3, cm: 100, mm: 1000, ft: 3.28084, in: 39.3701, yd: 1.09361, mi: 6.21371e-4 },
  weight: { kg: 1, g: 1000, mg: 1e6, lb: 2.20462, oz: 35.274, t: 1e-3 },
  volume: { l: 1, ml: 1000, gal: 0.264172, qt: 1.05669, pt: 2.11338, cup: 4.22675, floz: 33.814 },
  area: { m2: 1, km2: 1e-6, cm2: 1e4, ft2: 10.7639, in2: 1550, acre: 2.4711e-4, ha: 1e-4 },
  speed: { ms: 1, kph: 3.6, mph: 2.23694, knot: 1.94384, fps: 3.28084 },
};

router.post('/unit-converter', (req, res) => {
  const { value, from, to, category } = req.body;
  if (!value?.toString().trim() || !from || !to || !category) return res.status(400).json({ error: 'Please provide value, from unit, to unit, and category.' });
  const num = parseFloat(value);
  if (isNaN(num)) return res.status(400).json({ error: 'Value must be a number.' });
  try {
    let result;
    if (category === 'temperature') {
      const toCelsius = { c: v => v, f: v => (v - 32) * 5 / 9, k: v => v - 273.15 };
      const fromCelsius = { c: v => v, f: v => v * 9 / 5 + 32, k: v => v + 273.15 };
      if (!toCelsius[from] || !fromCelsius[to]) return res.status(400).json({ error: 'Invalid temperature unit. Use c, f, or k.' });
      result = fromCelsius[to](toCelsius[from](num));
    } else {
      const conv = conversions[category];
      if (!conv) return res.status(400).json({ error: `Unknown category: ${category}` });
      if (!conv[from]) return res.status(400).json({ error: `Unknown unit: ${from}` });
      if (!conv[to]) return res.status(400).json({ error: `Unknown unit: ${to}` });
      result = (num / conv[from]) * conv[to];
    }
    track(req, 'unit-converter');
    res.json({ result: parseFloat(result.toPrecision(10)), from, to, category });
  } catch (err) {
    res.status(400).json({ error: 'Conversion failed.' });
  }
});

router.post('/binary-converter', (req, res) => {
  const { text, mode } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });
  try {
    let result;
    if (mode === 'toBinary') {
      result = Array.from(text).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    } else {
      const parts = text.trim().split(/\s+/);
      if (!parts.every(p => /^[01]{1,8}$/.test(p))) return res.status(400).json({ error: 'Invalid binary input. Each group must contain only 0s and 1s.' });
      result = parts.map(b => String.fromCharCode(parseInt(b, 2))).join('');
    }
    track(req, 'binary-converter');
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: 'Conversion failed. Check your input format.' });
  }
});

router.post('/url-encoder', (req, res) => {
  const { text, mode } = req.body;
  if (!text) return res.status(400).json({ error: 'Please enter a URL or text.' });
  try {
    const result = mode === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text);
    track(req, 'url-encoder');
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: 'Invalid encoded URL. Make sure it is properly percent-encoded.' });
  }
});

router.post('/calculator', (req, res) => {
  const { expression } = req.body;
  if (!expression || !expression.trim()) return res.status(400).json({ error: 'Please enter an expression.' });
  const safe = expression.replace(/\s+/g, '').replace(/[^0-9+\-*/().^%,a-z]/gi, '');
  if (!safe) return res.status(400).json({ error: 'Invalid expression.' });
  try {
    let expr = safe.replace(/\^/g, '**').replace(/(\d+)%/g, '($1/100)')
      .replace(/sqrt\(/g, 'Math.sqrt(').replace(/abs\(/g, 'Math.abs(')
      .replace(/ceil\(/g, 'Math.ceil(').replace(/floor\(/g, 'Math.floor(')
      .replace(/round\(/g, 'Math.round(').replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(').replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(')
      .replace(/pi/gi, 'Math.PI').replace(/e(?![0-9a-z])/g, 'Math.E');
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    if (!isFinite(result)) return res.status(400).json({ error: 'Result is undefined (e.g., division by zero).' });
    track(req, 'calculator');
    res.json({ result: parseFloat(result.toPrecision(12)), expression: expression.trim() });
  } catch (err) {
    res.status(400).json({ error: 'Could not evaluate. Check for syntax errors.' });
  }
});

// ── Image tools (multer + jimp) ───────────────────────────────────────────────
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post('/image-converter', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please upload an image.' });
  const format = (req.body.format || 'png').toLowerCase();
  if (!['png','jpeg','jpg','bmp','gif'].includes(format)) return res.status(400).json({ error: 'Unsupported format. Use: png, jpeg, bmp, gif.' });
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(req.file.buffer);
    const mimeMap = { png: Jimp.MIME_PNG, jpeg: Jimp.MIME_JPEG, jpg: Jimp.MIME_JPEG, bmp: Jimp.MIME_BMP, gif: Jimp.MIME_GIF };
    const outBuffer = await img.getBufferAsync(mimeMap[format]);
    track(req, 'image-converter');
    res.set('Content-Type', mimeMap[format]);
    res.set('Content-Disposition', `attachment; filename="converted.${format === 'jpg' ? 'jpeg' : format}"`);
    res.send(outBuffer);
  } catch (err) {
    console.error('Image converter error:', err);
    res.status(500).json({ error: 'Image conversion failed. Please try a different image.' });
  }
});

router.post('/image-resizer', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please upload an image.' });
  const width  = parseInt(req.body.width)  || 0;
  const height = parseInt(req.body.height) || 0;
  const quality = Math.min(Math.max(parseInt(req.body.quality) || 85, 10), 100);
  if (!width && !height) return res.status(400).json({ error: 'Provide at least a width or height.' });
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(req.file.buffer);
    img.resize(width || Jimp.AUTO, height || Jimp.AUTO);
    img.quality(quality);
    const mime = req.file.mimetype === 'image/png' ? Jimp.MIME_PNG : Jimp.MIME_JPEG;
    const outBuffer = await img.getBufferAsync(mime);
    track(req, 'image-resizer');
    const ext = mime === Jimp.MIME_PNG ? 'png' : 'jpg';
    res.set('Content-Type', mime);
    res.set('Content-Disposition', `attachment; filename="resized.${ext}"`);
    res.send(outBuffer);
  } catch (err) {
    console.error('Image resizer error:', err);
    res.status(500).json({ error: 'Image resize failed. Please try a different image.' });
  }
});

// ─── v4 New Text Tools ────────────────────────────────────────────────────────

router.post('/tone-analyzer', checkUsageLimit, (req, res) => {
  const { text } = req.body;
  const output = ToneAnalyzer.run(text);
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'tone-analyzer');
  res.json(output);
});

router.post('/sentence-expander', checkUsageLimit, (req, res) => {
  const { text, level } = req.body;
  const output = SentenceExpander.run(text, { level });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'sentence-expander');
  res.json(output);
});

router.post('/text-cleaner', checkUsageLimit, (req, res) => {
  const { text, removeHTML, removeDuplicates, fixSpacing, normaliseTypo, removeBoilerplate, fixEncoding } = req.body;
  const output = TextCleaner.run(text, { removeHTML, removeDuplicates, fixSpacing, normaliseTypo, removeBoilerplate, fixEncoding });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'text-cleaner');
  res.json(output);
});

router.post('/bullet-points', checkUsageLimit, (req, res) => {
  const { text, style, maxItems } = req.body;
  const output = BulletPoints.run(text, { style, maxItems });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'bullet-points');
  res.json(output);
});

router.post('/cliche-detector', checkUsageLimit, (req, res) => {
  const { text, autoReplace } = req.body;
  const output = ClicheDetector.run(text, { autoReplace: autoReplace === true || autoReplace === 'true' });
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'cliche-detector');
  res.json(output);
});

// ─── AI Content Detector ──────────────────────────────────────────────────────
router.post('/ai-detector', checkUsageLimit, (req, res) => {
  const { text } = req.body;
  const output = AIDetector.run(text);
  if (output.error) return res.status(400).json({ error: output.error });
  track(req, 'ai-detector');
  res.json(output);
});

module.exports = router;
