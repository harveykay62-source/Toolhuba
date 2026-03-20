/**
 * ToolHub — Game Room Manager
 * Classic mode: synchronized host-driven questions with points.
 * Gold Quest mode: individual question decks, mystery chests, gold economy.
 *
 * Uses Redis for storage with in-memory Map fallback (dev / no Redis env).
 * All scoring is SERVER-SIDE only. Clients never send scores directly.
 */
'use strict';

const ROOM_TTL = 60 * 60 * 4; // 4 hours

// ── Redis or in-memory fallback ───────────────────────────────────────────────
let redis = null;
const memoryStore = new Map();

function tryRedis() {
  if (redis || !process.env.REDIS_URL) return;
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    redis.on('error', e => { console.warn('Redis error (using memory fallback):', e.message); redis = null; });
    console.log('✅ Redis connected for game rooms');
  } catch (e) {
    console.warn('ioredis not available, using in-memory room store');
    redis = null;
  }
}
tryRedis();

// ── Low-level get/set ─────────────────────────────────────────────────────────
async function storeRoom(code, room) {
  const json = JSON.stringify(room);
  if (redis) {
    try { await redis.set(`room:${code}`, json, 'EX', ROOM_TTL); return; } catch {}
  }
  memoryStore.set(`room:${code}`, { value: json, exp: Date.now() + ROOM_TTL * 1000 });
}

async function loadRoom(code) {
  if (redis) {
    try {
      const raw = await redis.get(`room:${code}`);
      return raw ? JSON.parse(raw) : null;
    } catch {}
  }
  const entry = memoryStore.get(`room:${code}`);
  if (!entry) return null;
  if (Date.now() > entry.exp) { memoryStore.delete(`room:${code}`); return null; }
  return JSON.parse(entry.value);
}

async function deleteRoom(code) {
  if (redis) { try { await redis.del(`room:${code}`); } catch {} }
  memoryStore.delete(`room:${code}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════════════════════════════════════════════════
// CHEST RNG — Gold Quest
// ══════════════════════════════════════════════════════════════════════════════

const CHEST_TABLE = [
  // Flat Gold (~55%)
  { type: 'gold', weight: 18, gen: () => ({ amount: 10,  label: '+10 Gold',  icon: '🪙' }) },
  { type: 'gold', weight: 14, gen: () => ({ amount: 50,  label: '+50 Gold',  icon: '🪙' }) },
  { type: 'gold', weight: 12, gen: () => ({ amount: 100, label: '+100 Gold', icon: '💰' }) },
  { type: 'gold', weight: 8,  gen: () => ({ amount: 250, label: '+250 Gold', icon: '💰' }) },
  { type: 'gold', weight: 3,  gen: () => ({ amount: 500, label: '+500 Gold', icon: '💎' }) },

  // Multipliers (~18%)
  { type: 'multiply', weight: 7, gen: () => ({ factor: 1.1, label: '1.1x Multiplier', icon: '✨' }) },
  { type: 'multiply', weight: 5, gen: () => ({ factor: 1.2, label: '1.2x Multiplier', icon: '✨' }) },
  { type: 'multiply', weight: 4, gen: () => ({ factor: 1.5, label: '1.5x Multiplier', icon: '🔥' }) },
  { type: 'multiply', weight: 2, gen: () => ({ factor: 2.0, label: '2x Multiplier',   icon: '🔥' }) },

  // Steals (~12%)
  { type: 'steal', weight: 5, gen: () => ({ pct: 0.10, label: 'Steal 10%', icon: '🦊' }) },
  { type: 'steal', weight: 4, gen: () => ({ pct: 0.25, label: 'Steal 25%', icon: '🦊' }) },
  { type: 'steal', weight: 3, gen: () => ({ pct: 0.50, label: 'Steal 50%', icon: '🗡️' }) },

  // Double / Triple (~7%)
  { type: 'multiply', weight: 5, gen: () => ({ factor: 2.0, label: 'DOUBLE!',  icon: '⚡' }) },
  { type: 'multiply', weight: 2, gen: () => ({ factor: 3.0, label: 'TRIPLE!',  icon: '⚡' }) },

  // SWAP (~3%)
  { type: 'swap', weight: 3, gen: () => ({ label: 'SWAP!', icon: '🔄' }) },

  // Bankrupt (~5%)
  { type: 'bankrupt', weight: 3, gen: () => ({ label: 'Bankrupt!', pct: 0.5, icon: '💀' }) },
  { type: 'bankrupt', weight: 2, gen: () => ({ label: 'BANKRUPT!', pct: 1.0, icon: '☠️' }) },
];

const TOTAL_WEIGHT = CHEST_TABLE.reduce((s, e) => s + e.weight, 0);

function rollChest() {
  let rng = Math.random() * TOTAL_WEIGHT;
  for (const entry of CHEST_TABLE) {
    rng -= entry.weight;
    if (rng <= 0) return { type: entry.type, ...entry.gen() };
  }
  return { type: 'gold', amount: 10, label: '+10 Gold', icon: '🪙' };
}

/**
 * Apply a chest result to a player in a room.
 * Returns { description, delta, targetName }
 */
function applyChest(room, socketId, chest) {
  const me = room.players[socketId];
  if (!me) return { description: 'Error', delta: 0 };

  const others = Object.entries(room.players).filter(([sid]) => sid !== socketId);
  let result = { type: chest.type, label: chest.label, icon: chest.icon, description: '', delta: 0, targetName: '', newGold: me.gold };

  switch (chest.type) {
    case 'gold': {
      me.gold += chest.amount;
      result.description = `Found ${chest.amount} gold!`;
      result.delta = chest.amount;
      break;
    }
    case 'multiply': {
      const before = me.gold;
      me.gold = Math.floor(me.gold * chest.factor);
      const gained = me.gold - before;
      result.description = `${chest.label}! +${gained} gold!`;
      result.delta = gained;
      break;
    }
    case 'steal': {
      if (!others.length) {
        // No targets — give flat gold instead
        me.gold += 50;
        result.description = 'No one to steal from — found 50 gold instead!';
        result.delta = 50;
        result.type = 'gold';
        break;
      }
      // Target the richest player
      const sorted = others.sort((a, b) => b[1].gold - a[1].gold);
      const [targetSid, target] = sorted[0];
      const amount = Math.floor(target.gold * chest.pct);
      target.gold = Math.max(0, target.gold - amount);
      me.gold += amount;
      result.description = `Stole ${amount} gold from ${target.name}!`;
      result.delta = amount;
      result.targetName = target.name;
      break;
    }
    case 'swap': {
      if (!others.length) {
        me.gold += 100;
        result.description = 'No one to swap with — found 100 gold!';
        result.delta = 100;
        result.type = 'gold';
        break;
      }
      // Swap with random other player
      const [targetSid, target] = others[Math.floor(Math.random() * others.length)];
      const myGold = me.gold;
      me.gold = target.gold;
      target.gold = myGold;
      const diff = me.gold - myGold;
      result.description = `Swapped gold with ${target.name}!`;
      result.delta = diff;
      result.targetName = target.name;
      break;
    }
    case 'bankrupt': {
      const lost = Math.floor(me.gold * chest.pct);
      me.gold = Math.max(0, me.gold - lost);
      result.description = chest.pct >= 1.0 ? 'Total Bankrupt! All gold lost!' : `Lost ${lost} gold!`;
      result.delta = -lost;
      break;
    }
    default:
      result.description = 'Empty chest…';
  }

  // Copy score to match leaderboard interface
  me.score = me.gold;
  result.newGold = me.gold;
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new game room.
 */
async function createRoom({ mode, hostId, hostName, quizId, quizTitle, questions }) {
  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
    if (attempts > 100) throw new Error('Cannot generate unique room code');
  } while (await loadRoom(code));

  const room = {
    code,
    mode,                    // 'kahoot' | 'blooket'
    hostId,
    hostName,
    quizId,
    quizTitle,
    questions,               // full question list (server-only)
    players: {},
    state: 'waiting',        // 'waiting' | 'playing' | 'question' | 'results' | 'ended'
    currentQuestion: -1,     // Classic mode only
    questionStart: null,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    // Gold Quest settings
    goldGoal: 0,             // 0 = time-based, >0 = gold goal mode
    timeLimit: 300,          // Total game time in seconds (Gold Quest)
  };

  await storeRoom(code, room);
  return room;
}

async function getRoom(code) {
  return loadRoom(code ? code.toUpperCase() : '');
}

async function saveRoom(room) {
  await storeRoom(room.code, room);
}

async function removeRoom(code) {
  await deleteRoom(code ? code.toUpperCase() : '');
}

/**
 * Add a player to a room.
 */
async function joinRoom(code, socketId, playerName) {
  const room = await getRoom(code);
  if (!room) return { ok: false, error: 'Room not found' };
  if (room.state !== 'waiting') return { ok: false, error: 'Game already started' };
  if (Object.keys(room.players).length >= 200) return { ok: false, error: 'Room is full' };

  const isGoldQuest = room.mode === 'blooket';

  room.players[socketId] = {
    name: playerName,
    score: 0,
    gold: 0,                       // Gold Quest currency
    streak: 0,
    answers: [],
    // Gold Quest specific
    questionDeck: isGoldQuest ? shuffle([...Array(room.questions.length).keys()]) : [],
    deckIndex: 0,                  // Current position in their shuffled deck
    lockedUntil: 0,                // Timestamp - wrong answer lockout
    chestPending: false,           // Waiting for chest selection
    questionsAnswered: 0,
  };

  await saveRoom(room);
  return { ok: true, room };
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSIC MODE — synchronized questions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Process a player's answer (Classic mode — server-side scoring).
 */
async function submitAnswer(code, socketId, answerIndex) {
  const room = await getRoom(code);
  if (!room) return null;
  if (room.state !== 'question') return null;

  const q = room.questions[room.currentQuestion];
  if (!q) return null;

  const player = room.players[socketId];
  if (!player) return null;

  const alreadyAnswered = player.answers.some(a => a.questionIndex === room.currentQuestion);
  if (alreadyAnswered) return null;

  const correct = answerIndex === q.correct;
  const elapsed = Date.now() - room.questionStart;
  const timeLimit = (q.timeLimit || 30) * 1000;

  let pointsEarned = 0;
  if (correct) {
    const basePoints = q.points || 1000;
    const timeBonus = Math.max(0, Math.floor(basePoints * 0.5 * (1 - elapsed / timeLimit)));
    const streakBonus = Math.min(player.streak, 5) * 50;
    pointsEarned = basePoints + timeBonus + streakBonus;
    player.streak++;
  } else {
    player.streak = 0;
  }

  player.score += pointsEarned;
  player.answers.push({ questionIndex: room.currentQuestion, correct, pointsEarned, timeMs: elapsed });

  await saveRoom(room);
  return { correct, pointsEarned, newScore: player.score };
}

/**
 * Move to next question (Classic mode).
 */
async function nextQuestion(code) {
  const room = await getRoom(code);
  if (!room) return null;
  room.currentQuestion++;
  if (room.currentQuestion >= room.questions.length) {
    room.state = 'ended';
    room.endedAt = Date.now();
    await saveRoom(room);
    return null;
  }
  room.state = 'question';
  room.questionStart = Date.now();
  await saveRoom(room);

  const q = room.questions[room.currentQuestion];
  return {
    index: room.currentQuestion,
    total: room.questions.length,
    text: q.text,
    options: q.options,
    timeLimit: q.timeLimit || 30,
    points: q.points || 1000,
    image: q.image || null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GOLD QUEST MODE — individual question flow
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get the next question for a specific player in Gold Quest.
 * Returns sanitised question (no correct answer) or null if game over.
 */
async function getGoldQuestQuestion(code, socketId) {
  const room = await getRoom(code);
  if (!room || room.state === 'ended') return null;

  const player = room.players[socketId];
  if (!player) return null;

  // Check lockout
  if (player.lockedUntil > Date.now()) {
    return { locked: true, lockMs: player.lockedUntil - Date.now() };
  }

  // If chest is pending, don't give new question
  if (player.chestPending) {
    return { chestPending: true };
  }

  // Circular queue — reshuffle when deck exhausted
  if (player.deckIndex >= player.questionDeck.length) {
    player.questionDeck = shuffle([...Array(room.questions.length).keys()]);
    player.deckIndex = 0;
    await saveRoom(room);
  }

  const qIndex = player.questionDeck[player.deckIndex];
  const q = room.questions[qIndex];
  if (!q) return null;

  return {
    index: player.questionsAnswered + 1,
    total: room.questions.length,
    qIndex,
    text: q.text,
    options: q.options,
    timeLimit: 15, // Gold Quest has faster per-question time
    image: q.image || null,
    gold: player.gold,
  };
}

/**
 * Submit answer in Gold Quest mode.
 * Correct → chestPending = true (player must pick a chest).
 * Wrong → lockout for 2-4 seconds.
 */
async function submitGoldQuestAnswer(code, socketId, answerIndex) {
  const room = await getRoom(code);
  if (!room || room.state === 'ended') return null;

  const player = room.players[socketId];
  if (!player) return null;
  if (player.chestPending) return null; // Must pick chest first

  const qIndex = player.questionDeck[player.deckIndex];
  const q = room.questions[qIndex];
  if (!q) return null;

  const correct = answerIndex === q.correct;
  player.deckIndex++;
  player.questionsAnswered++;

  if (correct) {
    player.streak++;
    player.chestPending = true;
    player.answers.push({ questionIndex: qIndex, correct: true, timeMs: 0 });
    await saveRoom(room);
    return { correct: true, streak: player.streak, gold: player.gold, chestPending: true };
  } else {
    player.streak = 0;
    const lockoutMs = 2000 + Math.floor(Math.random() * 2000); // 2-4 seconds
    player.lockedUntil = Date.now() + lockoutMs;
    player.answers.push({ questionIndex: qIndex, correct: false, timeMs: 0 });
    await saveRoom(room);
    return { correct: false, streak: 0, gold: player.gold, lockMs: lockoutMs };
  }
}

/**
 * Player opens a chest in Gold Quest.
 * chestIndex is 0, 1, or 2 (visual choice — actual content is RNG).
 * Returns chest result.
 */
async function openGoldQuestChest(code, socketId, chestIndex) {
  const room = await getRoom(code);
  if (!room || room.state === 'ended') return null;

  const player = room.players[socketId];
  if (!player || !player.chestPending) return null;

  // Roll the chest
  const chest = rollChest();
  const result = applyChest(room, socketId, chest);

  player.chestPending = false;

  // Check gold goal
  if (room.goldGoal > 0 && player.gold >= room.goldGoal) {
    room.state = 'ended';
    room.endedAt = Date.now();
  }

  await saveRoom(room);
  return result;
}

/**
 * Check if Gold Quest timer has expired.
 */
async function checkGoldQuestTimer(code) {
  const room = await getRoom(code);
  if (!room || room.state === 'ended' || room.mode !== 'blooket') return false;
  if (!room.startedAt) return false;

  const elapsed = (Date.now() - room.startedAt) / 1000;
  if (elapsed >= room.timeLimit) {
    room.state = 'ended';
    room.endedAt = Date.now();
    await saveRoom(room);
    return true; // Game over
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSIC MODE — Blooket-style events (LEGACY, kept for backwards compat)
// ══════════════════════════════════════════════════════════════════════════════

async function triggerBlooketEvent(code, socketId) {
  const room = await getRoom(code);
  if (!room || room.mode !== 'blooket') return null;

  // In Gold Quest, events come from chests — this legacy function is unused
  // but kept for API compatibility
  return { type: 'nothing', description: '', delta: 0, targetName: '' };
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get ranked leaderboard for room (works for both modes).
 */
function getLeaderboard(room) {
  return Object.entries(room.players)
    .map(([socketId, p]) => ({
      socketId,
      name: p.name,
      score: room.mode === 'blooket' ? p.gold : p.score,
      gold: p.gold,
      streak: p.streak,
      questionsAnswered: p.questionsAnswered || 0,
    }))
    .sort((a, b) => b.score - a.score);
}

async function kickPlayer(code, socketId) {
  const room = await getRoom(code);
  if (!room) return;
  delete room.players[socketId];
  await saveRoom(room);
}

module.exports = {
  createRoom, getRoom, saveRoom, removeRoom,
  joinRoom, submitAnswer, nextQuestion,
  getGoldQuestQuestion, submitGoldQuestAnswer, openGoldQuestChest, checkGoldQuestTimer,
  triggerBlooketEvent,
  getLeaderboard, kickPlayer,
};
