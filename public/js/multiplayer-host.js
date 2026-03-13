/* ── ToolHub AI — multiplayer-host.js ────────────────────────────────────── */
'use strict';

const HostGame = (() => {
  let socket, mode, selectedQuizId, roomCode, questionTimerId, currentTimeout;

  async function init(gameMode) {
    mode = gameMode;
    const app = document.getElementById('hostApp');

    // Check auth
    const init = await fetch('/api/init').then(r => r.json());
    if (!init.session.loggedIn) {
      window.location.href = '/login?redirect=/host-game&mode=' + mode;
      return;
    }

    renderQuizSelect(app, init.session);
  }

  async function renderQuizSelect(app, session) {
    const modeLabel = mode === 'kahoot' ? '🏫 Kahoot' : '🎲 Blooket';
    const modeClass = mode === 'kahoot' ? 'mode-kahoot' : 'mode-blooket';

    app.innerHTML = `
    <div class="host-wrap slide-up">
      <div style="max-width:800px;margin:0 auto">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
          <button onclick="history.back()" style="background:rgba(255,255,255,.1);border:none;color:#fff;padding:8px 16px;border-radius:10px;cursor:pointer">← Back</button>
          <h1 style="color:#fff;font-size:1.4rem;font-weight:700;flex:1">Host a Game</h1>
          <span class="lobby-mode-badge ${modeClass}">${modeLabel}</span>
        </div>
        <div class="quiz-select-wrap">
          <h2>Select a Quiz</h2>
          <div id="quizGrid" class="quiz-select-grid">
            <div style="color:#64748b;grid-column:1/-1;text-align:center;padding:40px">Loading quizzes…</div>
          </div>
          <div style="margin-top:24px;text-align:right">
            <button id="btnCreate" onclick="HostGame.createGame()" disabled
              style="background:#6366f1;color:#fff;border:none;border-radius:14px;padding:14px 32px;font-size:1rem;font-weight:700;cursor:pointer;opacity:.4;transition:opacity .2s">
              Create Game Room →
            </button>
          </div>
        </div>
      </div>
    </div>`;

    await loadQuizzes();
  }

  async function loadQuizzes() {
    try {
      const data = await fetch('/api/multiplayer/quizzes?mode=' + mode).then(r => r.json());
      const grid = document.getElementById('quizGrid');
      if (!data.quizzes || !data.quizzes.length) {
        grid.innerHTML = '<div style="color:#64748b;text-align:center;padding:40px;grid-column:1/-1">No quizzes available</div>';
        return;
      }
      grid.innerHTML = data.quizzes.map(q => `
        <div class="quiz-select-card" id="qsc-${q.id}" onclick="HostGame.selectQuiz('${q.id}')">
          <div class="qsc-cover" style="background:${q.cover_color || '#6366f1'}">${q.cover_emoji || '🧠'}</div>
          <div class="qsc-title">${esc(q.title)}</div>
          <div class="qsc-meta">▶ ${q.plays || 0} plays · ${q.questions_count || 0} Qs</div>
          ${q.wildcard_enabled ? '<div style="margin-top:6px;font-size:.75rem;color:#f59e0b">🃏 Wild Cards</div>' : ''}
        </div>
      `).join('');
    } catch (e) {
      document.getElementById('quizGrid').innerHTML = '<div style="color:#ef4444;grid-column:1/-1;text-align:center;padding:40px">Failed to load quizzes</div>';
    }
  }

  function selectQuiz(id) {
    selectedQuizId = id;
    document.querySelectorAll('.quiz-select-card').forEach(c => c.classList.remove('selected'));
    const el = document.getElementById('qsc-' + id);
    if (el) el.classList.add('selected');
    const btn = document.getElementById('btnCreate');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }

  async function createGame() {
    if (!selectedQuizId) return;
    const btn = document.getElementById('btnCreate');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    socket = io();
    socket.emit('host:create', { quizId: selectedQuizId, mode }, (res) => {
      if (res.error) {
        alert('Error: ' + res.error);
        if (btn) { btn.disabled = false; btn.textContent = 'Create Game Room →'; }
        return;
      }
      roomCode = res.code;
      // Store socket id for game room
      sessionStorage.setItem('th_room', JSON.stringify({ code: roomCode, isHost: true, mode, quizTitle: res.quizTitle, questionCount: res.questionCount }));
      renderLobby(res);
    });

    socket.on('room:playerJoined', ({ socketId, name, playerCount }) => {
      addPlayerChip(socketId, name);
      const cnt = document.getElementById('playerCount');
      if (cnt) cnt.textContent = `${playerCount} player${playerCount !== 1 ? 's' : ''} joined`;
    });

    socket.on('room:playerLeft', ({ socketId }) => {
      const chip = document.getElementById('chip-' + socketId);
      if (chip) chip.remove();
    });

    socket.on('game:starting', ({ countdown }) => renderCountdown(countdown));

    socket.on('game:question', (q) => renderHostQuestion(q));

    socket.on('game:questionEnd', ({ correctIndex, leaderboard }) => {
      showHostCorrect(correctIndex, leaderboard);
    });

    socket.on('room:leaderboardUpdate', ({ leaderboard }) => updateSideLeaderboard(leaderboard));

    socket.on('game:ended', ({ leaderboard }) => {
      sessionStorage.setItem('th_final_lb', JSON.stringify(leaderboard));
      window.location.href = '/leaderboard?code=' + roomCode;
    });

    socket.on('disconnect', () => {
      showToast('Connection lost. Reconnecting…', 'error');
    });
  }

  function renderLobby({ code, quizTitle, questionCount }) {
    const app = document.getElementById('hostApp');
    const modeLabel = mode === 'kahoot' ? '🏫 Kahoot-Style' : '🎲 Blooket-Style';
    const modeClass = mode === 'kahoot' ? 'mode-kahoot' : 'mode-blooket';
    app.innerHTML = `
    <div class="host-wrap">
      <div class="host-layout">
        <div class="host-main">
          <div class="lobby-wrap fade-in">
            <div class="lobby-code-card">
              <div class="lobby-code-label">Share this code with your players</div>
              <div class="lobby-code">${code}</div>
              <div class="lobby-share">Join at: <strong>${location.hostname}/join-game</strong></div>
            </div>
            <span class="lobby-mode-badge ${modeClass}">${modeLabel}</span>
            <div class="lobby-quiz-info">📚 <strong>${esc(quizTitle)}</strong> · ${questionCount} questions</div>
            <div class="player-count" id="playerCount">0 players joined</div>
            <div class="players-grid" id="playersGrid"></div>
            <div class="host-controls">
              <button class="btn-start" onclick="HostGame.startGame()">▶ Start Game</button>
              <button class="btn-end" onclick="HostGame.endGame()">■ End Game</button>
            </div>
          </div>
        </div>
        <div class="host-sidebar">
          <div class="lb-side">
            <h3>🏆 Leaderboard</h3>
            <div id="sideLeaderboard"><div style="color:#64748b;font-size:.85rem">Waiting for players…</div></div>
          </div>
          <div style="margin-top:16px;background:rgba(255,255,255,.04);border-radius:12px;padding:16px">
            <div style="color:#94a3b8;font-size:.8rem;margin-bottom:8px">Host Controls</div>
            <button onclick="HostGame.skipQuestion()" style="width:100%;background:rgba(255,255,255,.08);border:none;color:#fff;padding:10px;border-radius:10px;cursor:pointer;margin-bottom:8px">⏭ Skip Question</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function addPlayerChip(socketId, name) {
    const grid = document.getElementById('playersGrid');
    if (!grid) return;
    const avatars = ['🎮','🦊','🐯','🦁','🐸','🦄','🐉','⭐','🚀','🎯'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    chip.id = 'chip-' + socketId;
    chip.innerHTML = `<span class="player-avatar">${avatar}</span>${esc(name)}`;
    grid.appendChild(chip);
  }

  function renderCountdown(from) {
    const overlay = document.createElement('div');
    overlay.className = 'countdown-overlay';
    overlay.id = 'cdOverlay';
    overlay.innerHTML = `<div class="countdown-num" id="cdNum">${from}</div><div class="countdown-label">Get ready!</div>`;
    document.body.appendChild(overlay);
    let n = from;
    const t = setInterval(() => {
      n--;
      const el = document.getElementById('cdNum');
      if (el) { el.textContent = n; el.style.animation = 'none'; void el.offsetHeight; el.style.animation = ''; }
      if (n <= 0) { clearInterval(t); overlay.remove(); }
    }, 1000);
  }

  function renderHostQuestion({ index, total, text, options, timeLimit, image, mode: qMode }) {
    const app = document.getElementById('hostApp');
    const modeLabel = mode === 'blooket' ? '🎲 Blooket' : '🏫 Kahoot';
    app.innerHTML = `
    <div class="host-wrap">
      <div class="host-layout">
        <div class="host-main slide-up">
          <div class="question-wrap">
            <div class="q-header">
              <div class="q-counter">Q${index + 1} / ${total}</div>
              <div class="q-timer-bar-wrap"><div class="q-timer-bar" id="timerBar" style="width:100%"></div></div>
              <div class="q-timer-num" id="timerNum">${timeLimit}</div>
            </div>
            ${image ? `<img class="q-image" src="${image}" alt="">` : ''}
            <div class="q-text">${esc(text)}</div>
            <div class="answers-grid">
              ${options.map((o, i) => `
                <div class="answer-btn a${i}" style="cursor:default">
                  <div class="answer-letter">${'ABCD'[i]}</div>
                  <span>${esc(o)}</span>
                </div>`).join('')}
            </div>
          </div>
          <div style="margin-top:20px;display:flex;gap:12px">
            <button onclick="HostGame.skipQuestion()" style="background:rgba(255,255,255,.1);border:none;color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer">⏭ Skip</button>
            <button onclick="HostGame.endGame()" style="background:#ef4444;border:none;color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer">■ End Game</button>
          </div>
        </div>
        <div class="host-sidebar">
          <div class="lb-side">
            <h3>🏆 Live Scores</h3>
            <div id="sideLeaderboard"><div style="color:#64748b;font-size:.85rem">Waiting for answers…</div></div>
          </div>
        </div>
      </div>
    </div>`;

    startClientTimer(timeLimit);
  }

  function startClientTimer(secs) {
    let remaining = secs;
    const bar = document.getElementById('timerBar');
    const num = document.getElementById('timerNum');
    clearInterval(questionTimerId);
    questionTimerId = setInterval(() => {
      remaining--;
      const pct = (remaining / secs) * 100;
      if (bar) { bar.style.width = pct + '%'; if (pct < 30) bar.classList.add('warning'); }
      if (num) num.textContent = remaining;
      if (remaining <= 0) clearInterval(questionTimerId);
    }, 1000);
  }

  function showHostCorrect(correctIndex, leaderboard) {
    clearInterval(questionTimerId);
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      if (i === correctIndex) btn.classList.add('correct');
      else btn.classList.add('wrong');
    });
    updateSideLeaderboard(leaderboard);
  }

  function updateSideLeaderboard(leaderboard) {
    const el = document.getElementById('sideLeaderboard');
    if (!el) return;
    const medals = ['🥇','🥈','🥉'];
    el.innerHTML = leaderboard.slice(0, 10).map((p, i) => `
      <div class="lb-row ${i===0?'lb-first':i===1?'lb-second':i===2?'lb-third':''}">
        <div class="lb-rank">${medals[i] || (i + 1)}</div>
        <div class="lb-name">${esc(p.name)}</div>
        <div class="lb-score">${p.score.toLocaleString()}</div>
      </div>`).join('');
  }

  function startGame() {
    if (!socket) return;
    socket.emit('host:start', {}, (res) => {
      if (res && res.error) showToast(res.error, 'error');
    });
  }

  function skipQuestion() {
    if (!socket) return;
    socket.emit('host:skip');
  }

  function endGame() {
    if (!socket) return;
    if (!confirm('End this game now?')) return;
    socket.emit('host:end');
  }

  function showToast(msg, type) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:20px;right:20px;background:${type==='error'?'#ef4444':'#10b981'};color:#fff;padding:12px 20px;border-radius:12px;font-weight:600;z-index:9999`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, selectQuiz, createGame, startGame, skipQuestion, endGame };
})();
