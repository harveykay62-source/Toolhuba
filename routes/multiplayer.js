/**
 * ToolHub — Multiplayer REST Routes
 * POST /api/multiplayer/validate-code   → check room code + return basic info
 * GET  /api/multiplayer/my-games        → teacher/admin game history
 * GET  /api/multiplayer/results/:code   → final results for a game
 * GET  /api/multiplayer/quizzes         → quizzes available for multiplayer
 * POST /api/admin/school-domains        → add school domain
 * DELETE /api/admin/school-domains/:id  → remove school domain
 * GET  /api/admin/school-domains        → list school domains
 * POST /api/admin/create-teacher        → create teacher account
 * GET  /api/teacher/students            → students under teacher domain
 * GET  /api/teacher/game-results        → results for teacher's games
 */
'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const db = require('../db/database');
const { getQuizList } = require('../db/quiz-db');
const { getRoom } = require('../lib/gameRooms');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Validate join code ────────────────────────────────────────────────────────
router.post('/validate-code', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const room = await getRoom(code.trim().toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found or expired' });
  if (room.state === 'ended') return res.status(410).json({ error: 'Game has ended' });
  res.json({
    ok: true,
    code: room.code,
    mode: room.mode,
    quizTitle: room.quizTitle,
    hostName: room.hostName,
    playerCount: Object.keys(room.players).length,
    state: room.state,
  });
});

// ── List quizzes for multiplayer ──────────────────────────────────────────────
router.get('/quizzes', requireAuth, async (req, res) => {
  try {
    const { mode } = req.query; // 'kahoot' or 'blooket'
    const quizzes = await getQuizList({ status: 'approved', limit: 100, orderBy: 'plays' });
    // Both modes use existing quizzes; blooket mode UI shows wild card indicator
    res.json({ quizzes });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load quizzes' });
  }
});

// ── My game history (host view) ───────────────────────────────────────────────
router.get('/my-games', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.pool.query(
      `SELECT * FROM multiplayer_results WHERE host_id=$1 ORDER BY ended_at DESC LIMIT 50`,
      [req.session.userId]
    );
    res.json({ games: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Results for a specific room ───────────────────────────────────────────────
router.get('/results/:code', async (req, res) => {
  try {
    const row = await db.get(
      `SELECT * FROM multiplayer_results WHERE room_code=$1 ORDER BY ended_at DESC LIMIT 1`,
      [req.params.code.toUpperCase()]
    );
    if (!row) return res.status(404).json({ error: 'Results not found' });
    row.players_json = JSON.parse(row.players_json || '[]');
    row.final_scores = JSON.parse(row.final_scores || '{}');
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Admin: list school domains ────────────────────────────────────────────────
router.get('/admin/school-domains', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.pool.query(
      `SELECT sd.*, u.name AS approved_by_name
       FROM school_domains sd
       LEFT JOIN users u ON sd.approved_by = u.id
       ORDER BY sd.created_at DESC`
    );
    res.json({ domains: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Admin: add school domain ──────────────────────────────────────────────────
router.post('/admin/school-domains', requireAdmin, async (req, res) => {
  const { domain, schoolName } = req.body;
  if (!domain || !schoolName) return res.status(400).json({ error: 'domain and schoolName required' });
  try {
    await db.addSchoolDomain(domain.trim().toLowerCase(), schoolName.trim(), req.session.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// ── Admin: remove school domain ───────────────────────────────────────────────
router.delete('/admin/school-domains/:domain', requireAdmin, async (req, res) => {
  try {
    await db.removeSchoolDomain(req.params.domain);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove domain' });
  }
});

// ── Admin: create teacher account ─────────────────────────────────────────────
router.post('/admin/create-teacher', requireAdmin, async (req, res) => {
  const { name, email, password, schoolName, domain } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const existing = await db.get('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const avatarColor = '#3b82f6';
    const result = await db.run(
      `INSERT INTO users (uuid,email,password,name,avatar_color,role,is_teacher)
       VALUES ($1,$2,$3,$4,$5,'teacher',true) RETURNING id`,
      [userId, email.toLowerCase(), hash, name, avatarColor]
    );
    const newId = result.lastInsertRowid;

    if (newId && (schoolName || domain)) {
      await db.createTeacherProfile(newId, schoolName || '', domain || '', req.session.userId);
    }

    res.json({ ok: true, message: `Teacher account created for ${email}` });
  } catch (e) {
    console.error('create-teacher error:', e);
    res.status(500).json({ error: 'Failed to create teacher account' });
  }
});

// ── Admin: list all multiplayer games ─────────────────────────────────────────
router.get('/admin/all-games', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.pool.query(
      `SELECT id, room_code, game_mode, quiz_title, host_name, started_at, ended_at,
              COALESCE(json_array_length(players_json::json), 0) as player_count
       FROM multiplayer_results ORDER BY ended_at DESC LIMIT 100`
    );
    res.json({ games: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Teacher: students under their domain ──────────────────────────────────────
router.get('/teacher/students', requireAuth, async (req, res) => {
  if (!['teacher', 'admin'].includes(req.session.role)) {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  try {
    const profile = await db.getTeacherProfile(req.session.userId);
    if (!profile && req.session.role !== 'admin') return res.json({ students: [] });

    const domain = profile?.domain || '';
    const { rows } = await db.pool.query(
      `SELECT id, name, email, created_at, last_login FROM users
       WHERE is_student=true AND email ILIKE $1
       ORDER BY name`,
      [`%@${domain}`]
    );
    res.json({ students: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Teacher: their game history ───────────────────────────────────────────────
router.get('/teacher/game-results', requireAuth, async (req, res) => {
  if (!['teacher', 'admin'].includes(req.session.role)) {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  try {
    const { rows } = await db.pool.query(
      `SELECT * FROM multiplayer_results WHERE host_id=$1 ORDER BY ended_at DESC LIMIT 50`,
      [req.session.userId]
    );
    rows.forEach(r => {
      r.players_json = JSON.parse(r.players_json || '[]');
    });
    res.json({ games: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
