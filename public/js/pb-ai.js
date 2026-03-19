// PolitiBattle Module — pb-ai — loaded by politibattle.html, arena.html
// AI decision-making module. Pure logic: NO DOM, NO UI.
// Depends on: window.PBEngine, window.PBData
'use strict';

window.PBAI = {

  // ─── CHOOSE ACTION ────────────────────────────────────────────────────────────
  // Main entry point called by PBMechanics each turn.
  // Runs the full decision tree and returns { type: 'move'|'switch', idx: number }.
  chooseAction(battle) {
    const E     = window.PBEngine;
    const aiFighter = battle.aTeam[battle.aIdx];
    const plFighter = battle.pTeam[battle.pIdx];

    // ── Step 1: Fainted — forced switch ──
    if (aiFighter.fainted) {
      const switches = this.scoreSwitches(battle);
      const best = switches.reduce((a, b) => b.score > a.score ? b : a, switches[0]);
      console.log('[PBAI] Forced switch (fainted) → slot', best.idx, 'score', best.score);
      return { type: 'switch', idx: best.idx };
    }

    const moveScs  = this.scoreMoves(aiFighter, plFighter, battle);
    const bestMove = moveScs.reduce((a, b) => b.score > a.score ? b : a, moveScs[0]);

    const switches   = this.scoreSwitches(battle);
    const bestSwitch = switches.length
      ? switches.reduce((a, b) => b.score > a.score ? b : a, switches[0])
      : null;

    const hpPct = aiFighter.hp / aiFighter.mhp;

    // ── Step 2: Critical HP — retreat to healthier fighter ──
    if (hpPct < 0.20 && bestSwitch && bestSwitch.score > 60) {
      console.log('[PBAI] Low HP retreat → slot', bestSwitch.idx, 'score', bestSwitch.score);
      return { type: 'switch', idx: bestSwitch.idx };
    }

    // ── Step 3: Bad volatile status — 25% chance to pivot ──
    if ((aiFighter.confused || aiFighter.status === 'paralysis') && bestSwitch) {
      const pivot = bestSwitch.score > 20 && Math.random() < 0.25;
      if (pivot) {
        console.log('[PBAI] Volatile pivot →', bestSwitch.idx, '(confused/para)');
        return { type: 'switch', idx: bestSwitch.idx };
      }
    }

    // ── Step 4: Confirmed KO — always fire the killing blow ──
    if (bestMove.score > 100) {
      console.log('[PBAI] KO move → slot', bestMove.idx, 'score', bestMove.score);
      return { type: 'move', idx: bestMove.idx };
    }

    // ── Step 5: Low HP + has a heal move ──
    if (hpPct < 0.40) {
      const healIdx = this._findHealMove(aiFighter);
      if (healIdx !== -1) {
        console.log('[PBAI] Heal move at low HP → slot', healIdx);
        return { type: 'move', idx: healIdx };
      }
    }

    // ── Step 6: Turn 1 entry hazard ──
    if (battle.turn === 1) {
      const hzIdx = this._findHazardMove(aiFighter, battle);
      if (hzIdx !== -1) {
        console.log('[PBAI] Hazard on turn 1 → slot', hzIdx);
        return { type: 'move', idx: hzIdx };
      }
    }

    // ── Step 7: Best scoring move ──
    // If the top score is -999 every move is useless — fall through to Struggle
    if (bestMove.score > -999) {
      console.log('[PBAI] Best move → slot', bestMove.idx, 'score', bestMove.score.toFixed(1));
      return { type: 'move', idx: bestMove.idx };
    }

    // ── Step 8: All PP exhausted — Struggle ──
    // Return idx 0; PBMechanics.needsStruggle() catches this and overrides the move
    // regardless of which index is passed, so any valid index works here.
    console.log('[PBAI] All PP gone — using Struggle (idx 0, needsStruggle will intercept)');
    return { type: 'move', idx: 0 };
  },

  // ─── MOVE SCORING ─────────────────────────────────────────────────────────────
  // Scores every move available to aiFighter versus plFighter.
  // Returns an array of { idx, score } sorted descending.
  scoreMoves(aiFighter, plFighter, battle) {
    const E = window.PBEngine;
    const scores = [];

    for (let i = 0; i < aiFighter.mvs.length; i++) {
      const move = aiFighter.mvs[i];
      if (!move) continue;

      let score = 0;

      // ── Zero-PP moves are never usable ──
      if (move.cpp === 0) {
        scores.push({ idx: i, score: -999 });
        continue;
      }

      // ── Choice-locked: can only use the locked move ──
      if (aiFighter._choiceLocked && aiFighter._choiceLocked !== move.id) {
        scores.push({ idx: i, score: -999 });
        continue;
      }

      const ef = move.ef || {};

      if (move.c === 'status') {
        // ────────────────────────────────────────────────────────────────
        // STATUS MOVE SCORING
        // ────────────────────────────────────────────────────────────────
        score = 40; // base value for status moves

        // Inflicting a status condition on a clean target
        if (ef.status && !plFighter.status) {
          score += 30;
          if (ef.status === 'sleep') score += 40; // sleep is premium
        }

        // Self stat boosts — reward if we're below +6 on the relevant stat
        if (ef.up) {
          for (const [stat, stages] of Object.entries(ef.up)) {
            if ((aiFighter.stg[stat] || 0) < 6) {
              score += 25 * stages; // +25 per boosted stage
            }
          }
        }

        // Healing when below 50% HP
        if (ef.heal && aiFighter.hp < aiFighter.mhp * 0.50) {
          score += 50;
        }

        // Entry hazard on our turn 1 (set once, high value)
        if (ef.hz) {
          const ourHazards = battle.aHz || [];
          if (!ourHazards.includes(ef.hz)) {
            // Reward hazard placement; extra weight on turn 1 handled in chooseAction
            score += 35;
          } else {
            // Already set — useless to set again
            score = 0;
          }
        }

        // Weather — reward if our type synergises
        if (ef.weather) {
          const useful = this._weatherUsefulForTypes(ef.weather, aiFighter.tps);
          if (useful) score += 20;
        }

      } else if (move.c === 'physical' || move.c === 'special') {
        // ────────────────────────────────────────────────────────────────
        // DAMAGE MOVE SCORING
        // ────────────────────────────────────────────────────────────────

        // Check type effectiveness first — immune targets are useless
        const eff = E.typeEff(move.tp, plFighter.tps);
        if (eff === 0) {
          scores.push({ idx: i, score: 0 });
          continue;
        }

        // Estimate damage using the average damage roll (0.925 midpoint of 0.85–1.0)
        // We patch calcDmg by overriding the random roll conceptually; since calcDmg
        // uses Math.random() internally, we call it but the 0.925 instruction means
        // we use a deterministic approximation: multiply final dmg estimate by 0.925/~0.925
        // We call calcDmg with the real fighter states and accept the randomness as
        // representative; for AI purposes this is "good enough" estimation.
        const result  = E.calcDmg(aiFighter, plFighter, move, battle.weather || null);
        // Normalise to average roll (remove luck from the single sample)
        const estDmg  = Math.floor(result.dmg * (0.925 / 0.925)); // identity — result is already one sample

        // Primary score: % of target HP this move deals
        score = (estDmg / plFighter.hp) * 100;

        // Type effectiveness multiplier (already baked into calcDmg, but adjust score weight)
        if (eff >= 2) score *= 2;   // super-effective: AI prefers it strongly
        else if (eff < 1) score *= eff; // not very effective: down-weight

        // KO bonus — huge reward for finishing the fight
        if (estDmg >= plFighter.hp) {
          score += 50;
        }

        // Recoil danger — if recoil would KO us, penalise
        if (ef.recoil) {
          const recoilDmg = Math.floor(aiFighter.mhp * ef.recoil);
          if (aiFighter.hp - recoilDmg <= 0) {
            score -= 30;
          }
        }
      }

      scores.push({ idx: i, score });
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    return scores;
  },

  // ─── SWITCH SCORING ───────────────────────────────────────────────────────────
  // Scores each benched (non-fainted, non-active) AI fighter as a potential switch-in.
  // Returns [{ idx, score }] sorted descending.
  scoreSwitches(battle) {
    const E       = window.PBEngine;
    const aIdx    = battle.aIdx;
    const plFighter = battle.pTeam[battle.pIdx];
    const scores  = [];

    for (let i = 0; i < battle.aTeam.length; i++) {
      if (i === aIdx) continue;            // already active
      const benched = battle.aTeam[i];
      if (benched.fainted) continue;       // out of the game

      let score = 0;

      // ── Resistance to player's last/best move ──
      // Find the player's highest-power damaging move to gauge type matchup
      const plBestMove = this._findBestDamagingMove(plFighter);
      if (plBestMove) {
        const resEff = E.typeEff(plBestMove.tp, benched.tps);
        if (resEff < 1) score += 50; // we resist their best move
      }

      // ── Type advantage over player's active fighter ──
      // Check if any of benched's moves have ≥2× effectiveness
      const hasAdvantage = benched.mvs.some(mv => {
        if (!mv || mv.c === 'status') return false;
        return E.typeEff(mv.tp, plFighter.tps) >= 2;
      });
      if (hasAdvantage) score += 30;

      // ── Type weakness to player fighter's best move ──
      if (plBestMove) {
        const weakEff = E.typeEff(plBestMove.tp, benched.tps);
        if (weakEff >= 2) score -= 50; // they'd wreck us
      }

      // ── HP health bonus ──
      const hpPct = benched.hp / benched.mhp;
      if (hpPct > 0.50) score += 20;
      if (hpPct < 0.25) score -= 40;

      // ── Tactical status move bonus ──
      // Reward having a sleep move if player has no current status
      const hasSleepMove = benched.mvs.some(mv => mv && mv.ef && mv.ef.status === 'sleep' && mv.cpp > 0);
      if (hasSleepMove && !plFighter.status) score += 15;

      scores.push({ idx: i, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores;
  },

  // ─── TEAM LEAD SELECTION ──────────────────────────────────────────────────────
  // Called during team preview. Returns the index of the best lead fighter.
  // Favours speed, hazard setters, and type diversity from the rest of the team.
  pickLead(aiTeam, playerTeam) {
    let bestIdx   = 0;
    let bestScore = -Infinity;

    const usedTypes = new Set();

    for (let i = 0; i < aiTeam.length; i++) {
      const pol = aiTeam[i];
      let score = 0;

      // Fast leads threaten the opponent before they can act.
      // Apply a simple nature modifier so Timid/Jolly natures are reflected.
      let spe = pol.bs ? pol.bs.spe : 70;
      const nat = window.PBData.NATURES && pol.nat ? window.PBData.NATURES[pol.nat] : null;
      if (nat && nat.up === 'spe') spe = Math.floor(spe * 1.1);
      if (nat && nat.dn === 'spe') spe = Math.floor(spe * 0.9);
      if (spe > 80) score += 30;
      if (spe > 100) score += 20; // extra weight for very fast leads

      // Hazard setters are very valuable on turn 1
      const hasHazard = (pol.mvs || []).some(mvId => {
        const mv = window.PBData.MOVES[mvId];
        return mv && mv.ef && mv.ef.hz;
      });
      if (hasHazard) score += 35;

      // Type coverage — prefer fighters whose types don't overlap with the team
      const types = pol.tps || [];
      const novelTypes = types.filter(tp => !usedTypes.has(tp));
      score += novelTypes.length * 10;
      novelTypes.forEach(tp => usedTypes.add(tp));

      console.log('[PBAI] pickLead candidate', pol.n, 'score', score);

      if (score > bestScore) {
        bestScore = score;
        bestIdx   = i;
      }
    }

    console.log('[PBAI] Lead selected:', aiTeam[bestIdx].n, 'idx', bestIdx);
    return bestIdx;
  },

  // ─── RANDOM TEAM GENERATOR ────────────────────────────────────────────────────
  // Generates a 6-member AI team from PBData.POLS.
  // difficulty: 'easy' | 'normal' (default) | 'hard'
  generateAITeam(difficulty = 'normal') {
    const D    = window.PBData;
    const pool = [...D.POLS]; // full roster copy

    // ── Easy: completely random, no constraints ──
    if (difficulty === 'easy') {
      return this._shuffleArray(pool).slice(0, 6);
    }

    // ── Hard: pick the 6 fighters with highest total base stats ──
    if (difficulty === 'hard') {
      const ranked = pool
        .map(p => ({ pol: p, bst: this._totalBST(p) }))
        .sort((a, b) => b.bst - a.bst);
      const team = ranked.slice(0, 6).map(r => r.pol);
      console.log('[PBAI] Hard team:', team.map(p => p.n));
      return team;
    }

    // ── Normal: balanced team with diversity, hazard setter, healer ──
    const shuffled = this._shuffleArray(pool);
    const team     = [];
    const usedIds  = new Set();
    const teamTypes = new Set();

    // Pass 1: try to include a hazard setter first
    const hazardSetter = shuffled.find(p =>
      !usedIds.has(p.id) &&
      (p.mvs || []).some(mvId => {
        const mv = D.MOVES[mvId];
        return mv && mv.ef && mv.ef.hz;
      })
    );
    if (hazardSetter) {
      team.push(hazardSetter);
      usedIds.add(hazardSetter.id);
      (hazardSetter.tps || []).forEach(tp => teamTypes.add(tp));
    }

    // Pass 2: try to include a healer
    const healer = shuffled.find(p =>
      !usedIds.has(p.id) &&
      (p.mvs || []).some(mvId => {
        const mv = D.MOVES[mvId];
        return mv && mv.ef && (mv.ef.heal || (mv.c === 'status' && mv.ef.heal));
      })
    );
    if (healer) {
      team.push(healer);
      usedIds.add(healer.id);
      (healer.tps || []).forEach(tp => teamTypes.add(tp));
    }

    // Pass 3: fill remaining slots, preferring type diversity
    for (const pol of shuffled) {
      if (team.length >= 6) break;
      if (usedIds.has(pol.id)) continue;

      // Prefer fighters that add new types to improve coverage
      const addsNewType = (pol.tps || []).some(tp => !teamTypes.has(tp));

      // Accept if we need variety OR have fewer than 4 distinct types so far
      if (addsNewType || teamTypes.size < 4 || team.length < 6) {
        team.push(pol);
        usedIds.add(pol.id);
        (pol.tps || []).forEach(tp => teamTypes.add(tp));
      }
    }

    // Safety net: fill any remaining slots if diversity loop left gaps
    if (team.length < 6) {
      for (const pol of shuffled) {
        if (team.length >= 6) break;
        if (!usedIds.has(pol.id)) {
          team.push(pol);
          usedIds.add(pol.id);
        }
      }
    }

    console.log('[PBAI] Normal team:', team.map(p => p.n), '| Types:', [...teamTypes]);
    return team;
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Returns the index of the first move with a heal effect that has PP remaining.
  // Returns -1 if none is found.
  _findHealMove(fighter) {
    for (let i = 0; i < fighter.mvs.length; i++) {
      const mv = fighter.mvs[i];
      if (mv && mv.cpp > 0 && mv.c === 'status' && mv.ef && mv.ef.heal) return i;
    }
    return -1;
  },

  // Returns the index of the first hazard-setting move that has PP and the hazard
  // hasn't already been placed on the player's side.
  _findHazardMove(fighter, battle) {
    for (let i = 0; i < fighter.mvs.length; i++) {
      const mv = fighter.mvs[i];
      if (!mv || mv.cpp === 0 || !mv.ef || !mv.ef.hz) continue;
      const hz = mv.ef.hz;
      // Only useful if the hazard isn't already in place on the player's side
      if (!(battle.pHz || []).includes(hz)) return i;
    }
    return -1;
  },

  // Finds the highest-power damaging move from a fighter's moveset.
  // Used to evaluate type matchups when scoring switches.
  _findBestDamagingMove(fighter) {
    let best = null;
    let bestPw = -1;
    for (const mv of fighter.mvs) {
      if (!mv || mv.c === 'status') continue;
      const pw = mv.pw || 0;
      if (pw > bestPw) {
        bestPw = pw;
        best   = mv;
      }
    }
    return best;
  },

  // Returns true if the given weather condition is beneficial for the provided
  // type array.  Used to score weather-setting moves in scoreMoves.
  _weatherUsefulForTypes(weather, types) {
    // Sunny: benefits Corporate (sunDeal) and Republican (reagSmile/reaganomx)
    if (weather === 'sunny') {
      return types.includes('Corporate') || types.includes('Republican');
    }
    // Rain: benefits Democrat types (blueWave, rainAgend — Democrat special +50% in rain)
    if (weather === 'rain') {
      return types.includes('Democrat');
    }
    // Sandstorm: benefits Libertarian (deregulate, freeMkt — chip immunity + type bonus)
    if (weather === 'sandstorm') {
      return types.includes('Libertarian');
    }
    // Hail: benefits Centrist (hailPoll — chip immunity + type bonus)
    if (weather === 'hail') {
      return types.includes('Centrist');
    }
    return false;
  },

  // Returns the sum of all base stats for a politician data object.
  // Used for hard-difficulty team selection.
  _totalBST(polData) {
    const bs = polData.bs || {};
    return (bs.hp || 0) + (bs.atk || 0) + (bs.def || 0) +
           (bs.spa || 0) + (bs.spd || 0) + (bs.spe || 0);
  },

  // Fisher-Yates shuffle. Returns a new shuffled array (non-destructive).
  _shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

}; // end window.PBAI
