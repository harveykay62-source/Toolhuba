// PolitiBattle Module — pb-engine — loaded by politibattle.html, arena.html, politibattle-multi.html
// Pure calculation engine: NO DOM, NO Three.js, NO side effects outside battle state.
// Reads from window.PBData. Used by both 2D and 3D battle systems.
'use strict';

window.PBEngine = {

  // ─── INTERNAL LOGGER ────────────────────────────────────────────────────────
  // Pushes a message to both battle.log and battle.replay arrays.
  _log(battle, msg, type = 'info') {
    const entry = { turn: battle.turn, msg, type };
    battle.log.push(entry);
    battle.replay.push(entry);
  },

  // ─── STAT CALCULATION ────────────────────────────────────────────────────────
  // Gen 5 HP formula: floor((2*base + 31 + floor(85/4)) * 50/100) + 50 + 10
  calcHP(base) {
    const iv = 31, ev = 85, lv = 50;
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * lv / 100) + lv + 10;
  },

  // Gen 5 non-HP formula: floor((2*base + 31 + floor(85/4)) * 50/100) + 5
  // natUp / natDn are stat keys (e.g. 'atk'). If statKey matches natUp → ×1.1, natDn → ×0.9
  calcStat(base, natUp, natDn, statKey) {
    const iv = 31, ev = 85, lv = 50;
    let val = Math.floor((2 * base + iv + Math.floor(ev / 4)) * lv / 100) + 5;
    if (natUp && natUp === statKey) val = Math.floor(val * 1.1);
    if (natDn && natDn === statKey) val = Math.floor(val * 0.9);
    return val;
  },

  // ─── FIGHTER FACTORY ────────────────────────────────────────────────────────
  // Builds a live fighter object from a politician data entry (from PBData.POLS).
  buildFighter(polData, isPlayer) {
    const D = window.PBData;
    const nat = D.NATURES[polData.nat] || { up: null, dn: null };
    const bs = polData.bs;

    // Calculate all base stats with nature applied
    const mhp = this.calcHP(bs.hp);
    const calcedStats = {
      atk: this.calcStat(bs.atk, nat.up, nat.dn, 'atk'),
      def: this.calcStat(bs.def, nat.up, nat.dn, 'def'),
      spa: this.calcStat(bs.spa, nat.up, nat.dn, 'spa'),
      spd: this.calcStat(bs.spd, nat.up, nat.dn, 'spd'),
      spe: this.calcStat(bs.spe, nat.up, nat.dn, 'spe'),
    };

    // Deep-copy moves and attach current PP
    const mvs = (polData.mvs || []).map(mvId => {
      const mv = D.MOVES[mvId];
      if (!mv) return null;
      return { ...mv, id: mvId, cpp: mv.pp };
    }).filter(Boolean);

    return {
      id:           polData.id,
      n:            polData.n,
      e:            polData.e || '',
      svgId:        polData.svgId || polData.id,
      tps:          [...(polData.tps || [])],
      abl:          polData.abl || null,
      itm:          polData.itm || null,
      nat:          polData.nat,
      isPlayer,
      mhp,
      hp:           mhp,
      bs:           { ...calcedStats },
      stg:          { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      mvs,
      status:       null,
      confused:     false,
      confuseTurns: 0,
      flinched:     false,
      sleepTurns:   0,
      toxicCounter: 0,
      fainted:      false,
      _choiceLocked:   null,
      _enduUsed:       false,
      _rlUsed:         0,
      _deported:       false,
      _nukUsed:        false,
      _firstMoved:     false,
      _itemConsumed:   false,
      _entryAnimDone:  false,
    };
  },

  // ─── EFFECTIVE STAT ──────────────────────────────────────────────────────────
  // Applies stat stages and item/status modifiers to return the effective battle stat.
  effStat(fighter, statKey) {
    // Stage multiplier table
    const STAGE_MULT = {
      '-6': 0.25, '-5': 0.28, '-4': 0.33, '-3': 0.4,
      '-2': 0.5,  '-1': 0.67,  '0': 1,    '1': 1.5,
       '2': 2,     '3': 2.5,   '4': 3,    '5': 3.5, '6': 4,
    };
    let val = fighter.bs[statKey];
    const stage = fighter.stg[statKey] || 0;
    val = Math.floor(val * (STAGE_MULT[String(stage)] || 1));

    // Item modifiers
    const itm = fighter.itm;
    if (itm === 'pollingData' && (statKey === 'def' || statKey === 'spd')) val = Math.floor(val * 1.5);
    if (itm === 'amazonPrime' && statKey === 'spe' && !fighter._itemConsumed) val = Math.floor(val * 1.5);
    if (itm === 'mittens' && statKey === 'spa') val = Math.floor(val * 1.2);
    if (itm === 'littleRedBook' && (statKey === 'atk' || statKey === 'spa')) val = Math.floor(val * 1.1);
    if (itm === 'choiceScarf' && statKey === 'spe') val = Math.floor(val * 1.5);
    if (itm === 'choiceBand' && statKey === 'atk') val = Math.floor(val * 1.5);
    if (itm === 'choiceSpecs' && statKey === 'spa') val = Math.floor(val * 1.5);

    // Ability modifiers
    const abl = fighter.abl;
    if (abl === 'twoDay' && statKey === 'spe') val = 9999; // effectively max speed

    // Status penalties
    if (fighter.status === 'burn' && statKey === 'atk') val = Math.floor(val * 0.5);
    if (fighter.status === 'paralysis' && statKey === 'spe') val = Math.floor(val * 0.5);

    // Ability: turtleDefense reduces effective def (handled in damage calc)
    // Ability: nonViolence reduces effective def (handled in damage calc)

    return Math.max(1, val);
  },

  // ─── TYPE EFFECTIVENESS ──────────────────────────────────────────────────────
  // Returns combined type multiplier for an attack type against defender's type(s).
  typeEff(atkType, defTypes) {
    const TC = window.PBData.TC;
    if (!TC[atkType]) return 1;
    let mult = 1;
    for (const dt of defTypes) {
      const row = TC[atkType];
      if (row && row[dt] !== undefined) mult *= row[dt];
    }
    return mult;
  },

  // ─── DAMAGE CALCULATION ──────────────────────────────────────────────────────
  // Full Gen 5 damage formula with crits, STAB, type effectiveness, items, abilities.
  // Returns { dmg, isCrit, eff, hitCount }
  calcDmg(attacker, defender, move, weather = null, opts = {}) {
    if (!move || move.pw === 0 || move.c === 'status') {
      return { dmg: 0, isCrit: false, eff: 1, hitCount: 0 };
    }

    const lv = 50;
    const pw = move.pw || 50;
    const isPhysical = move.c === 'physical';

    // Determine attacking / defending stats
    let atkStat = isPhysical ? this.effStat(attacker, 'atk') : this.effStat(attacker, 'spa');
    let defStat = isPhysical ? this.effStat(defender, 'def') : this.effStat(defender, 'spd');

    // Ability: turtleDefense — 20% physical damage reduction applied via defStat boost
    if (isPhysical && defender.abl === 'turtleDefense') defStat = Math.floor(defStat * 1.25);
    // Ability: nonViolence — 30% physical damage reduction
    if (isPhysical && defender.abl === 'nonViolence') defStat = Math.floor(defStat * 1.43);

    // ── Crit calculation ──
    // Base crit rate ~4.17%. Abilities/items can boost.
    let critStage = 0;
    const abl = attacker.abl;
    if (abl === 'kgbTraining') critStage += 2;       // KGB Training: +50% approx (2 stages)
    if (abl === 'camelotCrits') critStage += 1;       // Camelot: 2x crit rate
    if (abl === 'fourScoreCrits') critStage += 1;     // Four Score: +1 stage
    if (abl === 'veniVidiViciAbl' && !attacker._firstMoved) critStage = 99; // always crit first move

    // Crit thresholds: 0→4.17%, 1→12.5%, 2→50%, 3+→100%
    const CRIT_RATES = [0.0417, 0.125, 0.5, 1.0];
    const critRate = CRIT_RATES[Math.min(critStage, 3)];
    const isCrit = Math.random() < critRate;

    // ── Multi-hit ──
    let hitMin = 1, hitMax = 1;
    if (move.hits) { hitMin = move.hits[0]; hitMax = move.hits[1]; }
    const hitCount = hitMin === hitMax ? hitMin
      : Math.floor(Math.random() * (hitMax - hitMin + 1)) + hitMin;

    // Type effectiveness
    const eff = this.typeEff(move.tp, defender.tps);

    // ── Per-hit damage loop ──
    let totalDmg = 0;
    for (let h = 0; h < hitCount; h++) {
      // Gen 5 base damage
      let dmg = Math.floor(
        (Math.floor(2 * lv / 5 + 2) * pw * atkStat / defStat) / 50
      ) + 2;

      // STAB (Same-Type Attack Bonus)
      if (attacker.tps.includes(move.tp)) dmg = Math.floor(dmg * 1.5);

      // Type effectiveness
      dmg = Math.floor(dmg * eff);

      // Critical hit: 1.5x (standard)
      if (isCrit) dmg = Math.floor(dmg * 1.5);

      // ── Weather modifiers ──
      if (weather === 'sunny') {
        if (move.tp === 'Green') dmg = Math.floor(dmg * 0.5);       // solar weakened (placeholder)
        if (move.c === 'special' && attacker.abl === 'darkBrandon') dmg = Math.floor(dmg * 1.1);
      }
      if (weather === 'rain') {
        // No special rain overrides currently; placeholder
      }

      // ── Item modifiers ──
      const itm = attacker.itm;
      if (itm === 'magaHat' && attacker._choiceLocked === move.id) dmg = Math.floor(dmg * 1.3);
      if (itm === 'beret' || itm === 'senateKnife') dmg = Math.floor(dmg * 1.3);
      if (itm === 'twitterBlue') {
        // +10% flinch chance handled in move execution, no dmg bonus
      }

      // ── Ability modifiers (attacker) ──
      if (abl === 'shockAndAwe' && !attacker._firstMoved) dmg = Math.floor(dmg * 1.5);
      if (abl === 'darkBrandon' && attacker.hp < attacker.mhp * 0.5) dmg = Math.floor(dmg * 1.1);
      if (abl === 'emperorComplex') {
        // Stacks per consecutive use tracked externally — small flat 5% bonus here as baseline
        dmg = Math.floor(dmg * 1.05);
      }

      // ── Ability modifiers (defender) ──
      if (defender.abl === 'undisclosedLoc' && Math.random() < 0.2) {
        // 20% miss chance — handled in move execution but affects hitCount loop
        continue;
      }

      // ── Random roll ──
      const roll = 0.85 + Math.random() * 0.15;
      dmg = Math.floor(dmg * roll);

      totalDmg += Math.max(1, dmg);
    }

    return { dmg: totalDmg, isCrit, eff, hitCount };
  },

  // ─── APPLY DAMAGE ────────────────────────────────────────────────────────────
  // Applies damage, checks endure/sturdy items, handles Nuclear Deterrent KO trigger.
  applyDmg(fighter, amount, battle) {
    if (amount <= 0) return 0;

    const prevHP = fighter.hp;
    let wouldKO = fighter.hp - amount <= 0;

    // Nuclear Football / Sturdy: survive one hit at 1 HP from full HP
    if (wouldKO && !fighter._enduUsed && fighter.itm === 'nuclearFball' && fighter.hp === fighter.mhp) {
      fighter.hp = 1;
      fighter._enduUsed = true;
      this._log(battle, `${fighter.n} endures the hit with Nuclear Football!`, 'info');
      return prevHP - 1;
    }

    // Never Surrender ability: survive one KO hit at 1 HP
    if (wouldKO && !fighter._enduUsed && fighter.abl === 'neverSurrender') {
      fighter.hp = 1;
      fighter._enduUsed = true;
      this._log(battle, `${fighter.n}'s Never Surrender keeps it at 1 HP!`, 'info');
      return prevHP - 1;
    }

    // Long Walk Endure: can survive if above 30% HP (up to 2 times)
    if (wouldKO && fighter._rlUsed < 2 && fighter.abl === 'longWalkEndure' && prevHP > fighter.mhp * 0.3) {
      fighter.hp = 1;
      fighter._rlUsed++;
      this._log(battle, `${fighter.n}'s Long Walk endurance keeps it alive!`, 'info');
      return prevHP - 1;
    }

    // Revolution Lives: revive once at 25% HP
    if (wouldKO && !fighter._enduUsed && fighter.abl === 'revolLives') {
      fighter.hp = Math.floor(fighter.mhp * 0.25);
      fighter._enduUsed = true;
      this._log(battle, `${fighter.n}'s Revolution Lives — back at 25% HP!`, 'info');
      return prevHP - fighter.hp;
    }

    fighter.hp = Math.max(0, fighter.hp - amount);
    const actual = prevHP - fighter.hp;

    if (fighter.hp <= 0) {
      fighter.hp = 0;
      fighter.fainted = true;
      this._log(battle, `${fighter.n} fainted!`, 'ko');

      // Nuclear Deterrent: KO triggers massive retaliation log
      if (fighter.abl === 'nuclearDeterrent' && !fighter._nukUsed) {
        fighter._nukUsed = true;
        this._log(battle, `${fighter.n}'s Nuclear Deterrent activates — launch codes entered!`, 'status');
      }
    }

    return actual;
  },

  // ─── STAT STAGE CHANGE ───────────────────────────────────────────────────────
  // Changes a fighter's stat stage, respecting Iron Lady ability and -6/+6 clamp.
  changeStage(fighter, stat, delta) {
    // Iron Lady ability: defense and spdef cannot be lowered by opponents
    if (fighter.abl === 'ironLadyAbl' && delta < 0 && (stat === 'def' || stat === 'spd')) {
      return 0;
    }
    // I Have A Dream: stat drops reduced by 1 minimum
    if (fighter.abl === 'iHaveADream' && delta < 0) {
      delta = Math.min(delta + 1, 0);
      if (delta === 0) return 0;
    }

    const prev = fighter.stg[stat] || 0;
    const next = Math.max(-6, Math.min(6, prev + delta));
    fighter.stg[stat] = next;
    return next - prev; // actual change
  },

  // ─── STATUS APPLICATION ──────────────────────────────────────────────────────
  // Applies a primary status condition. Checks immunities.
  applyStatus(fighter, status, sourceType = null, battle = null) {
    // Already has a status
    if (fighter.status) return false;

    // Type immunities
    // Libertarian cannot be paralyzed by Authoritarian moves
    if (status === 'paralysis' && fighter.tps.includes('Libertarian') && sourceType === 'Authoritarian') return false;
    // Papal Immunity: immune to poison and toxic
    if ((status === 'poison' || status === 'toxic') && fighter.abl === 'papalImmunity') return false;
    // Free Speech Absolutism: immune to confusion (handled in applyConfusion)
    // Private Server: immune to status from Republican-type moves
    if (fighter.itm === 'privateServer' && sourceType === 'Republican') return false;
    // I Am Not A Crook: 40% chance to block status
    if (fighter.abl === 'iAmNotACrook' && Math.random() < 0.4) return false;
    // Mar-a-Lago Defense: 30% chance to ignore status
    if (fighter.abl === 'marALagoDef' && Math.random() < 0.3) return false;

    // Apply
    fighter.status = status;
    if (status === 'sleep') fighter.sleepTurns = Math.floor(Math.random() * 3) + 1; // 1-3 turns
    if (status === 'toxic') fighter.toxicCounter = 0;

    // Tax Return: cures any status once when inflicted
    if (fighter.itm === 'taxReturn' && !fighter._itemConsumed) {
      fighter.status = null;
      fighter.sleepTurns = 0;
      fighter.toxicCounter = 0;
      fighter._itemConsumed = true;
      if (battle) this._log(battle, `${fighter.n} used Tax Return to avoid ${status}!`, 'status');
      return false;
    }

    if (battle) this._log(battle, `${fighter.n} was afflicted with ${status}!`, 'status');
    return true;
  },

  // ─── CONFUSION ───────────────────────────────────────────────────────────────
  // Applies volatile confusion status.
  applyConfusion(fighter) {
    if (fighter.confused) return false;
    // Free Speech Absolutism and Fly Immunity: immune to confusion
    if (fighter.abl === 'freeSpeechAbs' || fighter.abl === 'flyImmunity') return false;

    fighter.confused = true;
    fighter.confuseTurns = Math.floor(Math.random() * 4) + 2; // 2-5 turns
    return true;
  },

  // ─── TURN ORDER ──────────────────────────────────────────────────────────────
  // Returns ['player','ai'] or ['ai','player'] based on priority and speed.
  getTurnOrder(pFighter, aFighter, playerAction, aiAction) {
    // Switches always go first
    const pSwitch = playerAction.type === 'switch';
    const aSwitch = aiAction.type === 'switch';
    if (pSwitch && !aSwitch) return ['player', 'ai'];
    if (aSwitch && !pSwitch) return ['ai', 'player'];
    if (pSwitch && aSwitch) return Math.random() < 0.5 ? ['player', 'ai'] : ['ai', 'player'];

    // Priority comparison
    const D = window.PBData;
    const pMv = pFighter.mvs[playerAction.idx] || null;
    const aMv = aFighter.mvs[aiAction.idx] || null;

    let pPri = pMv ? (pMv.pri || 0) : 0;
    let aPri = aMv ? (aMv.pri || 0) : 0;

    // Twitter Finger ability: status moves get +1 priority
    if (pFighter.abl === 'twitterFinger' && pMv && pMv.c === 'status') pPri += 1;
    if (aFighter.abl === 'twitterFinger' && aMv && aMv.c === 'status') aPri += 1;

    if (pPri > aPri) return ['player', 'ai'];
    if (aPri > pPri) return ['ai', 'player'];

    // Speed tiebreak
    const pSpe = this.effStat(pFighter, 'spe');
    const aSpe = this.effStat(aFighter, 'spe');
    if (pSpe > aSpe) return ['player', 'ai'];
    if (aSpe > pSpe) return ['ai', 'player'];

    // True tie: random
    return Math.random() < 0.5 ? ['player', 'ai'] : ['ai', 'player'];
  },

  // ─── ENTRY HAZARD DAMAGE ─────────────────────────────────────────────────────
  // Called when a fighter switches in. Applies hazard effects.
  applyHazards(fighter, hazards, battle) {
    if (!hazards || hazards.length === 0) return;

    for (const hz of hazards) {
      if (hz === 'stealthRock') {
        const dmg = Math.floor(fighter.mhp / 8);
        this.applyDmg(fighter, dmg, battle);
        this._log(battle, `Pointed stones cut into ${fighter.n}!`, 'hazard');
      }
      if (hz === 'spikes') {
        const dmg = Math.floor(fighter.mhp / 10);
        this.applyDmg(fighter, dmg, battle);
        this._log(battle, `${fighter.n} was hurt by spikes!`, 'hazard');
      }
      if (hz === 'stickyWeb') {
        const change = this.changeStage(fighter, 'spe', -1);
        if (change !== 0) this._log(battle, `${fighter.n}'s Speed was lowered by sticky web!`, 'hazard');
      }
    }
  },

  // ─── HEAL FIGHTER ────────────────────────────────────────────────────────────
  heal(fighter, amount) {
    fighter.hp = Math.min(fighter.mhp, fighter.hp + Math.max(0, amount));
  },

  // ─── SWITCH OUT ──────────────────────────────────────────────────────────────
  // Clears volatile statuses on switch-out. Fires Regenerator ability.
  switchOut(fighter) {
    // Clear volatiles
    fighter.confused = false;
    fighter.confuseTurns = 0;
    fighter.flinched = false;

    // Reset stat stages
    fighter.stg = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };

    // Regenerator ability: heal 33% HP on switch-out
    if (fighter.abl === 'regenerator') {
      this.heal(fighter, Math.floor(fighter.mhp * 0.33));
    }

    // Choice item lock resets if item is gone (consumed)
    if (!fighter.itm) fighter._choiceLocked = null;
  },

  // ─── SWITCH IN ───────────────────────────────────────────────────────────────
  // Applies hazards and fires entry ability effects.
  switchIn(fighter, foe, hazards, battle) {
    // Apply entry hazards
    this.applyHazards(fighter, hazards, battle);
    if (fighter.fainted) return; // died on hazards

    const abl = fighter.abl;

    // ── Entry abilities ──
    if (abl === 'hopeAndChange') {
      this.changeStage(fighter, 'spa', 1);
      this._log(battle, `${fighter.n}'s Hope and Change raised SpAtk!`, 'info');
    }
    if (abl === 'iHaveAPlan') {
      this.changeStage(fighter, 'spa', 1);
      this.changeStage(fighter, 'spd', 1);
      this._log(battle, `${fighter.n} has a plan — SpAtk and SpDef rose!`, 'info');
    }
    if (abl === 'socialCredit' && foe) {
      this.changeStage(foe, 'atk', -1);
      this._log(battle, `${fighter.n}'s Social Credit dropped ${foe.n}'s Attack!`, 'info');
    }
    if (abl === 'morningAmerica') {
      // Summon sun (set weather in battle) — battle ref needed
      if (battle) {
        battle.weather = 'sunny';
        battle.wT = 5;
        this._log(battle, `${fighter.n}'s Morning in America summoned harsh sunlight!`, 'weather');
      }
    }
    if (abl === 'greatLeap') {
      this.changeStage(fighter, 'atk', 1);
      this.changeStage(fighter, 'spa', 1);
      this._log(battle, `${fighter.n}'s Great Leap raised Atk and SpAtk!`, 'info');
    }
    if (abl === 'flipFlopper') {
      this.changeStage(fighter, 'spa', 1);
      this._log(battle, `${fighter.n}'s Flip-Flopper raised SpAtk!`, 'info');
    }
    if (abl === 'marALagoDef') {
      // Clear own negative stat stages
      for (const k of ['atk', 'def', 'spa', 'spd', 'spe']) {
        if (fighter.stg[k] < 0) fighter.stg[k] = 0;
      }
      this._log(battle, `${fighter.n}'s Mar-a-Lago Defense cleared stat drops!`, 'info');
    }
    if (abl === 'intimidate' && foe) {
      this.changeStage(foe, 'atk', -1);
      this._log(battle, `${fighter.n}'s Intimidate dropped ${foe.n}'s Attack!`, 'info');
    }
    if (abl === 'queenOfNile' && foe) {
      this.changeStage(foe, 'spa', -1);
      this._log(battle, `${fighter.n}'s Queen of the Nile dropped ${foe.n}'s SpAtk!`, 'info');
    }
    if (abl === 'tShirtFame') {
      this.changeStage(fighter, 'atk', 1);
      this._log(battle, `${fighter.n}'s T-Shirt Fame raised Attack!`, 'info');
    }
    if (abl === 'algorithmAbl' && foe) {
      this._log(battle, `${fighter.n}'s Algorithm scans ${foe.n}'s moveset!`, 'info');
    }
    if (abl === 'kgbTraining') {
      this._log(battle, `${fighter.n}'s KGB Training — moves won't miss for 2 turns!`, 'info');
    }
    if (abl === 'enMarche') {
      this.changeStage(fighter, 'spe', 1);
      this._log(battle, `${fighter.n}'s En Marche! raised Speed!`, 'info');
    }
  },

  // ─── END OF TURN EFFECTS ─────────────────────────────────────────────────────
  // Applies all end-of-turn passive effects in the correct order.
  endOfTurn(battle) {
    const fighters = [
      battle.pTeam[battle.pIdx],
      battle.aTeam[battle.aIdx],
    ].filter(f => f && !f.fainted);

    for (const f of fighters) {
      // 1. Weather damage
      if (battle.weather === 'sandstorm' || battle.weather === 'hail') {
        // Sandstorm: doesn't hurt Rock/Steel/Ground (not in this game — no type immunity, apply broadly)
        // Hail: doesn't hurt Ice types
        const weatherImmune =
          (battle.weather === 'hail' && f.tps.includes('Green')) ||
          f.abl === 'oilMoney'; // oil money profits from weather
        if (!weatherImmune) {
          const wdmg = Math.floor(f.mhp / 16);
          this.applyDmg(f, wdmg, battle);
          this._log(battle, `${f.n} is buffeted by ${battle.weather}!`, 'weather');
        }
      }

      if (f.fainted) continue;

      // 2. Burn chip (1/16 max HP)
      if (f.status === 'burn') {
        const dmg = Math.floor(f.mhp / 16);
        this.applyDmg(f, dmg, battle);
        this._log(battle, `${f.n} is hurt by its burn!`, 'status');
      }

      if (f.fainted) continue;

      // 3. Poison chip (1/8 max HP)
      if (f.status === 'poison') {
        const dmg = Math.floor(f.mhp / 8);
        this.applyDmg(f, dmg, battle);
        this._log(battle, `${f.n} is hurt by poison!`, 'status');
      }

      if (f.fainted) continue;

      // 4. Toxic chip (1/16 * toxicCounter, counter increments after)
      if (f.status === 'toxic') {
        f.toxicCounter++;
        const dmg = Math.floor(f.mhp * f.toxicCounter / 16);
        this.applyDmg(f, dmg, battle);
        this._log(battle, `${f.n} is badly poisoned! (${f.toxicCounter}/16 HP)`, 'status');
      }

      if (f.fainted) continue;

      // 5. Item regen: Halliburton, Cigar, Holy Water, Campaign Funds heal 1/16
      const REGEN_ITEMS = ['halliburton', 'cigar', 'holyWater', 'campaignFunds'];
      if (f.itm && REGEN_ITEMS.includes(f.itm)) {
        const heal = Math.floor(f.mhp / 16);
        this.heal(f, heal);
        this._log(battle, `${f.n} recovered HP from ${f.itm}!`, 'heal');
      }

      // 6. Ability regen
      if (f.abl === 'newDealHP') {
        // New Deal: recover ~5% HP per turn (≈ 1/20)
        this.heal(f, Math.floor(f.mhp / 20));
        this._log(battle, `${f.n}'s New Deal recovered HP!`, 'heal');
      }
      if (f.abl === 'onceAgainAsking') {
        // Once Again Asking: 10% HP per turn (≈ 1/10)
        this.heal(f, Math.floor(f.mhp / 10));
        this._log(battle, `${f.n} is once again asking for HP recovery!`, 'heal');
      }
      if (f.abl === 'sorryNotSorry') {
        // Sorry Not Sorry: 10% HP (triggered by status moves — approximated here as passive)
        // Actual trigger is after using a status move; handled in move execution
      }
      if (f.abl === 'oilMoney' && battle.weather === 'sunny') {
        this.heal(f, Math.floor(f.mhp / 8));
        this._log(battle, `${f.n}'s Oil Money profits from the sun!`, 'heal');
      }

      // 7. Speed Boost abilities
      if (f.abl === 'enMarche' || f.abl === 'blitzSpeed') {
        // enMarche gives +1 Spe on switch-in; blitzSpeed gives +1 Spe per move used
        // End-of-turn speed boost for En Marche: +1 spe each full turn
        if (f.abl === 'enMarche') {
          this.changeStage(f, 'spe', 1);
          this._log(battle, `${f.n}'s En Marche! keeps it accelerating!`, 'info');
        }
      }

      // 8. Trump deportation check
      if (f.id === 'trump' && f.hp < f.mhp * 0.3 && !f._deported) {
        f._deported = true;
        // Deportation effect: triggers deportTele on foe (speed drop)
        const foe = f.isPlayer ? battle.aTeam[battle.aIdx] : battle.pTeam[battle.pIdx];
        if (foe && !foe.fainted) {
          this.changeStage(foe, 'spe', -1);
          this._log(battle, `${f.n}'s Deport Tele triggers! ${foe.n}'s Speed fell!`, 'status');
        }
      }

      // Confusion tick: reduce turns remaining
      if (f.confused) {
        f.confuseTurns--;
        if (f.confuseTurns <= 0) {
          f.confused = false;
          this._log(battle, `${f.n} snapped out of confusion!`, 'status');
        }
      }

      // Cancun Protocol: speed boost at < 25% HP (fires once)
      if (f.abl === 'cancunProtocol' && f.hp < f.mhp * 0.25 && !f._enduUsed) {
        f._enduUsed = true; // reuse flag for "has triggered"
        this.changeStage(f, 'spe', 2);
        this._log(battle, `${f.n}'s Cancun Protocol — fled to safety, Speed rose sharply!`, 'info');
      }
    }

    // 9. Weather duration countdown
    if (battle.wT > 0) {
      battle.wT--;
      if (battle.wT === 0) {
        this._log(battle, `The ${battle.weather} cleared up!`, 'weather');
        battle.weather = null;
      }
    }
  },

  // ─── STRUGGLE ────────────────────────────────────────────────────────────────
  // Returns the Struggle pseudo-move when all PP is exhausted.
  getStruggle() {
    return {
      id:    'struggle',
      n:     'Struggle',
      tp:    'Centrist', // treated as typeless for immunity purposes
      c:     'physical',
      pw:    50,
      ac:    null, // never misses
      pp:    1,
      cpp:   1,
      pri:   0,
      hits:  null,
      d:     'Struggle — when you have nothing left.',
      ef:    { recoil: 0.25 }, // user loses 25% max HP
    };
  },

  // ─── BATTLE FACTORY ──────────────────────────────────────────────────────────
  // Creates a fresh battle state from two arrays of fighter objects.
  createBattle(pTeam, aTeam) {
    return {
      pTeam,
      aTeam,
      pIdx:    0,
      aIdx:    0,
      pHz:     [],
      aHz:     [],
      weather: null,
      wT:      0,
      turn:    1,
      busy:    false,
      over:    false,
      winner:  null,
      log:     [],
      replay:  [],
      stats: {
        pDmgDealt: 0,
        aDmgDealt: 0,
        pCrits:    0,
        aCrits:    0,
        pKOs:      0,
        aKOs:      0,
      },
    };
  },

  // ─── CHECK WIN ───────────────────────────────────────────────────────────────
  // Returns 'player', 'ai', or null if the battle continues.
  checkWin(battle) {
    const pAllFainted = battle.pTeam.every(f => f.fainted);
    const aAllFainted = battle.aTeam.every(f => f.fainted);
    if (pAllFainted && aAllFainted) return 'ai'; // tiebreak: ai wins
    if (aAllFainted) return 'player';
    if (pAllFainted) return 'ai';
    return null;
  },

}; // end window.PBEngine
