// ─── ToolHub Multiplayer Game Engine ─────────────────────────────────────────
// Socket.io real-time engine with AI Kingdom, Data Heist, Evolution Race
'use strict';

// ── In-memory lobbies (Zero-Retention — wiped on session end) ────────────────
const lobbies = new Map();
const playerSockets = new Map(); // socketId → { lobbyCode, playerId }

// ── Blook Avatars ────────────────────────────────────────────────────────────
const BLOOKS = [
  { id:'bear',     name:'Byte Bear',      emoji:'🐻', color:'#8B4513' },
  { id:'cat',      name:'Cyber Cat',      emoji:'🐱', color:'#FF6B35' },
  { id:'dog',      name:'Data Dog',       emoji:'🐶', color:'#4ECDC4' },
  { id:'fox',      name:'Firewall Fox',   emoji:'🦊', color:'#FF4444' },
  { id:'owl',      name:'Oracle Owl',     emoji:'🦉', color:'#7B68EE' },
  { id:'panda',    name:'Pixel Panda',    emoji:'🐼', color:'#2D2D2D' },
  { id:'bunny',    name:'Buffer Bunny',   emoji:'🐰', color:'#FFB6C1' },
  { id:'penguin',  name:'Ping Penguin',   emoji:'🐧', color:'#1E90FF' },
  { id:'dragon',   name:'Debug Dragon',   emoji:'🐲', color:'#32CD32' },
  { id:'unicorn',  name:'Upload Unicorn', emoji:'🦄', color:'#DA70D6' },
  { id:'robot',    name:'Root Robot',     emoji:'🤖', color:'#708090' },
  { id:'alien',    name:'API Alien',      emoji:'👽', color:'#00FF7F' },
  { id:'ghost',    name:'Git Ghost',      emoji:'👻', color:'#B0C4DE' },
  { id:'dino',     name:'Docker Dino',    emoji:'🦕', color:'#20B2AA' },
  { id:'shark',    name:'Shell Shark',    emoji:'🦈', color:'#4169E1' },
  { id:'octopus',  name:'Octo-Process',   emoji:'🐙', color:'#9932CC' },
];

// ── EDU domain checker ───────────────────────────────────────────────────────
const EDU_SUFFIXES = ['.edu','.sch','.ac.uk','.ac.nz','.ac.za','.ac.jp','.ac.kr','.edu.au','.edu.sg','.edu.my','.school','.k12'];
function isEducatorEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return EDU_SUFFIXES.some(s => lower.endsWith(s));
}

// ── Join Code Generator ──────────────────────────────────────────────────────
function generateJoinCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (lobbies.has(code));
  return code;
}

// ── Game Mode Definitions ────────────────────────────────────────────────────
const GAME_MODES = {
  'ai-kingdom': {
    name: 'AI Kingdom',
    icon: '🏰',
    desc: 'Build & upgrade defensive bots to fight Misinformation Monsters!',
    color: '#7c3aed',
    initPlayerState: () => ({
      scraps: 0,
      bots: [],
      wallHP: 100,
      wave: 0,
      monstersDefeated: 0,
    }),
  },
  'data-heist': {
    name: 'Data Heist',
    icon: '🗂️',
    desc: 'Steal data folders, swap scores, and hack your way to victory!',
    color: '#f43f5e',
    initPlayerState: () => ({
      points: 0,
      folders: [],
      hasFirewall: false,
      firewallTurns: 0,
      stolenFrom: 0,
    }),
  },
  'evolution-race': {
    name: 'Evolution Race',
    icon: '🧬',
    desc: 'Answer streaks to evolve from Calculator to Quantum AI!',
    color: '#10b981',
    initPlayerState: () => ({
      stage: 0,
      streak: 0,
      maxStreak: 0,
      points: 0,
      xp: 0,
    }),
  },
};

const EVOLUTION_STAGES = [
  { name: 'Basic Calculator',  emoji: '🔢', color: '#9ca3af', xpNeeded: 0 },
  { name: 'Desktop PC',        emoji: '🖥️', color: '#3b82f6', xpNeeded: 150 },
  { name: 'Laptop Pro',        emoji: '💻', color: '#8b5cf6', xpNeeded: 350 },
  { name: 'Server Rack',       emoji: '🗄️', color: '#f59e0b', xpNeeded: 600 },
  { name: 'Mainframe',         emoji: '🏗️', color: '#ef4444', xpNeeded: 900 },
  { name: 'Quantum AI',        emoji: '🧠', color: '#10b981', xpNeeded: 1300 },
];

const AI_BOTS = [
  { id:'shield',  name:'Shield Bot',    emoji:'🛡️', cost:30,  hp:40, atk:0,  def:15, desc:'Absorbs damage' },
  { id:'turret',  name:'Turret Bot',    emoji:'🔫', cost:50,  hp:25, atk:20, def:5,  desc:'Attacks monsters' },
  { id:'healer',  name:'Healer Bot',    emoji:'💚', cost:40,  hp:20, atk:0,  def:0,  desc:'Repairs other bots' },
  { id:'cannon',  name:'Mega Cannon',   emoji:'💥', cost:80,  hp:30, atk:40, def:10, desc:'Heavy damage dealer' },
  { id:'wall',    name:'Firewall Bot',  emoji:'🧱', cost:60,  hp:60, atk:5,  def:25, desc:'Massive HP tank' },
  { id:'scanner', name:'Truth Scanner', emoji:'🔍', cost:45,  hp:15, atk:15, def:5,  desc:'Reveals monster weakness' },
];

const MONSTERS = [
  { name:'Fake News Blob',   emoji:'📰', hp:30,  atk:10, reward:15 },
  { name:'Clickbait Spider',  emoji:'🕷️', hp:45,  atk:15, reward:20 },
  { name:'Deepfake Phantom',  emoji:'👤', hp:60,  atk:20, reward:30 },
  { name:'Spam Golem',        emoji:'📧', hp:80,  atk:25, reward:40 },
  { name:'Troll Titan',       emoji:'👹', hp:100, atk:35, reward:55 },
  { name:'Virus Hydra',       emoji:'🐉', hp:150, atk:45, reward:75 },
];

const HEIST_FOLDERS = [
  { type:'points',   weight:40, label:'+Points',       icon:'💰' },
  { type:'big',      weight:15, label:'+BIG Points',   icon:'💎' },
  { type:'swap',     weight:10, label:'Swap Scores',   icon:'🔄' },
  { type:'steal',    weight:12, label:'Steal Points',  icon:'🕵️' },
  { type:'firewall', weight:10, label:'Firewall!',     icon:'🛡️' },
  { type:'virus',    weight:8,  label:'Virus! -Points',icon:'🦠' },
  { type:'jackpot',  weight:5,  label:'JACKPOT!',      icon:'🎰' },
];

// ── Weighted random pick ─────────────────────────────────────────────────────
function pickFolder() {
  const total = HEIST_FOLDERS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of HEIST_FOLDERS) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return HEIST_FOLDERS[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function createLobby(hostSocket, { hostName, hostEmail, quizId, quizTitle, questions, gameMode, settings }) {
  const code = generateJoinCode();
  const isVerified = isEducatorEmail(hostEmail);
  const blook = BLOOKS[Math.floor(Math.random() * BLOOKS.length)];

  const lobby = {
    code,
    hostId: hostSocket.id,
    hostName: hostName || 'Teacher',
    hostEmail: hostEmail || '',
    isVerifiedEducator: isVerified,
    quizId,
    quizTitle: quizTitle || 'Untitled Quiz',
    gameMode: gameMode || 'evolution-race',
    questions: questions || [],
    settings: {
      timeLimit: settings?.timeLimit || 20,
      senMode: false,
      maxPlayers: 50,
      ...settings,
    },
    players: new Map(),
    state: 'lobby', // lobby | playing | paused | reviewing | ended
    currentQuestion: -1,
    questionStartTime: null,
    answers: new Map(), // questionIndex → Map(playerId → answer)
    heatmap: [],        // per-question accuracy data
    createdAt: Date.now(),
    noAds: isVerified,  // Verified educators disable ads
  };

  // Add host as a player too
  lobby.players.set(hostSocket.id, {
    id: hostSocket.id,
    name: hostName,
    blook,
    isHost: true,
    isConnected: true,
    gameState: GAME_MODES[gameMode]?.initPlayerState() || {},
    answeredCurrent: false,
    totalCorrect: 0,
    totalAnswered: 0,
  });

  lobbies.set(code, lobby);
  playerSockets.set(hostSocket.id, { lobbyCode: code, playerId: hostSocket.id });

  return lobby;
}

function joinLobby(socket, { code, playerName, blookId }) {
  const lobby = lobbies.get(code);
  if (!lobby) return { error: 'Game not found. Check your code and try again.' };
  if (lobby.state !== 'lobby') return { error: 'This game has already started.' };
  if (lobby.players.size >= lobby.settings.maxPlayers) return { error: 'Game is full.' };

  const blook = BLOOKS.find(b => b.id === blookId) || BLOOKS[Math.floor(Math.random() * BLOOKS.length)];
  const player = {
    id: socket.id,
    name: (playerName || 'Student').slice(0, 20),
    blook,
    isHost: false,
    isConnected: true,
    gameState: GAME_MODES[lobby.gameMode]?.initPlayerState() || {},
    answeredCurrent: false,
    totalCorrect: 0,
    totalAnswered: 0,
  };

  lobby.players.set(socket.id, player);
  playerSockets.set(socket.id, { lobbyCode: code, playerId: socket.id });
  return { lobby, player };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME LOGIC — QUESTION FLOW
// ═══════════════════════════════════════════════════════════════════════════════
function advanceQuestion(io, code) {
  const lobby = lobbies.get(code);
  if (!lobby || lobby.state === 'ended') return;

  lobby.currentQuestion++;
  if (lobby.currentQuestion >= lobby.questions.length) {
    endGame(io, code);
    return;
  }

  lobby.state = 'playing';
  lobby.questionStartTime = Date.now();
  lobby.answers.set(lobby.currentQuestion, new Map());

  // Reset per-question flags
  for (const [, p] of lobby.players) {
    p.answeredCurrent = false;
  }

  const q = lobby.questions[lobby.currentQuestion];
  const timeLimit = lobby.settings.senMode
    ? (lobby.settings.timeLimit || 20) * 2
    : (lobby.settings.timeLimit || 20);

  // Send question to all players (strip correct answer for clients)
  io.to(code).emit('game:question', {
    index: lobby.currentQuestion,
    total: lobby.questions.length,
    question: q.question,
    options: q.options,
    image: q.image || null,
    timeLimit,
    gameMode: lobby.gameMode,
  });

  // Send correct answer to host for dashboard
  const hostSocket = [...lobby.players.entries()].find(([, p]) => p.isHost);
  if (hostSocket) {
    io.to(hostSocket[0]).emit('host:questionData', {
      index: lobby.currentQuestion,
      correctAnswer: q.correctAnswer ?? q.correct,
      explanation: q.explanation || '',
    });
  }

  // Auto-advance timer
  lobby._timer = setTimeout(() => {
    questionTimeUp(io, code);
  }, (timeLimit + 2) * 1000);
}

function submitAnswer(io, socket, { answerIndex }) {
  const info = playerSockets.get(socket.id);
  if (!info) return;
  const lobby = lobbies.get(info.lobbyCode);
  if (!lobby || lobby.state !== 'playing') return;

  const player = lobby.players.get(socket.id);
  if (!player || player.answeredCurrent || player.isHost) return;

  player.answeredCurrent = true;
  player.totalAnswered++;

  const q = lobby.questions[lobby.currentQuestion];
  const correctIdx = q.correctAnswer ?? q.correct;
  const isCorrect = answerIndex === correctIdx;
  const elapsed = (Date.now() - lobby.questionStartTime) / 1000;
  const timeLimit = lobby.settings.senMode
    ? (lobby.settings.timeLimit || 20) * 2
    : (lobby.settings.timeLimit || 20);
  const speedBonus = Math.max(0, Math.round((1 - elapsed / timeLimit) * 50));

  if (isCorrect) player.totalCorrect++;

  // Store answer
  const qAnswers = lobby.answers.get(lobby.currentQuestion);
  if (qAnswers) qAnswers.set(socket.id, { answerIndex, isCorrect, elapsed });

  // Mode-specific logic
  let modeResult = {};
  if (lobby.gameMode === 'ai-kingdom') {
    modeResult = processAIKingdom(player, isCorrect, speedBonus, lobby);
  } else if (lobby.gameMode === 'data-heist') {
    modeResult = processDataHeist(player, isCorrect, speedBonus, lobby);
  } else if (lobby.gameMode === 'evolution-race') {
    modeResult = processEvolution(player, isCorrect, speedBonus);
  }

  // Send personal result to player
  socket.emit('game:answerResult', {
    isCorrect,
    correctAnswer: correctIdx,
    pointsEarned: modeResult.pointsEarned || 0,
    speedBonus,
    gameState: player.gameState,
    modeResult,
  });

  // Update host dashboard
  updateHostDashboard(io, lobby);

  // Check if all players answered
  const activePlayers = [...lobby.players.values()].filter(p => !p.isHost && p.isConnected);
  const allAnswered = activePlayers.every(p => p.answeredCurrent);
  if (allAnswered && activePlayers.length > 0) {
    clearTimeout(lobby._timer);
    questionTimeUp(io, info.lobbyCode);
  }
}

function questionTimeUp(io, code) {
  const lobby = lobbies.get(code);
  if (!lobby) return;

  const q = lobby.questions[lobby.currentQuestion];
  const qAnswers = lobby.answers.get(lobby.currentQuestion) || new Map();

  // Calculate heatmap data
  let correct = 0, total = 0;
  const distribution = [0, 0, 0, 0];
  for (const [, a] of qAnswers) {
    total++;
    if (a.isCorrect) correct++;
    if (a.answerIndex >= 0 && a.answerIndex < 4) distribution[a.answerIndex]++;
  }

  lobby.heatmap.push({
    questionIndex: lobby.currentQuestion,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    distribution,
    avgTime: total > 0 ? Math.round([...qAnswers.values()].reduce((s, a) => s + a.elapsed, 0) / total * 10) / 10 : 0,
  });

  // AI Kingdom: process monster wave between questions
  if (lobby.gameMode === 'ai-kingdom' && lobby.currentQuestion % 3 === 2) {
    processMonsterWave(io, lobby);
  }

  // Send review to all
  io.to(code).emit('game:review', {
    correctAnswer: q.correctAnswer ?? q.correct,
    explanation: q.explanation || '',
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    distribution,
    leaderboard: getLeaderboard(lobby),
    heatmap: lobby.heatmap,
  });

  // Auto-advance after review
  lobby._reviewTimer = setTimeout(() => {
    advanceQuestion(io, code);
  }, 5000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME MODE PROCESSORS
// ═══════════════════════════════════════════════════════════════════════════════
function processAIKingdom(player, isCorrect, speedBonus, lobby) {
  const gs = player.gameState;
  if (isCorrect) {
    const scrapsEarned = 20 + speedBonus;
    gs.scraps += scrapsEarned;
    return { pointsEarned: scrapsEarned, event: 'scraps', scrapsEarned };
  } else {
    // Monsters deal damage to wall
    const dmg = 5 + Math.floor(lobby.currentQuestion / 3) * 2;
    gs.wallHP = Math.max(0, gs.wallHP - dmg);
    return { pointsEarned: 0, event: 'damage', damageTaken: dmg, wallHP: gs.wallHP };
  }
}

function processDataHeist(player, isCorrect, speedBonus, lobby) {
  const gs = player.gameState;
  if (!isCorrect) {
    return { pointsEarned: 0, event: 'miss' };
  }

  // Pick a mystery folder
  const folder = pickFolder();
  gs.folders.push(folder.type);

  let pointsEarned = 0;
  let event = folder.type;
  let targetPlayer = null;

  switch (folder.type) {
    case 'points':
      pointsEarned = 50 + speedBonus;
      gs.points += pointsEarned;
      break;
    case 'big':
      pointsEarned = 150 + speedBonus * 2;
      gs.points += pointsEarned;
      break;
    case 'jackpot':
      pointsEarned = 500;
      gs.points += pointsEarned;
      break;
    case 'swap': {
      // Find top player to swap with
      const others = [...lobby.players.values()].filter(p => p.id !== player.id && !p.isHost);
      if (others.length) {
        const top = others.sort((a, b) => (b.gameState.points || 0) - (a.gameState.points || 0))[0];
        if (!top.gameState.hasFirewall) {
          const tmp = gs.points;
          gs.points = top.gameState.points;
          top.gameState.points = tmp;
          targetPlayer = top.name;
        } else {
          top.gameState.hasFirewall = false;
          event = 'blocked';
          targetPlayer = top.name;
        }
      }
      break;
    }
    case 'steal': {
      const others = [...lobby.players.values()].filter(p => p.id !== player.id && !p.isHost);
      if (others.length) {
        const victim = others[Math.floor(Math.random() * others.length)];
        if (!victim.gameState.hasFirewall) {
          const stolen = Math.min(victim.gameState.points, 75);
          victim.gameState.points -= stolen;
          gs.points += stolen;
          pointsEarned = stolen;
          targetPlayer = victim.name;
          gs.stolenFrom++;
        } else {
          victim.gameState.hasFirewall = false;
          event = 'blocked';
          targetPlayer = victim.name;
        }
      }
      break;
    }
    case 'firewall':
      gs.hasFirewall = true;
      gs.firewallTurns = 3;
      break;
    case 'virus':
      pointsEarned = -Math.floor(gs.points * 0.15);
      gs.points = Math.max(0, gs.points + pointsEarned);
      break;
  }

  // Decrement firewall
  if (gs.firewallTurns > 0) {
    gs.firewallTurns--;
    if (gs.firewallTurns <= 0) gs.hasFirewall = false;
  }

  return { pointsEarned, event, folder, targetPlayer };
}

function processEvolution(player, isCorrect, speedBonus) {
  const gs = player.gameState;
  if (isCorrect) {
    gs.streak++;
    if (gs.streak > gs.maxStreak) gs.maxStreak = gs.streak;

    const streakMultiplier = Math.min(gs.streak, 5);
    const xpGain = (25 + speedBonus) * streakMultiplier;
    const pointsEarned = 100 + speedBonus + (gs.streak >= 3 ? gs.streak * 20 : 0);

    gs.xp += xpGain;
    gs.points += pointsEarned;

    // Check evolution
    let newStage = gs.stage;
    for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
      if (gs.xp >= EVOLUTION_STAGES[i].xpNeeded) { newStage = i; break; }
    }
    const evolved = newStage > gs.stage;
    gs.stage = newStage;

    return {
      pointsEarned,
      xpGain,
      streak: gs.streak,
      evolved,
      stage: EVOLUTION_STAGES[gs.stage],
      event: evolved ? 'evolve' : 'correct',
    };
  } else {
    gs.streak = 0;
    return { pointsEarned: 0, xpGain: 0, streak: 0, event: 'wrong', stage: EVOLUTION_STAGES[gs.stage] };
  }
}

// ── Monster Wave (AI Kingdom) ────────────────────────────────────────────────
function processMonsterWave(io, lobby) {
  const waveNum = Math.floor(lobby.currentQuestion / 3);
  const monsterIdx = Math.min(waveNum, MONSTERS.length - 1);
  const monster = { ...MONSTERS[monsterIdx] };
  monster.hp += waveNum * 10; // Scale difficulty

  for (const [socketId, player] of lobby.players) {
    if (player.isHost) continue;
    const gs = player.gameState;
    gs.wave = waveNum + 1;

    // Bots attack monster
    let totalAtk = 0;
    for (const bot of gs.bots) {
      if (bot.hp > 0) {
        totalAtk += bot.atk;
        // Bots take damage
        const dmgToBot = Math.max(0, monster.atk - bot.def);
        bot.hp = Math.max(0, bot.hp - dmgToBot);
        if (bot.hp <= 0) bot.glitched = true;
      }
    }

    // Healer bots repair
    const healers = gs.bots.filter(b => b.id === 'healer' && b.hp > 0);
    for (const healer of healers) {
      const damaged = gs.bots.find(b => b.hp > 0 && b.hp < b.maxHp && b.id !== 'healer');
      if (damaged) damaged.hp = Math.min(damaged.maxHp, damaged.hp + 10);
    }

    const monsterDefeated = totalAtk >= monster.hp;
    if (monsterDefeated) {
      gs.scraps += monster.reward;
      gs.monstersDefeated++;
    } else {
      const remainingDmg = Math.max(0, monster.atk - totalAtk);
      gs.wallHP = Math.max(0, gs.wallHP - remainingDmg);
    }

    io.to(socketId).emit('game:monsterWave', {
      monster,
      wave: gs.wave,
      defeated: monsterDefeated,
      wallHP: gs.wallHP,
      bots: gs.bots,
      reward: monsterDefeated ? monster.reward : 0,
    });
  }
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function getLeaderboard(lobby) {
  const players = [...lobby.players.values()].filter(p => !p.isHost);
  return players.map(p => ({
    name: p.name,
    blook: p.blook,
    score: getPlayerScore(p, lobby.gameMode),
    correct: p.totalCorrect,
    total: p.totalAnswered,
    stage: lobby.gameMode === 'evolution-race' ? EVOLUTION_STAGES[p.gameState.stage] : null,
    wallHP: lobby.gameMode === 'ai-kingdom' ? p.gameState.wallHP : null,
    hasFirewall: lobby.gameMode === 'data-heist' ? p.gameState.hasFirewall : null,
  })).sort((a, b) => b.score - a.score);
}

function getPlayerScore(player, mode) {
  const gs = player.gameState;
  switch (mode) {
    case 'ai-kingdom':     return gs.scraps + gs.monstersDefeated * 25;
    case 'data-heist':     return gs.points;
    case 'evolution-race': return gs.points;
    default:               return player.totalCorrect * 100;
  }
}

// ── Host Dashboard Update ────────────────────────────────────────────────────
function updateHostDashboard(io, lobby) {
  const host = [...lobby.players.entries()].find(([, p]) => p.isHost);
  if (!host) return;

  const players = [...lobby.players.values()].filter(p => !p.isHost);
  const answered = players.filter(p => p.answeredCurrent).length;
  const total = players.length;

  io.to(host[0]).emit('host:dashboard', {
    answered,
    total,
    leaderboard: getLeaderboard(lobby),
    heatmap: lobby.heatmap,
    playerDetails: players.map(p => ({
      name: p.name,
      blook: p.blook,
      correct: p.totalCorrect,
      total: p.totalAnswered,
      accuracy: p.totalAnswered > 0 ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0,
      answeredCurrent: p.answeredCurrent,
      isConnected: p.isConnected,
    })),
  });
}

// ── End Game ─────────────────────────────────────────────────────────────────
function endGame(io, code) {
  const lobby = lobbies.get(code);
  if (!lobby) return;

  lobby.state = 'ended';
  clearTimeout(lobby._timer);
  clearTimeout(lobby._reviewTimer);

  io.to(code).emit('game:ended', {
    leaderboard: getLeaderboard(lobby),
    heatmap: lobby.heatmap,
    totalQuestions: lobby.questions.length,
    gameMode: lobby.gameMode,
  });

  // Clean up after 60s (Zero-Retention)
  setTimeout(() => {
    lobbies.delete(code);
    for (const [sid, info] of playerSockets) {
      if (info.lobbyCode === code) playerSockets.delete(sid);
    }
  }, 60000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET.IO INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════
function initSocketIO(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.id}`);

    // ── Create Lobby ─────────────────────────────────────────────────────
    socket.on('lobby:create', (data, callback) => {
      try {
        const lobby = createLobby(socket, data);
        socket.join(lobby.code);
        callback({
          success: true,
          code: lobby.code,
          isVerifiedEducator: lobby.isVerifiedEducator,
          noAds: lobby.noAds,
          blooks: BLOOKS,
        });
        console.log(`[GAME] Lobby ${lobby.code} created by ${data.hostName} (${lobby.gameMode})`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // ── Join Lobby ───────────────────────────────────────────────────────
    socket.on('lobby:join', (data, callback) => {
      const result = joinLobby(socket, data);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }
      const { lobby, player } = result;
      socket.join(lobby.code);

      callback({
        success: true,
        player,
        quizTitle: lobby.quizTitle,
        gameMode: lobby.gameMode,
        hostName: lobby.hostName,
        noAds: lobby.noAds,
        isVerifiedEducator: lobby.isVerifiedEducator,
        settings: lobby.settings,
      });

      // Notify everyone
      io.to(lobby.code).emit('lobby:playerJoined', {
        player: { name: player.name, blook: player.blook, id: player.id },
        playerCount: lobby.players.size,
        players: [...lobby.players.values()].filter(p => !p.isHost).map(p => ({
          name: p.name, blook: p.blook, id: p.id,
        })),
      });

      console.log(`[GAME] ${player.name} joined lobby ${lobby.code}`);
    });

    // ── Start Game ───────────────────────────────────────────────────────
    socket.on('game:start', (data, callback) => {
      const info = playerSockets.get(socket.id);
      if (!info) return callback?.({ error: 'Not in a lobby' });
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby) return callback?.({ error: 'Lobby not found' });
      if (lobby.hostId !== socket.id) return callback?.({ error: 'Only the host can start' });
      if (lobby.players.size < 2) return callback?.({ error: 'Need at least 1 player' });

      // Apply any last-minute settings
      if (data?.senMode !== undefined) lobby.settings.senMode = data.senMode;
      if (data?.timeLimit) lobby.settings.timeLimit = data.timeLimit;

      lobby.state = 'playing';
      io.to(info.lobbyCode).emit('game:started', {
        gameMode: lobby.gameMode,
        totalQuestions: lobby.questions.length,
        settings: lobby.settings,
        modeName: GAME_MODES[lobby.gameMode]?.name,
        modeIcon: GAME_MODES[lobby.gameMode]?.icon,
      });

      setTimeout(() => advanceQuestion(io, info.lobbyCode), 3000);
      callback?.({ success: true });
    });

    // ── Submit Answer ────────────────────────────────────────────────────
    socket.on('game:answer', (data) => {
      submitAnswer(io, socket, data);
    });

    // ── Buy Bot (AI Kingdom) ─────────────────────────────────────────────
    socket.on('game:buyBot', ({ botId }, callback) => {
      const info = playerSockets.get(socket.id);
      if (!info) return callback?.({ error: 'Not in game' });
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.gameMode !== 'ai-kingdom') return;
      const player = lobby.players.get(socket.id);
      if (!player) return;

      const template = AI_BOTS.find(b => b.id === botId);
      if (!template) return callback?.({ error: 'Unknown bot' });
      if (player.gameState.scraps < template.cost) return callback?.({ error: 'Not enough scraps' });
      if (player.gameState.bots.length >= 6) return callback?.({ error: 'Max 6 bots' });

      player.gameState.scraps -= template.cost;
      player.gameState.bots.push({ ...template, maxHp: template.hp, glitched: false });
      callback?.({ success: true, gameState: player.gameState });
    });

    // ── Repair Bot (AI Kingdom) ──────────────────────────────────────────
    socket.on('game:repairBot', ({ botIndex }, callback) => {
      const info = playerSockets.get(socket.id);
      if (!info) return callback?.({ error: 'Not in game' });
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.gameMode !== 'ai-kingdom') return;
      const player = lobby.players.get(socket.id);
      if (!player) return;

      const bot = player.gameState.bots[botIndex];
      if (!bot) return callback?.({ error: 'Bot not found' });
      const repairCost = Math.ceil(bot.cost * 0.4);
      if (player.gameState.scraps < repairCost) return callback?.({ error: 'Not enough scraps' });

      player.gameState.scraps -= repairCost;
      bot.hp = bot.maxHp;
      bot.glitched = false;
      callback?.({ success: true, gameState: player.gameState });
    });

    // ── Game Master Controls ─────────────────────────────────────────────
    socket.on('host:pause', () => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.hostId !== socket.id) return;
      lobby.state = 'paused';
      clearTimeout(lobby._timer);
      clearTimeout(lobby._reviewTimer);
      io.to(info.lobbyCode).emit('game:paused', { by: lobby.hostName });
    });

    socket.on('host:resume', () => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.hostId !== socket.id || lobby.state !== 'paused') return;
      lobby.state = 'playing';
      io.to(info.lobbyCode).emit('game:resumed');
      advanceQuestion(io, info.lobbyCode);
    });

    socket.on('host:skip', () => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.hostId !== socket.id) return;
      clearTimeout(lobby._timer);
      clearTimeout(lobby._reviewTimer);
      advanceQuestion(io, info.lobbyCode);
    });

    socket.on('host:kick', ({ playerId }) => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.hostId !== socket.id) return;
      const target = lobby.players.get(playerId);
      if (target && !target.isHost) {
        lobby.players.delete(playerId);
        io.to(playerId).emit('game:kicked');
        io.to(info.lobbyCode).emit('lobby:playerLeft', {
          name: target.name,
          playerCount: lobby.players.size,
        });
      }
    });

    socket.on('host:end', () => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.hostId !== socket.id) return;
      endGame(io, info.lobbyCode);
    });

    socket.on('host:toggleSEN', ({ enabled }) => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby || lobby.hostId !== socket.id) return;
      lobby.settings.senMode = enabled;
      io.to(info.lobbyCode).emit('game:senToggled', { enabled });
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const info = playerSockets.get(socket.id);
      if (!info) return;
      const lobby = lobbies.get(info.lobbyCode);
      if (!lobby) return;

      const player = lobby.players.get(socket.id);
      if (player) {
        player.isConnected = false;
        io.to(info.lobbyCode).emit('lobby:playerDisconnected', {
          name: player.name,
          playerCount: [...lobby.players.values()].filter(p => p.isConnected).length,
        });

        // If host disconnects, end the game
        if (player.isHost) {
          endGame(io, info.lobbyCode);
        }
      }
      playerSockets.delete(socket.id);
    });
  });

  return io;
}

module.exports = {
  initSocketIO,
  BLOOKS,
  GAME_MODES,
  EVOLUTION_STAGES,
  AI_BOTS,
  MONSTERS,
  isEducatorEmail,
  lobbies,
};
