/**
 * ToolHub AI — Bullet Point Converter
 * File: routes/api/text/bulletPoints.js
 *
 * Converts flowing prose into structured bullet points.
 * Supports numbered lists, nested bullets, and multiple
 * output styles. Fully deterministic — no AI.
 */

'use strict';

// ── Sentence Importance Scoring ───────────────────────────────────────────────

const HIGH_IMPORTANCE_SIGNALS = [
  /\b(key|main|primary|critical|important|essential|vital|crucial|significant|major|core|central)\b/i,
  /\b(first|second|third|finally|lastly|in conclusion|in summary|most importantly)\b/i,
  /\b(must|should|need to|have to|is required|are required)\b/i,
  /\b(result|outcome|finding|conclusion|benefit|advantage|reason|cause|effect)\b/i,
  /\b(always|never|every|all|none|only|specifically|particularly)\b/i,
  /\b(step|stage|phase|process|procedure|method|approach)\b/i,
];

const LOW_IMPORTANCE_SIGNALS = [
  /^(however|although|while|whereas|despite|nevertheless|that said)/i,
  /\b(for example|for instance|such as|e\.g\.|i\.e\.)\b/i,
  /\b(additionally|furthermore|moreover|also|as well)\b/i,
];

function scoreImportance(sentence) {
  let score = 5;
  const wordCount = sentence.split(/\s+/).length;

  // Length penalty: very short or very long sentences score lower
  if (wordCount < 5)  score -= 2;
  if (wordCount > 40) score -= 1;
  if (wordCount >= 8 && wordCount <= 25) score += 1;

  for (const pattern of HIGH_IMPORTANCE_SIGNALS) {
    if (pattern.test(sentence)) score += 2;
  }
  for (const pattern of LOW_IMPORTANCE_SIGNALS) {
    if (pattern.test(sentence)) score -= 1;
  }

  return Math.max(0, score);
}

// ── Sentence Cleaning for Bullets ────────────────────────────────────────────

function cleanForBullet(sentence) {
  let s = sentence.trim();

  // Remove leading connectors that don't belong in a bullet
  s = s.replace(/^(However|Furthermore|Moreover|Additionally|Also|That said|In fact|Indeed|Similarly|Likewise|Therefore|Thus|Hence|Consequently|As a result|In addition|On the other hand|By contrast|In contrast|Meanwhile|At the same time),?\s+/i, '');

  // Capitalise first letter
  s = s.charAt(0).toUpperCase() + s.slice(1);

  // Ensure ends with a period
  if (!/[.!?]$/.test(s)) s += '.';

  return s;
}

// ── List Detection ────────────────────────────────────────────────────────────

function detectExistingList(text) {
  const listPatterns = [
    /^\s*[\-\*\•]\s+/m,         // existing bullets
    /^\s*\d+[\.\)]\s+/m,        // existing numbered list
    /^\s*[a-z][\.\)]\s+/im,     // existing lettered list
  ];
  return listPatterns.some(p => p.test(text));
}

// ── Main Conversion ───────────────────────────────────────────────────────────

function convertToBullets(text, options) {
  const { segmentSentences } = require('./humanizer');

  const style    = options.style || 'bullet';   // bullet | number | dash | check
  const maxItems = options.maxItems || 10;
  const minScore = options.minScore || 4;

  const BULLET_CHARS = { bullet: '•', number: null, dash: '-', check: '☐' };
  const bulletChar = BULLET_CHARS[style] || '•';

  // Split paragraphs, process each
  const paragraphs = text.split(/\n{2,}/);
  const allBullets = [];
  let itemIndex    = 1;

  for (const para of paragraphs) {
    if (!para.trim()) continue;

    const sentences = segmentSentences(para);
    const scored    = sentences.map(s => ({ text: s, score: scoreImportance(s) }));

    // Sort by importance, take top sentences, then re-sort by original order
    const topSentences = scored
      .filter(s => s.score >= minScore && s.text.split(/\s+/).length >= 4)
      .slice(0, maxItems - allBullets.length);

    for (const { text: s } of topSentences) {
      const cleaned = cleanForBullet(s);
      if (style === 'number') {
        allBullets.push(`${itemIndex}. ${cleaned}`);
      } else {
        allBullets.push(`${bulletChar} ${cleaned}`);
      }
      itemIndex++;
      if (allBullets.length >= maxItems) break;
    }

    if (allBullets.length >= maxItems) break;
  }

  // Fallback: if nothing scored high enough, take all sentences
  if (allBullets.length === 0) {
    const { segmentSentences } = require('./humanizer');
    const sentences = segmentSentences(text).slice(0, maxItems);
    sentences.forEach((s, i) => {
      const cleaned = cleanForBullet(s);
      if (style === 'number') allBullets.push(`${i + 1}. ${cleaned}`);
      else allBullets.push(`${bulletChar} ${cleaned}`);
    });
  }

  return allBullets;
}

function run(input, options = {}) {
  const text = (input || '').trim();

  if (!text) return { error: 'Please enter some text to convert.' };
  if (text.split(/\s+/).length < 5) return { error: 'Please enter at least a sentence or two.' };
  if (text.length > 10000) return { error: 'Text too long. Maximum 10,000 characters.' };

  const style    = ['bullet', 'number', 'dash', 'check'].includes(options.style) ? options.style : 'bullet';
  const maxItems = Math.min(Math.max(parseInt(options.maxItems) || 10, 3), 25);

  try {
    const bullets = convertToBullets(text, { style, maxItems });
    const result  = bullets.join('\n');

    return {
      result,
      bullets,
      bulletCount:    bullets.length,
      style,
      originalWords:  text.split(/\s+/).length,
      reducedTo:      `${bullets.length} bullet points`,
    };
  } catch (err) {
    return { error: err.message || 'Conversion failed.' };
  }
}

module.exports = { run };
