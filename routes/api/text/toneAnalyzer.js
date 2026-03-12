/**
 * ToolHub AI — Tone Analyzer
 * File: routes/api/text/toneAnalyzer.js
 *
 * Analyzes writing tone: sentiment, formality, emotion,
 * and communication style — fully deterministic, no AI.
 */

'use strict';

// ── Sentiment Lexicon ─────────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  'good','great','excellent','amazing','wonderful','fantastic','brilliant','outstanding',
  'superb','perfect','beautiful','love','enjoy','happy','glad','pleased','delighted',
  'thrilled','excited','positive','helpful','useful','valuable','effective','successful',
  'strong','impressive','remarkable','exceptional','magnificent','splendid','terrific',
  'awesome','incredible','fabulous','lovely','nice','pleasant','easy','simple','clear',
  'honest','trust','benefit','advantage','gain','improve','growth','progress','achieve',
  'accomplish','win','succeed','solve','fix','resolve','support','help','assist','enable',
  'encourage','inspire','motivate','empower','boost','enhance','elevate','build','create',
  'innovate','advance','thrive','flourish','celebrate','reward','appreciate','admire',
  'respect','agree','accept','welcome','embrace','optimistic','confident','hopeful',
  'energetic','productive','efficient','reliable','consistent','stable','safe','secure',
]);

const NEGATIVE_WORDS = new Set([
  'bad','terrible','awful','horrible','dreadful','poor','weak','fail','failure','wrong',
  'error','mistake','problem','issue','difficult','hard','complex','confusing','unclear',
  'risky','danger','threat','harm','damage','hurt','lose','loss','decrease','drop','fall',
  'decline','struggle','challenge','obstacle','barrier','block','prevent','stop','reject',
  'deny','refuse','oppose','conflict','dispute','argue','criticize','blame','fault','toxic',
  'negative','harmful','dangerous','serious','severe','extreme','critical','urgent','crisis',
  'concern','worry','fear','stress','anxiety','frustrate','disappoint','upset','angry',
  'annoyed','confused','doubt','uncertain','unsure','unreliable','unstable','expensive',
  'costly','waste','inefficient','ineffective','outdated','broken','flawed','corrupt',
]);

const FORMAL_INDICATORS = new Set([
  'therefore','furthermore','moreover','consequently','nevertheless','notwithstanding',
  'pursuant','hereby','aforementioned','hereinafter','whereas','heretofore','henceforth',
  'respectively','accordingly','subsequently','aforementioned','vis-à-vis','per','viz',
  'i.e.','e.g.','et al.','ibid.','op.cit.','inter alia','in accordance','with reference',
  'with respect','in light of','in view of','by virtue of','in order to','with regard',
]);

const INFORMAL_INDICATORS = new Set([
  "don't","can't","won't","isn't","aren't","wasn't","weren't","didn't","doesn't","hasn't",
  "haven't","hadn't","shouldn't","couldn't","wouldn't","I'm","I've","I'll","I'd","we're",
  "they're","you're","he's","she's","that's","it's","there's","gonna","wanna","kinda',",
  "sorta","ya","yeah","yep","nope","hey","ok","okay","cool","awesome","stuff","things",
  "lots","tons","super","pretty","really","very","so","get","got","like","just",
]);

const EMOTION_LEXICON = {
  joy:       ['happy','joy','delight','pleased','excited','thrilled','cheerful','elated'],
  sadness:   ['sad','unhappy','depressed','disappointed','upset','grief','sorrow','mourn'],
  anger:     ['angry','furious','rage','mad','annoyed','frustrated','irritated','outraged'],
  fear:      ['afraid','fear','scared','anxious','worried','nervous','terrified','dread'],
  surprise:  ['surprised','amazed','shocked','astonished','stunned','unexpected','sudden'],
  disgust:   ['disgusting','horrible','revolting','awful','gross','unpleasant','nasty'],
  trust:     ['trust','reliable','honest','confident','sure','certain','believe','faith'],
  anticipation:['hope','expect','look forward','anticipate','await','soon','upcoming'],
};

const ASSERTIVE_WORDS = new Set([
  'must','will','shall','need','require','demand','insist','assert','clearly','definitely',
  'absolutely','certainly','always','never','every','all','none','important','critical','vital',
]);

const HEDGING_WORDS = new Set([
  'might','may','could','perhaps','possibly','probably','likely','suggest','appear','seem',
  'tend','sometimes','often','generally','usually','typically','around','approximately',
  'roughly','somewhat','rather','quite','fairly','relatively','in some cases',
]);

// ── Analysis Engine ───────────────────────────────────────────────────────────

function tokenizeWords(text) {
  return text.toLowerCase().match(/\b[a-z']+\b/g) || [];
}

function analyzeSentiment(words) {
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return { label: 'Neutral', score: 0, pos, neg };
  const score = ((pos - neg) / total) * 100;
  let label = 'Neutral';
  if (score > 60)  label = 'Very Positive';
  else if (score > 20)  label = 'Positive';
  else if (score > -20) label = 'Neutral';
  else if (score > -60) label = 'Negative';
  else label = 'Very Negative';
  return { label, score: Math.round(score), pos, neg };
}

function analyzeFormality(text, words) {
  const contractionsCount = (text.match(/\b\w+'\w+\b/g) || []).length;
  let formalCount = 0, informalCount = 0;
  for (const w of words) {
    if (FORMAL_INDICATORS.has(w)) formalCount++;
    if (INFORMAL_INDICATORS.has(w)) informalCount++;
  }
  informalCount += contractionsCount;
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / (words.length || 1);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentLen = words.length / (sentences.length || 1);

  let score = 50;
  score += formalCount * 8;
  score -= informalCount * 5;
  score += (avgWordLen - 4) * 6;
  score += (avgSentLen - 10) * 1.5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = 'Neutral';
  if (score >= 80) label = 'Very Formal';
  else if (score >= 60) label = 'Formal';
  else if (score >= 40) label = 'Semi-Formal';
  else if (score >= 20) label = 'Informal';
  else label = 'Very Casual';

  return { label, score, formalCount, informalCount };
}

function analyzeEmotions(words) {
  const counts = {};
  let total = 0;
  for (const [emotion, vocab] of Object.entries(EMOTION_LEXICON)) {
    const c = vocab.filter(v => words.some(w => w.includes(v))).length;
    counts[emotion] = c;
    total += c;
  }
  if (total === 0) return { dominant: 'None detected', breakdown: counts };
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][1] > 0 ? sorted[0][0].charAt(0).toUpperCase() + sorted[0][0].slice(1) : 'None detected';
  return { dominant, breakdown: counts };
}

function analyzeAssertion(words) {
  let assertive = 0, hedging = 0;
  for (const w of words) {
    if (ASSERTIVE_WORDS.has(w)) assertive++;
    if (HEDGING_WORDS.has(w)) hedging++;
  }
  let label = 'Balanced';
  const ratio = (assertive + hedging) > 0 ? assertive / (assertive + hedging) : 0.5;
  if (ratio > 0.75) label = 'Assertive';
  else if (ratio > 0.55) label = 'Somewhat Assertive';
  else if (ratio < 0.25) label = 'Cautious / Hedging';
  else if (ratio < 0.45) label = 'Somewhat Cautious';
  else label = 'Balanced';
  return { label, assertive, hedging };
}

function analyzePace(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const words     = text.split(/\s+/).filter(Boolean);
  const avgLen    = words.length / (sentences.length || 1);
  if (avgLen < 10) return 'Fast-paced (short sentences)';
  if (avgLen < 18) return 'Moderate pace';
  if (avgLen < 28) return 'Slow, detailed';
  return 'Dense / complex';
}

function run(input) {
  const text = (input || '').trim();
  if (!text) return { error: 'Please enter some text to analyze.' };
  if (text.length > 10000) return { error: 'Text too long. Maximum 10,000 characters.' };

  const words     = tokenizeWords(text);
  const sentiment = analyzeSentiment(words);
  const formality = analyzeFormality(text, words);
  const emotions  = analyzeEmotions(words);
  const assertion = analyzeAssertion(words);
  const pace      = analyzePace(text);

  const sentences  = text.split(/[.!?]+/).filter(s => s.trim());
  const wordCount  = words.length;
  const uniqueWords = new Set(words).size;
  const lexicalDiversity = wordCount > 0 ? Math.round((uniqueWords / wordCount) * 100) : 0;

  // Overall tone summary
  const tones = [];
  if (sentiment.label.includes('Positive')) tones.push('Optimistic');
  if (sentiment.label.includes('Negative')) tones.push('Critical');
  if (formality.label.includes('Formal'))   tones.push('Professional');
  if (formality.label.includes('Casual') || formality.label.includes('Informal')) tones.push('Conversational');
  if (assertion.label.includes('Assertive')) tones.push('Confident');
  if (assertion.label.includes('Cautious'))  tones.push('Diplomatic');
  if (tones.length === 0) tones.push('Neutral');

  return {
    overallTone:      tones.join(', '),
    sentiment,
    formality,
    emotions,
    assertion,
    pace,
    stats: {
      sentences:       sentences.length,
      words:           wordCount,
      uniqueWords,
      lexicalDiversity,
      avgSentenceLen:  Math.round((wordCount / (sentences.length || 1)) * 10) / 10,
    },
  };
}

module.exports = { run };
