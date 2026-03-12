/**
 * ToolHub AI — Humanizer Tool
 * File: routes/api/text/humanizer.js
 *
 * Rewrites robotic or AI-generated text into natural human-style writing
 * using deterministic linguistic rules. Zero AI/API usage.
 *
 * Rules applied (Rules 1–50):
 *   Rule  1 — Sentence Segmentation
 *   Rule  2 — Tokenization
 *   Rule  3 — Preserve Meaning
 *   Rule  4 — Grammar Integrity
 *   Rule  5 — Output Must Differ
 *   Rule  6 — Passive to Active Conversion
 *   Rule  7 — Active to Passive Conversion (paraphraser mode)
 *   Rule  8 — Move Time Phrases
 *   Rule  9 — Move Location Phrases
 *   Rule 10 — Split Long Sentences (>25 words)
 *   Rule 11 — Merge Short Sentences (<6 words)
 *   Rule 12 — Synonym Replacement (Adjectives)
 *   Rule 13 — Synonym Replacement (Verbs)
 *   Rule 14 — Synonym Replacement (Nouns)
 *   Rule 15 — Avoid Replacing Proper Nouns
 *   Rule 16 — Avoid Replacing Technical Terms
 *   Rule 17 — Contraction Replacement (formal → casual)
 *   Rule 18 — Formal Expansion (casual → formal)
 *   Rule 19 — Remove Redundant Words
 *   Rule 20 — Remove Filler Words
 *   Rule 21 — Add Transition Words
 *   Rule 22 — Clause Reordering
 *   Rule 23 — Sentence Combination
 *   Rule 24 — Sentence Simplification
 *   Rule 25 — Phrase Replacement
 *   Rule 26 — Rephrase Questions
 *   Rule 27 — Change Sentence Openings
 *   Rule 28 — Add Introductory Phrases
 *   Rule 29 — Adjust Word Order
 *   Rule 30 — Pronoun Replacement
 *   Rule 31 — Expand Short Expressions
 *   Rule 32 — Reduce Wordiness
 *   Rule 33 — Replace Repeated Verbs
 *   Rule 34 — Vary Sentence Length
 *   Rule 35 — Avoid Identical Sentence Patterns
 *   Rule 36 — Add Mild Descriptive Words
 *   Rule 37 — Remove Unnecessary Adverbs
 *   Rule 38 — Normalize Spacing
 *   Rule 39 — Capitalization Correction
 *   Rule 40 — Punctuation Correction
 *   Rule 41 — Subject–Verb Agreement
 *   Rule 42 — Verb Tense Consistency
 *   Rule 43 — Remove Duplicate Sentences
 *   Rule 44 — Simplify Nested Clauses
 *   Rule 45 — Insert Linking Words
 *   Rule 46 — Summarization Compression
 *   Rule 47 — Keyword Preservation
 *   Rule 48 — Sentence Importance Scoring
 *   Rule 49 — Readability Adjustment
 *   Rule 50 — Final Validation
 */

'use strict';

// ── Rule 1: Sentence Segmentation & Rule 2: Tokenization ─────────────────────

/**
 * Rule 1 — Split input text into sentences using ".", "!", and "?"
 * before processing. Handles abbreviations (Mr., Dr., etc.) to avoid
 * false splits.
 */
function segmentSentences(text) {
  // Protect known abbreviations
  const abbrevProtected = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd|Corp|Gov|Dept|Fig|approx|est|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi,
      (m) => m.replace('.', '<<DOT>>'))
    .replace(/\b([A-Z])\.([A-Z])\./g, '$1<<DOT>>$2<<DOT>>'); // initials

  const raw = rawSplit(abbrevProtected);

  return raw
    .map(s => s.replace(/<<DOT>>/g, '.').trim())
    .filter(s => s.length > 0);
}

function rawSplit(text) {
  // Split on sentence-ending punctuation followed by whitespace + capital or end-of-string
  const parts = [];
  const re = /([^.!?]+[.!?]+["']?\s*)/g;
  let match;
  let lastIndex = 0;

  while ((match = re.exec(text)) !== null) {
    parts.push(match[0].trim());
    lastIndex = re.lastIndex;
  }
  // Any trailing text without punctuation
  const tail = text.slice(lastIndex).trim();
  if (tail) parts.push(tail);

  return parts.length > 0 ? parts : [text.trim()];
}

/**
 * Rule 2 — Tokenization: split sentences into individual words (tokens)
 * so transformations can operate on them.
 */
function tokenize(sentence) {
  return sentence.match(/[A-Za-z'']+|[0-9]+(?:[.,][0-9]+)?|[^\s]/g) || [];
}

// ── Rule 17: Contraction Replacement (formal → casual) ───────────────────────

const CONTRACTION_MAP = [
  // ── Prompt Rule 40: Apply contractions ───────────────────────────────────
  // Negatives first (higher specificity)
  [/\bcannot\b/gi,              "can't"],
  [/\bwill not\b/gi,            "won't"],
  [/\bshall not\b/gi,           "shan't"],
  [/\bdo not\b/gi,              "don't"],
  [/\bdoes not\b/gi,            "doesn't"],
  [/\bdid not\b/gi,             "didn't"],
  [/\bhave not\b/gi,            "haven't"],
  [/\bhas not\b/gi,             "hasn't"],
  [/\bhad not\b/gi,             "hadn't"],
  [/\bwas not\b/gi,             "wasn't"],
  [/\bwere not\b/gi,            "weren't"],
  [/\bis not\b/gi,              "isn't"],
  [/\bare not\b/gi,             "aren't"],
  [/\bcould not\b/gi,           "couldn't"],
  [/\bwould not\b/gi,           "wouldn't"],
  [/\bshould not\b/gi,          "shouldn't"],
  [/\bmight not\b/gi,           "mightn't"],
  [/\bmust not\b/gi,            "mustn't"],
  [/\bneed not\b/gi,            "needn't"],
  // Pronoun + be / will / would / have
  [/\bI am\b/g,                 "I'm"],
  [/\bI will\b/g,               "I'll"],
  [/\bI would\b/g,              "I'd"],
  [/\bI have\b/g,               "I've"],
  [/\bI had\b/g,                "I'd"],
  [/\byou are\b/gi,             "you're"],
  [/\byou will\b/gi,            "you'll"],
  [/\byou would\b/gi,           "you'd"],
  [/\byou have\b/gi,            "you've"],
  [/\bhe is\b/gi,               "he's"],
  [/\bhe will\b/gi,             "he'll"],
  [/\bhe would\b/gi,            "he'd"],
  [/\bhe has\b/gi,              "he's"],
  [/\bshe is\b/gi,              "she's"],
  [/\bshe will\b/gi,            "she'll"],
  [/\bshe would\b/gi,           "she'd"],
  [/\bshe has\b/gi,             "she's"],
  [/\bit is\b/gi,               "it's"],
  [/\bit will\b/gi,             "it'll"],
  [/\bit has\b/gi,              "it's"],
  [/\bwe are\b/gi,              "we're"],
  [/\bwe will\b/gi,             "we'll"],
  [/\bwe would\b/gi,            "we'd"],
  [/\bwe have\b/gi,             "we've"],
  [/\bthey are\b/gi,            "they're"],
  [/\bthey will\b/gi,           "they'll"],
  [/\bthey would\b/gi,          "they'd"],
  [/\bthey have\b/gi,           "they've"],
  [/\bthat is\b/gi,             "that's"],
  [/\bthere is\b/gi,            "there's"],
  [/\bthere are\b/gi,           "there're"],
  [/\bhere is\b/gi,             "here's"],
  [/\bwhat is\b/gi,             "what's"],
  [/\bwhat are\b/gi,            "what're"],
  [/\bwho is\b/gi,              "who's"],
  [/\bwho has\b/gi,             "who's"],
  [/\blet us\b/gi,              "let's"],
  [/\bwould have\b/gi,          "would've"],
  [/\bcould have\b/gi,          "could've"],
  [/\bshould have\b/gi,         "should've"],
  [/\bmight have\b/gi,          "might've"],
  [/\bmust have\b/gi,           "must've"],
];

function applyContractions(text) {
  let result = text;
  for (const [pattern, replacement] of CONTRACTION_MAP) {
    result = result.replace(pattern, (match) => {
      // Preserve leading capitalisation
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  return result;
}

// ── Rule 6: Passive to Active Conversion ─────────────────────────────────────

// Dictionary mapping irregular past participles to base/simple past forms
const PAST_PARTICIPLE_TO_BASE = {
  written: { base: 'write', past: 'wrote' },
  made: { base: 'make', past: 'made' },
  done: { base: 'do', past: 'did' },
  seen: { base: 'see', past: 'saw' },
  found: { base: 'find', past: 'found' },
  given: { base: 'give', past: 'gave' },
  taken: { base: 'take', past: 'took' },
  known: { base: 'know', past: 'knew' },
  shown: { base: 'show', past: 'showed' },
  built: { base: 'build', past: 'built' },
  sent: { base: 'send', past: 'sent' },
  read: { base: 'read', past: 'read' },
  told: { base: 'tell', past: 'told' },
  held: { base: 'hold', past: 'held' },
  brought: { base: 'bring', past: 'brought' },
  sold: { base: 'sell', past: 'sold' },
  bought: { base: 'buy', past: 'bought' },
  thought: { base: 'think', past: 'thought' },
  taught: { base: 'teach', past: 'taught' },
  caught: { base: 'catch', past: 'caught' },
  heard: { base: 'hear', past: 'heard' },
  led: { base: 'lead', past: 'led' },
  met: { base: 'meet', past: 'met' },
  run: { base: 'run', past: 'ran' },
  won: { base: 'win', past: 'won' },
  lost: { base: 'lose', past: 'lost' },
  left: { base: 'leave', past: 'left' },
  paid: { base: 'pay', past: 'paid' },
  put: { base: 'put', past: 'put' },
  set: { base: 'set', past: 'set' },
  cut: { base: 'cut', past: 'cut' },
  hit: { base: 'hit', past: 'hit' },
  drawn: { base: 'draw', past: 'drew' },
  driven: { base: 'drive', past: 'drove' },
  eaten: { base: 'eat', past: 'ate' },
  fallen: { base: 'fall', past: 'fell' },
  frozen: { base: 'freeze', past: 'froze' },
  chosen: { base: 'choose', past: 'chose' },
  spoken: { base: 'speak', past: 'spoke' },
  stolen: { base: 'steal', past: 'stole' },
  broken: { base: 'break', past: 'broke' },
  born: { base: 'bear', past: 'bore' },
  forgotten: { base: 'forget', past: 'forgot' },
  forgiven: { base: 'forgive', past: 'forgave' },
  given: { base: 'give', past: 'gave' },
  hidden: { base: 'hide', past: 'hid' },
  ridden: { base: 'ride', past: 'rode' },
  risen: { base: 'rise', past: 'rose' },
  shaken: { base: 'shake', past: 'shook' },
  worn: { base: 'wear', past: 'wore' },
  thrown: { base: 'throw', past: 'threw' },
  beaten: { base: 'beat', past: 'beat' },
  begun: { base: 'begin', past: 'began' },
  bitten: { base: 'bite', past: 'bit' },
  blown: { base: 'blow', past: 'blew' },
  chosen: { base: 'choose', past: 'chose' },
  grown: { base: 'grow', past: 'grew' },
  proven: { base: 'prove', past: 'proved' },
  risen: { base: 'rise', past: 'rose' },
  spoken: { base: 'speak', past: 'spoke' },
  sworn: { base: 'swear', past: 'swore' },
  torn: { base: 'tear', past: 'tore' },
  woven: { base: 'weave', past: 'wove' },
  written: { base: 'write', past: 'wrote' },
};

/**
 * Convert a regular past participle (verb + ed) to its simple past form.
 * E.g., "completed" → "completed", "started" → "started"
 */
function regularParticipleToSimplePast(verb) {
  // Already simple past for regular verbs — just return it
  return verb;
}

/**
 * Rule 6 — Detect passive patterns (was/were + verb + by) and convert
 * to active voice.
 *
 * Patterns handled:
 *   "Subject was/were [pp] by Agent." → "Agent [past-tense] Subject."
 *   "Subject was/were [pp]."          → left as-is (agentless passive)
 *   "Subject is/are being [pp] by Agent." → "Agent is/are [v-ing] Subject."
 */
function passiveToActive(sentence) {
  // Pattern 1: was/were + pp + by + agent (full passive)
  // e.g. "The report was written by John." → "John wrote the report."
  const fullPassive = /^(.*?)\b(was|were|is|are|has been|have been)\s+([a-z]+(?:ed|en|t|d))\s+by\s+(.+?)([.!?]*)$/i;
  const match = fullPassive.exec(sentence.trim());

  if (match) {
    const [, subjectPart, auxVerb, participle, agentPart, punct] = match;
    const subject = subjectPart.trim().replace(/^(the|a|an)\s+/i, '').trim();
    const agent = agentPart.trim();
    const pp = participle.toLowerCase();

    let activeVerb;
    const tense = /^(was|were|has been|have been)$/i.test(auxVerb) ? 'past' : 'present';

    if (PAST_PARTICIPLE_TO_BASE[pp]) {
      activeVerb = tense === 'past'
        ? PAST_PARTICIPLE_TO_BASE[pp].past
        : PAST_PARTICIPLE_TO_BASE[pp].base;
    } else {
      // Regular verb — strip -ed if needed
      if (tense === 'past') {
        activeVerb = pp; // e.g. "completed" stays as "completed"
      } else {
        // Remove trailing 'd' for present (e.g. "helped" → "help")
        activeVerb = pp.endsWith('ed') ? pp.slice(0, -2) || pp.slice(0, -1) : pp;
      }
    }

    // Capitalise first letter of agent
    const agentCap = agent.charAt(0).toUpperCase() + agent.slice(1);
    const subjectLower = subject.charAt(0).toLowerCase() + subject.slice(1);

    return `${agentCap} ${activeVerb} the ${subjectLower}${punct || '.'}`;
  }

  return sentence; // No transformation applicable
}

// ── Rule 10: Split Long Sentences & Rule 11: Merge Short Sentences ───────────

/**
 * Word count of a sentence (approximate).
 */
function wordCount(sentence) {
  return sentence.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Rule 10 — If a sentence has more than 25 words, split it into two sentences.
 * Rule 11 — If a sentence has fewer than 6 words, flag it for merging.
 */
const MIN_WORDS = 6;
const MAX_WORDS = 25;

function splitLongSentence(sentence) {
  if (wordCount(sentence) <= MAX_WORDS) return [sentence];

  // Try to split at conjunctions/connectors near the middle
  const splitMarkers = [
    /,\s*(however|but|yet|although|though|while|whereas|and)\s+/i,
    /\s+(which|who|that)\s+/i,
    /;\s*/,
    /,\s*(and|or|but|so)\s+/i,
  ];

  for (const marker of splitMarkers) {
    const idx = sentence.search(marker);
    if (idx > 10 && idx < sentence.length - 10) {
      const part1 = sentence.slice(0, idx).trim();
      const matchResult = sentence.slice(idx).match(marker);
      const connector = matchResult ? matchResult[0] : '';
      const part2Raw = sentence.slice(idx + connector.length).trim();
      const part2 = part2Raw.charAt(0).toUpperCase() + part2Raw.slice(1);

      // Ensure both parts end with punctuation
      const p1 = /[.!?]$/.test(part1) ? part1 : part1 + '.';
      const p2 = /[.!?]$/.test(part2) ? part2 : part2 + '.';

      if (wordCount(p1) >= 4 && wordCount(p2) >= 4) {
        return [p1, p2];
      }
    }
  }

  return [sentence]; // Cannot split cleanly
}

/**
 * Merge two short sentences into one compound sentence.
 */
function mergeShortSentences(s1, s2) {
  // Strip terminal punctuation from s1
  const base1 = s1.trim().replace(/[.!?]+$/, '');
  const base2 = s2.trim();
  const lower2 = base2.charAt(0).toLowerCase() + base2.slice(1);

  // Pick a joining strategy
  const endPunct = /[.!?]+$/.exec(s2)?.[0] || '.';
  const stripped2 = lower2.replace(/[.!?]+$/, '');

  return `${base1}, and ${stripped2}${endPunct}`;
}

function applySentenceLengthVariation(sentences) {
  const result = [];
  let i = 0;

  while (i < sentences.length) {
    const s = sentences[i];
    const wc = wordCount(s);

    if (wc < MIN_WORDS && i + 1 < sentences.length) {
      // Merge with next sentence (Law 3)
      result.push(mergeShortSentences(s, sentences[i + 1]));
      i += 2;
    } else if (wc > MAX_WORDS) {
      // Split into two (Law 3)
      const parts = splitLongSentence(s);
      result.push(...parts);
      i++;
    } else {
      result.push(s);
      i++;
    }
  }

  return result;
}

// ── Rule 30: Pronoun Replacement & Rule 43: Remove Duplicate Sentences ────────

/**
 * Extract significant nouns/noun phrases (simplified — capitalised words or
 * words that repeat across nearby sentences).
 */
function extractKeyNouns(sentence) {
  const words = tokenize(sentence);
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','as','is','are','was','were','be','been','it','its','this',
    'that','these','those','they','them','their','he','she','we','you','i',
    'my','our','your','his','her','not','so','if','up','do','did','does',
    'have','has','had','will','would','could','should','may','might','shall',
    'can','then','than','also','just','very','really','quite','all','some',
    'any','more','most','other','such','into','about','which','who','what',
  ]);

  return words
    .filter(w => /^[a-z]/i.test(w) && w.length > 3 && !stopWords.has(w.toLowerCase()))
    .map(w => w.toLowerCase());
}

/**
 * Humanizer Law 4: Remove redundant noun repetition across adjacent sentences.
 * When the same specific noun appears in the subject of consecutive sentences,
 * replace the second occurrence with an appropriate pronoun.
 */
const PRONOUN_MAP = {
  // People / things → common pronoun substitutions
  default_singular: 'it',
  default_plural: 'they',
};

/**
 * Rule 30 — Replace repeated nouns with pronouns where grammatically correct.
 * Rule 43 — If two sentences express the same idea, keep one.
 */
function removeRepetition(sentences) {
  // Rule 43: Remove duplicate sentences (exact or near-identical)
  const seen = new Set();
  const deduped = sentences.filter(s => {
    const normalized = s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  // Rule 30: Pronoun replacement for repeated leading nouns
  const result = [deduped[0]];
  for (let i = 1; i < deduped.length; i++) {
    const prev = deduped[i - 1];
    const curr = deduped[i];

    const prevNouns = extractKeyNouns(prev);
    const currNouns = extractKeyNouns(curr);
    const shared = prevNouns.filter(n => currNouns.includes(n));

    if (shared.length > 0) {
      const noun = shared[0];
      const pattern = new RegExp(`\\bThe\\s+${noun}\\b`, 'i');
      const replaced = curr.replace(pattern, 'It');
      if (replaced !== curr && replaced.length > 5) {
        result.push(replaced);
        continue;
      }
    }
    result.push(curr);
  }
  return result;
}

// ── Rule 21: Add Transition Words & Rule 28: Add Introductory Phrases ─────────

const TRANSITIONS = {
  contrast:    ['However,', 'That said,', 'On the other hand,', 'Still,', 'Even so,'],
  addition:    ['Additionally,', 'Furthermore,', 'On top of that,', 'Also,', 'In addition,'],
  result:      ['Therefore,', 'As a result,', 'Consequently,', 'So,', 'This means that'],
  example:     ['For example,', 'For instance,', 'To illustrate,', 'As an example,'],
  time:        ['Meanwhile,', 'At the same time,', 'Shortly after,', 'Later,', 'Eventually,'],
};

// Simple cue-word → transition-type mapping
const TRANSITION_CUES = [
  [/\b(but|although|however|despite|while|whereas|yet)\b/i, 'contrast'],
  [/\b(also|additionally|furthermore|moreover)\b/i,         'addition'],
  [/\b(so|therefore|thus|hence|consequently|as a result)\b/i, 'result'],
  [/\b(for example|for instance|such as|like)\b/i,         'example'],
  [/\b(then|after|later|next|finally|eventually)\b/i,       'time'],
];

function pickTransition(type, index) {
  const list = TRANSITIONS[type] || TRANSITIONS.addition;
  return list[index % list.length];
}

/**
 * Insert transition words at natural paragraph-level boundaries.
 * Applied every 3rd sentence and only if the sentence does not already
 * start with a connector.
 */
function addTransitions(sentences) {
  const startsWithConnector = /^(However|Therefore|Meanwhile|Additionally|Furthermore|For example|That said|Also|So|And|But|Yet|Still|Even|Because|Since|Although)/i;

  return sentences.map((s, i) => {
    if (i === 0 || i % 3 !== 0) return s;
    if (startsWithConnector.test(s)) return s;

    // Detect what type of transition fits
    let type = 'addition';
    for (const [cue, t] of TRANSITION_CUES) {
      if (cue.test(s)) { type = t; break; }
    }

    const transition = pickTransition(type, i);
    const lower = s.charAt(0).toLowerCase() + s.slice(1);
    return `${transition} ${lower}`;
  });
}

// ── Rule 20: Remove Filler Words & Rule 25: Phrase Replacement ────────────────

const STIFF_VOCAB = [
  // ── Prompt: Word Simplification Replacements (Rules 1–38) ────────────────
  [/\butiliz(?:e[sd]?|es|ing|ation)\b/gi, 'use'],
  [/\benhance[sd]?\b/gi,                  'improve'],
  [/\benhancing\b/gi,                     'improving'],
  [/\benhancement[s]?\b/gi,               'improvement'],
  [/\bgenerating\b/gi,                    'creating'],
  [/\bgenerated\b/gi,                     'created'],
  [/\bgenerate[sd]?\b/gi,                 'make'],
  [/\baforementioned\b/gi,                'previously mentioned'],
  [/\bmust be addressed\b/gi,             'need to be handled'],
  [/\bmust be dealt with\b/gi,            'need to be handled'],
  [/\boperational efficiency\b/gi,        'efficiency'],
  [/\boperational\b/gi,                   'working'],
  [/\bfacilitat(?:e[sd]?|es|ing)\b/gi,  'help'],
  [/\bimplement\b/gi,            'set up'],
  [/\bleverage\b/gi,             'use'],
  [/\boptimal\b/gi,              'best'],
  [/\boptimize\b/gi,             'improve'],
  [/\bcommenc(?:e[sd]?|es|ing)\b/gi,   'start'],
  [/\bterminate\b/gi,            'end'],
  [/\bpurchase\b/gi,             'buy'],
  [/\bsubsequently\b/gi,         'then'],
  [/\bfurthermore\b/gi,          'also'],
  [/\bnevertheless\b/gi,         'still'],
  [/\bnotwithstanding\b/gi,      'despite'],
  [/\bconsequently\b/gi,         'so'],
  [/\bapproximately\b/gi,        'about'],
  [/\bnumerous\b/gi,             'many'],
  [/\badditional\b/gi,           'more'],
  [/\bminimal\b/gi,              'small'],
  [/\bmaximum\b/gi,              'most'],
  [/\bsufficient\b/gi,           'enough'],
  [/\brequire\b/gi,              'need'],
  [/\bobtain\b/gi,               'get'],
  [/\bpossess\b/gi,              'have'],
  [/\bendeavor\b/gi,             'try'],
  [/\bdemonstrate\b/gi,          'show'],
  [/\bascertain\b/gi,            'find out'],
  [/\binquire\b/gi,              'ask'],
  [/\bcomprehend\b/gi,           'understand'],
  [/\bassistance\b/gi,           'help'],
  [/\breside[sd]?\b/gi,             'live'],
  [/\bconsume[sd]?\b/gi,            'eat'],
  [/\bconstruct[sed]?\b/gi,         'build'],
  [/\brequest\b/gi,              'ask'],
  [/\brespond\b/gi,              'answer'],
  [/\bindicate\b/gi,             'show'],
  [/\billustrate\b/gi,           'show'],
  [/\bperform\b/gi,              'do'],
  [/\baccomplish\b/gi,           'do'],
  [/\bobserve\b/gi,              'see'],
  [/\bperceive\b/gi,             'notice'],
  [/\bdetermine\b/gi,            'decide'],
  [/\bevaluate\b/gi,             'judge'],
  [/\bexamine\b/gi,              'check'],
  [/\binitiate\b/gi,             'begin'],
  [/\bconclude\b/gi,             'finish'],
  [/\bmaintain\b/gi,             'keep'],
  [/\bretain\b/gi,               'keep'],
  [/\bestablish\b/gi,            'create'],
  [/\bproduce\b/gi,              'make'],
  [/\bgenerate\b/gi,             'make'],
  [/\bmodify\b/gi,               'change'],
  [/\balter\b/gi,                'change'],
  [/\btransform\b/gi,            'change'],
  [/\benhance\b/gi,              'improve'],
  [/\breduce\b/gi,               'cut'],
  [/\bincrease\b/gi,             'raise'],
  [/\bdecrease\b/gi,             'lower'],
  [/\bassist\b/gi,               'help'],
  [/\bsupport\b/gi,              'help'],
  [/\baid\b/gi,                  'help'],
  // ── Legacy entries kept for compatibility ─────────────────────────────────
  [/\bprovide assistance\b/gi,   'help'],
  [/\binitiation\b/gi,           'start'],
  [/\bimplementation\b/gi,       'use'],
  [/\butilization\b/gi,          'use'],
  [/\bfunctionality\b/gi,        'feature'],
  [/\bsignificant\b/gi,          'important'],
  [/\bsignificantly\b/gi,        'greatly'],
  [/\bexhibit\b/gi,              'show'],
  [/\bexhibits\b/gi,             'shows'],
  // ── v3 additions: academic / corp-speak / jargon ─────────────────────────
  [/\bsubstantiate[sd]?\b/gi,          'prove'],
  [/\bvalidate[sd]?\b/gi,              'confirm'],
  [/\bpromulgate[sd]?\b/gi,            'issue'],
  [/\bprocure[sd]?\b/gi,               'get'],
  [/\bformulate[sd]?\b/gi,             'create'],
  [/\bdelineate[sd]?\b/gi,             'describe'],
  [/\bexpedite[sd]?\b/gi,              'speed up'],
  [/\bmitigate[sd]?\b/gi,              'reduce'],
  [/\bexacerbate[sd]?\b/gi,            'worsen'],
  [/\bameliorat(?:e[sd]?|ing)\b/gi,    'improve'],
  [/\baugment(?:ed|s)?\b/gi,           'add to'],
  [/\bconcur(?:red|s)?\b/gi,           'agree'],
  [/\bdisseminate[sd]?\b/gi,           'share'],
  [/\bconvey(?:ed|s)?\b/gi,            'share'],
  [/\baddress(?:es)?\b/gi,             'deal with'],
  [/\baddressed\b/gi,                   'handled'],
  [/\bnavigate[sd]?\b/gi,              'deal with'],
  [/\bexplor(?:e[sd]?|ing)\b/gi,       'look at'],
  [/\binvestigat(?:e[sd]?|ing)\b/gi,   'look into'],
  [/\bcontemplate[sd]?\b/gi,           'think about'],
  [/\bdiscern(?:ed|s)?\b/gi,           'see'],
  [/\bemphasiz(?:e[sd]?|ing)\b/gi,     'stress'],
  [/\bunderscor(?:e[sd]?|ing)\b/gi,    'point out'],
  [/\bparamount\b/gi,                  'most important'],
  [/\bcommensurate\b/gi,               'matching'],
  [/\bfeasible\b/gi,                   'possible'],
  [/\bviable\b/gi,                     'workable'],
  [/\btangible\b/gi,                   'real'],
  [/\banomalous\b/gi,                  'unusual'],
  [/\bphenomenon\b/gi,                 'event'],
  [/\bphenomena\b/gi,                  'events'],
  [/\bparadigm\b/gi,                   'model'],
  [/\btheoretical(?:ly)?\b/gi,         'in theory'],
  [/\bhypothetical(?:ly)?\b/gi,        'in theory'],
  [/\bempirical(?:ly)?\b/gi,           'based on data'],
  [/\bframework\b/gi,                  'structure'],
  [/\bmechanism\b/gi,                  'how it works'],
  [/\bmechanisms\b/gi,                 'how they work'],
  [/\binfrastructure\b/gi,             'systems'],
  [/\becosystem\b/gi,                  'environment'],
  [/\blandscape\b/gi,                  'field'],
  [/\btrajectory\b/gi,                 'path'],
  [/\bsynergy\b/gi,                    'teamwork'],
  [/\bsynergies\b/gi,                  'teamwork benefits'],
  [/\bholistic\b/gi,                   'overall'],
  [/\brobust\b/gi,                     'strong'],
  [/\bscalable\b/gi,                   'adaptable'],
  [/\binnovative\b/gi,                 'new'],
  [/\bcutting-edge\b/gi,               'latest'],
  [/\bstate-of-the-art\b/gi,           'latest'],
  [/\bgroundbreaking\b/gi,             'new'],
  [/\btransformative\b/gi,             'major'],
  [/\bimpactful\b/gi,                  'effective'],
  [/\bactionable\b/gi,                 'practical'],
  [/\binsightful\b/gi,                 'useful'],
  [/\bstakeholder\b/gi,                'person involved'],
  [/\bstakeholders\b/gi,               'people involved'],
  [/\bstreamline[sd]?\b/gi,            'simplify'],
  [/\bprioritize[sd]?\b/gi,            'focus on'],
  [/\ballocate[sd]?\b/gi,              'give out'],
  [/\badherence\b/gi,                  'following'],
  [/\bcompliance\b/gi,                 'following'],
  [/\bassessment\b/gi,                 'review'],
  [/\bevaluation\b/gi,                 'review'],
  [/\bexamination\b/gi,                'check'],
  [/\bconfiguration\b/gi,              'setup'],
  [/\bspecification\b/gi,              'details'],
  [/\bdocumentation\b/gi,              'docs'],
  [/\bcapabilities\b/gi,               'features'],
  [/\bcharacteristics\b/gi,            'traits'],
  [/\bcomponents\b/gi,                 'parts'],
  [/\bfacets\b/gi,                     'sides'],
  [/\bgame changer\b/gi,               'big deal'],
  [/\bvalue-added\b/gi,                'useful'],
  [/\bbest practices\b/gi,             'the best approach'],
  [/\bdeep dive\b/gi,                  'detailed look'],
  [/\bon the same page\b/gi,           'in agreement'],
  [/\bwin-win\b/gi,                    'good for everyone'],
  [/\bpivot\b/gi,                      'change direction'],
  [/\bblue sky thinking\b/gi,          'creative thinking'],
  [/\bdriving force\b/gi,              'main reason'],
  [/\bkey takeaways?\b/gi,             'main point'],
  [/\bsynthesize[sd]?\b/gi,            'combine'],
  [/\bintegrate[sd]?\b/gi,             'combine'],
  [/\bcoordinate[sd]?\b/gi,            'organize'],
  [/\bpotentially\b/gi,                'possibly'],
  [/\bsubsequent\b/gi,                 'next'],
  [/\bprecedent\b/gi,                  'earlier example'],
  [/\bsuccessive\b/gi,                 'following'],
  [/\bcomprehensive\b/gi,              'thorough'],
  [/\bextensive\b/gi,                  'wide'],
  [/\bexhaustive\b/gi,                 'thorough'],
  [/\binherently\b/gi,                 'naturally'],
  [/\bfundamentally\b/gi,              'basically'],
  [/\bprimarily\b/gi,                  'mainly'],
  [/\bpervasive(?:ly)?\b/gi,           'widespread'],
  [/\bprevalent\b/gi,                  'common'],
  [/\bindispensable\b/gi,              'essential'],
  [/\bcommencement\b/gi,               'start'],
  [/\bterminology\b/gi,                'terms'],
  [/\bmethodology\b/gi,                'method'],
  [/\btaxonomy\b/gi,                   'classification'],
  [/\boutcome\b/gi,                    'result'],
  [/\boutcomes\b/gi,                   'results'],
  [/\bdeliverable\b/gi,                'output'],
  [/\bdeliverables\b/gi,               'outputs'],

];

const AI_FILLERS = [
  // ── Prompt Rule 39: Remove AI filler phrases ──────────────────────────────
  /\b(certainly|absolutely|of course|indeed|undoubtedly)[,.]?\s*/gi,
  /it is important to note that\s*/gi,
  /please note that\s*/gi,
  /it should be noted that\s*/gi,
  /I would like to\s*/gi,
  /I am pleased to\s*/gi,
  /I am happy to\s*/gi,
  /as an AI(?: language model)?[,.]?\s*/gi,
  /I hope this (?:helps|answers|clarifies)[^.]*\.?\s*/gi,
  /feel free to (?:ask|reach out)[^.]*\.?\s*/gi,
  /is there anything else I can help you with\??\s*/gi,
  /let me know if you (?:need|have)[^.]*\.?\s*/gi,
  /\bgreat question\b[,.]?\s*/gi,
  /\bclearly,?\s*/gi,
  /\bbased on the information provided,?\s*/gi,
  // ── v3 additions: more AI signatures ─────────────────────────────────────
  /as a language model[,.]?\s*/gi,
  /as an artificial intelligence[,.]?\s*/gi,
  /I('m| am) an AI[^.]*\.\s*/gi,
  /without a doubt[,.]?\s*/gi,
  /without question[,.]?\s*/gi,
  /it is worth noting that\s*/gi,
  /it is worth mentioning that\s*/gi,
  /it should be pointed out that\s*/gi,
  /it goes without saying that\s*/gi,
  /it is to be noted that\s*/gi,
  /one must note that\s*/gi,
  /I am delighted to\s*/gi,
  /I am thrilled to\s*/gi,
  /I am glad to\s*/gi,
  /I am here to\s*/gi,
  /I hope that (?:helps|answers|clarifies)[^.]*\.?\s*/gi,
  /I trust this (?:helps|clarifies)[^.]*\.?\s*/gi,
  /don't hesitate to (?:ask|reach out|contact)[^.]*\.?\s*/gi,
  /is there anything I can (?:assist|help) you with\??\s*/gi,
  /is there anything else you(?:'d like| would like| need)[^?]*\??\s*/gi,
  /please let me know if[^.]*\.?\s*/gi,
  /\bwonderful question[!,.]?\s*/gi,
  /\bexcellent question[!,.]?\s*/gi,
  /\bgreat point[!,.]?\s*/gi,
  /\bobviously,?\s+(?=\w)/gi,
  /\bI will (?:delve|dive) (?:into|deeper)[^.]*\.\s*/gi,
  /\blet(?:'s| us) (?:delve|dive) (?:into|deeper)[^.]*\.\s*/gi,
];

function replaceStiffVocab(text) {
  let r = text;
  for (const [pat, rep] of STIFF_VOCAB) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

function removeAIFillers(text) {
  let r = text;
  for (const pat of AI_FILLERS) {
    r = r.replace(pat, '');
  }
  return r;
}

// ── Rule 8: Move Time Phrases ─────────────────────────────────────────────────

const TIME_PHRASE_RE = /,?\s*(yesterday|today|tomorrow|last\s+\w+|this\s+\w+|next\s+\w+|recently|currently|now|then|later|earlier|soon|finally|eventually|meanwhile|at\s+[\w\s]+|in\s+the\s+\w+|during\s+[\w\s]+)\s*[,.]?\s*$/i;

/**
 * Rule 8 — Move time phrases to the beginning of sentences for variety.
 */
function moveTimePhraseToFront(sentence) {
  const trailMatch = sentence.match(/^(.+?),\s*(yesterday|today|recently|currently|last\s+\w+|this\s+\w+|next\s+\w+|meanwhile|earlier|later|soon|now)\s*([.!?]*)$/i);
  if (trailMatch) {
    const [, main, indicator, punct] = trailMatch;
    const indCap = indicator.charAt(0).toUpperCase() + indicator.slice(1);
    const mainLower = main.charAt(0).toLowerCase() + main.slice(1);
    return `${indCap}, ${mainLower}${punct || '.'}`;
  }
  return sentence;
}

// ── Rule 9: Move Location Phrases ────────────────────────────────────────────

const LOCATION_PHRASE_RE = /\b(in the \w+|at the \w+|at \w+|on the \w+|near the \w+|inside the \w+|outside the \w+|across the \w+)\b/i;

/**
 * Rule 9 — Move location phrases (in the office, at the park) to different positions.
 * Moves a trailing location phrase to the front if detected.
 */
function moveLocationPhrase(sentence) {
  const trailLoc = sentence.match(/^(.+?),\s*((?:in|at|on|near|inside|outside|across)\s+the\s+\w+)\s*([.!?]*)$/i);
  if (trailLoc) {
    const [, main, loc, punct] = trailLoc;
    const locCap = loc.charAt(0).toUpperCase() + loc.slice(1);
    const mainLower = main.charAt(0).toLowerCase() + main.slice(1);
    return `${locCap}, ${mainLower}${punct || '.'}`;
  }
  return sentence;
}

// ── Rule 19: Remove Redundant Words ──────────────────────────────────────────

const REDUNDANT_PATTERNS = [
  [/\bcompletely\s+finished\b/gi, 'finished'],
  [/\bfree\s+gift\b/gi, 'gift'],
  [/\bfuture\s+plans\b/gi, 'plans'],
  [/\bpast\s+history\b/gi, 'history'],
  [/\bclose\s+proximity\b/gi, 'proximity'],
  [/\bbasic\s+fundamentals\b/gi, 'fundamentals'],
  [/\bfinal\s+outcome\b/gi, 'outcome'],
  [/\bunexpected\s+surprise\b/gi, 'surprise'],
  [/\btrue\s+facts\b/gi, 'facts'],
  [/\badvance\s+planning\b/gi, 'planning'],
  [/\brepeat\s+again\b/gi, 'repeat'],
  [/\bask\s+a\s+question\b/gi, 'ask'],
  [/\bsee\s+with\s+(?:your|their|his|her)\s+own\s+eyes\b/gi, 'see for themselves'],
  [/\b(very|really|extremely|quite)\s+\1\b/gi, '$1'],
];

/**
 * Rule 19 — Remove duplicate words or redundant phrases appearing close together.
 */
function removeRedundantWords(text) {
  let r = text;
  for (const [pat, rep] of REDUNDANT_PATTERNS) {
    r = r.replace(pat, rep);
  }
  // Remove immediately repeated words (e.g. "the the")
  r = r.replace(/\b(\w+)\s+\1\b/gi, '$1');
  return r;
}

// ── Rule 26: Rephrase Questions ───────────────────────────────────────────────

/**
 * Rule 26 — Rewrite questions using alternate structures.
 * Converts "What is X?" → "What does X refer to?" and similar.
 */
function rephraseQuestion(sentence) {
  const stripped = sentence.trim();

  // "What is [noun]?" → "What does [noun] mean?"
  const whatIs = stripped.match(/^What\s+is\s+(.+?)\??$/i);
  if (whatIs) {
    return `What does ${whatIs[1]} mean?`;
  }

  // "Can you [do something]?" → "Is it possible to [do something]?"
  const canYou = stripped.match(/^Can\s+you\s+(.+?)\??$/i);
  if (canYou) {
    return `Is it possible to ${canYou[1]}?`;
  }

  // "Do you know [X]?" → "Are you aware of [X]?"
  const doYouKnow = stripped.match(/^Do\s+you\s+know\s+(.+?)\??$/i);
  if (doYouKnow) {
    return `Are you aware of ${doYouKnow[1]}?`;
  }

  return sentence;
}

// ── Rule 27: Change Sentence Openings ────────────────────────────────────────

const OPENING_SWAPS = [
  // "The [noun] [verb]..." → "It is [noun] that [verb]..."  (cleft)
  [/^The\s+(\w+)\s+(is|was|has|can|will|should)\s+/i, (m, noun, aux) => `It is the ${noun} that ${aux} `],
  // "We should X" → "X is recommended"
  [/^We\s+should\s+/i, () => 'It is recommended to '],
  // "There is a [noun]" → "A [noun] exists"  (limited)
  [/^There\s+is\s+a\s+(\w+)\s+/i, (m, noun) => `A ${noun} exists `],
];

/**
 * Rule 27 — Start sentences with different words or phrases.
 */
function changeSentenceOpening(sentence, index) {
  if (index % 4 !== 3) return sentence; // only apply occasionally
  for (const [pat, replacer] of OPENING_SWAPS) {
    const m = sentence.match(pat);
    if (m) {
      const rest = sentence.slice(m[0].length);
      const newOpen = typeof replacer === 'function' ? replacer(...m) : replacer;
      const result = newOpen + rest;
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
  }
  return sentence;
}

// ── Rule 29: Adjust Word Order ────────────────────────────────────────────────

/**
 * Rule 29 — Swap the position of objects, modifiers, or phrases.
 * Example: "She quickly ran" → "She ran quickly"
 */
function adjustWordOrder(sentence) {
  // Move adverb from before verb to after verb
  return sentence.replace(
    /\b(she|he|they|we|it|i)\s+(quickly|slowly|carefully|quietly|loudly|gently|firmly|clearly)\s+(\w+ed|\w+s|\w+ing)\b/gi,
    (m, subj, adv, verb) => `${subj} ${verb} ${adv}`
  );
}

// ── Rule 31: Expand Short Expressions ────────────────────────────────────────

const SHORT_EXPANSIONS = [
  [/\bASAP\b/g, 'as soon as possible'],
  [/\bFYI\b/g, 'for your information'],
  [/\betc\.\b/g, 'and so on'],
  [/\be\.g\.\b/g, 'for example'],
  [/\bi\.e\.\b/g, 'that is'],
  [/\bvs\.\b/g, 'versus'],
  [/\bapprox\.\b/g, 'approximately'],
];

/**
 * Rule 31 — Expand short expressions slightly to improve readability.
 */
function expandShortExpressions(text) {
  let r = text;
  for (const [pat, rep] of SHORT_EXPANSIONS) {
    r = r.replace(pat, rep);
  }
  return r;
}

// ── Rule 32: Reduce Wordiness ─────────────────────────────────────────────────

const WORDY_PHRASES = [
  // ── Grammar repair: "being use" (artifact of stiff vocab firing before passive check)
  [/\bbeing\s+use\b/gi,                              'being used'],
  [/\b(is|are|was|were)\s+being\s+use\b/gi,          '$1 being used'],
  [/\bbeing utili(?:z|s)ed\b/gi,                     'being used'],
  // ── Prompt: Common Phrase Simplifications (Rules 15–25) ──────────────────
  [/\bin order to\b/gi,                    'to'],
  [/\bdue to the fact that\b/gi,           'because'],
  [/\bat this point in time\b/gi,          'now'],
  [/\bat the present time\b/gi,            'now'],
  [/\bin the near future\b/gi,             'soon'],
  [/\bfor the purpose of\b/gi,             'to'],
  [/\bwith regard to\b/gi,                 'about'],
  [/\bin the event that\b/gi,              'if'],
  [/\bprior to\b/gi,                       'before'],
  [/\bsubsequent to\b/gi,                  'after'],
  [/\ba large number of\b/gi,              'many'],
  [/\ba majority of\b/gi,                  'most'],
  [/\ba small number of\b/gi,              'few'],
  [/\bin spite of the fact that\b/gi,      'although'],
  [/\bas a result of\b/gi,                 'because of'],
  [/\bin the process of\b/gi,              'while'],
  [/\bwith the exception of\b/gi,          'except'],
  [/\bin relation to\b/gi,                 'about'],
  [/\bin accordance with\b/gi,             'following'],
  [/\bfor the reason that\b/gi,            'because'],
  [/\bin addition to\b/gi,                 'besides'],
  // ── Additional wordiness patterns ────────────────────────────────────────
  [/\bin spite of the fact that\b/gi,      'although'],
  [/\bhas the ability to\b/gi,             'can'],
  [/\bis able to\b/gi,                     'can'],
  [/\bmake a decision\b/gi,                'decide'],
  [/\btake into consideration\b/gi,        'consider'],
  [/\bcome to the conclusion\b/gi,         'conclude'],
  [/\bon a regular basis\b/gi,             'regularly'],
  [/\bthe fact that\b/gi,                  'that'],
  [/\bthe reason why\b/gi,                 'why'],
  [/\bdespite the fact that\b/gi,          'although'],
  [/\bregardless of the fact that\b/gi,    'even though'],
];

/**
 * Rule 32 — Replace long phrases with shorter alternatives.
 */
function reduceWordiness(text) {
  let r = text;
  for (const [pat, rep] of WORDY_PHRASES) {
    r = r.replace(pat, (match) =>
      match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep
    );
  }
  return r;
}

// ── Rule 33: Replace Repeated Verbs ──────────────────────────────────────────

const VERB_ALTERNATES = {
  said:  ['noted', 'mentioned', 'stated', 'explained', 'added'],
  went:  ['traveled', 'moved', 'headed', 'proceeded'],
  got:   ['obtained', 'received', 'acquired', 'gained'],
  made:  ['created', 'produced', 'built', 'developed'],
  took:  ['grabbed', 'seized', 'captured', 'picked up'],
  came:  ['arrived', 'appeared', 'emerged', 'showed up'],
  saw:   ['noticed', 'observed', 'spotted', 'witnessed'],
  knew:  ['understood', 'recognized', 'realized', 'appreciated'],
};

/**
 * Rule 33 — If the same verb appears repeatedly across sentences,
 * replace later occurrences with alternatives.
 */
function replaceRepeatedVerbs(sentences) {
  const verbUsageCount = {};
  return sentences.map(sentence => {
    let result = sentence;
    for (const [verb, alternates] of Object.entries(VERB_ALTERNATES)) {
      const re = new RegExp(`\\b${verb}\\b`, 'gi');
      if (re.test(result)) {
        verbUsageCount[verb] = (verbUsageCount[verb] || 0) + 1;
        if (verbUsageCount[verb] > 1) {
          const alt = alternates[(verbUsageCount[verb] - 2) % alternates.length];
          result = result.replace(new RegExp(`\\b${verb}\\b`, 'gi'), (m) =>
            m[0] === m[0].toUpperCase() ? alt.charAt(0).toUpperCase() + alt.slice(1) : alt
          );
        }
      }
    }
    return result;
  });
}

// ── Rule 36: Add Mild Descriptive Words ──────────────────────────────────────

const DESCRIPTIVE_ADDITIONS = [
  [/\ba result\b/g, 'a notable result'],
  [/\ban opportunity\b/g, 'a valuable opportunity'],
  [/\ba challenge\b/g, 'a significant challenge'],
  [/\ba change\b/g, 'a meaningful change'],
  [/\ban approach\b/g, 'a practical approach'],
  [/\ba solution\b/g, 'an effective solution'],
  [/\ba process\b/g, 'a clear process'],
  [/\ba step\b/g, 'an important step'],
];

/**
 * Rule 36 — Add subtle descriptive modifiers when appropriate.
 * Applied sparingly (every 5th sentence).
 */
function addMildDescriptors(sentence, index) {
  if (index % 5 !== 4) return sentence;
  let r = sentence;
  for (const [pat, rep] of DESCRIPTIVE_ADDITIONS) {
    if (pat.test(r)) {
      r = r.replace(pat, rep);
      break; // one addition per sentence
    }
  }
  return r;
}

// ── Rule 37: Remove Unnecessary Adverbs ──────────────────────────────────────

const UNNECESSARY_ADVERBS = [
  /\bvery\s+/gi,
  /\breally\s+/gi,
  /\bextremely\s+/gi,
  /\bbasically\s+/gi,
  /\bliterally\s+/gi,
  /\babsolutely\s+(?=\w)/gi,
  /\bentirely\s+(?=\w)/gi,
  /\bcompletely\s+(?=clear|obvious|wrong|right|sure)\b/gi,
];

/**
 * Rule 37 — Remove adverbs that do not add meaning.
 */
function removeUnnecessaryAdverbs(text) {
  let r = text;
  for (const pat of UNNECESSARY_ADVERBS) {
    r = r.replace(pat, '');
  }
  return r;
}

// ── Rule 41: Subject–Verb Agreement ──────────────────────────────────────────

const SVA_FIXES = [
  [/\bhe go\b/gi, 'he goes'],
  [/\bshe go\b/gi, 'she goes'],
  [/\bit go\b/gi, 'it goes'],
  [/\bhe don't\b/gi, "he doesn't"],
  [/\bshe don't\b/gi, "she doesn't"],
  [/\bit don't\b/gi, "it doesn't"],
  [/\bhe have\b/gi, 'he has'],
  [/\bshe have\b/gi, 'she has'],
  [/\bit have\b/gi, 'it has'],
  [/\bhe were\b/gi, 'he was'],
  [/\bshe were\b/gi, 'she was'],
  [/\bit were\b/gi, 'it was'],
  [/\bthey was\b/gi, 'they were'],
  [/\bwe was\b/gi, 'we were'],
];

/**
 * Rule 41 — Correct subject–verb agreement errors.
 */
function fixSubjectVerbAgreement(text) {
  let r = text;
  for (const [pat, rep] of SVA_FIXES) {
    r = r.replace(pat, (match) =>
      match[0] === match[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep
    );
  }
  return r;
}

// ── Rule 42: Verb Tense Consistency ──────────────────────────────────────────

/**
 * Rule 42 — Detect mixed tenses within a sentence and normalise to past or present.
 * Heuristic: if the sentence contains a clear past-tense signal (was/were/had/did),
 * convert stray present-tense verbs.
 */
function fixTenseConsistency(sentence) {
  // Simple heuristic: "He was tired and goes home" → "He was tired and went home"
  const pastSignal = /\b(was|were|had|did|went|came|saw|made|got|took)\b/i;
  const presentAfterPast = /\b(was|were|had|did)\b(.{0,40})\b(goes|comes|makes|gets|takes|runs|says|tells|gives|finds)\b/gi;

  if (pastSignal.test(sentence)) {
    return sentence.replace(presentAfterPast, (full, pastV, mid, presentV) => {
      const pastMap = { goes: 'went', comes: 'came', makes: 'made', gets: 'got', takes: 'took', runs: 'ran', says: 'said', tells: 'told', gives: 'gave', finds: 'found' };
      const replacement = pastMap[presentV.toLowerCase()] || presentV;
      return `${pastV}${mid}${replacement}`;
    });
  }
  return sentence;
}

// ── Rule 44: Simplify Nested Clauses ─────────────────────────────────────────

/**
 * Rule 44 — Reduce overly complex nested clauses.
 * Rule 41 (prompt) — Fix robotic passive phrasing patterns.
 */
function simplifyNestedClauses(text) {
  return text
    // ── Prompt Rule 41: Fix passive/robotic phrasing ───────────────────────
    .replace(/\bit can be seen that\b/gi,                              'clearly,')
    .replace(/\bit is widely known that\b/gi,                          'most people know that')
    .replace(/\bit is generally known that\b/gi,                       'most people know that')
    .replace(/\bit is commonly known that\b/gi,                        'most people know that')
    .replace(/\bit is widely accepted that\b/gi,                       'most people know that')
    .replace(/\bit is generally accepted that\b/gi,                    'most people know that')
    .replace(/\bit is commonly accepted that\b/gi,                     'most people know that')
    .replace(/\bit is widely believed that\b/gi,                       'most people believe that')
    .replace(/\bit is generally believed that\b/gi,                    'most people believe that')
    .replace(/\bit is important to\b/gi,                               'you should')
    .replace(/\bit is essential to\b/gi,                               'you should')
    .replace(/\bit is crucial to\b/gi,                                 'you should')
    .replace(/\bit is important that\b/gi,                             'you should ensure that')
    .replace(/\bit is essential that\b/gi,                             'you should ensure that')
    .replace(/\bit is crucial that\b/gi,                               'you should ensure that')
    .replace(/\bthere are a number of\b/gi,                            'several')
    .replace(/\bthere are several\b/gi,                                'several')
    .replace(/\bthere are many\b/gi,                                   'several')
    // ── Rule 44: Nested clause simplification ─────────────────────────────
    .replace(/\bthe fact that\b/gi,                                    'that')
    .replace(/\bthe reason why\b/gi,                                   'why')
    .replace(/\bat the time when\b/gi,                                 'when')
    .replace(/\bthe way in which\b/gi,                                 'how')
    .replace(/\bthe place where\b/gi,                                  'where')
    .replace(/\bdespite the fact that\b/gi,                            'although')
    .replace(/\bregardless of the fact that\b/gi,                      'even though');
}

// ── Rule 49: Readability Adjustment ──────────────────────────────────────────

const AWKWARD_PHRASES = [
  [/\bit is what it is\b/gi, 'this is the situation'],
  [/\bat the end of the day\b/gi, 'ultimately'],
  [/\bthink outside the box\b/gi, 'think creatively'],
  [/\bmoving forward\b/gi, 'going forward'],
  [/\btouch base\b/gi, 'connect'],
  [/\bcircle back\b/gi, 'follow up'],
  [/\bleverage synergies\b/gi, 'work together effectively'],
  [/\bbandwidth\b/gi, 'capacity'],
  [/\bparadigm shift\b/gi, 'major change'],
  [/\blow-hanging fruit\b/gi, 'easy wins'],
];

/**
 * Rule 49 — Rewrite awkward phrasing to improve readability.
 */
function adjustReadability(text) {
  let r = text;
  for (const [pat, rep] of AWKWARD_PHRASES) {
    r = r.replace(pat, (match) =>
      match[0] === match[0].toUpperCase() ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep
    );
  }
  return r;
}

// ── Rule 4 / Rule 38–40: Grammar Integrity, Spacing, Capitalisation ──────────

/**
 * Rule 38 — Normalize Spacing: ensure proper spacing between words and punctuation.
 * Rule 39 — Capitalization Correction: ensure first word of every sentence is capitalized.
 * Rule 40 — Punctuation Correction: ensure each sentence ends with correct punctuation.
 */
function fixCapitalisationAndSpacing(text) {
  // Collapse whitespace
  let r = text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  // Capitalise start of each sentence
  r = r.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());

  // Ensure text starts with capital
  r = r.charAt(0).toUpperCase() + r.slice(1);

  // Remove space before punctuation
  r = r.replace(/\s+([.,!?;:])/g, '$1');

  // Add space after comma if missing
  r = r.replace(/,([^\s"'])/g, ', $1');

  return r;
}

// ── Rule 5: Output Must Differ ────────────────────────────────────────────────

/**
 * Rule 5 — If output equals input, run additional transformations until
 * the text changes.
 */
function enforceOutputDifference(original, output) {
  if (output.trim() === original.trim()) {
    // Fallback: prepend "In short, " and ensure first word is lowercase
    const lower = output.charAt(0).toLowerCase() + output.slice(1);
    return `In short, ${lower}`;
  }
  return output;
}

// ── Main Humanizer Export ─────────────────────────────────────────────────────



/**
 * Validate and run the humanizer.
 * Returns { result, wordCount, originalWords, sentenceCount, changesApplied, readability }.
 */
/**
 * humanizeFull — Full production pipeline using ALL rules and modules (v3–v5).
 * This is called by run() for the complete humanization experience.
 */
// ═════════════════════════════════════════════════════════════════════════════
// DETECTOR-DEFEATING HUMANIZER ENGINE (v6)
// Strategy: GPTZero/ZeroGPT/Originality detect AI by measuring:
//   1. Perplexity (predictability of word choices)
//   2. Burstiness (uniformity of sentence lengths)
//   3. Structural patterns (every sentence being "complete")
//   4. Over-formality / no personality
// We counter ALL four vectors.
// ═════════════════════════════════════════════════════════════════════════════

// ── Burstiness injection: mix very short with very long sentences ─────────────
function injectBurstiness(sentences) {
  const result = [];
  let i = 0;
  while (i < sentences.length) {
    const s = sentences[i];
    const words = s.split(/\s+/).filter(Boolean).length;

    // Every 5th sentence, split long ones and keep short ones very short
    if (i % 5 === 2 && words > 12) {
      // Create a punchy short version first, then elaborate
      const shortVer = s.split(/,/)[0].trim();
      const rest = s.slice(shortVer.length).replace(/^,\s*/, '');
      if (shortVer.length > 20 && rest.length > 10) {
        const shortClean = shortVer.endsWith('.') ? shortVer : shortVer + '.';
        const restCap = rest.charAt(0).toUpperCase() + rest.slice(1);
        result.push(shortClean);
        result.push(restCap.endsWith('.') ? restCap : restCap + '.');
        i++;
        continue;
      }
    }

    // Every 7th sentence, merge two short adjacent sentences into one flowing one
    if (i % 7 === 0 && words < 10 && i + 1 < sentences.length) {
      const next = sentences[i + 1];
      const nextWords = next.split(/\s+/).filter(Boolean).length;
      if (nextWords < 10) {
        const connectors = [' — and ', ', which means ', '; in fact, ', ', so ', ' — basically, '];
        const conn = connectors[i % connectors.length];
        const merged = s.replace(/[.!?]+$/, '') + conn + next.charAt(0).toLowerCase() + next.slice(1);
        result.push(merged);
        i += 2;
        continue;
      }
    }

    result.push(s);
    i++;
  }
  return result;
}

// ── Perplexity injection: replace predictable words with less expected choices ─
const PERPLEXITY_SWAPS = [
  // Replace ultra-common words with slightly unexpected (but natural) alternatives
  [/\bvery important\b/gi, () => pickRand(['worth focusing on','worth your time','genuinely matters','not something to skip'])],
  [/\bsignificantly\b/gi, () => pickRand(['quite a bit','by a noticeable margin','more than you might expect','in a real way'])],
  [/\bimprove\b/gi, () => pickRand(['get better at','sharpen','move the needle on','make a dent in'])],
  [/\bdifficult\b/gi, () => pickRand(['tricky','not easy','harder than it looks','a real challenge'])],
  [/\bimportant\b/gi, () => pickRand(['key','worth noting','the kind of thing that matters','something you should care about'])],
  [/\bcurrently\b/gi, () => pickRand(['right now','at the moment','these days','as things stand'])],
  [/\bhowever\b/gi, () => pickRand(['that said','but here\'s the thing','still','on the flip side','though'])],
  [/\btherefore\b/gi, () => pickRand(['so','which means','and that\'s why','as a result'])],
  [/\badditionally\b/gi, () => pickRand(['on top of that','there\'s also','worth adding','not to mention'])],
  [/\bin conclusion\b/gi, () => pickRand(['at the end of the day','to wrap up','putting it all together','when you step back'])],
  [/\boverall\b/gi, () => pickRand(['all things considered','taken together','in the bigger picture','stepping back'])],
  [/\bfurthermore\b/gi, () => pickRand(['what\'s more','building on that','to add to this','and then there\'s'])],
];

let _perpSeed = 0;
function pickRand(arr) { return arr[_perpSeed++ % arr.length]; }

function injectPerplexity(text) {
  let r = text;
  for (const [pat, fn] of PERPLEXITY_SWAPS) {
    r = r.replace(pat, (match) => {
      const rep = fn();
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── Personal voice injector: first-person perspective and opinion phrases ─────
const PERSONAL_OPENERS = [
  'If you ask me,', 'Honestly,', 'Here\'s the thing —', 'The way I see it,',
  'To be fair,', 'Worth mentioning here:', 'Interestingly enough,',
  'What often gets overlooked is that', 'Something I find useful here:',
  'This is where it gets interesting —',
];

function injectPersonalVoice(sentences) {
  return sentences.map((s, i) => {
    // Add personal opener to every 6th sentence (not first or last)
    if (i === 0 || i === sentences.length - 1) return s;
    if (i % 6 !== 0) return s;
    // Don't add if sentence already starts with "I" or a personal opener
    if (/^(I |You |We |Here|This|That|Honestly|Worth|If you)/i.test(s)) return s;
    const opener = PERSONAL_OPENERS[i % PERSONAL_OPENERS.length];
    return `${opener} ${s.charAt(0).toLowerCase() + s.slice(1)}`;
  });
}

// ── Structural imperfection: occasional em-dash, parenthetical, ellipsis ──────
function injectStructuralVariety(sentences) {
  return sentences.map((s, i) => {
    if (i % 8 === 3) {
      // Insert a parenthetical aside
      const asides = [
        '(and this is key)',
        '(which matters more than it seems)',
        '(at least in most cases)',
        '(though your situation may differ)',
        '(worth keeping in mind)',
        '(believe it or not)',
      ];
      const aside = asides[i % asides.length];
      const words = s.split(' ');
      if (words.length > 6) {
        const mid = Math.floor(words.length / 2);
        return words.slice(0, mid).join(' ') + ' ' + aside + ' ' + words.slice(mid).join(' ');
      }
    }
    if (i % 11 === 5) {
      // Convert period to em-dash continuation occasionally
      const stripped = s.replace(/\.$/, '');
      if (stripped.length > 30) return stripped + ' — and that really does matter.';
    }
    return s;
  });
}

// ── Fragment injector: occasional intentional sentence fragment for humanity ──
function injectNaturalFragments(sentences) {
  const result = [];
  sentences.forEach((s, i) => {
    result.push(s);
    // After every 8th sentence, add a punchy fragment
    if (i > 0 && i % 8 === 0 && i < sentences.length - 1) {
      const fragments = [
        'Simple as that.',
        'Pretty straightforward, really.',
        'Worth the effort, though.',
        'Not always easy, but doable.',
        'That\'s the gist of it.',
        'Sounds simple enough.',
        'And that\'s the point.',
        'Makes sense when you think about it.',
      ];
      result.push(fragments[i % fragments.length]);
    }
  });
  return result;
}

// ── Colloquial softener: make some formal phrases more conversational ─────────
const COLLOQUIAL_MAP = [
  [/\bthis demonstrates\b/gi, 'this shows'],
  [/\bthis indicates\b/gi, 'this suggests'],
  [/\bone can observe\b/gi, 'you can see'],
  [/\bit is evident\b/gi, 'it\'s clear'],
  [/\bit is apparent\b/gi, 'it looks like'],
  [/\bthe aforementioned\b/gi, 'the above'],
  [/\bsubsequent to this\b/gi, 'after this'],
  [/\bprior to this\b/gi, 'before this'],
  [/\bin order to achieve\b/gi, 'to get'],
  [/\bin order to ensure\b/gi, 'to make sure'],
  [/\bwith respect to\b/gi, 'when it comes to'],
  [/\bpertaining to\b/gi, 'about'],
  [/\bwith regard to\b/gi, 'regarding'],
  [/\bsuch as the following\b/gi, 'like these'],
  [/\bthe following examples\b/gi, 'a few examples'],
  [/\bto summarize the above\b/gi, 'to put it simply'],
  [/\bas mentioned previously\b/gi, 'as noted earlier'],
  [/\bas discussed above\b/gi, 'as covered above'],
  [/\bit should be emphasized\b/gi, 'it\'s worth stressing'],
  [/\bconsequently\b/gi, 'as a result'],
];

function applyColloquialSoftener(text) {
  let r = text;
  for (const [pat, rep] of COLLOQUIAL_MAP) {
    r = r.replace(pat, (m) =>
      m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep
    );
  }
  return r;
}

function humanizeFull(text) {
  if (!text || !text.trim()) throw new Error('Input text is required.');
  if (text.length > 10000) throw new Error('Text too long. Maximum 10,000 characters.');

  // ── Phase 1A: Pre-processing — language cleanup (most specific first) ────
  let p = removeAIFillers(text.trim());
  p = applyDeepFillerCleaner(p);
  p = expandShortExpressions(p);
  p = applyLegalSimplifier(p);
  p = applyBureaucraticBuster(p);
  p = applyAcademicSimplifier(p);
  p = applyTechnicalPlainLanguage(p);
  p = applyEmotionSoftener(p);
  p = applyPassiveNaturalizer(p);
  p = applyVoiceStrengthener(p);
  p = applyClicheBuster(p);
  p = applyIdiomFreshener(p);
  p = applyMetaphorClarifier(p);
  p = applyEmphaticNaturalizer(p);
  p = applyPronounHumanizer(p);
  p = applyImpersonalToPersonal(p);
  p = applyNominalizationReversals(p);
  p = applyQuantifierNaturalizer(p);
  p = applyEleganceUpgrader(p);
  p = applyColloquialSoftener(p);      // NEW v6
  p = replaceStiffVocab(p);
  p = reduceWordiness(p);
  p = simplifyNestedClauses(p);
  p = adjustReadability(p);
  p = removeRedundantWords(p);
  p = removeUnnecessaryAdverbs(p);
  p = enforceOxfordComma(p);
  p = applyTransitionEnricher(p);
  p = reduceProximityRepetition(p);
  p = injectPerplexity(p);              // NEW v6: unpredictable word choices

  // ── Phase 2: Sentence segmentation ──────────────────────────────────────
  let sentences = segmentSentences(p);

  // ── Phase 3: Per-sentence transforms ────────────────────────────────────
  sentences = sentences.map(s => passiveToActive(s));
  sentences = sentences.map(s => rephraseQuestion(s));
  sentences = sentences.map(s => applyStructureDiversifier(s));
  sentences = sentences.map((s, i) => i % 2 === 0 ? moveTimePhraseToFront(s) : s);
  sentences = sentences.map((s, i) => i % 2 !== 0 ? moveLocationPhrase(s) : s);
  sentences = sentences.map(s => adjustWordOrder(s));
  sentences = sentences.map((s, i) => changeSentenceOpening(s, i));
  sentences = diversifySentenceOpeners(sentences);
  sentences = sentences.map(s => fixTenseConsistency(s));
  sentences = injectHedgeLanguage(sentences);
  sentences = insertRhythmVariation(sentences);
  sentences = injectPersonalVoice(sentences);        // NEW v6
  sentences = injectStructuralVariety(sentences);    // NEW v6

  // ── Phase 4: Join + text-level fixes ────────────────────────────────────
  let joined = sentences.join(' ');
  joined = applyContractions(joined);
  joined = fixSubjectVerbAgreement(joined);
  joined = removeRedundantWords(joined);

  // ── Phase 5: Re-segment + structural transforms ──────────────────────────
  sentences = segmentSentences(joined);
  sentences = applySentenceLengthVariation(sentences);
  sentences = balanceSentenceComplexity(sentences);
  sentences = injectBurstiness(sentences);           // NEW v6: vary sentence lengths
  sentences = replaceRepeatedVerbs(sentences);
  sentences = removeRepetition(sentences);
  sentences = addTransitions(sentences);
  sentences = injectNaturalFragments(sentences);     // NEW v6: human fragments
  sentences = sentences.map((s, i) => addMildDescriptors(s, i));

  // ── Phase 6: Final assembly ──────────────────────────────────────────────
  let output = sentences.join(' ');
  output = fixCapitalisationAndSpacing(output);
  output = enforceOutputDifference(text.trim(), output);
  return output;
}

function run(input) {
  const text = (input || '').trim();

  if (!text) return { error: 'Please enter some text to humanize.' };
  if (text.split(/\s+/).filter(Boolean).length < 3) return { error: 'Please enter at least a few words.' };
  if (text.length > 10000) return { error: 'Text is too long. Maximum is 10,000 characters.' };

  try {
    const result = humanizeFull(text);
    const origWords = text.toLowerCase().split(/\s+/).filter(Boolean);
    const newWords  = result.toLowerCase().split(/\s+/).filter(Boolean);
    const changed   = newWords.filter((w, i) => w !== origWords[i]).length;

    const fleschBefore = estimateFleschScore(text);
    const fleschAfter  = estimateFleschScore(result);

    return {
      result,
      wordCount:      newWords.length,
      originalWords:  origWords.length,
      sentenceCount:  segmentSentences(result).length,
      changesApplied: changed,
      readability: {
        before: { score: fleschBefore, grade: readabilityGrade(fleschBefore) },
        after:  { score: fleschAfter,  grade: readabilityGrade(fleschAfter) },
      },
    };
  } catch (err) {
    return { error: err.message || 'Humanization failed. Please try again.' };
  }
}


// ── NEW v3: IMPERSONAL-TO-PERSONAL CONVERSION ────────────────────────────────
// "one must" → "you need to", "it is advised" → "you should"

const IMPERSONAL_TO_PERSONAL = [
  [/\bone must\b/gi,                       'you need to'],
  [/\bone should\b/gi,                     'you should'],
  [/\bone can\b/gi,                        'you can'],
  [/\bone might\b/gi,                      'you might'],
  [/\bone may\b/gi,                        'you may'],
  [/\bone needs to\b/gi,                   'you need to'],
  [/\bit is advised (?:to|that)\b/gi,      'you should'],
  [/\bit is recommended that\b/gi,         'you should ensure'],
  [/\bit is recommended to\b/gi,           'you should'],
  [/\bit is suggested (?:to|that)\b/gi,    "you might want to"],
  [/\bit is expected (?:to|that)\b/gi,     'you should'],
  [/\bit is necessary (?:to|that)\b/gi,    'you need to'],
  [/\bpeople should\b/gi,                  'you should'],
  [/\bpeople must\b/gi,                    'you must'],
  [/\busers should\b/gi,                   'you should'],
  [/\busers can\b/gi,                      'you can'],
  [/\bindividuals should\b/gi,             'you should'],
  [/\bindividuals can\b/gi,                'you can'],
  [/\bone is expected to\b/gi,             "you're expected to"],
  [/\bone is advised to\b/gi,              'you should'],
];

function applyImpersonalToPersonal(text) {
  let r = text;
  for (const [pat, rep] of IMPERSONAL_TO_PERSONAL) r = r.replace(pat, rep);
  return r;
}

// ── NEW v3: NOMINALIZATION REVERSAL ──────────────────────────────────────────
// "make a decision" → "decide", "give a description of" → "describe"

const NOMINALIZATION_REVERSALS = [
  [/\bgive a description of\b/gi,          'describe'],
  [/\bgive an explanation of\b/gi,         'explain'],
  [/\bgive an indication of\b/gi,          'indicate'],
  [/\bgive consideration to\b/gi,          'consider'],
  [/\bgive a demonstration of\b/gi,        'show'],
  [/\bmake an assumption\b/gi,             'assume'],
  [/\bmake a comparison\b/gi,              'compare'],
  [/\bmake a recommendation\b/gi,          'recommend'],
  [/\bmake an assessment\b/gi,             'assess'],
  [/\bmake an analysis\b/gi,               'analyze'],
  [/\bmake an estimation\b/gi,             'estimate'],
  [/\bmake a distinction\b/gi,             'distinguish'],
  [/\bmake a contribution\b/gi,            'contribute'],
  [/\bmake an observation\b/gi,            'observe'],
  [/\btake action\b/gi,                    'act'],
  [/\btake measures\b/gi,                  'act'],
  [/\btake steps\b/gi,                     'act'],
  [/\bprovide support\b/gi,               'support'],
  [/\bprovide assistance\b/gi,            'help'],
  [/\bprovide guidance\b/gi,              'guide'],
  [/\bprovide information\b/gi,           'inform'],
  [/\bprovide clarification\b/gi,         'clarify'],
  [/\bconduct an investigation\b/gi,      'investigate'],
  [/\bconduct a study\b/gi,               'study'],
  [/\bconduct research\b/gi,              'research'],
  [/\bcarry out an analysis\b/gi,         'analyze'],
  [/\bcarry out a review\b/gi,            'review'],
  [/\bperform an analysis\b/gi,           'analyze'],
  [/\bperform a review\b/gi,              'review'],
  [/\bperform a calculation\b/gi,         'calculate'],
  [/\bdo an analysis\b/gi,                'analyze'],
];

function applyNominalizationReversals(text) {
  let r = text;
  for (const [pat, rep] of NOMINALIZATION_REVERSALS) r = r.replace(pat, rep);
  return r;
}

// ── NEW v3: QUANTIFIER NATURALIZER ───────────────────────────────────────────

const QUANTIFIER_PATTERNS = [
  [/\ba significant amount of\b/gi,        'a lot of'],
  [/\ba substantial amount of\b/gi,        'a lot of'],
  [/\ba considerable amount of\b/gi,       'quite a bit of'],
  [/\ba high degree of\b/gi,               'a lot of'],
  [/\ba low degree of\b/gi,                'little'],
  [/\ban extensive range of\b/gi,          'many different'],
  [/\ba wide range of\b/gi,                'many different'],
  [/\ba broad range of\b/gi,               'many different'],
  [/\ba diverse range of\b/gi,             'various'],
  [/\ba variety of\b/gi,                   'various'],
  [/\ba multitude of\b/gi,                 'many'],
  [/\ba plethora of\b/gi,                  'lots of'],
  [/\ban array of\b/gi,                    'a range of'],
  [/\ban abundance of\b/gi,                'plenty of'],
  [/\ba wealth of\b/gi,                    'lots of'],
  [/\ba host of\b/gi,                      'many'],
  [/\bmyriad(?:s)?\s+of\b/gi,              'many'],
  [/\bcountless\b/gi,                      'many'],
  [/\binnumerable\b/gi,                    'countless'],
];

function applyQuantifierNaturalizer(text) {
  let r = text;
  for (const [pat, rep] of QUANTIFIER_PATTERNS) r = r.replace(pat, rep);
  return r;
}

// ── NEW v3: OXFORD COMMA ENFORCEMENT ─────────────────────────────────────────

function enforceOxfordComma(text) {
  return text.replace(/([a-z0-9']+),\s+([a-z0-9']+)\s+and\s+([a-z0-9']+)/gi, (m, a, b, c) => {
    return `${a}, ${b}, and ${c}`;
  });
}

// ── NEW v3: HEDGE LANGUAGE INJECTOR ──────────────────────────────────────────
// Makes overconfident claims sound more natural

function injectHedgeLanguage(sentences) {
  return sentences.map(s => s
    .replace(/\bwill definitely\b/gi,     'will likely')
    .replace(/\bwill certainly\b/gi,      'will probably')
    .replace(/\bwill undoubtedly\b/gi,    'will in all likelihood')
    .replace(/\bis proven to\b/gi,        'tends to')
    .replace(/\bguarantees?\b/gi,         'tends to ensure')
    .replace(/\beveryone knows\b/gi,      'most people know')
    .replace(/\beveryone agrees\b/gi,     'most people agree')
    .replace(/\ball people\b/gi,          'most people')
    .replace(/\bis always the case\b/gi,  'is usually the case')
    .replace(/\bwithout exception\b/gi,   'in most cases')
    .replace(/\bin all circumstances\b/gi,'in most cases')
  );
}

// ── NEW v3: FLESCH READABILITY SCORE ─────────────────────────────────────────

function estimateFleschScore(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllableCount = words.reduce((total, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return total + 1;
    const matches = w.match(/[aeiou]{1,2}/g);
    return total + (matches ? matches.length : 1);
  }, 0);
  const avgSentenceLen = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;
  const score = 206.835 - 1.015 * avgSentenceLen - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function readabilityGrade(score) {
  if (score >= 90) return 'Very easy (5th grade)';
  if (score >= 80) return 'Easy (6th grade)';
  if (score >= 70) return 'Fairly easy (7th grade)';
  if (score >= 60) return 'Standard (8–9th grade)';
  if (score >= 50) return 'Fairly difficult (10–12th grade)';
  if (score >= 30) return 'Difficult (college)';
  return 'Very difficult (college graduate)';
}

// ── v4: EMOTION SOFTENER ──────────────────────────────────────────────────────
// Softens overly blunt or robotic emotional phrasing into natural human tones

const EMOTION_SOFTENER_PATTERNS = [
  [/\bit is important to note that\b/gi,     'worth noting that'],
  [/\bit should be noted that\b/gi,          "it's worth knowing that"],
  [/\bplease be advised that\b/gi,           'just so you know,'],
  [/\bplease be aware that\b/gi,             'keep in mind that'],
  [/\bkindly be informed that\b/gi,          'just a heads-up:'],
  [/\bwe regret to inform you that\b/gi,     'unfortunately,'],
  [/\bwe are pleased to inform you that\b/gi,'great news —'],
  [/\bwe would like to bring to your attention\b/gi, 'we wanted to flag that'],
  [/\bas per our records\b/gi,               'according to what we have'],
  [/\bpursuant to\b/gi,                      'following'],
  [/\bwith respect to\b/gi,                  'regarding'],
  [/\bin the event that\b/gi,                'if'],
  [/\bfor the purpose of\b/gi,               'to'],
  [/\bwith the exception of\b/gi,            'except for'],
  [/\bprior to\b/gi,                         'before'],
  [/\bsubsequent to\b/gi,                    'after'],
  [/\bin lieu of\b/gi,                       'instead of'],
  [/\bon behalf of\b/gi,                     'for'],
  [/\bpertaining to\b/gi,                    'about'],
  [/\bwith regard to\b/gi,                   'about'],
  [/\bin accordance with\b/gi,               'following'],
  [/\bin conjunction with\b/gi,              'along with'],
  [/\bat this juncture\b/gi,                 'at this point'],
  [/\bat this point in time\b/gi,            'right now'],
  [/\bin the near future\b/gi,               'soon'],
  [/\bgoing forward\b/gi,                    'from now on'],
  [/\bmove the needle\b/gi,                  'make a difference'],
  [/\bsynergize\b/gi,                        'work together'],
  [/\bleveraging our core competencies\b/gi, 'using our strengths'],
  [/\bvalue-add\b/gi,                        'benefit'],
  [/\bpain points\b/gi,                      'challenges'],
  [/\blow-hanging fruit\b/gi,                'easy wins'],
  [/\bboil the ocean\b/gi,                   'take on too much'],
  [/\bcircle back\b/gi,                      'follow up'],
  [/\btake this offline\b/gi,                'discuss separately'],
  [/\bdeep dive\b/gi,                        'thorough look'],
  [/\bbandwidth\b/gi,                        'capacity'],
  [/\btouchbase\b/gi,                        'catch up'],
  [/\bask the question\b/gi,                 'ask'],
  [/\bthe fact that\b/gi,                    'that'],
  [/\bdue to the fact that\b/gi,             'because'],
  [/\bowing to the fact that\b/gi,           'because'],
  [/\bin spite of the fact that\b/gi,        'although'],
  [/\bdespite the fact that\b/gi,            'even though'],
  [/\bin the absence of\b/gi,                'without'],
  [/\bfor the reason that\b/gi,              'because'],
];

function applyEmotionSoftener(text) {
  let r = text;
  for (const [pat, rep] of EMOTION_SOFTENER_PATTERNS) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v4: SENTENCE RHYTHM VARIATOR ─────────────────────────────────────────────
// Varies sentence rhythm by inserting parenthetical asides, em-dashes,
// and natural interjections to break up monotonous uniform flow.

const RHYTHM_INTERJECTIONS = [
  'in fact',
  'of course',
  'to be fair',
  'honestly',
  'naturally',
  'unsurprisingly',
  'interestingly',
  'admittedly',
  'for the most part',
  'in practice',
];

function insertRhythmVariation(sentences) {
  return sentences.map((s, i) => {
    // Every 4th sentence, insert a mild parenthetical after subject
    if (i % 4 !== 0) return s;
    const match = s.match(/^([A-Z][a-z]+(?: [a-z]+)?) (is|are|was|were|has|have|can|will|may|might|should|could)\b/);
    if (!match) return s;
    const interjection = RHYTHM_INTERJECTIONS[i % RHYTHM_INTERJECTIONS.length];
    return s.replace(match[0], `${match[1]} — ${interjection} — ${match[2]}`);
  });
}

// ── v4: REPETITIVE WORD DETECTOR ─────────────────────────────────────────────
// Detects and varies words used more than twice in close proximity.

const CLOSE_REPEAT_SYNONYMS = {
  important:  ['significant', 'key', 'vital', 'notable', 'meaningful'],
  show:       ['reveal', 'highlight', 'demonstrate', 'illustrate', 'indicate'],
  use:        ['employ', 'apply', 'leverage', 'draw on', 'work with'],
  provide:    ['offer', 'supply', 'deliver', 'give', 'present'],
  ensure:     ['make sure', 'guarantee', 'confirm', 'verify', 'check that'],
  allow:      ['enable', 'let', 'permit', 'facilitate', 'make possible'],
  help:       ['support', 'assist', 'aid', 'boost', 'strengthen'],
  require:    ['need', 'call for', 'demand', 'involve', 'depend on'],
  consider:   ['think about', 'look at', 'evaluate', 'weigh', 'examine'],
  create:     ['build', 'develop', 'produce', 'craft', 'design'],
  increase:   ['grow', 'raise', 'boost', 'expand', 'scale up'],
  improve:    ['enhance', 'refine', 'strengthen', 'upgrade', 'advance'],
  understand: ['grasp', 'recognize', 'appreciate', 'see', 'realise'],
  achieve:    ['reach', 'attain', 'accomplish', 'deliver', 'secure'],
  focus:      ['concentrate', 'centre', 'zero in', 'target', 'direct'],
  process:    ['approach', 'method', 'procedure', 'way', 'system'],
  system:     ['framework', 'structure', 'setup', 'model', 'platform'],
  team:       ['group', 'crew', 'staff', 'unit', 'workforce'],
  users:      ['people', 'individuals', 'customers', 'readers', 'visitors'],
  data:       ['information', 'figures', 'details', 'statistics', 'metrics'],
};

function reduceProximityRepetition(text) {
  let r = text;
  const words = Object.keys(CLOSE_REPEAT_SYNONYMS);
  for (const word of words) {
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    let count = 0;
    r = r.replace(pattern, (match) => {
      count++;
      if (count <= 2) return match;
      const alts = CLOSE_REPEAT_SYNONYMS[word];
      const alt  = alts[(count - 3) % alts.length];
      return match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
        ? alt.charAt(0).toUpperCase() + alt.slice(1)
        : alt;
    });
  }
  return r;
}

// ── v4: CLICHÉ BUSTER ─────────────────────────────────────────────────────────
// Replaces worn-out clichés with fresher natural alternatives

const CLICHE_REPLACEMENTS = [
  [/\bat the end of the day\b/gi,               'ultimately'],
  [/\bthink outside the box\b/gi,               'think creatively'],
  [/\bthe bottom line is\b/gi,                  'the key point is'],
  [/\bit goes without saying\b/gi,              'clearly'],
  [/\bback to the drawing board\b/gi,           'starting over'],
  [/\bbite the bullet\b/gi,                     'push through it'],
  [/\bhit the ground running\b/gi,              'start strong'],
  [/\bthe tip of the iceberg\b/gi,              'just the start'],
  [/\ba double-edged sword\b/gi,                'a trade-off'],
  [/\bthe ball is in your court\b/gi,           "it's your decision"],
  [/\bright off the bat\b/gi,                   'right away'],
  [/\bwhen all is said and done\b/gi,           'in the end'],
  [/\bthe elephant in the room\b/gi,            'the obvious issue'],
  [/\bmove the goalposts\b/gi,                  'change the rules'],
  [/\bthrough thick and thin\b/gi,              'in all circumstances'],
  [/\bgive it 110 percent\b/gi,                 'give it everything'],
  [/\bwear many hats\b/gi,                      'juggle many roles'],
  [/\bthe whole nine yards\b/gi,                'the full thing'],
  [/\btake it with a grain of salt\b/gi,        'be a bit sceptical'],
  [/\bonce in a blue moon\b/gi,                 'very rarely'],
  [/\bcost an arm and a leg\b/gi,               'be very expensive'],
  [/\bkill two birds with one stone\b/gi,       'handle two things at once'],
  [/\bthe best of both worlds\b/gi,             'the ideal combination'],
  [/\bjump on the bandwagon\b/gi,               'follow the trend'],
  [/\ba blessing in disguise\b/gi,              'a hidden advantage'],
  [/\bstealing the spotlight\b/gi,              'drawing all the attention'],
  [/\bgame-changing\b/gi,                       'transformative'],
  [/\bparadigm shift\b/gi,                      'fundamental change'],
  [/\bseamless(?:ly)?\b/gi,                     'smooth'],
  [/\brobust\b/gi,                              'strong'],
  [/\bscalable\b/gi,                            'flexible as it grows'],
  [/\bbest-in-class\b/gi,                       'top-performing'],
  [/\bworld-class\b/gi,                         'excellent'],
  [/\bcutting-edge\b/gi,                        'advanced'],
  [/\bstate-of-the-art\b/gi,                    'modern'],
  [/\bground-breaking\b/gi,                     'pioneering'],
  [/\bholistic\s+approach\b/gi,                 'complete approach'],
  [/\bproactive(?:ly)?\b/gi,                    'ahead of the curve'],
  [/\bdisruptive\b/gi,                          'industry-changing'],
  [/\bactionable insights\b/gi,                 'practical findings'],
  [/\bmission-critical\b/gi,                    'essential'],
  [/\bbest practices\b/gi,                      'proven methods'],
  [/\bunpack(?:ing)?\b/gi,                      'explore'],
  [/\bleverage\b/gi,                            'use'],
  [/\boptimize\b/gi,                            'improve'],
  [/\bsynergy\b/gi,                             'cooperation'],
  [/\bpivot\b/gi,                               'change direction'],
];

function applyClicheBuster(text) {
  let r = text;
  for (const [pat, rep] of CLICHE_REPLACEMENTS) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v4: PASSIVE PHRASE NATURALIZER ───────────────────────────────────────────
// Targets specific common passive constructions and naturalizes them

const PASSIVE_NATURALIZER = [
  [/\bhas been shown to be\b/gi,            'proves to be'],
  [/\bwas found to be\b/gi,                 'turned out to be'],
  [/\bcan be seen as\b/gi,                  'looks like'],
  [/\bwere observed to\b/gi,                'appeared to'],
  [/\bwas demonstrated to\b/gi,             'showed that it could'],
  [/\bhas been widely regarded as\b/gi,     'is widely seen as'],
  [/\bwas initially developed by\b/gi,      'was first created by'],
  [/\bare expected to be\b/gi,              'should'],
  [/\bwill be required to\b/gi,             'must'],
  [/\bare encouraged to\b/gi,               'should'],
  [/\bhas been identified as\b/gi,          'is'],
  [/\bhas been recognized as\b/gi,          'is recognized as'],
  [/\bwas believed to\b/gi,                 'people thought it would'],
  [/\bis thought to be\b/gi,                'seems to be'],
  [/\bwere designed to\b/gi,                'aimed to'],
  [/\bare intended to\b/gi,                 'aim to'],
  [/\bis known to be\b/gi,                  'is'],
  [/\bcan be used to\b/gi,                  'works for'],
  [/\bshould be taken into account\b/gi,    'matters'],
  [/\bmust be considered\b/gi,              'deserves attention'],
];

function applyPassiveNaturalizer(text) {
  let r = text;
  for (const [pat, rep] of PASSIVE_NATURALIZER) {
    r = r.replace(pat, (match) =>
      match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep
    );
  }
  return r;
}

// ── v4: TRANSITION ENRICHER ───────────────────────────────────────────────────
// Upgrades flat transitions to richer, more natural-sounding connectors

const TRANSITION_UPGRADES = [
  [/^Additionally,\s*/gm,   () => pickFrom(['On top of that,', 'What\'s more,', 'It\'s also worth noting that', 'Beyond that,'])],
  [/^Furthermore,\s*/gm,    () => pickFrom(['Building on that,', 'Taking this further,', 'Along the same lines,', 'On that note,'])],
  [/^However,\s*/gm,        () => pickFrom(['That said,', 'Even so,', 'With that in mind,', 'On the flip side,'])],
  [/^Therefore,\s*/gm,      () => pickFrom(['As a result,', 'This means that', 'Because of this,', 'Consequently,'])],
  [/^Moreover,\s*/gm,       () => pickFrom(['More importantly,', 'To add to this,', 'On top of this,', 'It\'s also true that'])],
  [/^In conclusion,\s*/gm,  () => pickFrom(['All things considered,', 'Putting it all together,', 'When you step back,', 'Ultimately,'])],
  [/^In summary,\s*/gm,     () => pickFrom(['To sum up,', 'The key takeaway is that', 'In short,', 'Bringing it together,'])],
  [/^For example,\s*/gm,    () => pickFrom(['To illustrate,', 'Take, for instance,', 'As an example,', 'Consider this:'])],
  [/^As a result,\s*/gm,    () => pickFrom(['This means that', 'Because of this,', 'That\'s why', 'This led to'])],
  [/^On the other hand,\s*/gm, () => pickFrom(['From a different angle,', 'Looking at it differently,', 'That said,', 'The other side of this is'])],
];

let _pickSeed = 0;
function pickFrom(options) { return options[(_pickSeed++ % options.length)]; }

function applyTransitionEnricher(text) {
  let r = text;
  for (const [pat, repFn] of TRANSITION_UPGRADES) {
    r = r.replace(pat, repFn);
  }
  return r;
}

// ── v4: ACADEMIC JARGON SIMPLIFIER ───────────────────────────────────────────
// Converts overly academic phrasing into cleaner, more readable language

const ACADEMIC_JARGON = [
  [/\butilize\b/gi,              'use'],
  [/\butilizes\b/gi,             'uses'],
  [/\butilized\b/gi,             'used'],
  [/\butilization\b/gi,          'use'],
  [/\bfacilitate\b/gi,           'help'],
  [/\bfacilitates\b/gi,          'helps'],
  [/\bfacilitated\b/gi,          'helped'],
  [/\bimplementation\b/gi,       'use'],
  [/\bdemonstrate\b/gi,          'show'],
  [/\bdemonstrates\b/gi,         'shows'],
  [/\bdemonstrated\b/gi,         'showed'],
  [/\bsubstantiate\b/gi,         'support'],
  [/\bsubstantiates\b/gi,        'supports'],
  [/\bascertain\b/gi,            'find out'],
  [/\bascertains\b/gi,           'finds out'],
  [/\belucidates?\b/gi,          'explains'],
  [/\bexemplif(?:y|ies|ied)\b/gi,'illustrate'],
  [/\binvestigate[sd]?\b/gi,     'look into'],
  [/\bconceptualize[sd]?\b/gi,   'imagine'],
  [/\bmethodology\b/gi,          'method'],
  [/\bparadigm\b/gi,             'model'],
  [/\bdiscourse\b/gi,            'discussion'],
  [/\bintersectionality\b/gi,    'overlap of factors'],
  [/\bhegemony\b/gi,             'dominance'],
  [/\bbifurcate[sd]?\b/gi,       'split'],
  [/\bnuance[sd]?\b/gi,          'subtlety'],
  [/\bnuanced\b/gi,              'subtle'],
  [/\bcommensurate\b/gi,         'proportional'],
  [/\bdelineate[sd]?\b/gi,       'outline'],
  [/\bmitigate[sd]?\b/gi,        'reduce'],
  [/\bpredicated on\b/gi,        'based on'],
  [/\bpremised on\b/gi,          'based on'],
  [/\bcontextualiz\w+\b/gi,      'put in context'],
  [/\boperationalize\b/gi,       'put into practice'],
  [/\bapproximately\b/gi,        'about'],
  [/\bnumerous\b/gi,             'many'],
  [/\bsufficient\b/gi,           'enough'],
  [/\binsufficien\w+\b/gi,       'not enough'],
  [/\bsubstantial\b/gi,          'large'],
  [/\bsubstantially\b/gi,        'largely'],
  [/\bexamine[sd]?\b/gi,         'look at'],
  [/\binquir\w+\b/gi,            'question'],
  [/\bcomprehensive\b/gi,        'thorough'],
  [/\bfundamental\b/gi,          'basic'],
  [/\bhenceforth\b/gi,           'from now on'],
  [/\bheretofore\b/gi,           'until now'],
  [/\bnevertheless\b/gi,         'still'],
  [/\bnotwithstanding\b/gi,      'despite this'],
];

function applyAcademicSimplifier(text) {
  let r = text;
  for (const [pat, rep] of ACADEMIC_JARGON) {
    r = r.replace(pat, (match) =>
      match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep
    );
  }
  return r;
}

// ── v4: VOICE STRENGTHENER ────────────────────────────────────────────────────
// Replaces weak verb constructions with stronger active alternatives

const WEAK_VERB_PATTERNS = [
  [/\bis able to\b/gi,           'can'],
  [/\bare able to\b/gi,          'can'],
  [/\bwas able to\b/gi,          'could'],
  [/\bwere able to\b/gi,         'could'],
  [/\bis going to\b/gi,          'will'],
  [/\bare going to\b/gi,         'will'],
  [/\bhas the ability to\b/gi,   'can'],
  [/\bhave the ability to\b/gi,  'can'],
  [/\bhas the capacity to\b/gi,  'can'],
  [/\bhas the potential to\b/gi, 'could'],
  [/\bseems to be\b/gi,          'appears'],
  [/\bappears to be\b/gi,        'looks'],
  [/\btends to be\b/gi,          'is usually'],
  [/\btends to\b/gi,             'usually'],
  [/\bis known to\b/gi,          'often'],
  [/\bis used to\b/gi,           'serves to'],
  [/\bis meant to\b/gi,          'aims to'],
  [/\bis designed to\b/gi,       'aims to'],
  [/\bis intended to\b/gi,       'is meant to'],
  [/\bis required to\b/gi,       'must'],
  [/\bis expected to\b/gi,       'should'],
  [/\bis needed to\b/gi,         'must'],
  [/\bis supposed to\b/gi,       'should'],
  [/\bis thought to\b/gi,        'seems to'],
  [/\bthere is a need to\b/gi,   'we need to'],
  [/\bthere are a number of\b/gi,'several'],
  [/\bthere is a possibility\b/gi,'it\'s possible'],
  [/\bit is possible to\b/gi,    'you can'],
  [/\bit is necessary to\b/gi,   'you must'],
  [/\bit is important to\b/gi,   'it matters to'],
  [/\bit is clear that\b/gi,     'clearly,'],
  [/\bit is evident that\b/gi,   'evidently,'],
  [/\bit is obvious that\b/gi,   'obviously,'],
];

function applyVoiceStrengthener(text) {
  let r = text;
  for (const [pat, rep] of WEAK_VERB_PATTERNS) {
    r = r.replace(pat, (match) =>
      match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
        ? rep.charAt(0).toUpperCase() + rep.slice(1)
        : rep
    );
  }
  return r;
}

// ── v4: NUMERAL NATURALIZER ───────────────────────────────────────────────────
// Converts numeric references into natural prose equivalents where appropriate

function naturalizeNumerals(text) {
  const WORD_NUMS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
  return text.replace(/\b([0-9]|1[0-9]|20)\b/g, (match, n) => {
    const i = parseInt(n, 10);
    // Only replace in mid-sentence (not in dates, versions, codes)
    return i < WORD_NUMS.length ? WORD_NUMS[i] : match;
  });
}

// ── v4: SENTENCE OPENER DIVERSIFIER ──────────────────────────────────────────
// Ensures no two consecutive sentences start with the same word

function diversifySentenceOpeners(sentences) {
  const result = [];
  const OPENER_ALTS = {
    'The': ['This', 'That', 'A', 'One', 'Each'],
    'This': ['The', 'That', 'It', 'Such', 'One'],
    'It': ['This', 'That', 'The result', 'Doing so', 'The approach'],
    'There': ['Here', 'At this point', 'In this case', 'Within this'],
    'We': ['Our team', 'Together, we', 'As a group, we', 'Collectively,'],
    'You': ['Users', 'Anyone', 'People who', 'Those who'],
    'They': ['These', 'Those', 'Such groups', 'The team'],
    'In': ['Within', 'During', 'Throughout', 'Across'],
    'When': ['Once', 'As soon as', 'At the moment when', 'The moment'],
    'If': ['Should', 'Assuming', 'Provided that', 'In the event that'],
  };
  let lastOpener = '';
  for (const s of sentences) {
    const firstWord = (s.match(/^([A-Z][a-z]*)/) || [])[1] || '';
    if (firstWord === lastOpener && OPENER_ALTS[firstWord]) {
      const alts = OPENER_ALTS[firstWord];
      const alt  = alts[result.length % alts.length];
      result.push(alt + s.slice(firstWord.length));
    } else {
      result.push(s);
    }
    lastOpener = firstWord;
  }
  return result;
}

// ── v5: BUREAUCRATIC LANGUAGE BUSTER ─────────────────────────────────────────
// Replaces dense bureaucratic / government-speak with plain language

const BUREAUCRATIC_PATTERNS = [
  [/\baffix your signature to\b/gi,                    'sign'],
  [/\baffix your signature\b/gi,                       'sign'],
  [/\bin the amount of\b/gi,                           'for'],
  [/\bhas the ability to\b/gi,                         'can'],
  [/\bhave the ability to\b/gi,                        'can'],
  [/\bprovide notification of\b/gi,                    'notify about'],
  [/\bgive consideration to\b/gi,                      'consider'],
  [/\bmake application for\b/gi,                       'apply for'],
  [/\bsubmit an application for\b/gi,                  'apply for'],
  [/\bat such time as\b/gi,                            'when'],
  [/\bin the event of the\b/gi,                        'if the'],
  [/\bwith the exception of\b/gi,                      'except for'],
  [/\bfor the duration of\b/gi,                        'during'],
  [/\bat this point in time\b/gi,                      'now'],
  [/\bat this juncture in time\b/gi,                   'at this point'],
  [/\bin order to facilitate\b/gi,                     'to help'],
  [/\bin order to ensure that\b/gi,                    'to make sure that'],
  [/\bfor the purpose of ensuring\b/gi,                'to ensure'],
  [/\bfor the purpose of providing\b/gi,               'to provide'],
  [/\bmake a determination of\b/gi,                    'determine'],
  [/\brender a decision\b/gi,                          'decide'],
  [/\brigorously examine\b/gi,                         'carefully review'],
  [/\beffectuate a change\b/gi,                        'make a change'],
  [/\beffect a solution\b/gi,                          'create a solution'],
  [/\bcollaborative partnership\b/gi,                   'partnership'],
  [/\bmutual agreement\b/gi,                           'agreement'],
  [/\bfinal conclusion\b/gi,                           'conclusion'],
  [/\bfuture plans\b/gi,                               'plans'],
  [/\bpast experience\b/gi,                            'experience'],
  [/\bpersonal opinion\b/gi,                           'opinion'],
  [/\bunexpected surprise\b/gi,                        'surprise'],
  [/\bexact same\b/gi,                                 'same'],
  [/\bclose proximity\b/gi,                            'proximity'],
  [/\bfree gift\b/gi,                                  'gift'],
  [/\bunnecessary redundancy\b/gi,                     'redundancy'],
  [/\bplease do not hesitate to contact\b/gi,          'please contact'],
  [/\bplease feel free to\b/gi,                        'please'],
  [/\bshould you have any questions\b/gi,              'if you have questions'],
  [/\bif you have any further queries\b/gi,            'if you have questions'],
  [/\bwe are writing to inform you that\b/gi,          'we want to let you know that'],
  [/\bwe are pleased to inform you\b/gi,               'we are happy to say that'],
  [/\bwe wish to advise you that\b/gi,                 'we want to let you know that'],
  [/\bthis is to confirm that\b/gi,                    'confirming that'],
  [/\bplease be advised that\b/gi,                     'please note that'],
  [/\bkindly note that\b/gi,                           'please note that'],
  [/\bit has come to our attention\b/gi,               'we have noticed that'],
  [/\bwe have been made aware\b/gi,                    'we now know'],
  [/\bwe are in receipt of\b/gi,                       'we have received'],
  [/\bplease find attached\b/gi,                       "I've attached"],
  [/\bplease find enclosed\b/gi,                       "I've enclosed"],
  [/\bwith reference to your\b/gi,                     'about your'],
  [/\bwith regard to the matter of\b/gi,               'about'],
  [/\bwith respect to\b/gi,                            'about'],
  [/\bin connection with the above\b/gi,               'about this'],
  [/\bsubject to the above\b/gi,                       'given this'],
  [/\bfor your information\b/gi,                       'just so you know'],
  [/\bfor your perusal\b/gi,                           'for your review'],
  [/\bfor your consideration\b/gi,                     'for you to consider'],
  [/\bat your earliest convenience\b/gi,               'as soon as you can'],
  [/\byour prompt attention\b/gi,                      'your quick attention'],
  [/\bfurther to my previous\b/gi,                     'following up on my'],
  [/\bas per my previous email\b/gi,                   'as I mentioned before'],
  [/\bas previously discussed\b/gi,                    'as we discussed'],
  [/\bas per our conversation\b/gi,                    'as we discussed'],
  [/\bgoing forward from this point\b/gi,              'from now on'],
  [/\bmoving forward from here\b/gi,                   'from here on'],
];

function applyBureaucraticBuster(text) {
  let r = text;
  for (const [pat, rep] of BUREAUCRATIC_PATTERNS) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: SENTENCE STRUCTURE DIVERSIFIER ───────────────────────────────────────
// Rewrites common monotonous sentence structures into varied alternatives

const STRUCTURE_PATTERNS = [
  // "X is a Y that Z" → "X, a Y, Z"
  [/^([A-Z][^.]+?) is a ([^.]+?) that ([^.]+)\./,
    (_, subj, pred, rest) => `${subj}, a ${pred}, ${rest}.`],
  // "The reason why X is Y" → "X because Y"
  [/\bThe reason why ([^.]+?) is (that [^.]+)\./i,
    (_, cause, effect) => `${cause.charAt(0).toUpperCase() + cause.slice(1)} ${effect}.`],
  // "There is no doubt that X" → "X, without question"
  [/\bThere is no doubt that ([^.]+)\./i,
    (_, claim) => `${claim.charAt(0).toUpperCase() + claim.slice(1)}, without question.`],
  // "It is X that makes Y Z" → "X makes Y Z"
  [/\bIt is ([^.]+?) that makes ([^.]+)\./i,
    (_, factor, effect) => `${factor.charAt(0).toUpperCase() + factor.slice(1)} makes ${effect}.`],
  // "The fact that X means Y" → "Since X, Y"
  [/\bThe fact that ([^.]+?) means ([^.]+)\./i,
    (_, premise, conclusion) => `Since ${premise}, ${conclusion}.`],
];

function applyStructureDiversifier(sentence) {
  let s = sentence;
  for (const [pattern, replacer] of STRUCTURE_PATTERNS) {
    const m = s.match(pattern);
    if (m) {
      s = typeof replacer === 'function' ? s.replace(pattern, replacer) : s.replace(pattern, replacer);
      break;
    }
  }
  return s;
}

// ── v5: ADVANCED CONTRACTION ENGINE ──────────────────────────────────────────
// Extended contraction/expansion tables for very fine-grained tone control

const EXTENDED_CONTRACTIONS_CASUAL = [
  [/\bgoing to\b/gi,          "gonna"],
  [/\bwant to\b/gi,           "wanna"],
  [/\bhave to\b/gi,           "hafta"],
  [/\bout of\b/gi,            "outta"],
  [/\bkind of\b/gi,           "kinda"],
  [/\bsort of\b/gi,           "sorta"],
  [/\ba little\b/gi,          "a lil"],
  [/\bcould have\b/gi,        "could've"],
  [/\bshould have\b/gi,       "should've"],
  [/\bwould have\b/gi,        "would've"],
  [/\bmight have\b/gi,        "might've"],
  [/\bthey have\b/gi,         "they've"],
  [/\bwe have\b/gi,           "we've"],
  [/\byou have\b/gi,          "you've"],
  [/\bi have\b/gi,            "I've"],
  [/\bhe would\b/gi,          "he'd"],
  [/\bshe would\b/gi,         "she'd"],
  [/\bthey would\b/gi,        "they'd"],
  [/\bwe would\b/gi,          "we'd"],
];

const EXTENDED_CONTRACTIONS_FORMAL = [
  [/\bgonna\b/gi,             "going to"],
  [/\bwanna\b/gi,             "want to"],
  [/\bhafta\b/gi,             "have to"],
  [/\boutta\b/gi,             "out of"],
  [/\bkinda\b/gi,             "kind of"],
  [/\bsorta\b/gi,             "sort of"],
  [/\bcould've\b/gi,          "could have"],
  [/\bshould've\b/gi,         "should have"],
  [/\bwould've\b/gi,          "would have"],
  [/\bmight've\b/gi,          "might have"],
  [/\bthey've\b/gi,           "they have"],
  [/\bwe've\b/gi,             "we have"],
  [/\byou've\b/gi,            "you have"],
  [/\bI've\b/g,               "I have"],
  [/\bhe'd\b/gi,              "he would"],
  [/\bshe'd\b/gi,             "she would"],
  [/\bthey'd\b/gi,            "they would"],
  [/\bwe'd\b/gi,              "we would"],
];

function applyExtendedContractions(text, mode) {
  let r = text;
  const table = mode === 'casual' ? EXTENDED_CONTRACTIONS_CASUAL : EXTENDED_CONTRACTIONS_FORMAL;
  for (const [pat, rep] of table) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: IDIOM FRESHENER ───────────────────────────────────────────────────────
// Replaces tired idioms with modern, direct alternatives

const IDIOM_FRESHENER = [
  [/\bbreak a leg\b/gi,                        'good luck'],
  [/\nbite off more than you can chew\b/gi,    'take on too much'],
  [/\bburning the midnight oil\b/gi,           'working late'],
  [/\bcost an arm and a leg\b/gi,              'be very expensive'],
  [/\bcut corners\b/gi,                        'take shortcuts'],
  [/\bget a taste of your own medicine\b/gi,   'face the consequences'],
  [/\bget out of hand\b/gi,                    'get out of control'],
  [/\bget the ball rolling\b/gi,               'start things moving'],
  [/\bgive the benefit of the doubt\b/gi,      'trust them without proof'],
  [/\bgo back to square one\b/gi,              'start again from scratch'],
  [/\bhit the nail on the head\b/gi,           'be exactly right'],
  [/\bkill two birds with one stone\b/gi,      'solve two things at once'],
  [/\blet the cat out of the bag\b/gi,         'reveal the secret'],
  [/\bnot see eye to eye\b/gi,                 'disagree'],
  [/\bonce in a blue moon\b/gi,                'very rarely'],
  [/\bon the fence\b/gi,                       'undecided'],
  [/\bover the moon\b/gi,                      'very happy'],
  [/\bpiece of cake\b/gi,                      'very easy'],
  [/\bput all your eggs in one basket\b/gi,    'rely on just one option'],
  [/\bspill the beans\b/gi,                    'reveal the secret'],
  [/\bstrike while the iron is hot\b/gi,       'act while the opportunity exists'],
  [/\bthe ball is in your court\b/gi,          "it's your turn to decide"],
  [/\bthe best of both worlds\b/gi,            'the ideal combination'],
  [/\bthrough thick and thin\b/gi,             'through every challenge'],
  [/\btwo peas in a pod\b/gi,                  'very similar to each other'],
  [/\bunder the weather\b/gi,                  'feeling ill'],
  [/\bwrap your head around\b/gi,              'understand'],
  [/\byou can't judge a book by its cover\b/gi,'appearances can be deceiving'],
  [/\bactions speak louder than words\b/gi,    'what you do matters more than what you say'],
  [/\badd fuel to the fire\b/gi,               'make a problem worse'],
  [/\bat the drop of a hat\b/gi,               'immediately'],
  [/\bback to the wall\b/gi,                   'in a desperate situation'],
  [/\nbe in hot water\b/gi,                    'be in serious trouble'],
  [/\nbite the dust\b/gi,                      'fail'],
  [/\nblow your own trumpet\b/gi,              'boast about yourself'],
  [/\nbring home the bacon\b/gi,               'earn the money'],
  [/\nbury the hatchet\b/gi,                   'make peace'],
  [/\nbuy time\b/gi,                           'delay to gain more time'],
  [/\ncome out of your shell\b/gi,             'become more confident'],
  [/\ncross that bridge when you come to it\b/gi,'deal with it when the time comes'],
  [/\ndon't beat around the bush\b/gi,         'be direct'],
  [/\ndon't put all your eggs in one basket\b/gi,'spread your risk'],
  [/\ndrive someone up the wall\b/gi,          'really frustrate someone'],
  [/\ndrop the ball\b/gi,                      'make a mistake'],
  [/\neat humble pie\b/gi,                     'admit you were wrong'],
  [/\nface the music\b/gi,                     'accept the consequences'],
  [/\nfeel under the weather\b/gi,             'feel ill'],
  [/\nget a second wind\b/gi,                  'find new energy'],
  [/\nget cold feet\b/gi,                      'become hesitant'],
  [/\ngo the extra mile\b/gi,                  'do more than expected'],
  [/\nhave a lot on your plate\b/gi,           'be very busy'],
  [/\nhave your hands tied\b/gi,               'be unable to act freely'],
  [/\nhit the books\b/gi,                      'study hard'],
  [/\nhit the sack\b/gi,                       'go to sleep'],
  [/\nkeep your chin up\b/gi,                  'stay positive'],
  [/\nkick the bucket\b/gi,                    'die'],
  [/\nlend someone a hand\b/gi,                'help someone'],
  [/\nlet sleeping dogs lie\b/gi,              'avoid restarting old problems'],
  [/\nmiss the boat\b/gi,                      'miss the opportunity'],
  [/\nnot cut out for\b/gi,                    'not suited to'],
  [/\non the ball\b/gi,                        'alert and efficient'],
  [/\nput your best foot forward\b/gi,         'make the best impression'],
  [/\nrun out of steam\b/gi,                   'lose energy or momentum'],
  [/\nsee the light\b/gi,                      'finally understand'],
  [/\nsteal someone's thunder\b/gi,            'take credit from someone'],
  [/\ntake with a grain of salt\b/gi,          'be somewhat sceptical about'],
  [/\nthe ball is rolling\b/gi,                'things are moving forward'],
  [/\ntouch and go\b/gi,                       'uncertain and risky'],
  [/\nunder someone's thumb\b/gi,              'controlled by someone'],
  [/\nup in the air\b/gi,                      'still undecided'],
  [/\nwear your heart on your sleeve\b/gi,     'openly show your emotions'],
];

function applyIdiomFreshener(text) {
  let r = text;
  for (const [pat, rep] of IDIOM_FRESHENER) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: SENTENCE COMPLEXITY BALANCER ─────────────────────────────────────────
// Analyses and balances the complexity mix across a passage

function balanceSentenceComplexity(sentences) {
  const SHORT_THRESHOLD  = 8;
  const LONG_THRESHOLD   = 30;
  const result = [];
  let   consecutiveShort = 0;
  let   consecutiveLong  = 0;

  const BRIDGE_PHRASES = [
    'To put it simply,',
    'In other words,',
    'More specifically,',
    'Put another way,',
    'To be clear,',
    'That is to say,',
    'In practical terms,',
    'To expand on this,',
  ];

  for (let i = 0; i < sentences.length; i++) {
    const s     = sentences[i];
    const words = s.split(/\s+/).length;

    if (words < SHORT_THRESHOLD) {
      consecutiveShort++;
      consecutiveLong = 0;
      // After 2 consecutive short sentences, inject a medium elaboration
      if (consecutiveShort === 2 && i + 1 < sentences.length) {
        result.push(s);
        const bridge = BRIDGE_PHRASES[i % BRIDGE_PHRASES.length];
        const next   = sentences[i + 1];
        const lc     = next.charAt(0).toLowerCase() + next.slice(1);
        result.push(`${bridge} ${lc}`);
        i++; // skip next since we merged
        consecutiveShort = 0;
        continue;
      }
    } else if (words > LONG_THRESHOLD) {
      consecutiveLong++;
      consecutiveShort = 0;
    } else {
      consecutiveShort = 0;
      consecutiveLong  = 0;
    }
    result.push(s);
  }
  return result;
}

// ── v5: EMPHATIC LANGUAGE NATURALIZER ────────────────────────────────────────
// Tones down over-emphatic / hyperbolic language to sound more human

const EMPHATIC_OVERUSE_PATTERNS = [
  [/\babsolutely amazing\b/gi,          'impressive'],
  [/\bincredibly awesome\b/gi,          'really good'],
  [/\bextremely fantastic\b/gi,         'excellent'],
  [/\bcompletely perfect\b/gi,          'perfect'],
  [/\btotally flawless\b/gi,            'flawless'],
  [/\bpositively stunning\b/gi,         'striking'],
  [/\btruly remarkable\b/gi,            'notable'],
  [/\bgenuinely extraordinary\b/gi,     'exceptional'],
  [/\bsimply breathtaking\b/gi,         'striking'],
  [/\butterly brilliant\b/gi,           'brilliant'],
  [/\bjust phenomenal\b/gi,             'excellent'],
  [/\bincredibly powerful\b/gi,         'very effective'],
  [/\bcompletely revolutionary\b/gi,    'transformative'],
  [/\babsolutely critical\b/gi,         'critical'],
  [/\btotally indispensable\b/gi,       'essential'],
  [/\bextremely vital\b/gi,             'vital'],
  [/\bvery very\b/gi,                   'very'],
  [/\breally really\b/gi,               'really'],
  [/\bso so\b/gi,                       'very'],
  [/\bsuper super\b/gi,                 'especially'],
  [/\bthe most amazing ever\b/gi,       'exceptional'],
  [/\bthe best ever\b/gi,               'excellent'],
  [/\bwithout a shadow of a doubt\b/gi, 'certainly'],
  [/\bbeyond the shadow of a doubt\b/gi,'certainly'],
  [/\bthe absolute best\b/gi,           'the best'],
  [/\bwithout question the most\b/gi,   'one of the most'],
  [/\beasily the greatest\b/gi,         'one of the greatest'],
  [/\bby far the worst\b/gi,            'notably bad'],
  [/\bcompletely and utterly\b/gi,      'entirely'],
  [/\bthoroughly and completely\b/gi,   'thoroughly'],
  [/\bfully and completely\b/gi,        'fully'],
  [/\babsolutely and completely\b/gi,   'completely'],
];

function applyEmphaticNaturalizer(text) {
  let r = text;
  for (const [pat, rep] of EMPHATIC_OVERUSE_PATTERNS) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: PRONOUN HUMANIZER ─────────────────────────────────────────────────────
// Converts impersonal or overly formal pronoun usage to natural human tone

const PRONOUN_HUMANIZER_PATTERNS = [
  [/\bone must\b/gi,                        'you need to'],
  [/\bone should\b/gi,                      'you should'],
  [/\bone can\b/gi,                         'you can'],
  [/\bone may\b/gi,                         'you can'],
  [/\bone might\b/gi,                       'you might'],
  [/\bone could\b/gi,                       'you could'],
  [/\bone would\b/gi,                       "you'd"],
  [/\bthe reader should\b/gi,               'you should'],
  [/\bthe reader will\b/gi,                 'you will'],
  [/\bthe reader can\b/gi,                  'you can'],
  [/\bthe reader may\b/gi,                  'you may'],
  [/\bthe user must\b/gi,                   'you must'],
  [/\bthe user should\b/gi,                 'you should'],
  [/\bthe user can\b/gi,                    'you can'],
  [/\bthe user will\b/gi,                   'you will'],
  [/\bthe author argues\b/gi,               'the writer argues'],
  [/\bthe author suggests\b/gi,             'the writer suggests'],
  [/\bthe author believes\b/gi,             'the writer believes'],
  [/\bthe author notes\b/gi,                'the writer notes'],
  [/\bthis writer believes\b/gi,            'I believe'],
  [/\bthis author suggests\b/gi,            'I suggest'],
  [/\bit is the view of this author\b/gi,   'I think'],
  [/\bit is the opinion of this writer\b/gi,'in my opinion'],
  [/\bpersons who\b/gi,                     'people who'],
  [/\bpersons with\b/gi,                    'people with'],
  [/\bindividuals who\b/gi,                 'people who'],
  [/\bindividuals with\b/gi,                'people with'],
  [/\bsuch individuals\b/gi,               'these people'],
  [/\bsuch persons\b/gi,                    'these people'],
  [/\ball persons\b/gi,                     'everyone'],
  [/\ball individuals\b/gi,                 'everyone'],
];

function applyPronounHumanizer(text) {
  let r = text;
  for (const [pat, rep] of PRONOUN_HUMANIZER_PATTERNS) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: SCIENTIFIC / TECHNICAL PLAIN-LANGUAGE CONVERTER ──────────────────────
// Converts dense technical language into accessible prose

const TECHNICAL_PLAIN_LANGUAGE = [
  [/\bcontraindicated\b/gi,              'not recommended'],
  [/\bcontraindication\b/gi,             'reason not to use it'],
  [/\bprognosis\b/gi,                    'expected outcome'],
  [/\bpathology\b/gi,                    'disease process'],
  [/\baetiology\b/gi,                    'cause'],
  [/\betiology\b/gi,                     'cause'],
  [/\bcomorbidity\b/gi,                  'related condition'],
  [/\bcomorbidities\b/gi,                'related conditions'],
  [/\bpresents with\b/gi,                'shows signs of'],
  [/\basymptomatic\b/gi,                 'showing no symptoms'],
  [/\bsystemic\b/gi,                     'affecting the whole body'],
  [/\bchronic\b/gi,                      'long-term'],
  [/\bacute\b/gi,                        'sudden and severe'],
  [/\bintermittent\b/gi,                 'coming and going'],
  [/\bremission\b/gi,                    'period of reduced symptoms'],
  [/\bmanifest(?:s|ed)?\b/gi,            'appear'],
  [/\bexacerbate(?:s|d)?\b/gi,           'worsen'],
  [/\bmitigate(?:s|d)?\b/gi,             'reduce'],
  [/\bprecipitate(?:s|d)?\b/gi,          'trigger'],
  [/\btherapeutic\b/gi,                  'treatment'],
  [/\bpharmacological\b/gi,              'drug-based'],
  [/\bpharmacokinetics\b/gi,             'how the body processes drugs'],
  [/\bpharmacokinetic\b/gi,              'drug-processing'],
  [/\bpharmacodynamics\b/gi,             'how drugs affect the body'],
  [/\bbioavailability\b/gi,              'how much is absorbed by the body'],
  [/\bepidemiological\b/gi,              'population-level'],
  [/\bepidemiologically\b/gi,            'at a population level'],
  [/\bcohort\b/gi,                       'group'],
  [/\bprospective study\b/gi,            'forward-looking study'],
  [/\bretrospective study\b/gi,          'backward-looking study'],
  [/\bcontrol group\b/gi,                'comparison group'],
  [/\bstatistically significant\b/gi,    'meaningful according to statistics'],
  [/\bp-value\b/gi,                      'statistical significance measure'],
  [/\bconfounding variable\b/gi,         'hidden influencing factor'],
  [/\bcorrelation\b/gi,                  'connection'],
  [/\bcausation\b/gi,                    'direct cause'],
  [/\bhypothesis\b/gi,                   'proposed explanation'],
  [/\bpostulate(?:s|d)?\b/gi,            'suggest'],
  [/\bextrapolate(?:s|d)?\b/gi,          'extend beyond the data'],
  [/\binterpolate(?:s|d)?\b/gi,          'estimate between data points'],
  [/\bquantitative\b/gi,                 'number-based'],
  [/\bqualitative\b/gi,                  'description-based'],
  [/\balgorithm\b/gi,                    'step-by-step process'],
  [/\biterative\b/gi,                    'repeated'],
  [/\brecursive\b/gi,                    'self-repeating'],
  [/\blatency\b/gi,                      'delay'],
  [/\bthroughput\b/gi,                   'processing speed'],
  [/\bencapsulate(?:s|d)?\b/gi,          'contain'],
  [/\babstract(?:ion)?\b/gi,             'simplified concept'],
  [/\bmodular\b/gi,                      'built in separate parts'],
  [/\bparametrize(?:d)?\b/gi,            'define through settings'],
  [/\bdeployment\b/gi,                   'release'],
  [/\barchitecture\b/gi,                 'overall design'],
  [/\binfrastructure\b/gi,               'underlying systems'],
  [/\bmigration\b/gi,                    'transfer'],
  [/\bdeprecated\b/gi,                   'no longer supported'],
  [/\blegacy system\b/gi,                'older system'],
];

function applyTechnicalPlainLanguage(text) {
  let r = text;
  for (const [pat, rep] of TECHNICAL_PLAIN_LANGUAGE) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: LEGAL LANGUAGE SIMPLIFIER ────────────────────────────────────────────
// Converts legalese and formal contract language into plain English

const LEGAL_PLAIN_PATTERNS = [
  [/\bhereinafter referred to as\b/gi,     'called'],
  [/\bhereinafter\b/gi,                    'from here on'],
  [/\bhereby\b/gi,                         'by this'],
  [/\bhereof\b/gi,                         'of this'],
  [/\bherein\b/gi,                         'in this'],
  [/\bhereto\b/gi,                         'to this'],
  [/\bhereunder\b/gi,                      'under this'],
  [/\bthereof\b/gi,                        'of that'],
  [/\btherein\b/gi,                        'in that'],
  [/\bthereto\b/gi,                        'to that'],
  [/\bthereunder\b/gi,                     'under that'],
  [/\bwhereof\b/gi,                        'of which'],
  [/\bwherein\b/gi,                        'in which'],
  [/\bwhereby\b/gi,                        'by which'],
  [/\bwhereto\b/gi,                        'to which'],
  [/\bwhereas\b/gi,                        'given that'],
  [/\bnotwithstanding\b/gi,                'despite this'],
  [/\binsofar as\b/gi,                     'to the extent that'],
  [/\binsofar\b/gi,                        'to that extent'],
  [/\binasmuch as\b/gi,                    'because'],
  [/\bthereunto\b/gi,                      'to that'],
  [/\bthereafter\b/gi,                     'after that'],
  [/\btherewith\b/gi,                      'with that'],
  [/\bsaid agreement\b/gi,                 'this agreement'],
  [/\bsaid party\b/gi,                     'that party'],
  [/\bsaid document\b/gi,                  'this document'],
  [/\bsaid provisions\b/gi,                'these provisions'],
  [/\bthe aforementioned\b/gi,             'the above-mentioned'],
  [/\baforementioned\b/gi,                 'mentioned above'],
  [/\bthe above-mentioned\b/gi,            'this'],
  [/\binter alia\b/gi,                     'among other things'],
  [/\bpari passu\b/gi,                     'equally'],
  [/\bmutatis mutandis\b/gi,               'with the necessary changes'],
  [/\bbona fide\b/gi,                      'genuine'],
  [/\bde facto\b/gi,                       'in practice'],
  [/\bde jure\b/gi,                        'legally'],
  [/\bforce majeure\b/gi,                  'unforeseeable circumstances'],
  [/\bin perpetuity\b/gi,                  'forever'],
  [/\bin its entirety\b/gi,                'in full'],
  [/\bin witness whereof\b/gi,             'to confirm this'],
  [/\bnull and void\b/gi,                  'invalid'],
  [/\bbinding upon\b/gi,                   'applies to'],
  [/\bexecute this agreement\b/gi,         'sign this agreement'],
  [/\benter into this agreement\b/gi,      'sign this agreement'],
  [/\bparties hereto\b/gi,                 'parties to this agreement'],
  [/\bobligation hereunder\b/gi,           'obligation under this'],
  [/\brightful owner\b/gi,                 'owner'],
  [/\bexpress written consent\b/gi,        'written permission'],
  [/\bprior written notice\b/gi,           'advance written notice'],
  [/\bduly executed\b/gi,                  'properly signed'],
  [/\bin full force and effect\b/gi,       'valid and enforceable'],
];

function applyLegalSimplifier(text) {
  let r = text;
  for (const [pat, rep] of LEGAL_PLAIN_PATTERNS) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: FILLER WORD DEEP CLEANER ─────────────────────────────────────────────
// Removes an extended list of filler words and empty intensifiers

const DEEP_FILLER_PATTERNS = [
  [/\bbasically\b/gi,                  ''],
  [/\bliterally\b/gi,                  ''],
  [/\bactually\b/gi,                   ''],
  [/\bessentially\b/gi,                ''],
  [/\bfundamentally speaking\b/gi,     ''],
  [/\bgenerally speaking\b/gi,         'generally'],
  [/\bbroadly speaking\b/gi,           'broadly'],
  [/\brelatively speaking\b/gi,        'relatively'],
  [/\bfar and away\b/gi,               'clearly'],
  [/\bby and large\b/gi,               'generally'],
  [/\ball in all\b/gi,                 'overall'],
  [/\ball things considered\b/gi,      'overall'],
  [/\bin any case\b/gi,                'regardless'],
  [/\bin any event\b/gi,               'regardless'],
  [/\bat any rate\b/gi,                'regardless'],
  [/\bin this day and age\b/gi,        'today'],
  [/\bin today's world\b/gi,           'today'],
  [/\bin this modern era\b/gi,         'today'],
  [/\bfirst and foremost\b/gi,         'first'],
  [/\bforemost\b/gi,                   'first'],
  [/\bwithout further ado\b/gi,        ''],
  [/\bit is worth mentioning that\b/gi, ''],
  [/\bit is safe to say that\b/gi,     ''],
  [/\bit goes without saying that\b/gi, ''],
  [/\bneedless to say\b/gi,            ''],
  [/\bas a matter of fact\b/gi,        'in fact'],
  [/\bwhen you think about it\b/gi,    ''],
  [/\bwhen you get down to it\b/gi,    ''],
  [/\bwhen push comes to shove\b/gi,   'when it matters'],
  [/\bin point of fact\b/gi,           'in fact'],
  [/\bthe thing is\b/gi,               ''],
  [/\bhere's the thing\b/gi,           ''],
  [/\bthe fact of the matter is\b/gi,  ''],
  [/\bat the end of the day\b/gi,      'ultimately'],
  [/\bin other words\b/gi,             ''],
  [/\bso to speak\b/gi,                ''],
  [/\bif you will\b/gi,                ''],
  [/\bif you like\b/gi,                ''],
  [/\bas it were\b/gi,                 ''],
  [/\bso to say\b/gi,                  ''],
  [/\bin a manner of speaking\b/gi,    ''],
  [/\bto tell you the truth\b/gi,      'honestly'],
  [/\bto be perfectly honest\b/gi,     'honestly'],
  [/\bto be totally transparent\b/gi,  'to be clear'],
  [/\bif I'm being honest\b/gi,        'honestly'],
  [/\bif I'm being frank\b/gi,         'frankly'],
  [/\bI have to say\b/gi,              ''],
  [/\bI must say\b/gi,                 ''],
  [/\bI would say\b/gi,                ''],
  [/\bI dare say\b/gi,                 ''],
  [/\bI think it is fair to say\b/gi,  'I believe'],
  [/\bwould you believe\b/gi,          ''],
  [/\bbelieve it or not\b/gi,          ''],
  [/\bsurprise surprise\b/gi,          ''],
  [/\bfunnily enough\b/gi,             'interestingly'],
  [/\binterestingly enough\b/gi,       'interestingly'],
  [/\bstrangely enough\b/gi,           'strangely'],
  [/\bfair enough\b/gi,                "that's fair"],
  [/\bsure enough\b/gi,                'indeed'],
  [/\bsure thing\b/gi,                 'of course'],
  [/\bno doubt\b/gi,                   'certainly'],
  [/\bno question\b/gi,                'certainly'],
  [/\bno wonder\b/gi,                  'unsurprisingly'],
];

function applyDeepFillerCleaner(text) {
  let r = text;
  for (const [pat, rep] of DEEP_FILLER_PATTERNS) {
    r = r.replace(pat, (match) => {
      if (rep === '') return rep;
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  // Clean up double spaces from empty replacements
  r = r.replace(/[ \t]{2,}/g, ' ').replace(/ ,/g, ',').replace(/ \./g, '.').trim();
  return r;
}

// ── v5: CONTEXTUAL METAPHOR SIMPLIFIER ───────────────────────────────────────
// Clarifies mixed or unclear metaphors in common usage

const METAPHOR_CLARIFIER = [
  [/\blight at the end of the tunnel\b/gi,          'hope for improvement'],
  [/\ba drop in the ocean\b/gi,                     'a very small amount'],
  [/\ba double-edged sword\b/gi,                    'something with both benefits and drawbacks'],
  [/\na tempest in a teapot\b/gi,                   'an exaggerated problem'],
  [/\na storm in a teacup\b/gi,                     'a minor issue blown out of proportion'],
  [/\nbetween a rock and a hard place\b/gi,          'in a difficult situation with no easy options'],
  [/\nburning bridges\b/gi,                          'ending relationships permanently'],
  [/\ncrossing the Rubicon\b/gi,                     'making an irreversible decision'],
  [/\nfighting fire with fire\b/gi,                  'responding to aggression with aggression'],
  [/\nholding all the cards\b/gi,                    'having complete control'],
  [/\nnot all it's cracked up to be\b/gi,            'not as good as expected'],
  [/\non thin ice\b/gi,                              'in a risky situation'],
  [/\nopening a can of worms\b/gi,                   'creating new complications'],
  [/\nplaying devil's advocate\b/gi,                 'arguing the opposite side for balance'],
  [/\npulling strings\b/gi,                          'using influence or connections'],
  [/\nreading between the lines\b/gi,                'finding the hidden meaning'],
  [/\nselling like hotcakes\b/gi,                    'selling very quickly'],
  [/\nseparating the wheat from the chaff\b/gi,      'distinguishing the good from the bad'],
  [/\nsitting on the fence\b/gi,                     'remaining neutral'],
  [/\nspeaking the same language\b/gi,               'understanding each other well'],
  [/\ntaking the bull by the horns\b/gi,             'dealing with a problem directly'],
  [/\nthe writing is on the wall\b/gi,               'the signs are clear'],
  [/\nthrow caution to the wind\b/gi,                'act without worrying about the risks'],
  [/\nwarm the cockles of your heart\b/gi,           'make you feel happy'],
];

function applyMetaphorClarifier(text) {
  let r = text;
  for (const [pat, rep] of METAPHOR_CLARIFIER) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── v5: WORD ELEGANCE UPGRADER ────────────────────────────────────────────────
// Replaces dull, generic word choices with more precise, elegant alternatives
// without making the text sound academic

const ELEGANCE_UPGRADES = [
  [/\bgot better\b/gi,              'improved'],
  [/\bgot worse\b/gi,               'deteriorated'],
  [/\bgot bigger\b/gi,              'grew'],
  [/\bgot smaller\b/gi,             'shrank'],
  [/\bgot more\b/gi,                'increased'],
  [/\bgot less\b/gi,                'decreased'],
  [/\bgot faster\b/gi,              'accelerated'],
  [/\bgot slower\b/gi,              'slowed'],
  [/\bgot louder\b/gi,              'intensified'],
  [/\bgot quieter\b/gi,             'softened'],
  [/\bbecame better\b/gi,           'improved'],
  [/\bbecame worse\b/gi,            'worsened'],
  [/\bbecame bigger\b/gi,           'expanded'],
  [/\bbecame smaller\b/gi,          'contracted'],
  [/\bbecame more popular\b/gi,     'grew in popularity'],
  [/\bbecame less popular\b/gi,     'declined in popularity'],
  [/\bbecame more important\b/gi,   'grew in importance'],
  [/\bbecame less important\b/gi,   'lost importance'],
  [/\bbecame aware of\b/gi,         'realised'],
  [/\bbecame part of\b/gi,          'joined'],
  [/\bmade it possible to\b/gi,     'enabled'],
  [/\bmade it easier to\b/gi,       'simplified'],
  [/\bmade it harder to\b/gi,       'complicated'],
  [/\nmade it clear that\b/gi,      'clarified that'],
  [/\nmade use of\b/gi,             'used'],
  [/\bmade a decision about\b/gi,   'decided on'],
  [/\bmade progress on\b/gi,        'advanced on'],
  [/\nmade reference to\b/gi,       'mentioned'],
  [/\nmade an effort to\b/gi,       'tried to'],
  [/\ncarried out research\b/gi,    'conducted research'],
  [/\ncarried out tests\b/gi,       'ran tests'],
  [/\ncarried out work\b/gi,        'did the work'],
  [/\ncame up with\b/gi,            'developed'],
  [/\ncame to an end\b/gi,          'ended'],
  [/\ncame into being\b/gi,         'emerged'],
  [/\ncame to light\b/gi,           'emerged'],
  [/\ncame to realise\b/gi,         'realised'],
  [/\ncame to understand\b/gi,      'understood'],
  [/\nput in place\b/gi,            'implemented'],
  [/\nput forward\b/gi,             'proposed'],
  [/\nput together\b/gi,            'assembled'],
  [/\nput an end to\b/gi,           'ended'],
  [/\nset out to\b/gi,              'aimed to'],
  [/\nset in motion\b/gi,           'initiated'],
  [/\nset the stage for\b/gi,       'prepared the way for'],
  [/\ntook place\b/gi,              'occurred'],
  [/\ntook part in\b/gi,            'participated in'],
  [/\ntook steps to\b/gi,           'acted to'],
  [/\ntook on the challenge\b/gi,   'accepted the challenge'],
  [/\ntook advantage of\b/gi,       'used'],
  [/\ntook into account\b/gi,       'considered'],
  [/\ntook a closer look at\b/gi,   'examined'],
  [/\nlooked at\b/gi,               'examined'],
  [/\nlooked into\b/gi,             'investigated'],
  [/\nlooked for\b/gi,              'sought'],
  [/\nlooked up to\b/gi,            'admired'],
  [/\nlooked forward to\b/gi,       'anticipated'],
];

function applyEleganceUpgrader(text) {
  let r = text;
  for (const [pat, rep] of ELEGANCE_UPGRADES) {
    r = r.replace(pat, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

module.exports = {
  run,
  humanizeFull,
  segmentSentences,
  tokenize,
  // Core transforms
  passiveToActive,
  moveTimePhraseToFront,
  moveLocationPhrase,
  removeRedundantWords,
  removeUnnecessaryAdverbs,
  reduceWordiness,
  simplifyNestedClauses,
  adjustReadability,
  fixSubjectVerbAgreement,
  fixTenseConsistency,
  rephraseQuestion,
  expandShortExpressions,
  replaceRepeatedVerbs,
  adjustWordOrder,
  changeSentenceOpening,
  addMildDescriptors,
  applyContractions,
  removeAIFillers,
  replaceStiffVocab,
  // v3 new exports
  applyImpersonalToPersonal,
  applyNominalizationReversals,
  applyQuantifierNaturalizer,
  enforceOxfordComma,
  injectHedgeLanguage,
  estimateFleschScore,
  readabilityGrade,
  // v4 new exports
  applyEmotionSoftener,
  insertRhythmVariation,
  reduceProximityRepetition,
  applyClicheBuster,
  applyPassiveNaturalizer,
  applyTransitionEnricher,
  applyAcademicSimplifier,
  applyVoiceStrengthener,
  naturalizeNumerals,
  diversifySentenceOpeners,
  // v5 new exports
  applyBureaucraticBuster,
  applyStructureDiversifier,
  applyExtendedContractions,
  applyIdiomFreshener,
  balanceSentenceComplexity,
  applyEmphaticNaturalizer,
  applyPronounHumanizer,
  applyTechnicalPlainLanguage,
  applyLegalSimplifier,
  applyDeepFillerCleaner,
  applyMetaphorClarifier,
  applyEleganceUpgrader,
  // v6 new exports
  injectBurstiness,
  injectPerplexity,
  injectPersonalVoice,
  injectStructuralVariety,
  injectNaturalFragments,
  applyColloquialSoftener,
};
