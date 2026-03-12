/* ── ToolHub AI — quiz-engine.js — Engagement Engine v2 ─────────────────── */
'use strict';

// ══════════════════════════════════════════════════════════════════════════════
// BETTING MECHANIC
// Before every question divisible by 4 (NOT a boss), show wager UI
// ══════════════════════════════════════════════════════════════════════════════
function shouldShowBet(index, ps) {
  // Show bet before questions 3,7,11... (every 4th, skip boss battles)
  return ps.score > 0 && index > 0 && index % 4 === 3 && !isBossQuestion(index, ps);
}

function renderBetScreen(onComplete) {
  const ps = QZ.playerState;
  if (!ps) return;
  const maxBet = Math.min(ps.score, ps.questions[ps.currentIndex]?.points || 100);

  const appEl = document.getElementById('app');
  appEl.innerHTML = `
<div class="bet-screen-wrap" id="betScreen">
  <div class="bet-screen-inner">
    <div class="bet-icon">🎰</div>
    <div class="bet-title">Place Your Wager!</div>
    <div class="bet-subtitle">You have <strong>${ps.score.toLocaleString()}</strong> points.<br>How much do you want to risk?</div>
    <div class="bet-slider-wrap">
      <input type="range" class="bet-slider" id="betSlider" min="0" max="${maxBet}" value="${Math.floor(maxBet/2)}" 
             oninput="document.getElementById('betAmt').textContent=this.value">
      <div class="bet-amount"><span id="betAmt">${Math.floor(maxBet/2)}</span> points wagered</div>
    </div>
    <div class="bet-presets">
      <button class="bet-preset" onclick="setBet(0)">Skip Bet</button>
      <button class="bet-preset bet-quarter" onclick="setBet(${Math.floor(maxBet/4)})">¼ All-In</button>
      <button class="bet-preset bet-half" onclick="setBet(${Math.floor(maxBet/2)})">½ All-In</button>
      <button class="bet-preset bet-all" onclick="setBet(${maxBet})">🔥 ALL-IN</button>
    </div>
    <div class="bet-hint">Answer correctly → <strong>+wager bonus</strong>. Wrong → lose wager!</div>
    <button class="btn btn-primary btn-lg bet-confirm" onclick="confirmBet()">Let's Go! ➡</button>
  </div>
</div>`;

  ps._betAmount = Math.floor(maxBet / 2);
}

function setBet(amount) {
  QZ.playerState._betAmount = amount;
  const slider = document.getElementById('betSlider');
  const amtEl  = document.getElementById('betAmt');
  if (slider) slider.value = amount;
  if (amtEl)  amtEl.textContent = amount;
  // Highlight active preset
  document.querySelectorAll('.bet-preset').forEach(b => b.classList.remove('active'));
}

function confirmBet() {
  // Store bet, proceed to question
  const slider = document.getElementById('betSlider');
  if (slider) QZ.playerState._betAmount = parseInt(slider.value) || 0;
  renderCurrentQuestion();
}

// ══════════════════════════════════════════════════════════════════════════════
// BOSS BATTLE SYSTEM
// Every 5th question (index 4,9,14...) is a Boss
// ══════════════════════════════════════════════════════════════════════════════
function isBossQuestion(index, ps) {
  if (!ps) return false;
  const q = ps.questions[index];
  // Explicit boss flag OR every 5th question
  return q?.isBoss || (index > 0 && (index + 1) % 5 === 0);
}

function getBossData(index) {
  const bosses = [
    { name: 'The Knowledge Titan', color: '#dc2626', emoji: '🔥', timeMultiplier: 0.6 },
    { name: 'Mind Shredder',       color: '#7c3aed', emoji: '💀', timeMultiplier: 0.5 },
    { name: 'The Final Algorithm', color: '#0f172a', emoji: '⚡', timeMultiplier: 0.4 },
    { name: 'Chaos Engine',        color: '#c2410c', emoji: '🌋', timeMultiplier: 0.55 },
    { name: 'Play Button God',     color: '#cc0000', emoji: '▶️', timeMultiplier: 0.5 },
  ];
  return bosses[Math.floor(index / 5) % bosses.length];
}

function showBossIntro(bossData, onComplete) {
  const overlay = document.getElementById('wcOverlay');
  if (!overlay) { onComplete(); return; }
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
<div class="boss-intro-wrap">
  <div class="boss-warning-bar">⚠️ BOSS BATTLE ⚠️</div>
  <canvas id="bossCanvas3D" width="200" height="200" class="boss-3d-canvas"></canvas>
  <div class="boss-name" style="color:${bossData.color}">${bossData.emoji} ${bossData.name}</div>
  <div class="boss-subtitle">The timer is shorter. Points are doubled. Survive!</div>
  <div class="boss-hp-bar-wrap">
    <div class="boss-hp-label">BOSS HP</div>
    <div class="boss-hp-bar"><div class="boss-hp-fill" id="bossHpFill"></div></div>
  </div>
</div>`;

  // Animate HP drain
  setTimeout(() => {
    const fill = document.getElementById('bossHpFill');
    if (fill) fill.style.width = '100%';
  }, 100);

  // Init 3D boss object
  setTimeout(() => initBoss3D('bossCanvas3D', bossData.color), 100);

  // Play boss music feel (flash the overlay)
  let flashCount = 0;
  const flashInterval = setInterval(() => {
    overlay.style.background = flashCount % 2 === 0
      ? 'rgba(0,0,0,.85)' : `rgba(${bossData.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.25)`;
    flashCount++;
    if (flashCount > 6) clearInterval(flashInterval);
  }, 200);

  setTimeout(() => {
    clearInterval(flashInterval);
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    onComplete();
  }, 3500);
}

function initBoss3D(canvasId, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(200, 200);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3.5;
  const c = parseInt(color.replace('#', ''), 16);
  const mat = new THREE.MeshBasicMaterial({ color: c, wireframe: true });
  const geom = new THREE.IcosahedronGeometry(1.2, 1);
  const mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.05, 8, 64),
    new THREE.MeshBasicMaterial({ color: c })
  );
  scene.add(ring);
  let cancelled = false;
  function animate() {
    if (cancelled) return;
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.025;
    mesh.rotation.x += 0.01;
    ring.rotation.z += 0.015;
    renderer.render(scene, camera);
  }
  animate();
  QZ.threeInstances.push({ cancel: () => { cancelled = true; renderer.dispose(); } });
}

// ══════════════════════════════════════════════════════════════════════════════
// STREAK & VISUAL EVOLUTION
// ══════════════════════════════════════════════════════════════════════════════
const STREAK_THEMES = {
  space:    { base: 'wc-theme-space',    intense: 'theme-space-intense',    particle: '⭐' },
  cyberpunk:{ base: 'wc-theme-cyberpunk',intense: 'theme-cyber-intense',    particle: '⚡' },
  ocean:    { base: 'wc-theme-ocean',    intense: 'theme-ocean-intense',    particle: '💧' },
  fire:     { base: 'wc-theme-fire',     intense: 'theme-fire-intense',     particle: '🔥' },
  forest:   { base: 'wc-theme-forest',   intense: 'theme-forest-intense',   particle: '🌿' },
};

function applyStreakEffect(streak) {
  const wrap = document.getElementById('quizPlayerWrap');
  if (!wrap) return;

  // Remove all streak classes
  wrap.classList.remove('streak-active','streak-intense','streak-max');

  if (streak >= 3)  wrap.classList.add('streak-active');
  if (streak >= 5)  wrap.classList.add('streak-intense');
  if (streak >= 8)  wrap.classList.add('streak-max');

  // Particle burst
  if (streak >= 3) spawnStreakParticles(streak);

  // Update streak indicator
  let streakEl = document.getElementById('streakIndicator');
  if (!streakEl) {
    streakEl = document.createElement('div');
    streakEl.id = 'streakIndicator';
    streakEl.className = 'streak-indicator';
    wrap.querySelector('.qp-header')?.appendChild(streakEl);
  }
  if (streak >= 2) {
    streakEl.innerHTML = `🔥 ${streak} Streak!`;
    streakEl.className = `streak-indicator ${streak >= 5 ? 'streak-indicator-hot' : ''}`;
    streakEl.style.display = 'block';
  } else {
    streakEl.style.display = 'none';
  }
}

function spawnStreakParticles(count) {
  const wrap = document.getElementById('quizPlayerWrap');
  if (!wrap) return;
  const particles = ['⭐','🔥','💫','✨','⚡'];
  for (let i = 0; i < Math.min(count, 8); i++) {
    const p = document.createElement('div');
    p.className = 'streak-particle';
    p.textContent = particles[i % particles.length];
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = (i * 0.1) + 's';
    wrap.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEATMAP / IMAGE CLICK QUESTIONS
// ══════════════════════════════════════════════════════════════════════════════
function renderHeatmapQuestion(q, index) {
  // For heatmap questions, we use the options as multiple-choice fallback
  // (full heatmap canvas requires server-side image processing)
  return `
<div class="heatmap-q-wrap">
  <div class="heatmap-hint">🔍 Examine the image carefully, then select your answer below</div>
  ${q.image_url ? `<div class="heatmap-img-wrap">
    <img src="${q.image_url}" class="heatmap-img" alt="Question image" id="heatmapImg">
    <div class="heatmap-overlay" id="heatmapOverlay"></div>
  </div>` : ''}
  <div class="heatmap-opts">
    ${(q.options||[]).map((opt,i) => `
      <button class="heatmap-opt" onclick="selectAnswer(${i})" data-idx="${i}">
        <span class="heatmap-opt-letter">${'ABCD'[i]}</span>
        <span>${escQ(opt)}</span>
      </button>`).join('')}
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MEME-IFY FILTER
// ══════════════════════════════════════════════════════════════════════════════
const MEME_SOUNDS = {
  airhorn: () => playBeep(880, 0.3, 0.5, 'square'),
  sad:     () => { playBeep(440,0.2,0.2,'sine'); setTimeout(()=>playBeep(330,0.2,0.3,'sine'),200); },
  wow:     () => { for(let i=0;i<5;i++) setTimeout(()=>playBeep(660+i*50,0.1,0.1,'triangle'),i*80); },
  bruh:    () => playBeep(220, 0.4, 0.6, 'sawtooth'),
  gg:      () => { playBeep(880,0.1,0.08,'sine'); setTimeout(()=>playBeep(1100,0.1,0.08,'sine'),100); setTimeout(()=>playBeep(1320,0.15,0.2,'sine'),200); },
};

function playBeep(freq, vol, duration, type='sine') {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function toggleMemeify() {
  const ps = QZ.playerState;
  if (!ps) return;
  ps.memeifyOn = !ps.memeifyOn;
  const btn = document.getElementById('memeifyToggle');
  if (btn) btn.classList.toggle('active', ps.memeifyOn);

  // Add/remove memeify panel
  const existing = document.getElementById('memePanel');
  if (ps.memeifyOn && !existing) {
    const panel = document.createElement('div');
    panel.id = 'memePanel';
    panel.className = 'meme-panel';
    panel.innerHTML = `
<div class="meme-panel-title">🎭 Meme-ify</div>
<div class="meme-btns">
  <button class="meme-btn" onclick="MEME_SOUNDS.airhorn()" title="Air Horn">📯</button>
  <button class="meme-btn" onclick="MEME_SOUNDS.wow()" title="Wow">🤩</button>
  <button class="meme-btn" onclick="MEME_SOUNDS.sad()" title="Sad">😢</button>
  <button class="meme-btn" onclick="MEME_SOUNDS.bruh()" title="Bruh">😐</button>
  <button class="meme-btn" onclick="MEME_SOUNDS.gg()" title="GG">🏆</button>
</div>`;
    document.getElementById('quizPlayerWrap')?.appendChild(panel);
  } else if (!ps.memeifyOn && existing) {
    existing.remove();
  }

  toast(ps.memeifyOn ? '🎭 Meme-ify ON!' : '🎭 Meme-ify OFF', 'info', 1500);
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATOR STUDIO DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
async function renderCreatorStudio() {
  if (!APP.session.loggedIn) { showLogin(); return; }
  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Loading Studio…</p></div>`;
  document.title = 'Creator Studio — ToolHub AI';

  try {
    const d = await apiFetch('/api/quiz/studio');
    const totalViews = d.quizzes.reduce((a, q) => a + (q.plays || 0), 0);
    const totalLikes = d.quizzes.reduce((a, q) => a + (q.likes || 0), 0);

    appEl.innerHTML = `
<div class="studio-wrap">
  <div class="studio-header">
    <button class="quiz-back-btn" onclick="renderQuizProfile()">← Back to Profile</button>
    <h2>🎬 Creator Studio</h2>
  </div>

  <!-- Overview stats -->
  <div class="studio-stats-row">
    <div class="studio-stat-card">
      <div class="studio-stat-icon">▶️</div>
      <div class="studio-stat-n">${totalViews.toLocaleString()}</div>
      <div class="studio-stat-lbl">Total Plays</div>
    </div>
    <div class="studio-stat-card">
      <div class="studio-stat-icon">❤️</div>
      <div class="studio-stat-n">${totalLikes.toLocaleString()}</div>
      <div class="studio-stat-lbl">Total Likes</div>
    </div>
    <div class="studio-stat-card">
      <div class="studio-stat-icon">📊</div>
      <div class="studio-stat-n">${d.avgPct}%</div>
      <div class="studio-stat-lbl">Avg Score</div>
    </div>
    <div class="studio-stat-card">
      <div class="studio-stat-icon">🏆</div>
      <div class="studio-stat-n">${d.topScore}</div>
      <div class="studio-stat-lbl">Top Score</div>
    </div>
  </div>

  <!-- Quiz performance table -->
  <div class="studio-section">
    <h3>Your Quizzes</h3>
    ${d.quizzes.length ? `
    <div class="studio-quiz-table">
      ${d.quizzes.map(q => {
        const barW = Math.round((q.plays / Math.max(...d.quizzes.map(x=>x.plays||1))) * 100);
        return `
      <div class="studio-quiz-row">
        <div class="studio-quiz-cover" style="background:${q.cover_color||'#6366f1'}">${q.cover_emoji||'🧠'}</div>
        <div class="studio-quiz-info">
          <div class="studio-quiz-title">${escQ(q.title)}</div>
          <div class="studio-plays-bar-wrap">
            <div class="studio-plays-bar"><div class="studio-plays-fill" style="width:${barW}%"></div></div>
            <span class="studio-plays-num">▶ ${(q.plays||0).toLocaleString()}</span>
          </div>
        </div>
        <div class="studio-quiz-metrics">
          <span>❤️ ${q.likes||0}</span>
          <span class="qp-status-badge ${q.status}">${q.status==='approved'?'✅ Live':q.status==='pending'?'⏳ Review':'❌ Rejected'}</span>
        </div>
      </div>`;
      }).join('')}
    </div>` : `<div class="qhub-empty" style="padding:40px"><p>No quizzes yet — create one!</p></div>`}
  </div>

  <!-- Recent plays feed -->
  ${d.recentPlays.length ? `
  <div class="studio-section">
    <h3>Recent Players</h3>
    <div class="studio-feed">
      ${d.recentPlays.map(p => `
      <div class="studio-feed-row">
        <div class="studio-feed-player">👤 ${escQ(p.player_name)}</div>
        <div class="studio-feed-quiz">on <em>${escQ(p.title)}</em></div>
        <div class="studio-feed-score">${p.pct}%</div>
        <div class="studio-feed-time">${timeAgo(p.created_at)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;
  } catch(e) {
    appEl.innerHTML = `<div style="padding:60px;text-align:center"><p>Failed to load Studio</p><button class="btn btn-primary" onclick="renderCreatorStudio()">Retry</button></div>`;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

// ══════════════════════════════════════════════════════════════════════════════
// DYNAMIC SVG BADGES
// ══════════════════════════════════════════════════════════════════════════════
function renderBadgesSVG(badges) {
  if (!badges || !badges.length) return '<div style="color:var(--text-muted);font-size:13px">Play quizzes to earn badges!</div>';
  return `<div class="badges-grid">${badges.map(b => `
<div class="badge-item" title="${b.label}">
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg_${b.id}" cx="50%" cy="40%">
        <stop offset="0%" stop-color="${b.color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${b.color}" stop-opacity="0.08"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#bg_${b.id})" stroke="${b.color}" stroke-width="2"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="${b.color}" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"/>
    <text x="32" y="40" text-anchor="middle" font-size="24">${b.icon}</text>
  </svg>
  <div class="badge-label">${b.label}</div>
</div>`).join('')}</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHOWCASE PEDESTAL (profile 3D upgrade)
// ══════════════════════════════════════════════════════════════════════════════
function initShowcasePedestal(canvasId, objectType) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return;
  destroyQuizThree();

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(220, 220);
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.5, 4);
  camera.lookAt(0, 0.5, 0);

  // Pedestal
  const pedGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.25, 32);
  const pedMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: false });
  const pedestal = new THREE.Mesh(pedGeo, pedMat);
  pedestal.position.y = -0.8;
  scene.add(pedestal);

  // Pedestal ring glow
  const ringGeo = new THREE.TorusGeometry(1.1, 0.04, 8, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = -0.65;
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // Main 3D object
  let mesh;
  const colors = { globe:0x6366f1, cube:0xef4444, star:0xf59e0b, donut:0x10b981, diamond:0x8b5cf6, youtube:0xff0000 };
  const col = colors[objectType] || 0x6366f1;
  const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: true });

  switch(objectType) {
    case 'globe':   mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 14), mat); break;
    case 'cube':    mesh = new THREE.Mesh(new THREE.BoxGeometry(1.3,1.3,1.3), mat); break;
    case 'star':    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), mat); break;
    case 'donut':   mesh = new THREE.Mesh(new THREE.TorusGeometry(0.7,0.28,12,32), mat); break;
    case 'diamond': mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), mat); break;
    case 'youtube':
      // YouTube Play Button — rectangular shape
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.12), mat);
      // Triangle play symbol
      const triMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const triGeo = new THREE.ConeGeometry(0.35, 0.6, 3);
      const tri = new THREE.Mesh(triGeo, triMat);
      tri.rotation.z = -Math.PI / 2;
      mesh.add(tri);
      break;
    default:
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 14), mat);
  }
  scene.add(mesh);

  let cancelled = false;
  function animate() {
    if (cancelled) return;
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.015;
    mesh.rotation.x += 0.004;
    ring.rotation.z += 0.01;
    renderer.render(scene, camera);
  }
  animate();
  QZ.threeInstances.push({ cancel: () => { cancelled = true; renderer.dispose(); } });
}

// ══════════════════════════════════════════════════════════════════════════════
// YOUTUBE THEMED HUB CANVAS (for JackSucksAtLife Quiz context)
// ══════════════════════════════════════════════════════════════════════════════
function initYouTube3DHero(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.THREE) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const W = canvas.parentElement?.offsetWidth || 800;
  const H = canvas.parentElement?.offsetHeight || 420;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
  camera.position.z = 5;

  const objects = [];

  // Spawn floating "play button" rectangles (YouTube Play Button shape)
  for (let i = 0; i < 8; i++) {
    const geo  = new THREE.BoxGeometry(0.7, 0.5, 0.05);
    const mat  = new THREE.MeshBasicMaterial({ color: [0xff0000,0xffffff,0xff0000,0xffa500][i%4], wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((Math.random()-0.5)*7, (Math.random()-0.5)*4, (Math.random()-0.5)*2);
    mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    mesh._vx = (Math.random()-0.5)*0.003;
    mesh._vy = (Math.random()-0.5)*0.004;
    mesh._rx = (Math.random()-0.5)*0.015;
    mesh._ry = (Math.random()-0.5)*0.02;
    scene.add(mesh);
    objects.push(mesh);
  }

  // Also add some generic shapes
  const geoms = [new THREE.IcosahedronGeometry(0.2,0), new THREE.OctahedronGeometry(0.2,0)];
  const cols  = [0x6366f1, 0x10b981, 0xf59e0b];
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(geoms[i%2], new THREE.MeshBasicMaterial({color:cols[i%3],wireframe:true}));
    mesh.position.set((Math.random()-0.5)*7, (Math.random()-0.5)*3, (Math.random()-0.5)*2);
    mesh._vx=(Math.random()-0.5)*0.003; mesh._vy=(Math.random()-0.5)*0.003;
    mesh._rx=(Math.random()-0.5)*0.02;  mesh._ry=(Math.random()-0.5)*0.02;
    scene.add(mesh); objects.push(mesh);
  }

  let cancelled = false;
  function animate() {
    if (cancelled) return;
    requestAnimationFrame(animate);
    objects.forEach(m => {
      m.rotation.x += m._rx; m.rotation.y += m._ry;
      m.position.x += m._vx; m.position.y += m._vy;
      if (Math.abs(m.position.x) > 4.5) m._vx *= -1;
      if (Math.abs(m.position.y) > 2.5) m._vy *= -1;
    });
    renderer.render(scene, camera);
  }
  animate();
  QZ.threeInstances.push({ cancel: () => { cancelled = true; renderer.dispose(); } });
}
