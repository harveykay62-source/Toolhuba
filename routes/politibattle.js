// PolitiBattle Module — routes/politibattle — loaded by server.js via app.use('/', require('./routes/politibattle'))
/**
 * ToolHub — PolitiBattle Express Routes
 *
 * Page routes:
 *   GET  /politibattle           → serve public/politibattle.html  (main menu)
 *   GET  /arena                  → serve public/arena.html          (3D battle)
 *   GET  /politibattle-multi     → serve public/politibattle-multi.html (online lobby)
 *   GET  /game/:code             → serve public/politibattle-multi.html (invite link)
 *
 * API routes:
 *   POST /api/politibattle/create-room  → create a new battle room, return { code }
 *   POST /api/politibattle/join-room    → validate + join a room, return room state or error
 *   GET  /api/politibattle/room/:code   → get current room state
 */
'use strict';

const express = require('express');
const path    = require('path');
const router  = express.Router();

const {
  createBattleRoom,
  joinBattleRoom,
  getBattleRoom,
} = require('../lib/battleRooms');

// ── Helper: resolve path to a public HTML file ────────────────────────────────
const pub = (file) => path.join(__dirname, '..', 'public', file);

// ══════════════════════════════════════════════════════════════════════════════
// PAGE ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/** Main menu — mode select, single-player launch, vs-CPU, online */
router.get('/politibattle', (req, res) => {
  res.sendFile(pub('politibattle.html'));
});

/** Standalone 3D arena — single-player / vs-CPU battle */
router.get('/arena', (req, res) => {
  res.sendFile(pub('arena.html'));
});

/** Online multiplayer lobby — create or join a room */
router.get('/politibattle-multi', (req, res) => {
  res.sendFile(pub('politibattle-multi.html'));
});

/**
 * Invite link — /game/ABC123 opens the multiplayer page which reads the
 * code from the URL and auto-attempts to join that room.
 */
router.get('/game/:code', (req, res) => {
  res.sendFile(pub('politibattle-multi.html'));
});

// ══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/politibattle/create-room
 * Body: { hostName }
 * Creates a new battle room and returns the room code.
 * Returns: { ok: true, code }
 */
router.post('/api/politibattle/create-room', async (req, res) => {
  try {
    const hostName = (req.body.hostName || 'Host').toString().trim().slice(0, 32) || 'Host';
    const hostId   = req.session?.userId || req.sessionID || `anon-${Date.now()}`;

    const { code, room } = await createBattleRoom(hostId, hostName);

    res.json({ ok: true, code, state: room.state });
  } catch (err) {
    console.error('[PolitiBattle] create-room error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to create room' });
  }
});

/**
 * POST /api/politibattle/join-room
 * Body: { code, playerName }
 * Validates the room code and adds the player as guest.
 * Returns: { ok: true, room } or { ok: false, error }
 */
router.post('/api/politibattle/join-room', async (req, res) => {
  try {
    const code       = (req.body.code || '').toString().trim().toUpperCase().slice(0, 6);
    const playerName = (req.body.playerName || 'Guest').toString().trim().slice(0, 32) || 'Guest';
    const playerId   = req.session?.userId || req.sessionID || `anon-${Date.now()}`;

    if (!code) return res.status(400).json({ ok: false, error: 'Room code required' });

    const result = await joinBattleRoom(code, playerId, playerName);

    if (!result.ok) {
      return res.status(404).json(result);
    }

    // Strip internal host/guest IDs before sending to client
    const safeRoom = sanitiseRoom(result.room);
    res.json({ ok: true, room: safeRoom });
  } catch (err) {
    console.error('[PolitiBattle] join-room error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to join room' });
  }
});

/**
 * GET /api/politibattle/room/:code
 * Returns the current state of a battle room (sanitised — no internal IDs).
 * Returns: { ok: true, room } or { ok: false, error }
 */
router.get('/api/politibattle/room/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').toUpperCase();
    const room = await getBattleRoom(code);

    if (!room) {
      return res.status(404).json({ ok: false, error: 'Room not found or expired' });
    }

    res.json({ ok: true, room: sanitiseRoom(room) });
  } catch (err) {
    console.error('[PolitiBattle] get-room error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to fetch room' });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Remove internal socket/session IDs before sending room state to clients.
 * @param {object} room
 * @returns {object}
 */
function sanitiseRoom(room) {
  return {
    code:        room.code,
    state:       room.state,
    createdAt:   room.createdAt,
    battleState: room.battleState,
    host: {
      name:  room.host.name,
      team:  room.host.team,
      ready: room.host.ready,
    },
    guest: {
      name:  room.guest.name,
      team:  room.guest.team,
      ready: room.guest.ready,
    },
  };
}

module.exports = router;
