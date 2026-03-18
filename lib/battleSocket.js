'use strict';

/**
 * PolitiBattle — Socket.io Battle Handler
 * Full turn-based battle engine with type effectiveness, stats, status conditions,
 * entry hazards, switching, and AI opponent logic.
 */

const rooms = require('./battleRooms');

// ── TYPE CHART ──────────────────────────────────────────────────────────────
// 10 political types
const TYPES = [
  'Republican', 'Democrat', 'Libertarian', 'Green', 'Socialist',
  'Authoritarian', 'Centrist', 'Populist', 'Corporate', 'Revolutionary'
];

// Effectiveness: attacker type → defender type → multiplier
// 2 = super effective, 0.5 = not very effective, 0 = immune, 1 = normal
const TYPE_CHART = {
  Republican:    { Democrat: 2, Green: 2, Socialist: 2, Libertarian: 0.5, Authoritarian: 0.5, Corporate: 0.5, Populist: 1, Centrist: 1, Revolutionary: 1 },
  Democrat:      { Republican: 0.5, Libertarian: 2, Corporate: 2, Populist: 2, Green: 0.5, Socialist: 0.5, Centrist: 1, Authoritarian: 1, Revolutionary: 1 },
  Libertarian:   { Authoritarian: 2, Socialist: 2, Corporate: 0.5, Republican: 0.5, Centrist: 2, Democrat: 1, Green: 1, Populist: 1, Revolutionary: 1 },
  Green:         { Corporate: 2, Republican: 0.5, Populist: 2, Democrat: 0.5, Libertarian: 1, Authoritarian: 1, Socialist: 1, Centrist: 1, Revolutionary: 1 },
  Socialist:     { Corporate: 2, Libertarian: 0.5, Populist: 2, Republican: 0.5, Democrat: 1, Authoritarian: 1, Green: 1, Centrist: 1, Revolutionary: 0.5 },
  Authoritarian: { Revolutionary: 2, Libertarian: 0, Democrat: 2, Green: 2, Populist: 0.5, Republican: 1, Socialist: 1, Corporate: 1, Centrist: 1 },
  Centrist:      { Populist: 0.5, Revolutionary: 0.5, Authoritarian: 2, Republican: 1, Democrat: 1, Libertarian: 0.5, Green: 1, Socialist: 1, Corporate: 1 },
  Populist:      { Corporate: 2, Centrist: 2, Authoritarian: 0.5, Green: 1, Republican: 1, Democrat: 0.5, Libertarian: 1, Socialist: 1, Revolutionary: 1 },
  Corporate:     { Socialist: 2, Green: 0.5, Populist: 0.5, Revolutionary: 0.5, Republican: 1, Democrat: 1, Libertarian: 2, Authoritarian: 1, Centrist: 1 },
  Revolutionary: { Authoritarian: 0, Corporate: 2, Centrist: 2, Socialist: 0.5, Republican: 2, Democrat: 1, Libertarian: 1, Green: 1, Populist: 1 },
};

// Fill in missing entries as 1
for (const atk of TYPES) {
  if (!TYPE_CHART[atk]) TYPE_CHART[atk] = {};
  for (const def of TYPES) {
    if (TYPE_CHART[atk][def] === undefined) TYPE_CHART[atk][def] = 1;
  }
}

function getEffectiveness(moveType, defTypes) {
  let mult = 1;
  for (const dt of defTypes) {
    mult *= (TYPE_CHART[moveType] && TYPE_CHART[moveType][dt] !== undefined) ? TYPE_CHART[moveType][dt] : 1;
  }
  return mult;
}

// ── DAMAGE CALC ─────────────────────────────────────────────────────────────
function calcDamage(attacker, defender, move, attackerPol, defenderPol) {
  if (move.category === 'status') return 0;

  const level = 50;
  const atkStat = move.category === 'physical'
    ? getEffStat(attacker, 'atk')
    : getEffStat(attacker, 'spa');
  const defStat = move.category === 'physical'
    ? getEffStat(defender, 'def')
    : getEffStat(defender, 'spd');

  let baseDmg = ((2 * level / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2;

  // STAB
  if (attackerPol.types.includes(move.type)) baseDmg *= 1.5;

  // Type effectiveness
  const eff = getEffectiveness(move.type, defenderPol.types);
  baseDmg *= eff;

  // Burn halves physical
  if (attacker.status === 'burn' && move.category === 'physical') baseDmg *= 0.5;

  // Random factor 0.85-1.0
  baseDmg *= (Math.random() * 0.15 + 0.85);

  return Math.max(1, Math.floor(baseDmg));
}

function getEffStat(fighter, stat) {
  const base = fighter.stats[stat];
  const stage = fighter.stages[stat] || 0;
  const mult = stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
  return Math.max(1, Math.floor(base * mult));
}

function getEffSpeed(fighter) {
  let spd = getEffStat(fighter, 'spe');
  if (fighter.status === 'paralysis') spd = Math.floor(spd / 2);
  return spd;
}

// ── STATUS EFFECTS ──────────────────────────────────────────────────────────
function applyEndOfTurnStatus(fighter) {
  const msgs = [];
  if (fighter.status === 'burn') {
    const dmg = Math.max(1, Math.floor(fighter.stats.hp / 16));
    fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
    msgs.push(`${fighter.name} is hurt by its burn! (-${dmg} HP)`);
  }
  if (fighter.status === 'poison') {
    const dmg = Math.max(1, Math.floor(fighter.stats.hp / 8));
    fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
    msgs.push(`${fighter.name} is hurt by poison! (-${dmg} HP)`);
  }
  if (fighter.status === 'toxic') {
    fighter.toxicCounter = (fighter.toxicCounter || 1);
    const dmg = Math.max(1, Math.floor(fighter.stats.hp * fighter.toxicCounter / 16));
    fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
    msgs.push(`${fighter.name} is badly poisoned! (-${dmg} HP)`);
    fighter.toxicCounter++;
  }
  return msgs;
}

function canAct(fighter) {
  if (fighter.status === 'sleep') {
    if (fighter.sleepTurns > 0) {
      fighter.sleepTurns--;
      return { can: false, msg: `${fighter.name} is fast asleep!` };
    } else {
      fighter.status = null;
      return { can: true, msg: `${fighter.name} woke up!` };
    }
  }
  if (fighter.status === 'paralysis') {
    if (Math.random() < 0.25) {
      return { can: false, msg: `${fighter.name} is paralyzed! It can't move!` };
    }
  }
  if (fighter.flinch) {
    fighter.flinch = false;
    return { can: false, msg: `${fighter.name} flinched and couldn't move!` };
  }
  return { can: true, msg: null };
}

// ── ENTRY HAZARDS ───────────────────────────────────────────────────────────
function applyEntryHazards(fighter, side, pol) {
  const msgs = [];
  if (side.hazards.stealthRock) {
    // Stealth Rock does 12.5% base, modified by type
    let dmg = Math.max(1, Math.floor(fighter.stats.hp / 8));
    msgs.push(`Pointed rocks dug into ${fighter.name}! (-${dmg} HP)`);
    fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
  }
  if (side.hazards.spikes > 0) {
    const pcts = [0, 1/8, 1/6, 1/4];
    const dmg = Math.max(1, Math.floor(fighter.stats.hp * pcts[side.hazards.spikes]));
    msgs.push(`${fighter.name} was hurt by spikes! (-${dmg} HP)`);
    fighter.currentHp = Math.max(0, fighter.currentHp - dmg);
  }
  if (side.hazards.stickyWeb) {
    fighter.stages.spe = Math.max(-6, (fighter.stages.spe || 0) - 1);
    msgs.push(`${fighter.name} was caught in a sticky web! (Speed fell!)`);
  }
  return msgs;
}

// ── CREATE FIGHTER FROM POLITICIAN ──────────────────────────────────────────
function createFighter(pol) {
  return {
    id: pol.id,
    name: pol.name,
    types: pol.types,
    stats: { ...pol.stats },
    currentHp: pol.stats.hp,
    moves: pol.moves.map(m => ({ ...m })),
    status: null,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    toxicCounter: 1,
    sleepTurns: 0,
    flinch: false,
    emoji: pol.emoji,
  };
}

// ── EXECUTE MOVE ────────────────────────────────────────────────────────────
function executeMove(attacker, defender, move, atkPol, defPol, defSide) {
  const log = [];

  // Accuracy check
  if (move.accuracy < 100) {
    if (Math.random() * 100 > move.accuracy) {
      log.push(`${attacker.name} used ${move.name}... but it missed!`);
      return { log, fainted: false };
    }
  }

  log.push(`${attacker.name} used ${move.name}!`);

  if (move.category === 'status') {
    // Apply status move effects
    if (move.effect) {
      const eff = move.effect;
      if (eff.status && !defender.status) {
        defender.status = eff.status;
        if (eff.status === 'sleep') defender.sleepTurns = Math.floor(Math.random() * 3) + 1;
        log.push(`${defender.name} was ${statusMsg(eff.status)}!`);
      } else if (eff.status && defender.status) {
        log.push(`But it failed! ${defender.name} already has a status condition.`);
      }
      if (eff.statBoost) {
        for (const [stat, stages] of Object.entries(eff.statBoost)) {
          const target = eff.self ? attacker : defender;
          const old = target.stages[stat] || 0;
          target.stages[stat] = Math.max(-6, Math.min(6, old + stages));
          const name = target.name;
          const statName = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' }[stat];
          if (stages > 0) log.push(`${name}'s ${statName} rose${stages > 1 ? ' sharply' : ''}!`);
          else log.push(`${name}'s ${statName} fell${stages < -1 ? ' harshly' : ''}!`);
        }
      }
      if (eff.heal) {
        const amt = Math.floor(attacker.stats.hp * eff.heal);
        attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + amt);
        log.push(`${attacker.name} restored HP!`);
      }
      if (eff.hazard) {
        if (eff.hazard === 'stealthRock' && !defSide.hazards.stealthRock) {
          defSide.hazards.stealthRock = true;
          log.push(`Pointed rocks float in the air around the opposing team!`);
        } else if (eff.hazard === 'spikes' && defSide.hazards.spikes < 3) {
          defSide.hazards.spikes++;
          log.push(`Spikes were scattered on the ground around the opposing team!`);
        } else if (eff.hazard === 'stickyWeb' && !defSide.hazards.stickyWeb) {
          defSide.hazards.stickyWeb = true;
          log.push(`A sticky web spreads out on the ground beneath the opposing team!`);
        } else {
          log.push(`But it failed!`);
        }
      }
    }
  } else {
    // Damage move
    const dmg = calcDamage(attacker, defender, move, atkPol, defPol);
    defender.currentHp = Math.max(0, defender.currentHp - dmg);

    const eff = getEffectiveness(move.type, defPol.types);
    if (eff >= 2) log.push(`It's super effective! (-${dmg} HP)`);
    else if (eff <= 0) log.push(`It has no effect...`);
    else if (eff < 1) log.push(`It's not very effective... (-${dmg} HP)`);
    else log.push(`(-${dmg} HP)`);

    // Secondary effects on damage moves
    if (move.effect) {
      const eff = move.effect;
      if (eff.chance && Math.random() * 100 > eff.chance) {
        // Effect didn't trigger
      } else {
        if (eff.status && !defender.status) {
          defender.status = eff.status;
          if (eff.status === 'sleep') defender.sleepTurns = Math.floor(Math.random() * 3) + 1;
          log.push(`${defender.name} was ${statusMsg(eff.status)}!`);
        }
        if (eff.flinch) {
          defender.flinch = true;
        }
        if (eff.statBoost) {
          for (const [stat, stages] of Object.entries(eff.statBoost)) {
            const target = eff.self ? attacker : defender;
            const old = target.stages[stat] || 0;
            target.stages[stat] = Math.max(-6, Math.min(6, old + stages));
            const name = target.name;
            const statName = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' }[stat];
            if (stages > 0) log.push(`${name}'s ${statName} rose!`);
            else log.push(`${name}'s ${statName} fell!`);
          }
        }
        if (eff.recoil) {
          const recoilDmg = Math.max(1, Math.floor(dmg * eff.recoil));
          attacker.currentHp = Math.max(0, attacker.currentHp - recoilDmg);
          log.push(`${attacker.name} was hurt by recoil! (-${recoilDmg} HP)`);
        }
      }
    }
  }

  const fainted = defender.currentHp <= 0;
  if (fainted) log.push(`${defender.name} fainted!`);

  return { log, fainted };
}

function statusMsg(s) {
  return {
    burn: 'burned',
    paralysis: 'paralyzed',
    poison: 'poisoned',
    toxic: 'badly poisoned',
    sleep: 'put to sleep',
  }[s] || s;
}

// ── AI LOGIC ────────────────────────────────────────────────────────────────
function aiChooseAction(aiTeam, aiActive, oppFighter, oppPol) {
  const fighter = aiTeam[aiActive];
  if (fighter.currentHp <= 0) {
    // Must switch - find best alive
    const alive = aiTeam.map((f, i) => ({ f, i })).filter(x => x.f.currentHp > 0 && x.i !== aiActive);
    if (alive.length === 0) return null;
    // Pick the one with best type matchup
    let best = alive[0];
    for (const a of alive) {
      const eff = getEffectiveness(a.f.types[0], oppPol.types);
      const bestEff = getEffectiveness(best.f.types[0], oppPol.types);
      if (eff > bestEff) best = a;
    }
    return { type: 'switch', index: best.i };
  }

  // Score each move
  let bestMove = null;
  let bestScore = -Infinity;
  for (let i = 0; i < fighter.moves.length; i++) {
    const m = fighter.moves[i];
    let score = 0;
    if (m.category !== 'status') {
      score = m.power * getEffectiveness(m.type, oppPol.types) * (m.accuracy / 100);
      if (fighter.types.includes(m.type)) score *= 1.5; // STAB
    } else {
      score = 30; // Base value for status moves
      if (m.effect && m.effect.hazard) score = 50;
      if (m.effect && m.effect.status === 'sleep') score = 60;
    }
    if (score > bestScore) { bestScore = score; bestMove = i; }
  }

  // Consider switching if matchup is terrible
  const alive = aiTeam.map((f, i) => ({ f, i })).filter(x => x.f.currentHp > 0 && x.i !== aiActive);
  if (alive.length > 0 && bestScore < 30) {
    for (const a of alive) {
      const switchScore = a.f.moves.reduce((max, m) => {
        if (m.category === 'status') return max;
        let s = m.power * getEffectiveness(m.type, oppPol.types) * (m.accuracy / 100);
        if (a.f.types.includes(m.type)) s *= 1.5;
        return Math.max(max, s);
      }, 0);
      if (switchScore > bestScore * 1.8) {
        return { type: 'switch', index: a.i };
      }
    }
  }

  return { type: 'move', index: bestMove || 0 };
}

function aiPickTeam(allPoliticians) {
  // Pick 6 random with decent type coverage
  const shuffled = [...allPoliticians].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6).map(p => p.id);
}

// ── PROCESS TURN ────────────────────────────────────────────────────────────
function processTurn(room, hostAction, guestAction, POLITICIANS) {
  const battle = room.battle;
  const log = [];
  const events = [];

  const hTeam = battle.hostTeam;
  const gTeam = battle.guestTeam;
  const hFighter = hTeam[battle.hostActive];
  const gFighter = gTeam[battle.guestActive];
  const hPol = POLITICIANS.find(p => p.id === hFighter.id);
  const gPol = POLITICIANS.find(p => p.id === gFighter.id);

  // Handle switches first
  let hostSwitched = false, guestSwitched = false;

  if (hostAction.type === 'switch') {
    battle.hostActive = hostAction.index;
    const newFighter = hTeam[hostAction.index];
    log.push(`${room.players.host.name} sent out ${newFighter.name}!`);
    const hazardMsgs = applyEntryHazards(newFighter, battle.hostSide, POLITICIANS.find(p => p.id === newFighter.id));
    log.push(...hazardMsgs);
    hostSwitched = true;
  }

  if (guestAction.type === 'switch') {
    battle.guestActive = guestAction.index;
    const newFighter = gTeam[guestAction.index];
    log.push(`${room.players.guest.name} sent out ${newFighter.name}!`);
    const hazardMsgs = applyEntryHazards(newFighter, battle.guestSide, POLITICIANS.find(p => p.id === newFighter.id));
    log.push(...hazardMsgs);
    guestSwitched = true;
  }

  // Now handle moves
  const hAtkFighter = hTeam[battle.hostActive];
  const gAtkFighter = gTeam[battle.guestActive];
  const hAtkPol = POLITICIANS.find(p => p.id === hAtkFighter.id);
  const gAtkPol = POLITICIANS.find(p => p.id === gAtkFighter.id);

  // Determine move order by speed
  let firstIsHost = true;
  if (hostAction.type === 'move' && guestAction.type === 'move') {
    const hSpeed = getEffSpeed(hAtkFighter);
    const gSpeed = getEffSpeed(gAtkFighter);
    firstIsHost = hSpeed >= gSpeed;
    if (hSpeed === gSpeed) firstIsHost = Math.random() > 0.5;
  }

  const actions = [];
  if (hostAction.type === 'move') {
    actions.push({ side: 'host', action: hostAction, fighter: hAtkFighter, pol: hAtkPol, opp: gAtkFighter, oppPol: gAtkPol, oppSide: battle.guestSide });
  }
  if (guestAction.type === 'move') {
    actions.push({ side: 'guest', action: guestAction, fighter: gAtkFighter, pol: gAtkPol, opp: hAtkFighter, oppPol: hAtkPol, oppSide: battle.hostSide });
  }

  // Sort by speed
  if (actions.length === 2 && !firstIsHost) actions.reverse();

  for (const act of actions) {
    if (act.fighter.currentHp <= 0) continue; // Already fainted

    const canActResult = canAct(act.fighter);
    if (canActResult.msg) log.push(canActResult.msg);
    if (!canActResult.can) continue;

    const move = act.fighter.moves[act.action.index];
    if (!move) continue;

    const result = executeMove(act.fighter, act.opp, move, act.pol, act.oppPol, act.oppSide);
    log.push(...result.log);

    if (result.fainted) {
      events.push({ type: 'fainted', side: act.side === 'host' ? 'guest' : 'host' });
    }
  }

  // End of turn status damage
  for (const f of [hTeam[battle.hostActive], gTeam[battle.guestActive]]) {
    if (f.currentHp > 0) {
      const statusMsgs = applyEndOfTurnStatus(f);
      log.push(...statusMsgs);
      if (f.currentHp <= 0) {
        log.push(`${f.name} fainted!`);
        const side = hTeam.includes(f) ? 'host' : 'guest';
        events.push({ type: 'fainted', side });
      }
    }
  }

  // Check for winner
  const hostAlive = hTeam.filter(f => f.currentHp > 0).length;
  const guestAlive = gTeam.filter(f => f.currentHp > 0).length;

  let winner = null;
  if (hostAlive === 0 && guestAlive === 0) winner = 'draw';
  else if (hostAlive === 0) winner = 'guest';
  else if (guestAlive === 0) winner = 'host';

  battle.turnLog = log;
  battle.turn++;

  return { log, events, winner };
}

// ── INIT BATTLE ─────────────────────────────────────────────────────────────
function initBattle(room, hostTeamIds, guestTeamIds, POLITICIANS) {
  const hostTeam = hostTeamIds.map(id => createFighter(POLITICIANS.find(p => p.id === id)));
  const guestTeam = guestTeamIds.map(id => createFighter(POLITICIANS.find(p => p.id === id)));

  room.battle = {
    hostTeam,
    guestTeam,
    hostActive: 0,
    guestActive: 0,
    hostSide: { hazards: { stealthRock: false, spikes: 0, stickyWeb: false } },
    guestSide: { hazards: { stealthRock: false, spikes: 0, stickyWeb: false } },
    turn: 1,
    turnLog: [],
    hostAction: null,
    guestAction: null,
  };

  room.state = 'battling';
  return room.battle;
}

module.exports = function attachBattleSocket(io) {
  // We'll import politicians data
  const POLITICIANS = require('./politiData');

  const battleNs = io.of('/politibattle');

  battleNs.on('connection', socket => {
    console.log('[PolitiBattle] Socket connected:', socket.id);

    // ── CREATE ROOM ──────────────────────────────────────────────────────
    socket.on('battle:create', (data, cb) => {
      const name = data.name || 'Player 1';
      const id = data.userId || socket.id;
      const room = rooms.createRoom(id, name);
      room.players.host.socketId = socket.id;
      socket.join(room.code);
      cb({ code: room.code });
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────
    socket.on('battle:join', (data, cb) => {
      const { code, name, userId } = data;
      const result = rooms.joinRoom(code, userId || socket.id, name || 'Player 2');
      if (result.error) return cb({ error: result.error });
      result.room.players.guest.socketId = socket.id;
      socket.join(code);
      cb({ success: true, hostName: result.room.players.host.name });
      // Notify host
      battleNs.to(code).emit('battle:playerJoined', { guestName: name });
      // Move to team select
      result.room.state = 'team_select';
      battleNs.to(code).emit('battle:teamSelect', {
        politicians: POLITICIANS.map(p => ({
          id: p.id, name: p.name, types: p.types, stats: p.stats, emoji: p.emoji,
          moves: p.moves.map(m => ({ name: m.name, type: m.type, category: m.category, power: m.power, accuracy: m.accuracy })),
          title: p.title, flavor: p.flavor,
        })),
      });
    });

    // ── START AI BATTLE ──────────────────────────────────────────────────
    socket.on('battle:startAI', (data, cb) => {
      const { code } = data;
      const room = rooms.getRoom(code);
      if (!room) return cb({ error: 'Room not found' });
      rooms.startAIBattle(code);
      room.state = 'team_select';
      cb({ success: true });
      battleNs.to(code).emit('battle:teamSelect', {
        politicians: POLITICIANS.map(p => ({
          id: p.id, name: p.name, types: p.types, stats: p.stats, emoji: p.emoji,
          moves: p.moves.map(m => ({ name: m.name, type: m.type, category: m.category, power: m.power, accuracy: m.accuracy })),
          title: p.title, flavor: p.flavor,
        })),
      });
    });

    // ── TEAM SELECTED ────────────────────────────────────────────────────
    socket.on('battle:teamReady', (data) => {
      const { code, team } = data;
      const room = rooms.getRoom(code);
      if (!room) return;

      if (room.players.host.socketId === socket.id) {
        room.players.host.team = team;
        room.players.host.ready = true;
      } else if (room.players.guest && room.players.guest.socketId === socket.id) {
        room.players.guest.team = team;
        room.players.guest.ready = true;
      }

      // AI picks team automatically
      if (room.ai && room.players.host.ready && !room.players.guest.ready) {
        room.players.guest.team = aiPickTeam(POLITICIANS);
        room.players.guest.ready = true;
      }

      if (room.players.host.ready && room.players.guest && room.players.guest.ready) {
        const battle = initBattle(room, room.players.host.team, room.players.guest.team, POLITICIANS);
        battleNs.to(code).emit('battle:start', {
          hostTeam: battle.hostTeam.map(sanitizeFighter),
          guestTeam: battle.guestTeam.map(f => ({ name: f.name, emoji: f.emoji, types: f.types, currentHp: f.currentHp, stats: { hp: f.stats.hp } })),
          hostActive: 0,
          guestActive: 0,
          turn: 1,
        });
      }
    });

    // ── TURN ACTION ──────────────────────────────────────────────────────
    socket.on('battle:action', (data) => {
      const { code, action } = data; // action: { type: 'move'|'switch', index: N }
      const room = rooms.getRoom(code);
      if (!room || room.state !== 'battling') return;

      const battle = room.battle;
      if (room.players.host.socketId === socket.id) {
        battle.hostAction = action;
      } else if (room.players.guest && room.players.guest.socketId === socket.id) {
        battle.guestAction = action;
      }

      // AI acts
      if (room.ai && battle.hostAction && !battle.guestAction) {
        const gFighter = battle.guestTeam[battle.guestActive];
        const hFighter = battle.hostTeam[battle.hostActive];
        const hPol = POLITICIANS.find(p => p.id === hFighter.id);
        battle.guestAction = aiChooseAction(battle.guestTeam, battle.guestActive, hFighter, hPol);
      }

      if (battle.hostAction && battle.guestAction) {
        const result = processTurn(room, battle.hostAction, battle.guestAction, POLITICIANS);

        // Check if someone needs to switch due to faint
        let hostNeedsSwitch = battle.hostTeam[battle.hostActive].currentHp <= 0 && battle.hostTeam.some(f => f.currentHp > 0);
        let guestNeedsSwitch = battle.guestTeam[battle.guestActive].currentHp <= 0 && battle.guestTeam.some(f => f.currentHp > 0);

        battleNs.to(code).emit('battle:turnResult', {
          log: result.log,
          hostTeam: battle.hostTeam.map(sanitizeFighter),
          guestTeam: battle.guestTeam.map(f => ({ name: f.name, emoji: f.emoji, types: f.types, currentHp: f.currentHp, stats: { hp: f.stats.hp }, status: f.status })),
          hostActive: battle.hostActive,
          guestActive: battle.guestActive,
          winner: result.winner,
          hostNeedsSwitch,
          guestNeedsSwitch,
        });

        // AI auto-switch if needed
        if (room.ai && guestNeedsSwitch && !result.winner) {
          const alive = battle.guestTeam.map((f, i) => ({ f, i })).filter(x => x.f.currentHp > 0);
          if (alive.length > 0) {
            battle.guestActive = alive[0].i;
            setTimeout(() => {
              battleNs.to(code).emit('battle:switched', {
                side: 'guest',
                index: battle.guestActive,
                name: battle.guestTeam[battle.guestActive].name,
              });
            }, 500);
          }
        }

        if (result.winner) {
          room.state = 'finished';
        }

        battle.hostAction = null;
        battle.guestAction = null;
      }
    });

    // ── FORCE SWITCH (after faint) ───────────────────────────────────────
    socket.on('battle:switch', (data) => {
      const { code, index } = data;
      const room = rooms.getRoom(code);
      if (!room || !room.battle) return;

      const battle = room.battle;
      if (room.players.host.socketId === socket.id) {
        if (battle.hostTeam[index] && battle.hostTeam[index].currentHp > 0) {
          battle.hostActive = index;
          const newFighter = battle.hostTeam[index];
          const pol = POLITICIANS.find(p => p.id === newFighter.id);
          const hazardMsgs = applyEntryHazards(newFighter, battle.hostSide, pol);
          battleNs.to(code).emit('battle:switched', {
            side: 'host', index, name: newFighter.name, hazardLog: hazardMsgs,
            hp: newFighter.currentHp, maxHp: newFighter.stats.hp,
          });
        }
      } else {
        if (battle.guestTeam[index] && battle.guestTeam[index].currentHp > 0) {
          battle.guestActive = index;
          const newFighter = battle.guestTeam[index];
          const pol = POLITICIANS.find(p => p.id === newFighter.id);
          const hazardMsgs = applyEntryHazards(newFighter, battle.guestSide, pol);
          battleNs.to(code).emit('battle:switched', {
            side: 'guest', index, name: newFighter.name, hazardLog: hazardMsgs,
            hp: newFighter.currentHp, maxHp: newFighter.stats.hp,
          });
        }
      }
    });

    // ── VALIDATE CODE ────────────────────────────────────────────────────
    socket.on('battle:validate', (data, cb) => {
      const room = rooms.getRoom(data.code);
      if (!room) return cb({ error: 'Room not found' });
      if (room.state !== 'waiting') return cb({ error: 'Game already started' });
      if (room.players.guest) return cb({ error: 'Room is full' });
      cb({ valid: true, hostName: room.players.host.name });
    });

    socket.on('disconnect', () => {
      // TODO: handle disconnect/reconnect
    });
  });
};

function sanitizeFighter(f) {
  return {
    name: f.name, emoji: f.emoji, types: f.types,
    currentHp: f.currentHp, stats: { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spa: f.stats.spa, spd: f.stats.spd, spe: f.stats.spe },
    moves: f.moves.map(m => ({ name: m.name, type: m.type, category: m.category, power: m.power, accuracy: m.accuracy, description: m.description })),
    status: f.status, stages: f.stages, id: f.id,
  };
}
