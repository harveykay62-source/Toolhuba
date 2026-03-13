/* ── ToolHub AI — multiplayer-game.js ────────────────────────────────────── */
/* Loaded by game-room.html — reads sessionStorage set by host/join pages     */
'use strict';

const GameRoom = (() => {
  function init() {
    const app = document.getElementById('gameRoomApp');
    const roomData = (() => {
      try { return JSON.parse(sessionStorage.getItem('th_room') || 'null'); } catch { return null; }
    })();
    const playerData = (() => {
      try { return JSON.parse(sessionStorage.getItem('th_player') || 'null'); } catch { return null; }
    })();

    if (!roomData && !playerData) {
      app.innerHTML = `
        <div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;text-align:center;padding:20px">
          <div style="font-size:3rem;margin-bottom:16px">🎮</div>
          <h2>No active game session</h2>
          <p style="color:#94a3b8;margin-bottom:24px">You need to host or join a game first.</p>
          <a href="/multiplayer" style="background:#6366f1;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:700">Go to Multiplayer →</a>
        </div>`;
      return;
    }

    // Redirect to appropriate page
    if (roomData?.isHost) {
      window.location.href = '/host-game?mode=' + (roomData.mode || 'blooket') + '&resume=1&code=' + (roomData.code || '');
    } else if (playerData?.code) {
      window.location.href = '/join-game?code=' + playerData.code;
    } else {
      window.location.href = '/multiplayer';
    }
  }

  return { init };
})();
