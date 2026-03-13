/**
 * ToolHub — Multiplayer Socket.io Handler
 * Kahoot-style: simple, schools only.
 * Blooket-style: events, power-ups, animations.
 */
'use strict';

const rooms = require('../lib/gameRooms');
const db = require('../db/database');
const { getQuizWithQuestions } = require('../db/quiz-db');

// Timer references (server-side)
const questionTimers = new Map();

function clearQuestionTimer(code) {
  const t = questionTimers.get(code);
  if (t) { clearTimeout(t); questionTimers.delete(code); }
}

module.exports = function attachSocket(io) {

  // ── Middleware: attach session to socket ──────────────────────────────────
  io.use((socket, next) => {
    const req = socket.request;
    if (req.session) {
      socket._userId = req.session.userId || null;
      socket._userName = req.session.name || null;
      socket._role = req.session.role || 'guest';
    }
    next();
  });

  io.on('connection', socket => {
    // ── HOST: create game ─────────────────────────────────────────────────
    socket.on('host:create', async ({ quizId, mode }, cb) => {
      try {
        if (!socket._userId) return cb({ error: 'Login required' });

        const role = socket._role;
        // Kahoot mode only for teachers / students (approved domains) / admin
        if (mode === 'kahoot' && !['teacher','student','educator','admin'].includes(role)) {
          return cb({ error: 'Kahoot mode is only available to approved school accounts' });
        }
        // Both modes available to premium+, blooket also to free
        if (!['free','premium','teacher','student','educator','admin'].includes(role)) {
          return cb({ error: 'Account required' });
        }

        const quizData = await getQuizWithQuestions(quizId);
        if (!quizData || !quizData.questions || !quizData.questions.length) {
          return cb({ error: 'Quiz not found or has no questions' });
        }

        const questions = quizData.questions.map(q => ({
          text: q.text || q.question,
          options: q.options || [],
          correct: typeof q.correct_index === 'number' ? q.correct_index : q.correct,
          points: q.points || 1000,
          timeLimit: q.time_limit || quizData.time_limit || 30,
          image: q.image_url || null,
        }));

        const room = await rooms.createRoom({
          mode,
          hostId: socket._userId,
          hostName: socket._userName || 'Host',
          quizId,
          quizTitle: quizData.title,
          questions,
        });

        socket.join(room.code);
        socket._roomCode = room.code;
        socket._isHost = true;

        cb({ ok: true, code: room.code, quizTitle: quizData.title, questionCount: questions.length });
      } catch (e) {
        console.error('host:create error', e);
        cb({ error: 'Failed to create game' });
      }
    });

    // ── PLAYER: join game ─────────────────────────────────────────────────
    socket.on('player:join', async ({ code, name }, cb) => {
      try {
        if (!name || name.trim().length < 1 || name.trim().length > 24) {
          return cb({ error: 'Name must be 1–24 characters' });
        }
        const clean = name.trim().replace(/[<>]/g, '');
        const result = await rooms.joinRoom(code, socket.id, clean);
        if (!result.ok) return cb({ error: result.error });

        socket.join(code);
        socket._roomCode = code;
        socket._playerName = clean;

        // Notify host & other players
        io.to(code).emit('room:playerJoined', {
          socketId: socket.id,
          name: clean,
          playerCount: Object.keys(result.room.players).length,
        });

        cb({ ok: true, quizTitle: result.room.quizTitle, mode: result.room.mode });
      } catch (e) {
        console.error('player:join error', e);
        cb({ error: 'Failed to join game' });
      }
    });

    // ── HOST: start game ──────────────────────────────────────────────────
    socket.on('host:start', async (_, cb) => {
      const code = socket._roomCode;
      if (!code || !socket._isHost) return cb && cb({ error: 'Not a host' });
      const room = await rooms.getRoom(code);
      if (!room) return cb && cb({ error: 'Room not found' });
      if (room.state !== 'waiting') return cb && cb({ error: 'Already started' });

      room.state = 'question';
      room.startedAt = Date.now();
      await rooms.saveRoom(room);

      io.to(code).emit('game:starting', { mode: room.mode, countdown: 3 });

      // After countdown send first question
      setTimeout(async () => {
        const q = await rooms.nextQuestion(code);
        if (q) emitQuestion(code, q, room.mode);
      }, 3000);

      cb && cb({ ok: true });
    });

    // ── HOST: skip question ───────────────────────────────────────────────
    socket.on('host:skip', async () => {
      const code = socket._roomCode;
      if (!code || !socket._isHost) return;
      clearQuestionTimer(code);
      await sendNextOrEnd(code);
    });

    // ── HOST: kick player ─────────────────────────────────────────────────
    socket.on('host:kick', async ({ socketId }) => {
      const code = socket._roomCode;
      if (!code || !socket._isHost) return;
      await rooms.kickPlayer(code, socketId);
      io.to(socketId).emit('game:kicked');
      io.to(code).emit('room:playerLeft', { socketId });
    });

    // ── HOST: end game early ──────────────────────────────────────────────
    socket.on('host:end', async () => {
      const code = socket._roomCode;
      if (!code || !socket._isHost) return;
      clearQuestionTimer(code);
      const room = await rooms.getRoom(code);
      if (!room) return;
      room.state = 'ended';
      room.endedAt = Date.now();
      await rooms.saveRoom(room);
      const lb = rooms.getLeaderboard(room);
      io.to(code).emit('game:ended', { leaderboard: lb });
      await persistResult(room);
    });

    // ── PLAYER: submit answer ─────────────────────────────────────────────
    socket.on('player:answer', async ({ answerIndex }, cb) => {
      const code = socket._roomCode;
      if (!code) return;
      const result = await rooms.submitAnswer(code, socket.id, answerIndex);
      if (!result) return cb && cb({ error: 'Cannot submit answer now' });

      cb && cb({ ok: true, correct: result.correct, pointsEarned: result.pointsEarned, newScore: result.newScore });

      // Push live leaderboard to host only
      const room = await rooms.getRoom(code);
      if (room) {
        const lb = rooms.getLeaderboard(room);
        io.to(code).emit('room:leaderboardUpdate', { leaderboard: lb.slice(0, 10) });
      }

      // Blooket: trigger random event after correct answer
      if (result.correct) {
        const updatedRoom = await rooms.getRoom(code);
        if (updatedRoom && updatedRoom.mode === 'blooket') {
          const event = await rooms.triggerBlooketEvent(code, socket.id);
          if (event && event.type !== 'nothing') {
            socket.emit('blooket:event', event);
            // Notify all players about score change
            const lb2 = rooms.getLeaderboard(await rooms.getRoom(code));
            io.to(code).emit('room:leaderboardUpdate', { leaderboard: lb2.slice(0, 10) });
          }
        }
      }
    });

    // ── HOST: get current leaderboard ─────────────────────────────────────
    socket.on('host:leaderboard', async (_, cb) => {
      const code = socket._roomCode;
      if (!code) return cb && cb({ leaderboard: [] });
      const room = await rooms.getRoom(code);
      if (!room) return cb && cb({ leaderboard: [] });
      cb && cb({ leaderboard: rooms.getLeaderboard(room) });
    });

    // ── Disconnect cleanup ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const code = socket._roomCode;
      if (!code) return;
      if (socket._isHost) {
        // Host disconnected — notify players
        io.to(code).emit('game:hostLeft');
        clearQuestionTimer(code);
        const room = await rooms.getRoom(code);
        if (room && room.state !== 'ended') {
          room.state = 'ended';
          room.endedAt = Date.now();
          await rooms.saveRoom(room);
          if (room.state === 'ended') await persistResult(room);
        }
      } else {
        await rooms.kickPlayer(code, socket.id);
        io.to(code).emit('room:playerLeft', { socketId: socket.id });
      }
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function emitQuestion(code, q, mode) {
    io.to(code).emit('game:question', {
      index: q.index,
      total: q.total,
      text: q.text,
      options: q.options,
      timeLimit: q.timeLimit,
      points: q.points,
      image: q.image,
      mode,
    });

    // Server-side timer
    const timerId = setTimeout(async () => {
      questionTimers.delete(code);
      // Show correct answer to all
      const room = await rooms.getRoom(code);
      if (!room || room.state === 'ended') return;
      const correct = room.questions[room.currentQuestion]?.correct;
      io.to(code).emit('game:questionEnd', {
        correctIndex: correct,
        leaderboard: rooms.getLeaderboard(room).slice(0, 10),
      });
      // Wait 3s then next question
      setTimeout(() => sendNextOrEnd(code), 3000);
    }, q.timeLimit * 1000);

    questionTimers.set(code, timerId);
  }

  async function sendNextOrEnd(code) {
    const q = await rooms.nextQuestion(code);
    const room = await rooms.getRoom(code);
    if (!room) return;
    if (!q) {
      const lb = rooms.getLeaderboard(room);
      io.to(code).emit('game:ended', { leaderboard: lb });
      await persistResult(room);
    } else {
      emitQuestion(code, q, room.mode);
    }
  }

  async function persistResult(room) {
    try {
      const lb = rooms.getLeaderboard(room);
      await db.pool.query(
        `INSERT INTO multiplayer_results
         (room_code,game_mode,quiz_id,quiz_title,host_id,host_name,players_json,final_scores,started_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          room.code, room.mode, room.quizId, room.quizTitle,
          room.hostId, room.hostName,
          JSON.stringify(lb),
          JSON.stringify(Object.fromEntries(lb.map(p => [p.name, p.score]))),
          room.startedAt ? new Date(room.startedAt) : null,
        ]
      );
    } catch (e) {
      console.error('persistResult error:', e.message);
    }
  }
};
