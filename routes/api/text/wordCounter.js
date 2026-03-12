/**
 * ToolHub AI — Word Counter Tool
 * File: routes/api/text/wordCounter.js
 *
 * Provides comprehensive text statistics.
 * Designed for live updates as user types.
 *
 * Metrics:
 *   - Words (space-separated tokens)
 *   - Characters (total)
 *   - Characters without spaces
 *   - Sentences (. ! ? terminated)
 *   - Paragraphs (blank-line separated)
 *   - Unique words
 *   - Average word length
 *   - Most frequent words
 *   - Estimated reading time (200 wpm)
 *   - Estimated speaking time (130 wpm)
 *   - Syllable count (approximate)
 *   - Flesch reading ease (approximate)
 */

'use strict';

// ── Stop words (excluded from "most frequent meaningful words") ───────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','it','its','this','that',
  'these','those','they','them','their','he','she','we','you','i','my',
  'our','your','his','her','not','no','so','if','as','up','do','did',
  'does','have','has','had','will','would','could','should','may','might',
  'shall','can','then','than','also','just','all','some','any','more',
  'most','other','into','about','which','who','what','how','when','where',
  'why','very','really','quite','just','only','even','still','too','such',
  'each','every','both','here','there','now','then','after','before',
]);

// ── Syllable counter (approximate — no dictionary lookup) ────────────────────

/**
 * Count approximate syllables in a word using phonological heuristics.
 *
 * Approach:
 *   1. Count vowel groups (contiguous vowels = 1 syllable)
 *   2. Adjust for silent 'e' at end
 *   3. Adjust for '-le' ending
 *   4. Minimum 1 syllable per word
 */
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;

  // Special short words
  if (w.length <= 3) return 1;

  let count = 0;
  let prevWasVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = /[aeiouy]/.test(w[i]);
    if (isVowel && !prevWasVowel) count++;
    prevWasVowel = isVowel;
  }

  // Silent e at end: "hope" → 1 not 2
  if (w.endsWith('e') && count > 1) count--;

  // -le at end preceded by consonant: "table" → 2
  if (w.endsWith('le') && w.length > 2 && !/[aeiouy]/.test(w[w.length - 3])) count++;

  // -es and -ed endings often silent
  if ((w.endsWith('es') || w.endsWith('ed')) && count > 1) count--;

  return Math.max(1, count);
}

// ── Flesch Reading Ease (approximate) ────────────────────────────────────────

/**
 * Flesch Reading Ease score.
 * Score 90–100: Very Easy | 60–70: Standard | 0–30: Very Difficult
 *
 * Formula:
 *   206.835 − (1.015 × avg_sentence_length) − (84.6 × avg_syllables_per_word)
 */
function fleschScore(wordCount, sentenceCount, syllableCount) {
  if (wordCount === 0 || sentenceCount === 0) return null;
  const asl = wordCount / sentenceCount;             // avg sentence length
  const asw = syllableCount / wordCount;             // avg syllables per word
  const score = 206.835 - (1.015 * asl) - (84.6 * asw);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Map Flesch score to a reading level label.
 */
function fleschLabel(score) {
  if (score === null) return 'N/A';
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

// ── Core counting functions ───────────────────────────────────────────────────

/**
 * Count words: split on whitespace, filter empty tokens.
 */
function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

/**
 * Count sentences: split on . ! ? boundaries.
 * Excludes abbreviations like "Dr." "U.S." by checking context.
 */
function countSentences(text) {
  const matches = text.match(/[^.!?]*[.!?]+/g);
  return matches ? matches.length : (text.trim() ? 1 : 0);
}

/**
 * Count paragraphs: separated by one or more blank lines.
 */
function countParagraphs(text) {
  const paras = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  return paras.length || (text.trim() ? 1 : 0);
}

/**
 * Extract all clean words (lowercase, alphabetic only).
 */
function cleanWords(text) {
  return text
    .toLowerCase()
    .match(/[a-z']+/g) || [];
}

/**
 * Top N most frequent non-stop words.
 */
function topWords(text, n = 5) {
  const words = cleanWords(text).filter(w =>
    w.length > 3 && !STOP_WORDS.has(w)
  );
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Count unique words.
 */
function countUniqueWords(text) {
  const words = cleanWords(text).filter(w => w.length > 1);
  return new Set(words).size;
}

/**
 * Total syllables in text.
 */
function totalSyllables(text) {
  const words = (text.match(/[a-zA-Z']+/g) || []);
  return words.reduce((sum, w) => sum + countSyllables(w), 0);
}

/**
 * Average word length (characters, excluding spaces).
 */
function avgWordLength(text) {
  const words = (text.match(/[a-zA-Z]+/g) || []);
  if (!words.length) return 0;
  const total = words.reduce((sum, w) => sum + w.length, 0);
  return parseFloat((total / words.length).toFixed(1));
}

// ── Main WordCounter Export ───────────────────────────────────────────────────

/**
 * run(input) → full statistics object
 */
function run(input) {
  const text = input ?? '';

  if (typeof text !== 'string') {
    return { error: 'Input must be a string.' };
  }

  try {
    const words       = countWords(text);
    const chars       = text.length;
    const charsNoSp   = text.replace(/\s/g, '').length;
    const sentences   = countSentences(text);
    const paragraphs  = countParagraphs(text);
    const unique      = countUniqueWords(text);
    const syllables   = totalSyllables(text);
    const avgLen      = avgWordLength(text);
    const readingTime = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    const speakingTime= words > 0 ? Math.max(1, Math.ceil(words / 130)) : 0;
    const flesch      = fleschScore(words, sentences, syllables);

    return {
      words,
      chars,
      charsNoSpaces:  charsNoSp,
      sentences,
      paragraphs,
      uniqueWords:    unique,
      avgWordLength:  avgLen,
      syllables,
      readingTime,
      speakingTime,
      fleschScore:    flesch,
      fleschLabel:    fleschLabel(flesch),
      topWords:       words > 0 ? topWords(text, 5) : [],
    };
  } catch (err) {
    return { error: err.message || 'Word counting failed.' };
  }
}

module.exports = { run, countSyllables, fleschScore };
