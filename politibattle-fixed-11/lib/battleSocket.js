// PolitiBattle Module — battleSocket — loaded by server.js via require('./lib/battleSocket')(io)
/**
 * ToolHub — PolitiBattle Socket.io Namespace Handler
 *
 * Attaches to the /battle namespace.
 * All event handlers are empty stubs — game logic filled in future chunks.
 */
'use strict';

const { getBattleRoom, updateBattleRoom, deleteBattleRoom } = require('./battleRooms');

/**
 * Attach the /battle Socket.io namespace to the server's io instance.
 * @param {import('socket.io').Server} io
 */
function attachBattleSocket(io) {
  const battle = io.of('/battle');

  battle.on('connection', (socket) => {
    console.log(`[PolitiBattle] socket connected: ${socket.id}`);

    // ── Room lifecycle ────────────────────────────────────────────────────────

    /** Host creates a new battle room */
    socket.on('pb:createRoom', (data) => {
      console.log(`[PolitiBattle] pb:createRoom`, data);
      // TODO: filled in future chunk
    });

    /** Guest joins an existing battle room via code */
    socket.on('pb:joinRoom', (data) => {
      console.log(`[PolitiBattle] pb:joinRoom`, data);
      // TODO: filled in future chunk
    });

    // ── Team selection phase ──────────────────────────────────────────────────

    /** Player submits their chosen team and signals ready */
    socket.on('pb:teamReady', (data) => {
      console.log(`[PolitiBattle] pb:teamReady`, data);
      // TODO: filled in future chunk
    });

    /** Player selects their lead fighter before battle starts */
    socket.on('pb:selectLead', (data) => {
      console.log(`[PolitiBattle] pb:selectLead`, data);
      // TODO: filled in future chunk
    });

    // ── Battle phase ──────────────────────────────────────────────────────────

    /** Player chooses a move during their turn */
    socket.on('pb:move', (data) => {
      console.log(`[PolitiBattle] pb:move`, data);
      // TODO: filled in future chunk
    });

    /** Player switches the active fighter */
    socket.on('pb:switch', (data) => {
      console.log(`[PolitiBattle] pb:switch`, data);
      // TODO: filled in future chunk
    });

    // ── Meta ──────────────────────────────────────────────────────────────────

    /** In-battle chat message */
    socket.on('pb:chat', (data) => {
      console.log(`[PolitiBattle] pb:chat`, data);
      // TODO: filled in future chunk
    });

    /** Player requests a rematch after battle ends */
    socket.on('pb:rematch', (data) => {
      console.log(`[PolitiBattle] pb:rematch`, data);
      // TODO: filled in future chunk
    });

    /** Player forfeits the current battle */
    socket.on('pb:forfeit', (data) => {
      console.log(`[PolitiBattle] pb:forfeit`, data);
      // TODO: filled in future chunk
    });

    // ── Disconnect ────────────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log(`[PolitiBattle] socket disconnected: ${socket.id} — reason: ${reason}`);
      // TODO: filled in future chunk (handle mid-battle disconnect, forfeit, cleanup)
    });
  });
}

module.exports = attachBattleSocket;
