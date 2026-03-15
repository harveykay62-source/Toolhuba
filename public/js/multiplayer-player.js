/* ── ToolHub AI — multiplayer-player.js ─────────────────────────────────── */
'use strict';

const PlayerGame = (() => {
  let socket, roomCode, playerName, mode;
  let myScore = 0, myGold = 0, myStreak = 0, answered = false;
  let timerInterval, gameTimerVal = 0;

  async function init(code) {
    roomCode = code ? code.toUpperCase() : '';
    const app = document.getElementById('joinApp');

    let roomInfo = null;
    if (roomCode) {
      try {
        const r = await fetch('/api/multiplayer/validate-code', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ code: roomCode })
        }).then(r => r.json());
        if (!r.error) roomInfo = r;
      } catch {}
    }

    renderJoinScreen(app, roomInfo);
  }

  function renderJoinScreen(app, roomInfo) {
    app.innerHTML = `
    <div class="join-screen fade-in">
      <div style="font-size:3rem;margin-bottom:16px">🎮</div>
      <h1>Join Game</h1>
      <p>Enter the code your host shared with you</p>
      ${!roomCode ? `<input class="join-name-input" id="codeInput" type="text" maxlength="6" placeholder="Game Code" style="text-transform:uppercase;letter-spacing:.1em" oninput="this.value=this.value.toUpperCase()">` : ''}
      ${roomInfo ? `
      <div class="join-room-info">
        <strong>📚 ${esc(roomInfo.quizTitle)}</strong><br>
        Hosted by ${esc(roomInfo.hostName)} · ${roomInfo.playerCount} players<br>
        <span class="lobby-mode-badge ${roomInfo.mode==='kahoot'?'mode-kahoot':'mode-blooket'}" style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700">${roomInfo.mode==='kahoot'?'🏫 Classic':'⚔️ Gold Quest'}</span>
      </div>` : (roomCode ? `<div class="join-room-info" style="color:#f87171">Room "${roomCode}" not found. Check the code.</div>` : '')}
      <input class="join-name-input" id="nameInput" type="text" maxlength="24" placeholder="Your nickname">
      <button class="btn-join-submit" onclick="PlayerGame.doJoin()">Join Game →</button>
      <div id="joinErr" style="color:#f87171;margin-top:12px;font-size:.9rem"></div>
    </div>`;

    setTimeout(() => document.getElementById('nameInput')?.focus(), 100);
    document.getElementById('nameInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  }

  async function doJoin() {
    const codeEl = document.getElementById('codeInput');
    if (codeEl) roomCode = codeEl.value.trim().toUpperCase();
    playerName = document.getElementById('nameInput').value.trim();

    if (!roomCode || roomCode.length < 4) {
      document.getElementById('joinErr').textContent = 'Enter a valid game code.'; return;
    }
    if (!playerName) {
      document.getElementById('joinErr').textContent = 'Enter your nickname.'; return;
    }

    document.getElementById('joinErr').textContent = '';
    const btn = document.querySelector('.btn-join-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Joining…'; }

    socket = io();

    socket.emit('player:join', { code: roomCode, name: playerName }, (res) => {
      if (res.error) {
        document.getElementById('joinErr').textContent = res.error;
        if (btn) { btn.disabled = false; btn.textContent = 'Join Game →'; }
        return;
      }
      mode = res.mode;
      sessionStorage.setItem('th_player', JSON.stringify({ code: roomCode, name: playerName, mode }));
      renderWaiting(res.quizTitle, res.mode);
    });

    // Shared events
    socket.on('room:playerJoined', ({ name, playerCount }) => {
      const cnt = document.getElementById('waitingCount');
      if (cnt) cnt.textContent = `${playerCount} player${playerCount !== 1 ? 's' : ''} in room`;
    });

    socket.on('game:starting', ({ mode: m, countdown }) => {
      mode = m;
      renderCountdown(countdown);
    });

    // Classic mode events
    socket.on('game:question', (q) => { answered = false; renderClassicQuestion(q); });
    socket.on('game:questionEnd', ({ correctIndex, leaderboard }) => {
      clearInterval(timerInterval);
      revealClassicAnswer(correctIndex, leaderboard);
    });

    // Gold Quest events
    socket.on('gq:gameStarted', (data) => {
      gameTimerVal = data.timeLimit;
      startGoldQuestFlow();
    });

    socket.on('gq:timer', ({ remaining }) => {
      gameTimerVal = remaining;
      const el = document.getElementById('gqTimer');
      if (el) {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (remaining <= 30) el.style.color = '#ef4444';
      }
    });

    // Shared events
    socket.on('room:leaderboardUpdate', ({ leaderboard }) => updateMiniLb(leaderboard));

    socket.on('game:ended', ({ leaderboard }) => {
      sessionStorage.setItem('th_final_lb', JSON.stringify(leaderboard));
      window.location.href = '/leaderboard?code=' + roomCode;
    });

    socket.on('game:kicked', () => {
      document.getElementById('joinApp').innerHTML = `
        <div class="join-screen">
          <div style="font-size:3rem">🚫</div>
          <h1 style="color:#ef4444">You were kicked</h1>
          <p style="color:#94a3b8">The host removed you from this game.</p>
          <a href="/multiplayer" class="btn-join-submit" style="display:inline-block;margin-top:20px;text-decoration:none">Back to Multiplayer</a>
        </div>`;
    });

    socket.on('game:hostLeft', () => {
      alert('The host left the game.');
      window.location.href = '/multiplayer';
    });
  }

  function renderWaiting(quizTitle, gameMode) {
    const modeClass = gameMode === 'kahoot' ? 'mode-kahoot' : 'mode-blooket';
    const modeLabel = gameMode === 'kahoot' ? '🏫 Classic' : '⚔️ Gold Quest';
    document.getElementById('joinApp').innerHTML = `
    <div class="waiting-screen bounce-in">
      <span class="lobby-mode-badge ${modeClass}">${modeLabel}</span>
      <div class="waiting-player-name">👤 ${esc(playerName)}</div>
      <div class="waiting-quiz">📚 ${esc(quizTitle)}</div>
      <div id="waitingCount" style="color:#94a3b8;font-size:.9rem;margin-bottom:12px">1 player in room</div>
      <div class="waiting-anim">
        <div class="waiting-dot"></div><div class="waiting-dot"></div><div class="waiting-dot"></div>
      </div>
      <div class="waiting-msg">Waiting for the host to start…</div>
    </div>`;
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
      if (el) { el.textContent = n > 0 ? n : 'GO!'; el.style.animation = 'none'; void el.offsetHeight; el.style.animation = ''; }
      if (n <= 0) { clearInterval(t); setTimeout(() => overlay.remove(), 500); }
    }, 1000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLASSIC MODE
  // ══════════════════════════════════════════════════════════════════════════

  function renderClassicQuestion({ index, total, text, options, timeLimit, image }) {
    const app = document.getElementById('joinApp');
    app.innerHTML = `
    <div class="host-wrap slide-up">
      <div class="score-bar">
        <div><div class="score-label">Your Score</div><div class="score-val" id="myScore">${myScore.toLocaleString()}</div></div>
        ${myStreak >= 2 ? `<div class="streak-badge">🔥 ${myStreak} streak</div>` : ''}
        <div style="text-align:right"><div class="score-label">Q${index+1}/${total}</div></div>
      </div>
      <div class="question-wrap">
        <div class="q-header">
          <div class="q-timer-bar-wrap" style="flex:1"><div class="q-timer-bar" id="timerBar" style="width:100%"></div></div>
          <div class="q-timer-num" id="timerNum">${timeLimit}</div>
        </div>
        ${image ? `<img class="q-image" src="${esc(image)}" alt="">` : ''}
        <div class="q-text">${esc(text)}</div>
        <div class="answers-grid" id="answersGrid">
          ${options.map((o, i) => `
            <button class="answer-btn a${i}" id="ans${i}" onclick="PlayerGame.submitClassicAnswer(${i})">
              <div class="answer-letter">${'ABCD'[i]}</div>
              <span>${esc(o)}</span>
            </button>`).join('')}
        </div>
      </div>
      <div id="miniLb" class="lb-side" style="margin-top:20px;display:none"></div>
    </div>`;
    startClientTimer(timeLimit);
  }

  function startClientTimer(secs) {
    let remaining = secs;
    const bar = document.getElementById('timerBar');
    const num = document.getElementById('timerNum');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remaining--;
      const pct = (remaining / secs) * 100;
      if (bar) { bar.style.width = pct + '%'; if (pct < 30) bar.classList.add('warning'); }
      if (num) num.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timerInterval);
        document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
      }
    }, 1000);
  }

  function submitClassicAnswer(index) {
    if (answered) return;
    answered = true;
    clearInterval(timerInterval);
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    const chosen = document.getElementById('ans' + index);
    if (chosen) chosen.style.opacity = '.7';

    socket.emit('player:answer', { answerIndex: index }, (res) => {
      if (!res || res.error) return;
      if (res.correct) {
        myScore = res.newScore;
        myStreak++;
        showResultFlash(true, res.pointsEarned, res.newScore);
      } else {
        myStreak = 0;
        showResultFlash(false, 0, myScore);
      }
      const sc = document.getElementById('myScore');
      if (sc) sc.textContent = myScore.toLocaleString();
    });
  }

  function showResultFlash(correct, points, score) {
    const flash = document.createElement('div');
    flash.className = 'result-flash';
    flash.innerHTML = `
      <div class="result-flash-icon">${correct ? '✅' : '❌'}</div>
      <div class="result-flash-text">${correct ? 'Correct!' : 'Incorrect'}</div>
      ${correct ? `<div class="result-flash-pts">+${points.toLocaleString()} pts</div>` : ''}
      <div style="color:#94a3b8;font-size:.9rem;margin-top:8px">Score: ${score.toLocaleString()}</div>`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 2000);
  }

  function revealClassicAnswer(correctIndex, leaderboard) {
    document.querySelectorAll('.answer-btn').forEach((btn, i) => {
      if (i === correctIndex) btn.classList.add('correct');
      else btn.classList.add('wrong');
    });
    updateMiniLb(leaderboard);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GOLD QUEST MODE
  // ══════════════════════════════════════════════════════════════════════════

  function startGoldQuestFlow() {
    requestNextGQQuestion();
  }

  function requestNextGQQuestion() {
    socket.emit('gq:requestQuestion', null, (res) => {
      if (!res || res.error) return;
      if (res.locked) {
        renderGQLockout(res.lockMs);
        return;
      }
      if (res.chestPending) {
        renderGQChestScreen();
        return;
      }
      myGold = res.gold || myGold;
      renderGQQuestion(res);
    });
  }

  function renderGQQuestion(q) {
    const app = document.getElementById('joinApp');
    const m = Math.floor(gameTimerVal / 60);
    const s = gameTimerVal % 60;

    app.innerHTML = `
    <div class="host-wrap slide-up">
      <div class="gq-top-bar">
        <div class="gq-gold-display">
          <span class="gq-gold-icon">🪙</span>
          <span class="gq-gold-val" id="gqGold">${myGold.toLocaleString()}</span>
        </div>
        <div class="gq-timer-display" id="gqTimer">${m}:${s.toString().padStart(2, '0')}</div>
        ${myStreak >= 2 ? `<div class="streak-badge">🔥 ${myStreak}</div>` : '<div></div>'}
      </div>

      <div class="question-wrap" style="margin-top:16px">
        <div class="gq-q-counter">Question #${q.index}</div>
        ${q.image ? `<img class="q-image" src="${esc(q.image)}" alt="">` : ''}
        <div class="q-text">${esc(q.text)}</div>
        <div class="answers-grid" id="answersGrid">
          ${q.options.map((o, i) => `
            <button class="answer-btn a${i}" id="gqAns${i}" onclick="PlayerGame.submitGQAnswer(${i})">
              <div class="answer-letter">${'ABCD'[i]}</div>
              <span>${esc(o)}</span>
            </button>`).join('')}
        </div>
      </div>

      <div id="miniLb" class="lb-side" style="margin-top:20px;display:none"></div>
    </div>`;
  }

  function submitGQAnswer(index) {
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    const chosen = document.getElementById('gqAns' + index);
    if (chosen) chosen.style.opacity = '.7';

    socket.emit('gq:answer', { answerIndex: index }, (res) => {
      if (!res || res.error) return;

      if (res.correct) {
        myStreak = res.streak;
        myGold = res.gold;
        // Show brief correct flash then chest screen
        showGQFlash(true, () => {
          renderGQChestScreen();
        });
      } else {
        myStreak = 0;
        myGold = res.gold;
        // Wrong — lockout
        showGQFlash(false, () => {
          renderGQLockout(res.lockMs);
        });
      }
    });
  }

  function showGQFlash(correct, callback) {
    const flash = document.createElement('div');
    flash.className = 'result-flash';
    flash.style.background = correct ? 'rgba(16,185,129,.85)' : 'rgba(239,68,68,.85)';
    flash.innerHTML = `
      <div class="result-flash-icon" style="font-size:4rem">${correct ? '✅' : '❌'}</div>
      <div class="result-flash-text">${correct ? 'Correct!' : 'Wrong!'}</div>`;
    document.body.appendChild(flash);
    setTimeout(() => { flash.remove(); if (callback) callback(); }, correct ? 800 : 600);
  }

  function renderGQLockout(ms) {
    const app = document.getElementById('joinApp');
    const secs = Math.ceil(ms / 1000);
    const tm = Math.floor(gameTimerVal / 60);
    const ts = gameTimerVal % 60;

    app.innerHTML = `
    <div class="host-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh">
      <div class="gq-top-bar" style="position:absolute;top:20px;left:20px;right:20px">
        <div class="gq-gold-display"><span class="gq-gold-icon">🪙</span><span class="gq-gold-val">${myGold.toLocaleString()}</span></div>
        <div class="gq-timer-display" id="gqTimer">${tm}:${ts.toString().padStart(2, '0')}</div>
        <div></div>
      </div>
      <div class="gq-lockout bounce-in">
        <div style="font-size:4rem;margin-bottom:16px">🔒</div>
        <div style="font-size:1.5rem;font-weight:800;color:#ef4444;margin-bottom:8px">Locked Out!</div>
        <div style="color:#94a3b8;font-size:.95rem">Wrong answer — wait…</div>
        <div class="gq-lockout-timer" id="lockTimer">${secs}</div>
      </div>
    </div>`;

    let remaining = secs;
    const lockInt = setInterval(() => {
      remaining--;
      const el = document.getElementById('lockTimer');
      if (el) el.textContent = remaining > 0 ? remaining : '0';
      if (remaining <= 0) {
        clearInterval(lockInt);
        requestNextGQQuestion();
      }
    }, 1000);
  }

  function renderGQChestScreen() {
    const app = document.getElementById('joinApp');
    const tm = Math.floor(gameTimerVal / 60);
    const ts = gameTimerVal % 60;

    app.innerHTML = `
    <div class="host-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh">
      <div class="gq-top-bar" style="position:absolute;top:20px;left:20px;right:20px">
        <div class="gq-gold-display"><span class="gq-gold-icon">🪙</span><span class="gq-gold-val" id="gqGold">${myGold.toLocaleString()}</span></div>
        <div class="gq-timer-display" id="gqTimer">${tm}:${ts.toString().padStart(2, '0')}</div>
        <div></div>
      </div>

      <div class="gq-chest-intro bounce-in">
        <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:8px">Choose a Chest!</div>
        <div style="color:#64748b;font-size:.88rem;margin-bottom:28px">Pick one of three mystery chests…</div>

        <div class="gq-chests">
          <button class="gq-chest-btn" onclick="PlayerGame.openChest(0)">
            <div class="gq-chest-box">📦</div>
            <div class="gq-chest-label">Chest 1</div>
          </button>
          <button class="gq-chest-btn" onclick="PlayerGame.openChest(1)">
            <div class="gq-chest-box">📦</div>
            <div class="gq-chest-label">Chest 2</div>
          </button>
          <button class="gq-chest-btn" onclick="PlayerGame.openChest(2)">
            <div class="gq-chest-box">📦</div>
            <div class="gq-chest-label">Chest 3</div>
          </button>
        </div>
      </div>
    </div>`;
  }

  function openChest(index) {
    // Disable all chest buttons
    document.querySelectorAll('.gq-chest-btn').forEach(b => b.disabled = true);

    // Animate the chosen chest
    const btns = document.querySelectorAll('.gq-chest-btn');
    btns.forEach((b, i) => {
      if (i === index) {
        b.classList.add('gq-chest-opening');
      } else {
        b.style.opacity = '.3';
        b.style.transform = 'scale(.9)';
      }
    });

    socket.emit('gq:openChest', { chestIndex: index }, (res) => {
      if (!res || res.error) {
        requestNextGQQuestion();
        return;
      }

      myGold = res.newGold;

      // Show chest result overlay
      setTimeout(() => {
        showChestResult(res, () => {
          requestNextGQQuestion();
        });
      }, 600);
    });
  }

  function showChestResult(res, callback) {
    const isPositive = res.delta >= 0;
    const overlay = document.createElement('div');
    overlay.className = 'blooket-event-overlay';
    overlay.innerHTML = `
      <div class="blooket-event-card">
        <span class="blooket-event-icon">${res.icon || '📦'}</span>
        <div class="blooket-event-title">${esc(res.label || res.type)}</div>
        <div class="blooket-event-desc">${esc(res.description)}</div>
        ${res.delta !== 0 ? `<div class="blooket-event-delta" style="color:${isPositive ? '#34d399' : '#ef4444'}">${isPositive ? '+' : ''}${res.delta.toLocaleString()} gold</div>` : ''}
        <div style="color:#64748b;font-size:.85rem;margin-top:10px">Total: 🪙 ${myGold.toLocaleString()}</div>
      </div>`;
    document.body.appendChild(overlay);

    const goldEl = document.getElementById('gqGold');
    if (goldEl) goldEl.textContent = myGold.toLocaleString();

    setTimeout(() => { overlay.remove(); if (callback) callback(); }, 2200);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHARED
  // ══════════════════════════════════════════════════════════════════════════

  function updateMiniLb(leaderboard) {
    const el = document.getElementById('miniLb');
    if (!el) return;
    el.style.display = 'block';
    const medals = ['🥇','🥈','🥉'];
    const isGQ = mode === 'blooket';
    el.innerHTML = `<h3>🏆 Top Players</h3>` + leaderboard.slice(0, 5).map((p, i) => `
      <div class="lb-row ${i===0?'lb-first':i===1?'lb-second':i===2?'lb-third':''}">
        <div class="lb-rank">${medals[i] || (i+1)}</div>
        <div class="lb-name">${esc(p.name)}${p.name === playerName ? ' (you)' : ''}</div>
        <div class="lb-score">${isGQ ? '🪙 ' : ''}${p.score.toLocaleString()}</div>
      </div>`).join('');
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, doJoin, submitClassicAnswer, submitGQAnswer, openChest };
})();
