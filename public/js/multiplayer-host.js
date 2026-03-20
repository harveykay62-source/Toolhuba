/* ── ToolHub AI — multiplayer-host.js ────────────────────────────────────── */
'use strict';

const HostGame = (() => {
  let socket, mode, selectedQuizId, roomCode, questionTimerId, currentTimeout;

  const MODE_META = {
    kahoot:  { label: 'Classic',    icon: '🏫', color: '#6366f1', desc: 'Standard live quiz with countdown timer, streaks, and a real-time leaderboard. Great for classrooms.' },
    blooket: { label: 'Gold Quest', icon: '⚔️', color: '#f59e0b', desc: 'Answer questions to open mystery chests. Steal gold, hit multipliers, and outsmart your rivals.' }
  };

  async function init(gameMode) {
    mode = gameMode;
    const app = document.getElementById('hostApp');

    // Check auth
    const initData = await fetch('/api/init').then(r => r.json());
    if (!initData.session.loggedIn) {
      window.location.href = '/login?redirect=/host-game';
      return;
    }

    // If no mode specified, show mode selection first
    if (!mode) {
      renderModeSelect(app, initData.session);
    } else {
      renderQuizSelect(app, initData.session);
    }
  }

  function renderModeSelect(app, session) {
    app.innerHTML = `
    <div class="host-wrap slide-up">
      <div style="max-width:700px;margin:0 auto;padding:40px 20px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:36px">
          <a href="/multiplayer" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#94a3b8;padding:8px 16px;border-radius:10px;text-decoration:none;font-size:.88rem;transition:all .2s;font-weight:500">← Back</a>
          <h1 style="color:#fff;font-size:1.5rem;font-weight:800;flex:1;letter-spacing:-.02em">Setup a Game</h1>
        </div>

        <p style="color:#64748b;font-size:.95rem;margin-bottom:32px;line-height:1.6">Choose a game mode to get started.</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
          <div class="mode-select-card" onclick="HostGame.pickMode('kahoot')" style="
            background:rgba(99,102,241,.06);border:1.5px solid rgba(99,102,241,.15);border-radius:18px;
            padding:28px 24px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden
          " onmouseenter="this.style.borderColor='rgba(99,102,241,.4)';this.style.transform='translateY(-3px)';this.style.boxShadow='0 16px 48px rgba(99,102,241,.12)'"
             onmouseleave="this.style.borderColor='rgba(99,102,241,.15)';this.style.transform='';this.style.boxShadow=''">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
              <div style="width:48px;height:48px;border-radius:14px;background:rgba(99,102,241,.15);display:flex;align-items:center;justify-content:center;font-size:1.5rem">🏫</div>
              <div>
                <div style="font-size:1.15rem;font-weight:700;color:#fff">Classic</div>
                <div style="font-size:.78rem;color:#6366f1;font-weight:600;margin-top:2px">Standard Quiz</div>
              </div>
            </div>
            <div style="color:#94a3b8;font-size:.88rem;line-height:1.6">Live questions with countdown timer, streak bonuses, and a real-time leaderboard.</div>
            <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
              <span style="background:rgba(99,102,241,.1);color:#818cf8;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">⏱ Timed</span>
              <span style="background:rgba(99,102,241,.1);color:#818cf8;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">🔥 Streaks</span>
              <span style="background:rgba(99,102,241,.1);color:#818cf8;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">🏆 Leaderboard</span>
            </div>
          </div>

          <div class="mode-select-card" onclick="HostGame.pickMode('blooket')" style="
            background:rgba(245,158,11,.06);border:1.5px solid rgba(245,158,11,.15);border-radius:18px;
            padding:28px 24px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden
          " onmouseenter="this.style.borderColor='rgba(245,158,11,.4)';this.style.transform='translateY(-3px)';this.style.boxShadow='0 16px 48px rgba(245,158,11,.12)'"
             onmouseleave="this.style.borderColor='rgba(245,158,11,.15)';this.style.transform='';this.style.boxShadow=''">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
              <div style="width:48px;height:48px;border-radius:14px;background:rgba(245,158,11,.15);display:flex;align-items:center;justify-content:center;font-size:1.5rem">⚔️</div>
              <div>
                <div style="font-size:1.15rem;font-weight:700;color:#fff">Gold Quest</div>
                <div style="font-size:.78rem;color:#f59e0b;font-weight:600;margin-top:2px">Strategy Mode</div>
              </div>
            </div>
            <div style="color:#94a3b8;font-size:.88rem;line-height:1.6">Answer questions to open mystery chests. Steal gold, hit multipliers, and outsmart rivals.</div>
            <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
              <span style="background:rgba(245,158,11,.1);color:#fbbf24;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">📦 Chests</span>
              <span style="background:rgba(245,158,11,.1);color:#fbbf24;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">🦊 Steal</span>
              <span style="background:rgba(245,158,11,.1);color:#fbbf24;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">🔄 Swap</span>
              <span style="background:rgba(245,158,11,.1);color:#fbbf24;padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:600">❄️ Freeze</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pickMode(m) {
    mode = m;
    // Update URL without reload
    history.replaceState(null, '', '/host-game?mode=' + mode);
    renderQuizSelect(document.getElementById('hostApp'));
  }

  async function renderQuizSelect(app) {
    const meta = MODE_META[mode] || MODE_META.blooket;

    app.innerHTML = `
    <div class="host-wrap slide-up">
      <div style="max-width:800px;margin:0 auto;padding:40px 20px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px;flex-wrap:wrap">
          <button onclick="HostGame.backToMode()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#94a3b8;padding:8px 16px;border-radius:10px;cursor:pointer;font-size:.88rem;font-weight:500;transition:all .2s;font-family:'Inter',sans-serif">← Back</button>
          <h1 style="color:#fff;font-size:1.4rem;font-weight:800;flex:1;letter-spacing:-.02em">Select a Quiz</h1>
          <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:12px;font-size:.82rem;font-weight:700;background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}33">${meta.icon} ${meta.label}</span>
        </div>
        <div class="quiz-select-wrap">
          <div id="quizGrid" class="quiz-select-grid">
            <div style="color:#64748b;grid-column:1/-1;text-align:center;padding:40px">Loading quizzes…</div>
          </div>
          <div style="margin-top:28px;display:flex;justify-content:flex-end;gap:12px">
            <button id="btnCreate" onclick="HostGame.createGame()" disabled
              style="background:linear-gradient(135deg,${meta.color},${meta.color}dd);color:#fff;border:none;border-radius:14px;padding:14px 32px;font-size:1rem;font-weight:700;cursor:pointer;opacity:.4;transition:all .2s;font-family:'Inter',sans-serif">
              Create Game Room →
            </button>
          </div>
        </div>
      </div>
    </div>`;

    await loadQuizzes();
  }

  function backToMode() {
    mode = null;
    history.replaceState(null, '', '/host-game');
    renderModeSelect(document.getElementById('hostApp'));
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

    // Gold Quest host events
    socket.on('gq:gameStarted', (data) => {
      gqTimeLimit = data.timeLimit;
      gqTimeRemaining = data.timeLimit;
      renderGQHostView(data);
    });
    socket.on('gq:timer', ({ remaining }) => {
      gqTimeRemaining = remaining;
      const el = document.getElementById('gqHostTimer');
      if (el) {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (remaining <= 30) el.style.color = '#ef4444';
      }
      const bar = document.getElementById('gqTimerBar');
      if (bar && gqTimeLimit > 0) {
        bar.style.width = (remaining / gqTimeLimit * 100) + '%';
      }
    });

    socket.on('game:ended', ({ leaderboard }) => {
      sessionStorage.setItem('th_final_lb', JSON.stringify(leaderboard));
      window.location.href = '/leaderboard?code=' + roomCode;
    });
    socket.on('disconnect', () => {
      showToast('Connection lost. Reconnecting…', 'error');
    });
  }

  let gqTimeLimit = 300, gqTimeRemaining = 300;

  function renderLobby({ code, quizTitle, questionCount }) {
    const app = document.getElementById('hostApp');
    const meta = MODE_META[mode] || MODE_META.blooket;
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
            <span class="lobby-mode-badge" style="background:${meta.color}">${meta.icon} ${meta.label}</span>
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
            <button onclick="HostGame.skipQuestion()" style="width:100%;background:rgba(255,255,255,.08);border:none;color:#fff;padding:10px;border-radius:10px;cursor:pointer;margin-bottom:8px;font-family:'Inter',sans-serif">⏭ Skip Question</button>
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
    const meta = MODE_META[mode] || MODE_META.blooket;
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
            <button onclick="HostGame.skipQuestion()" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer;font-family:'Inter',sans-serif;font-size:.88rem;font-weight:500;transition:all .2s">⏭ Skip</button>
            <button onclick="HostGame.endGame()" style="background:#ef4444;border:none;color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer;font-family:'Inter',sans-serif;font-size:.88rem;font-weight:600">■ End Game</button>
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

  // ══════════════════════════════════════════════════════════════════════
  // GOLD QUEST HOST VIEW
  // ══════════════════════════════════════════════════════════════════════

  function renderGQHostView({ timeLimit, goldGoal, questionCount }) {
    const app = document.getElementById('hostApp');
    const m = Math.floor(timeLimit / 60);
    const s = timeLimit % 60;

    app.innerHTML = `
    <div class="host-wrap">
      <div style="max-width:900px;margin:0 auto">
        <div class="gq-host-header slide-up">
          <div class="gq-host-mode">
            <span style="font-size:1.6rem">⚔️</span>
            <div>
              <div style="font-size:1.3rem;font-weight:800;color:#fff;letter-spacing:-.02em">Gold Quest</div>
              <div style="font-size:.82rem;color:#64748b;font-weight:500">${questionCount} questions · Room ${roomCode}</div>
            </div>
          </div>
          <div class="gq-host-timer-wrap">
            <div style="font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Time Remaining</div>
            <div class="gq-host-timer" id="gqHostTimer">${m}:${s.toString().padStart(2, '0')}</div>
            <div class="gq-host-timer-bar"><div class="gq-host-timer-fill" id="gqTimerBar" style="width:100%"></div></div>
          </div>
          <button onclick="HostGame.endGame()" style="background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:10px 20px;font-size:.88rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s">■ End Game</button>
        </div>

        <div class="gq-host-lb-wrap fade-in" style="margin-top:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <h2 style="font-size:1.1rem;font-weight:700;color:#94a3b8;margin:0">🏆 Live Gold Leaderboard</h2>
            <div style="font-size:.8rem;color:#475569">Auto-updates in real time</div>
          </div>
          <div id="sideLeaderboard">
            <div style="color:#475569;font-size:.88rem;text-align:center;padding:40px">Players are answering questions and opening chests…</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function updateSideLeaderboard(leaderboard) {
    const el = document.getElementById('sideLeaderboard');
    if (!el) return;
    const medals = ['🥇','🥈','🥉'];
    const isGQ = mode === 'blooket';
    el.innerHTML = leaderboard.slice(0, 15).map((p, i) => `
      <div class="lb-row ${i===0?'lb-first':i===1?'lb-second':i===2?'lb-third':''}">
        <div class="lb-rank">${medals[i] || (i + 1)}</div>
        <div class="lb-name">${esc(p.name)}</div>
        <div class="lb-score">${isGQ ? '🪙 ' : ''}${p.score.toLocaleString()}</div>
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
    t.style.cssText = `position:fixed;top:20px;right:20px;background:${type==='error'?'#ef4444':'#10b981'};color:#fff;padding:12px 20px;border-radius:12px;font-weight:600;z-index:9999;font-family:'Inter',sans-serif;font-size:.9rem;box-shadow:0 8px 24px rgba(0,0,0,.3)`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, pickMode, backToMode, selectQuiz, createGame, startGame, skipQuestion, endGame };
})();
