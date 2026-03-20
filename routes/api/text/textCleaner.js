/**
 * ToolHub AI — Text Cleaner
 * File: routes/api/text/textCleaner.js
 *
 * Cleans messy text: removes duplicate lines, fixes spacing,
 * strips invisible characters, normalises encoding artifacts,
 * and applies a configurable suite of cleanup rules.
 * Fully deterministic — no AI.
 */

'use strict';

// ── Cleanup Rule Sets ─────────────────────────────────────────────────────────

// Rule 1: Invisible / zero-width characters
function removeInvisibleChars(text) {
  return text
    .replace(/\u200B/g, '')      // zero-width space
    .replace(/\u200C/g, '')      // zero-width non-joiner
    .replace(/\u200D/g, '')      // zero-width joiner
    .replace(/\uFEFF/g, '')      // byte order mark
    .replace(/\u00AD/g, '')      // soft hyphen
    .replace(/\u2028/g, '\n')    // line separator → newline
    .replace(/\u2029/g, '\n\n'); // paragraph separator → double newline
}

// Rule 2: Normalise smart quotes and dashes to ASCII
function normaliseTypography(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")   // curly single quotes
    .replace(/[\u201C\u201D]/g, '"')   // curly double quotes
    .replace(/\u2014/g, ' — ')         // em dash
    .replace(/\u2013/g, '–')           // en dash
    .replace(/\u2026/g, '...')         // ellipsis character
    .replace(/\u00A0/g, ' ')           // non-breaking space
    .replace(/\u2022/g, '-')           // bullet → hyphen
    .replace(/\u25CF/g, '-')           // filled circle → hyphen
    .replace(/\u25A0/g, '-')           // filled square → hyphen
    .replace(/\u2605/g, '*')           // star → asterisk
    .replace(/\u00B7/g, '·');          // middle dot (keep)
}

// Rule 3: Normalise line endings
function normaliseLineEndings(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// Rule 4: Remove trailing whitespace from each line
function trimLineWhitespace(text) {
  return text
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
}

// Rule 5: Collapse multiple blank lines into max two
function collapseBlankLines(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

// Rule 6: Collapse multiple spaces into one (within lines)
function collapseSpaces(text) {
  return text
    .split('\n')
    .map(line => line.replace(/[ \t]{2,}/g, ' ').trimStart())
    .join('\n');
}

// Rule 7: Remove duplicate consecutive lines
function removeDuplicateLines(text) {
  const lines  = text.split('\n');
  const result = [];
  let lastNonEmpty = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed === lastNonEmpty) continue;
    result.push(line);
    if (trimmed.length > 0) lastNonEmpty = trimmed;
  }
  return result.join('\n');
}

// Rule 8: Remove duplicate consecutive sentences (within paragraphs)
function removeDuplicateSentences(text) {
  const paragraphs = text.split('\n\n');
  return paragraphs.map(para => {
    const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
    const seen    = new Set();
    const unique  = [];
    for (const s of sentences) {
      const key = s.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }
    return unique.join(' ').trim();
  }).join('\n\n');
}

// Rule 9: Strip HTML tags
function stripHTML(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, ' — ')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...');
}

// Rule 10: Fix spacing around punctuation
function fixPunctuationSpacing(text) {
  return text
    .replace(/\s+([.,!?;:)\]])/g, '$1')   // remove space before punct
    .replace(/([(\[{])\s+/g, '$1')         // remove space after opening bracket
    .replace(/([.,!?;:])\s*([^\s\d])/g, '$1 $2') // ensure space after punct
    .replace(/([.,!?;:])\s{2,}/g, '$1 '); // collapse multiple spaces after punct
}

// Rule 11: Fix common OCR / encoding artifacts
function fixEncodingArtifacts(text) {
  return text
    .replace(/ﬁ/g, 'fi')    // fi ligature
    .replace(/ﬂ/g, 'fl')    // fl ligature
    .replace(/ﬀ/g, 'ff')    // ff ligature
    .replace(/ﬃ/g, 'ffi')   // ffi ligature
    .replace(/ﬄ/g, 'ffl')   // ffl ligature
    .replace(/\u00B5/g, 'µ') // micro sign
    .replace(/\u0060/g, "'") // backtick → apostrophe
    .replace(/={3,}/g, '---')// ===... → ---
    .replace(/-{4,}/g, '---'); // ----... → ---
}

// Rule 12: Remove common boilerplate phrases
function removeBoilerplate(text, options) {
  if (!options.removeBoilerplate) return text;
  const BOILERPLATE = [
    /^unsubscribe from .+$/gmi,
    /^click here to .+$/gmi,
    /^this email was sent to .+$/gmi,
    /^you are receiving this .+$/gmi,
    /^privacy policy\s*[|·•]\s*terms of service.*/gmi,
    /^\s*©\s*\d{4}.*/gmi,
    /^all rights reserved.*/gmi,
    /^powered by .+$/gmi,
    /^sent from my iphone$/gmi,
    /^get outlook for ios.*/gmi,
  ];
  let r = text;
  for (const p of BOILERPLATE) r = r.replace(p, '');
  return r;
}

// Rule 13: Normalise bullet points
function normaliseBullets(text) {
  return text
    .replace(/^[\-\*\•\·]\s+/gm, '• ')
    .replace(/^\d+\)\s+/gm, (m, offset) => `${m.trim().replace(')', '.')} `)
    .replace(/^[→➜➡►▶]\s+/gm, '• ');
}

// ── Main Engine ───────────────────────────────────────────────────────────────

function run(input, options = {}) {
  const text = input || '';

  if (!text.trim()) return { error: 'Please enter some text to clean.' };
  if (text.length > 50000) return { error: 'Text too long. Maximum 50,000 characters.' };

  const opts = {
    removeHTML:         options.removeHTML         !== false,
    removeDuplicates:   options.removeDuplicates   !== false,
    fixSpacing:         options.fixSpacing         !== false,
    normaliseTypo:      options.normaliseTypo      !== false,
    removeBoilerplate:  options.removeBoilerplate  === true,
    fixEncoding:        options.fixEncoding        !== false,
    normaliseBullets:   options.normaliseBullets   !== false,
  };

  const changes = [];
  let r = text;
  const orig = text;

  r = removeInvisibleChars(r);
  r = normaliseLineEndings(r);

  if (opts.removeHTML && /<[a-z][\s\S]*>/i.test(r)) {
    r = stripHTML(r);
    changes.push('Removed HTML tags');
  }

  if (opts.fixEncoding) {
    const before = r;
    r = fixEncodingArtifacts(r);
    if (r !== before) changes.push('Fixed encoding artifacts (ligatures, symbols)');
  }

  if (opts.normaliseTypo) {
    const before = r;
    r = normaliseTypography(r);
    if (r !== before) changes.push('Normalised smart quotes and special characters');
  }

  if (opts.normaliseBullets) {
    const before = r;
    r = normaliseBullets(r);
    if (r !== before) changes.push('Normalised bullet points');
  }

  if (opts.fixSpacing) {
    r = trimLineWhitespace(r);
    const before = r;
    r = collapseSpaces(r);
    r = fixPunctuationSpacing(r);
    r = collapseBlankLines(r);
    if (r !== before) changes.push('Fixed spacing and punctuation gaps');
  }

  if (opts.removeDuplicates) {
    const before = r;
    r = removeDuplicateLines(r);
    r = removeDuplicateSentences(r);
    if (r !== before) changes.push('Removed duplicate lines and sentences');
  }

  if (opts.removeBoilerplate) {
    const before = r;
    r = removeBoilerplate(r, opts);
    if (r !== before) changes.push('Removed email/web boilerplate text');
  }

  r = r.trim();

  return {
    result:       r,
    changed:      r !== orig.trim(),
    changes,
    changeCount:  changes.length,
    originalLength: orig.length,
    cleanedLength:  r.length,
    charsRemoved:   orig.length - r.length,
  };
}

module.exports = { run };
