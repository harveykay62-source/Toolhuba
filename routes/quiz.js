// ─── Quiz Routes ──────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { pool } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  compressQuestions, decompressQuestions,
  getQuizWithQuestions, getQuizList,
  getCreatorStudio, computeBadges,
} = require('../db/quiz-db');
const { v4: uuidv4 } = require('uuid');

const MAX_QUESTIONS  = 50;
const MAX_DATA_BYTES = 600 * 1024; // 600 KB uncompressed

// ── GET /api/quiz/list ────────────────────────────────────────────────────────
router.get('/list', async (req, res) => {
  try {
    const { category, search, sort = 'plays', page = 1 } = req.query;
    const limit  = 12;
    const offset = (Math.max(1, parseInt(page)) - 1) * limit;
    const quizzes = await getQuizList({ status:'approved', category, search, limit, offset, orderBy: sort });
    res.json({ quizzes });
  } catch (e) {
    console.error('quiz list:', e.message);
    res.status(500).json({ error: 'Failed to load quizzes' });
  }
});

// ── GET /api/quiz/trending ────────────────────────────────────────────────────
router.get('/trending', async (req, res) => {
  try {
    const quizzes = await getQuizList({ status:'approved', limit: 6, orderBy:'plays' });
    res.json({ quizzes });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/quiz/my ──────────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,title,description,category,status,plays,likes,questions_count,
              cover_emoji,cover_color,created_at,reject_reason
       FROM quizzes WHERE creator_id=$1 ORDER BY created_at DESC`,
      [req.session.userId]
    );
    res.json({ quizzes: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/quiz/profile ─────────────────────────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const uid = req.session.userId;
    let [prof, myQuizzes, stats] = await Promise.all([
      pool.query(`SELECT * FROM user_quiz_profiles WHERE user_id=$1`, [uid]),
      pool.query(`SELECT id,title,cover_emoji,cover_color,plays,likes,status,questions_count,created_at
                  FROM quizzes WHERE creator_id=$1 ORDER BY created_at DESC LIMIT 10`, [uid]),
      pool.query(`SELECT COUNT(*) as plays, COALESCE(MAX(pct),0) as best
                  FROM quiz_plays WHERE user_id=$1`, [uid])
    ]);
    let profile = prof.rows[0];
    if (!profile) {
      await pool.query(
        `INSERT INTO user_quiz_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [uid]
      );
      const r2 = await pool.query(`SELECT * FROM user_quiz_profiles WHERE user_id=$1`, [uid]);
      profile = r2.rows[0];
    }
    res.json({
      profile,
      user: { name: req.session.name, email: req.session.email, avatarColor: req.session.avatarColor },
      myQuizzes: myQuizzes.rows,
      stats: stats.rows[0]
    });
  } catch (e) {
    console.error('profile:', e.message);
    res.status(500).json({ error: 'Failed' });
  }
});

// ── PUT /api/quiz/profile ─────────────────────────────────────────────────────
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { bio, display_3d } = req.body;
    const uid = req.session.userId;
    const allowed3d = ['globe','cube','star','donut','diamond','none'];
    const obj = allowed3d.includes(display_3d) ? display_3d : 'globe';
    await pool.query(
      `INSERT INTO user_quiz_profiles (user_id,bio,display_3d,updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id) DO UPDATE SET bio=EXCLUDED.bio, display_3d=EXCLUDED.display_3d, updated_at=NOW()`,
      [uid, (bio||'').slice(0,200), obj]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/quiz/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const quiz = await getQuizWithQuestions(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Non-admins can only see approved quizzes (or their own)
    const isOwner = req.session.userId && quiz.creator_id === req.session.userId;
    const isAdmin = req.session.role === 'admin';
    if (quiz.status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Quiz not available' });
    }

    // Leaderboard
    const { rows: leaderboard } = await pool.query(
      `SELECT player_name,score,pct,wildcards_triggered,created_at
       FROM quiz_plays WHERE quiz_id=$1 ORDER BY score DESC LIMIT 10`,
      [req.params.id]
    );

    // User liked?
    let userLiked = false;
    if (req.session.userId) {
      const { rows } = await pool.query(
        `SELECT id FROM quiz_likes WHERE quiz_id=$1 AND user_id=$2`,
        [req.params.id, req.session.userId]
      );
      userLiked = rows.length > 0;
    }

    // Strip correct answers for play (send them separately or not at all)
    const playQuestions = quiz.questions.map(q => ({
      ...q, correct: undefined, explanation: undefined
    }));

    res.json({
      quiz: { ...quiz, compressed_data: undefined, questions: undefined },
      playQuestions,
      answers: quiz.questions.map(q => ({ id: q.id, correct: q.correct, explanation: q.explanation || '' })),
      leaderboard,
      userLiked
    });
  } catch (e) {
    console.error('get quiz:', e.message);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// ── POST /api/quiz/create ─────────────────────────────────────────────────────
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, description, category, questions, wildcard_enabled,
            wildcard_config, cover_emoji, cover_color, tags, time_limit } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' });
    if (!Array.isArray(questions) || questions.length < 1)
      return res.status(400).json({ error: 'At least 1 question required' });
    if (questions.length > MAX_QUESTIONS)
      return res.status(400).json({ error: `Max ${MAX_QUESTIONS} questions` });

    // Validate questions
    for (const q of questions) {
      if (!q.text || !q.text.trim()) return res.status(400).json({ error: 'All questions need text' });
      if (!Array.isArray(q.options) || q.options.length < 2)
        return res.status(400).json({ error: 'Each question needs at least 2 options' });
    }

    // Strip and clean questions
    const cleanedQs = questions.map((q, i) => ({
      id: `q${i+1}`, type: q.type || 'multiple_choice',
      text: String(q.text).slice(0,500),
      image_url: (q.image_url||'').slice(0, 200000), // limit image
      options: (q.options||[]).map(o => String(o).slice(0,200)).slice(0,6),
      correct: parseInt(q.correct) || 0,
      points: Math.min(Math.max(parseInt(q.points)||100, 50), 500),
      time_limit: Math.min(Math.max(parseInt(q.time_limit)||time_limit||30, 5), 120),
      explanation: String(q.explanation||'').slice(0,300)
    }));

    const dataObj = { questions: cleanedQs };
    const dataStr = JSON.stringify(dataObj);
    if (dataStr.length > MAX_DATA_BYTES)
      return res.status(400).json({ error: 'Quiz data too large. Reduce image sizes.' });

    const compressed = await compressQuestions(dataObj);
    const id = uuidv4();
    const validCategories = ['general','science','geography','history','pop-culture','sports','technology','food','art','other'];
    const cat = validCategories.includes(category) ? category : 'general';
    const wcConfig = JSON.stringify(wildcard_config || { enabled: false, frequency:'rare', types:[] });

    await pool.query(
      `INSERT INTO quizzes (id,title,description,category,creator_id,creator_name,status,
        questions_count,wildcard_enabled,wildcard_config,cover_emoji,cover_color,
        compressed_data,tags,time_limit)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        id, title.trim().slice(0,100), (description||'').trim().slice(0,500), cat,
        req.session.userId, req.session.name,
        cleanedQs.length,
        !!wildcard_enabled, wcConfig,
        (cover_emoji||'🧠').slice(0,4), (cover_color||'#6366f1').slice(0,7),
        compressed, (tags||'').slice(0,200), Math.min(Math.max(parseInt(time_limit)||30,5),120)
      ]
    );

    // Update user profile counts
    await pool.query(
      `INSERT INTO user_quiz_profiles (user_id,total_quizzes) VALUES ($1,1)
       ON CONFLICT (user_id) DO UPDATE SET total_quizzes=user_quiz_profiles.total_quizzes+1, updated_at=NOW()`,
      [req.session.userId]
    );

    res.json({ success: true, id, message: 'Quiz submitted for admin review!' });
  } catch (e) {
    console.error('create quiz:', e.message);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// ── PUT /api/quiz/:id ─────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM quizzes WHERE id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const quiz = rows[0];
    if (quiz.creator_id !== req.session.userId && req.session.role !== 'admin')
      return res.status(403).json({ error: 'Not authorised' });

    const { title, description, questions, wildcard_enabled, wildcard_config,
            cover_emoji, cover_color, tags, time_limit } = req.body;

    const cleanedQs = (questions||[]).map((q,i) => ({
      id:`q${i+1}`, type:q.type||'multiple_choice',
      text:String(q.text||'').slice(0,500),
      image_url:(q.image_url||'').slice(0,200000),
      options:(q.options||[]).map(o=>String(o).slice(0,200)).slice(0,6),
      correct:parseInt(q.correct)||0,
      points:Math.min(Math.max(parseInt(q.points)||100,50),500),
      time_limit:Math.min(Math.max(parseInt(q.time_limit)||30,5),120),
      explanation:String(q.explanation||'').slice(0,300)
    }));

    const compressed = await compressQuestions({ questions: cleanedQs });

    await pool.query(
      `UPDATE quizzes SET title=$2,description=$3,questions_count=$4,wildcard_enabled=$5,
        wildcard_config=$6,cover_emoji=$7,cover_color=$8,compressed_data=$9,tags=$10,
        time_limit=$11,status='pending',updated_at=NOW() WHERE id=$1`,
      [
        req.params.id,
        (title||quiz.title).slice(0,100),
        (description||quiz.description||'').slice(0,500),
        cleanedQs.length, !!wildcard_enabled,
        JSON.stringify(wildcard_config||{}),
        (cover_emoji||quiz.cover_emoji).slice(0,4),
        (cover_color||quiz.cover_color).slice(0,7),
        compressed, (tags||quiz.tags||'').slice(0,200),
        Math.min(Math.max(parseInt(time_limit)||30,5),120)
      ]
    );
    res.json({ success: true, message: 'Updated — pending re-approval' });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── DELETE /api/quiz/:id ──────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT creator_id FROM quizzes WHERE id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].creator_id !== req.session.userId && req.session.role !== 'admin')
      return res.status(403).json({ error: 'Not authorised' });
    await pool.query(`DELETE FROM quizzes WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── POST /api/quiz/:id/play ───────────────────────────────────────────────────
router.post('/:id/play', async (req, res) => {
  try {
    const { score, maxScore, questionsAnswered, wildcardsTriggered, timeTaken,
            bossBattlesBeaten, betsWon, streakMax } = req.body;
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const playerName = req.session.name || 'Guest';
    await pool.query(
      `INSERT INTO quiz_plays (quiz_id,user_id,player_name,score,max_score,pct,questions_answered,
        wildcards_triggered,boss_battles_beaten,bets_won,streak_max,time_taken)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [req.params.id, req.session.userId||null, playerName, score||0,
       maxScore||0, pct, questionsAnswered||0, wildcardsTriggered||0,
       bossBattlesBeaten||0, betsWon||0, streakMax||0, timeTaken||0]
    );
    await pool.query(`UPDATE quizzes SET plays=plays+1 WHERE id=$1`, [req.params.id]);
    if (req.session.userId) {
      await pool.query(
        `INSERT INTO user_quiz_profiles (user_id,total_plays,best_score) VALUES ($1,1,$2)
         ON CONFLICT (user_id) DO UPDATE SET
           total_plays=user_quiz_profiles.total_plays+1,
           best_score=GREATEST(user_quiz_profiles.best_score,$2),
           updated_at=NOW()`,
        [req.session.userId, pct]
      );
    }
    res.json({ success: true, pct });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// ── POST /api/quiz/:id/like ───────────────────────────────────────────────────
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const uid = req.session.userId;
    const qid = req.params.id;
    const { rows } = await pool.query(`SELECT id FROM quiz_likes WHERE quiz_id=$1 AND user_id=$2`, [qid, uid]);
    if (rows.length) {
      await pool.query(`DELETE FROM quiz_likes WHERE quiz_id=$1 AND user_id=$2`, [qid, uid]);
      await pool.query(`UPDATE quizzes SET likes=GREATEST(0,likes-1) WHERE id=$1`, [qid]);
      res.json({ liked: false });
    } else {
      await pool.query(`INSERT INTO quiz_likes (quiz_id,user_id) VALUES ($1,$2)`, [qid, uid]);
      await pool.query(`UPDATE quizzes SET likes=likes+1 WHERE id=$1`, [qid]);
      res.json({ liked: true });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Admin: GET /api/quiz/admin/pending ────────────────────────────────────────
router.get('/admin/pending', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,title,description,category,creator_name,questions_count,
              wildcard_enabled,cover_emoji,tags,created_at,status,reject_reason
       FROM quizzes WHERE status IN ('pending','rejected')
       ORDER BY created_at DESC LIMIT 50`
    );
    const { rows: stats } = await pool.query(
      `SELECT status, COUNT(*) as count FROM quizzes GROUP BY status`
    );
    res.json({ quizzes: rows, stats });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Admin: POST /api/quiz/admin/:id/approve ───────────────────────────────────
router.post('/admin/:id/approve', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE quizzes SET status='approved',approved_at=NOW(),approved_by=$2,reject_reason='' WHERE id=$1`,
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Admin: POST /api/quiz/admin/:id/reject ────────────────────────────────────
router.post('/admin/:id/reject', requireAdmin, async (req, res) => {
  try {
    const reason = (req.body.reason || 'Does not meet guidelines').slice(0, 200);
    await pool.query(
      `UPDATE quizzes SET status='rejected',reject_reason=$2 WHERE id=$1`,
      [req.params.id, reason]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Admin: DELETE /api/quiz/admin/:id ─────────────────────────────────────────
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM quizzes WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/quiz/admin/all ───────────────────────────────────────────────────
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,title,category,creator_name,status,plays,likes,questions_count,
              created_at,is_starter FROM quizzes ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ quizzes: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/quiz/studio — Creator analytics dashboard ───────────────────────
router.get('/studio', requireAuth, async (req, res) => {
  try {
    const data = await getCreatorStudio(req.session.userId);
    res.json(data);
  } catch (e) {
    console.error('studio:', e.message);
    res.status(500).json({ error: 'Failed to load studio' });
  }
});

// ── GET /api/quiz/badges — Compute user badges ────────────────────────────────
router.get('/badges', requireAuth, async (req, res) => {
  try {
    const uid = req.session.userId;
    const [prof, stats] = await Promise.all([
      pool.query(`SELECT * FROM user_quiz_profiles WHERE user_id=$1`, [uid]),
      pool.query(`SELECT COUNT(*) as plays FROM quiz_plays WHERE user_id=$1`, [uid]),
    ]);
    const badges = computeBadges(prof.rows[0], stats.rows[0]);
    res.json({ badges });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
