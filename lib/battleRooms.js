'use strict';

/**
 * PolitiBattle — Room & Game State Manager
 * Manages battle rooms for the political Pokémon-style game.
 */

const crypto = require('crypto');

// In-memory store of all active battle rooms
const battleRooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(hostId, hostName) {
  let code = genCode();
  while (battleRooms.has(code)) code = genCode();

  const room = {
    code,
    hostId,
    hostName,
    createdAt: Date.now(),
    state: 'waiting', // waiting | team_select | battling | finished
    players: {
      host: { id: hostId, name: hostName, socketId: null, team: [], active: 0, ready: false },
      guest: null,
    },
    ai: false,
    battle: null, // will hold the battle state once started
  };
  battleRooms.set(code, room);
  return room;
}

function getRoom(code) {
  return battleRooms.get(code) || null;
}

function deleteRoom(code) {
  battleRooms.delete(code);
}

function joinRoom(code, guestId, guestName) {
  const room = battleRooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting') return { error: 'Game already in progress' };
  if (room.players.guest) return { error: 'Room is full' };

  room.players.guest = { id: guestId, name: guestName, socketId: null, team: [], active: 0, ready: false };
  return { room };
}

function startAIBattle(code) {
  const room = battleRooms.get(code);
  if (!room) return { error: 'Room not found' };
  room.ai = true;
  room.players.guest = {
    id: 'AI',
    name: 'CPU Trainer',
    socketId: null,
    team: [],
    active: 0,
    ready: false,
    isAI: true,
  };
  return { room };
}

// Clean up stale rooms (older than 2 hours)
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, room] of battleRooms) {
    if (room.createdAt < cutoff) battleRooms.delete(code);
  }
}, 5 * 60 * 1000);

module.exports = { createRoom, getRoom, deleteRoom, joinRoom, startAIBattle };
