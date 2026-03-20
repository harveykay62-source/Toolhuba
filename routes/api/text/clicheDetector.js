/**
 * ToolHub AI — Cliché Detector
 * File: routes/api/text/clicheDetector.js
 *
 * Detects overused phrases, clichés, jargon, and buzzwords in text.
 * Returns highlighted locations and suggests fresher alternatives.
 * Fully deterministic — no AI.
 */

'use strict';

// ── Cliché Database ───────────────────────────────────────────────────────────

const CLICHES = [
  // Business jargon
  { phrase: 'think outside the box',     category: 'jargon',    severity: 'high',   suggestion: 'think creatively' },
  { phrase: 'at the end of the day',     category: 'filler',    severity: 'high',   suggestion: 'ultimately' },
  { phrase: 'moving forward',            category: 'jargon',    severity: 'medium', suggestion: 'in future' },
  { phrase: 'going forward',             category: 'jargon',    severity: 'medium', suggestion: 'from now on' },
  { phrase: 'circle back',               category: 'jargon',    severity: 'medium', suggestion: 'follow up' },
  { phrase: 'take it offline',           category: 'jargon',    severity: 'medium', suggestion: 'discuss separately' },
  { phrase: 'touch base',               category: 'jargon',    severity: 'medium', suggestion: 'catch up' },
  { phrase: 'bandwidth',                 category: 'jargon',    severity: 'low',    suggestion: 'capacity' },
  { phrase: 'synergy',                   category: 'jargon',    severity: 'high',   suggestion: 'cooperation' },
  { phrase: 'low-hanging fruit',         category: 'jargon',    severity: 'high',   suggestion: 'easy wins' },
  { phrase: 'boil the ocean',            category: 'jargon',    severity: 'high',   suggestion: 'take on too much' },
  { phrase: 'move the needle',           category: 'jargon',    severity: 'high',   suggestion: 'make a real difference' },
  { phrase: 'deep dive',                 category: 'jargon',    severity: 'medium', suggestion: 'thorough investigation' },
  { phrase: 'value-add',                 category: 'jargon',    severity: 'medium', suggestion: 'added benefit' },
  { phrase: 'pain points',               category: 'jargon',    severity: 'medium', suggestion: 'problems' },
  { phrase: 'best practices',            category: 'jargon',    severity: 'low',    suggestion: 'proven methods' },
  { phrase: 'actionable insights',       category: 'jargon',    severity: 'high',   suggestion: 'practical findings' },
  { phrase: 'game-changer',              category: 'jargon',    severity: 'medium', suggestion: 'transformative idea' },
  { phrase: 'paradigm shift',            category: 'jargon',    severity: 'high',   suggestion: 'fundamental change' },
  { phrase: 'disruptive innovation',     category: 'jargon',    severity: 'high',   suggestion: 'industry-changing idea' },
  { phrase: 'leverage',                  category: 'jargon',    severity: 'low',    suggestion: 'use' },
  { phrase: 'pivot',                     category: 'jargon',    severity: 'low',    suggestion: 'change direction' },
  { phrase: 'scalable',                  category: 'jargon',    severity: 'low',    suggestion: 'able to grow' },
  { phrase: 'agile',                     category: 'jargon',    severity: 'low',    suggestion: 'flexible and responsive' },
  { phrase: 'robust solution',           category: 'jargon',    severity: 'medium', suggestion: 'reliable fix' },
  { phrase: 'ecosystem',                 category: 'jargon',    severity: 'low',    suggestion: 'environment' },
  { phrase: 'holistic approach',         category: 'jargon',    severity: 'medium', suggestion: 'complete approach' },
  { phrase: 'core competency',           category: 'jargon',    severity: 'medium', suggestion: 'main strength' },
  { phrase: 'proactive',                 category: 'jargon',    severity: 'low',    suggestion: 'ahead of problems' },
  { phrase: 'hit the ground running',    category: 'cliche',    severity: 'high',   suggestion: 'start immediately' },
  { phrase: 'at this point in time',     category: 'filler',    severity: 'high',   suggestion: 'now' },
  { phrase: 'in terms of',              category: 'filler',    severity: 'medium', suggestion: 'regarding' },
  { phrase: 'due to the fact that',      category: 'filler',    severity: 'high',   suggestion: 'because' },
  { phrase: 'the fact that',             category: 'filler',    severity: 'medium', suggestion: 'that' },
  { phrase: 'it goes without saying',    category: 'cliche',    severity: 'high',   suggestion: 'clearly' },
  { phrase: 'needless to say',           category: 'cliche',    severity: 'high',   suggestion: 'clearly' },
  { phrase: 'the bottom line',           category: 'cliche',    severity: 'medium', suggestion: 'the key point' },
  { phrase: 'on the same page',          category: 'cliche',    severity: 'medium', suggestion: 'in agreement' },
  { phrase: 'back to the drawing board', category: 'cliche',    severity: 'medium', suggestion: 'start over' },
  { phrase: 'ballpark figure',           category: 'cliche',    severity: 'medium', suggestion: 'rough estimate' },
  { phrase: 'ahead of the curve',        category: 'cliche',    severity: 'medium', suggestion: 'leading the way' },
  { phrase: 'step up to the plate',      category: 'cliche',    severity: 'high',   suggestion: 'take responsibility' },
  { phrase: 'bite the bullet',           category: 'cliche',    severity: 'high',   suggestion: 'push through it' },
  { phrase: 'tip of the iceberg',        category: 'cliche',    severity: 'high',   suggestion: 'just the beginning' },
  { phrase: 'the elephant in the room',  category: 'cliche',    severity: 'high',   suggestion: 'the obvious issue' },
  { phrase: 'when all is said and done', category: 'cliche',    severity: 'high',   suggestion: 'ultimately' },
  { phrase: 'at the forefront',          category: 'cliche',    severity: 'low',    suggestion: 'leading' },
  { phrase: 'state of the art',          category: 'cliche',    severity: 'medium', suggestion: 'modern' },
  { phrase: 'cutting edge',              category: 'cliche',    severity: 'medium', suggestion: 'advanced' },
  { phrase: 'world class',               category: 'cliche',    severity: 'medium', suggestion: 'excellent' },
  { phrase: 'best in class',             category: 'cliche',    severity: 'medium', suggestion: 'top-performing' },
  { phrase: 'second to none',            category: 'cliche',    severity: 'medium', suggestion: 'unmatched' },
  // AI-writing markers
  { phrase: 'in conclusion',             category: 'ai-marker', severity: 'medium', suggestion: 'To wrap up,' },
  { phrase: 'in summary',                category: 'ai-marker', severity: 'medium', suggestion: 'To sum up,' },
  { phrase: 'to summarize',              category: 'ai-marker', severity: 'medium', suggestion: 'In short,' },
  { phrase: 'it is worth noting',        category: 'ai-marker', severity: 'medium', suggestion: 'notably,' },
  { phrase: 'it is important to note',   category: 'ai-marker', severity: 'high',   suggestion: 'Importantly,' },
  { phrase: 'it should be noted',        category: 'ai-marker', severity: 'high',   suggestion: 'Notably,' },
  { phrase: 'it is essential to',        category: 'ai-marker', severity: 'medium', suggestion: 'you must' },
  { phrase: 'it is crucial to',          category: 'ai-marker', severity: 'medium', suggestion: 'you need to' },
  { phrase: 'delve into',                category: 'ai-marker', severity: 'high',   suggestion: 'explore' },
  { phrase: 'dive into',                 category: 'ai-marker', severity: 'medium', suggestion: 'explore' },
  { phrase: 'explore the intricacies',   category: 'ai-marker', severity: 'high',   suggestion: 'look at the details of' },
  { phrase: 'a tapestry of',             category: 'ai-marker', severity: 'high',   suggestion: 'a mix of' },
  { phrase: 'the realm of',              category: 'ai-marker', severity: 'high',   suggestion: 'the world of' },
  { phrase: 'foster a culture of',       category: 'ai-marker', severity: 'medium', suggestion: 'build a culture of' },
  { phrase: 'leverage the power of',     category: 'ai-marker', severity: 'high',   suggestion: 'use' },
  { phrase: 'harness the potential of',  category: 'ai-marker', severity: 'high',   suggestion: 'make the most of' },
  { phrase: 'in today\'s fast-paced',    category: 'ai-marker', severity: 'high',   suggestion: 'in modern' },
  { phrase: 'in the ever-changing',      category: 'ai-marker', severity: 'high',   suggestion: 'in a changing' },
  { phrase: 'stands as a testament to',  category: 'ai-marker', severity: 'high',   suggestion: 'proves' },
  { phrase: 'a testament to',            category: 'ai-marker', severity: 'medium', suggestion: 'proof of' },
  { phrase: 'shed light on',             category: 'ai-marker', severity: 'medium', suggestion: 'explain' },
  { phrase: 'embark on a journey',       category: 'ai-marker', severity: 'high',   suggestion: 'begin' },
  { phrase: 'embark on',                 category: 'ai-marker', severity: 'medium', suggestion: 'begin' },
  { phrase: 'navigate the complexities', category: 'ai-marker', severity: 'high',   suggestion: 'handle the challenges' },
  { phrase: 'demystify',                 category: 'ai-marker', severity: 'medium', suggestion: 'explain' },
  { phrase: 'unlock the potential',      category: 'ai-marker', severity: 'high',   suggestion: 'achieve more' },
];

// ── Detection Engine ──────────────────────────────────────────────────────────

function detectCliches(text) {
  const lower = text.toLowerCase();
  const found = [];
  const seenPhrases = new Set();

  for (const entry of CLICHES) {
    const phrase = entry.phrase.toLowerCase();
    if (seenPhrases.has(phrase)) continue;

    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      found.push({
        phrase:     text.slice(idx, idx + entry.phrase.length),
        original:   entry.phrase,
        position:   idx,
        category:   entry.category,
        severity:   entry.severity,
        suggestion: entry.suggestion,
      });
      idx = lower.indexOf(phrase, idx + 1);
    }
    if (lower.includes(phrase)) seenPhrases.add(phrase);
  }

  // Sort by position
  found.sort((a, b) => a.position - b.position);
  return found;
}

function applySuggestions(text, detections) {
  let r = text;
  // Apply in reverse order to preserve positions
  const reversed = [...detections].sort((a, b) => b.position - a.position);
  for (const d of reversed) {
    const before = r.slice(0, d.position);
    const after  = r.slice(d.position + d.phrase.length);
    const rep    = d.suggestion;
    // Preserve capitalisation
    const cap = d.phrase[0] === d.phrase[0].toUpperCase() && d.phrase[0] !== d.phrase[0].toLowerCase();
    const finalRep = cap ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
    r = before + finalRep + after;
  }
  return r;
}

function run(input, options = {}) {
  const text = (input || '').trim();

  if (!text) return { error: 'Please enter some text to check.' };
  if (text.length > 10000) return { error: 'Text too long. Maximum 10,000 characters.' };

  const detections = detectCliches(text);

  const categorySummary = {};
  for (const d of detections) {
    if (!categorySummary[d.category]) categorySummary[d.category] = 0;
    categorySummary[d.category]++;
  }

  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const d of detections) severityCounts[d.severity]++;

  const cleaned = options.autoReplace ? applySuggestions(text, detections) : null;

  const score = Math.max(0, 100 - (severityCounts.high * 10) - (severityCounts.medium * 5) - (severityCounts.low * 2));

  return {
    detections,
    clicheCount:    detections.length,
    categorySummary,
    severityCounts,
    freshnessScore: score,
    freshnessLabel: score >= 85 ? 'Fresh & Original' : score >= 65 ? 'Mostly Fresh' : score >= 40 ? 'Some Clichés' : 'Heavy Cliché Use',
    cleaned,
    wordCount:      text.split(/\s+/).length,
  };
}

module.exports = { run };
