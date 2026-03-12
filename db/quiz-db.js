// ─── Quiz Database Module — ToolHub AI Evolution ─────────────────────────────
const { pool } = require('./database');
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const gzipAsync   = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// ── Atomic write helper (prevents corruption on crash) ────────────────────────
async function atomicWriteJSON(filePath, data) {
  const dir  = path.dirname(filePath);
  const tmp  = filePath + '.tmp_' + Date.now();
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch {}
    throw e;
  }
}

// ── Compression helpers ───────────────────────────────────────────────────────
async function compressQuestions(questionsObj) {
  const json = JSON.stringify(questionsObj);
  const buf  = await gzipAsync(Buffer.from(json, 'utf8'));
  return buf.toString('base64');
}

async function decompressQuestions(b64) {
  if (!b64) return { questions: [] };
  try {
    const buf  = Buffer.from(b64, 'base64');
    const raw  = await gunzipAsync(buf);
    return JSON.parse(raw.toString('utf8'));
  } catch { return { questions: [] }; }
}

// ── Table initialization ──────────────────────────────────────────────────────
async function initQuizDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS quizzes (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    category     TEXT DEFAULT 'general',
    creator_id   INTEGER,
    creator_name TEXT DEFAULT 'Anonymous',
    status       TEXT DEFAULT 'pending',
    plays        INTEGER DEFAULT 0,
    likes        INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    wildcard_enabled BOOLEAN DEFAULT false,
    wildcard_config  TEXT DEFAULT '{}',
    cover_emoji  TEXT DEFAULT '🧠',
    cover_color  TEXT DEFAULT '#6366f1',
    compressed_data TEXT,
    tags         TEXT DEFAULT '',
    time_limit   INTEGER DEFAULT 30,
    is_starter   BOOLEAN DEFAULT false,
    reject_reason TEXT DEFAULT '',
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    approved_at  TIMESTAMP,
    approved_by  INTEGER
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS quiz_plays (
    id          SERIAL PRIMARY KEY,
    quiz_id     TEXT NOT NULL,
    user_id     INTEGER,
    player_name TEXT DEFAULT 'Guest',
    score       INTEGER DEFAULT 0,
    max_score   INTEGER DEFAULT 0,
    pct         INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    wildcards_triggered INTEGER DEFAULT 0,
    boss_battles_beaten INTEGER DEFAULT 0,
    bets_won    INTEGER DEFAULT 0,
    streak_max  INTEGER DEFAULT 0,
    time_taken  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS quiz_likes (
    id       SERIAL PRIMARY KEY,
    quiz_id  TEXT NOT NULL,
    user_id  INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(quiz_id, user_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS user_quiz_profiles (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER UNIQUE NOT NULL,
    bio           TEXT DEFAULT '',
    display_3d    TEXT DEFAULT 'globe',
    total_plays   INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    best_score    INTEGER DEFAULT 0,
    badges        TEXT DEFAULT '[]',
    showcase_3d   TEXT DEFAULT 'none',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
  )`);

  const migrations = [
    `ALTER TABLE quiz_plays ADD COLUMN IF NOT EXISTS boss_battles_beaten INTEGER DEFAULT 0`,
    `ALTER TABLE quiz_plays ADD COLUMN IF NOT EXISTS bets_won INTEGER DEFAULT 0`,
    `ALTER TABLE quiz_plays ADD COLUMN IF NOT EXISTS streak_max INTEGER DEFAULT 0`,
    `ALTER TABLE user_quiz_profiles ADD COLUMN IF NOT EXISTS badges TEXT DEFAULT '[]'`,
    `ALTER TABLE user_quiz_profiles ADD COLUMN IF NOT EXISTS showcase_3d TEXT DEFAULT 'none'`,
  ];
  for (const sql of migrations) { try { await pool.query(sql); } catch {} }

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quizzes_plays  ON quizzes(plays DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quiz_plays_quiz ON quiz_plays(quiz_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quiz_plays_user ON quiz_plays(user_id)`);

  const { rows } = await pool.query(`SELECT id FROM quizzes WHERE is_starter=true LIMIT 1`);
  if (!rows.length) await seedStarterQuizzes();
  console.log('✅ Quiz database ready');
}

// ── Creator Studio Analytics ──────────────────────────────────────────────────
async function getCreatorStudio(userId) {
  const [quizzes, totalPlays, recentPlays] = await Promise.all([
    pool.query(
      `SELECT id, title, cover_emoji, cover_color, plays, likes, questions_count, status, created_at
       FROM quizzes WHERE creator_id=$1 ORDER BY plays DESC`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*) as total, COALESCE(AVG(pct),0) as avg_pct, COALESCE(MAX(score),0) as top_score
       FROM quiz_plays qp JOIN quizzes q ON q.id=qp.quiz_id WHERE q.creator_id=$1`,
      [userId]
    ),
    pool.query(
      `SELECT qp.quiz_id, q.title, qp.player_name, qp.score, qp.pct, qp.created_at
       FROM quiz_plays qp JOIN quizzes q ON q.id=qp.quiz_id WHERE q.creator_id=$1
       ORDER BY qp.created_at DESC LIMIT 20`,
      [userId]
    ),
  ]);
  return {
    quizzes: quizzes.rows,
    totalPlays: parseInt(totalPlays.rows[0].total),
    avgPct: Math.round(parseFloat(totalPlays.rows[0].avg_pct)),
    topScore: parseInt(totalPlays.rows[0].top_score),
    recentPlays: recentPlays.rows,
  };
}

// ── Badge computation ─────────────────────────────────────────────────────────
function computeBadges(profile, stats) {
  const badges = [];
  const plays = parseInt(stats?.plays || 0);
  const quizCount = parseInt(profile?.total_quizzes || 0);
  const best = parseInt(profile?.best_score || 0);
  if (plays >= 1)   badges.push({ id:'first_play',    label:'First Play',       icon:'🎮', color:'#6366f1' });
  if (plays >= 10)  badges.push({ id:'quiz_fan',      label:'Quiz Fan',         icon:'⭐', color:'#f59e0b' });
  if (plays >= 50)  badges.push({ id:'trivia_addict', label:'Trivia Addict',    icon:'🧠', color:'#ec4899' });
  if (plays >= 100) badges.push({ id:'trivia_master', label:'Trivia Master',    icon:'🏆', color:'#10b981' });
  if (quizCount >= 1)  badges.push({ id:'creator',    label:'Quiz Creator',     icon:'✏️', color:'#0ea5e9' });
  if (quizCount >= 5)  badges.push({ id:'prolific',   label:'Prolific Creator', icon:'🔥', color:'#ef4444' });
  if (best >= 100)  badges.push({ id:'perfectionist', label:'Perfectionist',    icon:'💎', color:'#8b5cf6' });
  if (best >= 80)   badges.push({ id:'high_scorer',   label:'High Scorer',      icon:'🥇', color:'#fbbf24' });
  return badges;
}

// ── Starter Quiz Data ─────────────────────────────────────────────────────────
async function seedStarterQuizzes() {
  const starters = [
    {
      id: 'starter-general-knowledge',
      title: 'General Knowledge Challenge',
      description: 'Test your general knowledge with 10 diverse questions covering history, pop culture, science, and more!',
      category: 'general', cover_emoji: '🌍', cover_color: '#6366f1',
      tags: 'general,knowledge,trivia', wildcard_enabled: true,
      wildcard_config: JSON.stringify({ enabled: true, frequency: 'rare', types: ['world_swap','reverse_mode','gravity_mode','mirror_mode','secret_dimension','chaos_round'] }),
      time_limit: 30,
      questions: { questions: [
        { id:'gk1',  type:'multiple_choice', text:'What is the capital of France?', options:['Paris','London','Berlin','Madrid'], correct:0, points:100, explanation:'Paris has been the capital of France since 987 AD.' },
        { id:'gk2',  type:'multiple_choice', text:'How many planets are in our solar system?', options:['7','8','9','10'], correct:1, points:100, explanation:'There are 8 planets in our solar system.' },
        { id:'gk3',  type:'true_false', text:'The Great Wall of China is visible from space with the naked eye.', options:['True','False'], correct:1, points:100, explanation:'Common myth — the Great Wall is too narrow to be seen from space without aid.' },
        { id:'gk4',  type:'multiple_choice', text:'Which element has the chemical symbol "Au"?', options:['Silver','Copper','Gold','Aluminum'], correct:2, points:100, explanation:'Au comes from the Latin "aurum" meaning gold.' },
        { id:'gk5',  type:'multiple_choice', text:'In which year did World War II end?', options:['1943','1944','1945','1946'], correct:2, points:150, explanation:'WWII officially ended September 2, 1945.' },
        { id:'gk6',  type:'multiple_choice', text:'What is the largest ocean on Earth?', options:['Atlantic','Indian','Arctic','Pacific'], correct:3, points:100 },
        { id:'gk7',  type:'true_false', text:'Diamonds are the hardest natural substance on Earth.', options:['True','False'], correct:0, points:100 },
        { id:'gk8',  type:'multiple_choice', text:'How many sides does a hexagon have?', options:['5','6','7','8'], correct:1, points:100 },
        { id:'gk9',  type:'multiple_choice', text:'Which country invented the printing press?', options:['China','England','Germany','Italy'], correct:2, points:150 },
        { id:'gk10', type:'multiple_choice', text:'What is the speed of light in a vacuum (approximately)?', options:['300,000 km/s','150,000 km/s','450,000 km/s','500,000 km/s'], correct:0, points:200 }
      ]}
    },
    {
      id: 'starter-science-space',
      title: 'Science & Space Explorer',
      description: 'Journey through the cosmos and science lab! Can you conquer these mind-bending science questions?',
      category: 'science', cover_emoji: '🚀', cover_color: '#0ea5e9',
      tags: 'science,space,physics,biology', wildcard_enabled: true,
      wildcard_config: JSON.stringify({ enabled: true, frequency: 'occasional', types: ['world_swap','gravity_mode','object_interaction','secret_dimension'] }),
      time_limit: 35,
      questions: { questions: [
        { id:'ss1', type:'multiple_choice', text:'What is the closest planet to the Sun?', options:['Venus','Earth','Mars','Mercury'], correct:3, points:100 },
        { id:'ss2', type:'multiple_choice', text:'What gas do plants absorb during photosynthesis?', options:['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'], correct:2, points:100 },
        { id:'ss3', type:'true_false', text:'Black holes are completely dark and invisible.', options:['True','False'], correct:1, points:150 },
        { id:'ss4', type:'multiple_choice', text:'What is the powerhouse of the cell?', options:['Nucleus','Ribosome','Mitochondria','Golgi apparatus'], correct:2, points:100 },
        { id:'ss5', type:'multiple_choice', text:'How long does it take light from the Sun to reach Earth?', options:['8 minutes','1 hour','24 minutes','1 second'], correct:0, points:150 },
        { id:'ss6', type:'multiple_choice', text:'What is the most abundant element in the universe?', options:['Oxygen','Carbon','Helium','Hydrogen'], correct:3, points:100 },
        { id:'ss7', type:'true_false', text:'An astronaut\'s height increases slightly in space.', options:['True','False'], correct:0, points:150 },
        { id:'ss8', type:'multiple_choice', text:'What is DNA\'s full name?', options:['Deoxyribonucleic Acid','Dipeptide Nitrogen Aggregate','Dynamic Neural Array','Dibasic Nucleotide Agent'], correct:0, points:100 },
        { id:'ss9', type:'multiple_choice', text:'Which planet has the most moons?', options:['Jupiter','Saturn','Uranus','Neptune'], correct:1, points:200, explanation:'Saturn has 146 confirmed moons as of 2023!' },
        { id:'ss10',type:'multiple_choice', text:'What causes a rainbow?', options:['Reflection only','Refraction and dispersion of light','Diffraction of UV rays','Absorption of infrared'], correct:1, points:150 }
      ]}
    },
    {
      id: 'starter-world-geography',
      title: 'World Geography Quest',
      description: 'Navigate the globe! From mountain peaks to deep oceans — how well do you really know our planet?',
      category: 'geography', cover_emoji: '🗺️', cover_color: '#10b981',
      tags: 'geography,world,countries,capitals', wildcard_enabled: true,
      wildcard_config: JSON.stringify({ enabled: true, frequency: 'rare', types: ['world_swap','reverse_mode','mirror_mode','chaos_round'] }),
      time_limit: 25,
      questions: { questions: [
        { id:'wg1', type:'multiple_choice', text:'Which is the longest river in the world?', options:['Amazon','Mississippi','Yangtze','Nile'], correct:3, points:100 },
        { id:'wg2', type:'multiple_choice', text:'What is the capital of Australia?', options:['Sydney','Melbourne','Canberra','Brisbane'], correct:2, points:100, explanation:'Many people think Sydney, but Canberra has been the capital since 1913!' },
        { id:'wg3', type:'multiple_choice', text:'Which country has the most natural lakes?', options:['Russia','USA','Brazil','Canada'], correct:3, points:150 },
        { id:'wg4', type:'true_false', text:'Russia borders more countries than any other nation.', options:['True','False'], correct:1, points:100, explanation:'Russia and China are tied at 14 bordering countries each.' },
        { id:'wg5', type:'multiple_choice', text:'What is the smallest country in the world?', options:['Monaco','Liechtenstein','Vatican City','San Marino'], correct:2, points:100 },
        { id:'wg6', type:'multiple_choice', text:'On which continent is the Sahara Desert?', options:['Asia','Australia','South America','Africa'], correct:3, points:100 },
        { id:'wg7', type:'multiple_choice', text:'Which ocean is the deepest?', options:['Atlantic','Indian','Arctic','Pacific'], correct:3, points:150 },
        { id:'wg8', type:'true_false', text:'New Zealand is part of the Australian continent.', options:['True','False'], correct:1, points:100 },
        { id:'wg9', type:'multiple_choice', text:'What is the highest mountain in the world?', options:['K2','Mount Everest','Kangchenjunga','Lhotse'], correct:1, points:100 },
        { id:'wg10',type:'multiple_choice', text:'How many countries are in Africa?', options:['48','54','60','66'], correct:1, points:200 }
      ]}
    },

    // ── JackSucksAtLife FLAGSHIP QUIZ ─────────────────────────────────────────
    {
      id: 'starter-jacksucksatlife',
      title: 'The Ultimate JackSucksAtLife Quiz ▶️',
      description: '🎬 How well do you know Jack? From Silver Play Buttons to mystery channels — Boss Battles, Reality Shifts, and a LEGENDARY final question await. Can you beat the algorithm?',
      category: 'pop-culture', cover_emoji: '▶️', cover_color: '#cc0000',
      tags: 'jacksucksatlife,youtube,jack,creator,play-button,pop-culture',
      wildcard_enabled: true,
      wildcard_config: JSON.stringify({
        enabled: true, frequency: 'occasional',
        types: ['world_swap','reverse_mode','mirror_mode','secret_dimension','gravity_mode'],
        youtube_theme: true
      }),
      time_limit: 35,
      questions: { questions: [
        {
          id:'jack1', type:'multiple_choice',
          text:'What is the real first name of JackSucksAtLife?',
          options:['Jake','Jack','James','John'],
          correct:1, points:100,
          explanation:'His real name is Jack — and the channel name is fully intentional! 😄'
        },
        {
          id:'jack2', type:'multiple_choice',
          text:'JackSucksAtLife is primarily known for making videos about what?',
          options:['Gaming walkthroughs','Subscriber milestones & YouTube Play Buttons','Cooking challenges','Music covers'],
          correct:1, points:150,
          explanation:'Jack is famous for YouTube Play Button unboxings and subscriber milestone content!'
        },
        {
          id:'jack3', type:'true_false',
          text:'JackSucksAtLife has received a YouTube Silver Play Button (100K subscribers).',
          options:['True','False'],
          correct:0, points:100,
          explanation:'Yes! Jack hit 100K subscribers and received the coveted Silver Play Button!'
        },
        {
          id:'jack4', type:'multiple_choice',
          text:'What material/colour is the YouTube Silver Play Button award?',
          options:['Shiny gold finish','Brushed silver / nickel','Matte white acrylic','Chrome blue titanium'],
          correct:1, points:100,
          explanation:'The Silver Play Button is a brushed nickel/silver plaque awarded at 100,000 subscribers.'
        },
        {
          id:'jack5', type:'multiple_choice',
          text:'🔥 BOSS BATTLE 🔥 — What subscriber milestone earns the YouTube GOLD Play Button?',
          options:['500,000','1,000,000','2,000,000','5,000,000'],
          correct:1, points:300, isBoss:true,
          explanation:'One million subscribers earns you the iconic Gold Play Button!'
        },
        {
          id:'jack6', type:'multiple_choice',
          text:'Which of these is a real alternate JackSucksAtLife channel name?',
          options:['JackGetsAtLife','JackSucksAtStuff','JackSucksAtMedia','JackIsSoGood'],
          correct:1, points:150,
          explanation:'"JackSucksAtStuff" is one of Jack\'s real secondary channels!'
        },
        {
          id:'jack7', type:'multiple_choice',
          text:'🪞 REALITY SHIFT — What shape are YouTube Play Button awards?',
          options:['Circular disc','Triangle (play button shape)','Rectangular plaque','Diamond shape'],
          correct:2, points:200,
          explanation:'YouTube Play Buttons are rectangular plaques with the play button logo engraved on them!'
        },
        {
          id:'jack8', type:'multiple_choice',
          text:'What is the Diamond Play Button milestone on YouTube?',
          options:['1 million','5 million','10 million','50 million'],
          correct:2, points:200,
          explanation:'The Diamond Play Button is awarded at 10 million subscribers!'
        },
        {
          id:'jack9', type:'true_false',
          text:'The YouTube Custom Creator Award (Red Diamond) is given at 100 million subscribers.',
          options:['True','False'],
          correct:0, points:150,
          explanation:'Yes! The Red Diamond / Custom Creator Award is YouTube\'s ultimate award at 100M subs!'
        },
        {
          id:'jack10', type:'multiple_choice',
          text:'⚡ FINAL BOSS ⚡ — In what year did Jack\'s main channel first cross 1 MILLION subscribers?',
          options:['2018','2019','2020','2021'],
          correct:2, points:500, isBoss:true, isFinalBoss:true,
          explanation:'Jack\'s channel crossed 1 million subscribers in 2020, earning his Gold Play Button!'
        }
      ]}
    }
  ];

  for (const quiz of starters) {
    const compressed = await compressQuestions(quiz.questions);
    await pool.query(
      `INSERT INTO quizzes (id,title,description,category,creator_id,creator_name,status,questions_count,
        wildcard_enabled,wildcard_config,cover_emoji,cover_color,compressed_data,tags,time_limit,is_starter,
        approved_at,plays)
       VALUES ($1,$2,$3,$4,NULL,'ToolHub AI','approved',$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        quiz.id, quiz.title, quiz.description, quiz.category,
        quiz.questions.questions.length,
        quiz.wildcard_enabled, quiz.wildcard_config,
        quiz.cover_emoji, quiz.cover_color, compressed,
        quiz.tags, quiz.time_limit,
        Math.floor(Math.random() * 800) + 200
      ]
    );
  }
  console.log('✅ Starter quizzes seeded (incl. JackSucksAtLife Boss Battle)');
}

// ── Quiz helpers ──────────────────────────────────────────────────────────────
async function getQuizWithQuestions(id) {
  const { rows } = await pool.query(`SELECT * FROM quizzes WHERE id=$1`, [id]);
  if (!rows.length) return null;
  const quiz = rows[0];
  const data = await decompressQuestions(quiz.compressed_data);
  return { ...quiz, questions: data.questions || [] };
}

async function getQuizList({ status = 'approved', category, search, limit = 20, offset = 0, orderBy = 'plays' } = {}) {
  let where = `WHERE q.status=$1`;
  const params = [status];
  let pi = 2;
  if (category && category !== 'all') { where += ` AND q.category=$${pi++}`; params.push(category); }
  if (search) {
    where += ` AND (q.title ILIKE $${pi} OR q.description ILIKE $${pi} OR q.tags ILIKE $${pi})`;
    params.push(`%${search}%`); pi++;
  }
  const order = ['plays','likes','created_at'].includes(orderBy) ? orderBy : 'plays';
  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT q.id,q.title,q.description,q.category,q.creator_name,q.plays,q.likes,
            q.questions_count,q.wildcard_enabled,q.cover_emoji,q.cover_color,q.tags,
            q.time_limit,q.created_at,q.is_starter
     FROM quizzes q ${where} ORDER BY q.${order} DESC LIMIT $${pi++} OFFSET $${pi++}`,
    params
  );
  return rows;
}

module.exports = {
  initQuizDB, compressQuestions, decompressQuestions,
  getQuizWithQuestions, getQuizList,
  getCreatorStudio, computeBadges, atomicWriteJSON,
};
