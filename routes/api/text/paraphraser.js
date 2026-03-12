/**
 * ToolHub AI — Paraphraser Tool
 * File: routes/api/text/paraphraser.js
 *
 * Rewrites text using structural changes and synonym replacement
 * while preserving meaning. Generates up to 3 variations.
 * Zero AI/API usage — all rules are deterministic.
 *
 * Rules applied (Rules 1–50, shared with humanizer where noted):
 *   Rule  1 — Sentence Segmentation           (shared: segmentSentences)
 *   Rule  2 — Tokenization                    (shared: tokenize)
 *   Rule  3 — Preserve Meaning
 *   Rule  4 — Grammar Integrity               (fixGrammar)
 *   Rule  5 — Output Must Differ
 *   Rule  6 — Passive to Active               (shared: passiveToActive)
 *   Rule  7 — Active to Passive Conversion
 *   Rule  8 — Move Time Phrases               (shared: moveTimePhraseToFront)
 *   Rule  9 — Move Location Phrases           (shared: moveLocationPhrase)
 *   Rule 10 — Split Long Sentences            (shared via humanizer)
 *   Rule 11 — Merge Short Sentences           (shared via humanizer)
 *   Rule 12 — Synonym Replacement (Adjectives)(substituteSynonyms)
 *   Rule 13 — Synonym Replacement (Verbs)     (substituteSynonyms)
 *   Rule 14 — Synonym Replacement (Nouns)     (substituteSynonyms)
 *   Rule 15 — Avoid Replacing Proper Nouns    (SYNONYM_STOP + heuristic)
 *   Rule 16 — Avoid Replacing Technical Terms (SYNONYM_STOP)
 *   Rule 17 — Contraction Replacement         (shared via humanizer)
 *   Rule 18 — Formal Expansion                (expandContractions)
 *   Rule 19 — Remove Redundant Words          (shared: removeRedundantWords)
 *   Rule 20 — Remove Filler Words             (shared: removeUnnecessaryAdverbs)
 *   Rule 21 — Add Transition Words            (shared via humanizer)
 *   Rule 22 — Clause Reordering               (switchClauseOrder)
 *   Rule 23 — Sentence Combination            (combineSentencePair)
 *   Rule 24 — Sentence Simplification         (shared: simplifyNestedClauses)
 *   Rule 25 — Phrase Replacement              (shared: reduceWordiness)
 *   Rule 26 — Rephrase Questions              (shared: rephraseQuestion)
 *   Rule 27 — Change Sentence Openings        (shared: changeSentenceOpening)
 *   Rule 28 — Add Introductory Phrases        (introductory phrases in generateVariation)
 *   Rule 29 — Adjust Word Order               (shared: adjustWordOrder)
 *   Rule 30 — Pronoun Replacement             (shared via removeRepetition in humanizer)
 *   Rule 31 — Expand Short Expressions        (shared: expandShortExpressions)
 *   Rule 32 — Reduce Wordiness                (shared: reduceWordiness)
 *   Rule 33 — Replace Repeated Verbs          (shared: replaceRepeatedVerbs)
 *   Rule 34 — Vary Sentence Length            (applySentenceLengthVariation)
 *   Rule 35 — Avoid Identical Sentence Patterns (variantIndex staggering)
 *   Rule 36 — Add Mild Descriptive Words      (shared: addMildDescriptors)
 *   Rule 37 — Remove Unnecessary Adverbs      (shared: removeUnnecessaryAdverbs)
 *   Rule 38 — Normalize Spacing               (fixGrammar)
 *   Rule 39 — Capitalization Correction       (fixGrammar)
 *   Rule 40 — Punctuation Correction          (fixGrammar)
 *   Rule 41 — Subject–Verb Agreement          (shared: fixSubjectVerbAgreement)
 *   Rule 42 — Verb Tense Consistency          (shared: fixTenseConsistency)
 *   Rule 43 — Remove Duplicate Sentences      (shared via removeRepetition)
 *   Rule 44 — Simplify Nested Clauses         (shared: simplifyNestedClauses)
 *   Rule 45 — Insert Linking Words            (applySentenceCombination)
 *   Rule 46 — Summarization Compression       (n/a — paraphraser preserves length)
 *   Rule 47 — Keyword Preservation            (SYNONYM_STOP protects key terms)
 *   Rule 48 — Sentence Importance Scoring     (n/a — paraphraser rewrites all)
 *   Rule 49 — Readability Adjustment          (shared: adjustReadability)
 *   Rule 50 — Final Validation
 */

'use strict';

const {
  segmentSentences,
  tokenize,
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
} = require('./humanizer');

// ── Rules 12–16: Synonym Replacement (Adj/Verbs/Nouns), Preserve Proper Nouns & Technical Terms ─
// Each entry: word → [alternatives]  (variants used round-robin per sentence)
// Proper nouns and technical terms are intentionally excluded.

const SYNONYMS = {
  // Verbs
  show:        ['demonstrate', 'reveal', 'highlight', 'illustrate', 'display'],
  shows:       ['demonstrates', 'reveals', 'highlights', 'illustrates', 'displays'],
  showed:      ['demonstrated', 'revealed', 'highlighted', 'illustrated', 'displayed'],
  make:        ['create', 'build', 'produce', 'craft', 'develop'],
  makes:       ['creates', 'builds', 'produces', 'crafts', 'develops'],
  made:        ['created', 'built', 'produced', 'crafted', 'developed'],
  get:         ['obtain', 'acquire', 'receive', 'gain', 'secure'],
  gets:        ['obtains', 'acquires', 'receives', 'gains', 'secures'],
  got:         ['obtained', 'acquired', 'received', 'gained', 'secured'],
  use:         ['apply', 'employ', 'work with', 'draw on', 'leverage'],
  uses:        ['applies', 'employs', 'works with', 'draws on', 'leverages'],
  used:        ['applied', 'employed', 'worked with', 'drew on', 'leveraged'],
  need:        ['require', 'call for', 'rely on', 'depend on'],
  needs:       ['requires', 'calls for', 'relies on', 'depends on'],
  needed:      ['required', 'called for', 'relied on', 'depended on'],
  think:       ['believe', 'feel', 'consider', 'reckon', 'view'],
  thinks:      ['believes', 'feels', 'considers', 'reckons', 'views'],
  thought:     ['believed', 'felt', 'considered', 'reckoned', 'viewed'],
  know:        ['understand', 'realize', 'recognize', 'see', 'appreciate'],
  knows:       ['understands', 'realizes', 'recognizes', 'sees', 'appreciates'],
  knew:        ['understood', 'realized', 'recognized', 'saw', 'appreciated'],
  help:        ['support', 'assist', 'aid', 'back', 'enable'],
  helps:       ['supports', 'assists', 'aids', 'backs', 'enables'],
  helped:      ['supported', 'assisted', 'aided', 'backed', 'enabled'],
  start:       ['begin', 'launch', 'initiate', 'kick off', 'open'],
  starts:      ['begins', 'launches', 'initiates', 'kicks off', 'opens'],
  started:     ['began', 'launched', 'initiated', 'kicked off', 'opened'],
  end:         ['finish', 'conclude', 'complete', 'wrap up', 'close'],
  ends:        ['finishes', 'concludes', 'completes', 'wraps up', 'closes'],
  ended:       ['finished', 'concluded', 'completed', 'wrapped up', 'closed'],
  say:         ['mention', 'state', 'note', 'point out', 'indicate'],
  says:        ['mentions', 'states', 'notes', 'points out', 'indicates'],
  said:        ['mentioned', 'stated', 'noted', 'pointed out', 'indicated'],
  find:        ['discover', 'uncover', 'come across', 'identify', 'detect'],
  finds:       ['discovers', 'uncovers', 'comes across', 'identifies', 'detects'],
  found:       ['discovered', 'uncovered', 'came across', 'identified', 'detected'],
  give:        ['offer', 'provide', 'supply', 'deliver', 'hand over'],
  gives:       ['offers', 'provides', 'supplies', 'delivers', 'hands over'],
  gave:        ['offered', 'provided', 'supplied', 'delivered', 'handed over'],
  work:        ['function', 'operate', 'run', 'perform', 'act'],
  works:       ['functions', 'operates', 'runs', 'performs', 'acts'],
  worked:      ['functioned', 'operated', 'ran', 'performed', 'acted'],
  keep:        ['maintain', 'preserve', 'retain', 'hold on to', 'sustain'],
  keeps:       ['maintains', 'preserves', 'retains', 'holds on to', 'sustains'],
  kept:        ['maintained', 'preserved', 'retained', 'held on to', 'sustained'],
  change:      ['alter', 'shift', 'adjust', 'transform', 'modify'],
  changes:     ['alters', 'shifts', 'adjusts', 'transforms', 'modifies'],
  changed:     ['altered', 'shifted', 'adjusted', 'transformed', 'modified'],
  see:         ['notice', 'spot', 'observe', 'perceive', 'witness'],
  sees:        ['notices', 'spots', 'observes', 'perceives', 'witnesses'],
  saw:         ['noticed', 'spotted', 'observed', 'perceived', 'witnessed'],
  try:         ['attempt', 'aim', 'strive', 'seek', 'endeavour'],
  tries:       ['attempts', 'aims', 'strives', 'seeks', 'endeavours'],
  tried:       ['attempted', 'aimed', 'strove', 'sought', 'endeavoured'],
  allow:       ['permit', 'enable', 'let', 'authorize', 'give access to'],
  allows:      ['permits', 'enables', 'lets', 'authorizes', 'gives access to'],
  allowed:     ['permitted', 'enabled', 'let', 'authorized', 'gave access to'],
  become:      ['grow into', 'turn into', 'emerge as', 'develop into'],
  becomes:     ['grows into', 'turns into', 'emerges as', 'develops into'],
  became:      ['grew into', 'turned into', 'emerged as', 'developed into'],
  include:     ['contain', 'encompass', 'cover', 'feature', 'incorporate'],
  includes:    ['contains', 'encompasses', 'covers', 'features', 'incorporates'],
  included:    ['contained', 'encompassed', 'covered', 'featured', 'incorporated'],
  improve:     ['enhance', 'boost', 'upgrade', 'refine', 'advance'],
  improves:    ['enhances', 'boosts', 'upgrades', 'refines', 'advances'],
  improved:    ['enhanced', 'boosted', 'upgraded', 'refined', 'advanced'],
  increase:    ['grow', 'rise', 'expand', 'climb', 'go up'],
  increases:   ['grows', 'rises', 'expands', 'climbs', 'goes up'],
  increased:   ['grew', 'rose', 'expanded', 'climbed', 'went up'],
  reduce:      ['cut', 'lower', 'decrease', 'trim', 'shrink'],
  reduces:     ['cuts', 'lowers', 'decreases', 'trims', 'shrinks'],
  reduced:     ['cut', 'lowered', 'decreased', 'trimmed', 'shrank'],
  move:        ['shift', 'transfer', 'relocate', 'migrate'],
  moves:       ['shifts', 'transfers', 'relocates', 'migrates'],
  moved:       ['shifted', 'transferred', 'relocated', 'migrated'],

  // Nouns
  problem:     ['issue', 'challenge', 'hurdle', 'concern', 'obstacle'],
  problems:    ['issues', 'challenges', 'hurdles', 'concerns', 'obstacles'],
  way:         ['approach', 'method', 'strategy', 'path', 'technique'],
  ways:        ['approaches', 'methods', 'strategies', 'paths', 'techniques'],
  idea:        ['concept', 'notion', 'thought', 'plan', 'proposal'],
  ideas:       ['concepts', 'notions', 'thoughts', 'plans', 'proposals'],
  goal:        ['aim', 'objective', 'target', 'purpose', 'mission'],
  goals:       ['aims', 'objectives', 'targets', 'purposes', 'missions'],
  result:      ['outcome', 'effect', 'impact', 'conclusion', 'consequence'],
  results:     ['outcomes', 'effects', 'impacts', 'conclusions', 'consequences'],
  people:      ['individuals', 'folks', 'users', 'others', 'persons'],
  group:       ['team', 'set', 'collection', 'cluster', 'gathering'],
  groups:      ['teams', 'sets', 'collections', 'clusters', 'gatherings'],
  part:        ['section', 'portion', 'component', 'element', 'aspect'],
  parts:       ['sections', 'portions', 'components', 'elements', 'aspects'],
  time:        ['period', 'moment', 'point', 'stage', 'phase'],
  place:       ['location', 'spot', 'site', 'area', 'position'],
  places:      ['locations', 'spots', 'sites', 'areas', 'positions'],
  job:         ['role', 'task', 'position', 'responsibility', 'duty'],
  jobs:        ['roles', 'tasks', 'positions', 'responsibilities', 'duties'],
  step:        ['stage', 'phase', 'action', 'move', 'procedure'],
  steps:       ['stages', 'phases', 'actions', 'moves', 'procedures'],
  thing:       ['item', 'aspect', 'element', 'factor', 'matter'],
  things:      ['items', 'aspects', 'elements', 'factors', 'matters'],
  area:        ['field', 'domain', 'sphere', 'zone', 'region'],
  areas:       ['fields', 'domains', 'spheres', 'zones', 'regions'],
  point:       ['detail', 'aspect', 'factor', 'element', 'note'],
  points:      ['details', 'aspects', 'factors', 'elements', 'notes'],

  // Adjectives
  big:         ['large', 'major', 'substantial', 'significant', 'considerable'],
  small:       ['minor', 'modest', 'limited', 'slight', 'minimal'],
  good:        ['solid', 'strong', 'effective', 'great', 'positive'],
  bad:         ['poor', 'weak', 'problematic', 'flawed', 'inadequate'],
  new:         ['fresh', 'recent', 'modern', 'updated', 'current'],
  old:         ['outdated', 'earlier', 'previous', 'traditional', 'former'],
  fast:        ['quick', 'rapid', 'speedy', 'swift', 'prompt'],
  slow:        ['gradual', 'steady', 'measured', 'unhurried', 'deliberate'],
  important:   ['key', 'crucial', 'vital', 'essential', 'significant'],
  clear:       ['obvious', 'evident', 'plain', 'straightforward', 'apparent'],
  hard:        ['tough', 'challenging', 'demanding', 'difficult', 'arduous'],
  easy:        ['simple', 'straightforward', 'effortless', 'uncomplicated'],
  different:   ['distinct', 'varied', 'alternative', 'diverse', 'unique'],
  similar:     ['alike', 'comparable', 'related', 'equivalent', 'corresponding'],
  common:      ['typical', 'standard', 'regular', 'frequent', 'widespread'],
  possible:    ['feasible', 'viable', 'achievable', 'doable', 'realistic'],
  specific:    ['particular', 'precise', 'exact', 'defined', 'detailed'],
  various:     ['diverse', 'different', 'multiple', 'several', 'assorted'],
  certain:     ['specific', 'particular', 'definite', 'sure', 'guaranteed'],
  main:        ['primary', 'key', 'central', 'principal', 'core'],
  full:        ['complete', 'entire', 'total', 'whole', 'comprehensive'],

  // Adverbs
  often:       ['frequently', 'regularly', 'commonly', 'routinely', 'repeatedly'],
  always:      ['consistently', 'invariably', 'constantly', 'perpetually', 'continually'],
  never:       ['not at all', 'not once', 'at no point', 'under no circumstances'],
  usually:     ['typically', 'generally', 'normally', 'as a rule', 'most of the time'],
  quickly:     ['rapidly', 'swiftly', 'promptly', 'briskly', 'speedily'],
  slowly:      ['gradually', 'steadily', 'carefully', 'deliberately', 'at a steady pace'],
  easily:      ['readily', 'smoothly', 'effortlessly', 'without difficulty'],
  really:      ['truly', 'genuinely', 'actually', 'quite', 'particularly'],
  very:        ['quite', 'especially', 'particularly', 'highly', 'extremely'],
  also:        ['as well', 'too', 'likewise', 'in addition', 'furthermore'],
  just:        ['simply', 'merely', 'only', 'purely'],
  clearly:     ['evidently', 'obviously', 'plainly', 'apparently', 'visibly'],
  simply:      ['just', 'merely', 'only', 'straightforwardly'],
  currently:   ['at present', 'right now', 'at this time', 'today', 'as of now'],
  recently:    ['lately', 'not long ago', 'in recent times', 'just recently'],

  // ── Prompt Rule 42: Additional synonyms ──────────────────────────────────
  want:        ['hope for', 'aim for', 'seek', 'desire', 'wish for'],
  wants:       ['hopes for', 'aims for', 'seeks', 'desires', 'wishes for'],
  wanted:      ['hoped for', 'aimed for', 'sought', 'desired', 'wished for'],
  look:        ['appear', 'seem', 'gaze', 'glance', 'view'],
  looks:       ['appears', 'seems', 'gazes', 'glances', 'views'],
  looked:      ['appeared', 'seemed', 'gazed', 'glanced', 'viewed'],
  speak:       ['talk', 'communicate', 'converse', 'discuss', 'address'],
  speaks:      ['talks', 'communicates', 'converses', 'discusses', 'addresses'],
  spoke:       ['talked', 'communicated', 'conversed', 'discussed', 'addressed'],
  write:       ['draft', 'compose', 'author', 'pen', 'produce'],
  writes:      ['drafts', 'composes', 'authors', 'pens', 'produces'],
  wrote:       ['drafted', 'composed', 'authored', 'penned', 'produced'],
  read:        ['review', 'study', 'examine', 'go through', 'look over'],
  reads:       ['reviews', 'studies', 'examines', 'goes through', 'looks over'],
  // Additional adjective synonyms from Rule 42
  large:       ['big', 'substantial', 'significant', 'major', 'considerable'],
  great:       ['excellent', 'outstanding', 'remarkable', 'exceptional', 'fine'],
  strong:      ['powerful', 'robust', 'solid', 'firm', 'capable'],
  long:        ['extended', 'lengthy', 'prolonged', 'sustained', 'lasting'],
  high:        ['elevated', 'significant', 'substantial', 'considerable', 'notable'],
  low:         ['limited', 'reduced', 'minimal', 'modest', 'slight'],
  real:        ['actual', 'genuine', 'true', 'authentic', 'concrete'],
  right:       ['correct', 'accurate', 'proper', 'suitable', 'appropriate'],
  wrong:       ['incorrect', 'mistaken', 'flawed', 'inaccurate', 'unsuitable'],
  // Additional noun synonyms from Rule 42
  issue:       ['problem', 'challenge', 'concern', 'difficulty', 'matter'],
  issues:      ['problems', 'challenges', 'concerns', 'difficulties', 'matters'],
  approach:    ['method', 'strategy', 'way', 'technique', 'path'],
  approaches:  ['methods', 'strategies', 'ways', 'techniques', 'paths'],
  concept:     ['idea', 'notion', 'thought', 'principle', 'theory'],
  concepts:    ['ideas', 'notions', 'thoughts', 'principles', 'theories'],
  aim:         ['goal', 'objective', 'target', 'purpose', 'mission'],
  aims:        ['goals', 'objectives', 'targets', 'purposes', 'missions'],
  outcome:     ['result', 'effect', 'impact', 'conclusion', 'consequence'],
  outcomes:    ['results', 'effects', 'impacts', 'conclusions', 'consequences'],

  // Conjunctions / connectors
  because:     ['since', 'as', 'given that', 'due to the fact that'],
  although:    ['even though', 'while', 'despite the fact that', 'whereas'],
  however:     ['that said', 'even so', 'on the other hand', 'yet'],
  therefore:   ['as a result', 'consequently', 'thus', 'hence', 'for that reason'],
  while:       ['whereas', 'although', 'even though', 'at the same time'],
  if:          ['provided that', 'assuming that', 'as long as', 'in the event that'],

  // ── v4 Extended Verb Synonyms ─────────────────────────────────────────────
  achieve:       ['accomplish', 'reach', 'attain', 'deliver', 'secure'],
  achieves:      ['accomplishes', 'reaches', 'attains', 'delivers', 'secures'],
  achieved:      ['accomplished', 'reached', 'attained', 'delivered', 'secured'],

  address:       ['tackle', 'handle', 'deal with', 'approach', 'resolve'],
  addresses:     ['tackles', 'handles', 'deals with', 'approaches', 'resolves'],
  addressed:     ['tackled', 'handled', 'dealt with', 'approached', 'resolved'],

  analyze:       ['examine', 'study', 'assess', 'evaluate', 'investigate'],
  analyzes:      ['examines', 'studies', 'assesses', 'evaluates', 'investigates'],
  analyzed:      ['examined', 'studied', 'assessed', 'evaluated', 'investigated'],

  appear:        ['seem', 'look', 'come across as', 'emerge', 'surface'],
  appears:       ['seems', 'looks', 'comes across as', 'emerges', 'surfaces'],
  appeared:      ['seemed', 'looked', 'came across as', 'emerged', 'surfaced'],

  apply:         ['use', 'employ', 'put to use', 'implement', 'draw on'],
  applies:       ['uses', 'employs', 'puts to use', 'implements', 'draws on'],
  applied:       ['used', 'employed', 'put to use', 'implemented', 'drew on'],

  ask:           ['inquire', 'question', 'raise', 'query', 'request'],
  asks:          ['inquires', 'questions', 'raises', 'queries', 'requests'],
  asked:         ['inquired', 'questioned', 'raised', 'queried', 'requested'],

  bring:         ['carry', 'deliver', 'introduce', 'present', 'produce'],
  brings:        ['carries', 'delivers', 'introduces', 'presents', 'produces'],
  brought:       ['carried', 'delivered', 'introduced', 'presented', 'produced'],

  cause:         ['lead to', 'trigger', 'prompt', 'drive', 'generate'],
  causes:        ['leads to', 'triggers', 'prompts', 'drives', 'generates'],
  caused:        ['led to', 'triggered', 'prompted', 'drove', 'generated'],

  consider:      ['think about', 'weigh', 'look at', 'examine', 'evaluate'],
  considers:     ['thinks about', 'weighs', 'looks at', 'examines', 'evaluates'],
  considered:    ['thought about', 'weighed', 'looked at', 'examined', 'evaluated'],

  continue:      ['carry on', 'keep going', 'persist', 'maintain', 'sustain'],
  continues:     ['carries on', 'keeps going', 'persists', 'maintains', 'sustains'],
  continued:     ['carried on', 'kept going', 'persisted', 'maintained', 'sustained'],

  create:        ['build', 'design', 'develop', 'craft', 'produce'],
  creates:       ['builds', 'designs', 'develops', 'crafts', 'produces'],
  created:       ['built', 'designed', 'developed', 'crafted', 'produced'],

  decide:        ['choose', 'determine', 'conclude', 'resolve', 'settle on'],
  decides:       ['chooses', 'determines', 'concludes', 'resolves', 'settles on'],
  decided:       ['chose', 'determined', 'concluded', 'resolved', 'settled on'],

  develop:       ['build', 'create', 'advance', 'grow', 'refine'],
  develops:      ['builds', 'creates', 'advances', 'grows', 'refines'],
  developed:     ['built', 'created', 'advanced', 'grew', 'refined'],

  discuss:       ['talk about', 'cover', 'explore', 'address', 'examine'],
  discusses:     ['talks about', 'covers', 'explores', 'addresses', 'examines'],
  discussed:     ['talked about', 'covered', 'explored', 'addressed', 'examined'],

  explain:       ['describe', 'clarify', 'outline', 'detail', 'break down'],
  explains:      ['describes', 'clarifies', 'outlines', 'details', 'breaks down'],
  explained:     ['described', 'clarified', 'outlined', 'detailed', 'broke down'],

  focus:         ['concentrate', 'target', 'centre on', 'zoom in on', 'home in on'],
  focuses:       ['concentrates', 'targets', 'centres on', 'zooms in on', 'homes in on'],
  focused:       ['concentrated', 'targeted', 'centred on', 'zoomed in on', 'homed in on'],

  follow:        ['pursue', 'track', 'come after', 'abide by', 'act on'],
  follows:       ['pursues', 'tracks', 'comes after', 'abides by', 'acts on'],
  followed:      ['pursued', 'tracked', 'came after', 'abided by', 'acted on'],

  gain:          ['acquire', 'earn', 'secure', 'win', 'pick up'],
  gains:         ['acquires', 'earns', 'secures', 'wins', 'picks up'],
  gained:        ['acquired', 'earned', 'secured', 'won', 'picked up'],

  grow:          ['expand', 'develop', 'advance', 'evolve', 'scale'],
  grows:         ['expands', 'develops', 'advances', 'evolves', 'scales'],
  grew:          ['expanded', 'developed', 'advanced', 'evolved', 'scaled'],

  highlight:     ['emphasise', 'stress', 'point out', 'underscore', 'draw attention to'],
  highlights:    ['emphasises', 'stresses', 'points out', 'underscores', 'draws attention to'],
  highlighted:   ['emphasised', 'stressed', 'pointed out', 'underscored', 'drew attention to'],

  identify:      ['spot', 'pinpoint', 'recognise', 'flag', 'detect'],
  identifies:    ['spots', 'pinpoints', 'recognises', 'flags', 'detects'],
  identified:    ['spotted', 'pinpointed', 'recognised', 'flagged', 'detected'],

  implement:     ['put in place', 'roll out', 'deploy', 'introduce', 'adopt'],
  implements:    ['puts in place', 'rolls out', 'deploys', 'introduces', 'adopts'],
  implemented:   ['put in place', 'rolled out', 'deployed', 'introduced', 'adopted'],

  involve:       ['include', 'require', 'entail', 'mean', 'call for'],
  involves:      ['includes', 'requires', 'entails', 'means', 'calls for'],
  involved:      ['included', 'required', 'entailed', 'meant', 'called for'],

  lead:          ['guide', 'direct', 'steer', 'drive', 'head'],
  leads:         ['guides', 'directs', 'steers', 'drives', 'heads'],
  led:           ['guided', 'directed', 'steered', 'drove', 'headed'],

  learn:         ['discover', 'pick up', 'grasp', 'absorb', 'take in'],
  learns:        ['discovers', 'picks up', 'grasps', 'absorbs', 'takes in'],
  learned:       ['discovered', 'picked up', 'grasped', 'absorbed', 'took in'],

  manage:        ['handle', 'oversee', 'run', 'control', 'coordinate'],
  manages:       ['handles', 'oversees', 'runs', 'controls', 'coordinates'],
  managed:       ['handled', 'oversaw', 'ran', 'controlled', 'coordinated'],

  meet:          ['fulfil', 'satisfy', 'reach', 'match', 'answer'],
  meets:         ['fulfils', 'satisfies', 'reaches', 'matches', 'answers'],
  met:           ['fulfilled', 'satisfied', 'reached', 'matched', 'answered'],

  offer:         ['provide', 'present', 'give', 'extend', 'supply'],
  offers:        ['provides', 'presents', 'gives', 'extends', 'supplies'],
  offered:       ['provided', 'presented', 'gave', 'extended', 'supplied'],

  overcome:      ['get past', 'conquer', 'resolve', 'address', 'tackle'],
  overcomes:     ['gets past', 'conquers', 'resolves', 'addresses', 'tackles'],
  overcame:      ['got past', 'conquered', 'resolved', 'addressed', 'tackled'],

  prepare:       ['get ready', 'plan', 'arrange', 'set up', 'organise'],
  prepares:      ['gets ready', 'plans', 'arranges', 'sets up', 'organises'],
  prepared:      ['got ready', 'planned', 'arranged', 'set up', 'organised'],

  prevent:       ['stop', 'avoid', 'block', 'guard against', 'protect against'],
  prevents:      ['stops', 'avoids', 'blocks', 'guards against', 'protects against'],
  prevented:     ['stopped', 'avoided', 'blocked', 'guarded against', 'protected against'],

  produce:       ['create', 'generate', 'make', 'deliver', 'yield'],
  produces:      ['creates', 'generates', 'makes', 'delivers', 'yields'],
  produced:      ['created', 'generated', 'made', 'delivered', 'yielded'],

  promote:       ['support', 'boost', 'encourage', 'advance', 'champion'],
  promotes:      ['supports', 'boosts', 'encourages', 'advances', 'champions'],
  promoted:      ['supported', 'boosted', 'encouraged', 'advanced', 'championed'],

  protect:       ['safeguard', 'shield', 'defend', 'preserve', 'guard'],
  protects:      ['safeguards', 'shields', 'defends', 'preserves', 'guards'],
  protected:     ['safeguarded', 'shielded', 'defended', 'preserved', 'guarded'],

  reach:         ['get to', 'arrive at', 'hit', 'achieve', 'attain'],
  reaches:       ['gets to', 'arrives at', 'hits', 'achieves', 'attains'],
  reached:       ['got to', 'arrived at', 'hit', 'achieved', 'attained'],

  reflect:       ['show', 'mirror', 'illustrate', 'represent', 'capture'],
  reflects:      ['shows', 'mirrors', 'illustrates', 'represents', 'captures'],
  reflected:     ['showed', 'mirrored', 'illustrated', 'represented', 'captured'],

  require:       ['need', 'call for', 'demand', 'depend on', 'involve'],
  requires:      ['needs', 'calls for', 'demands', 'depends on', 'involves'],
  required:      ['needed', 'called for', 'demanded', 'depended on', 'involved'],

  share:         ['pass on', 'spread', 'distribute', 'communicate', 'put forward'],
  shares:        ['passes on', 'spreads', 'distributes', 'communicates', 'puts forward'],
  shared:        ['passed on', 'spread', 'distributed', 'communicated', 'put forward'],

  solve:         ['fix', 'resolve', 'tackle', 'crack', 'sort out'],
  solves:        ['fixes', 'resolves', 'tackles', 'cracks', 'sorts out'],
  solved:        ['fixed', 'resolved', 'tackled', 'cracked', 'sorted out'],

  support:       ['back', 'assist', 'aid', 'help', 'strengthen'],
  supports:      ['backs', 'assists', 'aids', 'helps', 'strengthens'],
  supported:     ['backed', 'assisted', 'aided', 'helped', 'strengthened'],

  understand:    ['grasp', 'appreciate', 'recognise', 'see', 'get'],
  understands:   ['grasps', 'appreciates', 'recognises', 'sees', 'gets'],
  understood:    ['grasped', 'appreciated', 'recognised', 'saw', 'got'],

  // ── v4 Extended Adjective Synonyms ───────────────────────────────────────
  accurate:      ['precise', 'correct', 'exact', 'reliable', 'valid'],
  advanced:      ['sophisticated', 'modern', 'cutting-edge', 'leading', 'refined'],
  beneficial:    ['helpful', 'useful', 'positive', 'valuable', 'productive'],
  challenging:   ['difficult', 'demanding', 'tough', 'complex', 'tricky'],
  comprehensive: ['thorough', 'complete', 'full', 'detailed', 'wide-ranging'],
  consistent:    ['steady', 'reliable', 'stable', 'uniform', 'regular'],
  creative:      ['imaginative', 'inventive', 'innovative', 'original', 'resourceful'],
  critical:      ['crucial', 'vital', 'key', 'important', 'essential'],
  diverse:       ['varied', 'mixed', 'wide-ranging', 'broad', 'assorted'],
  effective:     ['successful', 'efficient', 'powerful', 'productive', 'capable'],
  efficient:     ['effective', 'streamlined', 'quick', 'productive', 'optimal'],
  excellent:     ['outstanding', 'superb', 'exceptional', 'top-notch', 'first-rate'],
  flexible:      ['adaptable', 'versatile', 'adjustable', 'open', 'nimble'],
  fundamental:   ['basic', 'core', 'essential', 'central', 'foundational'],
  innovative:    ['creative', 'pioneering', 'inventive', 'fresh', 'ground-breaking'],
  interesting:   ['engaging', 'compelling', 'fascinating', 'intriguing', 'thought-provoking'],
  limited:       ['restricted', 'narrow', 'minimal', 'constrained', 'modest'],
  meaningful:    ['significant', 'purposeful', 'worthwhile', 'valuable', 'important'],
  modern:        ['contemporary', 'current', 'up-to-date', 'recent', 'new'],
  necessary:     ['essential', 'required', 'critical', 'vital', 'needed'],
  negative:      ['harmful', 'damaging', 'adverse', 'detrimental', 'unfavourable'],
  obvious:       ['clear', 'evident', 'plain', 'apparent', 'visible'],
  positive:      ['beneficial', 'favourable', 'good', 'constructive', 'helpful'],
  powerful:      ['strong', 'forceful', 'impactful', 'influential', 'effective'],
  practical:     ['realistic', 'workable', 'useful', 'hands-on', 'actionable'],
  professional:  ['skilled', 'expert', 'qualified', 'experienced', 'competent'],
  relevant:      ['applicable', 'pertinent', 'fitting', 'appropriate', 'useful'],
  reliable:      ['dependable', 'trustworthy', 'consistent', 'stable', 'solid'],
  significant:   ['major', 'important', 'notable', 'meaningful', 'substantial'],
  simple:        ['straightforward', 'basic', 'easy', 'clear', 'plain'],
  successful:    ['effective', 'productive', 'fruitful', 'prosperous', 'accomplished'],
  suitable:      ['appropriate', 'fitting', 'right', 'proper', 'adequate'],
  traditional:   ['classic', 'conventional', 'established', 'standard', 'time-honoured'],
  unique:        ['distinctive', 'one-of-a-kind', 'original', 'special', 'rare'],
  valuable:      ['useful', 'worthwhile', 'important', 'beneficial', 'precious'],

  // ── v4 Extended Noun Synonyms ─────────────────────────────────────────────
  ability:       ['skill', 'capacity', 'capability', 'talent', 'knack'],
  access:        ['entry', 'reach', 'availability', 'use', 'admission'],
  advantage:     ['benefit', 'strength', 'plus', 'gain', 'edge'],
  analysis:      ['study', 'review', 'examination', 'assessment', 'evaluation'],
  benefit:       ['advantage', 'gain', 'plus', 'merit', 'value'],
  challenge:     ['difficulty', 'hurdle', 'obstacle', 'issue', 'problem'],
  change:        ['shift', 'adjustment', 'transformation', 'update', 'revision'],
  choice:        ['option', 'alternative', 'decision', 'pick', 'preference'],
  community:     ['group', 'network', 'society', 'population', 'circle'],
  context:       ['setting', 'background', 'situation', 'environment', 'framework'],
  decision:      ['choice', 'conclusion', 'judgement', 'call', 'resolution'],
  development:   ['growth', 'progress', 'advancement', 'evolution', 'expansion'],
  difference:    ['distinction', 'variation', 'contrast', 'gap', 'disparity'],
  effort:        ['work', 'attempt', 'endeavour', 'push', 'drive'],
  environment:   ['setting', 'context', 'surroundings', 'space', 'landscape'],
  example:       ['instance', 'case', 'illustration', 'sample', 'model'],
  experience:    ['knowledge', 'background', 'history', 'practice', 'exposure'],
  factor:        ['element', 'aspect', 'component', 'driver', 'influence'],
  feature:       ['characteristic', 'quality', 'trait', 'element', 'aspect'],
  focus:         ['emphasis', 'attention', 'priority', 'centre', 'direction'],
  foundation:    ['base', 'basis', 'core', 'backbone', 'groundwork'],
  framework:     ['structure', 'model', 'system', 'approach', 'scheme'],
  impact:        ['effect', 'influence', 'consequence', 'result', 'outcome'],
  importance:    ['significance', 'value', 'weight', 'relevance', 'priority'],
  information:   ['data', 'details', 'facts', 'knowledge', 'content'],
  knowledge:     ['understanding', 'expertise', 'awareness', 'insight', 'grasp'],
  level:         ['degree', 'extent', 'amount', 'measure', 'rate'],
  method:        ['approach', 'technique', 'strategy', 'way', 'process'],
  model:         ['example', 'template', 'pattern', 'framework', 'structure'],
  network:       ['web', 'system', 'connection', 'grid', 'platform'],
  opportunity:   ['chance', 'opening', 'prospect', 'possibility', 'window'],
  performance:   ['results', 'output', 'achievement', 'delivery', 'execution'],
  perspective:   ['view', 'angle', 'outlook', 'standpoint', 'lens'],
  position:      ['stance', 'view', 'role', 'place', 'spot'],
  potential:     ['promise', 'possibility', 'capacity', 'ability', 'scope'],
  priority:      ['focus', 'importance', 'emphasis', 'concern', 'aim'],
  process:       ['procedure', 'method', 'approach', 'system', 'workflow'],
  purpose:       ['aim', 'goal', 'intention', 'reason', 'objective'],
  quality:       ['standard', 'level', 'calibre', 'grade', 'value'],
  question:      ['issue', 'concern', 'matter', 'topic', 'subject'],
  relationship:  ['connection', 'link', 'tie', 'bond', 'association'],
  research:      ['study', 'investigation', 'analysis', 'inquiry', 'exploration'],
  resource:      ['tool', 'asset', 'material', 'supply', 'means'],
  role:          ['function', 'part', 'responsibility', 'position', 'duty'],
  situation:     ['circumstance', 'context', 'condition', 'scenario', 'case'],
  skill:         ['ability', 'talent', 'expertise', 'competence', 'capability'],
  solution:      ['answer', 'fix', 'resolution', 'remedy', 'approach'],
  source:        ['origin', 'root', 'basis', 'reference', 'supply'],
  strategy:      ['plan', 'approach', 'method', 'tactic', 'technique'],
  structure:     ['framework', 'organisation', 'layout', 'arrangement', 'form'],
  success:       ['achievement', 'accomplishment', 'win', 'triumph', 'result'],
  support:       ['help', 'assistance', 'backing', 'aid', 'encouragement'],
  task:          ['job', 'activity', 'duty', 'assignment', 'work'],
  topic:         ['subject', 'theme', 'area', 'issue', 'matter'],
  type:          ['kind', 'sort', 'category', 'form', 'variety'],
  understanding: ['knowledge', 'grasp', 'awareness', 'insight', 'appreciation'],
  use:           ['application', 'employment', 'utilisation', 'deployment', 'role'],
  value:         ['worth', 'importance', 'benefit', 'significance', 'merit'],
  view:          ['perspective', 'opinion', 'outlook', 'stance', 'position'],
  work:          ['effort', 'task', 'project', 'output', 'contribution'],
};

// ── Rule 8: Move Time Phrases & Rule 29: Adjust Word Order ───────────────────

// Time indicator patterns to move
const TIME_INDICATORS = [
  /^(Yesterday|Today|Tomorrow|Last\s+\w+|This\s+\w+|Next\s+\w+|Recently|Currently|Now|Then|Later|Earlier|Soon|Finally|Eventually|Meanwhile|Afterwards?|Beforehand|Afterwards?|At\s+[\w\s]+|In\s+the\s+\w+|During\s+[\w\s]+,)\s+/i,
  /,?\s*(yesterday|today|tomorrow|last\s+\w+|this\s+\w+|next\s+\w+|recently|currently|now|then|later|earlier|soon|finally|eventually)\s*[,.]?\s*$/i,
];

/**
 * Move a leading time indicator to the end, or vice versa.
 */
function reorderTimeIndicator(sentence) {
  // Leading time indicator → move to end
  const leadMatch = sentence.match(/^([A-Z][a-z]+\s+(?:the|a|an|[A-Z])[\w\s,]+),\s+(.+)$/);
  if (leadMatch) {
    const [, clause, main] = leadMatch;
    const lower = clause.charAt(0).toLowerCase() + clause.slice(1);
    const mainStripped = main.replace(/\s*[.!?]+$/, '');
    const punct = (/[.!?]+$/.exec(main) || ['.'])[0];
    return `${mainStripped} ${lower}${punct}`;
  }

  // Trailing time indicator → move to front
  const trailMatch = sentence.match(/^(.+?),\s*(yesterday|today|recently|currently|last\s+\w+|next\s+\w+)\s*([.!?]*)$/i);
  if (trailMatch) {
    const [, main, indicator, punct] = trailMatch;
    const indCap = indicator.charAt(0).toUpperCase() + indicator.slice(1);
    const mainLower = main.charAt(0).toLowerCase() + main.slice(1);
    return `${indCap}, ${mainLower}${punct || '.'}`;
  }

  return sentence;
}

// ── Rule 22: Clause Reordering ────────────────────────────────────────────────

// Subordinating conjunctions that introduce dependent clauses
const SUBORDINATORS = [
  'because', 'since', 'as', 'although', 'though', 'even though',
  'while', 'whereas', 'if', 'unless', 'until', 'when', 'after',
  'before', 'once', 'so that', 'in order that', 'provided that',
  'whether', 'despite', 'given that',
];

/**
 * Switch dependent-clause-first sentences to independent-first, and vice versa.
 *
 * Pattern A: "Because X, Y." → "Y because X."
 * Pattern B: "Y because X." → "Because X, Y."
 */
function switchClauseOrder(sentence) {
  const stripped = sentence.trim();

  // Pattern A: starts with subordinator
  for (const sub of SUBORDINATORS) {
    const leading = new RegExp(`^${sub}\\s+(.+?),\\s+(.+)$`, 'i');
    const m = stripped.match(leading);
    if (m) {
      const [, depBody, indClause] = m;
      const indCap = indClause.charAt(0).toUpperCase() + indClause.slice(1);
      const indStripped = indCap.replace(/[.!?]+$/, '');
      const punct = (/[.!?]+$/.exec(stripped) || ['.'])[0];
      return `${indStripped} ${sub} ${depBody}${punct}`;
    }
  }

  // Pattern B: independent clause followed by subordinate clause
  for (const sub of SUBORDINATORS) {
    const trailing = new RegExp(`^(.+?)\\s+${sub}\\s+(.+?[.!?]*)$`, 'i');
    const m = stripped.match(trailing);
    if (m) {
      const [, indClause, depBody] = m;
      const depStripped = depBody.replace(/[.!?]+$/, '');
      const punct = (/[.!?]+$/.exec(stripped) || ['.'])[0];
      const subCap = sub.charAt(0).toUpperCase() + sub.slice(1);
      const indLower = indClause.charAt(0).toLowerCase() + indClause.slice(1);
      return `${subCap} ${depStripped}, ${indLower}${punct}`;
    }
  }

  return sentence;
}

// ── Rule 23: Sentence Combination & Rule 45: Insert Linking Words ─────────────

/**
 * Detect if two consecutive sentences share the same subject and can
 * be merged with "and", "but", "which", or relative clause.
 *
 * e.g. "The tool is powerful. It is easy to use."
 *   → "The tool is powerful and easy to use."
 */
function combineSentencePair(s1, s2) {
  const stripped1 = s1.trim().replace(/[.!?]+$/, '');
  const stripped2 = s2.trim();

  // Pattern: "The X is A. It is B." → "The X is A and B."
  const sharedSubject = /^(The\s+\w+|A\s+\w+|An\s+\w+|This\s+\w+|\w+'s\s+\w+)\s+/i;
  const m1 = stripped1.match(sharedSubject);

  if (!m1) return null;

  const subject = m1[1];
  const pred1 = stripped1.slice(subject.length).trim();

  // s2 starts with "It" or "They" referring back
  const pronoun2 = /^(It|It's|They|This|That|These)\s+/i;
  const m2 = stripped2.match(pronoun2);
  if (!m2) return null;

  const pred2 = stripped2.slice(m2[0].length).trim().replace(/[.!?]+$/, '');
  const punct = (/[.!?]+$/.exec(stripped2) || ['.'])[0];

  return `${subject} ${pred1} and ${pred2}${punct}`;
}

function applySentenceCombination(sentences) {
  const result = [];
  let i = 0;

  while (i < sentences.length) {
    if (i + 1 < sentences.length) {
      const combined = combineSentencePair(sentences[i], sentences[i + 1]);
      if (combined) {
        result.push(combined);
        i += 2;
        continue;
      }
    }
    result.push(sentences[i]);
    i++;
  }

  return result;
}

// ── Rules 12–16: Synonym Substitution Engine ─────────────────────────────────

// Stop-words and proper-noun heuristics (don't replace these)
const SYNONYM_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'it', 'its', 'this', 'that', 'these', 'those', 'they', 'them',
  'their', 'he', 'she', 'we', 'you', 'i', 'my', 'our', 'your', 'his',
  'her', 'not', 'no', 'so', 'if', 'as', 'up', 'do', 'did', 'does',
  'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may',
  'might', 'shall', 'can', 'there', 'then', 'than', 'when', 'where',
  'who', 'what', 'which', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'into', 'about', 'through',
  'over', 'before', 'after', 'between', 'out', 'off', 'still', 'just',
]);

/**
 * Apply synonym substitution. Uses a round-robin index per call so
 * multiple variations can be generated with different synonym choices.
 */
function substituteSynonyms(sentence, variantIndex = 0) {
  const words = sentence.split(/(\s+|(?=[^a-zA-Z'])|(?<=[^a-zA-Z']))/);

  return words.map(token => {
    const lower = token.toLowerCase();

    // Skip stop words, short tokens, and apparent proper nouns (capitalised mid-sentence)
    if (
      SYNONYM_STOP.has(lower) ||
      token.length <= 2 ||
      // Skip proper nouns: capitalised but not start of sentence (heuristic)
      /^[A-Z]/.test(token) && token !== token.toUpperCase()
    ) {
      return token;
    }

    const synonymList = SYNONYMS[lower];
    if (!synonymList) return token;

    const chosen = synonymList[variantIndex % synonymList.length];
    // Preserve capitalisation
    if (token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase()) {
      return chosen.charAt(0).toUpperCase() + chosen.slice(1);
    }
    return chosen;
  }).join('');
}

// ── Rule 7: Active to Passive Conversion (variation mode) ────────────────────

/**
 * Rule 7 — Sometimes convert active sentences into passive form for variation.
 * Applied only on variation index 1 to alternate with active voice (Rule 6).
 *
 * Handles simple SVO: "John wrote the report." → "The report was written by John."
 */
function activeToPassive(sentence) {
  // Pattern: "Agent [simple-past] the [noun]." → "The [noun] was [pp] by Agent."
  const svo = /^([A-Z]\w+)\s+(wrote|made|built|sent|sold|told|held|found|gave|took|led|ran|won|lost|caught|heard|read|met|kept|paid|cut|hit|drew|drove|ate|broke|chose|spoke|stole|wore|threw|grew|began|bit|blew)\s+(the\s+\w+|a\s+\w+|an\s+\w+)([.!?]*)$/;
  const m = sentence.match(svo);
  if (!m) return sentence;

  const [, agent, pastVerb, obj, punct] = m;
  const ppMap = {
    wrote: 'written', made: 'made', built: 'built', sent: 'sent', sold: 'sold',
    told: 'told', held: 'held', found: 'found', gave: 'given', took: 'taken',
    led: 'led', ran: 'run', won: 'won', lost: 'lost', caught: 'caught',
    heard: 'heard', read: 'read', met: 'met', kept: 'kept', paid: 'paid',
    cut: 'cut', hit: 'hit', drew: 'drawn', drove: 'driven', ate: 'eaten',
    broke: 'broken', chose: 'chosen', spoke: 'spoken', stole: 'stolen',
    wore: 'worn', threw: 'thrown', grew: 'grown', began: 'begun', bit: 'bitten',
    blew: 'blown',
  };
  const pp = ppMap[pastVerb] || `${pastVerb}`;
  const objCap = obj.charAt(0).toUpperCase() + obj.slice(1);
  return `${objCap} was ${pp} by ${agent}${punct || '.'}`;
}



// ── Rule 18: Formal Expansion (casual → formal) ───────────────────────────────
// Formal mode: expand contractions
const EXPAND_CONTRACTIONS = [
  [/\bit's\b/gi,      "it is"],
  [/\bdon't\b/gi,     "do not"],
  [/\bcan't\b/gi,     "cannot"],
  [/\bwon't\b/gi,     "will not"],
  [/\bI'm\b/g,        "I am"],
  [/\bwe're\b/gi,     "we are"],
  [/\byou're\b/gi,    "you are"],
  [/\bthey're\b/gi,   "they are"],
  [/\bhe's\b/gi,      "he is"],
  [/\bshe's\b/gi,     "she is"],
  [/\bthat's\b/gi,    "that is"],
  [/\bthere's\b/gi,   "there is"],
  [/\bI'll\b/g,       "I will"],
  [/\bwe'll\b/gi,     "we will"],
  [/\bI've\b/g,       "I have"],
  [/\bwe've\b/gi,     "we have"],
  [/\bI'd\b/g,        "I would"],
  [/\bwe'd\b/gi,      "we would"],
  [/\bdidn't\b/gi,    "did not"],
  [/\bisn't\b/gi,     "is not"],
  [/\baren't\b/gi,    "are not"],
  [/\bwasn't\b/gi,    "was not"],
  [/\bweren't\b/gi,   "were not"],
  [/\bhadn't\b/gi,    "had not"],
  [/\bhasn't\b/gi,    "has not"],
  [/\bhaven't\b/gi,   "have not"],
  [/\bcouldn't\b/gi,  "could not"],
  [/\bwouldn't\b/gi,  "would not"],
  [/\bshouldn't\b/gi, "should not"],
  [/\blet's\b/gi,     "let us"],
];

function expandContractions(text) {
  let r = text;
  for (const [p, rep] of EXPAND_CONTRACTIONS) {
    r = r.replace(p, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return rep.charAt(0).toUpperCase() + rep.slice(1);
      }
      return rep;
    });
  }
  return r;
}

// ── Prompt Rule 43: Formal mode mappings ──────────────────────────────────────
// Formal vocabulary (informal → formal)
const FORMAL_VOCAB = [
  [/\bkids\b/gi,      'children'],
  [/\bboss\b/gi,      'supervisor'],
  [/\bjob\b/gi,       'position'],
  [/\bget\b/gi,       'obtain'],
  [/\bgets\b/gi,      'obtains'],
  [/\bgot\b/gi,       'obtained'],
  [/\bshow\b/gi,      'demonstrate'],
  [/\bshows\b/gi,     'demonstrates'],
  [/\btry\b/gi,       'attempt'],
  [/\btries\b/gi,     'attempts'],
  [/\bbig\b/gi,       'significant'],
  [/\bsmall\b/gi,     'minimal'],
  [/\bfast\b/gi,      'rapid'],
  [/\bslow\b/gi,      'gradual'],
  [/\bhard\b/gi,      'challenging'],
  [/\beasy\b/gi,      'straightforward'],
  [/\blots of\b/gi,   'numerous'],
  [/\ba lot of\b/gi,  'many'],
];

// ── Prompt Rule 44: Creative mode mappings ────────────────────────────────────
// Creative vocabulary (vivid replacements)
const CREATIVE_VOCAB = [
  [/\bshow\b/gi,       'illuminate'],
  [/\bshows\b/gi,      'illuminates'],
  [/\bmake\b/gi,       'craft'],
  [/\bmakes\b/gi,      'crafts'],
  [/\buse\b/gi,        'harness'],
  [/\buses\b/gi,       'harnesses'],
  [/\bhelp\b/gi,       'empower'],
  [/\bhelps\b/gi,      'empowers'],
  [/\bstart\b/gi,      'ignite'],
  [/\bstarts\b/gi,     'ignites'],
  [/\bchange\b/gi,     'reshape'],
  [/\bchanges\b/gi,    'reshapes'],
  [/\bfind\b/gi,       'unearth'],
  [/\bfinds\b/gi,      'unearths'],
  [/\bgrow\b/gi,       'flourish'],
  [/\bgrows\b/gi,      'flourishes'],
  [/\bbuild\b/gi,      'craft'],
  [/\bbuilds\b/gi,     'crafts'],
  [/\bimportant\b/gi,  'pivotal'],
  [/\bvery\b/gi,       'remarkably'],
  [/\bbig\b/gi,        'sweeping'],
  [/\bgood\b/gi,       'remarkable'],
];

function applyModeVocab(text, mode) {
  if (mode === 'formal') {
    let r = expandContractions(text);
    for (const [p, rep] of FORMAL_VOCAB) {
      r = r.replace(p, (match) =>
        match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
          ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep
      );
    }
    return r;
  }
  if (mode === 'creative') {
    let r = text;
    for (const [p, rep] of CREATIVE_VOCAB) {
      r = r.replace(p, (match) =>
        match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
          ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep
      );
    }
    return r;
  }
  return text;
}

// ── Rule 4 / Rules 38–40: Shared Grammar Fix ─────────────────────────────────

function fixGrammar(text) {
  return text
    .replace(/,\s*\./g, '.')                          // ", ." → "."
    .replace(/,\s*,/g, ',')                            // ",," → ","
    .replace(/\s+,/g, ',')                             // " ," → ","
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/,([^\s])/g, ', $1')
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
    .replace(/^([a-z])/, c => c.toUpperCase())
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// ── Rule 35: Avoid Identical Sentence Patterns & Rule 34: Vary Length ─────────
// ── Rule 5: Multi-Variation Output (up to 3 variations) ──────────────────────

/**
 * Generate a paraphrase using a specific strategy combination.
 *
 * Strategy A (variantIndex 0): synonym substitution + time phrase reorder + shared rules
 * Strategy B (variantIndex 1): synonym substitution + clause switch + active→passive (Rule 7)
 * Strategy C (variantIndex 2): synonym substitution + sentence combination + opening change
 *
 * All strategies apply Rules 3, 4, 5, 6, 8–50 as appropriate.
 */
function generateVariation(sentences, variantIndex, mode) {
  let result = [...sentences];

  // Rule 6: Passive to active on all sentences (pre-pass)
  result = result.map(s => passiveToActive(s));

  // Rule 26: Rephrase questions
  result = result.map(s => rephraseQuestion(s));

  // Rule 23 / Rule 45: Sentence combination + linking words (even variants)
  if (variantIndex % 2 === 0) {
    result = applySentenceCombination(result);
  }

  // Rule 33: Replace repeated verbs across sentences
  result = replaceRepeatedVerbs(result);

  // Per-sentence transforms
  result = result.map((s, i) => {
    let t = s;

    // Rule 8: Move time phrases (even-indexed sentences)
    if (i % 2 === 0) {
      t = reorderTimeIndicator(t);
      t = moveTimePhraseToFront(t);
    }

    // Rule 9: Move location phrases (odd-indexed sentences)
    if (i % 2 !== 0) {
      t = moveLocationPhrase(t);
    }

    // Rule 22: Clause reordering (odd-indexed sentences)
    if (i % 2 !== 0) {
      t = switchClauseOrder(t);
    }

    // Rule 7: Active to passive on variant 1 (for variety / Rule 35)
    if (variantIndex === 1 && i % 3 === 0) {
      t = activeToPassive(t);
    }

    // Rule 27: Change sentence openings (variant 2)
    if (variantIndex === 2) {
      t = changeSentenceOpening(t, i);
    }

    // Rule 29: Adjust word order
    t = adjustWordOrder(t);

    // Rule 42: Verb tense consistency
    t = fixTenseConsistency(t);

    // Rule 41: Subject–verb agreement
    t = fixSubjectVerbAgreement(t);

    // Rules 12–14: Synonym substitution (adjectives, verbs, nouns)
    // Rule 15: Avoids proper nouns (capitalised mid-sentence heuristic in SYNONYM_STOP)
    // Rule 16: Avoids technical terms (excluded from SYNONYMS dictionary)
    t = substituteSynonyms(t, variantIndex + i);

    // Rule 36: Add mild descriptive words (sparingly)
    t = addMildDescriptors(t, i + variantIndex);

    return t;
  });

  // Join and apply text-level transforms
  let joined = result.join(' ');

  // Rule 19: Remove redundant words
  joined = removeRedundantWords(joined);

  // Rule 20 / 37: Remove filler words and unnecessary adverbs
  joined = removeUnnecessaryAdverbs(joined);

  // Rule 25 / 32: Phrase replacement and reduce wordiness
  joined = reduceWordiness(joined);

  // Rule 44: Simplify nested clauses
  joined = simplifyNestedClauses(joined);

  // Rule 49: Readability adjustment
  joined = adjustReadability(joined);

  // Rule 31: Expand short expressions
  joined = expandShortExpressions(joined);

  // Rule 17 / 18: Contraction or formal expansion based on mode
  joined = applyModeVocab(joined, mode);

  // Rule 28: Add introductory phrase on variant 2 for variety
  if (variantIndex === 2) {
    const openers = ['In general,', 'In many cases,', 'As a rule,', 'Broadly speaking,'];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    const lower = joined.charAt(0).toLowerCase() + joined.slice(1);
    joined = `${opener} ${lower}`;
  }

  // Rule 4 / 38–40: Grammar integrity, spacing, capitalisation, punctuation
  return fixGrammar(joined);
}

// ── Main Paraphraser Export ───────────────────────────────────────────────────

/**
 * run(input, options) → { result, variations }
 *
 * options.mode    = 'standard' | 'formal' | 'creative'
 * options.count   = 1 | 2 | 3   (number of variations)
 *
 * Applies pre-processing (Rules 24, 25, 44, 49) before segmentation,
 * then generateVariation applies all per-sentence and text-level rules.
 * Rule 50 (Final Validation) is the last step — grammar, meaning, diff check.
 */
function run(input, options = {}) {
  const text  = (input || '').trim();
  const mode  = ['standard', 'formal', 'creative'].includes(options.mode) ? options.mode : 'standard';
  const count = Math.min(Math.max(parseInt(options.count) || 1, 1), 3);

  if (!text) {
    return { error: 'Please enter some text to paraphrase.' };
  }
  if (text.split(/\s+/).filter(Boolean).length < 3) {
    return { error: 'Please enter at least a few words.' };
  }
  if (text.length > 5000) {
    return { error: 'Text is too long. Maximum is 5,000 characters.' };
  }

  try {
    // Rule 1: Segment sentences
    const sentences = segmentSentences(text);

    const variations = [];
    for (let v = 0; v < count; v++) {
      const paraphrased = generateVariation(sentences, v, mode);

      // Rule 5: ensure output differs from input
      if (paraphrased.trim() !== text.trim()) {
        variations.push(paraphrased);
      } else {
        // Fallback: force difference by prepending an adverbial
        const fallbacks = ['In other words,', 'Put differently,', 'To put it another way,'];
        const fb = fallbacks[v % fallbacks.length];
        const lower = paraphrased.charAt(0).toLowerCase() + paraphrased.slice(1);
        variations.push(`${fb} ${lower}`);
      }
    }

    // Rule 50: Final validation — ensure no two variations are identical
    const uniqueVariations = [...new Set(variations)];
    while (uniqueVariations.length < count) {
      const extra = uniqueVariations[uniqueVariations.length - 1];
      const openers = ['Put another way,', 'Stated differently,', 'In essence,'];
      const opener = openers[uniqueVariations.length % openers.length];
      const lower = extra.charAt(0).toLowerCase() + extra.slice(1);
      uniqueVariations.push(`${opener} ${lower}`);
    }

    return {
      result:     uniqueVariations[0],
      variations: uniqueVariations.slice(0, count),
      mode,
    };
  } catch (err) {
    return { error: err.message || 'Paraphrasing failed. Please try again.' };
  }
}

module.exports = { run, generateVariation, substituteSynonyms, SYNONYMS };

// ── v5: EXTENDED PHRASE SYNONYMS ──────────────────────────────────────────────
// Multi-word phrase replacements for richer variation

const PHRASE_SYNONYMS = [
  // Time phrases
  ['at the moment',           ['right now', 'currently', 'at present', 'as things stand', 'these days']],
  ['in the past',             ['previously', 'historically', 'in earlier times', 'once', 'formerly']],
  ['in the future',           ['going forward', 'ahead', 'down the line', 'in time', 'eventually']],
  ['over time',               ['gradually', 'with time', 'as time passes', 'progressively', 'in due course']],
  ['in recent years',         ['lately', 'in recent times', 'over recent years', 'of late', 'recently']],
  ['for a long time',         ['for years', 'over an extended period', 'for quite some time', 'for ages', 'for a while']],
  ['from time to time',       ['occasionally', 'now and then', 'every so often', 'periodically', 'at times']],
  ['all the time',            ['constantly', 'continuously', 'without pause', 'non-stop', 'perpetually']],
  ['at the same time',        ['simultaneously', 'concurrently', 'in parallel', 'together', 'alongside this']],
  ['in due time',             ['eventually', 'in time', 'sooner or later', 'before long', 'ultimately']],

  // Causation / consequence
  ['as a result of',          ['because of', 'owing to', 'due to', 'following', 'stemming from']],
  ['because of this',         ['for this reason', 'as a result', 'consequently', 'therefore', 'thus']],
  ['leads to',                ['results in', 'causes', 'brings about', 'produces', 'drives']],
  ['results in',              ['leads to', 'causes', 'brings about', 'generates', 'creates']],
  ['in spite of',             ['despite', 'regardless of', 'even with', 'notwithstanding', 'although']],
  ['despite the fact',        ['even though', 'although', 'while', 'regardless of the fact', 'in spite of']],
  ['on account of',           ['because of', 'due to', 'owing to', 'as a result of', 'given']],

  // Comparison / contrast
  ['on the other hand',       ['conversely', 'by contrast', 'in contrast', 'alternatively', 'that said']],
  ['in contrast to',          ['unlike', 'as opposed to', 'compared with', 'differing from', 'rather than']],
  ['compared to',             ['relative to', 'in comparison with', 'measured against', 'alongside', 'against']],
  ['similar to',              ['like', 'comparable to', 'in line with', 'much like', 'akin to']],
  ['just as',                 ['in the same way as', 'similarly to', 'in a manner like', 'equally', 'likewise']],
  ['as well as',              ['in addition to', 'along with', 'together with', 'plus', 'on top of']],
  ['not only but also',       ['both and', 'as well as', 'along with', 'in addition to', 'plus']],
  ['rather than',             ['instead of', 'in place of', 'as opposed to', 'over', 'ahead of']],
  ['as opposed to',           ['rather than', 'in contrast to', 'instead of', 'unlike', 'versus']],

  // Addition / emphasis
  ['in addition',             ['furthermore', 'moreover', 'also', 'what is more', 'on top of this']],
  ['in particular',           ['specifically', 'especially', 'notably', 'in particular', 'above all']],
  ['most importantly',        ['crucially', 'above all', 'most critically', 'principally', 'chiefly']],
  ['in general',              ['broadly', 'typically', 'on the whole', 'across the board', 'overall']],
  ['for the most part',       ['largely', 'mostly', 'in the main', 'generally', 'predominantly']],
  ['above all',               ['most importantly', 'principally', 'chiefly', 'especially', 'primarily']],
  ['especially',              ['particularly', 'notably', 'specifically', 'above all', 'in particular']],

  // Process / method
  ['in order to',             ['to', 'so as to', 'with the aim of', 'with a view to', 'for the purpose of']],
  ['by means of',             ['through', 'via', 'using', 'with the help of', 'by way of']],
  ['with the help of',        ['using', 'through', 'by means of', 'with support from', 'aided by']],
  ['based on',                ['drawing on', 'grounded in', 'founded on', 'rooted in', 'informed by']],
  ['according to',            ['as stated by', 'in line with', 'as per', 'as noted by', 'following']],
  ['in terms of',             ['regarding', 'when it comes to', 'concerning', 'with respect to', 'as for']],
  ['with regard to',          ['concerning', 'regarding', 'on the subject of', 'about', 'in relation to']],

  // Conclusion / summary
  ['in conclusion',           ['to conclude', 'in summary', 'to sum up', 'ultimately', 'all in all']],
  ['to summarise',            ['in short', 'briefly', 'in a nutshell', 'to recap', 'to put it simply']],
  ['in other words',          ['that is to say', 'put differently', 'to put it another way', 'in essence', 'meaning']],
  ['to put it simply',        ['in short', 'to be clear', 'simply put', 'in plain terms', 'essentially']],
  ['all in all',              ['overall', 'in the end', 'on balance', 'taking everything together', 'in total']],

  // Hedging / qualifying
  ['it seems that',           ['it appears that', 'it looks as though', 'apparently', 'seemingly', 'from what we can see']],
  ['it is likely that',       ['chances are', 'probably', 'in all likelihood', 'it appears likely that', 'it would seem']],
  ['in some cases',           ['sometimes', 'on occasion', 'at times', 'in certain situations', 'occasionally']],
  ['to some extent',          ['in part', 'partially', 'to a degree', 'somewhat', 'to a certain point']],
  ['more or less',            ['approximately', 'roughly', 'broadly', 'in general', 'about']],
  ['in many ways',            ['on many levels', 'in a number of respects', 'in various ways', 'in several respects', 'broadly']],
  ['at least',                ['if nothing else', 'at a minimum', 'as a baseline', 'no less than', 'at the very least']],

  // Action / change
  ['take into account',       ['consider', 'factor in', 'account for', 'take note of', 'allow for']],
  ['make use of',             ['use', 'utilise', 'draw on', 'apply', 'take advantage of']],
  ['put in place',            ['implement', 'establish', 'set up', 'introduce', 'create']],
  ['carry out',               ['perform', 'conduct', 'execute', 'complete', 'do']],
  ['bring about',             ['cause', 'lead to', 'create', 'produce', 'generate']],
  ['give rise to',            ['cause', 'lead to', 'result in', 'spark', 'trigger']],
  ['come up with',            ['develop', 'create', 'devise', 'produce', 'think of']],
  ['deal with',               ['handle', 'address', 'tackle', 'manage', 'resolve']],
  ['look at',                 ['examine', 'consider', 'review', 'assess', 'study']],
  ['find out',                ['discover', 'determine', 'learn', 'ascertain', 'establish']],
  ['set up',                  ['establish', 'create', 'launch', 'build', 'found']],
  ['point out',               ['highlight', 'indicate', 'note', 'mention', 'draw attention to']],

  // Quality descriptors
  ['a great deal of',         ['a significant amount of', 'considerable', 'much', 'extensive', 'substantial']],
  ['a wide range of',         ['a variety of', 'diverse', 'numerous', 'many different', 'a broad range of']],
  ['a number of',             ['several', 'various', 'multiple', 'many', 'a variety of']],
  ['a large number of',       ['many', 'numerous', 'a great many', 'a high number of', 'large quantities of']],
  ['a small number of',       ['a few', 'several', 'some', 'a handful of', 'limited numbers of']],
  ['in large part',           ['mostly', 'largely', 'predominantly', 'primarily', 'chiefly']],
  ['to a large extent',       ['largely', 'mostly', 'substantially', 'considerably', 'for the most part']],
  ['to a great degree',       ['significantly', 'considerably', 'to a large extent', 'substantially', 'greatly']],
];

/**
 * Apply phrase-level synonym substitution for richer paraphrasing.
 * Longer phrases are matched first to avoid partial replacements.
 */
function applyPhraseSynonyms(text, variantIndex) {
  let r = text;
  // Sort by phrase length descending so longer phrases match first
  const sorted = [...PHRASE_SYNONYMS].sort((a, b) => b[0].length - a[0].length);

  for (const [phrase, alternatives] of sorted) {
    const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    r = r.replace(pattern, (match) => {
      const alt = alternatives[variantIndex % alternatives.length];
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return alt.charAt(0).toUpperCase() + alt.slice(1);
      }
      return alt;
    });
  }
  return r;
}

// ── v5: SENTENCE FRAME TRANSFORMER ───────────────────────────────────────────
// Rewrites entire sentence frames using structural paraphrase templates

const SENTENCE_FRAME_PATTERNS = [
  // "X is important because Y" → "The importance of X lies in Y"
  [/^([A-Z][^.!?]+?) is important because ([^.!?]+)\./i,
   (_, x, y) => `The importance of ${x.toLowerCase()} lies in ${y}.`],
  // "Many people believe that X" → "It is widely believed that X"
  [/^Many people believe that ([^.!?]+)\./i,
   (_, x) => `It is widely believed that ${x}.`],
  // "It is widely believed that X" → "There is a common view that X"
  [/^It is widely believed that ([^.!?]+)\./i,
   (_, x) => `There is a widely held view that ${x}.`],
  // "X allows Y to Z" → "Through X, Y can Z"
  [/^([A-Z][a-z]+(?: [a-z]+)?) allows ([^.]+?) to ([^.!?]+)\./i,
   (_, x, y, z) => `Through ${x.toLowerCase()}, ${y} can ${z}.`],
  // "Despite X, Y" → "While X presents challenges, Y"
  [/^Despite ([^,]+), ([^.!?]+)\./i,
   (_, x, y) => `While ${x} presents challenges, ${y}.`],
  // "X is the reason why Y" → "Y because of X"
  [/^([A-Z][^.]+?) is the reason why ([^.!?]+)\./i,
   (_, x, y) => `${y.charAt(0).toUpperCase() + y.slice(1)} because of ${x.toLowerCase()}.`],
  // "One of the most X things about Y is Z" → "Perhaps the most notable Z about Y is how X"
  [/^One of the most ([a-z]+) ([^.]+?) is ([^.!?]+)\./i,
   (_, adj, noun, detail) => `Among the most ${adj} ${noun} is ${detail}.`],
  // "There are many X that Y" → "Many X Y"
  [/^There are many ([a-z]+(?: [a-z]+)?) that ([^.!?]+)\./i,
   (_, noun, predicate) => `Many ${noun} ${predicate}.`],
  // "This is because X" → "The reason for this is X"
  [/^This is because ([^.!?]+)\./i,
   (_, reason) => `The reason for this is ${reason}.`],
  // "X shows that Y" → "Y, as X demonstrates"
  [/^([A-Z][^.]+?) shows that ([^.!?]+)\./i,
   (_, evidence, conclusion) => `${conclusion.charAt(0).toUpperCase() + conclusion.slice(1)}, as ${evidence.toLowerCase()} demonstrates.`],
  // "As X shows, Y" → "Y — a point illustrated by X"
  [/^As ([^,]+), ([^.!?]+)\./i,
   (_, evidence, point) => `${point.charAt(0).toUpperCase() + point.slice(1)} — a point clearly illustrated by ${evidence.toLowerCase()}.`],
  // "The main purpose of X is to Y" → "X is primarily designed to Y"
  [/^The main purpose of ([^.]+?) is to ([^.!?]+)\./i,
   (_, subj, verb) => `${subj.charAt(0).toUpperCase() + subj.slice(1)} is primarily designed to ${verb}.`],
  // "X helps Y to Z" → "Through X, Y is able to Z"
  [/^([A-Z][a-z]+(?: [a-z]+)?) helps ([^.]+?) to ([^.!?]+)\./i,
   (_, agent, beneficiary, action) => `Through ${agent.toLowerCase()}, ${beneficiary} is able to ${action}.`],
];

function applySentenceFrameTransformer(sentence, frameIndex) {
  for (let i = 0; i < SENTENCE_FRAME_PATTERNS.length; i++) {
    const [pattern, transformer] = SENTENCE_FRAME_PATTERNS[(i + frameIndex) % SENTENCE_FRAME_PATTERNS.length];
    if (pattern.test(sentence)) {
      return sentence.replace(pattern, transformer);
    }
  }
  return sentence;
}

// ── v5: REGISTER SHIFTER ──────────────────────────────────────────────────────
// Shifts text between informal, neutral, and formal registers

const INFORMAL_TO_NEUTRAL = [
  [/\btotally\b/gi,         'completely'],
  [/\bamazing\b/gi,         'impressive'],
  [/\bawesome\b/gi,         'excellent'],
  [/\bcool\b/gi,            'good'],
  [/\bstuff\b/gi,           'things'],
  [/\bthing\b/gi,           'matter'],
  [/\ba ton of\b/gi,        'a great deal of'],
  [/\btons of\b/gi,         'large amounts of'],
  [/\bheaps of\b/gi,        'many'],
  [/\bloads of\b/gi,        'many'],
  [/\bbunch of\b/gi,        'group of'],
  [/\bway more\b/gi,        'significantly more'],
  [/\bway less\b/gi,        'significantly less'],
  [/\bway better\b/gi,      'much better'],
  [/\bway worse\b/gi,       'much worse'],
  [/\bsuper important\b/gi, 'very important'],
  [/\bsuper easy\b/gi,      'very easy'],
  [/\bsuper hard\b/gi,      'very difficult'],
  [/\bsuper helpful\b/gi,   'very helpful'],
  [/\bsuper fast\b/gi,      'very fast'],
  [/\bpretty good\b/gi,     'reasonably good'],
  [/\bpretty bad\b/gi,      'quite poor'],
  [/\bpretty sure\b/gi,     'fairly certain'],
  [/\bpretty clear\b/gi,    'fairly clear'],
  [/\bkind of like\b/gi,    'similar to'],
  [/\bsort of like\b/gi,    'similar to'],
  [/\ba lot better\b/gi,    'considerably better'],
  [/\ba lot worse\b/gi,     'considerably worse'],
  [/\ba lot more\b/gi,      'considerably more'],
  [/\ba lot less\b/gi,      'considerably less'],
  [/\bfigure out\b/gi,      'determine'],
  [/\bcheck out\b/gi,       'examine'],
  [/\bgo ahead\b/gi,        'proceed'],
  [/\bstart off\b/gi,       'begin'],
  [/\bwind up\b/gi,         'end up'],
  [/\bend up\b/gi,          'ultimately become'],
  [/\bshow up\b/gi,         'appear'],
  [/\bturn up\b/gi,         'arrive'],
  [/\bturn out\b/gi,        'prove'],
  [/\ngive up\b/gi,         'abandon'],
  [/\nset off\b/gi,         'begin'],
  [/\nget going\b/gi,       'start'],
  [/\nget done\b/gi,        'complete'],
  [/\nget started\b/gi,     'begin'],
  [/\nget better\b/gi,      'improve'],
  [/\nget worse\b/gi,       'deteriorate'],
  [/\nget bigger\b/gi,      'grow'],
  [/\nget smaller\b/gi,     'shrink'],
  [/\nrun out of\b/gi,      'exhaust the supply of'],
  [/\npick up\b/gi,         'acquire'],
  [/\nput out\b/gi,         'produce'],
  [/\nstep up\b/gi,         'improve'],
  [/\nstep back\b/gi,       'withdraw'],
  [/\nbring up\b/gi,        'mention'],
  [/\ncall off\b/gi,        'cancel'],
  [/\ncome across\b/gi,     'encounter'],
  [/\ncome up with\b/gi,    'devise'],
  [/\ncome in\b/gi,         'enter'],
  [/\ncome out\b/gi,        'emerge'],
];

const NEUTRAL_TO_FORMAL = [
  [/\buse\b/gi,              'utilise'],
  [/\bstart\b/gi,            'initiate'],
  [/\bend\b/gi,              'conclude'],
  [/\bbuy\b/gi,              'purchase'],
  [/\bget\b/gi,              'obtain'],
  [/\bshow\b/gi,             'demonstrate'],
  [/\btell\b/gi,             'inform'],
  [/\bask\b/gi,              'request'],
  [/\bhelp\b/gi,             'assist'],
  [/\btry\b/gi,              'endeavour'],
  [/\bneed\b/gi,             'require'],
  [/\bthink\b/gi,            'consider'],
  [/\bsay\b/gi,              'state'],
  [/\bfind\b/gi,             'identify'],
  [/\bkeep\b/gi,             'maintain'],
  [/\bchange\b/gi,           'modify'],
  [/\bcheck\b/gi,            'verify'],
  [/\bsend\b/gi,             'transmit'],
  [/\bgive\b/gi,             'provide'],
  [/\bbuild\b/gi,            'construct'],
  [/\bmake\b/gi,             'produce'],
  [/\btake\b/gi,             'undertake'],
  [/\bmeet\b/gi,             'fulfil'],
  [/\bpick\b/gi,             'select'],
  [/\bsee\b/gi,              'observe'],
  [/\bknow\b/gi,             'recognise'],
  [/\bunderstand\b/gi,       'comprehend'],
  [/\bfix\b/gi,              'rectify'],
  [/\btalk\b/gi,             'discuss'],
  [/\bwrite\b/gi,            'document'],
  [/\bread\b/gi,             'review'],
  [/\brun\b/gi,              'operate'],
  [/\bwork\b/gi,             'function'],
  [/\bwait\b/gi,             'await'],
  [/\bwant\b/gi,             'desire'],
  [/\blike\b/gi,             'prefer'],
  [/\blook at\b/gi,          'examine'],
  [/\bbig\b/gi,              'substantial'],
  [/\bsmall\b/gi,            'limited'],
  [/\bgood\b/gi,             'satisfactory'],
  [/\bbad\b/gi,              'unsatisfactory'],
  [/\bfast\b/gi,             'rapid'],
  [/\bslow\b/gi,             'gradual'],
  [/\bhard\b/gi,             'challenging'],
  [/\beasy\b/gi,             'straightforward'],
  [/\bclear\b/gi,            'evident'],
  [/\bsure\b/gi,             'certain'],
  [/\breal\b/gi,             'actual'],
  [/\bright\b/gi,            'correct'],
];

function applyRegisterShift(text, targetRegister) {
  let r = text;
  const table = targetRegister === 'formal' ? NEUTRAL_TO_FORMAL : INFORMAL_TO_NEUTRAL;
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

// ── v5: CONNECTOR BANK ────────────────────────────────────────────────────────
// 200+ sentence connectors and transitional expressions

const CONNECTORS = {
  addition:    [
    'Furthermore,', 'Moreover,', 'In addition,', 'What is more,', 'On top of that,',
    'Additionally,', 'Also,', 'As well as this,', 'Not only that,', 'Besides this,',
    'Building on this,', 'To add to this,', 'Along with this,', 'Alongside this,',
    'Equally important,', 'In the same vein,', 'In a similar way,', 'Correspondingly,',
    'In parallel,', 'At the same time,', 'Simultaneously,', 'In tandem with this,',
  ],
  contrast:    [
    'However,', 'On the other hand,', 'That said,', 'By contrast,', 'Conversely,',
    'In contrast,', 'Despite this,', 'Even so,', 'Nevertheless,', 'Nonetheless,',
    'Yet,', 'Still,', 'Then again,', 'All the same,', 'Even with this in mind,',
    'Looking at it differently,', 'From another angle,', 'On the flip side,',
    'That notwithstanding,', 'Regardless of this,', 'While this may be true,',
    'Despite the above,', 'With that said,',
  ],
  cause:       [
    'Because of this,', 'As a result,', 'Consequently,', 'Therefore,', 'Thus,',
    'Hence,', 'For this reason,', 'This explains why', 'This is why', 'As such,',
    'On this basis,', 'Given this,', 'In light of this,', 'This means that',
    'It follows that', 'This leads to', 'This has led to', 'This resulted in',
    'This has caused', 'This triggered', 'This produced', 'This generated',
    'As a consequence,', 'By extension,', 'The knock-on effect is that',
  ],
  example:     [
    'For example,', 'For instance,', 'To illustrate,', 'As an example,',
    'Take, for instance,', 'Consider, for example,', 'A good example of this is',
    'This can be seen in', 'One example is', 'This is illustrated by',
    'As evidence of this,', 'To give a concrete example,', 'To be specific,',
    'In one notable case,', 'A case in point is', 'This is typified by',
    'A prime example would be', 'To demonstrate this,',
  ],
  concession:  [
    'Admittedly,', 'It is true that', 'Of course,', 'Granted,', 'Certainly,',
    'Undeniably,', 'No doubt,', 'It must be acknowledged that', 'It is fair to say that',
    'While it is true that', 'Although this is the case,', 'Even though', 'Whilst',
    'It is worth noting that', 'It should be said that', 'To be fair,',
    'To be clear,', 'In fairness,', 'One must acknowledge that',
  ],
  conclusion:  [
    'In conclusion,', 'To conclude,', 'In summary,', 'To summarise,', 'In short,',
    'All in all,', 'On the whole,', 'Overall,', 'Ultimately,', 'In the end,',
    'To recap,', 'In essence,', 'Taking everything into account,',
    'When all is said and done,', 'Looking at the full picture,',
    'Bringing everything together,', 'In a nutshell,', 'To put it simply,',
    'The key takeaway is that', 'Above all,',
  ],
  elaboration: [
    'To elaborate,', 'To expand on this,', 'In other words,', 'That is,',
    'To clarify,', 'To be more specific,', 'More precisely,', 'In particular,',
    'Specifically,', 'To put it another way,', 'Put differently,', 'To rephrase,',
    'In more detail,', 'More explicitly,', 'Breaking this down,',
    'To go into more depth,', 'Looking more closely,',
  ],
};

function getConnector(type, index) {
  const group = CONNECTORS[type] || CONNECTORS.addition;
  return group[index % group.length];
}

// Export v5 additions
module.exports.applyPhraseSynonyms       = applyPhraseSynonyms;
module.exports.applySentenceFrameTransformer = applySentenceFrameTransformer;
module.exports.applyRegisterShift        = applyRegisterShift;
module.exports.getConnector              = getConnector;
module.exports.PHRASE_SYNONYMS           = PHRASE_SYNONYMS;
module.exports.CONNECTORS                = CONNECTORS;
