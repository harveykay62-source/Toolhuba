// PolitiBattle Module — pb-ui — Battle UI renderer (complete rewrite)
// Loaded by pb-battle.html. All DOM manipulation for the 2D battle lives here.
// Depends on: PBEngine, PBData, PBData.AVATARS, PBMechanics, PBSound
'use strict';

window.PBUI = {

  /* ═══════════════════════════════════════════════════════════════════════════
     INTERNAL STATE
     ═══════════════════════════════════════════════════════════════════════════ */
  _battle:          null,
  _timerInterval:   null,
  _timerSeconds:    60,
  _timerMax:        60,
  _inputEnabled:    false,
  _switchOpen:      false,
  _logIdx:          0,
  _dmgTip:          null,
  _opTip:           null,
  _needSwitchMode:  false,   // true when player must pick replacement after KO

  /* ═══════════════════════════════════════════════════════════════════════════
     COLOUR TABLES
     ═══════════════════════════════════════════════════════════════════════════ */
  TC: {
    Republican:'#ef4444', Democrat:'#3b82f6', Libertarian:'#eab308',
    Green:'#22c55e', Socialist:'#ec4899', Authoritarian:'#7c3aed',
    Centrist:'#94a3b8', Populist:'#f97316', Corporate:'#475569',
    Revolutionary:'#dc2626',
  },
  SC: {
    burn:'#ef4444', paralysis:'#eab308', sleep:'#94a3b8',
    poison:'#a855f7', toxic:'#581c87', freeze:'#67e8f9',
  },
  SL: {
    burn:'BRN', paralysis:'PAR', sleep:'SLP',
    poison:'PSN', toxic:'TOX', freeze:'FRZ',
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════════════════════ */
  init(battle) {
    this._battle = battle;
    this._logIdx = 0;
    this._switchOpen = false;
    this._inputEnabled = false;
    this._needSwitchMode = false;
    this._createTooltips();
    this._bindKeyboard();
    this._bindEnemyHover();
    this._bindForfeit();
    try { if (window.PBSound && PBSound.init) PBSound.init(); } catch(_){}
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     FULL REFRESH — redraws everything from current battle state
     ═══════════════════════════════════════════════════════════════════════════ */
  fullRefresh(battle) {
    if (battle) this._battle = battle;
    const b = this._battle; if (!b) return;
    const pF = b.pTeam[b.pIdx];
    const aF = b.aTeam[b.aIdx];

    this._renderSprite(pF, 'player');
    this._renderSprite(aF, 'enemy');
    this.updateHP(pF, true);
    this.updateHP(aF, false);
    this.renderStatusChips(pF, true);
    this.renderStatusChips(aF, false);
    this.renderHazards(b.pHz, true);
    this.renderHazards(b.aHz, false);
    this.renderMoves(pF, aF, b);
    this._renderSwitchList(b);
    this.updateWeatherBadge(b.weather);
    this._setTurn(b.turn);
    this._renderRoster(b);
    this._syncLog(b);
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     SPRITES
     ═══════════════════════════════════════════════════════════════════════════ */
  _renderSprite(f, side) {
    const el = document.getElementById('pb-' + side + '-sprite');
    if (!el || !f) return;
    const avs = window.PBData && window.PBData.AVATARS;
    el.innerHTML = (avs && avs[f.svgId]) || '';
    if (side === 'enemy') el.style.transform = 'scaleX(-1)';
    else el.style.transform = '';
    el.classList.toggle('pb-fainted', !!f.fainted);
    el.style.opacity = f.fainted ? '0' : '1';
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     HP BARS
     ═══════════════════════════════════════════════════════════════════════════ */
  updateHP(fighter, isPlayer) {
    if (!fighter) return;
    const pre = isPlayer ? 'player' : 'enemy';
    const bar    = document.getElementById('pb-' + pre + '-hp-fill');
    const nameEl = document.getElementById('pb-' + pre + '-name');
    const hpText = document.getElementById('pb-' + pre + '-hp-text');
    const lvEl   = document.getElementById('pb-' + pre + '-lv');

    if (nameEl) nameEl.textContent = fighter.n;
    if (lvEl) lvEl.textContent = 'Lv50';

    const pct = Math.max(0, Math.min(100, (fighter.hp / fighter.mhp) * 100));
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'pb-hp-fill' +
        (pct > 50 ? ' hp-green' : pct > 20 ? ' hp-yellow' : ' hp-red');
    }
    // Showdown convention: player side shows HP numbers, enemy shows % only
    if (hpText) {
      hpText.textContent = isPlayer
        ? fighter.hp + ' / ' + fighter.mhp
        : Math.round(pct) + '%';
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     STATUS CHIPS
     ═══════════════════════════════════════════════════════════════════════════ */
  renderStatusChips(fighter, isPlayer) {
    const box = document.getElementById('pb-' + (isPlayer?'player':'enemy') + '-status');
    if (!box || !fighter) return;
    box.innerHTML = '';

    if (fighter.status) {
      box.appendChild(this._chip(
        this.SL[fighter.status] || fighter.status.toUpperCase().slice(0,3),
        this.SC[fighter.status] || '#666'));
    }
    if (fighter.confused) {
      box.appendChild(this._chip('CNF', '#f472b6'));
    }
    if (fighter.itm && !fighter._itemConsumed) {
      const itm = window.PBData.ITEMS[fighter.itm];
      const ic = document.createElement('span');
      ic.className = 'pb-chip pb-item-chip';
      ic.textContent = itm ? itm.n : fighter.itm;
      box.appendChild(ic);
    }
  },

  _chip(label, bg) {
    const s = document.createElement('span');
    s.className = 'pb-chip pb-status-chip';
    s.textContent = label;
    s.style.background = bg;
    return s;
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     HAZARDS ROW
     ═══════════════════════════════════════════════════════════════════════════ */
  renderHazards(hazards, isPlayer) {
    const box = document.getElementById('pb-' + (isPlayer?'player':'enemy') + '-hazards');
    if (!box) return;
    box.innerHTML = '';
    if (!hazards || !hazards.length) return;
    const IC = { stealthRock:'⛰️Scandal', spikes:'🗡️Spikes', stickyWeb:'🕸️Web' };
    hazards.forEach(h => {
      const s = document.createElement('span');
      s.className = 'pb-chip pb-hazard-chip';
      s.textContent = IC[h] || h;
      box.appendChild(s);
    });
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     BATTLE LOG
     ═══════════════════════════════════════════════════════════════════════════ */
  log(msg, type) {
    const box = document.getElementById('pb-log');
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'pb-log-line pb-log-' + (type || 'info');
    d.textContent = msg;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  },

  _syncLog(battle) {
    if (!battle) return;
    while (this._logIdx < battle.log.length) {
      const e = battle.log[this._logIdx];
      this.log(e.msg, e.type);
      this._logIdx++;
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     MOVE GRID (2×2)
     ═══════════════════════════════════════════════════════════════════════════ */
  renderMoves(pF, aF, battle) {
    const grid = document.getElementById('pb-move-grid');
    if (!grid || !pF) return;
    grid.innerHTML = '';

    const allEmpty = pF.mvs.every(m => m.cpp <= 0);
    if (allEmpty) {
      grid.appendChild(this._moveBtn(
        { id:'struggle', n:'STRUGGLE', tp:'Centrist', c:'physical', pw:50, ac:null, pp:1, cpp:1 },
        0, pF, aF, battle, true, false));
      return;
    }

    const choiceLocked = pF._choiceLocked && pF.itm &&
      ['magaHat','choiceScarf','choiceSpecs','choiceBand'].includes(pF.itm);

    pF.mvs.forEach((mv, i) => {
      const locked = choiceLocked && pF._choiceLocked !== mv.id;
      grid.appendChild(this._moveBtn(mv, i, pF, aF, battle, false, locked));
    });
  },

  _moveBtn(mv, idx, pF, aF, battle, isStruggle, locked) {
    const btn = document.createElement('button');
    btn.className = 'pb-move-btn';
    const noPP = mv.cpp <= 0 && !isStruggle;
    const off = noPP || locked;
    if (off) btn.classList.add('pb-move-off');
    if (locked) btn.classList.add('pb-move-locked');
    btn.disabled = off;

    const col = this.TC[mv.tp] || '#888';
    btn.style.setProperty('--mc', col);

    /* ── row 1: name + PP ── */
    const r1 = document.createElement('div');
    r1.className = 'pb-mv-r1';
    const nm = document.createElement('span');
    nm.className = 'pb-mv-name';
    nm.textContent = noPP ? 'NO PP' : locked ? '🔒 ' + mv.n : mv.n;
    r1.appendChild(nm);
    const pp = document.createElement('span');
    pp.className = 'pb-mv-pp';
    pp.textContent = mv.cpp + '/' + mv.pp;
    r1.appendChild(pp);
    btn.appendChild(r1);

    /* ── row 2: type badge, category, pw, ac ── */
    const r2 = document.createElement('div');
    r2.className = 'pb-mv-r2';
    const tb = document.createElement('span');
    tb.className = 'pb-tbadge'; tb.textContent = mv.tp; tb.style.background = col;
    r2.appendChild(tb);
    const cb = document.createElement('span');
    cb.className = 'pb-cbadge';
    cb.textContent = mv.c === 'physical' ? '⚔ Phys' : mv.c === 'special' ? '✨ Spec' : '📊 Stat';
    r2.appendChild(cb);
    if (mv.pw > 0) {
      const pw = document.createElement('span'); pw.className = 'pb-mv-stat'; pw.textContent = mv.pw;
      const pwl = document.createElement('span'); pwl.className = 'pb-mv-label'; pwl.textContent = 'Pw';
      const wrap = document.createElement('span'); wrap.className='pb-mv-sw'; wrap.append(pwl, pw);
      r2.appendChild(wrap);
    }
    const acv = document.createElement('span'); acv.className = 'pb-mv-stat'; acv.textContent = mv.ac||'∞';
    const acl = document.createElement('span'); acl.className = 'pb-mv-label'; acl.textContent = 'Ac';
    const awrap = document.createElement('span'); awrap.className='pb-mv-sw'; awrap.append(acl, acv);
    r2.appendChild(awrap);
    btn.appendChild(r2);

    /* ── PP bar ── */
    const bw = document.createElement('div'); bw.className = 'pb-pp-bar-wrap';
    const bf = document.createElement('div'); bf.className = 'pb-pp-fill';
    const pctPP = mv.pp > 0 ? (mv.cpp / mv.pp) * 100 : 0;
    bf.style.width = pctPP + '%';
    bf.className += pctPP > 50 ? ' ppg' : pctPP > 25 ? ' ppy' : pctPP > 0 ? ' ppr' : ' ppx';
    bw.appendChild(bf);
    btn.appendChild(bw);

    /* ── key hint ── */
    const kh = document.createElement('span');
    kh.className = 'pb-key-hint';
    kh.textContent = idx + 1;
    btn.appendChild(kh);

    /* ── click ── */
    if (!off) {
      btn.addEventListener('click', () => {
        if (!this._inputEnabled) return;
        window.PolitiBattle.handlePlayerAction(
          isStruggle ? { type:'move', idx:0, struggle:true }
                     : { type:'move', idx });
      });
    }

    /* ── hover tooltip ── */
    if (mv.pw > 0 && !off && aF) {
      btn.addEventListener('mouseenter', e => this.showDamageTooltip(e, mv, pF, aF, battle));
      btn.addEventListener('mousemove', e => this._posTooltip(this._dmgTip, e));
      btn.addEventListener('mouseleave', () => this.hideDamageTooltip());
    }

    return btn;
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     DAMAGE TOOLTIP
     ═══════════════════════════════════════════════════════════════════════════ */
  showDamageTooltip(e, mv, pF, aF, battle) {
    if (!this._dmgTip || !aF) return;
    const E = window.PBEngine;
    const res = E.calcDmg(pF, aF, mv, battle ? battle.weather : null);
    const lo = Math.floor(res.dmg * 0.85);
    const hi = res.dmg;
    const hpPct = aF.mhp > 0 ? Math.round((hi / aF.mhp) * 100) : 0;
    const eff = E.typeEff(mv.tp, aF.tps);
    let es = eff + 'x';
    if (eff > 1) es = '⚡' + es;
    else if (eff < 1 && eff > 0) es = '🛡' + es;
    else if (eff === 0) es = '🚫 Immune';
    let h = `Est. ${lo}–${hi} dmg · ${hpPct}% HP · ${es}`;
    if (hi >= aF.hp && aF.hp > 0) h += '<br><span class="pb-ko-warn">🔴 KO range!</span>';
    this._dmgTip.innerHTML = h;
    this._dmgTip.style.display = 'block';
    this._posTooltip(this._dmgTip, e);
  },
  hideDamageTooltip() { if (this._dmgTip) this._dmgTip.style.display = 'none'; },

  /* ═══════════════════════════════════════════════════════════════════════════
     OPPONENT HOVER TOOLTIP
     ═══════════════════════════════════════════════════════════════════════════ */
  showOpponentTooltip(e) {
    const b = this._battle; if (!b || !this._opTip) return;
    const aF = b.aTeam[b.aIdx]; if (!aF) return;

    const TC = window.PBData.TC;
    const allTypes = Object.keys(TC);
    const weak = [], res = [], imm = [];
    allTypes.forEach(t => {
      const ef = window.PBEngine.typeEff(t, aF.tps);
      if (ef > 1) weak.push(t);
      else if (ef > 0 && ef < 1) res.push(t);
      else if (ef === 0) imm.push(t);
    });
    const bge = t => `<span class="pb-tbadge-sm" style="background:${this.TC[t]||'#666'}">${t}</span>`;

    let h = `<div class="pb-ot-name">${aF.n}</div>`;
    h += `<div class="pb-ot-types">${aF.tps.map(bge).join(' ')}</div>`;
    if (weak.length) h += `<div class="pb-ot-row"><b>Weak:</b> ${weak.map(bge).join(' ')}</div>`;
    if (res.length) h += `<div class="pb-ot-row"><b>Resists:</b> ${res.map(bge).join(' ')}</div>`;
    if (imm.length) h += `<div class="pb-ot-row"><b>Immune:</b> ${imm.map(bge).join(' ')}</div>`;

    const ab = aF.abl && window.PBData.ABILITIES[aF.abl];
    if (ab) h += `<div class="pb-ot-abl"><b>Ability:</b> ${ab.n} — <i>${ab.desc}</i></div>`;

    this._opTip.innerHTML = h;
    this._opTip.style.display = 'block';
    this._posTooltip(this._opTip, e);
  },
  hideOpponentTooltip() { if (this._opTip) this._opTip.style.display = 'none'; },

  /* ═══════════════════════════════════════════════════════════════════════════
     SWITCH LIST
     ═══════════════════════════════════════════════════════════════════════════ */
  showSwitchPanel() {
    this._switchOpen = true;
    const s = document.getElementById('pb-switch-section');
    if (s) s.classList.add('pb-sw-open');
    this._renderSwitchList(this._battle);
  },
  hideSwitchPanel() {
    this._switchOpen = false;
    const s = document.getElementById('pb-switch-section');
    if (s) s.classList.remove('pb-sw-open');
  },

  _renderSwitchList(battle) {
    const box = document.getElementById('pb-switch-list');
    if (!box || !battle) return;
    box.innerHTML = '';
    battle.pTeam.forEach((f, i) => {
      const el = document.createElement('button');
      el.className = 'pb-sw-entry';
      const isActive = (i === battle.pIdx);
      const dead = f.fainted;
      el.disabled = isActive || dead;
      if (isActive) el.classList.add('pb-sw-active');
      if (dead) el.classList.add('pb-sw-dead');

      // Thumb
      const th = document.createElement('div');
      th.className = 'pb-sw-thumb';
      th.innerHTML = (window.PBData.AVATARS && window.PBData.AVATARS[f.svgId]) || '';
      el.appendChild(th);

      // Info
      const info = document.createElement('div');
      info.className = 'pb-sw-info';
      const n = document.createElement('div');
      n.className = 'pb-sw-name';
      n.textContent = f.n;
      info.appendChild(n);
      // HP bar
      const hw = document.createElement('div'); hw.className = 'pb-sw-hp-wrap';
      const hf = document.createElement('div'); hf.className = 'pb-sw-hp-fill';
      const p = f.mhp > 0 ? (f.hp / f.mhp) * 100 : 0;
      hf.style.width = p + '%';
      hf.className += p > 50 ? ' hp-green' : p > 20 ? ' hp-yellow' : ' hp-red';
      hw.appendChild(hf);
      info.appendChild(hw);
      el.appendChild(info);

      if (dead) {
        const x = document.createElement('span');
        x.className = 'pb-sw-cross';
        x.textContent = '✕';
        el.appendChild(x);
      }

      if (!el.disabled) {
        el.addEventListener('click', () => {
          if (!this._inputEnabled) return;
          window.PolitiBattle.handlePlayerAction({ type:'switch', idx: i });
        });
      }
      box.appendChild(el);
    });
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     WEATHER BADGE & TURN BADGE
     ═══════════════════════════════════════════════════════════════════════════ */
  updateWeatherBadge(weather) {
    const el = document.getElementById('pb-weather-badge');
    const ov = document.getElementById('pb-weather-overlay');
    if (el) {
      if (!weather) { el.style.display = 'none'; }
      else {
        el.style.display = '';
        const L = { sunny:'☀️ Sun', rain:'🌧️ Rain', sandstorm:'🏜️ Sand', hail:'❄️ Hail', snow:'🌨️ Snow' };
        el.textContent = L[weather] || weather;
      }
    }
    if (ov) {
      ov.className = 'pb-weather-overlay';
      if (weather) ov.classList.add('pb-weath-' + weather);
    }
  },
  _setTurn(t) {
    const el = document.getElementById('pb-turn-badge');
    if (el) el.textContent = 'Turn ' + t;
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     DESKTOP ROSTER PANEL (≥900px)
     ═══════════════════════════════════════════════════════════════════════════ */
  _renderRoster(b) {
    const box = document.getElementById('pb-roster');
    if (!box) return;
    box.innerHTML = '';
    const mk = (team, lbl, ai) => {
      const h = document.createElement('div'); h.className='pb-rost-lbl'; h.textContent = lbl;
      box.appendChild(h);
      const activeIdx = ai ? b.aIdx : b.pIdx;
      team.forEach((f, i) => {
        const r = document.createElement('div');
        r.className = 'pb-rost-row' + (i === activeIdx ? ' pb-rost-on' : '');
        const t = document.createElement('div');
        t.className = 'pb-rost-mini';
        t.innerHTML = (window.PBData.AVATARS && window.PBData.AVATARS[f.svgId]) || '';
        r.appendChild(t);
        const n = document.createElement('span');
        n.className = 'pb-rost-nm'; n.textContent = f.n;
        r.appendChild(n);
        const dot = document.createElement('span');
        dot.className = 'pb-rost-dot';
        const p = f.mhp > 0 ? f.hp/f.mhp : 0;
        dot.style.background = f.fainted?'#555': p>0.5?'#22c55e': p>0.2?'#eab308':'#ef4444';
        r.appendChild(dot);
        box.appendChild(r);
      });
    };
    mk(b.pTeam, 'Your Team', false);
    mk(b.aTeam, 'Opponent', true);
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     TIMER
     ═══════════════════════════════════════════════════════════════════════════ */
  startTimer(sec) {
    this.stopTimer();
    this._timerMax = sec || 60;
    this._timerSeconds = this._timerMax;
    this._tickTimer();
    this._timerInterval = setInterval(() => this._tickTimer(), 1000);
  },
  stopTimer() { if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval=null; } },
  resetTimer() {
    this.stopTimer();
    this._timerSeconds = this._timerMax;
    const b = document.getElementById('pb-timer-fill');
    const t = document.getElementById('pb-timer-text');
    if (b) { b.style.width='100%'; b.style.background='#3b82f6'; }
    if (t) t.textContent = this._timerMax + 's';
  },
  _tickTimer() {
    if (this._timerSeconds > 0) this._timerSeconds--;
    const pct = this._timerMax > 0 ? (this._timerSeconds / this._timerMax)*100 : 0;
    const b = document.getElementById('pb-timer-fill');
    const t = document.getElementById('pb-timer-text');
    if (b) {
      b.style.width = pct + '%';
      b.style.background = pct > 40 ? '#3b82f6' : pct > 15 ? '#eab308' : '#ef4444';
    }
    if (t) t.textContent = this._timerSeconds + 's';
    if (this._timerSeconds <= 0) {
      this.stopTimer();
      if (this._inputEnabled) this._autoMove();
    }
  },
  _autoMove() {
    const b = this._battle; if (!b) return;
    const pF = b.pTeam[b.pIdx]; if (!pF) return;
    const mi = pF.mvs.findIndex(m => m.cpp > 0);
    window.PolitiBattle.handlePlayerAction(
      mi >= 0 ? { type:'move', idx:mi } : { type:'move', idx:0, struggle:true });
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     VS SPLASH
     ═══════════════════════════════════════════════════════════════════════════ */
  async showVSSplash(pF, aF) {
    return new Promise(resolve => {
      const el = document.getElementById('pb-vs-splash');
      if (!el) { resolve(); return; }
      const qp = s => el.querySelector(s);
      const pn = qp('.pb-vs-p-name'); if (pn) pn.textContent = pF.n;
      const an = qp('.pb-vs-a-name'); if (an) an.textContent = aF.n;
      const pt = qp('.pb-vs-p-thumb');
      if (pt) pt.innerHTML = (window.PBData.AVATARS && window.PBData.AVATARS[pF.svgId]) || '';
      const at = qp('.pb-vs-a-thumb');
      if (at) {
        at.innerHTML = (window.PBData.AVATARS && window.PBData.AVATARS[aF.svgId]) || '';
        at.style.transform = 'scaleX(-1)';
      }
      el.classList.add('pb-vs-on');
      setTimeout(() => { el.classList.remove('pb-vs-on'); resolve(); }, 2000);
    });
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     ANIMATE EVENTS — processes array returned by PBMechanics.executeTurn()
     ═══════════════════════════════════════════════════════════════════════════ */
  async animateEvents(events, battle) {
    if (battle) this._battle = battle;
    const b = this._battle;
    for (const ev of events) {
      await this._animOne(ev, b);
    }
    this.fullRefresh(b);
  },

  async _animOne(ev, b) {
    const pF = b.pTeam[b.pIdx];
    const aF = b.aTeam[b.aIdx];
    const snd = window.PBSound;

    switch (ev.type) {

      case 'move': {
        this.log(ev.msg, 'move');
        const pSide = b.pTeam.some(f => f.id === ev.actor);
        if (snd) {
          if (ev.dmg > 0) snd.playHit(ev.move ? ev.move.tp : null);
          if (ev.isCrit) snd.playCrit();
          if (ev.eff > 1) snd.playSuperEffective();
          else if (ev.eff < 1 && ev.eff > 0) snd.playNotEffective();
        }
        await this.animFighter2D(pSide ? 'player' : 'enemy', 'attack');
        await this.animFighter2D(pSide ? 'enemy' : 'player', 'hit');
        if (ev.dmg > 0) this._floatDmg(ev.dmg, pSide ? 'enemy' : 'player', ev.isCrit, ev.eff);
        if (ev.eff > 1) this._effTxt('Super effective!', '#f97316');
        else if (ev.eff < 1 && ev.eff > 0) this._effTxt('Not very effective…', '#94a3b8');
        else if (ev.eff === 0) this._effTxt('No effect!', '#555');
        if (ev.isCrit) this._effTxt('CRITICAL HIT!', '#fbbf24');
        this.updateHP(pF, true); this.updateHP(aF, false);
        this.renderStatusChips(pF, true); this.renderStatusChips(aF, false);
        await this._wait(420);
        break;
      }

      case 'ko': {
        this.log(ev.msg, 'ko');
        if (snd) snd.playKO();
        const pko = b.pTeam.some(f => f.id === ev.actor && f.fainted);
        await this.animFighter2D(pko ? 'player' : 'enemy', 'ko');
        this.updateHP(pF, true); this.updateHP(aF, false);
        await this._wait(600);
        break;
      }

      case 'switch': {
        this.log(ev.msg, 'switch');
        this._renderSprite(pF, 'player');
        this._renderSprite(aF, 'enemy');
        this.updateHP(pF, true); this.updateHP(aF, false);
        this.renderStatusChips(pF, true); this.renderStatusChips(aF, false);
        this._renderSwitchList(b); this._renderRoster(b);
        await this._wait(500);
        break;
      }

      case 'need-switch': {
        this.log(ev.msg, 'info');
        this._needSwitchMode = true;
        this._inputEnabled = true;
        this.showSwitchPanel();
        this._renderSwitchList(b);
        // Hide move grid during forced switch
        const mg = document.getElementById('pb-move-section');
        if (mg) mg.style.display = 'none';
        break;
      }

      case 'battle-end': {
        const won = ev.msg === 'player';
        this.log(won ? '🎉 You win!' : '💀 You lost!', 'ko');
        if (snd) { if (won) snd.playVictory(); else snd.playDefeat(); }
        await this._wait(1500);
        break;
      }

      case 'status': {
        if (ev.msg) this.log(ev.msg, 'status');
        this.renderStatusChips(pF, true); this.renderStatusChips(aF, false);
        if (snd && ev.statusApplied) snd.playStatus(ev.statusApplied);
        await this._wait(300);
        break;
      }

      case 'weather': {
        if (ev.msg) this.log(ev.msg, 'weather');
        this.updateWeatherBadge(b.weather);
        await this._wait(250);
        break;
      }

      case 'stage': {
        if (ev.msg) this.log(ev.msg, 'info');
        await this._wait(200);
        break;
      }

      case 'heal': case 'recoil': case 'item-heal': case 'item-recoil': {
        if (ev.msg) this.log(ev.msg, ev.type.includes('heal') ? 'heal' : 'info');
        this.updateHP(pF, true); this.updateHP(aF, false);
        await this._wait(250);
        break;
      }

      default: {
        if (ev.msg) this.log(ev.msg, ev.type || 'info');
        await this._wait(200);
        break;
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     FIGHTER 2D ANIMATION PRIMITIVES
     ═══════════════════════════════════════════════════════════════════════════ */
  async animFighter2D(side, anim) {
    const el = document.getElementById('pb-' + side + '-sprite');
    if (!el) return;
    el.classList.add('pb-a-' + anim);
    await this._wait(anim === 'ko' ? 800 : anim === 'attack' ? 350 : 280);
    el.classList.remove('pb-a-' + anim);
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     FLOATING DAMAGE / EFFECTIVENESS TEXT
     ═══════════════════════════════════════════════════════════════════════════ */
  _floatDmg(amt, side, crit, eff) {
    const field = document.getElementById('pb-field');
    if (!field) return;
    const el = document.createElement('div');
    el.className = 'pb-fdmg' + (crit ? ' pb-fdmg-crit' : '');
    if (eff > 1) el.style.color = '#f97316';
    else if (eff < 1 && eff > 0) el.style.color = '#94a3b8';
    el.textContent = '-' + amt;
    if (side === 'enemy') { el.style.right = '22%'; el.style.top = '18%'; }
    else { el.style.left = '22%'; el.style.bottom = '22%'; }
    field.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  },

  _effTxt(text, color) {
    const field = document.getElementById('pb-field');
    if (!field) return;
    const el = document.createElement('div');
    el.className = 'pb-eff-txt';
    el.textContent = text;
    el.style.color = color;
    field.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     TOOLTIPS — shared helpers
     ═══════════════════════════════════════════════════════════════════════════ */
  _createTooltips() {
    if (!this._dmgTip) {
      this._dmgTip = document.createElement('div');
      this._dmgTip.className = 'pb-tip pb-dmg-tip';
      this._dmgTip.style.display = 'none';
      document.body.appendChild(this._dmgTip);
    }
    if (!this._opTip) {
      this._opTip = document.createElement('div');
      this._opTip.className = 'pb-tip pb-op-tip';
      this._opTip.style.display = 'none';
      document.body.appendChild(this._opTip);
    }
  },

  _posTooltip(el, e) {
    if (!el) return;
    const pad = 12;
    let x = e.clientX + pad;
    let y = e.clientY - el.offsetHeight - pad;
    if (x + el.offsetWidth > window.innerWidth) x = window.innerWidth - el.offsetWidth - pad;
    if (y < 0) y = e.clientY + pad;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     KEYBOARD CONTROLS
     ═══════════════════════════════════════════════════════════════════════════ */
  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (!this._inputEnabled) return;
      const b = this._battle; if (!b) return;
      const pF = b.pTeam[b.pIdx]; if (!pF) return;

      // 1-4 fire moves
      if (e.key >= '1' && e.key <= '4' && !this._needSwitchMode) {
        e.preventDefault();
        const i = +e.key - 1;
        const allEmpty = pF.mvs.every(m => m.cpp <= 0);
        if (allEmpty) { window.PolitiBattle.handlePlayerAction({ type:'move', idx:0, struggle:true }); }
        else if (pF.mvs[i] && pF.mvs[i].cpp > 0) {
          const choiceLocked = pF._choiceLocked && pF.itm &&
            ['magaHat','choiceScarf','choiceSpecs','choiceBand'].includes(pF.itm);
          if (choiceLocked && pF._choiceLocked !== pF.mvs[i].id) return;
          window.PolitiBattle.handlePlayerAction({ type:'move', idx:i });
        }
      }
      // S toggle switch
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        this._switchOpen ? this.hideSwitchPanel() : this.showSwitchPanel();
      }
      // Esc close panels
      if (e.key === 'Escape') {
        this.hideDamageTooltip();
        this.hideOpponentTooltip();
        this.hideSwitchPanel();
      }
      // F forfeit
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !this._needSwitchMode) {
        window.PolitiBattle._forfeitBattle();
      }
    });
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     ENEMY HP BOX / SPRITE HOVER  →  opponent tooltip
     ═══════════════════════════════════════════════════════════════════════════ */
  _bindEnemyHover() {
    const targets = ['pb-enemy-hpbox', 'pb-enemy-sprite'];
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('mouseenter', e => this.showOpponentTooltip(e));
      el.addEventListener('mousemove', e => this._posTooltip(this._opTip, e));
      el.addEventListener('mouseleave', () => this.hideOpponentTooltip());
    });
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     FORFEIT BUTTON
     ═══════════════════════════════════════════════════════════════════════════ */
  _bindForfeit() {
    const btn = document.getElementById('pb-forfeit-btn');
    if (btn) btn.addEventListener('click', () => window.PolitiBattle._forfeitBattle());
  },

  /* ═══════════════════════════════════════════════════════════════════════════
     INPUT ENABLE / DISABLE
     ═══════════════════════════════════════════════════════════════════════════ */
  enableInput() { this._inputEnabled = true; },
  disableInput() { this._inputEnabled = false; },

  /* ═══════════════════════════════════════════════════════════════════════════
     STUBS for pages that load pb-ui.js but use different features
     ═══════════════════════════════════════════════════════════════════════════ */
  renderPreview() {},
  renderDex() {},
  drawRadarChart() {},

  /* ═══════════════════════════════════════════════════════════════════════════
     UTIL
     ═══════════════════════════════════════════════════════════════════════════ */
  _wait(ms) { return new Promise(r => setTimeout(r, ms)); },

}; // end window.PBUI
