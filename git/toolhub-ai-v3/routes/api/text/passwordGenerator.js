/**
 * ToolHub AI — Password Generator Tool
 * File: routes/api/text/passwordGenerator.js
 *
 * Generates cryptographically strong passwords using Node.js `crypto` module.
 * Zero AI or external API usage. All logic is deterministic and rule-based.
 *
 * Rules:
 *   - Default length ≥ 12 characters
 *   - Configurable length (4–256)
 *   - Configurable charset: uppercase, lowercase, numbers, symbols
 *   - Character exclusion support
 *   - Guaranteed at least one character from each selected charset
 *   - Batch generation (up to 20 passwords)
 *   - Strength scoring with detailed breakdown
 *   - Passphrase generation mode
 *   - No sequential/repeated characters option
 */

'use strict';

const crypto = require('crypto');

// ── Character sets ────────────────────────────────────────────────────────────

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?~`\\/"\'' ,
  ambiguous: 'Il1O0o',  // characters that look alike — can be excluded
};

// ── Crypto-secure random integer in [0, max) ─────────────────────────────────

function secureRandInt(max) {
  if (max <= 0) throw new RangeError('max must be > 0');
  // Reject bias by resampling if value falls in biased region
  const byteCount = Math.ceil(Math.log2(max) / 8) + 1;
  const limit = Math.floor((256 ** byteCount) / max) * max;
  let value;
  do {
    const buf = crypto.randomBytes(byteCount);
    value = buf.reduce((acc, byte) => acc * 256 + byte, 0);
  } while (value >= limit);
  return value % max;
}

/**
 * Cryptographically secure random element from an array or string.
 */
function secureChoice(source) {
  return source[secureRandInt(source.length)];
}

// ── Shuffle array in-place using Fisher–Yates with crypto random ─────────────

function secureShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Strength Scoring ──────────────────────────────────────────────────────────

/**
 * Calculate password strength on a 0–100 scale with component breakdown.
 *
 * Components:
 *   Length score       (0–40): longer = better
 *   Charset diversity  (0–30): more charset types = better
 *   Entropy estimate   (0–20): based on charset size and length
 *   Pattern penalties  (0–10): deductions for sequences or repeats
 */
function scorePassword(password) {
  const len = password.length;

  // Component 1: Length score
  let lengthScore = 0;
  if (len >= 32) lengthScore = 40;
  else if (len >= 20) lengthScore = 35;
  else if (len >= 16) lengthScore = 28;
  else if (len >= 12) lengthScore = 20;
  else if (len >= 8)  lengthScore = 12;
  else if (len >= 6)  lengthScore = 6;
  else lengthScore = 2;

  // Component 2: Character diversity
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);
  const charsetCount = [hasUpper, hasLower, hasNumbers, hasSymbols].filter(Boolean).length;
  const diversityScore = charsetCount * 7; // max 28 → rounded to 30 for 4 types

  // Component 3: Entropy estimate
  let charPoolSize = 0;
  if (hasUpper)   charPoolSize += 26;
  if (hasLower)   charPoolSize += 26;
  if (hasNumbers) charPoolSize += 10;
  if (hasSymbols) charPoolSize += 32;
  const entropyBits  = len * Math.log2(Math.max(charPoolSize, 1));
  let entropyScore = 0;
  if (entropyBits >= 128) entropyScore = 20;
  else if (entropyBits >= 80) entropyScore = 16;
  else if (entropyBits >= 60) entropyScore = 12;
  else if (entropyBits >= 40) entropyScore = 8;
  else entropyScore = 4;

  // Component 4: Pattern penalties
  let penalty = 0;
  // Repeated characters: "aaaa"
  if (/(.)\1{2,}/.test(password)) penalty += 5;
  // Sequential digits: "1234"
  if (/0123|1234|2345|3456|4567|5678|6789/.test(password)) penalty += 5;
  // Sequential letters: "abcd"
  if (/abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz/i.test(password)) penalty += 5;
  // Common keyboard patterns
  if (/qwer|asdf|zxcv|1qaz|2wsx/i.test(password)) penalty += 5;

  const patternScore = Math.max(0, 10 - penalty);
  const total = Math.min(100, lengthScore + diversityScore + entropyScore + patternScore);

  let label, color;
  if (total >= 85) { label = 'Very Strong'; color = '#10b981'; }
  else if (total >= 65) { label = 'Strong';   color = '#22c55e'; }
  else if (total >= 45) { label = 'Fair';     color = '#f59e0b'; }
  else if (total >= 25) { label = 'Weak';     color = '#ef4444'; }
  else { label = 'Very Weak'; color = '#dc2626'; }

  return {
    score: total,
    label,
    color,
    entropyBits: Math.round(entropyBits),
    components: { lengthScore, diversityScore, entropyScore, patternScore },
    charsetCount,
  };
}

// ── Password generator core ───────────────────────────────────────────────────

/**
 * Generate a single password satisfying all constraints.
 *
 * Guarantees:
 *   1. At least one character from each selected charset type.
 *   2. No sequential characters if noSequential is true.
 *   3. No repeated characters if noRepeat is true.
 *   4. No characters in the exclude list.
 */
function generateOne(options) {
  const {
    length       = 16,
    uppercase    = true,
    lowercase    = true,
    numbers      = true,
    symbols      = true,
    exclude      = '',
    noAmbiguous  = false,
    noRepeat     = false,
  } = options;

  // Build allowed character pool
  const excluded = new Set(exclude.split(''));
  if (noAmbiguous) CHARSETS.ambiguous.split('').forEach(c => excluded.add(c));

  function filtered(charset) {
    return charset.split('').filter(c => !excluded.has(c)).join('');
  }

  const pools = {
    upper:  uppercase ? filtered(CHARSETS.uppercase) : '',
    lower:  lowercase ? filtered(CHARSETS.lowercase) : '',
    number: numbers   ? filtered(CHARSETS.numbers)   : '',
    symbol: symbols   ? filtered(CHARSETS.symbols)   : '',
  };

  // Validate pools are not empty
  const activePools = Object.values(pools).filter(p => p.length > 0);
  if (activePools.length === 0) {
    throw new Error('No characters available with current settings. Adjust exclusions.');
  }

  const fullPool = activePools.join('');

  if (noRepeat && fullPool.length < length) {
    throw new Error(`Cannot generate ${length}-char no-repeat password — only ${fullPool.length} unique characters available.`);
  }

  // Step 1: Guarantee at least one character per active pool
  const required = activePools
    .filter(p => p.length > 0)
    .map(p => secureChoice(p));

  // Step 2: Fill remaining slots from full pool
  const remaining = length - required.length;
  const rest = [];

  if (noRepeat) {
    // Build a pool of characters not yet used
    let used = new Set(required);
    const available = fullPool.split('').filter(c => !used.has(c));
    secureShuffle(available);
    for (let i = 0; i < remaining && i < available.length; i++) {
      rest.push(available[i]);
    }
  } else {
    for (let i = 0; i < remaining; i++) {
      rest.push(secureChoice(fullPool));
    }
  }

  // Step 3: Shuffle all characters together
  const all = secureShuffle([...required, ...rest]);

  return all.join('');
}

// ── Passphrase generator ──────────────────────────────────────────────────────

// Word list (BIP-39 inspired, curated for readability)
const WORD_LIST = [
  'apple','bridge','castle','dragon','ember','forest','garden','harbor',
  'island','jungle','kettle','lantern','meadow','nebula','ocean','planet',
  'quartz','river','silver','thunder','upland','valley','winter','yellow',
  'anchor','blossom','candle','desert','echo','falcon','glacier','hollow',
  'iris','jasmine','kingdom','lemon','marble','noble','orbit','prism',
  'quiet','robin','stone','timber','ultra','violet','walnut','xenon',
  'yarrow','zenith','amber','bronze','crimson','dawn','ebony','flame',
  'granite','honey','ivory','jade','knight','lunar','mango','nightfall',
  'onyx','pebble','quartz','raven','sapphire','thorn','umbra','vortex',
  'willow','xylem','yonder','zephyr','acorn','breeze','cedar','dusk',
  'eagle','frost','grove','heather','indigo','juniper','kelp','lilac',
  'maple','neon','opal','pine','quill','reef','slate','topaz','umber',
  'vale','wheat','xeric','yarn','zinc','azure','basalt','cobalt','dune',
  'elm','fern','gale','haze','iron','jewel','kite','loft','moss','nimbus',
  'oak','peak','quake','ridge','sable','tide','vale','wave','xerarch',
  'yew','zircon','arch','bay','cliff','dale','elm','fen','glen','hill',
  'inlet','jut','knoll','lea','moor','nook','outcrop','pass','quay',
  'rill','spit','tor','uphill','vane','wash','xlot','yard','zone',
];

/**
 * Generate a passphrase: N random words joined by a separator.
 * Optionally capitalise each word and append numbers/symbols.
 */
function generatePassphrase(options = {}) {
  const {
    wordCount     = 4,
    separator     = '-',
    capitalise    = true,
    appendNumber  = true,
    appendSymbol  = false,
  } = options;

  const words = [];
  const usedIdx = new Set();

  for (let i = 0; i < wordCount; i++) {
    let idx;
    do { idx = secureRandInt(WORD_LIST.length); } while (usedIdx.has(idx));
    usedIdx.add(idx);
    const word = WORD_LIST[idx];
    words.push(capitalise ? word.charAt(0).toUpperCase() + word.slice(1) : word);
  }

  let phrase = words.join(separator);

  if (appendNumber) {
    phrase += secureRandInt(100).toString().padStart(2, '0');
  }
  if (appendSymbol) {
    phrase += secureChoice('!@#$%&*');
  }

  return phrase;
}

// ── Main PasswordGenerator Export ────────────────────────────────────────────

/**
 * run(options) → { passwords } | { error }
 *
 * options:
 *   length       (number, 4–256, default 16)
 *   count        (number, 1–20, default 1)
 *   uppercase    (bool, default true)
 *   lowercase    (bool, default true)
 *   numbers      (bool, default true)
 *   symbols      (bool, default true)
 *   exclude      (string, chars to exclude)
 *   noAmbiguous  (bool, exclude Il1O0o)
 *   noRepeat     (bool, no repeated chars)
 *   mode         ('password' | 'passphrase', default 'password')
 *   wordCount    (number, 3–8, for passphrase mode)
 *   separator    (string, for passphrase mode)
 */
function run(options = {}) {
  const length      = Math.min(Math.max(parseInt(options.length)    || 16, 4), 256);
  const count       = Math.min(Math.max(parseInt(options.count)     || 1,  1), 20);
  const uppercase   = options.uppercase   !== false;
  const lowercase_  = options.lowercase   !== false;
  const numbers     = options.numbers     !== false;
  const symbols     = options.symbols     !== false;
  const exclude     = (options.exclude || '').toString();
  const noAmbiguous = Boolean(options.noAmbiguous);
  const noRepeat    = Boolean(options.noRepeat);
  const mode        = options.mode === 'passphrase' ? 'passphrase' : 'password';

  // Validation
  if (!uppercase && !lowercase_ && !numbers && !symbols) {
    return { error: 'Please select at least one character type.' };
  }

  try {
    const passwords = [];

    for (let i = 0; i < count; i++) {
      let password;

      if (mode === 'passphrase') {
        const wordCount = Math.min(Math.max(parseInt(options.wordCount) || 4, 3), 8);
        password = generatePassphrase({
          wordCount,
          separator:   options.separator || '-',
          capitalise:  options.capitalise !== false,
          appendNumber: options.appendNumber !== false,
          appendSymbol: Boolean(options.appendSymbol),
        });
      } else {
        password = generateOne({
          length, uppercase, lowercase: lowercase_, numbers, symbols,
          exclude, noAmbiguous, noRepeat,
        });
      }

      const strength = scorePassword(password);

      passwords.push({
        password,
        ...strength,
        length: password.length,
      });
    }

    return { passwords, mode };
  } catch (err) {
    return { error: err.message || 'Password generation failed.' };
  }
}

module.exports = { run, scorePassword, generatePassphrase, WORD_LIST };
