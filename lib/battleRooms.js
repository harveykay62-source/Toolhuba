// PolitiBattle Module — battleRooms — loaded by routes/politibattle.js and lib/battleSocket.js
/**
 * ToolHub — PolitiBattle Room Manager
 *
 * Manages 1v1 PolitiBattle rooms using the same Redis/in-memory
 * fallback pattern as lib/gameRooms.js.
 *
 * Room object shape:
 * {
 *   code        : string   — 6-char uppercase alphanumeric
 *   host        : { id, name, team:[], ready:false }
 *   guest       : { id, name, team:[], ready:false }
 *   state       : 'lobby'|'team-select'|'preview'|'battle'|'ended'
 *   battleState : null | object  — live battle data (filled by engine)
 *   createdAt   : number  — Date.now()
 * }
 */
'use strict';

const ROOM_TTL = 60 * 60 * 4; // 4 hours, matches gameRooms.js

// ── Redis or in-memory fallback (same pattern as gameRooms.js) ────────────────
let redis = null;
const memoryStore = new Map();

function tryRedis() {
  if (redis || !process.env.REDIS_URL) return;
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    redis.on('error', e => {
      console.warn('PolitiBattle Redis error (using memory fallback):', e.message);
      redis = null;
    });
    console.log('✅ Redis connected for battle rooms');
  } catch (e) {
    console.warn('ioredis not available, using in-memory battle room store');
    redis = null;
  }
}
tryRedis();

// ── Low-level storage (namespaced with "battle:" prefix) ──────────────────────
async function storeRoom(code, room) {
  const json = JSON.stringify(room);
  if (redis) {
    try { await redis.set(`battle:${code}`, json, 'EX', ROOM_TTL); return; } catch {}
  }
  memoryStore.set(`battle:${code}`, { value: json, exp: Date.now() + ROOM_TTL * 1000 });
}

async function loadRoom(code) {
  if (redis) {
    try {
      const raw = await redis.get(`battle:${code}`);
      return raw ? JSON.parse(raw) : null;
    } catch {}
  }
  const entry = memoryStore.get(`battle:${code}`);
  if (!entry) return null;
  if (Date.now() > entry.exp) { memoryStore.delete(`battle:${code}`); return null; }
  return JSON.parse(entry.value);
}

async function deleteRoom(code) {
  if (redis) { try { await redis.del(`battle:${code}`); } catch {} }
  memoryStore.delete(`battle:${code}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new battle room.
 * @param {string} hostId    — session userId or socket id
 * @param {string} hostName  — display name
 * @returns {{ code: string, room: object }}
 */
async function createBattleRoom(hostId, hostName) {
  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
    if (attempts > 100) throw new Error('Cannot generate unique battle room code');
  } while (await loadRoom(code));

  const room = {
    code,
    host: { id: hostId, name: hostName, team: [], ready: false },
    guest: { id: null, name: null, team: [], ready: false },
    state: 'lobby',       // 'lobby'|'team-select'|'preview'|'battle'|'ended'
    battleState: null,
    createdAt: Date.now(),
  };

  await storeRoom(code, room);
  return { code, room };
}

/**
 * Join an existing battle room as guest.
 * @param {string} code        — 6-char room code (case-insensitive)
 * @param {string} playerId    — session userId or socket id
 * @param {string} playerName  — display name
 * @returns {{ ok: boolean, room?: object, error?: string }}
 */
async function joinBattleRoom(code, playerId, playerName) {
  const upper = (code || '').toUpperCase();
  const room = await loadRoom(upper);
  if (!room) return { ok: false, error: 'Room not found or expired' };
  if (room.state === 'ended') return { ok: false, error: 'Battle has already ended' };
  if (room.guest.id) return { ok: false, error: 'Room is full' };

  room.guest.id = playerId;
  room.guest.name = playerName;

  await storeRoom(upper, room);
  return { ok: true, room };
}

/**
 * Get a battle room by code.
 * @param {string} code
 * @returns {object|null}
 */
async function getBattleRoom(code) {
  return loadRoom((code || '').toUpperCase());
}

/**
 * Merge updates into a room and persist.
 * @param {string} code
 * @param {object} updates — shallow-merged into the room object
 * @returns {object|null} updated room
 */
async function updateBattleRoom(code, updates) {
  const upper = (code || '').toUpperCase();
  const room = await loadRoom(upper);
  if (!room) return null;
  Object.assign(room, updates);
  await storeRoom(upper, room);
  return room;
}

/**
 * Delete a battle room.
 * @param {string} code
 */
async function deleteBattleRoom(code) {
  await deleteRoom((code || '').toUpperCase());
}

/**
 * Find a room by socket ID. Iterates all rooms to find which one has this
 * socket as host or guest. Used for disconnect handling.
 * @param {string} socketId
 * @returns {{ code, room, role: 'host'|'guest' }|null}
 */
async function findRoomBySocketId(socketId) {
  // Try memory store first (works for both Redis and memory fallback)
  for (const [key, entry] of memoryStore.entries()) {
    if (!key.startsWith('battle:')) continue;
    try {
      const room = JSON.parse(typeof entry === 'object' ? entry.value : entry);
      if (room.host && room.host.id === socketId) {
        return { code: room.code, room, role: 'host' };
      }
      if (room.guest && room.guest.id === socketId) {
        return { code: room.code, room, role: 'guest' };
      }
    } catch (e) { /* skip malformed entries */ }
  }
  return null;
}

/**
 * Update the lastActivity timestamp on a room (prevents stale room issues).
 * @param {string} code
 */
async function setRoomLastActivity(code) {
  const room = await getBattleRoom(code);
  if (room) {
    room.lastActivity = Date.now();
    await updateBattleRoom(code, { lastActivity: room.lastActivity });
  }
}

module.exports = {
  createBattleRoom,
  joinBattleRoom,
  getBattleRoom,
  updateBattleRoom,
  deleteBattleRoom,
  findRoomBySocketId,
  setRoomLastActivity,
};
