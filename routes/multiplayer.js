// ─── Multiplayer Routes ──────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { TEACHER_QUIZZES, CURRICULUM_QUIZZES } = require('../game/teacher-quizzes');
const { BLOOKS, GAME_MODES, EVOLUTION_STAGES, AI_BOTS, isEducatorEmail } = require('../game/engine');

// Helper: check if session user has educator-level access
function isEducatorAccess(session) {
  const email = session?.email || '';
  const role  = session?.role  || 'guest';
  return isEducatorEmail(email) || ['admin','gamemaster','educator'].includes(role);
}

// ── Get game modes & blooks (public) ─────────────────────────────────────────
router.get('/modes', (req, res) => {
  res.json({
    modes: Object.entries(GAME_MODES).map(([id, m]) => ({
      id, name: m.name, icon: m.icon, desc: m.desc, color: m.color,
    })),
    blooks: BLOOKS,
    evolutionStages: EVOLUTION_STAGES,
    bots: AI_BOTS,
  });
});

// ── Get teacher quizzes (verified educators / game masters) ──────────────────
router.get('/teacher-quizzes', (req, res) => {
  if (!isEducatorAccess(req.session)) {
    return res.status(403).json({
      error: 'Teacher quizzes are only available to verified educators.',
      hint: 'Register with a school email (.edu, .sch, .ac) or redeem an educator promo code.',
    });
  }

  const quizList = TEACHER_QUIZZES.map(q => ({
    id: q.id, year: q.year, title: q.title, description: q.description,
    emoji: q.emoji, color: q.color, difficulty: q.difficulty,
    questionCount: q.questions.length, timeLimit: q.timeLimit,
  }));

  res.json({ quizzes: quizList });
});

// ── Get teacher quiz with questions ─────────────────────────────────────────
router.get('/teacher-quizzes/:id', (req, res) => {
  if (!isEducatorAccess(req.session)) {
    return res.status(403).json({ error: 'Verified educator access required.' });
  }
  const quiz = TEACHER_QUIZZES.find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
  res.json({ quiz });
});

// ── Get curriculum quizzes (Y1–Y13 cross-subject, public preview) ────────────
router.get('/curriculum-quizzes', (req, res) => {
  const yearFilter = req.query.year ? parseInt(req.query.year) : null;
  const subjectFilter = req.query.subject || null;

  let list = CURRICULUM_QUIZZES;
  if (yearFilter) list = list.filter(q => q.year === yearFilter);
  if (subjectFilter) list = list.filter(q => q.subject === subjectFilter);

  res.json({
    quizzes: list.map(q => ({
      id: q.id, year: q.year, subject: q.subject, title: q.title,
      emoji: q.emoji, color: q.color, difficulty: q.difficulty,
      questionCount: q.questions.length, timeLimit: q.timeLimit,
    })),
    totalYears: [...new Set(CURRICULUM_QUIZZES.map(q => q.year))].sort((a,b)=>a-b),
    subjects: [...new Set(CURRICULUM_QUIZZES.map(q => q.subject))],
  });
});

// ── Get single curriculum quiz with questions ────────────────────────────────
router.get('/curriculum-quizzes/:id', (req, res) => {
  const quiz = CURRICULUM_QUIZZES.find(q => q.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Curriculum quiz not found.' });
  res.json({ quiz });
});

// ── Verify educator status ───────────────────────────────────────────────────
router.get('/educator-status', (req, res) => {
  const email = req.session?.email || '';
  const role  = req.session?.role  || 'guest';
  res.json({
    isVerified: isEducatorAccess(req.session),
    isGamemaster: ['admin','gamemaster'].includes(role),
    email: email ? email.replace(/(.{2}).*(@.*)/, '$1***$2') : '',
    role,
  });
});

// ── AI Simplifier endpoint (SEN Mode) ────────────────────────────────────────
router.post('/simplify-question', (req, res) => {
  const { question, options } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });

  // Simple rule-based simplifier (no external API needed)
  const simplifications = {
    // Replace complex words with simpler ones
    'algorithm': 'set of steps',
    'computational': 'computer-based',
    'iteration': 'repeating',
    'decomposition': 'breaking into parts',
    'abstraction': 'simplifying',
    'encapsulation': 'hiding details',
    'polymorphism': 'many forms',
    'inheritance': 'passing down features',
    'concatenation': 'joining together',
    'Boolean': 'true/false',
    'variable': 'storage box',
    'function': 'reusable action',
    'parameter': 'input value',
    'authentication': 'proving who you are',
    'encryption': 'scrambling for safety',
    'redundancy': 'extra copies',
    'normalisation': 'organising neatly',
    'traversal': 'visiting each item',
    'binary': 'using 0s and 1s',
    'hexadecimal': 'base-16 numbers',
    'protocol': 'set of rules',
    'bandwidth': 'data speed',
    'latency': 'delay time',
    'phishing': 'tricking online',
    'malware': 'harmful software',
    'firewall': 'security guard',
  };

  let simplified = question;
  for (const [complex, simple] of Object.entries(simplifications)) {
    const regex = new RegExp(complex, 'gi');
    simplified = simplified.replace(regex, `${simple}`);
  }

  // Also simplify options if provided
  let simplifiedOptions = options;
  if (options && Array.isArray(options)) {
    simplifiedOptions = options.map(opt => {
      let s = opt;
      for (const [complex, simple] of Object.entries(simplifications)) {
        s = s.replace(new RegExp(complex, 'gi'), simple);
      }
      return s;
    });
  }

  res.json({ simplified, simplifiedOptions });
});

module.exports = router;
