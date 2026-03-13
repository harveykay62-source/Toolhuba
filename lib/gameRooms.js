/**
 * ToolHub — Game Room Manager
 * Uses Redis for storage with in-memory Map fallback (dev / no Redis env).
 * All scoring is SERVER-SIDE only. Clients never send scores directly.
 */
'use strict';

const ROOM_TTL = 60 * 60 * 4; // 4 hours in seconds

// ── Redis or in-memory fallback ───────────────────────────────────────────────
let redis = null;
const memoryStore = new Map(); // fallback

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

// ── Join-code generator ───────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new game room.
 * @param {object} opts
 *   mode      'kahoot' | 'blooket'
 *   hostId    integer user ID
 *   hostName  string
 *   quizId    string
 *   quizTitle string
 *   questions array  [{text, options, correct, points, timeLimit}]
 * @returns {object} room
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
    players: {},             // { socketId: { name, score, streak, answers, powerUps } }
    state: 'waiting',        // 'waiting' | 'question' | 'results' | 'ended'
    currentQuestion: -1,
    questionStart: null,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
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
 * Returns { ok, error }
 */
async function joinRoom(code, socketId, playerName) {
  const room = await getRoom(code);
  if (!room) return { ok: false, error: 'Room not found' };
  if (room.state !== 'waiting') return { ok: false, error: 'Game already started' };
  if (Object.keys(room.players).length >= 200) return { ok: false, error: 'Room is full' };

  room.players[socketId] = {
    name: playerName,
    score: 0,
    streak: 0,
    answers: [],    // [{questionIndex, correct, pointsEarned, timeMs}]
    powerUps: [],   // blooket only
    kicks: 0,
  };

  await saveRoom(room);
  return { ok: true, room };
}

/**
 * Process a player's answer (server-side scoring).
 * Returns { correct, pointsEarned, newScore }
 */
async function submitAnswer(code, socketId, answerIndex) {
  const room = await getRoom(code);
  if (!room) return null;
  if (room.state !== 'question') return null;

  const q = room.questions[room.currentQuestion];
  if (!q) return null;

  const player = room.players[socketId];
  if (!player) return null;

  // Prevent duplicate answers for same question
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
 * Blooket-style events.
 * Returns { type, result, description }
 */
async function triggerBlooketEvent(code, socketId) {
  const room = await getRoom(code);
  if (!room || room.mode !== 'blooket') return null;

  const events = [
    { type: 'steal',       weight: 20 },
    { type: 'double',      weight: 15 },
    { type: 'bonus',       weight: 25 },
    { type: 'swap',        weight: 10 },
    { type: 'freeze',      weight: 15 },
    { type: 'nothing',     weight: 15 },
  ];

  const totalWeight = events.reduce((s, e) => s + e.weight, 0);
  let rng = Math.random() * totalWeight;
  let chosen = events[events.length - 1];
  for (const e of events) { rng -= e.weight; if (rng <= 0) { chosen = e; break; } }

  const players = Object.entries(room.players);
  const others = players.filter(([sid]) => sid !== socketId);
  const me = room.players[socketId];
  if (!me) return null;

  let result = { type: chosen.type, description: '', delta: 0, targetName: '' };

  switch (chosen.type) {
    case 'steal': {
      if (!others.length) { result.type = 'nothing'; result.description = 'No one to steal from!'; break; }
      const [targetSid, target] = others[Math.floor(Math.random() * others.length)];
      const amount = Math.floor(target.score * 0.30);
      target.score = Math.max(0, target.score - amount);
      me.score += amount;
      result.description = `Stole ${amount} pts from ${target.name}!`;
      result.delta = amount; result.targetName = target.name;
      break;
    }
    case 'double': {
      const amount = Math.floor(me.score * 0.20);
      me.score += amount;
      result.description = `Double bonus! +${amount} pts!`;
      result.delta = amount;
      break;
    }
    case 'bonus': {
      const amount = Math.floor(Math.random() * 300) + 100;
      me.score += amount;
      result.description = `Lucky bonus! +${amount} pts!`;
      result.delta = amount;
      break;
    }
    case 'swap': {
      if (!others.length) { result.type = 'nothing'; result.description = 'No one to swap with!'; break; }
      const [targetSid, target] = others[Math.floor(Math.random() * others.length)];
      const myScore = me.score;
      me.score = target.score;
      target.score = myScore;
      result.description = `Score swapped with ${target.name}!`;
      result.targetName = target.name;
      break;
    }
    case 'freeze': {
      if (!others.length) { result.type = 'nothing'; result.description = 'No one to freeze!'; break; }
      const [targetSid, target] = others[Math.floor(Math.random() * others.length)];
      target._frozen = Date.now() + 15000; // 15 seconds
      result.description = `Froze ${target.name} for 15s!`;
      result.targetName = target.name;
      break;
    }
    default:
      result.description = 'Nothing happened this time…';
  }

  await saveRoom(room);
  return result;
}

/**
 * Get ranked leaderboard for room.
 */
function getLeaderboard(room) {
  return Object.entries(room.players)
    .map(([socketId, p]) => ({ socketId, name: p.name, score: p.score, streak: p.streak }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Move to next question. Returns the question (without correct answer) or null if game over.
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
  // Return sanitised (no correct index) for client
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

async function kickPlayer(code, socketId) {
  const room = await getRoom(code);
  if (!room) return;
  delete room.players[socketId];
  await saveRoom(room);
}

module.exports = {
  createRoom, getRoom, saveRoom, removeRoom,
  joinRoom, submitAnswer, triggerBlooketEvent,
  getLeaderboard, nextQuestion, kickPlayer,
};
