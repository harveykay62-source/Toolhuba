/**
 * ToolHub AI — Sentence Expander
 * File: routes/api/text/sentenceExpander.js
 *
 * Expands short, sparse text into fuller, richer prose by injecting
 * descriptive context, elaborations, and explanatory clauses.
 * Fully deterministic — no AI.
 */

'use strict';

// ── Expansion Templates ───────────────────────────────────────────────────────
// Maps topic-trigger words to elaboration phrases appended to sentences

const CONTEXT_ELABORATIONS = {
  technology: [
    'which has transformed the way we interact with information',
    'enabling faster, more reliable outcomes than ever before',
    'representing a significant leap forward in digital capability',
    'making complex tasks more accessible to everyday users',
  ],
  data: [
    'providing valuable insight into patterns and trends',
    'helping organisations make better-informed decisions',
    'allowing for deeper analysis and more targeted action',
    'which serves as the foundation for evidence-based conclusions',
  ],
  business: [
    'helping companies to operate more efficiently and profitably',
    'while keeping customer satisfaction at the forefront',
    'which plays a critical role in driving long-term growth',
    'ensuring teams remain aligned with strategic objectives',
  ],
  education: [
    'which equips students with the knowledge and skills they need',
    'fostering a love of learning that extends beyond the classroom',
    'enabling educators to support a diverse range of learners',
    'building the critical thinking skills essential for modern life',
  ],
  health: [
    'which contributes to overall well-being and quality of life',
    'helping individuals maintain both physical and mental resilience',
    'reducing risk factors and supporting long-term vitality',
    'empowering people to take control of their own health journey',
  ],
  environment: [
    'with far-reaching implications for ecosystems and biodiversity',
    'highlighting the urgent need for sustainable practices',
    'reminding us of our collective responsibility to future generations',
    'as the effects become increasingly visible in our daily lives',
  ],
  communication: [
    'making it easier for people to connect across distances and barriers',
    'which is fundamental to building strong relationships and communities',
    'enabling clearer, more effective exchange of ideas and intentions',
    'and fostering mutual understanding in an increasingly complex world',
  ],
  research: [
    'shedding new light on previously unexamined questions',
    'opening up fresh avenues for inquiry and discovery',
    'providing a more nuanced understanding of the subject',
    'with implications that extend well beyond this initial finding',
  ],
};

// ── Descriptive Amplifiers ────────────────────────────────────────────────────
// These are appended to short sentences to add substance

const AMPLIFIERS = [
  'This is especially relevant in today\'s fast-changing landscape.',
  'The implications of this extend well beyond the immediate context.',
  'Understanding this fully requires looking at both the causes and the effects.',
  'This point is often overlooked, yet it carries considerable weight.',
  'While this may seem straightforward, the details are worth exploring further.',
  'In practice, this plays out in a variety of interesting ways.',
  'The significance of this becomes clear when we consider the broader picture.',
  'This is not an isolated phenomenon — it connects to a wider pattern.',
  'Taken together with related factors, this paints a richer and more complete picture.',
  'It\'s worth pausing here to consider what this really means in practice.',
  'The real value of this becomes apparent over time and with repeated application.',
  'At its core, this reflects a deeper truth about how things work.',
  'This serves as a useful reminder that simple ideas can have profound consequences.',
  'When viewed from a wider angle, this becomes part of a much larger story.',
];

// ── Introductory Clause Injectors ─────────────────────────────────────────────

const INTRO_CLAUSES = [
  'To fully appreciate this,',
  'Looking at the bigger picture,',
  'When we examine this closely,',
  'In many real-world situations,',
  'From a practical standpoint,',
  'When you consider the context,',
  'It\'s important to recognise that',
  'As any expert in this field would note,',
  'Building on this idea,',
  'At a foundational level,',
  'Stepping back for a moment,',
  'In the broader scheme of things,',
  'When applied consistently,',
  'From a different perspective,',
  'In terms of real-world impact,',
];

// ── Sentence Padding Patterns ─────────────────────────────────────────────────

const DETAIL_INJECTIONS = [
  // Insert "which means that X" after the first clause
  [/^(.{30,80})\.$/, '$1, which means the impact is felt across multiple areas.'],
  // Add "particularly when it comes to X"
  [/^(It is|This is|There is|That is)\s/, (m, s) => `${s}, particularly when examined in context, `],
];

// ── Expansion Engine ──────────────────────────────────────────────────────────

function detectTopicKeyword(text) {
  const lower = text.toLowerCase();
  for (const topic of Object.keys(CONTEXT_ELABORATIONS)) {
    if (lower.includes(topic)) return topic;
  }
  return null;
}

function expandSentence(sentence, index) {
  const trimmed = sentence.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // Only expand short sentences (under 15 words)
  if (wordCount >= 15) return trimmed;

  const topic = detectTopicKeyword(trimmed);
  const elaborations = topic
    ? CONTEXT_ELABORATIONS[topic]
    : null;

  let expanded = trimmed.replace(/[.!?]+$/, '');

  // Add elaboration or amplifier
  if (elaborations) {
    const elaboration = elaborations[index % elaborations.length];
    expanded = `${expanded}, ${elaboration}`;
  } else if (wordCount < 8) {
    // Very short sentences get an intro clause on next sentence suggestion
    const intro = INTRO_CLAUSES[index % INTRO_CLAUSES.length];
    expanded = `${intro} ${expanded.charAt(0).toLowerCase() + expanded.slice(1)}`;
  }

  // Ensure proper ending
  if (!/[.!?]$/.test(expanded)) expanded += '.';

  return expanded;
}

function addTransitionalSentences(sentences) {
  const result = [];
  for (let i = 0; i < sentences.length; i++) {
    result.push(sentences[i]);
    // After every 3rd sentence, inject a bridging sentence
    if ((i + 1) % 3 === 0 && i < sentences.length - 1) {
      const bridge = AMPLIFIERS[Math.floor(i / 3) % AMPLIFIERS.length];
      result.push(bridge);
    }
  }
  return result;
}

function expandText(text, level = 'moderate') {
  const { segmentSentences } = require('./humanizer');
  const sentences = segmentSentences(text);

  let expanded = sentences.map((s, i) => expandSentence(s, i));

  if (level === 'detailed') {
    expanded = addTransitionalSentences(expanded);
  }

  return expanded.join(' ');
}

function run(input, options = {}) {
  const text  = (input || '').trim();
  const level = ['moderate', 'detailed'].includes(options.level) ? options.level : 'moderate';

  if (!text) return { error: 'Please enter some text to expand.' };
  if (text.split(/\s+/).length < 2) return { error: 'Please enter at least a few words.' };
  if (text.length > 3000) return { error: 'Text too long. Maximum 3,000 characters.' };

  try {
    const result   = expandText(text, level);
    const origWords = text.split(/\s+/).length;
    const newWords  = result.split(/\s+/).length;

    return {
      result,
      originalWordCount: origWords,
      expandedWordCount:  newWords,
      wordsAdded:        newWords - origWords,
      expansionPercent:  Math.round(((newWords - origWords) / origWords) * 100),
    };
  } catch (err) {
    return { error: err.message || 'Expansion failed.' };
  }
}

module.exports = { run };
