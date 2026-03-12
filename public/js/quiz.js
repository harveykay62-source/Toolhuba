/* ── ToolHub AI — quiz.js — Full Quiz Platform ───────────────────────────── */
'use strict';

// ── Quiz State ────────────────────────────────────────────────────────────────
const QZ = {
  playerState: null,
  builderState: null,
  currentQuizData: null,
  threeInstances: [],
};

// ── Category metadata ─────────────────────────────────────────────────────────
const QUIZ_CATS = {
  all:          { name:'All',           emoji:'🌐' },
  general:      { name:'General',       emoji:'🌍' },
  science:      { name:'Science',       emoji:'🔬' },
  geography:    { name:'Geography',     emoji:'🗺️' },
  history:      { name:'History',       emoji:'📜' },
  'pop-culture':{ name:'Pop Culture',   emoji:'🎬' },
  sports:       { name:'Sports',        emoji:'⚽' },
  technology:   { name:'Technology',    emoji:'💻' },
  food:         { name:'Food',          emoji:'🍕' },
  art:          { name:'Art',           emoji:'🎨' },
  other:        { name:'Other',         emoji:'🎯' },
};

// ── Wildcard config ───────────────────────────────────────────────────────────
const WILDCARDS = {
  world_swap:         { name:'World Swap',          icon:'🌌', color:'#7c3aed', desc:'Quiz theme warps to another dimension!' },
  reverse_mode:       { name:'Reverse Thinking',    icon:'🔄', color:'#dc2626', desc:'Pick the WRONG answer to score points!' },
  gravity_mode:       { name:'Gravity Flip',        icon:'🌊', color:'#0ea5e9', desc:'The entire UI flips upside down!' },
  mirror_mode:        { name:'Mirror Mode',          icon:'🪞', color:'#db2777', desc:'Everything flips — trust nothing!' },
  secret_dimension:   { name:'Secret Dimension',    icon:'🔮', color:'#d97706', desc:'A hidden bonus question has appeared!' },
  chaos_round:        { name:'Chaos Round',         icon:'⚡', color:'#16a34a', desc:'Two questions at once — you choose first!' },
  object_interaction: { name:'Object Interaction',  icon:'🌐', color:'#0891b2', desc:'Interact with the 3D object to reveal next question!' },
  reality_shift:      { name:'Reality Shift',       icon:'🎭', color:'#ec4899', desc:'Screen mirror-flips AND you get a secret bonus question!' },
};

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigateQuiz(view, param='') {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  appEl.scrollIntoView({ behavior:'smooth', block:'start' });

  if (view === 'hub')     { history.pushState({},'','/quizzes');          renderQuizHub(); }
  else if (view === 'play')   { history.pushState({},'',`/quiz/${param}`);    renderQuizPlay(param); }
  else if (view === 'build')  { history.pushState({},'','/quizzes/build');    renderQuizBuilder(param||null); }
  else if (view === 'profile'){ history.pushState({},'','/quizzes/profile');  renderQuizProfile(); }
  else if (view === 'admin')  { renderAdminQuizPanel(); }
}

// ── Quiz Hub ──────────────────────────────────────────────────────────────────
async function renderQuizHub(filter={}) {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Loading Quiz Hub…</p></div>`;
  document.title = 'Quiz Hub — ToolHub AI';

  try {
    const params = new URLSearchParams(filter);
    const [listRes, trendingRes] = await Promise.all([
      apiFetch('/api/quiz/list?' + params),
      apiFetch('/api/quiz/trending'),
    ]);

    const activecat = filter.category || 'all';
    const q = filter.search || '';

    appEl.innerHTML = `
<div class="qhub-wrap">
  <!-- Hero -->
  <div class="qhub-hero">
    <canvas id="qhubCanvas" class="qhub-canvas"></canvas>
    <div class="qhub-hero-inner">
      <div class="qhub-hero-badge">✨ Quiz Platform</div>
      <h1 class="qhub-hero-title">Challenge Your Mind</h1>
      <p class="qhub-hero-sub">Play community quizzes, create your own, and experience the <strong>Wildcard Reality Shift</strong> — where anything can happen.</p>
      <div class="qhub-hero-btns">
        <button class="btn btn-primary btn-lg" onclick="navigateQuiz('build')">
          <span>✏️</span> Create Quiz
        </button>
        <button class="btn qhub-btn-secondary btn-lg" onclick="document.getElementById('quizBrowse').scrollIntoView({behavior:'smooth'})">
          <span>🎮</span> Browse Quizzes
        </button>
      </div>
    </div>
  </div>

  <!-- Quick Stats Bar -->
  <div class="qhub-statsbar">
    <div class="qhub-stat"><span class="qhub-stat-n">${(trendingRes.quizzes||[]).reduce((a,q)=>a+(q.plays||0),0).toLocaleString()}+</span><span>Total Plays</span></div>
    <div class="qhub-stat-div"></div>
    <div class="qhub-stat"><span class="qhub-stat-n">${(trendingRes.quizzes||[]).length}+</span><span>Live Quizzes</span></div>
    <div class="qhub-stat-div"></div>
    <div class="qhub-stat"><span class="qhub-stat-n">7</span><span>Wildcard Types</span></div>
    <div class="qhub-stat-div"></div>
    <div class="qhub-stat"><span class="qhub-stat-n">Free</span><span>Always Free</span></div>
  </div>

  <!-- Trending Section -->
  ${trendingRes.quizzes && trendingRes.quizzes.length ? `
  <div class="qhub-section">
    <div class="qhub-section-hdr">
      <h2>🔥 Trending Now</h2>
    </div>
    <div class="qhub-trending-row">
      ${trendingRes.quizzes.slice(0,3).map(quiz => quizCardHTML(quiz, 'trending')).join('')}
    </div>
  </div>` : ''}

  <!-- Browse Section -->
  <div class="qhub-section" id="quizBrowse">
    <div class="qhub-section-hdr">
      <h2>🎮 All Quizzes</h2>
      <div class="qhub-browse-controls">
        <div class="qhub-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="qhub-search" id="quizSearchInput" placeholder="Search quizzes…" value="${escQ(q)}" oninput="debounceQuizSearch(this.value)">
        </div>
        <select class="qhub-select" onchange="renderQuizHub({category:this.value,search:document.getElementById('quizSearchInput').value})">
          ${Object.entries(QUIZ_CATS).map(([k,v])=>`<option value="${k}" ${k===activecat?'selected':''}>${v.emoji} ${v.name}</option>`).join('')}
        </select>
        <select class="qhub-select" onchange="renderQuizHub({category:'${activecat}',search:'${escQ(q)}',sort:this.value})">
          <option value="plays" ${(filter.sort||'plays')==='plays'?'selected':''}>🔥 Most Played</option>
          <option value="likes" ${filter.sort==='likes'?'selected':''}>❤️ Most Liked</option>
          <option value="created_at" ${filter.sort==='created_at'?'selected':''}>🆕 Newest</option>
        </select>
      </div>
    </div>

    <div class="qhub-cat-tabs">
      ${Object.entries(QUIZ_CATS).map(([k,v])=>`
        <button class="qhub-cat-tab ${k===activecat?'active':''}"
                onclick="renderQuizHub({category:'${k}',search:'${escQ(q)}'})">
          ${v.emoji} ${v.name}
        </button>`).join('')}
    </div>

    ${listRes.quizzes && listRes.quizzes.length ? `
      <div class="qhub-grid" id="quizGrid">
        ${listRes.quizzes.map(quiz => quizCardHTML(quiz)).join('')}
      </div>` : `
      <div class="qhub-empty">
        <div style="font-size:56px">🧩</div>
        <h3>No quizzes found</h3>
        <p>Be the first to create one!</p>
        <button class="btn btn-primary" onclick="navigateQuiz('build')">Create Quiz</button>
      </div>`}
  </div>

  <!-- My Quizzes + Profile Bar -->
  <div class="qhub-bottom-bar">
    ${APP.session.loggedIn ? `
      <div class="qhub-bottom-card" onclick="navigateQuiz('profile')" style="cursor:pointer">
        <div class="qhub-bottom-avatar" style="background:${APP.session.avatarColor||'#6366f1'}">
          ${(APP.session.name||'?').slice(0,2).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700">${escQ(APP.session.name)}</div>
          <div style="font-size:13px;color:var(--text-muted)">View my profile & quizzes →</div>
        </div>
      </div>` : `
      <div class="qhub-bottom-card" onclick="showSignup()">
        <div style="font-size:32px">👤</div>
        <div>
          <div style="font-weight:700">Sign up free</div>
          <div style="font-size:13px;color:var(--text-muted)">Create quizzes & track scores</div>
        </div>
      </div>`}
    <button class="btn btn-primary qhub-create-fab" onclick="navigateQuiz('build')">✏️ Create Quiz</button>
    ${APP.session.role==='admin' ? `<button class="btn" style="background:var(--amber);color:#000" onclick="navigateQuiz('admin')">🛡️ Quiz Admin</button>` : ''}
  </div>
</div>`;

    // Initialize Three.js hero animation
    setTimeout(() => {
      if (filter.category === 'pop-culture') {
        initYouTube3DHero('qhubCanvas');
      } else {
        initQuizHero3D('qhubCanvas');
      }
    }, 100);

    // Wildcard showcase after a beat
    let _qsDebounce;
    window.debounceQuizSearch = (val) => {
      clearTimeout(_qsDebounce);
      _qsDebounce = setTimeout(() => renderQuizHub({ ...filter, search: val }), 350);
    };

  } catch(e) {
    appEl.innerHTML = `<div style="padding:60px;text-align:center"><p>Failed to load Quiz Hub</p><button class="btn btn-primary" onclick="renderQuizHub()">Retry</button></div>`;
  }
}

function quizCardHTML(quiz, variant='normal') {
  const cat = QUIZ_CATS[quiz.category] || QUIZ_CATS.general;
  const wc = quiz.wildcard_enabled ? `<span class="quiz-wc-badge" title="Wildcards enabled">⚡</span>` : '';
  return `
<div class="quiz-card ${variant==='trending'?'quiz-card-trending':''}" onclick="navigateQuiz('play','${quiz.id}')">
  <div class="quiz-card-cover" style="background:${quiz.cover_color||'#6366f1'}">
    <span class="quiz-card-emoji">${quiz.cover_emoji||'🧠'}</span>
    ${wc}
    ${quiz.is_starter ? '<span class="quiz-starter-badge">⭐ Featured</span>' : ''}
  </div>
  <div class="quiz-card-body">
    <div class="quiz-card-meta">
      <span class="quiz-cat-tag">${cat.emoji} ${cat.name}</span>
      <span class="quiz-card-plays">▶ ${(quiz.plays||0).toLocaleString()}</span>
    </div>
    <div class="quiz-card-title">${escQ(quiz.title)}</div>
    <div class="quiz-card-desc">${escQ((quiz.description||'').slice(0,80))}${(quiz.description||'').length>80?'…':''}</div>
    <div class="quiz-card-footer">
      <span>❓ ${quiz.questions_count} Qs</span>
      <span>⏱ ${quiz.time_limit}s/Q</span>
      <span>❤️ ${quiz.likes||0}</span>
      ${quiz.creator_name ? `<span style="margin-left:auto;font-size:11px;color:var(--text-muted)">by ${escQ(quiz.creator_name)}</span>` : ''}
    </div>
  </div>
</div>`;
}

// ── Quiz Play ──────────────────────────────────────────────────────────────────
async function renderQuizPlay(quizId) {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Loading quiz…</p></div>`;

  try {
    const data = await apiFetch(`/api/quiz/${quizId}`);
    document.title = `${data.quiz.title} — ToolHub AI`;
    QZ.currentQuizData = data;

    // Show quiz intro
    renderQuizIntro(data);
  } catch(e) {
    appEl.innerHTML = `
      <div style="padding:60px;text-align:center">
        <div style="font-size:48px">❌</div>
        <h2>Quiz not found</h2>
        <button class="btn btn-primary" onclick="navigateQuiz('hub')">← Back to Quizzes</button>
      </div>`;
  }
}

function renderQuizIntro(data) {
  const { quiz, leaderboard } = data;
  const appEl = document.getElementById('app');
  const cat   = QUIZ_CATS[quiz.category] || QUIZ_CATS.general;
  let wcConfig = {};
  try { wcConfig = JSON.parse(quiz.wildcard_config||'{}'); } catch{}

  const isJackQuiz = quiz.id === 'starter-jacksucksatlife-v1' || quiz.cover_color === '#ff0000';

  appEl.innerHTML = `
<div class="quiz-intro-wrap">
  <button class="quiz-back-btn" onclick="navigateQuiz('hub')">← Back</button>
  <div class="quiz-intro-card">
    <div class="quiz-intro-cover ${isJackQuiz ? 'jack-quiz-hero' : ''}" style="background:${isJackQuiz ? '' : (quiz.cover_color||'#6366f1')};position:relative;overflow:hidden;">
      ${isJackQuiz ? `<canvas id="jackIntroCanvas" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.5;pointer-events:none"></canvas>` : ''}
      <span style="font-size:72px;position:relative;z-index:1;filter:drop-shadow(0 4px 16px rgba(0,0,0,.6))">${quiz.cover_emoji||'🧠'}</span>
      ${isJackQuiz ? `<div style="position:absolute;bottom:12px;right:14px;z-index:1;font-size:11px;font-weight:800;color:rgba(255,255,255,.8);letter-spacing:.05em">▶️ FEATURED QUIZ</div>` : ''}
    </div>
    <div class="quiz-intro-body">
      <div class="quiz-intro-meta">
        <span class="quiz-cat-tag">${cat.emoji} ${cat.name}</span>
        ${quiz.wildcard_enabled ? `<span class="quiz-wc-badge-lg">⚡ Wildcards Active</span>` : ''}
        ${quiz.is_starter ? `<span style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700">⭐ Featured</span>` : ''}
      </div>
      <h1 class="quiz-intro-title">${escQ(quiz.title)}</h1>
      <p class="quiz-intro-desc">${escQ(quiz.description||'')}</p>
      <div class="quiz-intro-stats">
        <div class="qi-stat"><span class="qi-stat-n">${quiz.questions_count}</span><span>Questions</span></div>
        <div class="qi-stat"><span class="qi-stat-n">${quiz.time_limit}s</span><span>Per Question</span></div>
        <div class="qi-stat"><span class="qi-stat-n">${(quiz.plays||0).toLocaleString()}</span><span>Plays</span></div>
        <div class="qi-stat"><span class="qi-stat-n">${quiz.likes||0}</span><span>Likes</span></div>
      </div>
      ${quiz.wildcard_enabled && wcConfig.types && wcConfig.types.length ? `
      <div class="quiz-intro-wc">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-muted)">⚡ ACTIVE WILDCARDS</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${(wcConfig.types||[]).map(t => {
            const wc = WILDCARDS[t];
            return wc ? `<span class="wc-pill" style="border-color:${wc.color}">${wc.icon} ${wc.name}</span>` : '';
          }).join('')}
        </div>
      </div>` : ''}
      <div class="quiz-intro-actions">
        <button class="btn btn-primary btn-lg" onclick="startQuizGame()">
          🎮 Start Quiz
        </button>
        <button class="btn btn-ghost btn-lg" onclick="toggleQuizLike('${quiz.id}')">
          ❤️ ${quiz.likes||0}
        </button>
        <button class="btn btn-ghost btn-lg" onclick="shareQuiz('${quiz.id}','${escQ(quiz.title).replace(/'/g,"\\'")}')">
          🔗 Share
        </button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
        Created by <strong>${escQ(quiz.creator_name||'ToolHub AI')}</strong>
      </div>
    </div>
  </div>

  ${leaderboard && leaderboard.length ? `
  <div class="quiz-leaderboard">
    <h3>🏆 Leaderboard</h3>
    <div class="qlb-list">
      ${leaderboard.map((entry, i) => `
        <div class="qlb-row ${i===0?'qlb-gold':i===1?'qlb-silver':i===2?'qlb-bronze':''}">
          <span class="qlb-rank">${['🥇','🥈','🥉'][i]||`#${i+1}`}</span>
          <span class="qlb-name">${escQ(entry.player_name)}</span>
          <span class="qlb-score">${entry.score} pts</span>
          <span class="qlb-pct">${entry.pct}%</span>
        </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  // YouTube 3D hero for Jack quiz
  if (isJackQuiz) {
    setTimeout(() => initYouTube3DHero('jackIntroCanvas'), 100);
  }
}

function startQuizGame() {
  const data = QZ.currentQuizData;
  if (!data) return;

  let wcConfig = { enabled: false, frequency:'rare', types:[] };
  try { wcConfig = { ...wcConfig, ...JSON.parse(data.quiz.wildcard_config||'{}') }; } catch{}

  QZ.playerState = {
    quizId:       data.quiz.id,
    questions:    data.playQuestions,
    answers:      data.answers,
    currentIndex: 0,
    score:        0,
    maxScore:     data.playQuestions.reduce((a,q)=>(a + (q.points||100)), 0),
    correct:      0,
    startTime:    Date.now(),
    qStartTime:   Date.now(),
    results:      [],
    wcConfig,
    wildcardsUsed:0,
    activeWildcard: null,
    timerId:      null,
    timeLeft:     0,
    isReverseMode: false,
    isMirrorMode:  false,
    isGravityFlipped: false,
    chaosSecondQ:  null,
    // New engagement fields
    streak:        0,
    streakMax:     0,
    bossBattlesBeaten: 0,
    betsWon:       0,
    _betAmount:    0,
    memeifyOn:     false,
    answerLocked:  false,
  };

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const ps = QZ.playerState;
  if (!ps) return;

  // ── Boss Battle check ──────────────────────────────────────────────────────
  if (isBossQuestion(ps.currentIndex, ps)) {
    const bossData = getBossData(ps.currentIndex);
    showBossIntro(bossData, () => _doRenderQuestion(bossData));
    return;
  }

  // ── Betting mechanic check ─────────────────────────────────────────────────
  if (shouldShowBet(ps.currentIndex, ps)) {
    renderBetScreen(() => _doRenderQuestion(null));
    return;
  }

  _doRenderQuestion(null);
}

function _doRenderQuestion(bossData) {
  const ps = QZ.playerState;
  if (!ps) return;

  const q     = ps.questions[ps.currentIndex];
  const total = ps.questions.length;
  const pct   = Math.round(((ps.currentIndex) / total) * 100);
  const isBoss = !!bossData;

  clearTimeout(ps.timerId);
  ps.qStartTime = Date.now();
  ps.timeLeft   = isBoss
    ? Math.floor((q.time_limit || 30) * (bossData.timeMultiplier || 0.6))
    : (q.time_limit || 30);
  ps.activeWildcard = null;
  ps.answerLocked = false;

  // Roll wildcard
  const wcFreqMap = { rare:0.12, occasional:0.22, frequent:0.38 };
  const wcChance  = wcFreqMap[ps.wcConfig.frequency||'rare'] || 0.12;
  const wcTypes   = ps.wcConfig.types || [];
  let triggerWC   = null;
  if (ps.wcConfig.enabled && wcTypes.length && ps.currentIndex >= 2 && !isBoss && Math.random() < wcChance) {
    triggerWC = wcTypes[Math.floor(Math.random() * wcTypes.length)];
    ps.wildcardsUsed++;
  }

  const appEl    = document.getElementById('app');
  const modeClass = ps.isMirrorMode ? 'quiz-mirror-mode' : '';
  const bossClass = isBoss ? 'quiz-boss-mode' : '';
  const gravClass = ps.isGravityFlipped ? 'quiz-gravity-flipped' : '';

  // Is this a heatmap question?
  const isHeatmap = q.type === 'heatmap';

  appEl.innerHTML = `
<div class="quiz-player-wrap ${modeClass} ${bossClass} ${gravClass}" id="quizPlayerWrap">
  <!-- Header -->
  <div class="qp-header">
    <button class="qp-exit" onclick="confirmQuitQuiz()">✕</button>
    <div class="qp-progress-info">
      <span class="qp-qnum">Q${ps.currentIndex+1} / ${total}${isBoss?' 🔥 BOSS':''}${q.isFinalBoss?' ⚡ FINAL BOSS':''}</span>
      <div class="qp-progress-bar"><div class="qp-progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="qp-score-disp">⭐ ${ps.score.toLocaleString()}</div>
    <button class="qp-meme-toggle" id="memeifyToggle" onclick="toggleMemeify()" title="Meme-ify">🎭</button>
  </div>

  ${isBoss ? `<div class="boss-active-bar" style="border-color:${bossData.color}">
    ${bossData.emoji} <strong>BOSS BATTLE</strong> — ${bossData.name} — Timer accelerated!
  </div>` : ''}

  ${ps._betAmount > 0 ? `<div class="bet-active-bar">🎰 Wager: <strong>${ps._betAmount} points</strong> on the line!</div>` : ''}

  <!-- Timer -->
  <div class="qp-timer-bar ${isBoss ? 'boss-timer' : ''}">
    <div class="qp-timer-fill" id="timerFill" style="width:100%"></div>
  </div>
  <div class="qp-timer-num" id="timerNum">${ps.timeLeft}</div>

  <!-- Mode badges -->
  <div id="qpModeBadges" class="qp-mode-badges">
    ${ps.isReverseMode ? '<div class="qp-mode-badge reverse">🔄 REVERSE MODE — Pick the WRONG answer!</div>' : ''}
    ${ps.isMirrorMode  ? '<div class="qp-mode-badge mirror">🪞 MIRROR MODE</div>' : ''}
    ${ps.isGravityFlipped ? '<div class="qp-mode-badge gravity">🌊 GRAVITY FLIP — UI is upside down!</div>' : ''}
  </div>

  <!-- Question -->
  <div class="qp-question-area" id="qpQuestionArea">
    ${q.image_url ? `<div class="qp-question-img"><img src="${q.image_url}" alt="Question image" loading="lazy"></div>` : ''}
    <div class="qp-question-text">${escQ(q.text)}</div>
    ${isBoss ? `<div class="boss-points-badge">⚡ ${q.points||300} BOSS POINTS</div>` : ''}
  </div>

  <!-- Options -->
  <div class="qp-options" id="qpOptions">
    ${isHeatmap ? renderHeatmapQuestion(q, ps.currentIndex) : renderOptions(q, ps.isReverseMode)}
  </div>

  <!-- Wildcard overlay placeholder -->
  <div id="wcOverlay" class="wc-overlay hidden"></div>
</div>`;

  startQuestionTimer(ps.timeLeft);

  if (triggerWC) {
    setTimeout(() => triggerWildcard(triggerWC), 800);
  }

  // Apply current streak styling
  applyStreakEffect(ps.streak);
}

function renderOptions(q, reverseMode) {
  const colors = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];
  if (q.type === 'true_false') {
    return `
      <button class="qp-opt tf-opt tf-true" onclick="selectAnswer(0)" style="--opt-color:${colors[0]}">
        <span class="qp-opt-icon">✓</span> True
      </button>
      <button class="qp-opt tf-opt tf-false" onclick="selectAnswer(1)" style="--opt-color:${colors[1]}">
        <span class="qp-opt-icon">✕</span> False
      </button>`;
  }
  if (q.type === 'text_answer') {
    return `
      <div class="qp-text-answer">
        <input type="text" class="qp-text-input" id="textAnswerInput" placeholder="Type your answer…" onkeydown="if(event.key==='Enter')submitTextAnswer()">
        <button class="btn btn-primary" onclick="submitTextAnswer()">Submit Answer</button>
      </div>`;
  }
  return (q.options||[]).map((opt, i) => `
    <button class="qp-opt mc-opt" onclick="selectAnswer(${i})"
            style="--opt-color:${colors[i%colors.length]}">
      <span class="qp-opt-letter">${'ABCD'[i]}</span>
      <span class="qp-opt-text">${escQ(opt)}</span>
    </button>`).join('');
}

function startQuestionTimer(seconds) {
  const ps = QZ.playerState;
  if (!ps) return;
  ps.timeLeft = seconds;

  const fill = document.getElementById('timerFill');
  const num  = document.getElementById('timerNum');

  const tick = () => {
    ps.timeLeft = Math.max(0, seconds - Math.floor((Date.now() - ps.qStartTime) / 1000));
    const pct = (ps.timeLeft / seconds) * 100;
    if (fill) fill.style.width = pct + '%';
    if (num)  num.textContent  = ps.timeLeft;
    if (fill) fill.style.background = pct > 40 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';

    if (ps.timeLeft <= 0) {
      clearTimeout(ps.timerId);
      // Time's up — auto-submit wrong
      selectAnswer(-1);
      return;
    }
    ps.timerId = setTimeout(tick, 250);
  };
  ps.timerId = setTimeout(tick, 250);
}

function submitTextAnswer() {
  const input = document.getElementById('textAnswerInput');
  if (!input) return;
  const ps = QZ.playerState;
  const q  = ps.questions[ps.currentIndex];
  const answer = (q.options||[])[0] || '';
  const isCorrect = input.value.trim().toLowerCase() === answer.toLowerCase();
  selectAnswer(isCorrect ? 0 : -1);
}

function selectAnswer(optIndex) {
  const ps = QZ.playerState;
  if (!ps || ps.answerLocked) return;
  ps.answerLocked = true;
  clearTimeout(ps.timerId);

  const q        = ps.questions[ps.currentIndex];
  const answerObj= ps.answers[ps.currentIndex];
  const correct  = answerObj?.correct ?? 0;
  const timeTaken= Math.floor((Date.now() - ps.qStartTime) / 1000);
  const timeLimit= q.time_limit || 30;
  const maxPts   = q.points || 100;
  const isBoss   = isBossQuestion(ps.currentIndex, ps);

  let isCorrect;
  if (ps.isReverseMode) {
    isCorrect = optIndex !== correct && optIndex !== -1;
  } else {
    isCorrect = optIndex === correct;
  }

  // Speed bonus
  const timePct  = Math.max(0, 1 - (timeTaken / timeLimit));
  let earned     = isCorrect ? Math.round(maxPts * (0.5 + 0.5 * timePct)) : 0;

  // Boss multiplier
  if (isBoss && isCorrect) {
    earned = Math.round(earned * 1.5);
    ps.bossBattlesBeaten++;
  }

  // Bet resolution
  if (ps._betAmount > 0) {
    if (isCorrect) {
      earned += ps._betAmount;
      ps.betsWon++;
      toast(`🎰 +${ps._betAmount} Wager Won!`, 'success', 2000);
    } else {
      ps.score = Math.max(0, ps.score - ps._betAmount);
      toast(`🎰 Lost ${ps._betAmount} wager!`, 'warn', 2000);
    }
    ps._betAmount = 0;
  }

  ps.score += earned;
  if (isCorrect) {
    ps.correct++;
    ps.streak++;
    if (ps.streak > ps.streakMax) ps.streakMax = ps.streak;
  } else {
    ps.streak = 0;
  }

  // Meme-ify auto-sound
  if (ps.memeifyOn) {
    if (isCorrect) MEME_SOUNDS.gg();
    else MEME_SOUNDS.sad();
  }

  ps.results.push({ questionIndex: ps.currentIndex, correct: isCorrect, earned, timeTaken, isBoss });
  showAnswerFeedback(optIndex, correct, isCorrect, earned, answerObj?.explanation);

  // Update streak UI after answering
  setTimeout(() => applyStreakEffect(ps.streak), 100);

  ps.isReverseMode    = false;
  ps.isMirrorMode     = false;
  ps.isGravityFlipped = false;
  ps.answerLocked     = false;
}

function showAnswerFeedback(chosen, correct, isCorrect, earned, explanation) {
  // Highlight options
  document.querySelectorAll('.qp-opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)  btn.classList.add('opt-correct');
    if (i === chosen && !isCorrect && chosen !== -1) btn.classList.add('opt-wrong');
  });

  // Score flash
  const scoreEl = document.querySelector('.qp-score-disp');
  if (scoreEl && earned > 0) {
    const flash = document.createElement('span');
    flash.className = 'score-flash';
    flash.textContent = `+${earned}`;
    scoreEl.appendChild(flash);
    setTimeout(() => flash.remove(), 800);
  }

  // Explanation + next
  const qArea = document.getElementById('qpQuestionArea');
  if (qArea && explanation) {
    const expEl = document.createElement('div');
    expEl.className = 'qp-explanation';
    expEl.innerHTML = `<span>${isCorrect ? '✅' : '❌'}</span> ${escQ(explanation)}`;
    qArea.appendChild(expEl);
  }

  const timer = document.getElementById('timerNum');
  if (timer) timer.textContent = isCorrect ? '✓' : '✗';

  setTimeout(() => advanceQuestion(), explanation ? 2200 : 1400);
}

function advanceQuestion() {
  const ps = QZ.playerState;
  if (!ps) return;
  ps.currentIndex++;

  if (ps.currentIndex >= ps.questions.length) {
    showQuizResults();
  } else {
    renderCurrentQuestion();
  }
}

// ── Wildcard System ───────────────────────────────────────────────────────────
function triggerWildcard(type) {
  const ps = QZ.playerState;
  if (!ps) return;
  const wc = WILDCARDS[type];
  if (!wc) return;

  const overlay = document.getElementById('wcOverlay');
  if (!overlay) return;

  // Wildcard announcement
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
<div class="wc-announce">
  <div class="wc-announce-icon">${wc.icon}</div>
  <div class="wc-announce-name" style="color:${wc.color}">${wc.name}</div>
  <div class="wc-announce-desc">${wc.desc}</div>
  <div class="wc-announce-bar"><div class="wc-announce-fill"></div></div>
</div>`;

  setTimeout(() => {
    overlay.classList.add('hidden');
    applyWildcardEffect(type);
  }, 2000);
}

function applyWildcardEffect(type) {
  const ps = QZ.playerState;
  if (!ps) return;
  const wrap = document.getElementById('quizPlayerWrap');

  if (type === 'world_swap') {
    const themes = ['wc-theme-space','wc-theme-ocean','wc-theme-fire','wc-theme-forest'];
    const theme  = themes[Math.floor(Math.random() * themes.length)];
    if (wrap) { wrap.classList.add(theme); setTimeout(()=>wrap.classList.remove(theme), 18000); }
    toast('🌌 Reality shifted!', 'info', 2500);
  }

  else if (type === 'reverse_mode') {
    ps.isReverseMode = true;
    const badge = document.getElementById('qpModeBadges');
    if (badge) badge.innerHTML = '<div class="qp-mode-badge reverse">🔄 REVERSE MODE — Pick the WRONG answer!</div>';
    toast('🔄 Pick the WRONG answer to score!', 'warn', 2500);
  }

  else if (type === 'gravity_mode') {
    const ps = QZ.playerState;
    if (ps) ps.isGravityFlipped = true;
    const wrap = document.getElementById('quizPlayerWrap');
    if (wrap) {
      wrap.classList.add('quiz-gravity-flipped');
      setTimeout(() => { if(wrap) wrap.classList.remove('quiz-gravity-flipped'); ps && (ps.isGravityFlipped=false); }, 18000);
    }
    const badge = document.getElementById('qpModeBadges');
    if (badge) badge.innerHTML += '<div class="qp-mode-badge gravity">🌊 GRAVITY FLIP — Everything is upside down!</div>';
    toast('🌊 Gravity Flip! The world turned upside down!', 'warn', 2500);
  }

  else if (type === 'reality_shift') {
    const ps = QZ.playerState;
    if (ps) { ps.isMirrorMode = true; ps.isGravityFlipped = true; }
    const wrap = document.getElementById('quizPlayerWrap');
    if (wrap) {
      wrap.classList.add('quiz-mirror-mode','quiz-gravity-flipped');
      setTimeout(() => { if(wrap){wrap.classList.remove('quiz-mirror-mode','quiz-gravity-flipped');} if(ps){ps.isMirrorMode=false;ps.isGravityFlipped=false;} }, 18000);
    }
    toast('🎭 REALITY SHIFT! Mirror + Gravity = Pure Chaos!', 'warn', 3000);
    setTimeout(() => showSecretDimensionQuestion(), 3500);
  }

  else if (type === 'mirror_mode') {
    ps.isMirrorMode = true;
    if (wrap) { wrap.classList.add('quiz-mirror-mode'); setTimeout(()=>{ if(wrap) wrap.classList.remove('quiz-mirror-mode'); }, 18000); }
    const badge = document.getElementById('qpModeBadges');
    if (badge) badge.innerHTML += '<div class="qp-mode-badge mirror">🪞 MIRROR MODE — Everything is flipped!</div>';
    toast('🪞 Mirror Mode activated!', 'warn', 2500);
  }

  else if (type === 'secret_dimension') {
    showSecretDimensionQuestion();
  }

  else if (type === 'chaos_round') {
    showChaosRound();
  }

  else if (type === 'object_interaction') {
    showObjectInteraction();
  }
}

function showSecretDimensionQuestion() {
  const secrets = [
    { text:'🔮 Secret Dimension: What is the next number in the sequence 2, 4, 8, 16…?', options:['24','32','30','20'], correct:1 },
    { text:'🔮 Secret Dimension: If you reverse "QUIZ", what do you get?', options:['ZIUQ','ZUQI','QUZI','IZUQ'], correct:0 },
    { text:'🔮 Secret Dimension: How many letters are in the word "WILDCARD"?', options:['7','8','9','6'], correct:1 },
    { text:'🔮 Secret Dimension: What comes next: 🟥🟦🟥🟦…?', options:['🟩','🟥','🟦','🟨'], correct:1 },
  ];
  const secret = secrets[Math.floor(Math.random() * secrets.length)];
  const overlay = document.getElementById('wcOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
<div class="secret-dim-wrap">
  <div class="secret-dim-glow"></div>
  <div class="secret-dim-content">
    <div style="font-size:32px;margin-bottom:12px">🔮</div>
    <div class="secret-dim-q">${secret.text}</div>
    <div class="secret-dim-opts">
      ${secret.options.map((o,i)=>`
        <button class="secret-opt" onclick="answerSecret(${i},${secret.correct},this)">${escQ(o)}</button>
      `).join('')}
    </div>
    <div id="secretResult" style="margin-top:16px;font-size:14px"></div>
  </div>
</div>`;
}

function answerSecret(chosen, correct, btn) {
  const overlay = document.getElementById('wcOverlay');
  const result  = document.getElementById('secretResult');
  const opts    = overlay.querySelectorAll('.secret-opt');
  opts.forEach((b,i)=>{ b.disabled=true; if(i===correct) b.classList.add('secret-correct'); if(i===chosen&&chosen!==correct) b.classList.add('secret-wrong'); });
  const ps = QZ.playerState;
  if (chosen === correct && ps) { ps.score += 200; toast('+200 Bonus Points! 🔮', 'success', 2000); }
  if (result) result.textContent = chosen===correct ? '✅ +200 Bonus Points!' : '❌ Better luck next dimension!';
  setTimeout(() => { overlay.classList.add('hidden'); overlay.innerHTML=''; }, 2500);
}

function showChaosRound() {
  const ps = QZ.playerState;
  if (!ps || ps.currentIndex + 1 >= ps.questions.length) return;
  const q2 = ps.questions[ps.currentIndex + 1];
  const overlay = document.getElementById('wcOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
<div class="chaos-wrap">
  <div class="chaos-header">⚡ CHAOS ROUND — Choose which question to answer first!</div>
  <div class="chaos-grid">
    <button class="chaos-q-btn" onclick="pickChaosQ(0,this)">
      <div class="chaos-q-num">Current Question</div>
      <div class="chaos-q-text">${escQ(ps.questions[ps.currentIndex].text)}</div>
    </button>
    <button class="chaos-q-btn" onclick="pickChaosQ(1,this)">
      <div class="chaos-q-num">Next Question</div>
      <div class="chaos-q-text">${escQ(q2.text)}</div>
    </button>
  </div>
</div>`;
}

function pickChaosQ(choice, btn) {
  const ps = QZ.playerState;
  if (!ps) return;
  const overlay = document.getElementById('wcOverlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
  // If they picked next question, swap
  if (choice === 1 && ps.currentIndex + 1 < ps.questions.length) {
    const tmp = ps.questions[ps.currentIndex];
    ps.questions[ps.currentIndex] = ps.questions[ps.currentIndex+1];
    ps.questions[ps.currentIndex+1] = tmp;
    const tmp2 = ps.answers[ps.currentIndex];
    ps.answers[ps.currentIndex] = ps.answers[ps.currentIndex+1];
    ps.answers[ps.currentIndex+1] = tmp2;
  }
  toast('⚡ You chose! Answer now!', 'info', 1500);
}

function showObjectInteraction() {
  const overlay = document.getElementById('wcOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
<div class="obj-interact-wrap">
  <div class="obj-interact-header">🌐 Interact with the 3D object to reveal the next question!</div>
  <canvas id="wcObjectCanvas" width="300" height="300" class="wc-3d-canvas" style="cursor:pointer"></canvas>
  <div class="obj-interact-hint" id="objHint">Click or drag to rotate the object</div>
  <button class="btn btn-primary" id="objRevealBtn" onclick="revealFromObject()" style="display:none">
    ✨ Reveal Question
  </button>
</div>`;

  setTimeout(() => {
    initInteractiveObject('wcObjectCanvas');
    let clicks = 0;
    const canvas = document.getElementById('wcObjectCanvas');
    if (canvas) canvas.addEventListener('click', () => {
      clicks++;
      if (clicks >= 3) {
        const btn = document.getElementById('objRevealBtn');
        const hint = document.getElementById('objHint');
        if (btn) btn.style.display = 'inline-block';
        if (hint) hint.textContent = '✅ Object unlocked!';
      }
    });
  }, 100);
}

function revealFromObject() {
  const overlay = document.getElementById('wcOverlay');
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
  toast('🌐 Object revealed the next question!', 'success', 2000);
}

function confirmQuitQuiz() {
  if (confirm('Quit this quiz? Your progress will be lost.')) {
    QZ.playerState = null;
    navigateQuiz('hub');
  }
}

// ── Quiz Results ──────────────────────────────────────────────────────────────
async function showQuizResults() {
  const ps = QZ.playerState;
  if (!ps) return;

  clearTimeout(ps.timerId);
  const appEl   = document.getElementById('app');
  const total   = ps.questions.length;
  const pct     = ps.maxScore > 0 ? Math.round((ps.score / ps.maxScore) * 100) : 0;
  const timeSec = Math.floor((Date.now() - ps.startTime) / 1000);
  const grade   = pct >= 90 ? { lbl:'S+ Rank', color:'#f59e0b', emoji:'🏆' }
                : pct >= 75 ? { lbl:'A Rank',   color:'#10b981', emoji:'🥇' }
                : pct >= 55 ? { lbl:'B Rank',   color:'#6366f1', emoji:'🥈' }
                : pct >= 35 ? { lbl:'C Rank',   color:'#0ea5e9', emoji:'🥉' }
                :             { lbl:'Try Again', color:'#ef4444', emoji:'📚' };

  // Save score with enhanced stats
  try {
    await apiFetch(`/api/quiz/${ps.quizId}/play`, 'POST', {
      score: ps.score, maxScore: ps.maxScore,
      questionsAnswered: total, wildcardsTriggered: ps.wildcardsUsed,
      bossBattlesBeaten: ps.bossBattlesBeaten, betsWon: ps.betsWon,
      streakMax: ps.streakMax, timeTaken: timeSec
    });
  } catch(e) {}

  appEl.innerHTML = `
<div class="quiz-results-wrap">
  <div class="qr-header" style="--grade-color:${grade.color}">
    <div class="qr-emoji">${grade.emoji}</div>
    <div class="qr-grade" style="color:${grade.color}">${grade.lbl}</div>
    <div class="qr-pct">${pct}%</div>
    <div class="qr-score">${ps.score.toLocaleString()} points</div>
  </div>

  <div class="qr-stats-grid">
    <div class="qr-stat"><span class="qr-stat-n">${ps.correct}/${total}</span><span>Correct</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${timeSec}s</span><span>Time</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${ps.wildcardsUsed}</span><span>Wildcards</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${ps.streakMax}</span><span>Best Streak</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${ps.bossBattlesBeaten}</span><span>Bosses Beaten</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${ps.betsWon}</span><span>Bets Won</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${Math.round(ps.score / Math.max(1,total))}</span><span>Avg Pts/Q</span></div>
    <div class="qr-stat"><span class="qr-stat-n">${pct}%</span><span>Accuracy</span></div>
  </div>

  <div class="qr-answer-review">
    <h3>Answer Review</h3>
    ${ps.results.map((r, i) => {
      const q = ps.questions[r.questionIndex];
      return `<div class="qr-ans-row ${r.correct?'qr-correct':'qr-wrong'}">
        <span>${r.correct ? '✅' : '❌'}</span>
        <span class="qr-ans-text">${escQ((q.text||'').slice(0,60))}${(q.text||'').length>60?'…':''}</span>
        <span class="qr-ans-pts">${r.correct ? '+'+r.earned : '0'} pts</span>
      </div>`;
    }).join('')}
  </div>

  <div class="qr-actions">
    <button class="btn btn-primary btn-lg" onclick="restartQuiz()">🔄 Play Again</button>
    <button class="btn btn-ghost btn-lg" onclick="shareQuizResult(${pct})">📤 Share Score</button>
    <button class="btn btn-ghost btn-lg" onclick="navigateQuiz('hub')">← Quiz Hub</button>
  </div>
</div>`;

  QZ.playerState = null;
}

function restartQuiz() {
  const data = QZ.currentQuizData;
  if (data) renderQuizIntro(data);
  else navigateQuiz('hub');
}

function shareQuiz(id, title) {
  const url = `${location.origin}/quiz/${id}`;
  if (navigator.share) {
    navigator.share({ title, url }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(url).then(() => toast('🔗 Link copied!', 'success'));
  }
}

function shareQuizResult(pct) {
  const data = QZ.currentQuizData;
  const text = `I scored ${pct}% on "${data?.quiz?.title||'a quiz'}" on ToolHub AI! Can you beat me?\n${location.origin}/quiz/${data?.quiz?.id||''}`;
  if (navigator.share) navigator.share({ text }).catch(()=>{});
  else navigator.clipboard.writeText(text).then(() => toast('📤 Result copied!', 'success'));
}

async function toggleQuizLike(quizId) {
  if (!APP.session.loggedIn) { showLogin(); return; }
  try {
    const r = await apiFetch(`/api/quiz/${quizId}/like`, 'POST');
    toast(r.liked ? '❤️ Liked!' : '💔 Unliked', 'info');
  } catch(e) { toast('Login to like quizzes', 'warn'); }
}

// ── Quiz Builder ──────────────────────────────────────────────────────────────
function renderQuizBuilder(editId=null) {
  if (!APP.session.loggedIn) { showLogin(); toast('Sign in to create quizzes!','warn'); return; }
  document.title = (editId ? 'Edit' : 'Create') + ' Quiz — ToolHub AI';

  QZ.builderState = {
    editId,
    title: '', description: '', category: 'general',
    cover_emoji: '🧠', cover_color: '#6366f1',
    tags: '', time_limit: 30,
    wildcard_enabled: false,
    wildcard_config: { enabled: false, frequency:'rare', types:[] },
    questions: [],
    currentQIndex: 0,
    tab: 'questions', // 'questions' | 'wildcards' | 'settings'
  };

  if (editId) loadQuizForEdit(editId);
  else addBuilderQuestion();

  renderBuilderUI();
}

async function loadQuizForEdit(id) {
  try {
    const data = await apiFetch(`/api/quiz/${id}`);
    const bs = QZ.builderState;
    const q = data.quiz;
    bs.title = q.title; bs.description = q.description||'';
    bs.category = q.category; bs.cover_emoji = q.cover_emoji;
    bs.cover_color = q.cover_color; bs.tags = q.tags||'';
    bs.time_limit = q.time_limit||30;
    try { bs.wildcard_config = JSON.parse(q.wildcard_config||'{}'); } catch{}
    bs.wildcard_enabled = !!q.wildcard_enabled;
    bs.questions = data.playQuestions.map((pq, i) => ({
      ...pq, correct: data.answers[i]?.correct||0, explanation: data.answers[i]?.explanation||''
    }));
    renderBuilderUI();
  } catch(e) { toast('Failed to load quiz for editing','error'); }
}

function addBuilderQuestion(type='multiple_choice') {
  const bs = QZ.builderState;
  const newQ = {
    id: `q${Date.now()}`, type,
    text: '', image_url: '',
    options: type === 'true_false' ? ['True','False'] : ['','','',''],
    correct: 0, points: 100,
    time_limit: bs.time_limit || 30,
    explanation: ''
  };
  bs.questions.push(newQ);
  bs.currentQIndex = bs.questions.length - 1;
}

function renderBuilderUI() {
  const bs = QZ.builderState;
  const appEl = document.getElementById('app');

  appEl.innerHTML = `
<div class="qbuilder-wrap">
  <!-- Sidebar -->
  <div class="qbuilder-sidebar">
    <div class="qbuilder-sidebar-hdr">
      <button class="btn btn-ghost btn-sm" onclick="navigateQuiz('hub')">← Back</button>
      <div class="qbuilder-title-edit">
        <input type="text" class="qbuilder-title-input" placeholder="Quiz Title…" value="${escQ(bs.title)}"
               oninput="QZ.builderState.title=this.value">
      </div>
    </div>

    <!-- Tab switcher -->
    <div class="qbuilder-tabs">
      <button class="qbt ${bs.tab==='questions'?'active':''}" onclick="switchBuilderTab('questions')">❓ Questions</button>
      <button class="qbt ${bs.tab==='wildcards'?'active':''}" onclick="switchBuilderTab('wildcards')">⚡ Wildcards</button>
      <button class="qbt ${bs.tab==='settings'?'active':''}" onclick="switchBuilderTab('settings')">⚙️ Settings</button>
    </div>

    <div id="qbuilderSideContent">
      ${renderBuilderSideContent(bs)}
    </div>

    <!-- Actions -->
    <div class="qbuilder-actions">
      <button class="btn btn-ghost btn-sm" onclick="previewQuiz()">👁 Preview</button>
      <button class="btn btn-primary" onclick="saveQuiz()">
        ${bs.editId ? '💾 Update' : '🚀 Submit for Review'}
      </button>
    </div>
  </div>

  <!-- Main editor area -->
  <div class="qbuilder-main" id="qbuilderMain">
    ${bs.questions.length ? renderQuestionEditor(bs.questions[bs.currentQIndex], bs.currentQIndex) : `
      <div class="qbuilder-empty">
        <div style="font-size:56px">📝</div>
        <h3>No questions yet</h3>
        <p>Add your first question from the sidebar</p>
      </div>`}
  </div>
</div>`;
}

function renderBuilderSideContent(bs) {
  if (bs.tab === 'questions') {
    return `
<div class="qbuilder-q-list">
  ${bs.questions.map((q, i) => `
    <div class="qb-q-item ${i === bs.currentQIndex ? 'active' : ''}" onclick="selectBuilderQ(${i})">
      <span class="qb-q-num">${i+1}</span>
      <span class="qb-q-preview">${escQ((q.text||'New question').slice(0,35))||'New question'}</span>
      <button class="qb-q-del" onclick="event.stopPropagation();deleteBuilderQ(${i})" title="Delete">✕</button>
    </div>`).join('')}
  <div class="qb-add-btns">
    <button class="btn btn-ghost btn-sm qb-add-btn" onclick="addNewBuilderQ('multiple_choice')">＋ Multiple Choice</button>
    <button class="btn btn-ghost btn-sm qb-add-btn" onclick="addNewBuilderQ('true_false')">＋ True / False</button>
    <button class="btn btn-ghost btn-sm qb-add-btn" onclick="addNewBuilderQ('text_answer')">＋ Text Answer</button>
    <button class="btn btn-ghost btn-sm qb-add-btn" onclick="addNewBuilderQ('image_question')">＋ Image Question</button>
  </div>
</div>`;
  }

  if (bs.tab === 'wildcards') {
    return renderWildcardBuilderPanel(bs);
  }

  if (bs.tab === 'settings') {
    return `
<div style="padding:12px">
  <label class="qb-field-label">Description</label>
  <textarea class="qb-input" rows="3" placeholder="Describe your quiz…"
            oninput="QZ.builderState.description=this.value">${escQ(bs.description)}</textarea>

  <label class="qb-field-label">Category</label>
  <select class="qb-input" onchange="QZ.builderState.category=this.value">
    ${Object.entries(QUIZ_CATS).filter(([k])=>k!=='all').map(([k,v])=>`
      <option value="${k}" ${k===bs.category?'selected':''}>${v.emoji} ${v.name}</option>`).join('')}
  </select>

  <label class="qb-field-label">Cover Emoji</label>
  <input type="text" class="qb-input" maxlength="4" placeholder="🧠"
         value="${escQ(bs.cover_emoji)}" oninput="QZ.builderState.cover_emoji=this.value">

  <label class="qb-field-label">Cover Color</label>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    ${['#6366f1','#ef4444','#10b981','#f59e0b','#3b82f6','#ec4899','#0ea5e9','#8b5cf6','#14b8a6'].map(c=>`
      <div class="qb-color-swatch ${c===bs.cover_color?'selected':''}" style="background:${c}"
           onclick="QZ.builderState.cover_color='${c}';renderBuilderUI()"></div>`).join('')}
  </div>

  <label class="qb-field-label">Default Time / Question (s)</label>
  <input type="number" class="qb-input" min="5" max="120" value="${bs.time_limit}"
         oninput="QZ.builderState.time_limit=parseInt(this.value)||30">

  <label class="qb-field-label">Tags (comma-separated)</label>
  <input type="text" class="qb-input" placeholder="history, fun, trivia"
         value="${escQ(bs.tags)}" oninput="QZ.builderState.tags=this.value">
</div>`;
  }
  return '';
}

function renderWildcardBuilderPanel(bs) {
  const wc = bs.wildcard_config;
  return `
<div style="padding:12px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <div style="font-weight:700;font-size:15px">⚡ Wildcard Reality Shift</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Surprise gameplay events</div>
    </div>
    <label class="qb-toggle-wrap">
      <input type="checkbox" ${bs.wildcard_enabled?'checked':''} onchange="toggleWildcards(this.checked)">
      <span class="qb-toggle-slider"></span>
    </label>
  </div>

  ${bs.wildcard_enabled ? `
  <div class="wc-builder-section">
    <label class="qb-field-label">Frequency</label>
    <div class="wc-freq-btns">
      ${['rare','occasional','frequent'].map(f=>`
        <button class="wc-freq-btn ${(wc.frequency||'rare')===f?'active':''}"
                onclick="setWCFrequency('${f}')">
          ${f==='rare'?'🌟 Rare (~12%)':f==='occasional'?'⚡ Occasional (~22%)':'🔥 Frequent (~38%)'}
        </button>`).join('')}
    </div>

    <label class="qb-field-label" style="margin-top:14px">Wildcard Types</label>
    <div class="wc-type-list">
      ${Object.entries(WILDCARDS).map(([key, wcd]) => `
        <label class="wc-type-item">
          <input type="checkbox" ${(wc.types||[]).includes(key)?'checked':''}
                 onchange="toggleWCType('${key}',this.checked)">
          <span class="wc-type-icon" style="color:${wcd.color}">${wcd.icon}</span>
          <span class="wc-type-info">
            <span class="wc-type-name">${wcd.name}</span>
            <span class="wc-type-desc">${wcd.desc}</span>
          </span>
        </label>`).join('')}
    </div>
  </div>` : `
  <div class="wc-disabled-msg">
    <span style="font-size:32px">⚡</span>
    <p>Enable Wildcards to add surprise gameplay twists to your quiz!</p>
  </div>`}
</div>`;
}

function renderQuestionEditor(q, index) {
  const isImgQ = q.type === 'image_question' || q.image_url;
  return `
<div class="qb-editor">
  <div class="qb-editor-hdr">
    <span class="qb-editor-qnum">Question ${index + 1}</span>
    <select class="qb-type-select" onchange="changeQType(${index},this.value)">
      <option value="multiple_choice" ${q.type==='multiple_choice'?'selected':''}>Multiple Choice</option>
      <option value="true_false"      ${q.type==='true_false'?'selected':''}>True / False</option>
      <option value="text_answer"     ${q.type==='text_answer'?'selected':''}>Text Answer</option>
      <option value="image_question"  ${q.type==='image_question'||isImgQ?'selected':''}>Image Question</option>
    </select>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
      <label style="font-size:12px">⏱ <input type="number" min="5" max="120" value="${q.time_limit||30}" style="width:50px;border:1px solid var(--border);border-radius:4px;padding:2px 4px;background:var(--bg);color:var(--text)" oninput="updateQ(${index},'time_limit',parseInt(this.value)||30)">s</label>
      <label style="font-size:12px">⭐ <input type="number" min="50" max="500" step="50" value="${q.points||100}" style="width:55px;border:1px solid var(--border);border-radius:4px;padding:2px 4px;background:var(--bg);color:var(--text)" oninput="updateQ(${index},'points',parseInt(this.value)||100)">pts</label>
    </div>
  </div>

  <!-- Question Text -->
  <textarea class="qb-q-text" placeholder="Type your question here…" rows="3"
            oninput="updateQ(${index},'text',this.value)">${escQ(q.text)}</textarea>

  <!-- Image upload -->
  ${isImgQ || q.type==='image_question' ? `
  <div class="qb-img-area">
    ${q.image_url ? `<img src="${q.image_url}" class="qb-img-preview" alt="Question image">` : ''}
    <label class="qb-img-upload-btn">
      📎 ${q.image_url ? 'Change Image' : 'Add Image'}
      <input type="file" accept="image/*" style="display:none" onchange="uploadQImage(${index},this)">
    </label>
    ${q.image_url ? `<button class="btn btn-ghost btn-sm" onclick="updateQ(${index},'image_url','');renderBuilderUI()">Remove</button>` : ''}
  </div>` : ''}

  <!-- Options -->
  <div class="qb-options-section">
    <div class="qb-opts-label">Answer Options <span style="font-size:12px;color:var(--text-muted)">(click radio to set correct answer)</span></div>
    ${q.type === 'true_false' ? `
      ${['True','False'].map((opt, i) => `
        <div class="qb-opt-row ${q.correct===i?'correct':''}">
          <input type="radio" name="correctAns${index}" ${q.correct===i?'checked':''} onchange="updateQ(${index},'correct',${i})">
          <span class="qb-opt-letter">${'AB'[i]}</span>
          <input class="qb-opt-input" type="text" value="${opt}" disabled>
          ${q.correct===i?'<span class="qb-correct-badge">✓ Correct</span>':''}
        </div>`).join('')}` : `
      ${(q.options||['','','','']).map((opt, i) => `
        <div class="qb-opt-row ${q.correct===i?'correct':''}">
          <input type="radio" name="correctAns${index}" ${q.correct===i?'checked':''} onchange="updateQ(${index},'correct',${i})">
          <span class="qb-opt-letter">${'ABCD'[i]}</span>
          <input class="qb-opt-input" type="text" placeholder="Option ${i+1}…" value="${escQ(opt)}"
                 oninput="updateQOption(${index},${i},this.value)">
          ${q.correct===i?'<span class="qb-correct-badge">✓</span>':''}
          ${q.type==='multiple_choice'&&(q.options||[]).length>2?`<button class="qb-rm-opt" onclick="removeOption(${index},${i})">✕</button>`:''}
        </div>`).join('')}
      ${q.type==='multiple_choice'&&(q.options||[]).length<6?`
        <button class="btn btn-ghost btn-sm qb-add-opt" onclick="addOption(${index})">＋ Add Option</button>`:''}`}
  </div>

  <!-- Explanation -->
  <div style="margin-top:16px">
    <label class="qb-field-label">Explanation (shown after answer) <span style="color:var(--text-muted)">(optional)</span></label>
    <textarea class="qb-input" rows="2" placeholder="Why is this the correct answer?…"
              oninput="updateQ(${index},'explanation',this.value)">${escQ(q.explanation||'')}</textarea>
  </div>
</div>`;
}

// Builder helpers
function selectBuilderQ(i) {
  QZ.builderState.currentQIndex = i;
  const main = document.getElementById('qbuilderMain');
  if (main) main.innerHTML = renderQuestionEditor(QZ.builderState.questions[i], i);
  document.querySelectorAll('.qb-q-item').forEach((el,j) => el.classList.toggle('active', j===i));
}

function addNewBuilderQ(type) {
  addBuilderQuestion(type);
  renderBuilderUI();
}

function deleteBuilderQ(i) {
  const bs = QZ.builderState;
  if (bs.questions.length <= 1) { toast('Need at least 1 question','warn'); return; }
  bs.questions.splice(i, 1);
  bs.currentQIndex = Math.min(bs.currentQIndex, bs.questions.length-1);
  renderBuilderUI();
}

function switchBuilderTab(tab) {
  QZ.builderState.tab = tab;
  const side = document.getElementById('qbuilderSideContent');
  if (side) side.innerHTML = renderBuilderSideContent(QZ.builderState);
  document.querySelectorAll('.qbt').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(tab.split('s')[0])));
}

function updateQ(index, field, value) {
  if (QZ.builderState.questions[index]) QZ.builderState.questions[index][field] = value;
}

function updateQOption(index, optIndex, value) {
  const q = QZ.builderState.questions[index];
  if (q) { const opts = [...(q.options||[])]; opts[optIndex] = value; q.options = opts; }
}

function addOption(index) {
  const q = QZ.builderState.questions[index];
  if (q && q.options.length < 6) { q.options.push(''); renderBuilderUI(); }
}

function removeOption(index, optIndex) {
  const q = QZ.builderState.questions[index];
  if (q && q.options.length > 2) {
    q.options.splice(optIndex, 1);
    if (q.correct >= q.options.length) q.correct = 0;
    renderBuilderUI();
  }
}

function changeQType(index, type) {
  const q = QZ.builderState.questions[index];
  q.type = type;
  if (type === 'true_false') q.options = ['True','False'];
  else if (type === 'text_answer') q.options = [''];
  else if (!q.options || q.options.length < 2) q.options = ['','','',''];
  q.correct = 0;
  renderBuilderUI();
}

function uploadQImage(index, input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 400000) { toast('Image too large (max 400KB)','warn'); return; }
  const reader = new FileReader();
  reader.onload = e => { updateQ(index,'image_url', e.target.result); renderBuilderUI(); };
  reader.readAsDataURL(file);
}

function toggleWildcards(enabled) {
  QZ.builderState.wildcard_enabled = enabled;
  QZ.builderState.wildcard_config.enabled = enabled;
  const side = document.getElementById('qbuilderSideContent');
  if (side) side.innerHTML = renderBuilderSideContent(QZ.builderState);
}

function setWCFrequency(freq) {
  QZ.builderState.wildcard_config.frequency = freq;
  const side = document.getElementById('qbuilderSideContent');
  if (side) side.innerHTML = renderBuilderSideContent(QZ.builderState);
}

function toggleWCType(key, enabled) {
  const wc = QZ.builderState.wildcard_config;
  if (!wc.types) wc.types = [];
  if (enabled) { if (!wc.types.includes(key)) wc.types.push(key); }
  else wc.types = wc.types.filter(t => t !== key);
}

function previewQuiz() {
  const bs = QZ.builderState;
  if (!bs.questions.length || !bs.questions[0].text) { toast('Add at least 1 question with text','warn'); return; }
  // Simulate quiz start with builder data
  QZ.currentQuizData = {
    quiz: {
      id:'preview', title: bs.title||'Preview', description: bs.description,
      category: bs.category, cover_emoji: bs.cover_emoji, cover_color: bs.cover_color,
      plays:0, likes:0, questions_count: bs.questions.length,
      wildcard_enabled: bs.wildcard_enabled, wildcard_config: JSON.stringify(bs.wildcard_config),
      time_limit: bs.time_limit, creator_name: APP.session.name
    },
    playQuestions: bs.questions,
    answers: bs.questions.map(q => ({ id:q.id, correct:q.correct, explanation:q.explanation||'' })),
    leaderboard:[]
  };
  startQuizGame();
}

async function saveQuiz() {
  const bs = QZ.builderState;
  if (!bs.title.trim()) { toast('Please add a quiz title','warn'); switchBuilderTab('settings'); return; }
  if (!bs.questions.length) { toast('Add at least 1 question','warn'); return; }
  if (bs.questions.some(q => !q.text.trim())) { toast('All questions need text','warn'); return; }
  if (bs.questions.some(q => q.type!=='text_answer' && (q.options||[]).some(o => !String(o).trim()))) {
    toast('All answer options need text','warn'); return;
  }

  const btn = document.querySelector('.qbuilder-actions .btn-primary');
  if (btn) { btn.disabled=true; btn.textContent='Saving…'; }

  try {
    const payload = {
      title: bs.title, description: bs.description, category: bs.category,
      questions: bs.questions, wildcard_enabled: bs.wildcard_enabled,
      wildcard_config: bs.wildcard_config, cover_emoji: bs.cover_emoji,
      cover_color: bs.cover_color, tags: bs.tags, time_limit: bs.time_limit
    };
    if (bs.editId) {
      await apiFetch(`/api/quiz/${bs.editId}`, 'PUT', payload);
      toast('✅ Quiz updated — pending re-approval','success', 4000);
    } else {
      const r = await apiFetch('/api/quiz/create', 'POST', payload);
      toast('🚀 Quiz submitted for admin review!','success', 4000);
    }
    setTimeout(() => navigateQuiz('profile'), 1500);
  } catch(e) {
    toast('Failed: ' + e.message, 'error');
    if (btn) { btn.disabled=false; btn.textContent=bs.editId?'💾 Update':'🚀 Submit for Review'; }
  }
}

// ── Profile Page ──────────────────────────────────────────────────────────────
async function renderQuizProfile() {
  if (!APP.session.loggedIn) { showLogin(); return; }
  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  document.title = 'My Quiz Profile — ToolHub AI';

  try {
    const d = await apiFetch('/api/quiz/profile');

    appEl.innerHTML = `
<div class="qprofile-wrap">
  <button class="quiz-back-btn" onclick="navigateQuiz('hub')">← Quiz Hub</button>

  <!-- Profile Card -->
  <div class="qprofile-card">
    <div class="qprofile-3d-area" id="profile3dArea">
      <canvas id="profile3dCanvas" width="180" height="180"></canvas>
    </div>
    <div class="qprofile-info">
      <div class="qprofile-avatar" style="background:${APP.session.avatarColor||'#6366f1'}">
        ${(APP.session.name||'?').slice(0,2).toUpperCase()}
      </div>
      <div>
        <div class="qprofile-name">${escQ(APP.session.name)}</div>
        <div class="qprofile-email">${escQ(APP.session.email)}</div>
        <div class="qprofile-bio" id="profileBioDisplay">${escQ(d.profile?.bio||'No bio yet — add one below!')}</div>
      </div>
    </div>
    <div class="qprofile-stats">
      <div class="qps-stat"><span>${d.stats?.plays||0}</span>Plays</div>
      <div class="qps-stat"><span>${d.myQuizzes?.length||0}</span>Quizzes</div>
      <div class="qps-stat"><span>${d.stats?.best||0}%</span>Best Score</div>
    </div>
  </div>

  <!-- Edit profile -->
  <div class="qprofile-edit">
    <div class="qp-edit-hdr">✏️ Customize Profile</div>
    <label class="qb-field-label">Bio</label>
    <textarea class="qb-input" id="profileBioInput" rows="2" maxlength="200" placeholder="Tell people about yourself…">${escQ(d.profile?.bio||'')}</textarea>
    <label class="qb-field-label">3D Showcase Object</label>
    <div class="qp-3d-selector">
      ${['globe','cube','star','donut','diamond','youtube','none'].map(obj=>`
        <button class="qp-3d-opt ${(d.profile?.display_3d||'globe')===obj?'active':''}"
                onclick="selectProfile3D('${obj}',this)">
          ${obj==='globe'?'🌐':obj==='cube'?'🟥':obj==='star'?'⭐':obj==='donut'?'⭕':obj==='diamond'?'💎':obj==='youtube'?'▶️':'❌'} ${obj}
        </button>`).join('')}
    </div>
    <button class="btn btn-primary btn-sm" onclick="saveQuizProfile()">Save Profile</button>
  </div>

  <!-- My Quizzes -->
  <div class="qprofile-quizzes">
    <div class="qp-section-hdr">
      <h3>My Quizzes</h3>
      <button class="btn btn-primary btn-sm" onclick="navigateQuiz('build')">＋ New Quiz</button>
    </div>
    ${d.myQuizzes && d.myQuizzes.length ? `
      <div class="qp-quiz-list">
        ${d.myQuizzes.map(q => `
          <div class="qp-quiz-row">
            <div class="qp-quiz-cover" style="background:${q.cover_color||'#6366f1'}">${q.cover_emoji||'🧠'}</div>
            <div class="qp-quiz-info">
              <div class="qp-quiz-title">${escQ(q.title)}</div>
              <div class="qp-quiz-meta">
                <span class="qp-status-badge ${q.status}">${q.status==='approved'?'✅ Live':q.status==='pending'?'⏳ Pending Review':'❌ '+q.status}</span>
                <span>❓ ${q.questions_count}Qs</span>
                <span>▶ ${q.plays||0}</span>
                ${q.reject_reason ? `<span style="color:var(--red);font-size:11px">Reason: ${escQ(q.reject_reason)}</span>` : ''}
              </div>
            </div>
            <div class="qp-quiz-actions">
              ${q.status==='approved'?`<button class="btn btn-ghost btn-sm" onclick="navigateQuiz('play','${q.id}')">▶ Play</button>`:''}
              <button class="btn btn-ghost btn-sm" onclick="navigateQuiz('build','${q.id}')">✏️ Edit</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteMyQuiz('${q.id}','${escQ(q.title).replace(/'/g,"\\'")}')">🗑️</button>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="qhub-empty" style="padding:40px 20px">
        <div style="font-size:48px">📝</div>
        <p>You haven't created any quizzes yet</p>
        <button class="btn btn-primary" onclick="navigateQuiz('build')">Create your first quiz</button>
      </div>`}
  </div>
</div>`;

    // Init 3D showcase pedestal
    const obj3d = d.profile?.display_3d || 'globe';
    window._profileSelected3D = obj3d;

    // Fetch badges
    let badges = [];
    try { const br = await apiFetch('/api/quiz/badges'); badges = br.badges || []; } catch {}

    // Inject badges section & studio button into profile
    const profileWrap = appEl.querySelector('.qprofile-wrap');
    if (profileWrap) {
      // Badges section
      const badgeSection = document.createElement('div');
      badgeSection.className = 'qprofile-edit';
      badgeSection.innerHTML = `
<div class="qp-edit-hdr">🏅 Your Badges</div>
${renderBadgesSVG(badges)}`;
      profileWrap.insertBefore(badgeSection, profileWrap.querySelector('.qprofile-quizzes'));

      // Studio button
      const studioBtn = document.createElement('button');
      studioBtn.className = 'btn btn-primary';
      studioBtn.style.cssText = 'margin-bottom:16px;width:100%;';
      studioBtn.innerHTML = '🎬 Open Creator Studio →';
      studioBtn.onclick = () => renderCreatorStudio();
      profileWrap.insertBefore(studioBtn, badgeSection);
    }

    if (obj3d !== 'none') {
      setTimeout(() => initShowcasePedestal('profile3dCanvas', obj3d), 100);
    }

  } catch(e) {
    appEl.innerHTML = `<div style="padding:40px;text-align:center"><p>Failed to load profile</p><button class="btn btn-primary" onclick="renderQuizProfile()">Retry</button></div>`;
  }
}

function selectProfile3D(obj, btn) {
  window._profileSelected3D = obj;
  document.querySelectorAll('.qp-3d-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  destroyQuizThree();
  if (obj !== 'none') {
    setTimeout(() => initShowcasePedestal('profile3dCanvas', obj), 50);
  } else {
    const canvas = document.getElementById('profile3dCanvas');
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
}

async function saveQuizProfile() {
  const bio = document.getElementById('profileBioInput')?.value || '';
  const display_3d = window._profileSelected3D || 'globe';
  try {
    await apiFetch('/api/quiz/profile', 'PUT', { bio, display_3d });
    toast('✅ Profile saved!', 'success');
    const bio_disp = document.getElementById('profileBioDisplay');
    if (bio_disp) bio_disp.textContent = bio || 'No bio yet';
  } catch(e) {
    toast('Failed to save profile', 'error');
  }
}

async function deleteMyQuiz(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/quiz/${id}`, 'DELETE');
    toast('Quiz deleted', 'success');
    renderQuizProfile();
  } catch(e) { toast('Failed to delete','error'); }
}

// ── Admin Quiz Panel ──────────────────────────────────────────────────────────
async function renderAdminQuizPanel() {
  if (APP.session.role !== 'admin') { toast('Admin only','error'); return; }
  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  document.title = 'Quiz Admin — ToolHub AI';

  try {
    const data = await apiFetch('/api/quiz/admin/pending');

    appEl.innerHTML = `
<div class="qadmin-wrap">
  <div class="qadmin-header">
    <button class="quiz-back-btn" onclick="navigateQuiz('hub')">← Quiz Hub</button>
    <h2>🛡️ Quiz Moderation</h2>
    <div class="qadmin-stats">
      ${(data.stats||[]).map(s=>`<span class="qadmin-stat-pill ${s.status}">${s.status}: <strong>${s.count}</strong></span>`).join('')}
    </div>
  </div>

  ${!data.quizzes || !data.quizzes.length ? `
    <div style="text-align:center;padding:60px">
      <div style="font-size:48px">✅</div>
      <h3>All clear!</h3>
      <p>No quizzes pending review.</p>
    </div>` : `
  <div class="qadmin-list">
    ${data.quizzes.map(q => `
      <div class="qadmin-row" id="qar-${q.id}">
        <div class="qadmin-quiz-info">
          <div class="qadmin-quiz-title">${escQ(q.title)}</div>
          <div class="qadmin-quiz-meta">
            <span>${QUIZ_CATS[q.category]?.emoji||'🌐'} ${q.category}</span>
            <span>❓ ${q.questions_count} Questions</span>
            <span>👤 ${escQ(q.creator_name)}</span>
            <span>${q.wildcard_enabled?'⚡ Wildcards':''}</span>
            <span style="color:var(--text-muted);font-size:11px">${new Date(q.created_at).toLocaleDateString()}</span>
          </div>
          <div class="qadmin-quiz-desc">${escQ((q.description||'').slice(0,100))}</div>
          ${q.status==='rejected'?`<div style="color:var(--red);font-size:12px">❌ Reject reason: ${escQ(q.reject_reason)}</div>`:''}
        </div>
        <div class="qadmin-actions">
          <button class="btn btn-ghost btn-sm" onclick="adminPreviewQuiz('${q.id}')">👁 Preview</button>
          <button class="btn btn-primary btn-sm" onclick="adminApprove('${q.id}')">✅ Approve</button>
          <button class="btn btn-sm" style="background:var(--red);color:#fff" onclick="adminReject('${q.id}')">❌ Reject</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="adminDeleteQuiz('${q.id}')">🗑️</button>
        </div>
      </div>`).join('')}
  </div>`}
</div>`;

  } catch(e) {
    appEl.innerHTML = `<p style="padding:40px;text-align:center">Failed to load quiz admin panel</p>`;
  }
}

async function adminApprove(id) {
  try {
    await apiFetch(`/api/quiz/admin/${id}/approve`, 'POST');
    toast('✅ Quiz approved and live!', 'success');
    document.getElementById(`qar-${id}`)?.remove();
  } catch(e) { toast('Failed','error'); }
}

async function adminReject(id) {
  const reason = prompt('Rejection reason (optional):') || 'Does not meet guidelines';
  try {
    await apiFetch(`/api/quiz/admin/${id}/reject`, 'POST', { reason });
    toast('Quiz rejected', 'warn');
    document.getElementById(`qar-${id}`)?.style && (document.getElementById(`qar-${id}`).style.opacity='0.4');
  } catch(e) { toast('Failed','error'); }
}

async function adminDeleteQuiz(id) {
  if (!confirm('Permanently delete this quiz?')) return;
  try {
    await apiFetch(`/api/quiz/admin/${id}`, 'DELETE');
    toast('Deleted','success');
    document.getElementById(`qar-${id}`)?.remove();
  } catch(e) { toast('Failed','error'); }
}

async function adminPreviewQuiz(id) {
  // Open in new tab
  window.open(`/quiz/${id}`, '_blank');
}

// ── Three.js 3D Rendering ─────────────────────────────────────────────────────
function destroyQuizThree() {
  QZ.threeInstances.forEach(inst => {
    if (inst && inst.cancel) inst.cancel();
  });
  QZ.threeInstances = [];
}

function initQuizHero3D(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.parentElement?.offsetWidth || 800, canvas.parentElement?.offsetHeight || 420);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, (canvas.parentElement?.offsetWidth||800)/(canvas.parentElement?.offsetHeight||420), 0.1, 100);
  camera.position.z = 4;

  // Multiple floating objects
  const objects = [];
  const geoms = [
    new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.OctahedronGeometry(0.25, 0),
    new THREE.TorusGeometry(0.2, 0.08, 8, 16),
    new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.SphereGeometry(0.2, 8, 8),
  ];
  const colors = [0x6366f1, 0x10b981, 0xf59e0b, 0xef4444, 0x0ea5e9, 0x8b5cf6, 0xec4899];

  for (let i = 0; i < 12; i++) {
    const geo  = geoms[i % geoms.length];
    const mat  = new THREE.MeshBasicMaterial({ color: colors[i%colors.length], wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Math.random()-0.5)*6, (Math.random()-0.5)*3, (Math.random()-0.5)*2);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    mesh._vx = (Math.random()-0.5)*0.003;
    mesh._vy = (Math.random()-0.5)*0.003;
    mesh._rx = (Math.random()-0.5)*0.02;
    mesh._ry = (Math.random()-0.5)*0.02;
    scene.add(mesh);
    objects.push(mesh);
  }

  let cancelled = false;
  function animate() {
    if (cancelled) return;
    requestAnimationFrame(animate);
    objects.forEach(m => {
      m.rotation.x += m._rx; m.rotation.y += m._ry;
      m.position.x += m._vx; m.position.y += m._vy;
      if (Math.abs(m.position.x) > 4) m._vx *= -1;
      if (Math.abs(m.position.y) > 2) m._vy *= -1;
    });
    renderer.render(scene, camera);
  }
  animate();
  QZ.threeInstances.push({ cancel: () => { cancelled = true; renderer.dispose(); } });
}

function initProfile3D(canvasId, objectType) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) {
    // Fallback emoji
    const parent = canvas?.parentElement;
    if (parent) parent.innerHTML = `<div style="font-size:80px;display:flex;align-items:center;justify-content:center;height:180px">
      ${objectType==='globe'?'🌐':objectType==='cube'?'🟥':objectType==='star'?'⭐':objectType==='donut'?'⭕':'💎'}
    </div>`;
    return;
  }

  destroyQuizThree();

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(180, 180);
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;

  let mesh;
  const mat = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true });
  switch(objectType) {
    case 'globe':  mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat); break;
    case 'cube':   mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4), mat); break;
    case 'star':   mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), mat); break;
    case 'donut':  mesh = new THREE.Mesh(new THREE.TorusGeometry(0.8,0.3,12,32), mat); break;
    case 'diamond':mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), mat); break;
    default: return;
  }
  scene.add(mesh);
  // Glow ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4,0.02,8,64), new THREE.MeshBasicMaterial({color:0x6366f1}));
  ring.rotation.x = Math.PI/2;
  scene.add(ring);

  let cancelled = false;
  function animate() {
    if (cancelled) return;
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.012;
    mesh.rotation.x += 0.004;
    ring.rotation.z += 0.008;
    renderer.render(scene, camera);
  }
  animate();
  QZ.threeInstances.push({ cancel: () => { cancelled=true; renderer.dispose(); } });
}

function initInteractiveObject(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(300, 300);
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3.5;

  const geom = new THREE.IcosahedronGeometry(1.2, 1);
  const mat  = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true });
  const mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);

  const outerMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
  const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), outerMat);
  scene.add(outer);

  let isDragging = false, prevX = 0, prevY = 0;
  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  canvas.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('touchend', () => isDragging = false);
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    mesh.rotation.y += (e.clientX - prevX) * 0.01;
    mesh.rotation.x += (e.clientY - prevY) * 0.01;
    prevX = e.clientX; prevY = e.clientY;
  });

  let cancelled = false;
  function animate() {
    if (cancelled) return;
    requestAnimationFrame(animate);
    if (!isDragging) { mesh.rotation.y += 0.01; }
    outer.rotation.x += 0.005; outer.rotation.y -= 0.008;
    renderer.render(scene, camera);
  }
  animate();
  QZ.threeInstances.push({ cancel: () => { cancelled=true; renderer.dispose(); } });
}

// ── Helper ────────────────────────────────────────────────────────────────────
function escQ(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let _debounceQuizSearch;
window.debounceQuizSearch = (val) => {
  clearTimeout(_debounceQuizSearch);
  _debounceQuizSearch = setTimeout(() => {
    renderQuizHub({ search: val });
  }, 380);
};
