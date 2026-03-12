/**
 * ToolHub AI — Summarizer Tool
 * File: routes/api/text/summarizer.js
 *
 * Condenses long text into shorter summaries using deterministic rules.
 * No AI or external APIs. Supports short / medium / long output lengths.
 *
 * Laws applied:
 *   Law 1 — Filler Word Removal
 *   Law 2 — Redundant Sentence Removal
 *   Law 3 — Keyword Importance Scoring
 *   Law 4 — Sentence Compression
 *   Law 5 — Length Targeting (short / medium / long)
 */

'use strict';

const { segmentSentences, tokenize } = require('./humanizer');

// ── Summary Law 1: Filler Word Removal ───────────────────────────────────────

const FILLER_PATTERNS = [
  // Adverbial fillers (weak intensifiers)
  /\bvery\s+/gi,
  /\breally\s+/gi,
  /\bextremely\s+/gi,
  /\bbasically\s+/gi,
  /\bactually\s+/gi,
  /\bquite\s+/gi,
  /\brather\s+/gi,
  /\bpretty\s+(?=\w)/gi,   // "pretty fast" but not "pretty" standalone
  /\bjust\s+(?=\w)/gi,     // "just do" not "just."
  /\bsimply\s+/gi,
  /\bmerely\s+/gi,
  /\bliterally\s+/gi,
  /\bhonestly\s+/gi,
  /\bsomewhat\s+/gi,
  /\bfairly\s+/gi,
  /\bstill\s+(?=a\s|an\s|the\s)/gi, // "still a very" → filler "still"
  // Redundant phrase openers
  /\bit\s+is\s+worth\s+noting\s+that\s+/gi,
  /\bit\s+is\s+important\s+to\s+note\s+that\s+/gi,
  /\bit\s+should\s+be\s+noted\s+that\s+/gi,
  /\bplease\s+note\s+that\s+/gi,
  /\bas\s+mentioned\s+(?:above|before|earlier|previously)[,.]?\s+/gi,
  /\bof\s+course[,.]?\s+/gi,
  /\bneedless\s+to\s+say[,.]?\s+/gi,
  /\bin\s+other\s+words[,.]?\s+/gi,
  /\bso\s+to\s+speak[,.]?\s+/gi,
  /\bso\s+to\s+say[,.]?\s+/gi,
  /\bif\s+you\s+will[,.]?\s+/gi,
];

function removeFiller(sentence) {
  let r = sentence;
  for (const pat of FILLER_PATTERNS) {
    r = r.replace(pat, ' ');
  }
  // Clean up double spaces and re-capitalise
  r = r.replace(/\s{2,}/g, ' ').trim();
  return r.charAt(0).toUpperCase() + r.slice(1);
}

// ── Summary Law 2: Redundant Sentence Detection ───────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','it','its','this','that',
  'these','those','they','them','their','he','she','we','you','i','my',
  'our','your','his','her','not','no','so','if','as','up','do','did',
  'does','have','has','had','will','would','could','should','may','might',
  'shall','can','then','than','also','just','all','some','any','more',
  'most','other','into','about','which','who','what','very','really',
]);

/**
 * Extract "content words" — ignoring stop words and very short tokens.
 */
function contentWords(sentence) {
  return tokenize(sentence)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

/**
 * Jaccard similarity between two sets of content words.
 * Returns a value between 0 (no overlap) and 1 (identical content).
 */
function jaccardSimilarity(wordsA, wordsB) {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

const REDUNDANCY_THRESHOLD = 0.55; // sentences with ≥55% word overlap are "redundant"

/**
 * Law 2: Remove redundant sentences.
 * Among any group of sentences that are highly similar, keep only the longest
 * (most informative) one.
 */
function removeRedundantSentences(sentences) {
  const kept = [];
  const skipped = new Set();

  for (let i = 0; i < sentences.length; i++) {
    if (skipped.has(i)) continue;

    const wordsI = contentWords(sentences[i]);
    let dominated = false;

    for (let j = 0; j < i; j++) {
      if (skipped.has(j)) continue;
      const wordsJ = contentWords(sentences[j]);
      const sim = jaccardSimilarity(wordsI, wordsJ);

      if (sim >= REDUNDANCY_THRESHOLD) {
        // Keep whichever is longer (more informative)
        if (sentences[i].length > sentences[j].length) {
          // Replace j in kept with i
          const jIdx = kept.indexOf(sentences[j]);
          if (jIdx !== -1) kept.splice(jIdx, 1, sentences[i]);
          skipped.add(j);
        } else {
          skipped.add(i);
        }
        dominated = true;
        break;
      }
    }

    if (!dominated && !skipped.has(i)) {
      kept.push(sentences[i]);
    }
  }

  return kept;
}

// ── Summary Law 3: Keyword Importance Scoring ─────────────────────────────────

/**
 * Build a term-frequency map from the entire corpus.
 * Returns a Map<word, frequency>.
 */
function buildFrequencyMap(sentences) {
  const freq = new Map();
  for (const s of sentences) {
    for (const w of contentWords(s)) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return freq;
}

/**
 * Detect simple English nouns heuristically:
 * - Not in stop words
 * - Length > 3
 * - Doesn't look like a verb (rough heuristic: doesn't end in -ing, -ed unless it's a gerund)
 * This is a simplified approximation, not a full POS tagger.
 */
function countNouns(sentence) {
  const words = tokenize(sentence)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Heuristic nouns: doesn't end in -ing, -ly, -ed (common verb/adverb suffixes)
  return words.filter(w =>
    !w.endsWith('ing') &&
    !w.endsWith('ly') &&
    !w.endsWith('tion') &&   // keep -tion (often nouns like "education")
    !/^(was|were|been|being|have|having|does|doing|goes|going)$/.test(w)
  ).length;
}

/**
 * Law 3: Score each sentence.
 * score = Σ(frequency of each content word) / normalised_sentence_length + noun_density
 */
function scoreSentences(sentences, freqMap) {
  return sentences.map((s, index) => {
    const words = contentWords(s);
    if (words.length === 0) return { sentence: s, score: 0, index };

    const keywordScore = words.reduce((sum, w) => sum + (freqMap.get(w) || 0), 0);
    const normalised   = keywordScore / Math.sqrt(words.length); // sqrt-normalised
    const nounBonus    = countNouns(s) * 0.5;

    // Position bonus: first sentence often contains the topic
    const positionBonus = index === 0 ? 2.0 : index === 1 ? 0.5 : 0;

    return {
      sentence: s,
      score:    normalised + nounBonus + positionBonus,
      index,
    };
  });
}

// ── Summary Law 4: Sentence Compression ──────────────────────────────────────

/**
 * Remove non-essential parenthetical / relative clauses and appositives.
 *
 * Patterns removed:
 *   "X, which [clause]," → "X,"
 *   "X, who [clause]," → "X,"
 *   "X (details)" → "X"
 *   "X, a [appositive]," → "X"
 */
function compressSentence(sentence) {
  let r = sentence;

  // Remove parenthetical remarks in parentheses
  r = r.replace(/\s*\([^)]{3,80}\)/g, '');

  // Remove non-restrictive relative clauses: ", which ..., "
  r = r.replace(/,\s*which\s+[^,]+,\s*/gi, ' ');
  r = r.replace(/,\s*who\s+[^,]+,\s*/gi, ' ');

  // Remove appositives: "Einstein, a German-born physicist, was..."
  r = r.replace(/,\s+a\s+[a-z][^,]{3,40},\s+(?=[a-z])/gi, ' ');
  r = r.replace(/,\s+an\s+[a-z][^,]{3,40},\s+(?=[a-z])/gi, ' ');

  // Remove mid-sentence dash clauses: "— clause —"
  r = r.replace(/\s*—[^—]{3,60}—\s*/g, ' ');

  // Remove qualifier phrases
  r = r.replace(/,\s*(?:however|for instance|in fact|of course|for example)[,.]?\s*/gi, ' ');

  // Clean up
  r = r.replace(/\s{2,}/g, ' ').trim();
  r = r.replace(/,\s*([.!?])/g, '$1');  // remove trailing comma before period
  r = r.charAt(0).toUpperCase() + r.slice(1);

  return r;
}

// ── Summary Law 5: Length Targeting ──────────────────────────────────────────

const LENGTH_RATIOS = {
  short:  0.20,  // 20% of sentences
  medium: 0.40,  // 40% of sentences
  long:   0.65,  // 65% of sentences
};

/**
 * Calculate how many sentences to include based on length target.
 */
function targetCount(totalSentences, length) {
  const ratio = LENGTH_RATIOS[length] || LENGTH_RATIOS.medium;
  return Math.max(1, Math.ceil(totalSentences * ratio));
}

// ── Main Summarizer Export ────────────────────────────────────────────────────

/**
 * run(input, options) → { result, originalWords, summaryWords, reduction, sentencesUsed }
 *
 * options.length = 'short' | 'medium' | 'long'
 */
function run(input, options = {}) {
  const text   = (input || '').trim();
  const length = ['short', 'medium', 'long'].includes(options.length) ? options.length : 'medium';

  if (!text) {
    return { error: 'Please enter some text to summarize.' };
  }
  if (text.split(/\s+/).filter(Boolean).length < 10) {
    return { error: 'Text is too short to summarize. Please enter at least a few sentences.' };
  }

  try {
    // Step 1 — Segment (General Law 1)
    let sentences = segmentSentences(text);
    if (sentences.length < 2) {
      return { error: 'Could not detect multiple sentences. Try adding punctuation between sentences.' };
    }

    // Step 2 — Law 1: Remove filler words from each sentence
    sentences = sentences.map(removeFiller);

    // Step 3 — Law 2: Remove redundant sentences
    const deduped = removeRedundantSentences(sentences);
    const working = deduped.length >= 2 ? deduped : sentences; // fallback if too aggressive

    // Step 4 — Law 3: Score sentences
    const freqMap = buildFrequencyMap(working);
    const scored  = scoreSentences(working, freqMap);

    // Step 5 — Law 5: Determine target count
    const needed = targetCount(working.length, length);

    // Always keep the first sentence (topic/context anchor) + top-scoring others
    const firstSentence = scored.find(s => s.index === 0);
    const rest = scored.filter(s => s.index !== 0).sort((a, b) => b.score - a.score);
    const topRest = rest.slice(0, Math.max(0, needed - 1));

    // Re-sort by original position to maintain narrative flow
    const selected = [firstSentence, ...topRest]
      .filter(Boolean)
      .sort((a, b) => a.index - b.index)
      .map(s => s.sentence);

    // Step 6 — Law 4: Compress selected sentences
    const compressed = selected.map(compressSentence);

    // Assemble summary
    let summary = compressed.join(' ');

    // Ensure summary ends with punctuation
    if (!/[.!?]$/.test(summary)) summary += '.';

    // Final capitalisation pass
    summary = summary.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());

    // Statistics
    const originalWords = text.split(/\s+/).filter(Boolean).length;
    const summaryWords  = summary.split(/\s+/).filter(Boolean).length;
    const reduction     = Math.max(0, Math.round((1 - summaryWords / originalWords) * 100));

    return {
      result:         summary,
      originalWords,
      summaryWords,
      reduction,
      sentencesUsed:  selected.length,
      totalSentences: sentences.length,
    };
  } catch (err) {
    return { error: err.message || 'Summarization failed. Please try again.' };
  }
}

module.exports = { run, scoreSentences, compressSentence, removeFiller };
