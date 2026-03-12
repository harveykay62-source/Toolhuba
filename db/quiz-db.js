// ─── Quiz Database Module ─────────────────────────────────────────────────────
const { pool } = require('./database');
const zlib = require('zlib');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const gzipAsync   = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

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
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
  )`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quizzes_plays  ON quizzes(plays DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quiz_plays_quiz ON quiz_plays(quiz_id)`);

  // Seed starter quizzes
  const { rows } = await pool.query(`SELECT id FROM quizzes WHERE is_starter=true LIMIT 1`);
  if (!rows.length) await seedStarterQuizzes();

  console.log('✅ Quiz database ready');
}

// ── Starter Quiz Data ─────────────────────────────────────────────────────────
async function seedStarterQuizzes() {
  const starters = [
    {
      id: 'starter-general-knowledge',
      title: 'General Knowledge Challenge',
      description: 'Test your general knowledge with 10 diverse questions covering history, pop culture, science, and more!',
      category: 'general',
      cover_emoji: '🌍',
      cover_color: '#6366f1',
      tags: 'general,knowledge,trivia',
      wildcard_enabled: true,
      wildcard_config: JSON.stringify({ enabled: true, frequency: 'rare', types: ['world_swap','reverse_mode','gravity_mode','mirror_mode','secret_dimension','chaos_round'] }),
      time_limit: 30,
      questions: {
        questions: [
          { id:'gk1', type:'multiple_choice', text:'What is the capital of France?', options:['Paris','London','Berlin','Madrid'], correct:0, points:100, explanation:'Paris has been the capital of France since 987 AD.' },
          { id:'gk2', type:'multiple_choice', text:'How many planets are in our solar system?', options:['7','8','9','10'], correct:1, points:100, explanation:'There are 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.' },
          { id:'gk3', type:'true_false', text:'The Great Wall of China is visible from space with the naked eye.', options:['True','False'], correct:1, points:100, explanation:'This is a common myth. The Great Wall is too narrow to be seen from space without aid.' },
          { id:'gk4', type:'multiple_choice', text:'Which element has the chemical symbol "Au"?', options:['Silver','Copper','Gold','Aluminum'], correct:2, points:100, explanation:'Au comes from the Latin "aurum" meaning gold.' },
          { id:'gk5', type:'multiple_choice', text:'In which year did World War II end?', options:['1943','1944','1945','1946'], correct:2, points:150, explanation:'World War II officially ended on September 2, 1945 with Japan\'s surrender.' },
          { id:'gk6', type:'multiple_choice', text:'What is the largest ocean on Earth?', options:['Atlantic','Indian','Arctic','Pacific'], correct:3, points:100, explanation:'The Pacific Ocean covers more than 30% of the Earth\'s surface.' },
          { id:'gk7', type:'true_false', text:'Diamonds are the hardest natural substance on Earth.', options:['True','False'], correct:0, points:100, explanation:'Diamonds score 10 on the Mohs hardness scale, making them the hardest natural mineral.' },
          { id:'gk8', type:'multiple_choice', text:'How many sides does a hexagon have?', options:['5','6','7','8'], correct:1, points:100, explanation:'A hexagon has exactly 6 sides. Think of a honeycomb!' },
          { id:'gk9', type:'multiple_choice', text:'Which country invented the printing press?', options:['China','England','Germany','Italy'], correct:2, points:150, explanation:'Johannes Gutenberg invented the movable-type printing press in Germany around 1440.' },
          { id:'gk10', type:'multiple_choice', text:'What is the speed of light in a vacuum (approximately)?', options:['300,000 km/s','150,000 km/s','450,000 km/s','500,000 km/s'], correct:0, points:200, explanation:'Light travels at approximately 299,792 km/s (often rounded to 300,000 km/s).' }
        ]
      }
    },
    {
      id: 'starter-science-space',
      title: 'Science & Space Explorer',
      description: 'Journey through the cosmos and science lab! Can you conquer these mind-bending science questions?',
      category: 'science',
      cover_emoji: '🚀',
      cover_color: '#0ea5e9',
      tags: 'science,space,physics,biology',
      wildcard_enabled: true,
      wildcard_config: JSON.stringify({ enabled: true, frequency: 'occasional', types: ['world_swap','gravity_mode','object_interaction','secret_dimension'] }),
      time_limit: 35,
      questions: {
        questions: [
          { id:'ss1', type:'multiple_choice', text:'What is the closest planet to the Sun?', options:['Venus','Earth','Mars','Mercury'], correct:3, points:100, explanation:'Mercury is the closest planet to the Sun, orbiting at ~57.9 million km.' },
          { id:'ss2', type:'multiple_choice', text:'What gas do plants absorb during photosynthesis?', options:['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'], correct:2, points:100, explanation:'Plants absorb CO₂ and release O₂ during photosynthesis.' },
          { id:'ss3', type:'true_false', text:'Black holes are actually completely dark and invisible.', options:['True','False'], correct:1, points:150, explanation:'Black holes can be detected! Hot matter swirling around them creates bright accretion disks visible even from Earth.' },
          { id:'ss4', type:'multiple_choice', text:'What is the powerhouse of the cell?', options:['Nucleus','Ribosome','Mitochondria','Golgi apparatus'], correct:2, points:100, explanation:'The mitochondria produces ATP — the cell\'s energy currency — through cellular respiration.' },
          { id:'ss5', type:'multiple_choice', text:'How long does it take light from the Sun to reach Earth?', options:['8 minutes','1 hour','24 minutes','1 second'], correct:0, points:150, explanation:'Sunlight takes about 8 minutes and 20 seconds to travel 150 million km to Earth.' },
          { id:'ss6', type:'multiple_choice', text:'What is the most abundant element in the universe?', options:['Oxygen','Carbon','Helium','Hydrogen'], correct:3, points:100, explanation:'Hydrogen makes up about 75% of all normal matter in the universe.' },
          { id:'ss7', type:'true_false', text:'An astronaut\'s height increases slightly in space.', options:['True','False'], correct:0, points:150, explanation:'Without gravity compressing the spine, astronauts can grow up to 2 inches taller in space!' },
          { id:'ss8', type:'multiple_choice', text:'What is DNA\'s full name?', options:['Deoxyribonucleic Acid','Dipeptide Nitrogen Aggregate','Dynamic Neural Array','Dibasic Nucleotide Agent'], correct:0, points:100, explanation:'DNA = Deoxyribonucleic Acid. It carries genetic information in all living organisms.' },
          { id:'ss9', type:'multiple_choice', text:'Which planet has the most moons?', options:['Jupiter','Saturn','Uranus','Neptune'], correct:1, points:200, explanation:'Saturn has 146 confirmed moons as of 2023, beating Jupiter\'s 95!' },
          { id:'ss10', type:'multiple_choice', text:'What causes a rainbow?', options:['Reflection only','Refraction and dispersion of light','Diffraction of UV rays','Absorption of infrared light'], correct:1, points:150, explanation:'Rainbows form when sunlight is refracted, dispersed, and internally reflected by water droplets.' }
        ]
      }
    },
    {
      id: 'starter-world-geography',
      title: 'World Geography Quest',
      description: 'Navigate the globe! From mountain peaks to deep oceans — how well do you really know our planet?',
      category: 'geography',
      cover_emoji: '🗺️',
      cover_color: '#10b981',
      tags: 'geography,world,countries,capitals',
      wildcard_enabled: true,
      wildcard_config: JSON.stringify({ enabled: true, frequency: 'rare', types: ['world_swap','reverse_mode','mirror_mode','chaos_round'] }),
      time_limit: 25,
      questions: {
        questions: [
          { id:'wg1', type:'multiple_choice', text:'Which is the longest river in the world?', options:['Amazon','Mississippi','Yangtze','Nile'], correct:3, points:100, explanation:'The Nile River stretches approximately 6,650 km through northeastern Africa.' },
          { id:'wg2', type:'multiple_choice', text:'What is the capital of Australia?', options:['Sydney','Melbourne','Canberra','Brisbane'], correct:2, points:100, explanation:'Many people think Sydney, but Canberra has been Australia\'s capital since 1913!' },
          { id:'wg3', type:'multiple_choice', text:'Which country has the most natural lakes?', options:['Russia','USA','Brazil','Canada'], correct:3, points:150, explanation:'Canada has over 3 million lakes — more than the rest of the world combined!' },
          { id:'wg4', type:'true_false', text:'Russia is both the largest country by area and borders the most countries.', options:['True','False'], correct:1, points:100, explanation:'Russia is the largest by area, but China and Russia are tied at 14 bordering countries each.' },
          { id:'wg5', type:'multiple_choice', text:'What is the smallest country in the world?', options:['Monaco','Liechtenstein','Vatican City','San Marino'], correct:2, points:100, explanation:'Vatican City covers just 44 hectares and has a population of around 800 people.' },
          { id:'wg6', type:'multiple_choice', text:'On which continent is the Sahara Desert located?', options:['Asia','Australia','South America','Africa'], correct:3, points:100, explanation:'The Sahara stretches across much of North Africa, covering about 9 million square kilometres.' },
          { id:'wg7', type:'multiple_choice', text:'Which ocean is the deepest?', options:['Atlantic','Indian','Arctic','Pacific'], correct:3, points:150, explanation:'The Pacific Ocean contains the Mariana Trench — the deepest point on Earth at ~11 km deep.' },
          { id:'wg8', type:'true_false', text:'New Zealand is part of the Australian continent.', options:['True','False'], correct:1, points:100, explanation:'New Zealand sits on its own tectonic plate (the Pacific Plate) and is a separate country.' },
          { id:'wg9', type:'multiple_choice', text:'What is the highest mountain in the world?', options:['K2','Mount Everest','Kangchenjunga','Lhotse'], correct:1, points:100, explanation:'Mount Everest stands at 8,848.86 metres above sea level in the Himalayan range.' },
          { id:'wg10', type:'multiple_choice', text:'How many countries are in Africa?', options:['48','54','60','66'], correct:1, points:200, explanation:'Africa has 54 recognized sovereign countries, making it the continent with the most nations.' }
        ]
      }
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
        quiz.wildcard_enabled,
        quiz.wildcard_config,
        quiz.cover_emoji, quiz.cover_color, compressed,
        quiz.tags, quiz.time_limit,
        Math.floor(Math.random() * 800) + 200
      ]
    );
  }
  console.log('✅ Starter quizzes seeded');
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

  if (category && category !== 'all') {
    where += ` AND q.category=$${pi++}`;
    params.push(category);
  }
  if (search) {
    where += ` AND (q.title ILIKE $${pi} OR q.description ILIKE $${pi} OR q.tags ILIKE $${pi})`;
    params.push(`%${search}%`);
    pi++;
  }

  const order = ['plays','likes','created_at'].includes(orderBy) ? orderBy : 'plays';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT q.id,q.title,q.description,q.category,q.creator_name,q.plays,q.likes,
            q.questions_count,q.wildcard_enabled,q.cover_emoji,q.cover_color,q.tags,
            q.time_limit,q.created_at,q.is_starter
     FROM quizzes q
     ${where}
     ORDER BY q.${order} DESC
     LIMIT $${pi++} OFFSET $${pi++}`,
    params
  );
  return rows;
}

module.exports = {
  initQuizDB, compressQuestions, decompressQuestions,
  getQuizWithQuestions, getQuizList,
};
