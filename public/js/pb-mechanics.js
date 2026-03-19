// PolitiBattle Module — pb-mechanics — loaded by politibattle.html, arena.html, politibattle-multi.html
// Wires together pb-engine.js with full game loop logic.
// Reads window.PBEngine and window.PBData.
'use strict';

window.PBMechanics = {

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  _log(battle, msg, type = 'info') {
    window.PBEngine._log(battle, msg, type);
  },

  _evt(type, actor, extra = {}) {
    return { type, actor, target: null, move: null, dmg: 0, eff: 1,
             isCrit: false, hitCount: 1, statusApplied: null,
             stageChanged: null, msg: '', ...extra };
  },

  // ─── STRUGGLE CHECK ──────────────────────────────────────────────────────────
  needsStruggle(fighter) {
    return fighter.mvs.every(mv => mv.cpp <= 0);
  },

  // ─── FREEZE THAW CHECK ───────────────────────────────────────────────────────
  checkFreeze(fighter, incomingMoveType) {
    if (fighter.status !== 'freeze') return false;
    // Green-type moves always thaw
    const thawed = incomingMoveType === 'Green' || Math.random() < 0.20;
    if (thawed) {
      fighter.status = null;
    }
    return thawed;
  },

  // ─── CONFUSION HIT CHECK ─────────────────────────────────────────────────────
  checkConfusion(fighter, battle) {
    if (!fighter.confused) return null;
    if (Math.random() >= 0.33) return null; // didn't hit self

    // Typeless 40-base physical self-hit
    const E = window.PBEngine;
    const selfMv = { id: '__confuse__', n: 'Confusion', tp: 'Centrist',
                     c: 'physical', pw: 40, ac: null, pp: 1, cpp: 1, pri: 0,
                     hits: null, ef: null };
    const { dmg } = E.calcDmg(fighter, fighter, selfMv, battle.weather);
    E.applyDmg(fighter, dmg, battle);
    E._log(battle, `${fighter.n} hurt itself in confusion!`, 'status');

    return this._evt('confuse-self', fighter.id, { dmg, msg: `${fighter.n} hurt itself in confusion!` });
  },

  // ─── APPLY MOVE EFFECTS ──────────────────────────────────────────────────────
  _applyMoveEffects(attacker, defender, move, dmgDealt, battle, events) {
    const ef = move.ef;
    if (!ef) return;
    const E = window.PBEngine;

    // ── Stat stage: up (attacker) ──
    if (ef.up) {
      for (const [stat, delta] of Object.entries(ef.up)) {
        const actual = E.changeStage(attacker, stat, delta);
        if (actual !== 0) {
          const dir = actual > 0 ? 'rose' : 'fell';
          E._log(battle, `${attacker.n}'s ${stat} ${dir}!`, 'info');
          events.push(this._evt('stage', attacker.id, { stageChanged: { stat, delta: actual } }));
        }
      }
    }

    // ── Stat stage: dn (defender) ──
    if (ef.dn) {
      for (const [stat, delta] of Object.entries(ef.dn)) {
        const actual = E.changeStage(defender, stat, delta);
        if (actual !== 0) {
          const dir = actual > 0 ? 'rose' : 'fell';
          E._log(battle, `${defender.n}'s ${stat} ${dir}!`, 'info');
          events.push(this._evt('stage', defender.id, { stageChanged: { stat, delta: actual } }));
        }
      }
    }

    // ── Stat stage: dnSelf (attacker lowers own stats) ──
    if (ef.dnSelf) {
      for (const [stat, delta] of Object.entries(ef.dnSelf)) {
        const actual = E.changeStage(attacker, stat, delta);
        if (actual !== 0) {
          E._log(battle, `${attacker.n}'s ${stat} fell!`, 'info');
          events.push(this._evt('stage', attacker.id, { stageChanged: { stat, delta: actual } }));
        }
      }
    }

    // ── Status on defender ──
    if (ef.status) {
      const roll = ef.chance != null ? Math.random() * 100 < ef.chance : true;
      if (roll) {
        // Private Server blocks Republican-type status
        if (defender.itm === 'privateServer' && move.tp === 'Republican') {
          E._log(battle, `${defender.n}'s Private Server blocked the status!`, 'info');
        } else if (ef.status === 'confusion') {
          const applied = E.applyConfusion(defender);
          if (applied) {
            E._log(battle, `${defender.n} became confused!`, 'status');
            events.push(this._evt('status', defender.id, { statusApplied: 'confusion' }));
          }
        } else {
          const applied = E.applyStatus(defender, ef.status, move.tp, battle);
          if (applied) {
            events.push(this._evt('status', defender.id, { statusApplied: ef.status }));
          }
        }
      }
    }

    // ── Status on self (statusSelf) ──
    if (ef.statusSelf) {
      const roll = ef.chanceSelf != null ? Math.random() * 100 < ef.chanceSelf : true;
      if (roll) {
        E.applyStatus(attacker, ef.statusSelf, move.tp, battle);
        events.push(this._evt('status', attacker.id, { statusApplied: ef.statusSelf }));
      }
    }

    // ── Heal (heals attacker %) ──
    if (ef.heal) {
      const healAmt = Math.floor(attacker.mhp * ef.heal);
      E.heal(attacker, healAmt);
      E._log(battle, `${attacker.n} restored HP!`, 'heal');
      events.push(this._evt('heal', attacker.id, { dmg: -healAmt }));
    }

    // ── Drain (heals attacker from damage dealt) ──
    if (ef.drain && dmgDealt > 0) {
      const drainAmt = Math.floor(dmgDealt * ef.drain);
      E.heal(attacker, drainAmt);
      E._log(battle, `${attacker.n} drained energy from ${defender.n}!`, 'heal');
      events.push(this._evt('heal', attacker.id, { dmg: -drainAmt }));
    }

    // ── Recoil (damages attacker) ──
    if (ef.recoil && dmgDealt > 0) {
      const recoilAmt = Math.floor(attacker.mhp * ef.recoil);
      E.applyDmg(attacker, recoilAmt, battle);
      E._log(battle, `${attacker.n} is hurt by recoil!`, 'info');
      events.push(this._evt('recoil', attacker.id, { dmg: recoilAmt }));
    }

    // ── Hazard setup ──
    if (ef.hz) {
      const side = attacker.isPlayer ? battle.aHz : battle.pHz;
      if (!side.includes(ef.hz)) {
        side.push(ef.hz);
        E._log(battle, `${ef.hz} was set on the opposing side!`, 'info');
        events.push(this._evt('hazard', attacker.id, { msg: `${ef.hz} set` }));
      }
    }

    // ── Weather ──
    if (ef.weather) {
      battle.weather = ef.weather;
      battle.wT = ef.wT != null ? ef.wT : 5;
      E._log(battle, `The weather became ${ef.weather}!`, 'weather');
      events.push(this._evt('weather', attacker.id, { msg: ef.weather }));
    }

    // ── Clear hazards on defender's side ──
    if (ef.clearHz) {
      const side = defender.isPlayer ? battle.pHz : battle.aHz;
      if (side.length > 0) {
        if (defender.isPlayer) battle.pHz = [];
        else battle.aHz = [];
        E._log(battle, `Hazards on ${defender.n}'s side were cleared!`, 'info');
        events.push(this._evt('clearHz', attacker.id, {}));
      }
    }

    // ── Flinch ──
    if (ef.flinch) {
      const roll = ef.chance != null ? Math.random() * 100 < ef.chance : true;
      if (roll) {
        defender.flinched = true;
      }
    }

    // ── Trump deport tele: force switch-out target to random slot ──
    if (move.id === 'deportTele') {
      const team = defender.isPlayer ? battle.pTeam : battle.aTeam;
      const aliveSlots = team
        .map((f, i) => ({ f, i }))
        .filter(({ f, i }) =>
          !f.fainted &&
          i !== (defender.isPlayer ? battle.pIdx : battle.aIdx)
        );
      if (aliveSlots.length > 0) {
        const { i: newIdx } = aliveSlots[Math.floor(Math.random() * aliveSlots.length)];
        const outFighter = defender;
        E.switchOut(outFighter);
        if (defender.isPlayer) battle.pIdx = newIdx;
        else battle.aIdx = newIdx;
        const newFighter = defender.isPlayer ? battle.pTeam[battle.pIdx] : battle.aTeam[battle.aIdx];
        const hazards = defender.isPlayer ? battle.pHz : battle.aHz;
        E.switchIn(newFighter, attacker, hazards, battle);
        E._log(battle, `${outFighter.n} was deported! ${newFighter.n} was sent out!`, 'status');
        events.push(this._evt('forced-switch', defender.id,
          { msg: `${outFighter.n} deported → ${newFighter.n}` }));
      }
    }
  },

  // ─── ITEM CALLBACKS ──────────────────────────────────────────────────────────

  fireItemOnTurnEnd(fighter, battle, events) {
    if (!fighter.itm || fighter.fainted) return;
    const E = window.PBEngine;
    const itm = fighter.itm;

    // Heal 1/16 regen items — already handled in pb-engine.endOfTurn,
    // but we push events here for UI if called separately.
    const REGEN_ITEMS = ['halliburton', 'cigar', 'holyWater', 'campaignFunds'];
    if (REGEN_ITEMS.includes(itm)) {
      // Engine handles the actual healing; emit event for UI
      events.push(this._evt('item-heal', fighter.id, { msg: `${fighter.n} healed from ${itm}` }));
    }
    // beret / senateKnife handled at calcDmg level — no turn-end event needed
  },

  fireItemOnBeingHit(attacker, defender, move, battle, events) {
    if (!defender.itm || defender.fainted) return;
    const E = window.PBEngine;
    const itm = defender.itm;

    // Rocky Helmet variants: deal 15% attacker max HP on physical contact
    const ROCKY = ['robbenRock', 'ironBriefcase', 'scandalRock'];
    if (ROCKY.includes(itm) && move.c === 'physical') {
      const dmg = Math.floor(attacker.mhp * 0.15);
      E.applyDmg(attacker, dmg, battle);
      E._log(battle, `${attacker.n} was hurt by ${defender.n}'s ${itm}!`, 'info');
      events.push(this._evt('item-recoil', defender.id, { dmg, target: attacker.id }));
    }

    // twitterBlue: +10% flinch chance baked into move execution — no extra event needed here
  },

  fireItemOnLowHP(fighter, battle, events) {
    if (!fighter.itm || fighter._itemConsumed || fighter.fainted) return;
    const E = window.PBEngine;
    const itm = fighter.itm;

    // jellyBeans / amazonPrime: heal 25% if HP drops below 50%
    if ((itm === 'jellyBeans' || itm === 'amazonPrime') && fighter.hp < fighter.mhp * 0.5) {
      const healAmt = Math.floor(fighter.mhp * 0.25);
      E.heal(fighter, healAmt);
      fighter._itemConsumed = true;
      fighter.itm = null;
      E._log(battle, `${fighter.n} ate its ${itm} and recovered HP!`, 'heal');
      events.push(this._evt('item-heal', fighter.id, { dmg: -healAmt }));
    }

    // nuclearFball: survive a KO at full HP with 1 HP — handled in applyDmg (engine)
    // Just emit the event if it triggered
    if (itm === 'nuclearFball' && fighter._enduUsed && fighter.hp === 1) {
      events.push(this._evt('item-endure', fighter.id, { msg: `${fighter.n} held on with Nuclear Football!` }));
    }
  },

  // ─── ABILITY CALLBACKS ───────────────────────────────────────────────────────

  fireAbilityOnSwitchIn(fighter, foe, battle, events) {
    const abl = fighter.abl;
    if (!abl) return;
    const E = window.PBEngine;

    // Most switch-in ability effects are already fired by PBEngine.switchIn().
    // Here we supplement with event objects for the UI and cover any gaps.

    if (abl === 'hopeAndChange') {
      events.push(this._evt('stage', fighter.id, { stageChanged: { stat: 'spa', delta: 1 } }));
    }
    if (abl === 'socialCredit' && foe && !foe.fainted) {
      events.push(this._evt('stage', foe.id, { stageChanged: { stat: 'atk', delta: -1 } }));
    }
    if (abl === 'morningAmerica') {
      battle.weather = 'sunny';
      battle.wT = 0; // permanent — wT=0 means don't count down
      events.push(this._evt('weather', fighter.id, { msg: 'sunny' }));
    }
    if (abl === 'greatLeap') {
      events.push(this._evt('stage', fighter.id, { stageChanged: { stat: 'atk', delta: 1 } }));
      events.push(this._evt('stage', fighter.id, { stageChanged: { stat: 'spa', delta: 1 } }));
    }
    if (abl === 'flipFlopper') {
      events.push(this._evt('stage', fighter.id, { stageChanged: { stat: 'spa', delta: 1 } }));
    }
    if (abl === 'marALagoDef') {
      events.push(this._evt('ability', fighter.id, { msg: `${fighter.n} cleared stat drops!` }));
    }
    if ((abl === 'intimidate' || abl === 'napoleon') && foe && !foe.fainted) {
      // Engine already applied stage change; push event for UI
      events.push(this._evt('stage', foe.id, { stageChanged: { stat: 'atk', delta: -1 } }));
    }
    if (abl === 'algorithmAbl' && foe) {
      const moves = foe.mvs.map(m => m.n).join(', ');
      E._log(battle, `${fighter.n}'s Algorithm reveals: ${moves}`, 'info');
      events.push(this._evt('ability', fighter.id, { msg: `Scanned: ${moves}` }));
    }
  },

  fireAbilityOnTurnEnd(fighter, battle, events) {
    if (!fighter.abl || fighter.fainted) return;
    const E = window.PBEngine;
    const abl = fighter.abl;

    // enMarche / aquaBuddha: +1 Speed if below +6
    if ((abl === 'enMarche' || abl === 'aquaBuddha') && fighter.stg.spe < 6) {
      const actual = E.changeStage(fighter, 'spe', 1);
      if (actual !== 0) {
        E._log(battle, `${fighter.n}'s ${abl === 'enMarche' ? 'En Marche' : 'Aqua Buddha'} raised Speed!`, 'info');
        events.push(this._evt('stage', fighter.id, { stageChanged: { stat: 'spe', delta: actual } }));
      }
    }

    // newDealHP: heal 1/8 max HP
    if (abl === 'newDealHP') {
      const healAmt = Math.floor(fighter.mhp / 8);
      E.heal(fighter, healAmt);
      E._log(battle, `${fighter.n}'s New Deal recovered HP!`, 'heal');
      events.push(this._evt('heal', fighter.id, { dmg: -healAmt }));
    }

    // sorryNotSorry: heal 1/10 max HP
    if (abl === 'sorryNotSorry') {
      const healAmt = Math.floor(fighter.mhp / 10);
      E.heal(fighter, healAmt);
      E._log(battle, `${fighter.n}'s Sorry Not Sorry recovered HP!`, 'heal');
      events.push(this._evt('heal', fighter.id, { dmg: -healAmt }));
    }

    // povopower: +1 SpAtk if below +6
    if (abl === 'povopower' && fighter.stg.spa < 6) {
      const actual = E.changeStage(fighter, 'spa', 1);
      if (actual !== 0) {
        E._log(battle, `${fighter.n}'s Povo Power raised SpAtk!`, 'info');
        events.push(this._evt('stage', fighter.id, { stageChanged: { stat: 'spa', delta: actual } }));
      }
    }
  },

  fireAbilityOnSwitchOut(fighter, battle, events) {
    if (!fighter.abl || fighter.fainted) return;
    const E = window.PBEngine;
    const abl = fighter.abl;

    // sorryNotSorry / newDealHP with regenerator tag → heal 33% HP on switch-out
    if (abl === 'sorryNotSorry' || abl === 'newDealHP') {
      const healAmt = Math.floor(fighter.mhp * 0.33);
      E.heal(fighter, healAmt);
      E._log(battle, `${fighter.n} recovered HP on switch-out!`, 'heal');
      events.push(this._evt('heal', fighter.id, { dmg: -healAmt }));
    }
  },

  fireAbilityOnBeingHit(attacker, defender, dmg, move, battle, events) {
    if (!defender.abl || defender.fainted) return;
    const E = window.PBEngine;
    const abl = defender.abl;

    // clapBack: if physical hit, deal 30% dmg back to attacker
    if (abl === 'clapBack' && move.c === 'physical' && !attacker.fainted) {
      const retDmg = Math.floor(dmg * 0.30);
      if (retDmg > 0) {
        E.applyDmg(attacker, retDmg, battle);
        E._log(battle, `${defender.n}'s Clap Back hurt ${attacker.n}!`, 'info');
        events.push(this._evt('ability-recoil', defender.id, { dmg: retDmg }));
      }
    }

    // onceAgainAsking: heal 10% of damage taken
    if (abl === 'onceAgainAsking' && dmg > 0) {
      const healAmt = Math.floor(dmg * 0.10);
      E.heal(defender, healAmt);
      E._log(battle, `${defender.n} is once again asking for HP!`, 'heal');
      events.push(this._evt('heal', defender.id, { dmg: -healAmt }));
    }

    // longWalkEndure: survive KO at 1 HP up to 2 times — handled in applyDmg, push event
    if (abl === 'longWalkEndure' && defender.hp === 1 && defender._rlUsed > 0) {
      events.push(this._evt('ability-endure', defender.id,
        { msg: `${defender.n} endured with Long Walk! (${defender._rlUsed}/2)` }));
    }

    // nonViolence: 30% avoid (rolled before damage in _executeAction) — no post-hit event
    // flyImmunity / papalImmunity: immune to Authoritarian status moves — checked in _executeAction
    // undisclosedLoc: 30% evasion — checked in _executeAction
    // turtleDefense: 75% damage modifier applied in calcDmg — no event here
  },

  // fireAbilityOnMove: modifies attacker's effective move before execution
  fireAbilityOnMove(attacker, move, battle) {
    // Returns a shallow-cloned move with any ability adjustments applied
    let m = { ...move };
    const abl = attacker.abl;

    // shockAndAwe: first move gets +1 priority
    if (abl === 'shockAndAwe' && !attacker._firstMoved) {
      m = { ...m, pri: (m.pri || 0) + 1 };
    }

    // tShirtFame: if any team member has fainted this battle, +1 Atk (once per KO)
    // Track via _tShirtBoosts on the fighter; actual stat change applied here
    if (abl === 'tShirtFame') {
      const team = attacker.isPlayer ? battle.pTeam : battle.aTeam;
      const faintCount = team.filter(f => f.fainted).length;
      const boosted = attacker._tShirtBoosts || 0;
      if (faintCount > boosted) {
        const delta = faintCount - boosted;
        window.PBEngine.changeStage(attacker, 'atk', delta);
        attacker._tShirtBoosts = faintCount;
        window.PBEngine._log(battle, `${attacker.n}'s T-Shirt Fame raised Attack!`, 'info');
      }
    }

    // veniVidiViciAbl: first move always crits (flag set in calcDmg via _firstMoved check)
    // camelotCrits / fourScoreCrits: handled in calcDmg
    // kgbTraining: crits and accuracy handled in calcDmg / _executeAction

    return m;
  },

  // ─── EXECUTE A SINGLE ACTION ─────────────────────────────────────────────────

  async _executeAction(battle, actorSide, action, events) {
    const E = window.PBEngine;
    const isPlayer = actorSide === 'player';
    const attacker = isPlayer ? battle.pTeam[battle.pIdx] : battle.aTeam[battle.aIdx];
    const defender  = isPlayer ? battle.aTeam[battle.aIdx] : battle.pTeam[battle.pIdx];

    if (!attacker || attacker.fainted) return;

    // ── SWITCH action ──
    if (action.type === 'switch') {
      const team = isPlayer ? battle.pTeam : battle.aTeam;
      const newFighter = team[action.idx];
      if (!newFighter || newFighter.fainted || action.idx === (isPlayer ? battle.pIdx : battle.aIdx)) return;

      // Fire switch-out ability / regen
      this.fireAbilityOnSwitchOut(attacker, battle, events);
      E.switchOut(attacker);

      if (isPlayer) battle.pIdx = action.idx;
      else          battle.aIdx = action.idx;

      const hazards = isPlayer ? battle.pHz : battle.aHz;
      E.switchIn(newFighter, defender, hazards, battle);
      this.fireAbilityOnSwitchIn(newFighter, defender, battle, events);

      events.push(this._evt('switch', newFighter.id, {
        msg: `${attacker.n} switched out for ${newFighter.n}!`,
      }));
      return;
    }

    // ── MOVE action ──
    if (attacker.flinched) {
      attacker.flinched = false;
      E._log(battle, `${attacker.n} flinched and couldn't move!`, 'status');
      events.push(this._evt('flinch', attacker.id, { msg: `${attacker.n} flinched!` }));
      return;
    }

    // Frozen check
    if (attacker.status === 'freeze') {
      const thawed = this.checkFreeze(attacker, null);
      if (thawed) {
        E._log(battle, `${attacker.n} thawed out!`, 'status');
        events.push(this._evt('thaw', attacker.id, {}));
      } else {
        E._log(battle, `${attacker.n} is frozen solid!`, 'status');
        events.push(this._evt('frozen', attacker.id, {}));
        return;
      }
    }

    // Sleep check
    if (attacker.status === 'sleep') {
      attacker.sleepTurns--;
      if (attacker.sleepTurns <= 0) {
        attacker.status = null;
        E._log(battle, `${attacker.n} woke up!`, 'status');
        events.push(this._evt('wake', attacker.id, {}));
      } else {
        E._log(battle, `${attacker.n} is fast asleep!`, 'status');
        events.push(this._evt('sleep', attacker.id, {}));
        return;
      }
    }

    // Paralysis full-para check (25%)
    if (attacker.status === 'paralysis' && Math.random() < 0.25) {
      E._log(battle, `${attacker.n} is fully paralyzed!`, 'status');
      events.push(this._evt('paralyzed', attacker.id, {}));
      return;
    }

    // Confusion self-hit check
    if (attacker.confused) {
      const confEv = this.checkConfusion(attacker, battle);
      if (confEv) {
        events.push(confEv);
        if (attacker.fainted) return;
        return; // used turn hurting self
      }
    }

    // floridaMan: immune to confusion (no confusion move through regardless)
    // Already won't be confused if ability applied correctly, belt-and-suspenders skip

    // Determine move
    let move;
    if (this.needsStruggle(attacker)) {
      move = E.getStruggle();
    } else {
      move = attacker.mvs[action.idx];
    }

    if (!move) return;

    // Choice lock enforcement
    if (attacker._choiceLocked && attacker.itm &&
        ['magaHat', 'choiceScarf', 'choiceSpecs', 'choiceBand'].includes(attacker.itm)) {
      if (attacker._choiceLocked !== move.id) {
        // Force the locked move
        const lockedMv = attacker.mvs.find(m => m.id === attacker._choiceLocked);
        if (lockedMv && lockedMv.cpp > 0) {
          move = lockedMv;
        }
      }
    }

    // Apply ability move modifiers
    move = this.fireAbilityOnMove(attacker, move, battle);

    // Pressure: target's ability uses 2 PP
    if (defender.abl === 'pressure' && move.cpp > 0) {
      move.cpp = Math.max(0, move.cpp - 1); // extra PP drain
    }

    // Deduct PP (skip for Struggle)
    if (move.id !== 'struggle') {
      const realMv = attacker.mvs.find(m => m.id === move.id);
      if (realMv && realMv.cpp > 0) realMv.cpp--;
    }

    // Set choice lock on first use
    if (!attacker._choiceLocked && attacker.itm &&
        ['magaHat', 'choiceScarf', 'choiceSpecs', 'choiceBand'].includes(attacker.itm)) {
      attacker._choiceLocked = move.id;
    }

    // undisclosedLoc: 30% evasion
    if (defender.abl === 'undisclosedLoc' && Math.random() < 0.30) {
      E._log(battle, `${attacker.n}'s attack missed ${defender.n}!`, 'miss');
      events.push(this._evt('miss', attacker.id, { move, msg: `${attacker.n}'s move missed!` }));
      return;
    }

    // flyImmunity / papalImmunity: immune to Authoritarian status moves
    if ((defender.abl === 'flyImmunity' || defender.abl === 'papalImmunity') &&
        move.tp === 'Authoritarian' && move.c === 'status') {
      E._log(battle, `${defender.n} is immune to ${move.n}!`, 'info');
      events.push(this._evt('immune', defender.id, { move }));
      return;
    }

    // nonViolence: 30% chance to avoid physical moves
    if (defender.abl === 'nonViolence' && move.c === 'physical' && Math.random() < 0.30) {
      E._log(battle, `${defender.n}'s Non-Violence avoided the attack!`, 'info');
      events.push(this._evt('dodge', defender.id, { move }));
      return;
    }

    // Accuracy check (null ac = never misses; kgbTraining status moves never miss)
    if (move.ac !== null) {
      const bypassAcc = attacker.abl === 'kgbTraining' && move.c === 'status';
      if (!bypassAcc) {
        const accMod = (attacker.stg.acc || 0) - (defender.stg.eva || 0);
        const STAGE_ACC = { '-6': 0.33, '-5': 0.36, '-4': 0.43, '-3': 0.5,
                            '-2': 0.6,  '-1': 0.75,  '0': 1, '1': 1.33,
                             '2': 1.67,  '3': 2,     '4': 2.33, '5': 2.67, '6': 3 };
        const accMulti = STAGE_ACC[String(Math.max(-6, Math.min(6, accMod)))] || 1;
        if (Math.random() * 100 > move.ac * accMulti) {
          E._log(battle, `${attacker.n}'s ${move.n} missed!`, 'miss');
          events.push(this._evt('miss', attacker.id, { move, msg: `${attacker.n}'s ${move.n} missed!` }));
          return;
        }
      }
    }

    // ── Calculate & apply damage ──
    const { dmg, isCrit, eff, hitCount } = E.calcDmg(
      attacker, defender, move, battle.weather
    );

    let actualDmg = 0;
    if (dmg > 0) {
      // Item: twitterBlue adds 10% flinch chance
      let extraFlinchChance = 0;
      if (attacker.itm === 'twitterBlue') extraFlinchChance = 10;

      actualDmg = E.applyDmg(defender, dmg, battle);
      battle.stats[isPlayer ? 'pDmgDealt' : 'aDmgDealt'] += actualDmg;
      if (isCrit) battle.stats[isPlayer ? 'pCrits' : 'aCrits']++;

      // Log type effectiveness
      if (eff > 1)      E._log(battle, `It's super effective!`, 'eff');
      else if (eff < 1 && eff > 0) E._log(battle, `It's not very effective…`, 'eff');
      else if (eff === 0)           E._log(battle, `It doesn't affect ${defender.n}…`, 'eff');
      if (isCrit)       E._log(battle, `A critical hit!`, 'crit');

      // fourScoreCrits: crit deals 3x instead of 1.5x — apply bonus on top
      if (isCrit && attacker.abl === 'fourScoreCrits') {
        const bonus = Math.floor(actualDmg * 1.0); // extra 100% = 2x extra on the base = 3x total
        E.applyDmg(defender, bonus, battle);
        actualDmg += bonus;
      }

      events.push(this._evt('move', attacker.id, {
        target: defender.id, move, dmg: actualDmg, eff, isCrit, hitCount,
        msg: `${attacker.n} used ${move.n}!`,
      }));

      // KO tracking
      if (defender.fainted) {
        battle.stats[isPlayer ? 'pKOs' : 'aKOs']++;
        events.push(this._evt('ko', defender.id, { msg: `${defender.n} fainted!` }));
      }

      // Item: being-hit callbacks
      if (!defender.fainted) {
        this.fireItemOnBeingHit(attacker, defender, move, battle, events);
        this.fireAbilityOnBeingHit(attacker, defender, actualDmg, move, battle, events);
        this.fireItemOnLowHP(defender, battle, events);
      }

      // Flinch from twitterBlue bonus
      if (extraFlinchChance > 0 && !defender.fainted && Math.random() * 100 < extraFlinchChance) {
        defender.flinched = true;
      }
    } else if (move.c === 'status') {
      E._log(battle, `${attacker.n} used ${move.n}!`, 'info');
      events.push(this._evt('move', attacker.id, {
        target: defender.id, move, dmg: 0, eff: 1, isCrit: false, hitCount: 0,
        msg: `${attacker.n} used ${move.n}!`,
      }));
    }

    // Apply move secondary effects
    if (!defender.fainted || move.c === 'status') {
      this._applyMoveEffects(attacker, defender, move, actualDmg, battle, events);
    }

    // Recoil for move effects hits attacker regardless of defender faint
    if (move.ef && move.ef.recoil && actualDmg > 0 && move.id !== 'struggle') {
      // Already handled inside _applyMoveEffects — no double apply
    }

    // Struggle recoil: 25% max HP regardless of damage
    if (move.id === 'struggle') {
      const struggleRecoil = Math.floor(attacker.mhp * 0.25);
      E.applyDmg(attacker, struggleRecoil, battle);
      E._log(battle, `${attacker.n} is hurt by Struggle's recoil!`, 'info');
      events.push(this._evt('recoil', attacker.id, { dmg: struggleRecoil }));
    }

    // Mark first move used
    if (!attacker._firstMoved) attacker._firstMoved = true;
  },

  // ─── FULL TURN EXECUTOR ──────────────────────────────────────────────────────

  async executeTurn(battle, playerAction) {
    if (battle.over || battle.busy) return [];
    battle.busy = true;

    const events = [];
    const E = window.PBEngine;

    // Determine AI action
    const aiAction = window.PBAI && window.PBAI.chooseAction
      ? window.PBAI.chooseAction(battle)
      : { type: 'move', idx: 0 };

    const pFighter = battle.pTeam[battle.pIdx];
    const aFighter = battle.aTeam[battle.aIdx];

    // Get turn order
    const order = E.getTurnOrder(pFighter, aFighter, playerAction, aiAction);

    // Execute in order
    for (const side of order) {
      const isPlayer = side === 'player';
      const actor    = isPlayer ? battle.pTeam[battle.pIdx] : battle.aTeam[battle.aIdx];
      const action   = isPlayer ? playerAction : aiAction;

      if (actor && !actor.fainted) {
        await this._executeAction(battle, side, action, events);
      }

      // Check for battle end after each action
      const winner = E.checkWin(battle);
      if (winner) {
        battle.over   = true;
        battle.winner = winner;
        E._log(battle, winner === 'player' ? 'You win!' : 'You lost!', 'ko');
        events.push(this._evt('battle-end', null, { msg: winner }));
        battle.busy = false;
        return events;
      }
    }

    // ── End-of-turn phase ──
    E.endOfTurn(battle);

    // Push turn-end events for both active fighters
    for (const side of ['player', 'ai']) {
      const f = side === 'player'
        ? battle.pTeam[battle.pIdx]
        : battle.aTeam[battle.aIdx];
      if (f && !f.fainted) {
        this.fireAbilityOnTurnEnd(f, battle, events);
        this.fireItemOnTurnEnd(f, battle, events);
      }
    }

    // Auto-switch: if active fighter fainted but team has survivors, push switch request event
    for (const side of ['player', 'ai']) {
      const isPlayer = side === 'player';
      const team     = isPlayer ? battle.pTeam : battle.aTeam;
      const idx      = isPlayer ? battle.pIdx  : battle.aIdx;
      const active   = team[idx];

      if (active && active.fainted) {
        const nextIdx = team.findIndex((f, i) => !f.fainted && i !== idx);
        if (nextIdx !== -1) {
          if (!isPlayer) {
            // AI auto-switches
            const outFighter = active;
            E.switchOut(outFighter);
            battle.aIdx = nextIdx;
            const incoming = battle.aTeam[battle.aIdx];
            const hazards  = battle.aHz;
            E.switchIn(incoming, battle.pTeam[battle.pIdx], hazards, battle);
            this.fireAbilityOnSwitchIn(incoming, battle.pTeam[battle.pIdx], battle, events);
            events.push(this._evt('switch', incoming.id, { msg: `Foe sent out ${incoming.n}!` }));
          } else {
            // Player must choose — signal UI via event
            events.push(this._evt('need-switch', 'player', { msg: 'Choose your next fighter!' }));
          }
        }
      }
    }

    // Final win check after end-of-turn
    const finalWinner = E.checkWin(battle);
    if (finalWinner) {
      battle.over   = true;
      battle.winner = finalWinner;
      E._log(battle, finalWinner === 'player' ? 'You win!' : 'You lost!', 'ko');
      events.push(this._evt('battle-end', null, { msg: finalWinner }));
    }

    battle.turn++;
    battle.busy = false;
    return events;
  },

}; // end window.PBMechanics
