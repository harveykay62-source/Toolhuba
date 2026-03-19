// PolitiBattle Module — politibattle-main — loaded by politibattle.html
'use strict';

window.PolitiBattle = {

  _state: 'home',
  _battle: null,
  _playerTeam: [],
  _aiTeam: [],
  _settings: {},
  _selectedLeadIdx: -1,
  _pvCountdownTimer: null,
  _turnTimer: null,
  _turnSeconds: 60,
  _inputLocked: false,
  _tbSelectedIds: new Set(),
  _tbActiveType: null,
  _tbSearchDebounce: null,

  // ─── INIT ───────────────────────────────────────────────────────────────────
  init() {
    this.loadSettings();
    this._updateHomeStats();
    this._buildTypePills();
    this.initKeyboard();
    // Render dex grid eagerly (hidden until shown)
    this._renderDexGrid();
    console.log('[PolitiBattle] init complete');
  },

  // ─── SCREEN MANAGEMENT ──────────────────────────────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.pb-screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      this._state = id.replace('Screen', '').replace('Screen', '');
    }
    // Stop preview timer when leaving preview
    if (id !== 'previewScreen') this._stopPvCountdown();
    // Stop turn timer when leaving battle
    if (id !== 'battleScreen') this.stopTurnTimer();
    // Refresh stats on home
    if (id === 'homeScreen') this._updateHomeStats();
  },

  // ─── QUICK BATTLE ───────────────────────────────────────────────────────────
  startQuickBattle() {
    const AI = window.PBAI;
    if (!AI) { console.error('PBAI not loaded'); return; }
    const rawPlayerTeam = AI.generateAITeam('normal');
    const rawAiTeam     = AI.generateAITeam('normal');
    const E = window.PBEngine;
    this._playerTeam = rawPlayerTeam.map(p => E.buildFighter(p, true));
    this._aiTeam     = rawAiTeam.map(p => E.buildFighter(p, false));
    // Store raw pol data for UI rendering (avatar/types)
    this._playerTeamData = rawPlayerTeam;
    this._aiTeamData     = rawAiTeam;
    this._selectedLeadIdx = -1;
    this.showPreview(rawPlayerTeam, rawAiTeam);
  },

  // ─── PREVIEW SCREEN ─────────────────────────────────────────────────────────
  showPreview(playerTeamData, aiTeamData) {
    this._playerTeamData = playerTeamData;
    this._aiTeamData     = aiTeamData;
    this._selectedLeadIdx = -1;
    this.showScreen('previewScreen');
    this._renderPreviewGrids();
    this._startPvCountdown(30);
    // AI auto-selects lead after 1.5s
    setTimeout(() => this._pvShowAILead(), 1500);
  },

  _renderPreviewGrids() {
    const makeCard = (pol, idx, side) => {
      const avatarSVG = (window.PBData.AVATARS && window.PBData.AVATARS[pol.svgId]) || '';
      const types = (pol.tps || []).map(t => `<span class="pb-type pb-type-${t}">${t}</span>`).join('');
      const card = document.createElement('div');
      card.className = 'pv-fighter-card';
      card.dataset.idx = idx;
      card.innerHTML = `${avatarSVG}<div class="pv-fighter-name">${pol.n}</div><div class="pv-fighter-types">${types}</div>`;
      if (side === 'player') {
        card.onclick = () => this._pvSelectLead(idx);
      }
      return card;
    };
    const pg = document.getElementById('pvPlayerGrid');
    const ag = document.getElementById('pvAiGrid');
    if (pg) { pg.innerHTML = ''; this._playerTeamData.forEach((p, i) => pg.appendChild(makeCard(p, i, 'player'))); }
    if (ag) { ag.innerHTML = ''; this._aiTeamData.forEach((p, i) => ag.appendChild(makeCard(p, i, 'ai'))); }
    const btn = document.getElementById('pvBattleBtn');
    if (btn) btn.classList.remove('ready');
  },

  _pvSelectLead(idx) {
    this._selectedLeadIdx = idx;
    document.querySelectorAll('#pvPlayerGrid .pv-fighter-card').forEach((c, i) => {
      c.classList.toggle('selected', i === idx);
    });
    const prompt = document.getElementById('pvPlayerPrompt');
    if (prompt) prompt.textContent = `Lead: ${this._playerTeamData[idx].n}`;
    this._pvCheckReady();
  },

  _pvShowAILead() {
    const aiLeadIdx = 0;
    document.querySelectorAll('#pvAiGrid .pv-fighter-card').forEach((c, i) => {
      c.classList.toggle('ai-lead', i === aiLeadIdx);
    });
    const prompt = document.getElementById('pvAiPrompt');
    if (prompt) prompt.textContent = `AI Lead: ${this._aiTeamData[aiLeadIdx].n}`;
    this._pvCheckReady();
  },

  _pvCheckReady() {
    const btn = document.getElementById('pvBattleBtn');
    if (btn && this._selectedLeadIdx >= 0) btn.classList.add('ready');
  },

  _startPvCountdown(sec) {
    this._stopPvCountdown();
    let s = sec;
    const el = document.getElementById('pvCountdown');
    this._pvCountdownTimer = setInterval(() => {
      s--;
      if (el) el.textContent = s;
      if (s <= 0) {
        this._stopPvCountdown();
        // Auto-select lead 0 if none chosen
        if (this._selectedLeadIdx < 0) this._pvSelectLead(0);
        this.confirmLeadAndStartBattle(this._selectedLeadIdx);
      }
    }, 1000);
  },

  _stopPvCountdown() {
    if (this._pvCountdownTimer) { clearInterval(this._pvCountdownTimer); this._pvCountdownTimer = null; }
  },

  // ─── CONFIRM LEAD & START ───────────────────────────────────────────────────
  confirmLeadAndStartBattle(playerLeadIdx) {
    this._stopPvCountdown();
    if (playerLeadIdx < 0) playerLeadIdx = 0;
    // Reorder: selected lead goes to index 0
    if (playerLeadIdx !== 0) {
      [this._playerTeam[0], this._playerTeam[playerLeadIdx]] = [this._playerTeam[playerLeadIdx], this._playerTeam[0]];
      if (this._playerTeamData) {
        [this._playerTeamData[0], this._playerTeamData[playerLeadIdx]] = [this._playerTeamData[playerLeadIdx], this._playerTeamData[playerLeadIdx - playerLeadIdx + 0]];
      }
    }
    const battle = window.PBEngine.createBattle(this._playerTeam, this._aiTeam);
    this._battle = battle;

    if (this._settings._3dMode) {
      this.launchArena(battle);
      return;
    }
    this.showScreen('battleScreen');
    this._renderBattleUI();
    this._appendLog('⚔️ Battle started!', 'info');
    this.startTurnTimer();
  },

  // ─── BATTLE UI RENDERING ────────────────────────────────────────────────────
  _renderBattleUI() {
    const b = this._battle;
    if (!b) return;
    this._renderFighters();
    this._renderMoves();
    this._renderSwitchList();
    this._renderSidePanel();
    this._updateHPBoxes();
  },

  _renderFighters() {
    const b = this._battle;
    const pf = b.pTeam[b.pIdx];
    const af = b.aTeam[b.aIdx];
    const AVTS = window.PBData.AVATARS || {};
    const pEl = document.getElementById('btPlayerSprite');
    const aEl = document.getElementById('btEnemySprite');
    if (pEl) pEl.innerHTML = AVTS[pf.id] || `<div style="font-size:3rem;text-align:center">${pf.e||'❓'}</div>`;
    if (aEl) aEl.innerHTML = AVTS[af.id] || `<div style="font-size:3rem;text-align:center">${af.e||'❓'}</div>`;
  },

  _renderMoves() {
    const b = this._battle;
    if (!b) return;
    const pf = b.pTeam[b.pIdx];
    const af = b.aTeam[b.aIdx];
    const grid = document.getElementById('btMoveGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const D = window.PBData;
    const catIcon = { physical:'💥', special:'✨', status:'💤' };
    pf.mvs.forEach((mv, i) => {
      const eff = D.TC && D.TC[mv.tp] ? D.TC[mv.tp][af.tps[0]] || 1 : 1;
      const effTxt = eff === 2 ? '2x' : eff === 1.5 ? '1.5x' : eff === 0.5 ? '0.5x' : eff === 0 ? 'Immune' : '1x';
      const btn = document.createElement('button');
      btn.className = 'bt-move-btn';
      btn.dataset.idx = i;
      btn.disabled = mv.cpp <= 0 || this._inputLocked;
      btn.innerHTML = `
        <div class="bt-move-top">
          <span class="pb-type pb-type-${mv.tp}">${mv.tp}</span>
          <span class="bt-move-name">${mv.n}</span>
          <span class="bt-move-pp">${mv.cpp}/${mv.pp}</span>
        </div>
        <div class="bt-move-bottom">
          <span class="bt-move-cat">${catIcon[mv.c]||''}</span>
          <span class="bt-move-pw">PWR ${mv.pw||'—'}</span>
          <span class="bt-move-acc">ACC ${mv.ac||'—'}%</span>
        </div>
        <div class="bt-move-tooltip">${effTxt} vs ${af.n}</div>`;
      btn.onclick = () => { if (!this._inputLocked) this.handlePlayerAction({ type:'move', idx:i }); };
      grid.appendChild(btn);
    });
    // Fill empty slots up to 4
    while (grid.children.length < 4) {
      const ph = document.createElement('div');
      ph.className = 'bt-move-btn';
      ph.style.opacity = '.15';
      ph.style.pointerEvents = 'none';
      ph.innerHTML = '<div class="bt-move-top"><span class="bt-move-name">—</span></div>';
      grid.appendChild(ph);
    }
  },

  _renderSwitchList() {
    const b = this._battle;
    if (!b) return;
    const AVTS = window.PBData.AVATARS || {};
    const list = document.getElementById('btSwitchList');
    if (!list) return;
    list.innerHTML = '';
    b.pTeam.forEach((f, i) => {
      if (i === b.pIdx) return;
      const hpPct = Math.round((f.hp / f.mhp) * 100);
      const hpCol = hpPct > 50 ? '#22c55e' : hpPct > 20 ? '#eab308' : '#ef4444';
      const btn = document.createElement('button');
      btn.className = 'bt-switch-btn';
      btn.disabled = f.fainted || this._inputLocked;
      btn.innerHTML = `
        <div class="bt-switch-thumb">${AVTS[f.id]||''}</div>
        <div class="bt-switch-info">
          <div class="bt-switch-name">${f.n}</div>
          <div class="bt-switch-hp-wrap"><div class="bt-switch-hp-bar" style="width:${hpPct}%;background:${hpCol}"></div></div>
        </div>`;
      btn.onclick = () => { if (!this._inputLocked) this.handlePlayerAction({ type:'switch', idx:i }); };
      list.appendChild(btn);
    });
  },

  _renderSidePanel() {
    const b = this._battle;
    if (!b) return;
    const AVTS = window.PBData.AVATARS || {};
    const renderTeam = (team, activeIdx, elId) => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = '';
      team.forEach((f, i) => {
        const hpPct = f.fainted ? 0 : Math.round((f.hp / f.mhp) * 100);
        const dotCls = f.fainted ? 'fainted' : hpPct > 50 ? 'green' : hpPct > 20 ? 'yellow' : 'red';
        const row = document.createElement('div');
        row.className = 'bt-panel-row';
        row.innerHTML = `
          <div class="bt-panel-thumb">${AVTS[f.id]||'❓'}</div>
          <div class="bt-panel-dot ${dotCls}"></div>
          <div class="bt-panel-name">${f.n}</div>`;
        if (i === activeIdx) row.style.opacity = '1';
        else row.style.opacity = '.5';
        el.appendChild(row);
      });
    };
    renderTeam(b.pTeam, b.pIdx, 'btPanelPlayer');
    renderTeam(b.aTeam, b.aIdx, 'btPanelAI');
  },

  _updateHPBoxes() {
    const b = this._battle;
    if (!b) return;
    const pf = b.pTeam[b.pIdx];
    const af = b.aTeam[b.aIdx];
    const AVTS = window.PBData.AVATARS || {};
    // Update turn badge
    const tb = document.getElementById('btTurnBadge');
    if (tb) tb.textContent = `TURN ${b.turn}`;
    // Weather
    const wb = document.getElementById('btWeatherBadge');
    if (wb) { wb.textContent = b.weather || ''; wb.style.display = b.weather ? 'block' : 'none'; }
    // Enemy
    this._updateHPBox('enemy', af);
    // Player
    this._updateHPBox('player', pf);
  },

  _updateHPBox(side, fighter) {
    const cap = side === 'enemy' ? 'Enemy' : 'Player';
    const hpPct = Math.max(0, Math.round((fighter.hp / fighter.mhp) * 100));
    const bar = document.getElementById(`bt${cap}HPBar`);
    const name = document.getElementById(`bt${cap}Name`);
    const types = document.getElementById(`bt${cap}Types`);
    const status = document.getElementById(`bt${cap}Status`);
    if (name) name.textContent = fighter.n;
    if (bar) {
      bar.style.width = hpPct + '%';
      bar.className = 'bt-hp-bar' + (hpPct > 50 ? '' : hpPct > 20 ? ' yellow' : ' red');
    }
    if (types) {
      types.innerHTML = (fighter.tps || []).map(t => `<span class="pb-type pb-type-${t}">${t}</span>`).join('');
    }
    if (status) {
      const s = fighter.status;
      status.className = 'bt-hp-status' + (s ? ` ${s}` : '');
      status.textContent = s || '';
    }
    if (side === 'player') {
      const nums = document.getElementById('btPlayerHPNums');
      if (nums) nums.textContent = `${fighter.hp} / ${fighter.mhp}`;
    }
  },

  _appendLog(msg, type = 'info') {
    const log = document.getElementById('btLog');
    if (!log) return;
    const span = document.createElement('div');
    span.className = `log-${type}`;
    span.textContent = msg;
    log.appendChild(span);
    log.scrollTop = log.scrollHeight;
  },

  // ─── BATTLE LOOP ────────────────────────────────────────────────────────────
  async handlePlayerAction(action) {
    if (this._inputLocked || !this._battle || this._battle.over) return;
    this.lockInput();
    this.stopTurnTimer();

    const events = await window.PBMechanics.executeTurn(this._battle, action);

    // Process events → log messages + animations
    for (const ev of events) {
      await this._processEvent(ev);
    }

    this._updateHPBoxes();
    this._renderMoves();
    this._renderSwitchList();
    this._renderSidePanel();
    this._renderFighters();

    if (this._battle.over) {
      setTimeout(() => this.showVictory(), 800);
      return;
    }
    this.unlockInput();
    this.startTurnTimer();
  },

  async _processEvent(ev) {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    if (!ev) return;
    switch (ev.type) {
      case 'move':
        if (ev.msg) this._appendLog(ev.msg, 'use');
        break;
      case 'damage':
        if (ev.msg) this._appendLog(ev.msg, 'dmg');
        if (ev.isCrit) this._appendLog('Critical hit!', 'crit');
        if (ev.eff > 1) this._appendLog("It's super effective!", 'eff');
        else if (ev.eff < 1 && ev.eff > 0) this._appendLog("It's not very effective…", 'eff');
        else if (ev.eff === 0) this._appendLog("It had no effect!", 'eff');
        this._flashSprite(ev.actor === 'ai' || ev.actor === this._battle?.aTeam[this._battle.aIdx]?.id ? 'enemy' : 'player');
        this._renderDamageNum(ev.dmg, ev.actor === 'ai');
        this._updateHPBoxes();
        await delay(300);
        break;
      case 'heal':
        if (ev.msg) this._appendLog(ev.msg, 'heal');
        this._updateHPBoxes();
        break;
      case 'status':
        if (ev.msg) this._appendLog(ev.msg, 'status');
        break;
      case 'ko':
        if (ev.msg) this._appendLog(ev.msg, 'ko');
        await delay(400);
        break;
      case 'switch':
        if (ev.msg) this._appendLog(ev.msg, 'info');
        this._renderFighters();
        break;
      case 'battle-end':
        break;
      default:
        if (ev.msg) this._appendLog(ev.msg, 'info');
    }
    await delay(80);
  },

  _flashSprite(side) {
    const id = side === 'enemy' ? 'btEnemySprite' : 'btPlayerSprite';
    const el = document.getElementById(id);
    if (!el) return;
    el.style.filter = 'brightness(3) drop-shadow(0 0 8px #fff)';
    setTimeout(() => { el.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,.6))'; }, 150);
  },

  _renderDamageNum(dmg, isEnemySide) {
    const field = document.getElementById('btField');
    if (!field || !dmg) return;
    const el = document.createElement('div');
    el.className = 'pb-damage-num';
    el.textContent = `-${dmg}`;
    el.style.left = isEnemySide ? '75%' : '20%';
    el.style.top = isEnemySide ? '30px' : '160px';
    field.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  },

  // ─── VICTORY ────────────────────────────────────────────────────────────────
  showVictory() {
    const b = this._battle;
    if (!b) return;
    const won = b.winner === 'player';
    const trophy = document.getElementById('vcTrophy');
    const result = document.getElementById('vcResult');
    const flavour = document.getElementById('vcFlavour');
    if (trophy) trophy.textContent = won ? '🏆' : '💀';
    if (result) { result.textContent = won ? 'VICTORY!' : 'DEFEATED!'; result.className = 'vc-result ' + (won ? 'win' : 'loss'); }
    const flavourLines = won
      ? ["The people have spoken. Your opponent has been… cancelled.", "Democracy wins. Your opponent lost the popular vote.", "Landslide victory. The pundits never saw it coming."]
      : ["Gerrymandering couldn't save you this time.", "You've been fact-checked into oblivion.", "A narrow defeat. Blame the electoral college."];
    if (flavour) flavour.textContent = flavourLines[Math.floor(Math.random() * flavourLines.length)];
    // Stats
    const s = b.stats;
    document.getElementById('vcDmg').textContent   = s.pDmgDealt || 0;
    document.getElementById('vcCrits').textContent = s.pCrits    || 0;
    document.getElementById('vcTurns').textContent = b.turn;
    document.getElementById('vcKOs').textContent   = s.pKOs      || 0;
    // Save W/L
    const wl = JSON.parse(localStorage.getItem('pb_wl') || '{"w":0,"l":0}');
    if (won) wl.w++; else wl.l++;
    localStorage.setItem('pb_wl', JSON.stringify(wl));
    // Achievement
    const ach = document.getElementById('vcAchieve');
    if (ach && won && (s.pCrits || 0) >= 3) {
      ach.textContent = '🏅 Critical Masses — Landed 3+ crits in one battle!';
      ach.classList.add('show');
    }
    this.showScreen('victoryScreen');
  },

  // ─── 3D MODE ────────────────────────────────────────────────────────────────
  launchArena(battle) {
    try {
      sessionStorage.setItem('politiBattleState', JSON.stringify(battle));
    } catch(e) { console.warn('sessionStorage write failed', e); }
    window.location.href = '/arena';
  },

  // ─── INPUT LOCK ─────────────────────────────────────────────────────────────
  lockInput() {
    this._inputLocked = true;
    document.querySelectorAll('.bt-move-btn, .bt-switch-btn').forEach(b => b.disabled = true);
  },

  unlockInput() {
    this._inputLocked = false;
    this._renderMoves();
    this._renderSwitchList();
  },

  // ─── TURN TIMER ─────────────────────────────────────────────────────────────
  startTurnTimer() {
    this.stopTurnTimer();
    this._turnSeconds = 60;
    const bar = document.getElementById('btTimerBar');
    const num = document.getElementById('btTimerNum');
    if (bar) { bar.style.width = '100%'; bar.classList.remove('low'); }
    if (num) num.textContent = '60';
    this._turnTimer = setInterval(() => {
      this._turnSeconds--;
      const pct = (this._turnSeconds / 60) * 100;
      if (bar) { bar.style.width = pct + '%'; if (this._turnSeconds <= 15) bar.classList.add('low'); }
      if (num) num.textContent = this._turnSeconds;
      if (this._turnSeconds <= 0) {
        this.stopTurnTimer();
        // Auto-select random available move
        const b = this._battle;
        if (b && !b.over && !this._inputLocked) {
          const pf = b.pTeam[b.pIdx];
          const avail = pf.mvs.map((mv, i) => ({ mv, i })).filter(({mv}) => mv.cpp > 0);
          const pick = avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)].i : 0;
          this.handlePlayerAction({ type: 'move', idx: pick });
        }
      }
    }, 1000);
  },

  stopTurnTimer() {
    if (this._turnTimer) { clearInterval(this._turnTimer); this._turnTimer = null; }
  },

  // ─── KEYBOARD ───────────────────────────────────────────────────────────────
  initKeyboard() {
    document.addEventListener('keydown', e => {
      if (this._state !== 'battle' || this._inputLocked) return;
      const key = e.key;
      if (key >= '1' && key <= '4') {
        const idx = parseInt(key) - 1;
        const b = this._battle;
        if (b && b.pTeam[b.pIdx].mvs[idx]?.cpp > 0) {
          e.preventDefault();
          this.handlePlayerAction({ type: 'move', idx });
        }
      }
    });
  },

  // ─── SETTINGS ───────────────────────────────────────────────────────────────
  loadSettings() {
    try {
      const raw = localStorage.getItem('pb_settings');
      this._settings = raw ? JSON.parse(raw) : {};
    } catch(e) { this._settings = {}; }
    // Apply to UI
    const vol = document.getElementById('settingVolume');
    const mute = document.getElementById('settingMute');
    const d3 = document.getElementById('setting3D');
    if (vol) vol.value = this._settings.volume ?? 60;
    if (mute && this._settings.mute) mute.classList.add('on');
    if (d3 && this._settings._3dMode) d3.classList.add('on');
  },

  saveSettings() {
    try { localStorage.setItem('pb_settings', JSON.stringify(this._settings)); } catch(e) {}
  },

  _onSettingChange() {
    const vol = document.getElementById('settingVolume');
    const mute = document.getElementById('settingMute');
    const d3 = document.getElementById('setting3D');
    if (vol) this._settings.volume = parseInt(vol.value);
    if (mute) this._settings.mute = mute.classList.contains('on');
    if (d3) this._settings._3dMode = d3.classList.contains('on');
    this.saveSettings();
  },

  // ─── HOME STATS ─────────────────────────────────────────────────────────────
  _updateHomeStats() {
    const wl = JSON.parse(localStorage.getItem('pb_wl') || '{"w":0,"l":0}');
    const w = document.getElementById('homeWins');
    const l = document.getElementById('homeLosses');
    if (w) w.textContent = wl.w;
    if (l) l.textContent = wl.l;
  },

  // ─── OPEN MODALS ────────────────────────────────────────────────────────────
  _openSettings() {
    document.getElementById('settingsModal').classList.add('open');
  },

  _openTypeChart() {
    const modal = document.getElementById('typeChartModal');
    if (!modal) return;
    const content = document.getElementById('typeChartContent');
    if (content && !content.dataset.built) {
      content.innerHTML = this._buildTypeChartHTML();
      content.dataset.built = '1';
    }
    modal.classList.add('open');
  },

  _buildTypeChartHTML() {
    const TC = window.PBData.TC;
    if (!TC) return '<p>Type chart not loaded.</p>';
    const types = Object.keys(TC);
    const abbr = { Republican:'Rep', Democrat:'Dem', Libertarian:'Lib', Green:'Grn', Socialist:'Soc',
                   Authoritarian:'Auth', Centrist:'Cen', Populist:'Pop', Corporate:'Corp', Revolutionary:'Rev' };
    let html = '<table class="tc-table"><thead><tr><th></th>';
    types.forEach(t => { html += `<th>${abbr[t]||t.slice(0,4)}</th>`; });
    html += '</tr></thead><tbody>';
    types.forEach(atk => {
      html += `<tr><th>${abbr[atk]||atk.slice(0,4)}</th>`;
      types.forEach(def => {
        const val = TC[atk][def] ?? 1;
        const cls = val === 2 ? 'tc-cell-2' : val === 0.5 ? 'tc-cell-05' : val === 0 ? 'tc-cell-0' : 'tc-cell-1';
        const disp = val === 0 ? '✕' : val === 2 ? '2×' : val === 1.5 ? '1.5' : val === 0.5 ? '½' : '·';
        html += `<td class="${cls}" title="${atk} vs ${def}: ${val}×">${disp}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  },

  // ─── DEX ────────────────────────────────────────────────────────────────────
  _renderDexGrid() {
    const grid = document.getElementById('dexGrid');
    const count = document.getElementById('dexCount');
    if (!grid) return;
    const POLS = window.PBData.POLS || [];
    const AVTS = window.PBData.AVATARS || {};
    if (count) count.textContent = `${POLS.length} Fighters`;
    grid.innerHTML = '';
    const STAT_MAX = { hp:200, atk:150, def:150, spa:150, spd:150, spe:150 };
    POLS.forEach(pol => {
      const types = (pol.tps || []).map(t => `<span class="pb-type pb-type-${t}">${t}</span>`).join('');
      const bst = Object.values(pol.bs).reduce((a, b) => a + b, 0);
      const statBars = Object.entries(pol.bs).map(([k, v]) => {
        const pct = Math.min(100, Math.round((v / (STAT_MAX[k] || 150)) * 100));
        return `<div class="dex-stat-row">
          <span class="dex-stat-lbl">${k.toUpperCase()}</span>
          <div class="dex-stat-bar-wrap"><div class="dex-stat-bar" style="width:${pct}%"></div></div>
          <span class="dex-stat-val">${v}</span>
        </div>`;
      }).join('');
      const card = document.createElement('div');
      card.className = 'dex-card';
      card.innerHTML = `
        ${AVTS[pol.svgId] || `<div style="font-size:3rem;height:107px;display:flex;align-items:center;justify-content:center">${pol.e||'❓'}</div>`}
        <div class="dex-card-name">${pol.n}</div>
        <div class="dex-card-types">${types}</div>
        <div class="dex-stat-bars">${statBars}</div>`;
      card.onclick = () => this._openDexDetail(pol);
      grid.appendChild(card);
    });
  },

  _openDexDetail(pol) {
    const modal = document.getElementById('dexDetailModal');
    const content = document.getElementById('dexDetailContent');
    if (!modal || !content) return;
    const AVTS = window.PBData.AVATARS || {};
    const D = window.PBData;
    const types = (pol.tps || []).map(t => `<span class="pb-type pb-type-${t}">${t}</span>`).join(' ');
    const bst = Object.values(pol.bs).reduce((a, b) => a + b, 0);
    const abl = D.ABILITIES && D.ABILITIES[pol.abl] ? D.ABILITIES[pol.abl] : { n: pol.abl, desc: '' };
    const moves = (pol.mvs || []).map(mvId => {
      const mv = D.MOVES && D.MOVES[mvId];
      if (!mv) return '';
      return `<div class="dex-detail-move-row">
        <span class="pb-type pb-type-${mv.tp}">${mv.tp}</span>
        <span class="dex-detail-move-name">${mv.n}</span>
        <span class="dex-detail-move-pw">PWR ${mv.pw||'—'}</span>
      </div>`;
    }).join('');
    // Radar canvas
    const radarId = 'dexRadar_' + pol.id;
    content.innerHTML = `
      <div class="dex-detail-top">
        <div class="dex-detail-avatar">${AVTS[pol.svgId]||''}</div>
        <div class="dex-detail-info">
          <div class="dex-detail-name">${pol.n} ${pol.e||''}</div>
          <div class="dex-detail-ttl">${pol.ttl||''}</div>
          <div style="margin-bottom:6px">${types}</div>
          <div class="dex-detail-fl">"${pol.fl||''}"</div>
          <div class="dex-detail-abl">Ability: ${abl.n || pol.abl}${abl.desc ? ' — '+abl.desc : ''}</div>
          <div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:4px">Nature: ${pol.nat} · BST: ${bst}</div>
        </div>
      </div>
      <div class="dex-radar-wrap"><canvas id="${radarId}" width="260" height="180"></canvas></div>
      <div class="dex-detail-moves">
        <div class="dex-detail-moves-title">Moves</div>
        ${moves}
      </div>`;
    modal.classList.add('open');
    // Draw radar chart
    requestAnimationFrame(() => this._drawRadar(radarId, pol.bs));
  },

  _drawRadar(canvasId, bs) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2 + 10;
    const r = Math.min(W, H) * 0.38;
    const keys = ['hp','atk','def','spa','spd','spe'];
    const labels = ['HP','ATK','DEF','SP.A','SP.D','SPE'];
    const maxV = 180;
    const n = keys.length;
    ctx.clearRect(0, 0, W, H);
    // Grid
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const rr = r * ring / 4;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.stroke();
    }
    // Axes
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.stroke();
    }
    // Data
    ctx.beginPath();
    keys.forEach((k, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const v = Math.min(bs[k] || 0, maxV) / maxV;
      const x = cx + Math.cos(a) * r * v, y = cy + Math.sin(a) * r * v;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(58,134,255,.3)'; ctx.fill();
    ctx.strokeStyle = '#3a86ff'; ctx.lineWidth = 2; ctx.stroke();
    // Labels
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    labels.forEach((lbl, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * (r + 16), y = cy + Math.sin(a) * (r + 16) + 4;
      ctx.fillText(lbl, x, y);
    });
  },

  // ─── TEAM BUILD HELPERS ─────────────────────────────────────────────────────
  _buildTypePills() {
    const container = document.getElementById('tbTypePills');
    if (!container || !window.PBData) return;
    const types = Object.keys(window.PBData.TC || {});
    const TCOL = window.PBData.TCOL || {};
    types.forEach(t => {
      const pill = document.createElement('button');
      pill.className = 'tb-pill pb-type-' + t;
      pill.textContent = t;
      pill.style.color = '#fff';
      pill.onclick = () => {
        this._tbActiveType = this._tbActiveType === t ? null : t;
        document.querySelectorAll('.tb-pill').forEach(p => p.classList.remove('active'));
        if (this._tbActiveType) pill.classList.add('active');
        this._renderPolGrid();
      };
      container.appendChild(pill);
    });
  },

  _onTBSearch(val) {
    clearTimeout(this._tbSearchDebounce);
    this._tbSearchDebounce = setTimeout(() => this._renderPolGrid(), 200);
  },

  _renderPolGrid() {
    const grid = document.getElementById('tbGrid');
    if (!grid || !window.PBData) return;
    const POLS = window.PBData.POLS || [];
    const AVTS = window.PBData.AVATARS || {};
    const query = (document.getElementById('tbSearch')?.value || '').toLowerCase();
    const sortVal = document.getElementById('tbSort')?.value || 'name';
    let filtered = POLS.filter(p => {
      if (query && !p.n.toLowerCase().includes(query)) return false;
      if (this._tbActiveType && !(p.tps||[]).includes(this._tbActiveType)) return false;
      return true;
    });
    const bst = p => Object.values(p.bs).reduce((a, b) => a + b, 0);
    filtered.sort((a, b) => {
      if (sortVal === 'name') return a.n.localeCompare(b.n);
      if (sortVal === 'bst') return bst(b) - bst(a);
      return (b.bs[sortVal]||0) - (a.bs[sortVal]||0);
    });
    grid.innerHTML = '';
    filtered.forEach(pol => {
      const types = (pol.tps||[]).map(t => `<span class="pb-type pb-type-${t}">${t}</span>`).join('');
      const total = bst(pol);
      const card = document.createElement('div');
      card.className = 'tb-pol-card' + (this._tbSelectedIds.has(pol.id) ? ' selected' : '');
      card.innerHTML = `
        <div>${AVTS[pol.svgId]||`<div style="font-size:2rem;height:93px;display:flex;align-items:center;justify-content:center">${pol.e||'❓'}</div>`}</div>
        <div class="tb-pol-name">${pol.n}</div>
        <div class="tb-pol-types">${types}</div>
        <div class="tb-pol-bst">BST ${total}</div>`;
      card.onclick = () => this._tbTogglePol(pol.id, card);
      card.ondblclick = () => this._openDexDetail(pol);
      grid.appendChild(card);
    });
    this._updateTBSlots();
    this._updateTBAnalysis();
  },

  _tbTogglePol(polId, card) {
    if (this._tbSelectedIds.has(polId)) {
      this._tbSelectedIds.delete(polId);
      card.classList.remove('selected');
    } else {
      if (this._tbSelectedIds.size >= 6) return;
      this._tbSelectedIds.add(polId);
      card.classList.add('selected');
    }
    this._updateTBSlots();
    this._updateTBAnalysis();
    const confirm = document.getElementById('tbConfirm');
    if (confirm) confirm.classList.toggle('enabled', this._tbSelectedIds.size > 0);
  },

  _updateTBSlots() {
    const POLS = window.PBData.POLS || [];
    const AVTS = window.PBData.AVATARS || {};
    const slotsEl = document.getElementById('tbSlots');
    if (!slotsEl) return;
    slotsEl.innerHTML = '';
    const selectedPols = POLS.filter(p => this._tbSelectedIds.has(p.id));
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      const pol = selectedPols[i];
      slot.className = 'tb-slot' + (pol ? ' filled' : '');
      if (pol) {
        slot.innerHTML = AVTS[pol.svgId] || `<div style="font-size:1.5rem">${pol.e||'❓'}</div>`;
        slot.title = pol.n;
        slot.onclick = () => { this._tbSelectedIds.delete(pol.id); this._renderPolGrid(); };
      }
      slotsEl.appendChild(slot);
    }
  },

  _updateTBAnalysis() {
    const POLS = window.PBData.POLS || [];
    const selected = POLS.filter(p => this._tbSelectedIds.has(p.id));
    const bst = selected.reduce((s, p) => s + Object.values(p.bs).reduce((a,b)=>a+b,0), 0);
    document.getElementById('tbBST').textContent = bst || '0';
    // Weaknesses: types where 2+ fighters are weak
    const TC = window.PBData.TC || {};
    const allTypes = Object.keys(TC);
    const weakMap = {};
    selected.forEach(p => {
      allTypes.forEach(atkType => {
        const multi = (p.tps||[]).reduce((acc, defType) => acc * (TC[atkType]?.[defType]||1), 1);
        if (multi >= 2) weakMap[atkType] = (weakMap[atkType]||0) + 1;
      });
    });
    const weaknesses = Object.entries(weakMap).filter(([,c])=>c>=2).map(([t])=>t);
    document.getElementById('tbWeaknesses').textContent = weaknesses.length ? weaknesses.join(', ') : 'None';
    // Coverage: types your team has no super-effective move against
    const coveredTypes = new Set();
    selected.forEach(p => {
      (p.mvs||[]).forEach(mvId => {
        const mv = window.PBData.MOVES?.[mvId];
        if (!mv) return;
        allTypes.forEach(defType => {
          if ((TC[mv.tp]?.[defType]||1) >= 2) coveredTypes.add(defType);
        });
      });
    });
    const uncovered = allTypes.filter(t => !coveredTypes.has(t));
    document.getElementById('tbCoverage').textContent = uncovered.length ? uncovered.join(', ') : 'All covered!';
  },

  _randomizeTeam() {
    const POLS = window.PBData.POLS || [];
    const shuffled = [...POLS].sort(() => Math.random() - .5).slice(0, 6);
    this._tbSelectedIds = new Set(shuffled.map(p => p.id));
    this._renderPolGrid();
    const confirm = document.getElementById('tbConfirm');
    if (confirm) confirm.classList.add('enabled');
  },

  _confirmTeam() {
    if (this._tbSelectedIds.size === 0) return;
    const POLS = window.PBData.POLS || [];
    const rawTeam = POLS.filter(p => this._tbSelectedIds.has(p.id));
    const E = window.PBEngine;
    this._playerTeam = rawTeam.map(p => E.buildFighter(p, true));
    this._playerTeamData = rawTeam;
    try { sessionStorage.setItem('pb_playerTeam', JSON.stringify(rawTeam.map(p=>p.id))); } catch(e){}
    // Generate AI team
    const rawAiTeam = window.PBAI.generateAITeam('normal');
    this._aiTeam = rawAiTeam.map(p => E.buildFighter(p, false));
    this._aiTeamData = rawAiTeam;
    this.showPreview(rawTeam, rawAiTeam);
  },

}; // end window.PolitiBattle

document.addEventListener('DOMContentLoaded', () => PolitiBattle.init());
