/**
 * ToolHub AI — Extra Tool Routes (all missing tools)
 * Covers: uuid, hash, regex, css/html/js minifier, color-contrast, color-picker,
 *         currency, age, bmi, percentage, timezone, ip-lookup, image-to-text,
 *         favicon, gif-maker, screenshot-resizer, text-to-speech, hashtag,
 *         email-subject, plagiarism-highlighter, sentence-rewriter,
 *         active-voice-converter, readability, word-frequency, text-diff,
 *         lorem-ipsum (backend), markdown (backend)
 */
'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getToolById, isEnabled } = require('../db/tools');

function track(req, toolId) {
  const tool = getToolById(toolId);
  if (tool) {
    db.trackToolUse(req.session.userId || null, toolId, tool.name, tool.category, req.ip)
      .catch(e => console.error('Track error:', e.message));
  }
}
function checkEnabled(id) {
  return (req, res, next) => isEnabled(id) ? next() : res.status(403).json({ error: 'Tool disabled.' });
}

// ─── UUID Generator ────────────────────────────────────────────────────────────
router.post('/uuid-generator', (req, res) => {
  const { type = 'v4', count = 10 } = req.body;
  const n = Math.min(Math.max(parseInt(count) || 10, 1), 100);
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function nanoid(size = 21) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    return Array.from({ length: size }, () => chars[Math.floor(Math.random() * 64)]).join('');
  }
  function shortid() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }
  const ids = Array.from({ length: n }, () =>
    type === 'nanoid' ? nanoid() : type === 'short' ? shortid() : uuidv4()
  );
  track(req, 'uuid-generator');
  res.json({ ids, type, count: n });
});

// ─── Hash Generator ────────────────────────────────────────────────────────────
router.post('/hash-generator', (req, res) => {
  const { text, algorithms } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter text to hash.' });
  const crypto = require('crypto');
  const supported = ['md5', 'sha1', 'sha256', 'sha512'];
  const algos = Array.isArray(algorithms) && algorithms.length
    ? algorithms.filter(a => supported.includes(a))
    : supported;
  const hashes = {};
  for (const algo of algos) {
    try { hashes[algo] = crypto.createHash(algo).update(text, 'utf8').digest('hex'); }
    catch { hashes[algo] = 'error'; }
  }
  track(req, 'hash-generator');
  res.json({ hashes, length: text.length });
});

// ─── Regex Tester ──────────────────────────────────────────────────────────────
router.post('/regex-tester', (req, res) => {
  const { pattern, flags = 'g', text } = req.body;
  if (!pattern) return res.status(400).json({ error: 'Please enter a regex pattern.' });
  if (text === undefined) return res.status(400).json({ error: 'Please enter test text.' });
  try {
    const safeFlags = (flags || '').replace(/[^gimsuy]/g, '').split('').filter((v, i, a) => a.indexOf(v) === i).join('');
    const re = new RegExp(pattern, safeFlags);
    const globalRe = new RegExp(pattern, safeFlags.includes('g') ? safeFlags : safeFlags + 'g');
    const matches = [];
    let m;
    let safety = 0;
    while ((m = globalRe.exec(text)) !== null && safety++ < 1000) {
      matches.push({ index: m.index, match: m[0], groups: Array.from(m).slice(1), end: m.index + m[0].length });
      if (!safeFlags.includes('g')) break;
      if (m[0].length === 0) globalRe.lastIndex++;
    }
    track(req, 'regex-tester');
    res.json({ matches, matchCount: matches.length, valid: true, flags: safeFlags });
  } catch (err) {
    res.status(400).json({ error: `Invalid regex: ${err.message}`, valid: false });
  }
});

// ─── CSS Minifier ──────────────────────────────────────────────────────────────
router.post('/css-minifier', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some CSS.' });
  let result = text
    .replace(/\/\*[\s\S]*?\*\//g, '')           // remove comments
    .replace(/\s+/g, ' ')                        // collapse whitespace
    .replace(/\s*([{};:,>~+])\s*/g, '$1')        // remove spaces around operators
    .replace(/;\s*\}/g, '}')                     // remove last semicolon in block
    .replace(/([^:]):\s+/g, '$1:')               // remove spaces after colon
    .trim();
  track(req, 'css-minifier');
  const savings = text.length ? Math.round((1 - result.length / text.length) * 100) : 0;
  res.json({ result, original: text.length, minified: result.length, savings });
});

// ─── HTML Minifier ─────────────────────────────────────────────────────────────
router.post('/html-minifier', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some HTML.' });
  let result = text
    .replace(/<!--[\s\S]*?-->/g, '')             // remove HTML comments
    .replace(/\s+/g, ' ')                        // collapse whitespace
    .replace(/>\s+</g, '><')                     // remove space between tags
    .replace(/\s+(\/?>)/g, '$1')                 // remove space before close
    .trim();
  track(req, 'html-minifier');
  const savings = text.length ? Math.round((1 - result.length / text.length) * 100) : 0;
  res.json({ result, original: text.length, minified: result.length, savings });
});

// ─── JS Minifier ───────────────────────────────────────────────────────────────
router.post('/js-minifier', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some JavaScript.' });
  // Safe basic minification (no AST, but handles most cases)
  let result = text
    .replace(/\/\/[^\n\r]*/g, '')               // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')            // multi-line comments
    .replace(/\n+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .replace(/\s*([=+\-*/|&!<>%,;:{}()[\]])\s*/g, '$1')
    .replace(/\n/g, ';')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '')
    .trim();
  track(req, 'js-minifier');
  const savings = text.length ? Math.round((1 - result.length / text.length) * 100) : 0;
  res.json({ result, original: text.length, minified: result.length, savings });
});

// ─── Color Contrast Checker ────────────────────────────────────────────────────
router.post('/color-contrast', (req, res) => {
  const { fg, bg } = req.body;
  if (!fg || !bg) return res.status(400).json({ error: 'Please provide both foreground and background colors.' });
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Invalid color: ${hex}`);
    return [parseInt(full.slice(0,2),16), parseInt(full.slice(2,4),16), parseInt(full.slice(4,6),16)];
  }
  function luminance(r, g, b) {
    return [r, g, b].reduce((sum, c, i) => {
      const v = c / 255;
      const lin = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      return sum + lin * [0.2126, 0.7152, 0.0722][i];
    }, 0);
  }
  try {
    const fgRgb = hexToRgb(fg), bgRgb = hexToRgb(bg);
    const L1 = luminance(...fgRgb), L2 = luminance(...bgRgb);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const r = Math.round(ratio * 100) / 100;
    track(req, 'color-contrast');
    res.json({
      ratio: r,
      aa_normal: r >= 4.5, aa_large: r >= 3, aaa_normal: r >= 7, aaa_large: r >= 4.5,
      grade: r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Fail',
      fgRgb, bgRgb
    });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ─── Color Picker ──────────────────────────────────────────────────────────────
router.post('/color-picker', (req, res) => {
  const { color } = req.body;
  if (!color) return res.status(400).json({ error: 'Please provide a color.' });
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
    return { r: parseInt(full.slice(0,2),16), g: parseInt(full.slice(2,4),16), b: parseInt(full.slice(4,6),16) };
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max===min) { h=s=0; } else {
      const d = max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        case b: h=((r-g)/d+4)/6; break;
      }
    }
    return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
  }
  function rgbToCmyk(r, g, b) {
    r/=255; g/=255; b/=255;
    const k = 1-Math.max(r,g,b);
    if (k===1) return { c:0, m:0, y:0, k:100 };
    return {
      c: Math.round((1-r-k)/(1-k)*100),
      m: Math.round((1-g-k)/(1-k)*100),
      y: Math.round((1-b-k)/(1-k)*100),
      k: Math.round(k*100)
    };
  }
  try {
    const hex = color.startsWith('#') ? color : '#' + color;
    const {r,g,b} = hexToRgb(hex);
    const hsl = rgbToHsl(r,g,b);
    const cmyk = rgbToCmyk(r,g,b);
    track(req, 'color-picker');
    res.json({
      hex: hex.toUpperCase(),
      rgb: { r, g, b }, rgb_string: `rgb(${r}, ${g}, ${b})`,
      hsl, hsl_string: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      cmyk, cmyk_string: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ─── Currency Converter ────────────────────────────────────────────────────────
router.post('/currency-converter', (req, res) => {
  const { amount, from, to } = req.body;
  // Static rates relative to USD (updated periodically)
  const RATES_TO_USD = {
    USD:1, EUR:0.92, GBP:0.79, JPY:149.5, CAD:1.36, AUD:1.53, CHF:0.89,
    CNY:7.24, INR:83.1, MXN:17.2, BRL:4.97, RUB:89.5, KRW:1325, SGD:1.34,
    HKD:7.82, NOK:10.55, SEK:10.42, DKK:6.89, NZD:1.63, ZAR:18.6,
    TRY:30.5, AED:3.67, SAR:3.75, THB:35.1, MYR:4.71, IDR:15650,
    PHP:56.5, CZK:22.8, PLN:4.02, HUF:357, RON:4.58, BGN:1.80,
    HRK:7.0, ISK:138, ILS:3.72, CLP:896, COP:3980, PEN:3.73,
    VND:24450, EGP:30.9, NGN:1550, KES:131, GHS:12.1, MAD:10.1,
    PKR:280, BDT:110, LKR:325, MMK:2100, UAH:37.4, KZT:455
  };
  if (!amount || isNaN(parseFloat(amount))) return res.status(400).json({ error: 'Please enter a valid amount.' });
  if (!RATES_TO_USD[from]) return res.status(400).json({ error: `Unknown currency: ${from}` });
  if (!RATES_TO_USD[to]) return res.status(400).json({ error: `Unknown currency: ${to}` });
  const num = parseFloat(amount);
  const inUSD = num / RATES_TO_USD[from];
  const result = inUSD * RATES_TO_USD[to];
  const rate = RATES_TO_USD[to] / RATES_TO_USD[from];
  track(req, 'currency-converter');
  res.json({ result: Math.round(result * 100) / 100, rate: Math.round(rate * 100000) / 100000, from, to, amount: num, currencies: Object.keys(RATES_TO_USD) });
});

// ─── Age Calculator ────────────────────────────────────────────────────────────
router.post('/age-calculator', (req, res) => {
  const { birthdate, targetDate } = req.body;
  if (!birthdate) return res.status(400).json({ error: 'Please enter a birthdate.' });
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return res.status(400).json({ error: 'Invalid date format.' });
  const target = targetDate ? new Date(targetDate) : new Date();
  if (isNaN(target.getTime())) return res.status(400).json({ error: 'Invalid target date.' });
  if (birth > target) return res.status(400).json({ error: 'Birthdate cannot be in the future.' });

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) { months--; days += new Date(target.getFullYear(), target.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }

  const totalDays = Math.floor((target - birth) / 86400000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = totalDays * 24;
  const nextBirthday = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday <= target) nextBirthday.setFullYear(target.getFullYear() + 1);
  const daysToNext = Math.ceil((nextBirthday - target) / 86400000);

  track(req, 'age-calculator');
  res.json({ years, months, days, totalDays, totalWeeks, totalHours, daysToNext, nextBirthday: nextBirthday.toDateString() });
});

// ─── BMI Calculator ────────────────────────────────────────────────────────────
router.post('/bmi-calculator', (req, res) => {
  const { weight, height, unit = 'metric' } = req.body;
  if (!weight || !height) return res.status(400).json({ error: 'Please enter weight and height.' });
  let w = parseFloat(weight), h = parseFloat(height);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return res.status(400).json({ error: 'Please enter valid numbers.' });
  let bmi;
  if (unit === 'imperial') {
    const heightIn = parseFloat(req.body.height_in || 0);
    h = h * 12 + heightIn;
    bmi = (703 * w) / (h * h);
  } else {
    bmi = w / (h * h);
  }
  bmi = Math.round(bmi * 10) / 10;
  const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
  const color = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444';
  track(req, 'bmi-calculator');
  res.json({ bmi, category, color, healthy_min: 18.5, healthy_max: 24.9 });
});

// ─── Percentage Calculator ─────────────────────────────────────────────────────
router.post('/percentage-calculator', (req, res) => {
  const { mode, a, b } = req.body;
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb)) return res.status(400).json({ error: 'Please enter valid numbers.' });
  let result, label;
  switch(mode) {
    case 'of':        result = (na / 100) * nb; label = `${na}% of ${nb}`; break;
    case 'what':      result = (na / nb) * 100; label = `${na} is what % of ${nb}`; break;
    case 'change':    result = ((nb - na) / Math.abs(na)) * 100; label = `% change from ${na} to ${nb}`; break;
    case 'increase':  result = na * (1 + nb / 100); label = `${na} increased by ${nb}%`; break;
    case 'decrease':  result = na * (1 - nb / 100); label = `${na} decreased by ${nb}%`; break;
    default: return res.status(400).json({ error: 'Invalid mode. Use: of, what, change, increase, decrease.' });
  }
  track(req, 'percentage-calculator');
  res.json({ result: Math.round(result * 10000) / 10000, label });
});

// ─── Timezone Converter ────────────────────────────────────────────────────────
router.post('/timezone-converter', (req, res) => {
  const { datetime, from_tz, to_tz } = req.body;
  if (!datetime) return res.status(400).json({ error: 'Please enter a date and time.' });
  try {
    const dt = new Date(datetime);
    if (isNaN(dt.getTime())) return res.status(400).json({ error: 'Invalid date/time format.' });
    const fromFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: from_tz || 'UTC', dateStyle: 'full', timeStyle: 'long'
    }).format(dt);
    const toFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: to_tz || 'UTC', dateStyle: 'full', timeStyle: 'long'
    }).format(dt);
    const commonZones = [
      'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
      'America/Toronto','America/Vancouver','America/Sao_Paulo','America/Mexico_City',
      'Europe/London','Europe/Paris','Europe/Berlin','Europe/Rome','Europe/Madrid',
      'Europe/Amsterdam','Europe/Moscow','Europe/Istanbul','Asia/Dubai','Asia/Karachi',
      'Asia/Kolkata','Asia/Dhaka','Asia/Bangkok','Asia/Singapore','Asia/Shanghai',
      'Asia/Tokyo','Asia/Seoul','Asia/Hong_Kong','Australia/Sydney','Pacific/Auckland',
      'Pacific/Honolulu','Africa/Cairo','Africa/Lagos','Africa/Johannesburg'
    ];
    track(req, 'timezone-converter');
    res.json({ fromFormatted, toFormatted, iso: dt.toISOString(), zones: commonZones });
  } catch(e) { res.status(400).json({ error: `Invalid timezone: ${e.message}` }); }
});

// ─── IP Lookup ─────────────────────────────────────────────────────────────────
router.post('/ip-lookup', async (req, res) => {
  let { ip } = req.body;
  if (!ip || !ip.trim()) {
    ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '8.8.8.8';
  }
  const ipClean = ip.trim();
  // Validate IP
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]{3,39}$/;
  if (!ipv4.test(ipClean) && !ipv6.test(ipClean) && ipClean !== 'me') {
    return res.status(400).json({ error: 'Please enter a valid IP address.' });
  }
  try {
    const https = require('https');
    const target = ipClean === 'me' ? '' : ipClean;
    const data = await new Promise((resolve, reject) => {
      https.get(`https://ipinfo.io/${target}?token=`, r => {
        let body = '';
        r.on('data', d => body += d);
        r.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Parse error')); } });
      }).on('error', reject);
    });
    if (data.bogon || data.error) {
      return res.json({
        ip: ipClean, country: 'Private/Reserved', note: 'This is a private, loopback, or reserved IP address.',
        private: true
      });
    }
    track(req, 'ip-lookup');
    res.json({
      ip: data.ip || ipClean,
      city: data.city || 'Unknown',
      region: data.region || 'Unknown',
      country: data.country || 'Unknown',
      org: data.org || 'Unknown',
      timezone: data.timezone || 'Unknown',
      loc: data.loc || 'Unknown',
      postal: data.postal || 'Unknown'
    });
  } catch(e) {
    // Fallback: return what we know
    track(req, 'ip-lookup');
    res.json({ ip: ipClean, note: 'Lookup service unavailable. Try again later.' });
  }
});

// ─── Image to Text (OCR) ───────────────────────────────────────────────────────
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/image-to-text', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please upload an image file.' });
  // Return a message explaining OCR requires Tesseract which isn't installed,
  // but provide the image dimensions and basic analysis
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(req.file.buffer);
    const width = img.getWidth();
    const height = img.getHeight();
    track(req, 'image-to-text');
    res.json({
      result: '[OCR Note: Full server-side OCR requires Tesseract.js. Your image was received successfully.]\n\nImage dimensions: ' + width + ' × ' + height + ' px\nFile size: ' + (req.file.size / 1024).toFixed(1) + ' KB\nFormat: ' + req.file.mimetype + '\n\nFor best results, ensure text in the image is:\n• High contrast (dark text on light background)\n• Horizontal and clearly legible\n• At least 12px font size',
      width, height, size: req.file.size, mimetype: req.file.mimetype, ocr_available: false
    });
  } catch(e) {
    res.status(500).json({ error: 'Could not process image. Please try a different file.' });
  }
});

// ─── Favicon Generator ─────────────────────────────────────────────────────────
router.post('/favicon-generator', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please upload an image.' });
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(req.file.buffer);
    const sizes = [16, 32, 48, 64, 128, 256];
    const results = [];
    for (const size of sizes) {
      const resized = img.clone().resize(size, size);
      const buf = await resized.getBufferAsync(Jimp.MIME_PNG);
      results.push({ size, dataUrl: `data:image/png;base64,${buf.toString('base64')}` });
    }
    track(req, 'favicon-generator');
    res.json({ sizes: results, originalWidth: img.getWidth(), originalHeight: img.getHeight() });
  } catch(e) {
    res.status(500).json({ error: 'Could not process image.' });
  }
});

// ─── Screenshot Resizer ────────────────────────────────────────────────────────
const SCREENSHOT_PRESETS = {
  'instagram_square': { w: 1080, h: 1080, label: 'Instagram Square' },
  'instagram_portrait': { w: 1080, h: 1350, label: 'Instagram Portrait' },
  'instagram_landscape': { w: 1080, h: 566, label: 'Instagram Landscape' },
  'twitter_post': { w: 1200, h: 675, label: 'Twitter/X Post' },
  'facebook_post': { w: 1200, h: 630, label: 'Facebook Post' },
  'linkedin_post': { w: 1200, h: 627, label: 'LinkedIn Post' },
  'youtube_thumbnail': { w: 1280, h: 720, label: 'YouTube Thumbnail' },
  'tiktok': { w: 1080, h: 1920, label: 'TikTok' },
  'app_store_iphone': { w: 1290, h: 2796, label: 'App Store (iPhone 15 Pro Max)' },
  'play_store': { w: 1080, h: 1920, label: 'Play Store Screenshot' },
  'og_image': { w: 1200, h: 630, label: 'OG Image / Link Preview' },
  'custom': null
};

router.post('/screenshot-resizer', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please upload an image.' });
  const { preset = 'instagram_square', custom_w, custom_h } = req.body;
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(req.file.buffer);
    let w, h;
    if (preset === 'custom') {
      w = parseInt(custom_w) || 1080;
      h = parseInt(custom_h) || 1080;
    } else {
      const p = SCREENSHOT_PRESETS[preset];
      if (!p) return res.status(400).json({ error: 'Invalid preset.' });
      w = p.w; h = p.h;
    }
    const resized = img.clone().cover(w, h);
    const buf = await resized.getBufferAsync(Jimp.MIME_JPEG);
    track(req, 'screenshot-resizer');
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="screenshot_${w}x${h}.jpg"`);
    res.send(buf);
  } catch(e) {
    res.status(500).json({ error: 'Resize failed. Please try a different image.' });
  }
});

// ─── Text to Speech (Web Speech API — client-side only, backend returns config) ─
router.post('/text-to-speech', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });
  if (text.length > 5000) return res.status(400).json({ error: 'Text too long. Maximum 5,000 characters.' });
  track(req, 'text-to-speech');
  res.json({ text: text.trim(), length: text.length, words: text.trim().split(/\s+/).length, ready: true });
});

// ─── Hashtag Generator ─────────────────────────────────────────────────────────
router.post('/hashtag-generator', (req, res) => {
  const { text, platform = 'instagram', count = 20 } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text or a topic.' });

  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const stopWords = new Set(['the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','day','get','has','him','his','how','man','new','now','old','see','two','way','who','boy','did','its','let','put','say','she','too','use','from','that','this','with','have','been','will','when','your','what','said','each','which','their','time','if','in','of','to','is','it','be','as','at','so','we','he','by','or','on','do','if','me','my','up','an','go','no','us','am']);

  const meaningful = words.filter(w => !stopWords.has(w) && w.length > 3);
  const unique = [...new Set(meaningful)];

  // Platform-specific popular tags to mix in
  const PLATFORM_EXTRAS = {
    instagram: ['instagood','photooftheday','love','instadaily','follow','like4like','picoftheday','instalike','likeforlike','followme'],
    twitter: ['trending','viral','explore','thread','retweet'],
    tiktok: ['fyp','foryou','foryoupage','trending','viral','tiktok','tiktokviral'],
    linkedin: ['professional','career','business','networking','leadership','innovation','marketing','success'],
    general: ['trending','viral','content','share','follow','discover']
  };

  const extras = PLATFORM_EXTRAS[platform] || PLATFORM_EXTRAS.general;
  const contentTags = unique.slice(0, Math.ceil(count * 0.6)).map(w => '#' + w);
  const platformTags = extras.slice(0, Math.floor(count * 0.4)).map(w => '#' + w);
  const hashtags = [...contentTags, ...platformTags].slice(0, parseInt(count) || 20);

  track(req, 'hashtag-generator');
  res.json({ hashtags, count: hashtags.length, platform });
});

// ─── Email Subject Generator ───────────────────────────────────────────────────
router.post('/email-subject-generator', (req, res) => {
  const { text, tone = 'professional', type = 'newsletter' } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter your email content or topic.' });

  const words = text.split(/\s+/).filter(w => w.length > 3).slice(0, 5).map(w => w.replace(/[^a-zA-Z0-9]/g, ''));
  const topic = words.slice(0, 3).join(' ') || 'your message';
  const keyword = words[0] || 'Update';

  const TEMPLATES = {
    professional: [
      `Important Update: ${keyword} — Action Required`,
      `[${keyword}] Key Information You Should Know`,
      `Your ${topic} Summary — ${new Date().toLocaleDateString('en-US', {month:'short', day:'numeric'})}`,
      `Regarding ${topic}: What You Need to Know`,
      `${keyword}: A Quick Overview`,
    ],
    casual: [
      `Hey! Quick note about ${topic} 👋`,
      `You'll want to see this: ${keyword}`,
      `Heads up on ${topic}`,
      `Something exciting about ${keyword}!`,
      `Quick update on ${topic} (worth 2 mins)`,
    ],
    urgent: [
      `⚡ ACTION NEEDED: ${keyword} — Deadline Today`,
      `[URGENT] ${topic} — Please Respond ASAP`,
      `Time-sensitive: ${keyword} requires your attention`,
      `Don't miss this — ${topic} update`,
      `Last chance: ${keyword} deadline approaching`,
    ],
    marketing: [
      `You won't believe what we did with ${keyword} 🎉`,
      `The ${topic} secret your competitors don't know`,
      `FREE: Your guide to ${keyword}`,
      `[New] ${topic} — get it before it's gone`,
      `How to ${keyword} in 5 minutes flat`,
    ]
  };

  const subjects = TEMPLATES[tone] || TEMPLATES.professional;
  track(req, 'email-subject-generator');
  res.json({ subjects, topic, tone });
});

// ─── Plagiarism Highlighter (within-document duplicate detection) ──────────────
router.post('/plagiarism-highlighter', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text to check.' });
  if (text.length > 15000) return res.status(400).json({ error: 'Text too long. Maximum 15,000 characters.' });

  // Find repeated phrases (3+ word n-grams that appear more than once)
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const phraseMap = {};
  const N = 4; // 4-word n-grams

  for (let i = 0; i <= words.length - N; i++) {
    const phrase = words.slice(i, i + N).join(' ');
    if (!phraseMap[phrase]) phraseMap[phrase] = 0;
    phraseMap[phrase]++;
  }

  const repeated = Object.entries(phraseMap).filter(([, v]) => v > 1).map(([k]) => k);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const seenSentences = new Set();
  const duplicateSentences = [];
  sentences.forEach(s => {
    const norm = s.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenSentences.has(norm)) duplicateSentences.push(s.trim());
    seenSentences.add(norm);
  });

  const uniqueScore = Math.max(0, Math.min(100, Math.round(100 - (repeated.length / Math.max(words.length / 4, 1)) * 25)));

  track(req, 'plagiarism-highlighter');
  res.json({
    repeatedPhrases: repeated.slice(0, 20),
    duplicateSentences: duplicateSentences.slice(0, 10),
    uniqueScore,
    wordCount: words.length,
    phraseCount: repeated.length,
    label: uniqueScore >= 90 ? 'Highly Original' : uniqueScore >= 70 ? 'Mostly Original' : uniqueScore >= 50 ? 'Some Repetition' : 'High Repetition'
  });
});

// ─── Sentence Rewriter ─────────────────────────────────────────────────────────
router.post('/sentence-rewriter', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter a sentence to rewrite.' });
  if (text.length > 1000) return res.status(400).json({ error: 'Please keep input under 1,000 characters.' });

  const Humanizer = require('./api/text/humanizer');

  // Generate 5 variations using different techniques
  const variations = [];

  // 1. Formal
  let formal = text
    .replace(/\bcan't\b/gi, 'cannot').replace(/\bwon't\b/gi, 'will not')
    .replace(/\bdon't\b/gi, 'do not').replace(/\bit's\b/gi, 'it is')
    .replace(/\byou're\b/gi, 'you are').replace(/\bthey're\b/gi, 'they are')
    .replace(/\bgonna\b/gi, 'going to').replace(/\bwanna\b/gi, 'want to')
    .replace(/\bgot\b/gi, 'obtained').replace(/\bkind of\b/gi, 'somewhat');
  variations.push({ style: 'Formal', text: formal });

  // 2. Casual
  let casual = Humanizer.applyContractions(text)
    .replace(/\bobtained\b/gi, 'got').replace(/\bsomewhat\b/gi, 'kind of')
    .replace(/\bhowever\b/gi, 'but').replace(/\btherefore\b/gi, 'so')
    .replace(/\butilize\b/gi, 'use').replace(/\bpurchase\b/gi, 'buy');
  variations.push({ style: 'Casual', text: casual });

  // 3. Concise (remove filler, shorten)
  let concise = text
    .replace(/\bin order to\b/gi, 'to').replace(/\bdue to the fact that\b/gi, 'because')
    .replace(/\bat this point in time\b/gi, 'now').replace(/\bthe fact that\b/gi, 'that')
    .replace(/\ba large number of\b/gi, 'many').replace(/\bin the event that\b/gi, 'if')
    .replace(/\bit is important to note that\b/gi, '').replace(/\bplease note that\b/gi, '')
    .replace(/\s{2,}/g, ' ').trim();
  variations.push({ style: 'Concise', text: concise });

  // 4. Passive voice
  let passive = text.replace(/\b(\w+)\s+(wrote|built|created|made|found|started|finished|completed|developed)\s+(.+)/gi,
    (_, subj, verb, obj) => {
      const pastMap = { wrote: 'written', built: 'built', created: 'created', made: 'made', found: 'found', started: 'started', finished: 'finished', completed: 'completed', developed: 'developed' };
      return `${obj.charAt(0).toUpperCase() + obj.slice(1)} was ${pastMap[verb.toLowerCase()] || verb + 'ed'} by ${subj}`;
    });
  if (passive === text) passive = 'It can be noted that ' + text.charAt(0).toLowerCase() + text.slice(1);
  variations.push({ style: 'Passive', text: passive });

  // 5. Humanized (run through humanizer)
  try {
    const humanized = Humanizer.humanize(text);
    variations.push({ style: 'Humanized', text: humanized });
  } catch {
    variations.push({ style: 'Humanized', text: casual });
  }

  track(req, 'sentence-rewriter');
  res.json({ variations, original: text });
});

// ─── Active Voice Converter ────────────────────────────────────────────────────
router.post('/active-voice-converter', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });

  const Humanizer = require('./api/text/humanizer');
  const sentences = Humanizer.segmentSentences(text);
  const converted = sentences.map(s => Humanizer.passiveToActive(s));
  const result = converted.join(' ');
  const changesCount = converted.filter((s, i) => s !== sentences[i]).length;

  track(req, 'active-voice-converter');
  res.json({ result, original: text, changesCount, sentenceCount: sentences.length });
});

// ─── GIF Maker ─────────────────────────────────────────────────────────────────
router.post('/gif-maker', upload.array('images', 20), async (req, res) => {
  if (!req.files || req.files.length < 2) return res.status(400).json({ error: 'Please upload at least 2 images to create a GIF.' });
  // Note: server-side GIF creation requires gifencoder package
  res.status(503).json({
    error: 'GIF creation requires client-side processing. Use the browser-based tool below.',
    files_received: req.files.length,
    client_side: true
  });
});

// ─── Number to Words ───────────────────────────────────────────────────────────
router.post('/number-to-words', (req, res) => {
  const { number } = req.body;
  if (number === undefined || number === '') return res.status(400).json({ error: 'Please enter a number.' });
  const num = parseFloat(number);
  if (isNaN(num)) return res.status(400).json({ error: 'Please enter a valid number.' });
  if (Math.abs(num) > 999999999999) return res.status(400).json({ error: 'Number too large. Max is 999,999,999,999.' });

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function toWords(n) {
    if (n === 0) return 'zero';
    if (n < 0) return 'negative ' + toWords(-n);
    let words = '';
    if (Math.floor(n / 1000000000) > 0) { words += toWords(Math.floor(n / 1000000000)) + ' billion '; n %= 1000000000; }
    if (Math.floor(n / 1000000) > 0) { words += toWords(Math.floor(n / 1000000)) + ' million '; n %= 1000000; }
    if (Math.floor(n / 1000) > 0) { words += toWords(Math.floor(n / 1000)) + ' thousand '; n %= 1000; }
    if (Math.floor(n / 100) > 0) { words += ones[Math.floor(n / 100)] + ' hundred '; n %= 100; }
    if (n > 0) {
      if (n < 20) words += ones[n] + ' ';
      else words += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '') + ' ';
    }
    return words.trim();
  }

  const intPart = Math.trunc(num);
  const decStr = number.toString().includes('.') ? number.toString().split('.')[1] : '';
  let result = toWords(Math.abs(intPart));
  if (num < 0) result = 'negative ' + result;
  if (decStr) result += ' point ' + decStr.split('').map(d => ones[parseInt(d)]).join(' ');

  track(req, 'number-to-words');
  res.json({ result, number: num });
});

// ─── Random Picker ─────────────────────────────────────────────────────────────
router.post('/random-picker', (req, res) => {
  const { mode = 'list', items, sides = 6, count = 1, min = 1, max = 100 } = req.body;

  if (mode === 'list') {
    const list = (items || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!list.length) return res.status(400).json({ error: 'Please enter at least one item.' });
    const n = Math.min(Math.max(parseInt(count) || 1, 1), list.length);
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    return res.json({ mode, picked: shuffled.slice(0, n), all: list });
  }
  if (mode === 'dice') {
    const s = Math.min(Math.max(parseInt(sides) || 6, 2), 100);
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 20);
    const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * s) + 1);
    return res.json({ mode, rolls, total: rolls.reduce((a, b) => a + b, 0), sides: s });
  }
  if (mode === 'coin') {
    const flips = Array.from({ length: Math.min(parseInt(count) || 1, 10) }, () => Math.random() < 0.5 ? 'Heads' : 'Tails');
    return res.json({ mode, flips, heads: flips.filter(f => f === 'Heads').length, tails: flips.filter(f => f === 'Tails').length });
  }
  if (mode === 'number') {
    const mn = parseInt(min) || 1, mx = parseInt(max) || 100;
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 50);
    const numbers = Array.from({ length: n }, () => Math.floor(Math.random() * (mx - mn + 1)) + mn);
    return res.json({ mode, numbers, min: mn, max: mx });
  }
  res.status(400).json({ error: 'Invalid mode. Use: list, dice, coin, number.' });
});

// ─── Character Limit Checker ───────────────────────────────────────────────────
router.post('/character-counter', (req, res) => {
  const { text } = req.body;
  if (text === undefined) return res.status(400).json({ error: 'Text is required.' });
  const len = text.length;
  const words = (text.match(/\S+/g) || []).length;
  const LIMITS = {
    'Twitter/X Post': 280, 'Twitter/X Bio': 160, 'Instagram Caption': 2200, 'Instagram Bio': 150,
    'LinkedIn Post': 3000, 'LinkedIn Headline': 220, 'Facebook Post': 63206, 'TikTok Bio': 80,
    'YouTube Title': 100, 'YouTube Description': 5000, 'SMS': 160, 'SMS (Unicode)': 70,
    'Email Subject': 78, 'Meta Title (SEO)': 60, 'Meta Description (SEO)': 160, 'WhatsApp': 65536
  };
  const checks = Object.entries(LIMITS).map(([platform, limit]) => ({
    platform, limit, current: len, remaining: limit - len,
    ok: len <= limit, percentage: Math.min(100, Math.round((len / limit) * 100))
  }));
  res.json({ length: len, words, checks });
});

// ─── Slug Generator ────────────────────────────────────────────────────────────
router.post('/slug-generator', (req, res) => {
  const { text, separator = '-' } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });
  const sep = ['-', '_', '.'].includes(separator) ? separator : '-';
  const slug = text.trim().toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-_]/g, '').replace(/[\s]+/g, sep).replace(new RegExp(`[${sep}]+`, 'g'), sep)
    .replace(new RegExp(`^[${sep}]+|[${sep}]+$`, 'g'), '');
  track(req, 'slug-generator');
  res.json({ slug, original: text, separator: sep });
});

// ─── Morse Code Translator ─────────────────────────────────────────────────────
router.post('/morse-code', (req, res) => {
  const { text, mode = 'toMorse' } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });
  const MAP = {
    A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',
    L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',
    W:'.--',X:'-..-',Y:'-.--',Z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
    '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--',"'":'.----.','(':'-.--.',')':`-.--.-`,
    '&':'.-...',':':'---...','=':'-...-','+':'.-.-.','\\-':'-....-','_':'..--.-','"':'.-..-.','$':'...-..-','@':'.--.-.'
  };
  const REVERSE = Object.fromEntries(Object.entries(MAP).map(([k,v]) => [v,k]));

  let result;
  if (mode === 'toMorse') {
    result = text.toUpperCase().split('').map(c => c === ' ' ? '/' : (MAP[c] || '?')).join(' ');
  } else {
    result = text.split(' / ').map(word =>
      word.split(' ').map(code => REVERSE[code] || '?').join('')
    ).join(' ');
  }

  track(req, 'morse-code');
  res.json({ result, original: text, mode });
});

// ─── Readability Checker ───────────────────────────────────────────────────────
router.post('/readability-checker', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSyllables = syllables / Math.max(wordCount, 1);
  const avgWords = wordCount / sentenceCount;
  const fleschScore = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWords - 84.6 * avgSyllables));
  const gradeLevel = Math.max(1, 0.39 * avgWords + 11.8 * avgSyllables - 15.59);
  const readingTime = Math.ceil(wordCount / 200);
  const grade = fleschScore >= 90 ? '5th grade' : fleschScore >= 80 ? '6th grade' : fleschScore >= 70 ? '7th grade' : fleschScore >= 60 ? '8th-9th grade' : fleschScore >= 50 ? '10th-12th grade' : fleschScore >= 30 ? 'College' : 'Professional';
  const level = fleschScore >= 70 ? 'Easy' : fleschScore >= 50 ? 'Standard' : fleschScore >= 30 ? 'Difficult' : 'Very Difficult';
  track(req, 'readability-checker');
  res.json({ fleschScore: Math.round(fleschScore), gradeLevel: parseFloat(gradeLevel.toFixed(1)), grade, level, wordCount, sentenceCount, syllableCount: syllables, avgWordsPerSentence: parseFloat(avgWords.toFixed(1)), readingTimeMinutes: readingTime });
});
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

// ─── Word Frequency Analyzer ──────────────────────────────────────────────────
router.post('/word-frequency', (req, res) => {
  const { text, limit = 20, stopWords = true } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some text.' });
  const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','was','are','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','not','this','that','these','those','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','as','if','when','while','so','then','than','into','up','out','about','what','which','who','how','all','some','no','more','also','just','very','its','now','after','before','over','under','there','here','only','other','each','any','both','few','most','much','such','own','same','well','back','still','even','new','old','first','last','long','great','little','get','go','know','think','see','come','take','make','good','right','just','because','through','during','between','against','without','within','among','along','since','until']);
  const words = text.toLowerCase().replace(/[^a-z\s'-]/gi, ' ').split(/\s+/).filter(w => w.length > 1);
  const filtered = stopWords ? words.filter(w => !STOP.has(w)) : words;
  const freq = {};
  for (const w of filtered) freq[w] = (freq[w] || 0) + 1;
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, parseInt(limit) || 20);
  const maxCount = sorted[0]?.[1] || 1;
  const result = sorted.map(([word, count]) => ({ word, count, percentage: parseFloat((count/words.length*100).toFixed(1)), bar: Math.round(count/maxCount*100) }));
  track(req, 'word-frequency');
  res.json({ words: result, totalWords: words.length, uniqueWords: Object.keys(freq).length });
});

// ─── Text Diff ────────────────────────────────────────────────────────────────
router.post('/text-diff', (req, res) => {
  const { text1, text2 } = req.body;
  if (text1 === undefined || text2 === undefined) return res.status(400).json({ error: 'Both text fields are required.' });
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const diff = computeDiff(lines1, lines2);
  const added = diff.filter(d => d.type === 'add').length;
  const removed = diff.filter(d => d.type === 'remove').length;
  track(req, 'text-diff');
  res.json({ diff, added, removed, unchanged: diff.filter(d => d.type === 'equal').length });
});
function computeDiff(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, () => Array(n+1).fill(0));
  for (let i=m-1; i>=0; i--) for (let j=n-1; j>=0; j--)
    dp[i][j] = a[i]===b[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const result = [];
  let i=0, j=0;
  while (i<m || j<n) {
    if (i<m && j<n && a[i]===b[j]) { result.push({type:'equal',text:a[i]}); i++; j++; }
    else if (j<n && (i>=m || dp[i][j+1]>=dp[i+1][j])) { result.push({type:'add',text:b[j]}); j++; }
    else { result.push({type:'remove',text:a[i]}); i++; }
  }
  return result;
}

// ─── Lorem Ipsum ──────────────────────────────────────────────────────────────
router.post('/lorem-ipsum', (req, res) => {
  const { type = 'paragraphs', count = 3 } = req.body;
  const n = Math.min(Math.max(parseInt(count)||3, 1), 20);
  const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  const rw = (n) => Array.from({length:n}, () => WORDS[Math.floor(Math.random()*WORDS.length)]).join(' ');
  const rSentence = () => { const s = rw(Math.floor(Math.random()*10)+5); return s.charAt(0).toUpperCase()+s.slice(1)+'.'; };
  const rPara = () => Array.from({length:Math.floor(Math.random()*4)+3}, rSentence).join(' ');
  let result;
  if (type === 'words') result = rw(n);
  else if (type === 'sentences') result = Array.from({length:n}, rSentence).join(' ');
  else result = Array.from({length:n}, rPara).join('\n\n');
  track(req, 'lorem-ipsum');
  res.json({ result, type, count: n });
});

// ─── CSV to JSON Converter ────────────────────────────────────────────────────
router.post('/csv-to-json', (req, res) => {
  const { text, delimiter = ',', hasHeader = true } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some CSV data.' });
  try {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    const sep = delimiter === 'tab' ? '\t' : (delimiter || ',');
    const parseRow = (line) => {
      const cols = []; let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === sep && !inQ) { cols.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    };
    let result;
    if (hasHeader) {
      const headers = parseRow(lines[0]);
      result = lines.slice(1).map(line => {
        const vals = parseRow(line);
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] ?? '');
        return obj;
      });
    } else {
      result = lines.map(line => parseRow(line));
    }
    track(req, 'csv-to-json');
    res.json({ result: JSON.stringify(result, null, 2), rows: result.length, columns: hasHeader ? parseRow(lines[0]).length : (result[0]?.length || 0) });
  } catch(e) {
    res.status(400).json({ error: 'Failed to parse CSV. Check your data format.' });
  }
});

// ─── Markdown to HTML ─────────────────────────────────────────────────────────
router.post('/markdown-to-html', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Please enter some Markdown text.' });
  let html = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^######\s(.+)$/gm,'<h6>$1</h6>').replace(/^#####\s(.+)$/gm,'<h5>$1</h5>')
    .replace(/^####\s(.+)$/gm,'<h4>$1</h4>').replace(/^###\s(.+)$/gm,'<h3>$1</h3>')
    .replace(/^##\s(.+)$/gm,'<h2>$1</h2>').replace(/^#\s(.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/__(.+?)__/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/_(.+?)_/g,'<em>$1</em>')
    .replace(/~~(.+?)~~/g,'<del>$1</del>').replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>')
    .replace(/^>\s(.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^[-*+]\s(.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>')
    .replace(/^\d+\.\s(.+)$/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>').replace(/^(?!<[h1-6ul]|<li|<block)(.+)$/gm,'<p>$1</p>')
    .replace(/<p><\/p>/g,'').replace(/\n/g,'<br>');
  track(req, 'markdown-to-html');
  res.json({ html, length: html.length });
});

module.exports = router;
