/* ── ToolHub AI — multiplayer-leaderboard.js ─────────────────────────────── */
'use strict';

const LeaderboardPage = (() => {
  async function init(code) {
    const app = document.getElementById('leaderboardApp');
    app.innerHTML = `<div class="lb-wrap"><div style="color:#94a3b8">Loading results…</div></div>`;

    // Try sessionStorage first (instant), then API fallback
    let leaderboard = null;
    try {
      const stored = sessionStorage.getItem('th_final_lb');
      if (stored) leaderboard = JSON.parse(stored);
    } catch {}

    if (!leaderboard && code) {
      try {
        const r = await fetch('/api/multiplayer/results/' + code).then(r => r.json());
        if (r && r.players_json) leaderboard = r.players_json;
      } catch {}
    }

    if (!leaderboard || !leaderboard.length) {
      app.innerHTML = `
        <div class="lb-wrap">
          <div style="font-size:3rem">📊</div>
          <h1>Game Over!</h1>
          <div class="lb-subtitle">No results found.</div>
          <div class="lb-actions">
            <a href="/multiplayer" class="btn-home">Play Again</a>
          </div>
        </div>`;
      return;
    }

    render(app, leaderboard, code);
    sessionStorage.removeItem('th_final_lb');
  }

  function render(app, lb, code) {
    const top3 = lb.slice(0, 3);
    const rest  = lb.slice(3);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3; // 2nd, 1st, 3rd
    const podiumClasses = top3.length >= 3 ? ['p2','p1','p3'] : ['p1','p2','p3'];
    const podiumMedals  = top3.length >= 3 ? ['🥈','🥇','🥉'] : ['🥇','🥈','🥉'];

    app.innerHTML = `
    <div class="lb-wrap">
      <div style="font-size:3rem;margin-bottom:8px">🏆</div>
      <h1>Final Leaderboard</h1>
      <div class="lb-subtitle">Game complete! Here are the final standings.</div>

      ${lb.length >= 1 ? `
      <div class="lb-podium">
        ${podiumOrder.map((p, i) => p ? `
        <div class="podium-item bounce-in" style="animation-delay:${i*0.15}s">
          <div class="podium-bar ${podiumClasses[i]}">
            <span class="podium-medal">${podiumMedals[i]}</span>
          </div>
          <div class="podium-name">${esc(p.name)}</div>
          <div class="podium-score">${(p.score||0).toLocaleString()} pts</div>
        </div>` : '').join('')}
      </div>` : ''}

      <div class="lb-full-table slide-up">
        ${lb.map((p, i) => `
        <div class="lb-full-row">
          <div class="lb-full-rank">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
          <div class="lb-full-name">${esc(p.name)}</div>
          <div class="lb-full-score">${(p.score||0).toLocaleString()}</div>
        </div>`).join('')}
      </div>

      <div class="lb-actions">
        <a href="/multiplayer" class="btn-home">🏠 Back to Multiplayer</a>
        <a href="/quizzes" class="btn-play-again">🎮 More Quizzes</a>
      </div>
    </div>`;

    // Confetti
    spawnConfetti();
  }

  function spawnConfetti() {
    const colors = ['#818cf8','#34d399','#f59e0b','#f43f5e','#38bdf8'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.style.cssText = `
        position:fixed; width:8px; height:8px; border-radius:2px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        left:${Math.random()*100}%; top:-10px;
        animation: confettiFall ${1.5 + Math.random()*2}s linear ${Math.random()*1.5}s forwards;
        pointer-events:none; z-index:9999;`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
    if (!document.getElementById('confettiStyle')) {
      const s = document.createElement('style');
      s.id = 'confettiStyle';
      s.textContent = `@keyframes confettiFall { to { top:110%; transform:rotate(720deg) translateX(${Math.random()*100-50}px); opacity:0; } }`;
      document.head.appendChild(s);
    }
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init };
})();
