/* ═══════════════════════════════════════════════════════════════════════════
   ToolHub LIVE — Multiplayer Client Engine
   Socket.io client with AI Kingdom, Data Heist, Evolution Race
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const MP = {
  socket: null,
  code: null,
  isHost: false,
  gameMode: null,
  gameState: {},
  players: [],
  leaderboard: [],
  heatmap: [],
  currentQuestion: null,
  timerInterval: null,
  timeLeft: 0,
  senMode: false,
  noAds: false,
  blooks: [],
  selectedBlook: null,
  modes: [],
  questionData: null, // host-only
};

// ── Socket Connection ────────────────────────────────────────────────────────
function disconnectSocket() {
  if (MP.socket) {
    MP.socket.removeAllListeners(); // ← prevent duplicate listener leak
    MP.socket.disconnect();
    MP.socket = null;
  }
  clearInterval(MP.timerInterval);
  MP.timerInterval = null;
}

function connectSocket() {
  // If already connected reuse the socket — only register listeners once
  if (MP.socket && MP.socket.connected) return;

  // Clean up any stale socket from a previous session to avoid listener pile-up
  if (MP.socket) {
    MP.socket.removeAllListeners();
    MP.socket.disconnect();
  }

  const url = window.location.origin;
  MP.socket = io(url, { transports: ['websocket', 'polling'] });

  MP.socket.on('connect', () => console.log('[MP] Connected:', MP.socket.id));
  MP.socket.on('disconnect', () => {
    console.log('[MP] Disconnected');
    if (MP.code) toast('Connection lost. Trying to reconnect…', 'warn');
  });

  // ── Lobby Events ───────────────────────────────────────────────────────
  MP.socket.on('lobby:playerJoined', (data) => {
    MP.players = data.players || [];
    if (MP.isHost) renderLobbyPlayers();
    toast(`${data.player.name} joined!`, 'success', 2000);
  });
  MP.socket.on('lobby:playerLeft', (data) => {
    toast(`${data.name} left the game`, 'warn', 2000);
  });
  MP.socket.on('lobby:playerDisconnected', (data) => {
    toast(`${data.name} disconnected`, 'warn', 2000);
  });
  // AI Bot test mode banner
  MP.socket.on('lobby:botsSpawned', (data) => {
    toast(data.message || '⚡ Test Mode: AI Bots added!', 'success', 4000);
    const banner = document.getElementById('mpTestBanner');
    if (banner) { banner.style.display = 'flex'; banner.textContent = data.message || '⚡ Test Mode Active — AI Bots spawned'; }
    // Also refresh player list
    if (MP.isHost) renderLobbyPlayers();
  });

  // ── Game Events ────────────────────────────────────────────────────────
  MP.socket.on('game:started', (data) => {
    MP.gameMode = data.gameMode;
    MP.senMode = data.settings?.senMode || false;
    if (MP.senMode) document.documentElement.classList.add('sen-mode');
    if (data.testMode) {
      toast('⚡ Test Mode: running with AI Bots', 'info', 3000);
    }
    if (MP.isHost) {
      renderHostGameView(data);
    } else {
      renderGameCountdown(data);
    }
  });

  MP.socket.on('game:question', (data) => {
    MP.currentQuestion = data;
    MP.timeLeft = data.timeLimit;
    if (!MP.isHost) renderGameQuestion(data);
    startTimer(data.timeLimit);
  });

  MP.socket.on('host:questionData', (data) => {
    MP.questionData = data;
  });

  MP.socket.on('host:dashboard', (data) => {
    if (MP.isHost) updateHostDashboard(data);
  });

  MP.socket.on('game:answerResult', (data) => {
    clearInterval(MP.timerInterval);
    MP.gameState = data.gameState || MP.gameState;
    if (!MP.isHost) renderAnswerFeedback(data);
  });

  MP.socket.on('game:review', (data) => {
    MP.leaderboard = data.leaderboard || [];
    MP.heatmap = data.heatmap || [];
    if (!MP.isHost) renderReview(data);
    if (MP.isHost) renderHostReview(data);
  });

  MP.socket.on('game:monsterWave', (data) => {
    if (!MP.isHost) renderMonsterWave(data);
  });

  MP.socket.on('game:ended', (data) => {
    clearInterval(MP.timerInterval);
    MP.leaderboard = data.leaderboard || [];
    MP.heatmap = data.heatmap || [];
    renderEndScreen(data);
  });

  MP.socket.on('game:paused', () => {
    renderPausedOverlay(true);
  });
  MP.socket.on('game:resumed', () => {
    renderPausedOverlay(false);
  });
  MP.socket.on('game:kicked', () => {
    toast('You have been removed from the game.', 'error');
    navigateMultiplayer('hub');
  });
  MP.socket.on('game:senToggled', ({ enabled }) => {
    MP.senMode = enabled;
    if (enabled) {
      document.documentElement.classList.add('sen-mode');
      toast('Accessibility mode enabled', 'success');
    } else {
      document.documentElement.classList.remove('sen-mode');
      toast('Accessibility mode disabled', 'info');
    }
  });
}

// ── Navigation ───────────────────────────────────────────────────────────────
function navigateMultiplayer(view, param) {
  const app = document.getElementById('app');
  if (!app) return;
  clearInterval(MP.timerInterval);

  switch(view) {
    case 'hub':      history.pushState({}, '', '/live');           renderMultiplayerHub(); break;
    case 'join':     history.pushState({}, '', '/live');           renderJoinScreen(param); break;
    case 'host':     history.pushState({}, '', '/live');           renderHostSetup(); break;
    case 'teacher':  history.pushState({}, '', '/teacher-quizzes'); renderTeacherQuizzes(); break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTIPLAYER HUB
// ═══════════════════════════════════════════════════════════════════════════════
async function renderMultiplayerHub() {
  const app = document.getElementById('app');
  document.title = 'ToolHub Live — Multiplayer Games';

  // Disable ads if educator
  if (APP.session.isVerifiedEducator) disableAds();

  // Fetch modes
  try {
    const data = await apiFetch('/api/multiplayer/modes');
    MP.modes = data.modes || [];
    MP.blooks = data.blooks || [];
  } catch(e) {
    MP.modes = [
      { id: 'ai-kingdom', name: 'AI Kingdom', icon: '🏰', desc: 'Build bots to defend against monsters!', color: '#7c3aed' },
      { id: 'data-heist', name: 'Data Heist', icon: '🗂️', desc: 'Steal folders and hack your way to victory!', color: '#f43f5e' },
      { id: 'evolution-race', name: 'Evolution Race', icon: '🧬', desc: 'Evolve from Calculator to Quantum AI!', color: '#10b981' },
    ];
  }

  const isTeacher = APP.session.isVerifiedEducator || APP.session.role === 'admin';

  app.innerHTML = `
<div class="mp-hub">
  <div class="mp-hub-hero">
    <div class="mp-hero-badge">⚡ Real-Time Multiplayer</div>
    <h1>ToolHub Live</h1>
    <p>Host a game for your class or join a friend's session. Three epic game modes await!</p>
    <div class="mp-hub-hero-btns">
      <button class="mp-hero-btn primary" onclick="navigateMultiplayer('join')">
        🎮 Join Game
      </button>
      ${APP.session.loggedIn ? `
        <button class="mp-hero-btn secondary" onclick="navigateMultiplayer('host')">
          👑 Host Game
        </button>` : `
        <button class="mp-hero-btn secondary" onclick="showLogin('Sign in to host a game')">
          🔐 Sign in to Host
        </button>`}
    </div>
  </div>

  <!-- Game Modes -->
  <h2 style="font-size:24px;font-weight:800;margin-bottom:4px">Game Modes</h2>
  <p style="color:var(--text-muted);margin-bottom:20px">Choose your battle style. Each mode plays differently!</p>
  <div class="mp-modes-grid">
    ${MP.modes.map(m => `
      <div class="mp-mode-card" style="--card-accent:${m.color}">
        <div class="mp-mode-badge" style="background:${m.color}">${m.id === 'ai-kingdom' ? 'Defense' : m.id === 'data-heist' ? 'Chaos' : 'Race'}</div>
        <div class="mp-mode-icon">${m.icon}</div>
        <div class="mp-mode-name">${m.name}</div>
        <div class="mp-mode-desc">${m.desc}</div>
      </div>
    `).join('')}
  </div>

  ${isTeacher ? `
  <div style="margin-top:40px">
    <h2 style="font-size:24px;font-weight:800;margin-bottom:4px">📚 Teacher Resources</h2>
    <p style="color:var(--text-muted);margin-bottom:20px">Year 1–11 curriculum quizzes, exclusive to verified educators.</p>
    <button class="mp-hero-btn primary" style="background:var(--mp-purple);color:#fff" onclick="navigateMultiplayer('teacher')">
      📖 View Teacher Quizzes
    </button>
  </div>` : ''}

  <div style="margin-top:40px;text-align:center">
    <button class="btn btn-ghost" onclick="navigate('home')" style="font-size:15px">← Back to ToolHub</button>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function renderJoinScreen(prefillCode) {
  const app = document.getElementById('app');
  connectSocket();

  app.innerHTML = `
<div class="mp-join-wrap">
  <button class="btn btn-ghost" onclick="navigateMultiplayer('hub')" style="margin-bottom:16px">← Back</button>
  <div class="mp-join-card">
    <div style="font-size:48px;margin-bottom:8px">🎮</div>
    <h2 style="font-size:24px;font-weight:800;margin-bottom:4px">Join a Game</h2>
    <p style="color:var(--text-muted);font-size:14px">Enter the 6-digit code from your teacher's screen</p>

    <div class="mp-join-code-input" id="codeInputWrap">
      ${[0,1,2,3,4,5].map(i => `<input class="mp-code-digit" id="cd${i}" maxlength="1" inputmode="numeric" pattern="[0-9]" data-idx="${i}" ${i===0?'autofocus':''}>`).join('')}
    </div>

    <input class="mp-name-input" id="joinName" placeholder="Your Nickname" maxlength="20" value="${APP.session.name || ''}">

    <p style="font-size:13px;font-weight:600;color:var(--text-muted);margin:12px 0 8px">Choose your Blook:</p>
    <div class="mp-blook-grid" id="blookPicker"></div>

    <button class="btn btn-primary w-full" style="margin-top:16px;padding:14px;font-size:16px;border-radius:12px" onclick="doJoinGame()" id="joinBtn">
      Join Game →
    </button>
    <div id="joinError" style="margin-top:12px;color:var(--error);font-size:14px;font-weight:600"></div>
  </div>
</div>`;

  renderBlookPicker('blookPicker');
  setupCodeDigits(prefillCode);
}

function setupCodeDigits(prefill) {
  const digits = document.querySelectorAll('.mp-code-digit');
  digits.forEach((d, i) => {
    if (prefill && prefill[i]) d.value = prefill[i];
    d.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && i < 5) digits[i + 1].focus();
    });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !d.value && i > 0) digits[i - 1].focus();
      if (e.key === 'Enter') doJoinGame();
    });
    d.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      text.split('').forEach((ch, j) => { if (digits[j]) digits[j].value = ch; });
      if (text.length >= 6) digits[5].focus();
    });
  });
  if (prefill) setTimeout(() => document.getElementById('joinName')?.focus(), 100);
}

function renderBlookPicker(containerId) {
  const blooks = MP.blooks.length ? MP.blooks : [
    { id:'bear',emoji:'🐻',name:'Byte Bear' },{ id:'cat',emoji:'🐱',name:'Cyber Cat' },
    { id:'dog',emoji:'🐶',name:'Data Dog' },{ id:'fox',emoji:'🦊',name:'Firewall Fox' },
    { id:'owl',emoji:'🦉',name:'Oracle Owl' },{ id:'panda',emoji:'🐼',name:'Pixel Panda' },
    { id:'bunny',emoji:'🐰',name:'Buffer Bunny' },{ id:'penguin',emoji:'🐧',name:'Ping Penguin' },
    { id:'dragon',emoji:'🐲',name:'Debug Dragon' },{ id:'unicorn',emoji:'🦄',name:'Upload Unicorn' },
    { id:'robot',emoji:'🤖',name:'Root Robot' },{ id:'alien',emoji:'👽',name:'API Alien' },
    { id:'ghost',emoji:'👻',name:'Git Ghost' },{ id:'dino',emoji:'🦕',name:'Docker Dino' },
    { id:'shark',emoji:'🦈',name:'Shell Shark' },{ id:'octopus',emoji:'🐙',name:'Octo-Process' },
  ];
  if (!MP.selectedBlook) MP.selectedBlook = blooks[Math.floor(Math.random() * blooks.length)].id;

  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = blooks.map(b => `
    <div class="mp-blook ${b.id === MP.selectedBlook ? 'selected' : ''}" onclick="selectBlook('${b.id}','${containerId}')">
      <div class="mp-blook-emoji">${b.emoji}</div>
      <div class="mp-blook-name">${b.name}</div>
    </div>
  `).join('');
}

function selectBlook(id, containerId) {
  MP.selectedBlook = id;
  renderBlookPicker(containerId);
}

function doJoinGame() {
  const digits = document.querySelectorAll('.mp-code-digit');
  const code = [...digits].map(d => d.value).join('');
  const name = document.getElementById('joinName')?.value.trim();
  const errEl = document.getElementById('joinError');

  if (code.length < 6) { errEl.textContent = 'Enter a 6-digit game code'; return; }
  if (!name) { errEl.textContent = 'Enter a nickname'; return; }
  errEl.textContent = '';

  document.getElementById('joinBtn').textContent = 'Joining...';
  document.getElementById('joinBtn').disabled = true;

  MP.socket.emit('lobby:join', {
    code, playerName: name, blookId: MP.selectedBlook,
  }, (res) => {
    if (!res.success) {
      errEl.textContent = res.error || 'Could not join game';
      document.getElementById('joinBtn').textContent = 'Join Game →';
      document.getElementById('joinBtn').disabled = false;
      return;
    }
    MP.code = code;
    MP.isHost = false;
    MP.gameMode = res.gameMode;
    MP.noAds = res.noAds;
    if (MP.noAds) disableAds();
    renderPlayerLobby(res);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOST SETUP
// ═══════════════════════════════════════════════════════════════════════════════
async function renderHostSetup() {
  const app = document.getElementById('app');
  connectSocket();

  // Fetch quizzes for the quiz picker
  let quizzes = [];
  try {
    const res = await apiFetch('/api/quiz/list?limit=50');
    quizzes = res.quizzes || [];
  } catch(e) {}

  // Also fetch teacher quizzes if educator
  let teacherQuizzes = [];
  const isTeacher = APP.session.isVerifiedEducator || APP.session.role === 'admin';
  if (isTeacher) {
    try {
      const res = await apiFetch('/api/multiplayer/teacher-quizzes');
      teacherQuizzes = res.quizzes || [];
    } catch(e) {}
  }

  let selectedQuizId = '';
  let selectedMode = 'evolution-race';

  app.innerHTML = `
<div class="mp-hub" style="max-width:700px">
  <button class="btn btn-ghost" onclick="navigateMultiplayer('hub')" style="margin-bottom:16px">← Back</button>
  <h2 style="font-size:28px;font-weight:800;margin-bottom:4px">👑 Host a Game</h2>
  <p style="color:var(--text-muted);margin-bottom:24px">Set up your multiplayer session</p>

  <!-- Quiz Selection -->
  <div style="margin-bottom:24px">
    <label style="font-size:14px;font-weight:600;margin-bottom:8px;display:block">Select a Quiz:</label>
    ${teacherQuizzes.length ? `
      <p style="font-size:12px;color:var(--mp-green);font-weight:600;margin-bottom:8px">📚 Teacher Quizzes (Curriculum-aligned):</p>
      <select class="mp-name-input" id="teacherQuizSelect" onchange="document.getElementById('communityQuizSelect').value='';document.getElementById('hostSelectedQuiz').value=this.value" style="text-align:left;margin-bottom:8px">
        <option value="">— Select Teacher Quiz —</option>
        ${teacherQuizzes.map(q => `<option value="teacher:${q.id}">Y${q.year}: ${q.title} (${q.questionCount}Q)</option>`).join('')}
      </select>
      <p style="font-size:12px;color:var(--text-muted);font-weight:600;margin-bottom:8px">🎮 Community Quizzes:</p>
    ` : ''}
    <select class="mp-name-input" id="communityQuizSelect" onchange="${teacherQuizzes.length ? "document.getElementById('teacherQuizSelect').value='';" : ''}document.getElementById('hostSelectedQuiz').value=this.value" style="text-align:left">
      <option value="">— Select Community Quiz —</option>
      ${quizzes.map(q => `<option value="${q.id}">${q.cover_emoji||'🧠'} ${q.title} (${q.questions_count}Q)</option>`).join('')}
    </select>
    <input type="hidden" id="hostSelectedQuiz" value="">
  </div>

  <!-- Game Mode -->
  <div style="margin-bottom:24px">
    <label style="font-size:14px;font-weight:600;margin-bottom:8px;display:block">Game Mode:</label>
    <div class="mp-modes-grid" id="modeGrid">
      ${MP.modes.map(m => `
        <div class="mp-mode-card ${m.id === selectedMode ? 'selected' : ''}" onclick="selectHostMode('${m.id}')" data-mode="${m.id}">
          <div class="mp-mode-icon" style="font-size:32px">${m.icon}</div>
          <div class="mp-mode-name" style="font-size:16px">${m.name}</div>
          <div class="mp-mode-desc" style="font-size:12px">${m.desc}</div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Settings -->
  <div style="margin-bottom:24px">
    <label style="font-size:14px;font-weight:600;margin-bottom:8px;display:block">Time per Question:</label>
    <select class="mp-name-input" id="hostTimeLimit" style="text-align:left">
      <option value="10">10 seconds (Fast)</option>
      <option value="15">15 seconds</option>
      <option value="20" selected>20 seconds (Standard)</option>
      <option value="30">30 seconds (Relaxed)</option>
      <option value="45">45 seconds (Extended)</option>
    </select>
  </div>

  ${isTeacher ? `
  <div style="margin-bottom:24px;padding:16px;background:var(--bg-muted);border-radius:12px;border:2px solid var(--mp-cyan)">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600">
      <input type="checkbox" id="hostSenMode" style="width:18px;height:18px">
      ♿ Enable Accessibility Mode (SEN)
    </label>
    <p style="font-size:12px;color:var(--text-muted);margin-top:4px">Doubles timers, high-contrast UI, AI question simplifier</p>
  </div>` : ''}

  <button class="btn btn-primary w-full" style="padding:16px;font-size:18px;font-weight:700;border-radius:14px" onclick="doCreateLobby()">
    🚀 Create Game
  </button>
  <div id="hostError" style="margin-top:12px;color:var(--error);font-size:14px;font-weight:600"></div>
</div>`;
}

function selectHostMode(modeId) {
  document.querySelectorAll('#modeGrid .mp-mode-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.mode === modeId);
  });
  MP._selectedMode = modeId;
}

async function doCreateLobby() {
  const quizId = document.getElementById('hostSelectedQuiz')?.value;
  const errEl = document.getElementById('hostError');
  if (!quizId) { errEl.textContent = 'Please select a quiz'; return; }

  const mode = MP._selectedMode || 'evolution-race';
  const timeLimit = parseInt(document.getElementById('hostTimeLimit')?.value) || 20;
  const senMode = document.getElementById('hostSenMode')?.checked || false;

  errEl.textContent = 'Loading quiz...';

  let questions = [];
  let quizTitle = '';
  try {
    if (quizId.startsWith('teacher:')) {
      const tid = quizId.replace('teacher:', '');
      const res = await apiFetch(`/api/multiplayer/teacher-quizzes/${tid}`);
      questions = res.quiz.questions;
      quizTitle = res.quiz.title;
    } else {
      const res = await apiFetch(`/api/quiz/${quizId}`);
      questions = res.quiz?.questions || [];
      quizTitle = res.quiz?.title || 'Quiz';
    }
  } catch(e) {
    errEl.textContent = 'Could not load quiz: ' + (e.message || 'Unknown error');
    return;
  }

  if (!questions.length) { errEl.textContent = 'This quiz has no questions'; return; }
  errEl.textContent = 'Creating game...';

  MP.socket.emit('lobby:create', {
    hostName: APP.session.name || 'Teacher',
    hostEmail: APP.session.email || '',
    quizId, quizTitle, questions,
    gameMode: mode,
    settings: { timeLimit, senMode },
  }, (res) => {
    if (!res.success) {
      errEl.textContent = res.error || 'Could not create game';
      return;
    }
    MP.code = res.code;
    MP.isHost = true;
    MP.noAds = res.noAds;
    MP.gameMode = mode;
    if (res.blooks) MP.blooks = res.blooks;
    if (MP.noAds) disableAds();
    renderHostLobby(res);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY VIEWS
// ═══════════════════════════════════════════════════════════════════════════════
function renderHostLobby(res) {
  const app = document.getElementById('app');
  const modeMeta = MP.modes.find(m => m.id === MP.gameMode) || {};
  const isTeacher = APP.session.isVerifiedEducator || APP.session.role === 'admin';

  app.innerHTML = `
<div class="mp-lobby-wrap">
  <div class="mp-lobby-header">
    <div style="font-size:14px;opacity:0.8;margin-bottom:4px">Share this code with your students:</div>
    <div class="mp-lobby-code" id="lobbyCode">${MP.code}</div>
    <div class="mp-lobby-url" onclick="copyText(location.origin+'/live/'+MP.code,'Game link')">
      ${location.origin}/live/${MP.code} 📋
    </div>
    <div style="margin-top:8px;font-size:13px;opacity:0.8">${modeMeta.icon || '🎮'} ${modeMeta.name || MP.gameMode}</div>
  </div>

  <!-- Host Controls -->
  <div class="mp-host-bar">
    <button class="mp-host-btn start" onclick="doStartGame()" id="startBtn">
      ▶️ Start Game
    </button>
    ${isTeacher ? `
      <button class="mp-host-btn sen-toggle ${MP.senMode ? 'active' : ''}" onclick="toggleSENMode(this)" id="senBtn">
        ♿ SEN Mode
      </button>` : ''}
    <button class="mp-host-btn danger" onclick="if(confirm('End this game?'))MP.socket.emit('host:end')">
      ⛔ End Game
    </button>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <h3 style="font-size:18px;font-weight:700">Players Waiting</h3>
    <span id="playerCount" style="color:var(--text-muted);font-weight:600">0 players</span>
  </div>
  <div class="mp-player-grid" id="lobbyPlayers">
    <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">
      Waiting for players to join...
    </div>
  </div>
</div>`;
}

function renderLobbyPlayers() {
  const el = document.getElementById('lobbyPlayers');
  const countEl = document.getElementById('playerCount');
  if (!el) return;
  if (countEl) countEl.textContent = `${MP.players.length} player${MP.players.length !== 1 ? 's' : ''}`;

  if (MP.players.length === 0) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Waiting for players...</div>';
    return;
  }
  el.innerHTML = MP.players.map(p => `
    <div class="mp-player-tile">
      <div class="mp-player-emoji">${p.blook?.emoji || '👤'}</div>
      <div class="mp-player-name">${escQ(p.name)}</div>
      ${MP.isHost ? `<button style="font-size:11px;color:var(--mp-red);margin-top:4px;cursor:pointer;background:none;border:none" onclick="MP.socket.emit('host:kick',{playerId:'${p.id}'})">Kick</button>` : ''}
    </div>
  `).join('');
}

function renderPlayerLobby(res) {
  const app = document.getElementById('app');
  app.innerHTML = `
<div class="mp-lobby-wrap" style="text-align:center">
  <div class="mp-lobby-header" style="margin-bottom:32px">
    <div style="font-size:14px;opacity:0.8;margin-bottom:4px">You've joined:</div>
    <h2 style="font-size:24px;font-weight:800;margin:4px 0">${escQ(res.quizTitle)}</h2>
    <div style="font-size:14px;opacity:0.8;margin-top:4px">Hosted by ${escQ(res.hostName)}</div>
  </div>
  <div style="font-size:72px;margin-bottom:12px">${MP.blooks.find(b => b.id === MP.selectedBlook)?.emoji || '🎮'}</div>
  <h3 style="font-size:22px;font-weight:700;margin-bottom:4px">You're in!</h3>
  <p style="color:var(--text-muted)">Waiting for the host to start the game...</p>
  <div class="spinner" style="margin:32px auto"></div>
</div>`;
}

function doStartGame() {
  const btn = document.getElementById('startBtn');
  if (btn) { btn.textContent = 'Starting...'; btn.disabled = true; }
  MP.socket.emit('game:start', {
    senMode: MP.senMode,
  }, (res) => {
    if (res?.error) {
      toast(res.error, 'error');
      if (btn) { btn.textContent = '▶️ Start Game'; btn.disabled = false; }
    }
  });
}

function toggleSENMode(btn) {
  MP.senMode = !MP.senMode;
  btn.classList.toggle('active', MP.senMode);
  MP.socket.emit('host:toggleSEN', { enabled: MP.senMode });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME VIEWS — PLAYER
// ═══════════════════════════════════════════════════════════════════════════════
function renderGameCountdown(data) {
  const app = document.getElementById('app');
  const modeMeta = MP.modes.find(m => m.id === data.gameMode) || {};
  app.innerHTML = `
<div style="display:flex;align-items:center;justify-content:center;min-height:80vh;text-align:center">
  <div>
    <div style="font-size:64px;margin-bottom:12px">${modeMeta.icon || '🎮'}</div>
    <h2 style="font-size:28px;font-weight:800">${modeMeta.modeName || modeMeta.name || 'Game Starting'}</h2>
    <p style="color:var(--text-muted);font-size:16px">${data.totalQuestions} questions · Get ready!</p>
    <div id="countdownNum" style="font-size:72px;font-weight:900;color:var(--accent);margin-top:24px">3</div>
  </div>
</div>`;

  let c = 3;
  const iv = setInterval(() => {
    c--;
    const el = document.getElementById('countdownNum');
    if (el) el.textContent = c > 0 ? c : 'GO!';
    if (c <= 0) clearInterval(iv);
  }, 1000);
}

function renderGameQuestion(data) {
  const app = document.getElementById('app');
  const modeBar = getModeStatusBar();

  app.innerHTML = `
<div class="mp-game-wrap">
  ${modeBar}
  <div class="mp-game-header">
    <div class="mp-game-progress">Q${data.index + 1} / ${data.total}</div>
    <div class="mp-game-score">${getScoreDisplay()}</div>
  </div>
  <div class="mp-timer-bar"><div class="mp-timer-fill" id="timerFill" style="width:100%"></div></div>
  <div class="mp-question-card">
    <div class="mp-question-text">${escQ(data.question)}</div>
    ${MP.senMode ? `<button class="mp-simplify-btn" onclick="simplifyQuestion()">🧠 Simplify Question</button>` : ''}
    ${data.image ? `<img src="${data.image}" style="max-width:100%;border-radius:10px;margin:12px 0">` : ''}
  </div>
  <div class="mp-options-grid" id="optionsGrid">
    ${data.options.map((opt, i) => `
      <button class="mp-option-btn opt-${i}" onclick="submitAnswer(${i})" data-idx="${i}">
        ${escQ(opt)}
      </button>
    `).join('')}
  </div>
  <div id="feedbackArea"></div>
</div>`;
}

function startTimer(seconds) {
  clearInterval(MP.timerInterval);
  MP.timeLeft = seconds;
  const fill = document.getElementById('timerFill');
  if (!fill) return;

  MP.timerInterval = setInterval(() => {
    MP.timeLeft -= 0.1;
    if (MP.timeLeft <= 0) { clearInterval(MP.timerInterval); MP.timeLeft = 0; }
    const pct = Math.max(0, (MP.timeLeft / seconds) * 100);
    fill.style.width = pct + '%';
    fill.classList.toggle('warning', pct < 40 && pct > 15);
    fill.classList.toggle('urgent', pct <= 15);
  }, 100);
}

function submitAnswer(idx) {
  clearInterval(MP.timerInterval);
  // Disable all buttons
  document.querySelectorAll('.mp-option-btn').forEach(b => b.classList.add('disabled'));
  document.querySelector(`.mp-option-btn[data-idx="${idx}"]`)?.classList.add('selected');

  MP.socket.emit('game:answer', { answerIndex: idx });
}

function renderAnswerFeedback(data) {
  const opts = document.querySelectorAll('.mp-option-btn');
  opts.forEach((btn, i) => {
    btn.classList.add('disabled');
    if (i === data.correctAnswer) btn.classList.add('correct');
    if (i !== data.correctAnswer && btn.classList.contains('selected')) btn.classList.add('wrong');
  });

  const area = document.getElementById('feedbackArea');
  if (!area) return;

  const isCorrect = data.isCorrect;
  let modeExtra = '';
  if (data.modeResult) {
    const mr = data.modeResult;
    if (MP.gameMode === 'evolution-race' && mr.evolved) {
      modeExtra = `<div class="mp-evolve-alert"><div style="font-size:40px">${mr.stage.emoji}</div><div style="font-size:20px;font-weight:800">EVOLVED!</div><div>${mr.stage.name}</div></div>`;
    }
    if (MP.gameMode === 'evolution-race' && mr.streak >= 3) {
      modeExtra += `<div class="mp-streak-badge" style="margin-top:8px">🔥 ${mr.streak} Streak!</div>`;
    }
    if (MP.gameMode === 'data-heist' && mr.folder) {
      const f = mr.folder;
      modeExtra = `<div style="text-align:center;margin-top:12px"><div style="font-size:36px">${f.icon}</div><div style="font-weight:700">${f.label}</div>${mr.targetPlayer ? `<div style="font-size:13px;color:var(--text-muted)">${mr.event === 'blocked' ? '🛡️ Blocked by ' : '→ '} ${mr.targetPlayer}</div>` : ''}</div>`;
    }
    if (MP.gameMode === 'ai-kingdom' && !isCorrect) {
      modeExtra = `<div style="text-align:center;margin-top:8px;color:var(--mp-red);font-weight:600">🏰 Wall took ${mr.damageTaken} damage!</div>`;
    }
  }

  area.innerHTML = `
<div class="mp-feedback ${isCorrect ? 'correct' : 'wrong'}" style="margin-top:16px">
  <div class="mp-feedback-icon">${isCorrect ? '✅' : '❌'}</div>
  <div class="mp-feedback-text">${isCorrect ? 'Correct!' : 'Wrong!'}</div>
  <div class="mp-feedback-sub">${data.pointsEarned > 0 ? `+${data.pointsEarned} points` : data.pointsEarned < 0 ? `${data.pointsEarned} points` : ''} ${data.speedBonus > 0 ? `(+${data.speedBonus} speed bonus)` : ''}</div>
  ${modeExtra}
</div>`;
}

function renderReview(data) {
  // Brief leaderboard flash then wait for next question
  const app = document.getElementById('app');
  app.innerHTML = `
<div class="mp-game-wrap">
  ${getModeStatusBar()}
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:14px;color:var(--text-muted);font-weight:600">Class Accuracy: ${data.accuracy}%</div>
  </div>
  <div class="mp-leaderboard">
    ${renderLeaderboardRows(data.leaderboard.slice(0, 8))}
  </div>
  <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:14px">
    Next question coming...
  </div>
</div>`;
}

function renderLeaderboardRows(lb) {
  return lb.map((p, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
    let extra = '';
    if (p.stage) extra = `<span style="font-size:13px">${p.stage.emoji} ${p.stage.name}</span>`;
    if (p.hasFirewall) extra += ' 🛡️';
    return `
    <div class="mp-lb-row">
      <div class="mp-lb-rank ${rankClass}">${rankIcon}</div>
      <div class="mp-lb-blook">${p.blook?.emoji || '👤'}</div>
      <div class="mp-lb-name">${escQ(p.name)}</div>
      <div class="mp-lb-extra">${extra}</div>
      <div class="mp-lb-score">${(p.score || 0).toLocaleString()}</div>
    </div>`;
  }).join('');
}

function renderMonsterWave(data) {
  const app = document.getElementById('app');
  app.innerHTML = `
<div class="mp-game-wrap">
  <div class="mp-monster-wave">
    <div style="font-size:14px;font-weight:600;margin-bottom:8px">⚠️ WAVE ${data.wave} INCOMING!</div>
    <div class="mp-monster-emoji">${data.monster.emoji}</div>
    <div style="font-size:22px;font-weight:800;margin:8px 0">${data.monster.name}</div>
    <div style="font-size:14px;opacity:0.9">HP: ${data.monster.hp} | ATK: ${data.monster.atk}</div>
    <div style="margin-top:16px;font-size:18px;font-weight:700">${data.defeated ? '✅ DEFEATED! +' + data.reward + ' scraps' : '❌ Monster survived!'}</div>
  </div>
  <div style="text-align:center;margin-top:16px">
    <div style="font-size:14px;font-weight:600">🏰 Wall HP: ${data.wallHP}%</div>
    <div class="mp-wall-bar"><div class="mp-wall-fill ${data.wallHP < 30 ? 'low' : ''}" style="width:${data.wallHP}%"></div></div>
  </div>
</div>`;
}

// ── Mode Status Bars ─────────────────────────────────────────────────────────
function getModeStatusBar() {
  const gs = MP.gameState;
  if (!gs) return '';

  if (MP.gameMode === 'evolution-race') {
    const stages = [
      { name:'Basic Calculator',emoji:'🔢',xpNeeded:0 },
      { name:'Desktop PC',emoji:'🖥️',xpNeeded:150 },
      { name:'Laptop Pro',emoji:'💻',xpNeeded:350 },
      { name:'Server Rack',emoji:'🗄️',xpNeeded:600 },
      { name:'Mainframe',emoji:'🏗️',xpNeeded:900 },
      { name:'Quantum AI',emoji:'🧠',xpNeeded:1300 },
    ];
    const current = stages[gs.stage || 0];
    const next = stages[Math.min((gs.stage || 0) + 1, stages.length - 1)];
    const xpPct = next.xpNeeded > current.xpNeeded ? Math.min(100, Math.round(((gs.xp || 0) - current.xpNeeded) / (next.xpNeeded - current.xpNeeded) * 100)) : 100;
    return `
    <div class="mp-evo-bar">
      <div class="mp-evo-emoji">${current.emoji}</div>
      <div><div class="mp-evo-name">${current.name}</div><div style="font-size:11px;color:var(--text-muted)">${gs.xp || 0} XP</div></div>
      <div class="mp-evo-xp-bar"><div class="mp-evo-xp-fill" style="width:${xpPct}%;background:${current.color || 'var(--accent)'}"></div></div>
      ${gs.streak >= 2 ? `<div class="mp-streak-badge">🔥 ${gs.streak}</div>` : ''}
    </div>`;
  }

  if (MP.gameMode === 'ai-kingdom') {
    return `
    <div class="mp-kingdom-bar">
      <div class="mp-kingdom-stat"><div class="mp-kingdom-stat-val">🔩 ${gs.scraps || 0}</div><div class="mp-kingdom-stat-lbl">Scraps</div></div>
      <div class="mp-kingdom-stat"><div class="mp-kingdom-stat-val">🤖 ${(gs.bots || []).length}</div><div class="mp-kingdom-stat-lbl">Bots</div></div>
      <div class="mp-kingdom-stat">
        <div class="mp-kingdom-stat-val">🏰 ${gs.wallHP || 0}%</div><div class="mp-kingdom-stat-lbl">Wall HP</div>
        <div class="mp-wall-bar" style="margin-top:4px"><div class="mp-wall-fill ${(gs.wallHP||0) < 30 ? 'low' : ''}" style="width:${gs.wallHP||0}%"></div></div>
      </div>
    </div>`;
  }

  if (MP.gameMode === 'data-heist') {
    return `
    <div class="mp-heist-bar">
      <div style="font-size:22px;font-weight:800">💰 ${(gs.points || 0).toLocaleString()}</div>
      <div style="font-size:13px;color:var(--text-muted)">📁 ${(gs.folders || []).length} folders</div>
      ${gs.hasFirewall ? '<div style="font-size:13px">🛡️ Firewall active</div>' : ''}
    </div>`;
  }
  return '';
}

function getScoreDisplay() {
  const gs = MP.gameState;
  if (!gs) return '0';
  if (MP.gameMode === 'ai-kingdom') return `🔩 ${gs.scraps || 0}`;
  if (MP.gameMode === 'data-heist') return `💰 ${(gs.points || 0).toLocaleString()}`;
  if (MP.gameMode === 'evolution-race') return `⚡ ${(gs.points || 0).toLocaleString()}`;
  return '0';
}

// ── SEN: Simplify Question ───────────────────────────────────────────────────
async function simplifyQuestion() {
  if (!MP.currentQuestion) return;
  try {
    const res = await apiFetch('/api/multiplayer/simplify-question', 'POST', {
      question: MP.currentQuestion.question,
      options: MP.currentQuestion.options,
    });
    const qText = document.querySelector('.mp-question-text');
    if (qText && res.simplified) {
      qText.innerHTML = `<div style="font-size:12px;color:var(--mp-cyan);margin-bottom:4px">🧠 Simplified:</div>${escQ(res.simplified)}`;
    }
    if (res.simplifiedOptions) {
      const opts = document.querySelectorAll('.mp-option-btn');
      opts.forEach((btn, i) => {
        if (res.simplifiedOptions[i] && !btn.classList.contains('disabled')) {
          btn.textContent = res.simplifiedOptions[i];
        }
      });
    }
  } catch(e) { toast('Could not simplify', 'warn'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOST GAME VIEW — TEACHER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function renderHostGameView(data) {
  const app = document.getElementById('app');
  app.innerHTML = `
<div class="mp-game-wrap" style="max-width:900px">
  <div class="mp-teacher-dash" id="teacherDash">
    <div class="mp-td-header">
      <div class="mp-td-title">👩‍🏫 Teacher Dashboard</div>
      <div class="mp-td-badge" id="tdStatus">Live</div>
    </div>
    <div class="mp-td-stats" id="tdStats">
      <div class="mp-td-stat"><div class="mp-td-stat-val" id="tdAnswered">0/0</div><div class="mp-td-stat-lbl">Answered</div></div>
      <div class="mp-td-stat"><div class="mp-td-stat-val" id="tdAccuracy">—</div><div class="mp-td-stat-lbl">Avg Accuracy</div></div>
      <div class="mp-td-stat"><div class="mp-td-stat-val" id="tdQuestion">Q1</div><div class="mp-td-stat-lbl">Question</div></div>
    </div>

    <!-- Heatmap -->
    <div style="margin:16px 0">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">📊 Accuracy Heatmap</div>
      <div class="mp-heatmap-grid" id="heatmapGrid"></div>
    </div>

    <!-- Live Leaderboard -->
    <div style="margin:16px 0">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">🏆 Leaderboard</div>
      <div id="hostLeaderboard" class="mp-leaderboard"></div>
    </div>
  </div>

  <!-- Game Master Controls -->
  <div class="mp-host-bar">
    <button class="mp-host-btn pause" onclick="MP.socket.emit('host:pause')">⏸️ Pause</button>
    <button class="mp-host-btn outline" onclick="MP.socket.emit('host:resume')">▶️ Resume</button>
    <button class="mp-host-btn outline" onclick="MP.socket.emit('host:skip')">⏭️ Skip Q</button>
    <button class="mp-host-btn sen-toggle ${MP.senMode ? 'active' : ''}" onclick="toggleSENMode(this);MP.socket.emit('host:toggleSEN',{enabled:MP.senMode})">♿ SEN</button>
    <button class="mp-host-btn danger" onclick="if(confirm('End game?'))MP.socket.emit('host:end')">⛔ End</button>
  </div>
</div>`;
}

function updateHostDashboard(data) {
  const el = (id) => document.getElementById(id);
  if (el('tdAnswered')) el('tdAnswered').textContent = `${data.answered}/${data.total}`;
  if (el('tdQuestion') && MP.currentQuestion) el('tdQuestion').textContent = `Q${MP.currentQuestion.index + 1}`;

  // Accuracy
  const accuracies = data.playerDetails.filter(p => p.total > 0).map(p => p.accuracy);
  const avg = accuracies.length ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : 0;
  if (el('tdAccuracy')) el('tdAccuracy').textContent = avg + '%';

  // Leaderboard
  if (el('hostLeaderboard')) el('hostLeaderboard').innerHTML = renderLeaderboardRows(data.leaderboard.slice(0, 10));
}

function renderHostReview(data) {
  // Update heatmap
  const grid = document.getElementById('heatmapGrid');
  if (grid && data.heatmap) {
    grid.innerHTML = data.heatmap.map((h, i) => {
      const acc = h.accuracy;
      const bg = acc >= 80 ? 'var(--mp-green)' : acc >= 50 ? 'var(--mp-orange)' : 'var(--mp-red)';
      return `<div class="mp-heatmap-cell" style="background:${bg}" title="Q${i+1}: ${acc}% accuracy">Q${i+1}<br>${acc}%</div>`;
    }).join('');
  }
  if (document.getElementById('hostLeaderboard')) {
    document.getElementById('hostLeaderboard').innerHTML = renderLeaderboardRows(data.leaderboard.slice(0, 10));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// END SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function renderEndScreen(data) {
  clearInterval(MP.timerInterval);
  document.documentElement.classList.remove('sen-mode');
  const app = document.getElementById('app');
  const lb = data.leaderboard || [];
  const top3 = lb.slice(0, 3);

  // Confetti
  spawnConfetti();

  app.innerHTML = `
<div class="mp-end-wrap">
  <div class="mp-end-hero">
    <div class="mp-end-trophy">🏆</div>
    <h1>Game Over!</h1>
    <p style="opacity:0.9;font-size:16px">${data.totalQuestions} questions · ${(data.gameMode || '').replace(/-/g, ' ')}</p>

    ${top3.length ? `
    <div class="mp-end-podium">
      ${top3[1] ? `<div class="mp-podium-slot mp-podium-2"><div style="font-size:28px">🥈</div><div class="mp-podium-emoji">${top3[1].blook?.emoji || '👤'}</div><div class="mp-podium-name">${escQ(top3[1].name)}</div><div class="mp-podium-score">${(top3[1].score||0).toLocaleString()}</div></div>` : ''}
      ${top3[0] ? `<div class="mp-podium-slot mp-podium-1"><div style="font-size:36px">🥇</div><div class="mp-podium-emoji">${top3[0].blook?.emoji || '👤'}</div><div class="mp-podium-name">${escQ(top3[0].name)}</div><div class="mp-podium-score">${(top3[0].score||0).toLocaleString()}</div></div>` : ''}
      ${top3[2] ? `<div class="mp-podium-slot mp-podium-3"><div style="font-size:28px">🥉</div><div class="mp-podium-emoji">${top3[2].blook?.emoji || '👤'}</div><div class="mp-podium-name">${escQ(top3[2].name)}</div><div class="mp-podium-score">${(top3[2].score||0).toLocaleString()}</div></div>` : ''}
    </div>` : ''}
  </div>

  <!-- Full Leaderboard -->
  <h3 style="font-size:18px;font-weight:700;margin:20px 0 12px">Final Standings</h3>
  <div class="mp-leaderboard">${renderLeaderboardRows(lb)}</div>

  ${MP.isHost && data.heatmap?.length ? `
  <h3 style="font-size:18px;font-weight:700;margin:20px 0 12px">📊 Accuracy Heatmap</h3>
  <div class="mp-heatmap-grid">
    ${data.heatmap.map((h, i) => {
      const acc = h.accuracy;
      const bg = acc >= 80 ? 'var(--mp-green)' : acc >= 50 ? 'var(--mp-orange)' : 'var(--mp-red)';
      return `<div class="mp-heatmap-cell" style="background:${bg}">Q${i+1}<br>${acc}%</div>`;
    }).join('')}
  </div>` : ''}

  <div style="display:flex;gap:12px;justify-content:center;margin-top:32px;flex-wrap:wrap">
    <button class="mp-hero-btn primary" onclick="navigateMultiplayer('hub')">🎮 Play Again</button>
    <button class="mp-hero-btn secondary" style="background:var(--bg-muted);color:var(--text);border:2px solid var(--border)" onclick="navigate('home')">← Back to ToolHub</button>
  </div>
</div>`;
}

function spawnConfetti() {
  const colors = ['#7c3aed','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'mp-confetti-piece';
    el.style.cssText = `
      left:${Math.random()*100}%;top:-10px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      animation-delay:${Math.random()*2}s;
      animation-duration:${2+Math.random()*2}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

function renderPausedOverlay(show) {
  let overlay = document.getElementById('mpPausedOverlay');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mpPausedOverlay';
      overlay.className = 'mp-paused-overlay';
      overlay.innerHTML = '<div class="mp-paused-card"><div class="mp-paused-icon">⏸️</div><div class="mp-paused-text">Game Paused</div><p style="color:var(--text-muted);margin-top:8px">Waiting for the host to resume...</p></div>';
      document.body.appendChild(overlay);
    }
  } else {
    overlay?.remove();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER QUIZZES BROWSER
// ═══════════════════════════════════════════════════════════════════════════════
async function renderTeacherQuizzes() {
  const app = document.getElementById('app');
  document.title = 'Teacher Quizzes — ToolHub Live';
  app.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>Loading teacher quizzes...</p></div>';

  try {
    const data = await apiFetch('/api/multiplayer/teacher-quizzes');
    const quizzes = data.quizzes || [];
    const diffColors = { Foundation:'#4ade80', Developing:'#38bdf8', Intermediate:'#fb923c', Secure:'#a78bfa', Advanced:'#f472b6', Expert:'#ef4444' };

    app.innerHTML = `
<div class="mp-hub">
  <button class="btn btn-ghost" onclick="navigateMultiplayer('hub')" style="margin-bottom:16px">← Back</button>
  <h2 style="font-size:28px;font-weight:800;margin-bottom:4px">📚 Teacher Quizzes</h2>
  <p style="color:var(--text-muted);margin-bottom:8px">Year 1 through Year 11 — progressively harder curriculum-aligned quizzes.</p>
  <p style="font-size:12px;color:var(--mp-green);font-weight:600;margin-bottom:24px">✅ Only visible to verified educators</p>

  <div class="mp-tq-grid">
    ${quizzes.map(q => `
      <div class="mp-tq-card" onclick="previewTeacherQuiz('${q.id}')">
        <div class="mp-tq-cover" style="background:${q.color}">
          <div class="mp-tq-year">Year ${q.year}</div>
          <div class="mp-tq-emoji">${q.emoji}</div>
        </div>
        <div class="mp-tq-body">
          <div class="mp-tq-title">${q.title}</div>
          <div class="mp-tq-desc">${q.description}</div>
          <div class="mp-tq-meta">
            <span>❓ ${q.questionCount} Qs</span>
            <span>⏱ ${q.timeLimit}s</span>
            <span class="mp-tq-difficulty" style="background:${diffColors[q.difficulty] || '#6b7280'}22;color:${diffColors[q.difficulty] || '#6b7280'}">${q.difficulty}</span>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</div>`;
  } catch(e) {
    app.innerHTML = `
<div style="max-width:500px;margin:60px auto;text-align:center;padding:20px">
  <div style="font-size:56px;margin-bottom:16px">🔒</div>
  <h2>Educator Access Required</h2>
  <p style="color:var(--text-muted);margin:12px 0">These quizzes are only available to verified educators. Register with a school email (.edu, .sch, .ac) to access them.</p>
  <button class="btn btn-primary" onclick="navigateMultiplayer('hub')">← Back</button>
</div>`;
  }
}

async function previewTeacherQuiz(id) {
  try {
    const res = await apiFetch(`/api/multiplayer/teacher-quizzes/${id}`);
    const q = res.quiz;
    const app = document.getElementById('app');
    app.innerHTML = `
<div class="mp-hub" style="max-width:600px">
  <button class="btn btn-ghost" onclick="navigateMultiplayer('teacher')" style="margin-bottom:16px">← Back to Teacher Quizzes</button>
  <div style="text-align:center;padding:32px;border-radius:20px;background:${q.color};color:#fff;margin-bottom:24px">
    <div style="font-size:56px;margin-bottom:8px">${q.emoji}</div>
    <h2 style="font-size:24px;font-weight:800;margin-bottom:4px">${q.title}</h2>
    <p style="opacity:0.9">${q.description}</p>
    <div style="margin-top:12px;font-size:14px">Year ${q.year} · ${q.difficulty} · ${q.questions.length} Questions · ${q.timeLimit}s/Q</div>
  </div>

  <h3 style="font-size:16px;font-weight:700;margin-bottom:12px">Questions Preview:</h3>
  ${q.questions.map((question, i) => `
    <div style="padding:14px;margin-bottom:8px;border-radius:10px;background:var(--bg-muted);border:1px solid var(--border)">
      <div style="font-weight:600;margin-bottom:6px">Q${i+1}: ${question.question}</div>
      <div style="font-size:13px;color:var(--text-muted)">${question.options.map((o,j) => `<span style="${j === question.correct ? 'color:var(--mp-green);font-weight:700' : ''}">${j === question.correct ? '✅ ' : ''}${o}</span>`).join(' · ')}</div>
    </div>
  `).join('')}

  <div style="display:flex;gap:12px;margin-top:24px">
    <button class="btn btn-primary" style="flex:1" onclick="navigateMultiplayer('host')">🎮 Host as Game</button>
    <button class="btn btn-ghost" style="flex:1" onclick="navigateMultiplayer('teacher')">← Back</button>
  </div>
</div>`;
  } catch(e) {
    toast('Could not load quiz', 'error');
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────
function disableAds() {
  MP.noAds = true;
  document.querySelectorAll('.ad-bar, .tool-ad, .adsbygoogle, [id*="adBar"]').forEach(el => {
    el.style.display = 'none';
  });
  const banner = document.getElementById('premiumBanner');
  if (banner) banner.style.display = 'none';
}

function escQ(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Expose functions globally ────────────────────────────────────────────────
window.navigateMultiplayer = navigateMultiplayer;
window.renderMultiplayerHub = renderMultiplayerHub;
window.selectBlook = selectBlook;
window.doJoinGame = doJoinGame;
window.selectHostMode = selectHostMode;
window.doCreateLobby = doCreateLobby;
window.doStartGame = doStartGame;
window.toggleSENMode = toggleSENMode;
window.submitAnswer = submitAnswer;
window.simplifyQuestion = simplifyQuestion;
window.renderTeacherQuizzes = renderTeacherQuizzes;
window.previewTeacherQuiz = previewTeacherQuiz;
