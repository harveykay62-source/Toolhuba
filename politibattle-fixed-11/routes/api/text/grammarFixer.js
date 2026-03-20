/**
 * ToolHub AI — Grammar Fixer Tool
 * File: routes/api/text/grammarFixer.js
 *
 * Detects and corrects grammar, punctuation, and style issues
 * using deterministic rule-based corrections. No AI or APIs.
 *
 * Laws applied:
 *   Law 1 — Capitalisation Correction
 *   Law 2 — Punctuation Correction
 *   Law 3 — Subject–Verb Agreement
 *   Law 4 — Tense Consistency
 *   + Article usage, common confusables, spacing
 */

'use strict';

// ── Rule record structure ─────────────────────────────────────────────────────

/**
 * A correction rule.
 * @typedef {{ pattern: RegExp, replacement: string|Function, description: string, category: string }} Rule
 */

// ── Grammar Law 1: Capitalisation ────────────────────────────────────────────

const CAPITALISATION_RULES = [
  {
    // Sentence-start capitalisation after . ! ?
    pattern: /([.!?]\s+)([a-z])/g,
    replacement: (_, punct, ch) => punct + ch.toUpperCase(),
    description: 'Capitalise start of sentence',
    category: 'capitalisation',
  },
  {
    // Very first character
    pattern: /^(\s*)([a-z])/,
    replacement: (_, ws, ch) => ws + ch.toUpperCase(),
    description: 'Capitalise first word of text',
    category: 'capitalisation',
  },
  {
    // Standalone "i" → "I"
    pattern: /(?<![a-zA-Z])\bi\b(?![a-zA-Z])/g,
    replacement: 'I',
    description: 'Capitalise the pronoun "I"',
    category: 'capitalisation',
  },
  {
    // Days of the week
    pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
    replacement: (_, day) => day.charAt(0).toUpperCase() + day.slice(1),
    description: 'Capitalise days of the week',
    category: 'capitalisation',
  },
  {
    // Months
    pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g,
    replacement: (_, month) => month.charAt(0).toUpperCase() + month.slice(1),
    description: 'Capitalise month names',
    category: 'capitalisation',
  },
];

// ── Grammar Law 2: Punctuation ────────────────────────────────────────────────

const PUNCTUATION_RULES = [
  {
    // Remove space before punctuation
    pattern: /\s+([.,!?;:])/g,
    replacement: '$1',
    description: 'Remove space before punctuation',
    category: 'punctuation',
  },
  {
    // Ensure space after comma (not before closing quote or bracket)
    pattern: /,([^\s"'\])}])/g,
    replacement: ', $1',
    description: 'Add space after comma',
    category: 'punctuation',
  },
  {
    // Ensure space after period (not in decimals or abbreviations)
    pattern: /([^0-9A-Z.])\.([A-Z])/g,
    replacement: '$1. $2',
    description: 'Add space after full stop',
    category: 'punctuation',
  },
  {
    // Remove double punctuation (.. or !? etc.)
    pattern: /([.!?])\s*([.!?])+/g,
    replacement: '$1',
    description: 'Remove duplicate punctuation',
    category: 'punctuation',
  },
  {
    // Ensure text ends with punctuation
    // (applied as a special case, not a regex)
    special: 'ensure_end_punct',
    description: 'Ensure text ends with punctuation',
    category: 'punctuation',
  },
  {
    // Comma after introductory clauses beginning with subordinators
    pattern: /^(However|Therefore|Furthermore|Moreover|Additionally|Meanwhile|Consequently|Nevertheless|Otherwise|Instead|Thus|Hence|Similarly|Likewise|Finally|First|Second|Lastly|Although|Since|Because|Unless|Until|While|Whereas|Even though|Despite|In addition|For example|For instance|In fact|In contrast|On the other hand|As a result)\s+(?=[^,])/gi,
    replacement: (match, word) => `${word}, `,
    description: 'Add comma after introductory adverbial clause',
    category: 'punctuation',
  },
  {
    // Oxford comma: "X, Y and Z" → "X, Y, and Z"
    pattern: /(\w+),\s+(\w+)\s+and\s+(\w)/g,
    replacement: '$1, $2, and $3',
    description: 'Add Oxford comma',
    category: 'punctuation',
  },
];

// ── Grammar Law 3: Subject–Verb Agreement ────────────────────────────────────

const SV_AGREEMENT_RULES = [
  // Singular subjects with plural verbs
  { pattern: /\bhe\s+(?:go|come|run|walk|make|take|eat|do|have|like|want|need|get|see|think)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + conjugate3rdPerson(v)),
    description: 'Fix "he [verb]" → "he [verb+s]"', category: 'agreement' },
  { pattern: /\bshe\s+(?:go|come|run|walk|make|take|eat|do|have|like|want|need|get|see|think)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + conjugate3rdPerson(v)),
    description: 'Fix "she [verb]" → "she [verb+s]"', category: 'agreement' },
  { pattern: /\bit\s+(?:go|come|work|seem|look|appear|need|make|take|run|help|get|do)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + conjugate3rdPerson(v)),
    description: 'Fix "it [verb]" → "it [verb+s]"', category: 'agreement' },

  // Plural subjects with singular verbs
  { pattern: /\bthey\s+(?:goes|comes|runs|walks|makes|takes|eats|does|has|likes|wants|needs|gets|sees|thinks)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + deConjugate(v)),
    description: 'Fix "they [verb+s]" → "they [verb]"', category: 'agreement' },
  { pattern: /\bwe\s+(?:goes|comes|runs|walks|makes|takes|eats|does|has|likes|wants|needs|gets|sees|thinks)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + deConjugate(v)),
    description: 'Fix "we [verb+s]" → "we [verb]"', category: 'agreement' },
  { pattern: /\byou\s+(?:goes|comes|runs|walks|makes|takes|eats|does|has|likes|wants|needs|gets|sees|thinks)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + deConjugate(v)),
    description: 'Fix "you [verb+s]" → "you [verb]"', category: 'agreement' },
  { pattern: /\bi\s+(?:goes|comes|runs|walks|makes|takes|eats|does|has|likes|wants|needs|gets|sees|thinks)\b/gi,
    replacement: (m) => m.replace(/\s(\w+)$/, (_, v) => ' ' + deConjugate(v)),
    description: 'Fix "I [verb+s]" → "I [verb]"', category: 'agreement' },

  // "There is/are" agreement
  { pattern: /\bThere\s+is\s+(many|several|a\s+few|multiple|numerous)\b/g,
    replacement: 'There are $1', description: 'Fix "There is [plural]" → "There are"', category: 'agreement' },
  { pattern: /\bthere\s+is\s+(many|several|a\s+few|multiple|numerous)\b/g,
    replacement: 'there are $1', description: 'Fix "there is [plural]" → "there are"', category: 'agreement' },
  { pattern: /\bThere\s+are\s+(a|one|each|every|either|neither)\b/g,
    replacement: 'There is $1', description: 'Fix "There are [singular]"', category: 'agreement' },

  // Double negatives
  { pattern: /\bdon't\s+have\s+no\b/gi, replacement: "don't have any",
    description: 'Fix double negative: "don\'t have no"', category: 'agreement' },
  { pattern: /\bcan't\s+do\s+nothing\b/gi, replacement: "can't do anything",
    description: 'Fix double negative: "can\'t do nothing"', category: 'agreement' },
  { pattern: /\bdidn't\s+go\s+nowhere\b/gi, replacement: "didn't go anywhere",
    description: 'Fix double negative', category: 'agreement' },
];

/**
 * Simple 3rd person singular conjugation.
 * Handles most regular verbs.
 */
function conjugate3rdPerson(verb) {
  const v = verb.toLowerCase();
  const IRREGULAR = {
    be: 'is', have: 'has', do: 'does', go: 'goes',
    make: 'makes', take: 'takes', give: 'gives',
    come: 'comes', become: 'becomes',
  };
  if (IRREGULAR[v]) return IRREGULAR[v];

  if (v.endsWith('ss') || v.endsWith('sh') || v.endsWith('ch') || v.endsWith('tch') ||
      v.endsWith('x') || v.endsWith('o')) {
    return v + 'es';
  }
  if (v.endsWith('y') && !/[aeiou]$/.test(v.slice(0, -1).slice(-1))) {
    return v.slice(0, -1) + 'ies';
  }
  return v + 's';
}

/**
 * Remove 3rd-person -s/-es/-ies suffix (approximate reverse conjugation).
 */
function deConjugate(verb) {
  const v = verb.toLowerCase();
  const IRREGULAR_REV = {
    is: 'be', has: 'have', does: 'do', goes: 'go',
    makes: 'make', takes: 'take', gives: 'give',
    comes: 'come', becomes: 'become',
  };
  if (IRREGULAR_REV[v]) return IRREGULAR_REV[v];

  if (v.endsWith('ies')) return v.slice(0, -3) + 'y';
  if (v.endsWith('sses') || v.endsWith('shes') || v.endsWith('ches') ||
      v.endsWith('xes') || v.endsWith('oes')) {
    return v.slice(0, -2);
  }
  if (v.endsWith('s') && !v.endsWith('ss')) return v.slice(0, -1);
  return v;
}

// ── Grammar Law 4: Tense Consistency ─────────────────────────────────────────

/**
 * Detect predominant tense in a sentence based on auxiliary/verb presence.
 * Returns 'past' | 'present' | 'future' | 'unknown'.
 */
function detectTense(sentence) {
  const lower = sentence.toLowerCase();
  const pastSignals    = /\b(was|were|had|did|went|said|came|saw|made|took|gave|found|knew|thought|told|became|left|felt|put|brought|began|showed|stood|heard|let|meant|set|met|ran|paid|sat|spoke|lay|led|read|grew|lost|fell|sent|built|kept|held|wrote|stood|understood|drew|broke|won|chose|drove|hit|ate|bit|caught|cut|shut)\b/;
  const futureSignals  = /\b(will|shall|going to|about to|won't|shan't)\b/;
  const presentSignals = /\b(is|are|am|have|has|do|does|go|make|take|say|get|come|see|know|think|look|want|give|use|find|tell|ask|seem|feel|try|leave|call|keep|let|begin|show|hear|play|run|move|live|believe|hold|bring|write|stand|hear|win)\b/;

  const pastMatches    = (lower.match(pastSignals) || []).length;
  const futureMatches  = (lower.match(futureSignals) || []).length;
  const presentMatches = (lower.match(presentSignals) || []).length;

  if (futureMatches  > 0) return 'future';
  if (pastMatches    > presentMatches) return 'past';
  if (presentMatches > 0) return 'present';
  return 'unknown';
}

// Tense shift corrections (mixed tense within a sentence)
const TENSE_CONSISTENCY_RULES = [
  // Past context: fix sudden present slips
  {
    pattern: /\b(was|were)\s+(\w+ing),?\s+(?:and|but|so)\s+(?:he|she|it|they|we)\s+(go|come|run|walk|see|say|do)\b/gi,
    replacement: (m, aux, prog, subj, verb) => {
      const pastVerb = toPast(verb);
      return `${aux} ${prog}, and ${subj} ${pastVerb}`;
    },
    description: 'Fix tense shift in compound past sentence',
    category: 'tense',
  },
];

// A small irregular past-tense table
const IRREGULAR_PAST = {
  go: 'went', come: 'came', run: 'ran', see: 'saw', say: 'said',
  do: 'did', get: 'got', make: 'made', take: 'took', give: 'gave',
  tell: 'told', know: 'knew', think: 'thought', feel: 'felt',
  leave: 'left', keep: 'kept', let: 'let', begin: 'began',
  show: 'showed', hear: 'heard', find: 'found', hold: 'held',
  bring: 'brought', buy: 'bought', build: 'built', write: 'wrote',
  sit: 'sat', stand: 'stood', win: 'won', lose: 'lost', pay: 'paid',
  meet: 'met', read: 'read', send: 'sent', teach: 'taught',
  catch: 'caught', break: 'broke', fall: 'fell', grow: 'grew',
  draw: 'drew', drive: 'drove', ride: 'rode', eat: 'ate',
  fly: 'flew', swim: 'swam', speak: 'spoke', throw: 'threw',
  wear: 'wore', choose: 'chose', rise: 'rose', sing: 'sang',
  hit: 'hit', cut: 'cut', put: 'put', set: 'set', bite: 'bit',
};

function toPast(verb) {
  const v = verb.toLowerCase();
  if (IRREGULAR_PAST[v]) return IRREGULAR_PAST[v];
  if (v.endsWith('e')) return v + 'd';
  if (v.endsWith('y') && !/[aeiou]$/.test(v.slice(-2, -1))) return v.slice(0, -1) + 'ied';
  if (/[^aeiou][aeiou][^aeioul]$/.test(v)) return v + v.slice(-1) + 'ed'; // double consonant: stop→stopped
  return v + 'ed';
}

// ── Common Confusables ────────────────────────────────────────────────────────

const CONFUSABLE_RULES = [
  { pattern: /\byour\s+welcome\b/gi, replacement: "you're welcome",
    description: '"your welcome" → "you\'re welcome"', category: 'confusable' },
  { pattern: /\b(their|there)\s+going\b/gi, replacement: "they're going",
    description: '"there/their going" → "they\'re going"', category: 'confusable' },
  { pattern: /\bits\s+(a|an|the|not|very|really|quite|so)\b/gi, replacement: "it's $1",
    description: '"its [article]" → "it\'s"', category: 'confusable' },
  { pattern: /\bshould\s+of\b/gi, replacement: 'should have',
    description: '"should of" → "should have"', category: 'confusable' },
  { pattern: /\bcould\s+of\b/gi, replacement: 'could have',
    description: '"could of" → "could have"', category: 'confusable' },
  { pattern: /\bwould\s+of\b/gi, replacement: 'would have',
    description: '"would of" → "would have"', category: 'confusable' },
  { pattern: /\bmight\s+of\b/gi, replacement: 'might have',
    description: '"might of" → "might have"', category: 'confusable' },
  { pattern: /\bmust\s+of\b/gi, replacement: 'must have',
    description: '"must of" → "must have"', category: 'confusable' },
  { pattern: /\bto\s+(?=\b(far|much|many|long|late|soon|little|few|early|old|young|big|small|fast|slow)\b)/gi,
    replacement: 'too ',
    description: '"to [adjective]" → "too [adjective]" when indicating excess', category: 'confusable' },
  { pattern: /\bexcept\s+(?=\b(for|when|if|that|to|the|a)\b)/gi, replacement: 'except ',
    description: 'accept/except confusion (context-limited)', category: 'confusable' },
  { pattern: /\bthen\s+(?=\b(the|a|an|I|he|she|we|they|you|it|this|that|these|those)\b)/gi,
    replacement: 'than ',
    description: '"then" → "than" in comparisons', category: 'confusable' },
  { pattern: /\ba\s+(?=[aeiouAEIOU])/g, replacement: 'an ',
    description: '"a" → "an" before vowel sounds', category: 'article' },
  { pattern: /\ban\s+(?=[^aeiouAEIOU\s])/g, replacement: 'a ',
    description: '"an" → "a" before consonant sounds', category: 'article' },
];

// ── Spacing rules ─────────────────────────────────────────────────────────────

const SPACING_RULES = [
  { pattern: /[ \t]{2,}/g, replacement: ' ', description: 'Remove extra spaces', category: 'spacing' },
  { pattern: /\n{3,}/g, replacement: '\n\n', description: 'Collapse triple blank lines', category: 'spacing' },
  { pattern: /^\s+/g, replacement: '', description: 'Remove leading whitespace', category: 'spacing' },
];

// ── Grammar Law 5: Commonly Confused Word Pairs ───────────────────────────────
// Extended confusable pairs beyond basic their/there/they're

const EXTENDED_CONFUSABLES = [
  // affect / effect
  { pattern: /\bthe effect of (.+?) on\b/gi,
    replacement: 'the effect of $1 on',
    description: 'Preserve "effect" as noun', category: 'confusable' },
  // lay / lie
  { pattern: /\bi(?:'m| am) going to lay down\b/gi, replacement: "I'm going to lie down",
    description: '"lay down" → "lie down" (intransitive)', category: 'confusable' },
  { pattern: /\bshe lays down\b/gi, replacement: 'she lies down',
    description: '"lays down" → "lies down"', category: 'confusable' },
  // who / whom
  { pattern: /\bwho did you give it to\b/gi, replacement: 'whom did you give it to',
    description: '"who" → "whom" as object', category: 'confusable' },
  // less / fewer
  { pattern: /\bless ([a-z]+(s|es))\b/gi,
    replacement: (_, noun) => `fewer ${noun}`,
    description: '"less [countable noun]" → "fewer"', category: 'confusable' },
  // amount / number
  { pattern: /\bthe amount of people\b/gi, replacement: 'the number of people',
    description: '"amount of people" → "number of people"', category: 'confusable' },
  { pattern: /\bthe amount of students\b/gi, replacement: 'the number of students',
    description: '"amount of students" → "number of students"', category: 'confusable' },
  { pattern: /\bthe amount of items\b/gi, replacement: 'the number of items',
    description: '"amount of items" → "number of items"', category: 'confusable' },
  // further / farther
  { pattern: /\bno further than\b/gi, replacement: 'no farther than',
    description: '"further" → "farther" for physical distance', category: 'confusable' },
  // good / well
  { pattern: /\bdid\s+good\b/gi, replacement: 'did well',
    description: '"did good" → "did well"', category: 'confusable' },
  { pattern: /\bperform\s+good\b/gi, replacement: 'perform well',
    description: '"perform good" → "perform well"', category: 'confusable' },
  // between / among
  { pattern: /\bbetween the (three|four|five|six|seven|eight|nine|ten)\b/gi,
    replacement: 'among the $1',
    description: '"between" → "among" for 3+ items', category: 'confusable' },
  // into / in to
  { pattern: /\blog into\b/gi, replacement: 'log in to',
    description: '"log into" → "log in to"', category: 'confusable' },
  // alot → a lot
  { pattern: /\balot\b/gi, replacement: 'a lot',
    description: '"alot" → "a lot"', category: 'spelling' },
  // alright → all right
  { pattern: /\balright\b/gi, replacement: 'all right',
    description: '"alright" → "all right"', category: 'spelling' },
  // everyday / every day
  { pattern: /\beveryday (?:I|we|they|you|he|she)\b/gi,
    replacement: (m) => m.replace('everyday', 'every day'),
    description: '"everyday" → "every day" before pronoun', category: 'confusable' },
  // irregardless → regardless
  { pattern: /\birregardless\b/gi, replacement: 'regardless',
    description: '"irregardless" → "regardless"', category: 'spelling' },
  // literally (misused intensifier)
  { pattern: /\bliterally (?=(?:the best|the worst|impossible|amazing|incredible|awesome|terrible|perfect))\b/gi,
    replacement: '',
    description: 'Remove misused "literally" before hyperbole', category: 'style' },
  // myself as subject
  { pattern: /\bmyself and ([A-Z]\w+)\b/g, replacement: '$1 and I',
    description: '"myself and X" → "X and I"', category: 'agreement' },
  { pattern: /\b([A-Z]\w+) and myself\b/g, replacement: '$1 and I',
    description: '"X and myself" → "X and I" as subject', category: 'agreement' },
  // ending prepositions fix hint
  { pattern: /\bwhere are you at\b/gi, replacement: 'where are you',
    description: 'Remove redundant "at" from "where are you at"', category: 'style' },
  { pattern: /\bwhere is it at\b/gi, replacement: 'where is it',
    description: 'Remove redundant "at" from "where is it at"', category: 'style' },
  // redundant pairs
  { pattern: /\bsafe and secure\b/gi, replacement: 'safe',
    description: 'Remove redundant "safe and secure"', category: 'style' },
  { pattern: /\bfree and gratis\b/gi, replacement: 'free',
    description: 'Remove redundant "free and gratis"', category: 'style' },
  { pattern: /\btrue and accurate\b/gi, replacement: 'accurate',
    description: 'Remove redundant "true and accurate"', category: 'style' },
  { pattern: /\bbasic and fundamental\b/gi, replacement: 'fundamental',
    description: 'Remove redundant pair', category: 'style' },
  { pattern: /\beach and every\b/gi, replacement: 'every',
    description: 'Remove redundant "each and every"', category: 'style' },
  { pattern: /\bnew and novel\b/gi, replacement: 'novel',
    description: 'Remove redundant "new and novel"', category: 'style' },
  { pattern: /\bfirst and foremost\b/gi, replacement: 'first',
    description: 'Simplify "first and foremost"', category: 'style' },
  { pattern: /\bsudden and abrupt\b/gi, replacement: 'sudden',
    description: 'Remove redundant pair', category: 'style' },
  { pattern: /\bask a question\b/gi, replacement: 'ask',
    description: 'Simplify "ask a question"', category: 'style' },
  { pattern: /\bplan ahead\b/gi, replacement: 'plan',
    description: 'Remove redundant "plan ahead"', category: 'style' },
  { pattern: /\brevert back\b/gi, replacement: 'revert',
    description: 'Remove redundant "revert back"', category: 'style' },
  { pattern: /\brepeat again\b/gi, replacement: 'repeat',
    description: 'Remove redundant "repeat again"', category: 'style' },
  { pattern: /\benter into\b/gi, replacement: 'enter',
    description: 'Remove redundant "enter into"', category: 'style' },
  { pattern: /\bjoin together\b/gi, replacement: 'join',
    description: 'Remove redundant "join together"', category: 'style' },
  { pattern: /\bcollaborate together\b/gi, replacement: 'collaborate',
    description: 'Remove redundant "collaborate together"', category: 'style' },
  { pattern: /\badvance forward\b/gi, replacement: 'advance',
    description: 'Remove redundant "advance forward"', category: 'style' },
  { pattern: /\bdescend down\b/gi, replacement: 'descend',
    description: 'Remove redundant "descend down"', category: 'style' },
  { pattern: /\bascend up\b/gi, replacement: 'ascend',
    description: 'Remove redundant "ascend up"', category: 'style' },
];

// ── Grammar Law 6: Word Form & Modifier Errors ────────────────────────────────

const WORD_FORM_RULES = [
  // Adverb vs adjective confusion
  { pattern: /\bfeel\s+badly\b/gi, replacement: 'feel bad',
    description: '"feel badly" → "feel bad"', category: 'word-form' },
  { pattern: /\blooks\s+nicely\b/gi, replacement: 'looks nice',
    description: '"looks nicely" → "looks nice"', category: 'word-form' },
  { pattern: /\bsmells\s+strongly\b/gi, replacement: 'smells strong',
    description: '"smells strongly" → "smells strong"', category: 'word-form' },
  { pattern: /\btastes\s+sweetly\b/gi, replacement: 'tastes sweet',
    description: '"tastes sweetly" → "tastes sweet"', category: 'word-form' },
  // Superlative misuse
  { pattern: /\bmore better\b/gi, replacement: 'better',
    description: '"more better" → "better"', category: 'word-form' },
  { pattern: /\bmore worse\b/gi, replacement: 'worse',
    description: '"more worse" → "worse"', category: 'word-form' },
  { pattern: /\bmost perfect\b/gi, replacement: 'perfect',
    description: '"most perfect" → "perfect"', category: 'word-form' },
  { pattern: /\bmost unique\b/gi, replacement: 'unique',
    description: '"most unique" → "unique" (unique is absolute)', category: 'word-form' },
  { pattern: /\bvery unique\b/gi, replacement: 'unique',
    description: '"very unique" → "unique"', category: 'word-form' },
  { pattern: /\bvery perfect\b/gi, replacement: 'perfect',
    description: '"very perfect" → "perfect"', category: 'word-form' },
  { pattern: /\bmore preferable\b/gi, replacement: 'preferable',
    description: '"more preferable" → "preferable"', category: 'word-form' },
  // Missing articles
  { pattern: /\bshe is (?:doctor|teacher|lawyer|nurse|engineer|pilot)\b/gi,
    replacement: (m) => m.replace(/is /, 'is a '),
    description: 'Add missing article "a" before profession', category: 'article' },
  { pattern: /\bhe is (?:doctor|teacher|lawyer|nurse|engineer|pilot)\b/gi,
    replacement: (m) => m.replace(/is /, 'is a '),
    description: 'Add missing article "a" before profession', category: 'article' },
  // Dangling modifiers (common patterns)
  { pattern: /\bRunning down the street, the rain started\b/gi,
    replacement: 'As I was running down the street, the rain started',
    description: 'Fix dangling modifier', category: 'structure' },
  // Wrong verb form after modal
  { pattern: /\bwould went\b/gi,  replacement: 'would go', description: '"would went" → "would go"', category: 'tense' },
  { pattern: /\bcould ran\b/gi,   replacement: 'could run', description: '"could ran" → "could run"', category: 'tense' },
  { pattern: /\bshould came\b/gi, replacement: 'should come', description: '"should came" → "should come"', category: 'tense' },
  { pattern: /\bwould did\b/gi,   replacement: 'would do', description: '"would did" → "would do"', category: 'tense' },
  { pattern: /\bcould saw\b/gi,   replacement: 'could see', description: '"could saw" → "could see"', category: 'tense' },
  { pattern: /\bmust went\b/gi,   replacement: 'must go', description: '"must went" → "must go"', category: 'tense' },
  { pattern: /\bshould ate\b/gi,  replacement: 'should eat', description: '"should ate" → "should eat"', category: 'tense' },
  // Preposition errors
  { pattern: /\bdifferent than\b/gi, replacement: 'different from',
    description: '"different than" → "different from"', category: 'preposition' },
  { pattern: /\bindependent to\b/gi, replacement: 'independent of',
    description: '"independent to" → "independent of"', category: 'preposition' },
  { pattern: /\binherent to\b/gi, replacement: 'inherent in',
    description: '"inherent to" → "inherent in"', category: 'preposition' },
  { pattern: /\bcompare to when\b/gi, replacement: 'compared with when',
    description: '"compare to" → "compared with"', category: 'preposition' },
  { pattern: /\bbored of\b/gi, replacement: 'bored by',
    description: '"bored of" → "bored by"', category: 'preposition' },
  { pattern: /\binterested on\b/gi, replacement: 'interested in',
    description: '"interested on" → "interested in"', category: 'preposition' },
  { pattern: /\bsurprised of\b/gi, replacement: 'surprised by',
    description: '"surprised of" → "surprised by"', category: 'preposition' },
  { pattern: /\bdisappointed of\b/gi, replacement: 'disappointed by',
    description: '"disappointed of" → "disappointed by"', category: 'preposition' },
  { pattern: /\baccording with\b/gi, replacement: 'according to',
    description: '"according with" → "according to"', category: 'preposition' },
  { pattern: /\bcomply to\b/gi, replacement: 'comply with',
    description: '"comply to" → "comply with"', category: 'preposition' },
  { pattern: /\bsuffer of\b/gi, replacement: 'suffer from',
    description: '"suffer of" → "suffer from"', category: 'preposition' },
  { pattern: /\bglad to\b/gi, replacement: 'glad about',
    description: '"glad to" → "glad about" for noun objects', category: 'preposition' },
];

// ── Grammar Law 7: Number & Quantity Agreement ────────────────────────────────

const NUMBER_AGREEMENT_RULES = [
  { pattern: /\bone of the most (\w+) thing\b/gi,
    replacement: 'one of the most $1 things',
    description: '"one of the most ... thing" → "things"', category: 'agreement' },
  { pattern: /\bthese kind of\b/gi, replacement: 'this kind of',
    description: '"these kind of" → "this kind of"', category: 'agreement' },
  { pattern: /\bthose type of\b/gi, replacement: 'that type of',
    description: '"those type of" → "that type of"', category: 'agreement' },
  { pattern: /\bthese sort of\b/gi, replacement: 'this sort of',
    description: '"these sort of" → "this sort of"', category: 'agreement' },
  { pattern: /\bevery students\b/gi, replacement: 'every student',
    description: '"every students" → "every student"', category: 'agreement' },
  { pattern: /\beach students\b/gi, replacement: 'each student',
    description: '"each students" → "each student"', category: 'agreement' },
  { pattern: /\beach people\b/gi, replacement: 'each person',
    description: '"each people" → "each person"', category: 'agreement' },
  { pattern: /\bno students are\b/gi, replacement: 'no student is',
    description: '"no students are" → "no student is"', category: 'agreement' },
  { pattern: /\bnone of them is\b/gi, replacement: 'none of them are',
    description: '"none of them is" → "none of them are"', category: 'agreement' },
  { pattern: /\bneither .+ nor .+ are\b/gi,
    replacement: (m) => m.replace(/are$/, 'is'),
    description: '"neither...nor...are" → "is"', category: 'agreement' },
  { pattern: /\beither .+ or .+ is\b/gi,
    replacement: (m) => m,
    description: 'Preserve "either...or...is"', category: 'agreement' },
];

// ── Grammar Law 8: Style & Clarity Rules ─────────────────────────────────────

const STYLE_CLARITY_RULES = [
  // Avoid starting sentences with numbers
  { pattern: /^(\d+)/gm,
    replacement: (_, n) => {
      const map = {'1':'One','2':'Two','3':'Three','4':'Four','5':'Five',
                   '6':'Six','7':'Seven','8':'Eight','9':'Nine','10':'Ten'};
      return map[n] || n;
    },
    description: 'Spell out numbers at start of sentence', category: 'style' },
  // Avoid passive "It was X that"
  { pattern: /\bIt was (.+?) that (.+?)\./gi,
    replacement: '$1 $2.',
    description: 'Remove "It was...that" cleft sentence', category: 'style' },
  // Avoid "there is/are ... that/which"
  { pattern: /\bThere is (.+?) that\b/gi, replacement: '$1',
    description: 'Simplify "There is X that"', category: 'style' },
  // Nominalization hints
  { pattern: /\bmake a decision\b/gi, replacement: 'decide',
    description: '"make a decision" → "decide"', category: 'style' },
  { pattern: /\bgive consideration to\b/gi, replacement: 'consider',
    description: '"give consideration to" → "consider"', category: 'style' },
  { pattern: /\bcome to a conclusion\b/gi, replacement: 'conclude',
    description: '"come to a conclusion" → "conclude"', category: 'style' },
  { pattern: /\bmake an attempt to\b/gi, replacement: 'attempt to',
    description: '"make an attempt to" → "attempt to"', category: 'style' },
  { pattern: /\bcarry out an investigation\b/gi, replacement: 'investigate',
    description: '"carry out an investigation" → "investigate"', category: 'style' },
  { pattern: /\bprovide assistance to\b/gi, replacement: 'assist',
    description: '"provide assistance to" → "assist"', category: 'style' },
  { pattern: /\bgive an explanation of\b/gi, replacement: 'explain',
    description: '"give an explanation of" → "explain"', category: 'style' },
  { pattern: /\bconduct a study of\b/gi, replacement: 'study',
    description: '"conduct a study of" → "study"', category: 'style' },
  { pattern: /\bperform an analysis of\b/gi, replacement: 'analyse',
    description: '"perform an analysis of" → "analyse"', category: 'style' },
  { pattern: /\btake action on\b/gi, replacement: 'act on',
    description: '"take action on" → "act on"', category: 'style' },
  { pattern: /\bhave knowledge of\b/gi, replacement: 'know',
    description: '"have knowledge of" → "know"', category: 'style' },
  { pattern: /\bexpress agreement\b/gi, replacement: 'agree',
    description: '"express agreement" → "agree"', category: 'style' },
  // Sentence fragments (common ones)
  { pattern: /^Because [^.!?]+\./gm,
    replacement: (m) => {
      if (/^Because [^,]+,/.test(m)) return m;
      return m.replace(/^Because /, 'This is because ');
    },
    description: 'Fix "Because ..." sentence fragment', category: 'structure' },
];



/**
 * Apply a single rule to text, tracking if a change occurred.
 */
function applyRule(text, rule) {
  if (rule.special === 'ensure_end_punct') {
    const trimmed = text.trimEnd();
    if (trimmed && !/[.!?]$/.test(trimmed)) {
      return { text: trimmed + '.', changed: true };
    }
    return { text, changed: false };
  }

  const before = text;
  const after  = typeof rule.replacement === 'function'
    ? text.replace(rule.pattern, rule.replacement)
    : text.replace(rule.pattern, rule.replacement);

  return { text: after, changed: before !== after };
}

/**
 * Run all rule categories in order and collect applied fixes.
 */
function applyAllRules(text) {
  let current = text;
  const applied = [];

  const allRuleSets = [
    SPACING_RULES,
    CONFUSABLE_RULES,
    EXTENDED_CONFUSABLES,
    WORD_FORM_RULES,
    NUMBER_AGREEMENT_RULES,
    STYLE_CLARITY_RULES,
    APOSTROPHE_RULES,
    SENTENCE_LEVEL_RULES,
    SPELLING_RULES,
    CAPITALISATION_RULES,
    PUNCTUATION_RULES,
    SV_AGREEMENT_RULES,
    TENSE_CONSISTENCY_RULES,
  ];

  for (const ruleSet of allRuleSets) {
    for (const rule of ruleSet) {
      const { text: next, changed } = applyRule(current, rule);
      if (changed) {
        applied.push({ description: rule.description, category: rule.category });
        current = next;
      }
    }
  }

  // De-duplicate fixes list
  const seen = new Set();
  const unique = applied.filter(f => {
    if (seen.has(f.description)) return false;
    seen.add(f.description);
    return true;
  });

  return { result: current, fixes: unique };
}

// ── Main GrammarFixer Export ──────────────────────────────────────────────────

/**
 * run(input) → { result, fixes, fixCount, categories }
 */
function run(input) {
  const text = (input || '').trim();

  if (!text) {
    return { error: 'Please enter some text to fix.' };
  }
  if (text.length > 10000) {
    return { error: 'Text is too long. Maximum is 10,000 characters.' };
  }

  try {
    const { result, fixes } = applyAllRules(text);

    // Group fixes by category for structured output
    const categories = {};
    for (const fix of fixes) {
      if (!categories[fix.category]) categories[fix.category] = [];
      categories[fix.category].push(fix.description);
    }

    return {
      result,
      fixes:      fixes.map(f => f.description),
      fixCount:   fixes.length,
      categories,
      changed:    result.trim() !== text.trim(),
    };
  } catch (err) {
    return { error: err.message || 'Grammar fixing failed. Please try again.' };
  }
}

// ── Grammar Law 9: Advanced Apostrophe & Possessive Rules ────────────────────

const APOSTROPHE_RULES = [
  // its vs it's
  { pattern: /\bits a\b/gi,  replacement: "it's a",
    description: '"its a" → "it\'s a"', category: 'apostrophe' },
  { pattern: /\bits an\b/gi, replacement: "it's an",
    description: '"its an" → "it\'s an"', category: 'apostrophe' },
  { pattern: /\bits not\b/gi, replacement: "it's not",
    description: '"its not" → "it\'s not"', category: 'apostrophe' },
  { pattern: /\bits been\b/gi, replacement: "it's been",
    description: '"its been" → "it\'s been"', category: 'apostrophe' },
  { pattern: /\bits going\b/gi, replacement: "it's going",
    description: '"its going" → "it\'s going"', category: 'apostrophe' },
  { pattern: /\bits getting\b/gi, replacement: "it's getting",
    description: '"its getting" → "it\'s getting"', category: 'apostrophe' },
  // Plural possessives
  { pattern: /\bstudents's\b/gi,  replacement: "students'",
    description: 'Fix "students\'s" → "students\'"', category: 'apostrophe' },
  { pattern: /\bchildren's\b/gi,  replacement: "children's",
    description: 'Preserve correct "children\'s"', category: 'apostrophe' },
  { pattern: /\bwomens'\b/gi,     replacement: "women's",
    description: '"womens\'" → "women\'s"', category: 'apostrophe' },
  { pattern: /\bmens'\b/gi,       replacement: "men's",
    description: '"mens\'" → "men\'s"', category: 'apostrophe' },
  // Contraction vs possessive confusion
  { pattern: /\bwhos\b/gi,  replacement: "who's",
    description: '"whos" → "who\'s"', category: 'apostrophe' },
  { pattern: /\bwhose going\b/gi, replacement: "who's going",
    description: '"whose going" → "who\'s going"', category: 'apostrophe' },
  { pattern: /\bwere going\b/gi,  replacement: "we're going",
    description: '"were going" → "we\'re going" (context)', category: 'apostrophe' },
  { pattern: /\btheyre\b/gi,  replacement: "they're",
    description: '"theyre" → "they\'re"', category: 'apostrophe' },
  { pattern: /\byoure\b/gi,   replacement: "you're",
    description: '"youre" → "you\'re"', category: 'apostrophe' },
  { pattern: /\bwere not\b/gi, replacement: "we're not",
    description: '"were not" → "we\'re not" (ambiguity fix)', category: 'apostrophe' },
  { pattern: /\bthats\b/gi,   replacement: "that's",
    description: '"thats" → "that\'s"', category: 'apostrophe' },
  { pattern: /\bwhats\b/gi,   replacement: "what's",
    description: '"whats" → "what\'s"', category: 'apostrophe' },
  { pattern: /\bwhos\b/gi,    replacement: "who's",
    description: '"whos" → "who\'s"', category: 'apostrophe' },
  { pattern: /\blets go\b/gi, replacement: "let's go",
    description: '"lets go" → "let\'s go"', category: 'apostrophe' },
  { pattern: /\blets see\b/gi,replacement: "let's see",
    description: '"lets see" → "let\'s see"', category: 'apostrophe' },
  { pattern: /\blets talk\b/gi, replacement: "let's talk",
    description: '"lets talk" → "let\'s talk"', category: 'apostrophe' },
  { pattern: /\blets try\b/gi,  replacement: "let's try",
    description: '"lets try" → "let\'s try"', category: 'apostrophe' },
  { pattern: /\blets start\b/gi,replacement: "let's start",
    description: '"lets start" → "let\'s start"', category: 'apostrophe' },
  { pattern: /\blets make\b/gi, replacement: "let's make",
    description: '"lets make" → "let\'s make"', category: 'apostrophe' },
  { pattern: /\blets get\b/gi,  replacement: "let's get",
    description: '"lets get" → "let\'s get"', category: 'apostrophe' },
  { pattern: /\bwont do\b/gi,   replacement: "won't do",
    description: '"wont do" → "won\'t do"', category: 'apostrophe' },
  { pattern: /\bcant do\b/gi,   replacement: "can't do",
    description: '"cant do" → "can\'t do"', category: 'apostrophe' },
  { pattern: /\bdidnt know\b/gi, replacement: "didn't know",
    description: '"didnt know" → "didn\'t know"', category: 'apostrophe' },
  { pattern: /\bdoesnt work\b/gi, replacement: "doesn't work",
    description: '"doesnt work" → "doesn\'t work"', category: 'apostrophe' },
  { pattern: /\bisnt it\b/gi,  replacement: "isn't it",
    description: '"isnt it" → "isn\'t it"', category: 'apostrophe' },
  { pattern: /\barent they\b/gi, replacement: "aren't they",
    description: '"arent they" → "aren\'t they"', category: 'apostrophe' },
  { pattern: /\bhasnt\b/gi,   replacement: "hasn't",
    description: '"hasnt" → "hasn\'t"', category: 'apostrophe' },
  { pattern: /\bhavent\b/gi,  replacement: "haven't",
    description: '"havent" → "haven\'t"', category: 'apostrophe' },
  { pattern: /\bhadnt\b/gi,   replacement: "hadn't",
    description: '"hadnt" → "hadn\'t"', category: 'apostrophe' },
  { pattern: /\bshouldnt\b/gi, replacement: "shouldn't",
    description: '"shouldnt" → "shouldn\'t"', category: 'apostrophe' },
  { pattern: /\bcouldnt\b/gi, replacement: "couldn't",
    description: '"couldnt" → "couldn\'t"', category: 'apostrophe' },
  { pattern: /\bwouldnt\b/gi, replacement: "wouldn't",
    description: '"wouldnt" → "wouldn\'t"', category: 'apostrophe' },
];

// ── Grammar Law 10: Sentence-Level Issues ─────────────────────────────────────

const SENTENCE_LEVEL_RULES = [
  // Run-on: comma splice between two independent clauses (basic heuristic)
  { pattern: /([a-z]{3,}),\s+(I|we|he|she|they|it|the|a|an|this|that|these|those)\s+(?:am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|shall|should|may|might|must)\s/g,
    replacement: (m, end, subj) => `${end}. ${subj.charAt(0).toUpperCase() + subj.slice(1)} `,
    description: 'Fix comma splice between independent clauses', category: 'sentence' },
  // Starting sentence with "And" or "But" (style preference — flag, not always wrong)
  { pattern: /^And\s+/gm, replacement: 'Additionally, ',
    description: 'Replace sentence-opening "And" with "Additionally"', category: 'sentence' },
  { pattern: /^But\s+/gm, replacement: 'However, ',
    description: 'Replace sentence-opening "But" with "However"', category: 'sentence' },
  { pattern: /^Or\s+/gm, replacement: 'Alternatively, ',
    description: 'Replace sentence-opening "Or" with "Alternatively"', category: 'sentence' },
  { pattern: /^So\s+/gm, replacement: 'Therefore, ',
    description: 'Replace sentence-opening "So" with "Therefore"', category: 'sentence' },
  // Sentence ending with a preposition (flag common cases)
  { pattern: /\bthe issue that I am talking about\b/gi, replacement: 'the issue I am discussing',
    description: 'Remove dangling preposition', category: 'sentence' },
  { pattern: /\bthe person that I was speaking with\b/gi, replacement: 'the person I was speaking to',
    description: 'Fix dangling preposition construction', category: 'sentence' },
  // Double "that"
  { pattern: /\bthat that\b/gi, replacement: 'that',
    description: 'Remove duplicate "that that"', category: 'sentence' },
  // "the the"
  { pattern: /\bthe the\b/gi, replacement: 'the',
    description: 'Remove duplicate "the the"', category: 'sentence' },
  // "a a" / "a an"
  { pattern: /\ba a\b/gi,  replacement: 'a',
    description: 'Remove duplicate "a a"', category: 'sentence' },
  { pattern: /\ban an\b/gi, replacement: 'an',
    description: 'Remove duplicate "an an"', category: 'sentence' },
  // "is is"
  { pattern: /\bis is\b/gi, replacement: 'is',
    description: 'Remove duplicate "is is"', category: 'sentence' },
  // "are are"
  { pattern: /\bare are\b/gi, replacement: 'are',
    description: 'Remove duplicate "are are"', category: 'sentence' },
  // "in in"
  { pattern: /\bin in\b/gi, replacement: 'in',
    description: 'Remove duplicate "in in"', category: 'sentence' },
  // "to to"
  { pattern: /\bto to\b/gi, replacement: 'to',
    description: 'Remove duplicate "to to"', category: 'sentence' },
  // "of of"
  { pattern: /\bof of\b/gi, replacement: 'of',
    description: 'Remove duplicate "of of"', category: 'sentence' },
  // "for for"
  { pattern: /\bfor for\b/gi, replacement: 'for',
    description: 'Remove duplicate "for for"', category: 'sentence' },
  // "at at"
  { pattern: /\bat at\b/gi, replacement: 'at',
    description: 'Remove duplicate "at at"', category: 'sentence' },
  // "on on"
  { pattern: /\bon on\b/gi, replacement: 'on',
    description: 'Remove duplicate "on on"', category: 'sentence' },
  // "with with"
  { pattern: /\bwith with\b/gi, replacement: 'with',
    description: 'Remove duplicate "with with"', category: 'sentence' },
  // "and and"
  { pattern: /\band and\b/gi, replacement: 'and',
    description: 'Remove duplicate "and and"', category: 'sentence' },
  // "or or"
  { pattern: /\bor or\b/gi, replacement: 'or',
    description: 'Remove duplicate "or or"', category: 'sentence' },
  // "not not"
  { pattern: /\bnot not\b/gi, replacement: 'not',
    description: 'Remove duplicate "not not"', category: 'sentence' },
];

// ── Grammar Law 11: Common Spelling Corrections ───────────────────────────────

const SPELLING_RULES = [
  { pattern: /\baccomodate\b/gi,     replacement: 'accommodate',    description: 'Spelling: accommodate', category: 'spelling' },
  { pattern: /\bachieve\b/gi,        replacement: 'achieve',        description: 'Spelling: achieve (verify)', category: 'spelling' },
  { pattern: /\backnowlege\b/gi,     replacement: 'acknowledge',    description: 'Spelling: acknowledge', category: 'spelling' },
  { pattern: /\bacquaintance\b/gi,   replacement: 'acquaintance',   description: 'Spelling: acquaintance (verify)', category: 'spelling' },
  { pattern: /\bacquaintence\b/gi,   replacement: 'acquaintance',   description: 'Spelling: acquaintence → acquaintance', category: 'spelling' },
  { pattern: /\badress\b/gi,         replacement: 'address',        description: 'Spelling: adress → address', category: 'spelling' },
  { pattern: /\bagressive\b/gi,      replacement: 'aggressive',     description: 'Spelling: agressive → aggressive', category: 'spelling' },
  { pattern: /\baggresive\b/gi,      replacement: 'aggressive',     description: 'Spelling: aggresive → aggressive', category: 'spelling' },
  { pattern: /\baparently\b/gi,      replacement: 'apparently',     description: 'Spelling: aparently → apparently', category: 'spelling' },
  { pattern: /\bapparrently\b/gi,    replacement: 'apparently',     description: 'Spelling: apparrently → apparently', category: 'spelling' },
  { pattern: /\bapperance\b/gi,      replacement: 'appearance',     description: 'Spelling: apperance → appearance', category: 'spelling' },
  { pattern: /\bappropriate\b/gi,    replacement: 'appropriate',    description: 'Spelling: appropriate (verify)', category: 'spelling' },
  { pattern: /\bapproprieate\b/gi,   replacement: 'appropriate',    description: 'Spelling: approprieate → appropriate', category: 'spelling' },
  { pattern: /\bargument\b/gi,       replacement: 'argument',       description: 'Spelling: argument (verify)', category: 'spelling' },
  { pattern: /\bargumant\b/gi,       replacement: 'argument',       description: 'Spelling: argumant → argument', category: 'spelling' },
  { pattern: /\bassasination\b/gi,   replacement: 'assassination',  description: 'Spelling: assasination → assassination', category: 'spelling' },
  { pattern: /\bassassin\b/gi,       replacement: 'assassin',       description: 'Spelling: assasin → assassin', category: 'spelling' },
  { pattern: /\batrocious\b/gi,      replacement: 'atrocious',      description: 'Spelling: atrocious (verify)', category: 'spelling' },
  { pattern: /\batrocous\b/gi,       replacement: 'atrocious',      description: 'Spelling: atrocous → atrocious', category: 'spelling' },
  { pattern: /\bbeleive\b/gi,        replacement: 'believe',        description: 'Spelling: beleive → believe', category: 'spelling' },
  { pattern: /\bbenifit\b/gi,        replacement: 'benefit',        description: 'Spelling: benifit → benefit', category: 'spelling' },
  { pattern: /\bbuisness\b/gi,       replacement: 'business',       description: 'Spelling: buisness → business', category: 'spelling' },
  { pattern: /\bcalander\b/gi,       replacement: 'calendar',       description: 'Spelling: calander → calendar', category: 'spelling' },
  { pattern: /\bcatagory\b/gi,       replacement: 'category',       description: 'Spelling: catagory → category', category: 'spelling' },
  { pattern: /\bchangable\b/gi,      replacement: 'changeable',     description: 'Spelling: changable → changeable', category: 'spelling' },
  { pattern: /\bcharacter\b/gi,      replacement: 'character',      description: 'Spelling: character (verify)', category: 'spelling' },
  { pattern: /\bcharector\b/gi,      replacement: 'character',      description: 'Spelling: charector → character', category: 'spelling' },
  { pattern: /\bcolumn\b/gi,         replacement: 'column',         description: 'Spelling: column (verify)', category: 'spelling' },
  { pattern: /\bcolum\b/gi,          replacement: 'column',         description: 'Spelling: colum → column', category: 'spelling' },
  { pattern: /\bcommittee\b/gi,      replacement: 'committee',      description: 'Spelling: committee (verify)', category: 'spelling' },
  { pattern: /\bcommitee\b/gi,       replacement: 'committee',      description: 'Spelling: commitee → committee', category: 'spelling' },
  { pattern: /\bconcious\b/gi,       replacement: 'conscious',      description: 'Spelling: concious → conscious', category: 'spelling' },
  { pattern: /\bconsience\b/gi,      replacement: 'conscience',     description: 'Spelling: consience → conscience', category: 'spelling' },
  { pattern: /\bconvienient\b/gi,    replacement: 'convenient',     description: 'Spelling: convienient → convenient', category: 'spelling' },
  { pattern: /\bdefinately\b/gi,     replacement: 'definitely',     description: 'Spelling: definately → definitely', category: 'spelling' },
  { pattern: /\bdefinate\b/gi,       replacement: 'definite',       description: 'Spelling: definate → definite', category: 'spelling' },
  { pattern: /\bdisapear\b/gi,       replacement: 'disappear',      description: 'Spelling: disapear → disappear', category: 'spelling' },
  { pattern: /\bdisapoint\b/gi,      replacement: 'disappoint',     description: 'Spelling: disapoint → disappoint', category: 'spelling' },
  { pattern: /\bdisciplin\b/gi,      replacement: 'discipline',     description: 'Spelling: disciplin → discipline', category: 'spelling' },
  { pattern: /\bdisipline\b/gi,      replacement: 'discipline',     description: 'Spelling: disipline → discipline', category: 'spelling' },
  { pattern: /\beccentric\b/gi,      replacement: 'eccentric',      description: 'Spelling: eccentric (verify)', category: 'spelling' },
  { pattern: /\becentric\b/gi,       replacement: 'eccentric',      description: 'Spelling: ecentric → eccentric', category: 'spelling' },
  { pattern: /\bembarass\b/gi,       replacement: 'embarrass',      description: 'Spelling: embarass → embarrass', category: 'spelling' },
  { pattern: /\bembarasment\b/gi,    replacement: 'embarrassment',  description: 'Spelling: embarasment → embarrassment', category: 'spelling' },
  { pattern: /\benvironement\b/gi,   replacement: 'environment',    description: 'Spelling: environement → environment', category: 'spelling' },
  { pattern: /\bequipement\b/gi,     replacement: 'equipment',      description: 'Spelling: equipement → equipment', category: 'spelling' },
  { pattern: /\bequiptment\b/gi,     replacement: 'equipment',      description: 'Spelling: equiptment → equipment', category: 'spelling' },
  { pattern: /\bexagerate\b/gi,      replacement: 'exaggerate',     description: 'Spelling: exagerate → exaggerate', category: 'spelling' },
  { pattern: /\bexcede\b/gi,         replacement: 'exceed',         description: 'Spelling: excede → exceed', category: 'spelling' },
  { pattern: /\bexistance\b/gi,      replacement: 'existence',      description: 'Spelling: existance → existence', category: 'spelling' },
  { pattern: /\bexperiance\b/gi,     replacement: 'experience',     description: 'Spelling: experiance → experience', category: 'spelling' },
  { pattern: /\bfacsimile\b/gi,      replacement: 'facsimile',      description: 'Spelling: facsimile (verify)', category: 'spelling' },
  { pattern: /\bfacsimlie\b/gi,      replacement: 'facsimile',      description: 'Spelling: facsimlie → facsimile', category: 'spelling' },
  { pattern: /\bfamilier\b/gi,       replacement: 'familiar',       description: 'Spelling: familier → familiar', category: 'spelling' },
  { pattern: /\bfasinate\b/gi,       replacement: 'fascinate',      description: 'Spelling: fasinate → fascinate', category: 'spelling' },
  { pattern: /\bfirey\b/gi,          replacement: 'fiery',          description: 'Spelling: firey → fiery', category: 'spelling' },
  { pattern: /\bforiegn\b/gi,        replacement: 'foreign',        description: 'Spelling: foriegn → foreign', category: 'spelling' },
  { pattern: /\bforword\b/gi,        replacement: 'foreword',       description: 'Spelling: forword → foreword', category: 'spelling' },
  { pattern: /\bfrequantly\b/gi,     replacement: 'frequently',     description: 'Spelling: frequantly → frequently', category: 'spelling' },
  { pattern: /\bfullfil\b/gi,        replacement: 'fulfil',         description: 'Spelling: fullfil → fulfil', category: 'spelling' },
  { pattern: /\bgaurantee\b/gi,      replacement: 'guarantee',      description: 'Spelling: gaurantee → guarantee', category: 'spelling' },
  { pattern: /\bgoverment\b/gi,      replacement: 'government',     description: 'Spelling: goverment → government', category: 'spelling' },
  { pattern: /\bgrammer\b/gi,        replacement: 'grammar',        description: 'Spelling: grammer → grammar', category: 'spelling' },
  { pattern: /\bgratefull\b/gi,      replacement: 'grateful',       description: 'Spelling: gratefull → grateful', category: 'spelling' },
  { pattern: /\bharras\b/gi,         replacement: 'harass',         description: 'Spelling: haras → harass', category: 'spelling' },
  { pattern: /\bheigth\b/gi,         replacement: 'height',         description: 'Spelling: heigth → height', category: 'spelling' },
  { pattern: /\bheirarchy\b/gi,      replacement: 'hierarchy',      description: 'Spelling: heirarchy → hierarchy', category: 'spelling' },
  { pattern: /\bhumerous\b/gi,       replacement: 'humorous',       description: 'Spelling: humerous → humorous', category: 'spelling' },
  { pattern: /\bimediate\b/gi,       replacement: 'immediate',      description: 'Spelling: imediate → immediate', category: 'spelling' },
  { pattern: /\bimediately\b/gi,     replacement: 'immediately',    description: 'Spelling: imediately → immediately', category: 'spelling' },
  { pattern: /\bindipendent\b/gi,    replacement: 'independent',    description: 'Spelling: indipendent → independent', category: 'spelling' },
  { pattern: /\bintellgent\b/gi,     replacement: 'intelligent',    description: 'Spelling: intellgent → intelligent', category: 'spelling' },
  { pattern: /\binteresting\b/gi,    replacement: 'interesting',    description: 'Spelling: interesting (verify)', category: 'spelling' },
  { pattern: /\bintersting\b/gi,     replacement: 'interesting',    description: 'Spelling: intersting → interesting', category: 'spelling' },
  { pattern: /\bjudgement\b/gi,      replacement: 'judgment',       description: 'Spelling: judgement → judgment (US)', category: 'spelling' },
  { pattern: /\bknowledge\b/gi,      replacement: 'knowledge',      description: 'Spelling: knowledge (verify)', category: 'spelling' },
  { pattern: /\bknowlege\b/gi,       replacement: 'knowledge',      description: 'Spelling: knowlege → knowledge', category: 'spelling' },
  { pattern: /\blibary\b/gi,         replacement: 'library',        description: 'Spelling: libary → library', category: 'spelling' },
  { pattern: /\blicence\b/gi,        replacement: 'license',        description: 'Spelling: licence → license (verb, US)', category: 'spelling' },
  { pattern: /\blietenent\b/gi,      replacement: 'lieutenant',     description: 'Spelling: lietenent → lieutenant', category: 'spelling' },
  { pattern: /\blieutennant\b/gi,    replacement: 'lieutenant',     description: 'Spelling: lieutennant → lieutenant', category: 'spelling' },
  { pattern: /\blonliness\b/gi,      replacement: 'loneliness',     description: 'Spelling: lonliness → loneliness', category: 'spelling' },
  { pattern: /\bloseing\b/gi,        replacement: 'losing',         description: 'Spelling: loseing → losing', category: 'spelling' },
  { pattern: /\bmanouver\b/gi,       replacement: 'manoeuvre',      description: 'Spelling: manouver → manoeuvre', category: 'spelling' },
  { pattern: /\bmarrige\b/gi,        replacement: 'marriage',       description: 'Spelling: marrige → marriage', category: 'spelling' },
  { pattern: /\bmispell\b/gi,        replacement: 'misspell',       description: 'Spelling: mispell → misspell', category: 'spelling' },
  { pattern: /\bmediterranean\b/gi,  replacement: 'Mediterranean',  description: 'Spelling: mediterranean → Mediterranean', category: 'spelling' },
  { pattern: /\bmilenium\b/gi,       replacement: 'millennium',     description: 'Spelling: milenium → millennium', category: 'spelling' },
  { pattern: /\bmillenium\b/gi,      replacement: 'millennium',     description: 'Spelling: millenium → millennium', category: 'spelling' },
  { pattern: /\bminiature\b/gi,      replacement: 'miniature',      description: 'Spelling: miniature (verify)', category: 'spelling' },
  { pattern: /\bminnature\b/gi,      replacement: 'miniature',      description: 'Spelling: minnature → miniature', category: 'spelling' },
  { pattern: /\bmischevious\b/gi,    replacement: 'mischievous',    description: 'Spelling: mischevious → mischievous', category: 'spelling' },
  { pattern: /\bneccessary\b/gi,     replacement: 'necessary',      description: 'Spelling: neccessary → necessary', category: 'spelling' },
  { pattern: /\bneccesary\b/gi,      replacement: 'necessary',      description: 'Spelling: neccesary → necessary', category: 'spelling' },
  { pattern: /\bneighbour\b/gi,      replacement: 'neighbor',       description: 'Spelling: neighbour → neighbor (US)', category: 'spelling' },
  { pattern: /\bnoticable\b/gi,      replacement: 'noticeable',     description: 'Spelling: noticable → noticeable', category: 'spelling' },
  { pattern: /\boccassion\b/gi,      replacement: 'occasion',       description: 'Spelling: occassion → occasion', category: 'spelling' },
  { pattern: /\boccured\b/gi,        replacement: 'occurred',       description: 'Spelling: occured → occurred', category: 'spelling' },
  { pattern: /\boccurence\b/gi,      replacement: 'occurrence',     description: 'Spelling: occurence → occurrence', category: 'spelling' },
  { pattern: /\boffense\b/gi,        replacement: 'offense',        description: 'Spelling: offense (verify US)', category: 'spelling' },
  { pattern: /\bofficials\b/gi,      replacement: 'officials',      description: 'Spelling: officials (verify)', category: 'spelling' },
  { pattern: /\bopinon\b/gi,         replacement: 'opinion',        description: 'Spelling: opinon → opinion', category: 'spelling' },
  { pattern: /\bopurtunity\b/gi,     replacement: 'opportunity',    description: 'Spelling: opurtunity → opportunity', category: 'spelling' },
  { pattern: /\bparralel\b/gi,       replacement: 'parallel',       description: 'Spelling: parralel → parallel', category: 'spelling' },
  { pattern: /\bparallell\b/gi,      replacement: 'parallel',       description: 'Spelling: parallell → parallel', category: 'spelling' },
  { pattern: /\bperseverence\b/gi,   replacement: 'perseverance',   description: 'Spelling: perseverence → perseverance', category: 'spelling' },
  { pattern: /\bperseverance\b/gi,   replacement: 'perseverance',   description: 'Spelling: perseverance (verify)', category: 'spelling' },
  { pattern: /\bpersonal\b/gi,       replacement: 'personal',       description: 'Spelling: personal (verify)', category: 'spelling' },
  { pattern: /\bpersonell\b/gi,      replacement: 'personnel',      description: 'Spelling: personell → personnel', category: 'spelling' },
  { pattern: /\bpossesion\b/gi,      replacement: 'possession',     description: 'Spelling: possesion → possession', category: 'spelling' },
  { pattern: /\bpracticaly\b/gi,     replacement: 'practically',    description: 'Spelling: practicaly → practically', category: 'spelling' },
  { pattern: /\bpredjudice\b/gi,     replacement: 'prejudice',      description: 'Spelling: predjudice → prejudice', category: 'spelling' },
  { pattern: /\bprivelege\b/gi,      replacement: 'privilege',      description: 'Spelling: privelege → privilege', category: 'spelling' },
  { pattern: /\bpriviledge\b/gi,     replacement: 'privilege',      description: 'Spelling: priviledge → privilege', category: 'spelling' },
  { pattern: /\bprobaly\b/gi,        replacement: 'probably',       description: 'Spelling: probaly → probably', category: 'spelling' },
  { pattern: /\bprofesional\b/gi,    replacement: 'professional',   description: 'Spelling: profesional → professional', category: 'spelling' },
  { pattern: /\bprominent\b/gi,      replacement: 'prominent',      description: 'Spelling: prominent (verify)', category: 'spelling' },
  { pattern: /\bprominant\b/gi,      replacement: 'prominent',      description: 'Spelling: prominant → prominent', category: 'spelling' },
  { pattern: /\bpronunciation\b/gi,  replacement: 'pronunciation',  description: 'Spelling: pronunciation (verify)', category: 'spelling' },
  { pattern: /\bpronunciation\b/gi,  replacement: 'pronunciation',  description: 'Spelling: pronunciation (verify)', category: 'spelling' },
  { pattern: /\bpronounciation\b/gi, replacement: 'pronunciation',  description: 'Spelling: pronounciation → pronunciation', category: 'spelling' },
  { pattern: /\bquestionaire\b/gi,   replacement: 'questionnaire',  description: 'Spelling: questionaire → questionnaire', category: 'spelling' },
  { pattern: /\brecieve\b/gi,        replacement: 'receive',        description: 'Spelling: recieve → receive', category: 'spelling' },
  { pattern: /\breccomend\b/gi,      replacement: 'recommend',      description: 'Spelling: reccomend → recommend', category: 'spelling' },
  { pattern: /\brecomend\b/gi,       replacement: 'recommend',      description: 'Spelling: recomend → recommend', category: 'spelling' },
  { pattern: /\breferance\b/gi,      replacement: 'reference',      description: 'Spelling: referance → reference', category: 'spelling' },
  { pattern: /\brefered\b/gi,        replacement: 'referred',       description: 'Spelling: refered → referred', category: 'spelling' },
  { pattern: /\brelegion\b/gi,       replacement: 'religion',       description: 'Spelling: relegion → religion', category: 'spelling' },
  { pattern: /\bremember\b/gi,       replacement: 'remember',       description: 'Spelling: remember (verify)', category: 'spelling' },
  { pattern: /\brembember\b/gi,      replacement: 'remember',       description: 'Spelling: rembember → remember', category: 'spelling' },
  { pattern: /\brepetative\b/gi,     replacement: 'repetitive',     description: 'Spelling: repetative → repetitive', category: 'spelling' },
  { pattern: /\bresistance\b/gi,     replacement: 'resistance',     description: 'Spelling: resistance (verify)', category: 'spelling' },
  { pattern: /\bresistence\b/gi,     replacement: 'resistance',     description: 'Spelling: resistence → resistance', category: 'spelling' },
  { pattern: /\bresponsability\b/gi, replacement: 'responsibility', description: 'Spelling: responsability → responsibility', category: 'spelling' },
  { pattern: /\brhythm\b/gi,         replacement: 'rhythm',         description: 'Spelling: rhythm (verify)', category: 'spelling' },
  { pattern: /\brythm\b/gi,          replacement: 'rhythm',         description: 'Spelling: rythm → rhythm', category: 'spelling' },
  { pattern: /\brythym\b/gi,         replacement: 'rhythm',         description: 'Spelling: rythym → rhythm', category: 'spelling' },
  { pattern: /\bsacreligious\b/gi,   replacement: 'sacrilegious',   description: 'Spelling: sacreligious → sacrilegious', category: 'spelling' },
  { pattern: /\bsargent\b/gi,        replacement: 'sergeant',       description: 'Spelling: sargent → sergeant', category: 'spelling' },
  { pattern: /\bseparate\b/gi,       replacement: 'separate',       description: 'Spelling: separate (verify)', category: 'spelling' },
  { pattern: /\bseperate\b/gi,       replacement: 'separate',       description: 'Spelling: seperate → separate', category: 'spelling' },
  { pattern: /\bsimalar\b/gi,        replacement: 'similar',        description: 'Spelling: simalar → similar', category: 'spelling' },
  { pattern: /\bsimiler\b/gi,        replacement: 'similar',        description: 'Spelling: similer → similar', category: 'spelling' },
  { pattern: /\bsouvenir\b/gi,       replacement: 'souvenir',       description: 'Spelling: souvenir (verify)', category: 'spelling' },
  { pattern: /\bsouvenier\b/gi,      replacement: 'souvenir',       description: 'Spelling: souvenier → souvenir', category: 'spelling' },
  { pattern: /\bsucceed\b/gi,        replacement: 'succeed',        description: 'Spelling: succeed (verify)', category: 'spelling' },
  { pattern: /\bsucceed\b/gi,        replacement: 'succeed',        description: 'Spelling: succeed (verify)', category: 'spelling' },
  { pattern: /\bsuceeed\b/gi,        replacement: 'succeed',        description: 'Spelling: suceeed → succeed', category: 'spelling' },
  { pattern: /\bsucsess\b/gi,        replacement: 'success',        description: 'Spelling: sucsess → success', category: 'spelling' },
  { pattern: /\bsuprise\b/gi,        replacement: 'surprise',       description: 'Spelling: suprise → surprise', category: 'spelling' },
  { pattern: /\bsurpirze\b/gi,       replacement: 'surprise',       description: 'Spelling: surprize → surprise', category: 'spelling' },
  { pattern: /\btemperature\b/gi,    replacement: 'temperature',    description: 'Spelling: temperature (verify)', category: 'spelling' },
  { pattern: /\btemeprature\b/gi,    replacement: 'temperature',    description: 'Spelling: temeprature → temperature', category: 'spelling' },
  { pattern: /\bthreshold\b/gi,      replacement: 'threshold',      description: 'Spelling: threshold (verify)', category: 'spelling' },
  { pattern: /\bthreshhold\b/gi,     replacement: 'threshold',      description: 'Spelling: threshhold → threshold', category: 'spelling' },
  { pattern: /\btommorow\b/gi,       replacement: 'tomorrow',       description: 'Spelling: tommorow → tomorrow', category: 'spelling' },
  { pattern: /\btomorow\b/gi,        replacement: 'tomorrow',       description: 'Spelling: tomorow → tomorrow', category: 'spelling' },
  { pattern: /\btounge\b/gi,         replacement: 'tongue',         description: 'Spelling: tounge → tongue', category: 'spelling' },
  { pattern: /\btruely\b/gi,         replacement: 'truly',          description: 'Spelling: truely → truly', category: 'spelling' },
  { pattern: /\btyranosaur\b/gi,     replacement: 'tyrannosaur',    description: 'Spelling: tyranosaur → tyrannosaur', category: 'spelling' },
  { pattern: /\buntill\b/gi,         replacement: 'until',          description: 'Spelling: untill → until', category: 'spelling' },
  { pattern: /\busefull\b/gi,        replacement: 'useful',         description: 'Spelling: usefull → useful', category: 'spelling' },
  { pattern: /\bvaccum\b/gi,         replacement: 'vacuum',         description: 'Spelling: vaccum → vacuum', category: 'spelling' },
  { pattern: /\bvacume\b/gi,         replacement: 'vacuum',         description: 'Spelling: vacume → vacuum', category: 'spelling' },
  { pattern: /\bvicious\b/gi,        replacement: 'vicious',        description: 'Spelling: vicious (verify)', category: 'spelling' },
  { pattern: /\bviscious\b/gi,       replacement: 'vicious',        description: 'Spelling: viscious → vicious', category: 'spelling' },
  { pattern: /\bvisious\b/gi,        replacement: 'vicious',        description: 'Spelling: visious → vicious', category: 'spelling' },
  { pattern: /\bvolunatry\b/gi,      replacement: 'voluntary',      description: 'Spelling: volunatry → voluntary', category: 'spelling' },
  { pattern: /\bvolunteer\b/gi,      replacement: 'volunteer',      description: 'Spelling: volunteer (verify)', category: 'spelling' },
  { pattern: /\bvolenteer\b/gi,      replacement: 'volunteer',      description: 'Spelling: volenteer → volunteer', category: 'spelling' },
  { pattern: /\bwather\b/gi,         replacement: 'weather',        description: 'Spelling: wather → weather', category: 'spelling' },
  { pattern: /\bwether\b/gi,         replacement: 'weather',        description: 'Spelling: wether → weather', category: 'spelling' },
  { pattern: /\bwhether\b/gi,        replacement: 'whether',        description: 'Spelling: whether (verify)', category: 'spelling' },
  { pattern: /\bwithhold\b/gi,       replacement: 'withhold',       description: 'Spelling: withhold (verify)', category: 'spelling' },
  { pattern: /\bwithold\b/gi,        replacement: 'withhold',       description: 'Spelling: withold → withhold', category: 'spelling' },
  { pattern: /\bwierd\b/gi,          replacement: 'weird',          description: 'Spelling: wierd → weird', category: 'spelling' },
  { pattern: /\bwritting\b/gi,       replacement: 'writing',        description: 'Spelling: writting → writing', category: 'spelling' },
  { pattern: /\byeild\b/gi,          replacement: 'yield',          description: 'Spelling: yeild → yield', category: 'spelling' },
];

// ── Grammar Law 12: British/American English Normalisation ────────────────────
// (US English as default — converts British spellings)

const BRITISH_TO_AMERICAN = [
  { pattern: /\bcolour\b/g,    replacement: 'color',    description: 'colour → color', category: 'americanise' },
  { pattern: /\bcolours\b/g,   replacement: 'colors',   description: 'colours → colors', category: 'americanise' },
  { pattern: /\bcoloured\b/g,  replacement: 'colored',  description: 'coloured → colored', category: 'americanise' },
  { pattern: /\bfavourite\b/g, replacement: 'favorite', description: 'favourite → favorite', category: 'americanise' },
  { pattern: /\bhonour\b/g,    replacement: 'honor',    description: 'honour → honor', category: 'americanise' },
  { pattern: /\bhonours\b/g,   replacement: 'honors',   description: 'honours → honors', category: 'americanise' },
  { pattern: /\bhumour\b/g,    replacement: 'humor',    description: 'humour → humor', category: 'americanise' },
  { pattern: /\blabour\b/g,    replacement: 'labor',    description: 'labour → labor', category: 'americanise' },
  { pattern: /\bneighbour\b/g, replacement: 'neighbor', description: 'neighbour → neighbor', category: 'americanise' },
  { pattern: /\borganise\b/g,  replacement: 'organize', description: 'organise → organize', category: 'americanise' },
  { pattern: /\brealise\b/g,   replacement: 'realize',  description: 'realise → realize', category: 'americanise' },
  { pattern: /\brecognise\b/g, replacement: 'recognize',description: 'recognise → recognize', category: 'americanise' },
  { pattern: /\bcentre\b/g,    replacement: 'center',   description: 'centre → center', category: 'americanise' },
  { pattern: /\btheatre\b/g,   replacement: 'theater',  description: 'theatre → theater', category: 'americanise' },
  { pattern: /\bprogramme\b/g, replacement: 'program',  description: 'programme → program', category: 'americanise' },
  { pattern: /\bcatalogue\b/g, replacement: 'catalog',  description: 'catalogue → catalog', category: 'americanise' },
  { pattern: /\bdialogue\b/g,  replacement: 'dialog',   description: 'dialogue → dialog', category: 'americanise' },
  { pattern: /\banalyse\b/g,   replacement: 'analyze',  description: 'analyse → analyze', category: 'americanise' },
  { pattern: /\bpractise\b/g,  replacement: 'practice', description: 'practise → practice', category: 'americanise' },
  { pattern: /\bdefence\b/g,   replacement: 'defense',  description: 'defence → defense', category: 'americanise' },
  { pattern: /\boffence\b/g,   replacement: 'offense',  description: 'offence → offense', category: 'americanise' },
  { pattern: /\blicence\b/g,   replacement: 'license',  description: 'licence → license', category: 'americanise' },
  { pattern: /\btravelled\b/g, replacement: 'traveled', description: 'travelled → traveled', category: 'americanise' },
  { pattern: /\btravelling\b/g,replacement: 'traveling',description: 'travelling → traveling', category: 'americanise' },
  { pattern: /\bcancelled\b/g, replacement: 'canceled', description: 'cancelled → canceled', category: 'americanise' },
  { pattern: /\bcancelling\b/g,replacement: 'canceling',description: 'cancelling → canceling', category: 'americanise' },
  { pattern: /\bmodelling\b/g, replacement: 'modeling', description: 'modelling → modeling', category: 'americanise' },
  { pattern: /\bfulfil\b/g,    replacement: 'fulfill',  description: 'fulfil → fulfill', category: 'americanise' },
  { pattern: /\bfulfilment\b/g,replacement: 'fulfillment',description: 'fulfilment → fulfillment', category: 'americanise' },
  { pattern: /\bengulf\b/g,    replacement: 'engulf',   description: 'engulf (verify)', category: 'americanise' },
  { pattern: /\bgruelling\b/g, replacement: 'grueling', description: 'gruelling → grueling', category: 'americanise' },
  { pattern: /\bjudgement\b/g, replacement: 'judgment', description: 'judgement → judgment', category: 'americanise' },
];

module.exports = { run, applyAllRules, conjugate3rdPerson, detectTense };
