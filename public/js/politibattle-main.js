// PolitiBattle Module — politibattle-main — shared across all PB pages
// Loaded by: politibattle.html, pb-team.html, pb-preview.html,
//            pb-battle.html, pb-victory.html, pb-dex.html
'use strict';

window.PolitiBattle = {

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION-STORAGE KEY CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════
  _SS_TEAMS:   'pb_currentTeams',
  _SS_CONFIG:  'pb_battleConfig',
  _SS_VICTORY: 'pb_victoryData',
  _SS_TBSTATE: 'pb_teamBuilderState',
  _SS_STATS:   'politibattle_stats',

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTLE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  _battle:     null,
  _battleBusy: false,

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS CACHE (loaded from localStorage once)
  // ═══════════════════════════════════════════════════════════════════════════
  _settings: null,

  _loadSettingsCache() {
    try {
      this._settings = JSON.parse(localStorage.getItem('pb_settings')) || {};
    } catch (e) {
      this._settings = {};
    }
    return this._settings;
  },

  getSetting(key, fallback) {
    if (!this._settings) this._loadSettingsCache();
    return this._settings[key] != null ? this._settings[key] : fallback;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTER INIT — page detector + router
  // ═══════════════════════════════════════════════════════════════════════════
  init() {
    this._loadSettingsCache();

    var page = window.location.pathname.replace(/\/+$/, '') || '/';

    if (page === '/politibattle')          this._initHomePage();
    else if (page === '/politibattle/team')    this._initTeamPage();
    else if (page === '/politibattle/preview') this._initPreviewPage();
    else if (page === '/politibattle/battle')  this._initBattlePage();
    else if (page === '/politibattle/victory') this._initVictoryPage();
    else if (page === '/politibattle/dex')     this._initDexPage();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME PAGE  —  /politibattle  →  politibattle.html
  // ═══════════════════════════════════════════════════════════════════════════
  _initHomePage() {
    var self = this;

    // Sound init on first interaction
    var soundInited = false;
    document.addEventListener('click', function _initSnd() {
      if (soundInited) return;
      soundInited = true;
      try { if (window.PBSound && PBSound.init) PBSound.init(); } catch (_) {}
    }, { once: false });

    // Update home stats card
    this._updateHomeStats();

    // Modal helpers — open type chart, how to play, settings
    // (The HTML inline script already wires the buttons; these methods
    //  provide a programmatic fallback so other pages can call them.)
  },

  // ── Update the stats card on the home page ──
  _updateHomeStats() {
    var card  = document.getElementById('homeStatsCard');
    if (!card) return;

    var raw;
    try { raw = JSON.parse(localStorage.getItem(this._SS_STATS)); } catch (e) { raw = null; }

    var empty = document.getElementById('pb-stats-empty');
    var reset = document.getElementById('pbStatsReset');

    // Clear old stat items
    card.querySelectorAll('.pb-stat-item').forEach(function (el) { el.remove(); });

    if (!raw || (!raw.wins && !raw.losses)) {
      if (empty) empty.style.display = '';
      if (reset) reset.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (reset) reset.style.display = '';

    var stats = [
      { lbl: 'WINS',   val: raw.wins   || 0 },
      { lbl: 'LOSSES', val: raw.losses || 0 },
      { lbl: 'STREAK', val: raw.streak || 0 },
      { lbl: 'ELO',    val: raw.elo    || 1000 }
    ];
    stats.forEach(function (s) {
      var item = document.createElement('div');
      item.className = 'pb-stat-item';
      item.innerHTML =
        '<span class="pb-stat-val">' + s.val + '</span>' +
        '<span class="pb-stat-lbl">' + s.lbl + '</span>';
      card.insertBefore(item, reset);
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK BATTLE — generate two random teams → navigate to team or preview
  // ═══════════════════════════════════════════════════════════════════════════
  startQuickBattle() {
    window.location.href = '/politibattle/team';
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RANDOMIZE TEAM — build two AI teams, save, go to preview
  // ═══════════════════════════════════════════════════════════════════════════
  _randomizeTeam() {
    var AI = window.PBAI;
    if (!AI) { window.location.href = '/politibattle/team'; return; }

    var playerTeam = AI.generateAITeam('normal').map(function (p) { return p.id; });
    var aiTeam     = AI.generateAITeam('normal').map(function (p) { return p.id; });

    try {
      sessionStorage.setItem(this._SS_TEAMS || 'pb_currentTeams', JSON.stringify({
        playerTeam: playerTeam,
        aiTeam:     aiTeam,
        mode:       'random',
        timestamp:  Date.now()
      }));
    } catch (e) {}

    window.location.href = '/politibattle/preview';
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIRM TEAM — write sessionStorage + navigate to preview
  // Default stub; pb-team.html overrides with its own version that reads
  // from the local `selected` array.
  // ═══════════════════════════════════════════════════════════════════════════
  _confirmTeam() {
    try {
      var data = sessionStorage.getItem(this._SS_TEAMS || 'pb_currentTeams');
      if (data) {
        window.location.href = '/politibattle/preview';
        return;
      }
    } catch (e) {}
    window.location.href = '/politibattle/team';
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM PAGE  —  /politibattle/team  →  pb-team.html
  // The real implementation is overridden by pb-team.html's inline <script>.
  // This stub restores any saved builder state if the override hasn't loaded.
  // ═══════════════════════════════════════════════════════════════════════════
  _initTeamPage() {
    // Restore saved builder state from sessionStorage if available
    var saved;
    try { saved = JSON.parse(sessionStorage.getItem(this._SS_TBSTATE)); } catch (e) {}

    if (saved && saved.selected && Array.isArray(saved.selected)) {
      // Re-select previously chosen fighters in the grid
      // (Only meaningful if the inline script hasn't already overridden this.)
      this._tbRestoredState = saved;
    }

    // Render grid — calls _renderPolGrid if it exists on this object
    if (typeof this._renderPolGrid === 'function') {
      this._renderPolGrid();
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIEW PAGE  —  /politibattle/preview  →  pb-preview.html
  // ═══════════════════════════════════════════════════════════════════════════
  _initPreviewPage() {
    var self = this;
    var D  = window.PBData;
    var E  = window.PBEngine;
    var AI = window.PBAI;
    var UI = window.PBUI;

    // 1. Read teams from sessionStorage
    var raw;
    try { raw = JSON.parse(sessionStorage.getItem(this._SS_TEAMS)); } catch (e) {}
    if (!raw || !raw.playerTeam || !raw.aiTeam) {
      window.location.href = '/politibattle';
      return;
    }

    // 2. Rebuild fighter objects from pol IDs
    var playerTeam = raw.playerTeam.map(function (entry) {
      var id = (typeof entry === 'string') ? entry : (entry.id || entry);
      var pol = D.POLS.find(function (p) { return p.id === id; });
      return pol ? E.buildFighter(pol, true) : null;
    }).filter(Boolean);

    var aiTeam = raw.aiTeam.map(function (entry) {
      var id = (typeof entry === 'string') ? entry : (entry.id || entry);
      var pol = D.POLS.find(function (p) { return p.id === id; });
      return pol ? E.buildFighter(pol, false) : null;
    }).filter(Boolean);

    if (playerTeam.length === 0 || aiTeam.length === 0) {
      window.location.href = '/politibattle';
      return;
    }

    this._playerTeam = playerTeam;
    this._aiTeam     = aiTeam;

    // 3. Render preview grids (delegate to PBUI or page-local renderer)
    if (UI && typeof UI.renderPreview === 'function') {
      UI.renderPreview(playerTeam, aiTeam);
    }

    // 4. AI picks lead after a short delay
    if (AI && typeof AI.pickLead === 'function') {
      setTimeout(function () {
        var polData = aiTeam.map(function (f) {
          return D.POLS.find(function (p) { return p.id === f.id; }) || f;
        });
        var pPolData = playerTeam.map(function (f) {
          return D.POLS.find(function (p) { return p.id === f.id; }) || f;
        });
        self._aiLeadIdx = AI.pickLead(polData, pPolData);
        if (self._aiLeadIdx == null || self._aiLeadIdx < 0) self._aiLeadIdx = 0;
      }, 1500);
    } else {
      this._aiLeadIdx = 0;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAUNCH BATTLE FROM PREVIEW
  // Called by pb-preview.html after player selects their lead fighter.
  // Saves the full battle config to sessionStorage and navigates.
  // ═══════════════════════════════════════════════════════════════════════════
  _launchBattleFromPreview(playerTeam, aiTeam, playerLeadIdx, aiLeadIdx) {
    if (playerLeadIdx == null || !playerTeam || !aiTeam) return;

    // Default AI lead to 0 if unset
    if (aiLeadIdx == null) aiLeadIdx = 0;

    // Serialize fighters as ID strings for safe sessionStorage transfer
    var serializeTeam = function (team) {
      return team.map(function (f) {
        if (typeof f === 'string') return f;
        var id = f.id || f.polId || (f.pol && f.pol.id);
        if (!id) {
          console.error('[PolitiBattle] serializeTeam: fighter missing .id', f);
          return null;
        }
        return id;
      }).filter(Boolean);
    };

    var pSerialized = serializeTeam(playerTeam);
    var aSerialized = serializeTeam(aiTeam);

    if (pSerialized.length === 0 || aSerialized.length === 0) {
      console.error('[PolitiBattle] _launchBattleFromPreview: serialization produced empty team', {pSerialized, aSerialized, playerTeam, aiTeam});
      return;
    }

    var config = {
      playerTeam:    pSerialized,
      aiTeam:        aSerialized,
      playerLeadIdx: playerLeadIdx,
      aiLeadIdx:     aiLeadIdx,
      mode:          'vsAI',
      timestamp:     Date.now()
    };

    try {
      sessionStorage.setItem(this._SS_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('[PolitiBattle] Failed to save battle config:', e);
    }

    window.location.href = '/politibattle/battle';
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTLE PAGE  —  /politibattle/battle  →  pb-battle.html
  // ═══════════════════════════════════════════════════════════════════════════
  _initBattlePage() {
    // 1. Read session config
    var raw;
    try { raw = JSON.parse(sessionStorage.getItem(this._SS_CONFIG)); } catch (e) {}
    if (!raw || !raw.playerTeam || !raw.aiTeam) {
      window.location.href = '/politibattle';
      return;
    }

    var E  = window.PBEngine;
    var D  = window.PBData;
    var UI = window.PBUI;
    if (!E || !D || !UI) {
      console.error('[PolitiBattle] Missing engine / data / ui modules');
      return;
    }

    // 2. Build fighter objects from pol data
    // raw teams are arrays of ID strings or fighter objects — handle both
    var pTeam = raw.playerTeam.map(function (f) {
      if (typeof f === 'string') {
        var pol = D.POLS.find(function (p) { return p.id === f; });
        return pol ? E.buildFighter(pol, true) : null;
      }
      // Already a fighter object from preview — rebuild to be safe
      var pol2 = D.POLS.find(function (p) { return p.id === (f.id || f); });
      return pol2 ? E.buildFighter(pol2, true) : null;
    }).filter(Boolean);

    var aTeam = raw.aiTeam.map(function (f) {
      if (typeof f === 'string') {
        var pol = D.POLS.find(function (p) { return p.id === f; });
        return pol ? E.buildFighter(pol, false) : null;
      }
      var pol2 = D.POLS.find(function (p) { return p.id === (f.id || f); });
      return pol2 ? E.buildFighter(pol2, false) : null;
    }).filter(Boolean);

    if (pTeam.length === 0 || aTeam.length === 0) {
      window.location.href = '/politibattle';
      return;
    }

    // 3. Create battle state
    var battle = E.createBattle(pTeam, aTeam);
    var pLeadIdx = (raw.playerLeadIdx != null) ? raw.playerLeadIdx : 0;
    var aLeadIdx = (raw.aiLeadIdx != null) ? raw.aiLeadIdx : 0;
    if (pLeadIdx >= pTeam.length) pLeadIdx = 0;
    if (aLeadIdx >= aTeam.length) aLeadIdx = 0;
    battle.pIdx = pLeadIdx;
    battle.aIdx = aLeadIdx;

    // 4. Switch in leads
    E.switchIn(pTeam[pLeadIdx], aTeam[aLeadIdx], battle.pHz, battle);
    E.switchIn(aTeam[aLeadIdx], pTeam[pLeadIdx], battle.aHz, battle);

    this._battle = battle;

    // 5. Init sound
    try { if (window.PBSound && PBSound.init) PBSound.init(); } catch (_) {}

    // 6. Init UI
    UI.init(battle);

    // 7. VS splash then full refresh
    var self = this;
    UI.showVSSplash(pTeam[pLeadIdx], aTeam[aLeadIdx]).then(function () {
      UI.fullRefresh(battle);
      UI.startTimer(60);
      UI.enableInput();
      UI.log('Battle start! ' + pTeam[pLeadIdx].n + ' vs ' + aTeam[aLeadIdx].n + '!', 'info');
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE PLAYER ACTION — called by UI move/switch clicks
  // ═══════════════════════════════════════════════════════════════════════════
  async handlePlayerAction(action) {
    var UI = window.PBUI;
    var M  = window.PBMechanics;
    var b  = this._battle;
    if (!b || !UI || !M) return;
    if (this._battleBusy || b.over) return;

    this._battleBusy = true;
    UI.disableInput();
    UI.stopTimer();

    // If we were in forced-switch mode, clear it
    if (UI._needSwitchMode) {
      UI._needSwitchMode = false;
      var ms = document.getElementById('pb-move-section');
      if (ms) ms.style.display = '';
      UI.hideSwitchPanel();
    }

    try {
      // Execute the turn
      var events = await M.executeTurn(b, action);

      // Animate all events
      await UI.animateEvents(events, b);

      // Check for battle end
      if (b.over) {
        this._endBattle(b);
        return;
      }

      // Check if we need a forced switch
      var needSwitch = events.some(function (e) { return e.type === 'need-switch'; });
      if (needSwitch) {
        // UI is waiting for switch — keep input enabled, don't start timer for moves
        this._battleBusy = false;
        return;
      }

      // Ready for next turn
      UI.fullRefresh(b);
      UI.resetTimer();
      UI.startTimer(60);
      UI.enableInput();
    } catch (err) {
      console.error('[PolitiBattle] Turn error:', err);
    }

    this._battleBusy = false;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FORFEIT
  // ═══════════════════════════════════════════════════════════════════════════
  _forfeitBattle() {
    if (!this._battle || this._battle.over) return;
    if (!confirm('Forfeit this battle?')) return;
    this._battle.over = true;
    this._battle.winner = 'ai';
    if (window.PBEngine) window.PBEngine._log(this._battle, 'You forfeited the battle!', 'ko');
    var UI = window.PBUI;
    if (UI) {
      UI.disableInput();
      UI.stopTimer();
      UI.log('You forfeited the battle!', 'ko');
    }
    this._endBattle(this._battle);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // END BATTLE — write results + navigate to victory screen
  // ═══════════════════════════════════════════════════════════════════════════
  _endBattle(battle) {
    var UI = window.PBUI;
    if (UI) { UI.disableInput(); UI.stopTimer(); }

    var won = battle.winner === 'player';

    // Compute ELO change (simple approximation)
    var eloChange = won
      ? Math.floor(20 + Math.random() * 15)
      : -Math.floor(12 + Math.random() * 10);

    var victoryData = {
      won:             won,
      winner:          battle.winner,
      turns:           battle.turn,
      pDmgDealt:       battle.stats.pDmgDealt,
      aDmgDealt:       battle.stats.aDmgDealt,
      pCrits:          battle.stats.pCrits,
      aCrits:          battle.stats.aCrits,
      pKOs:            battle.stats.pKOs,
      aKOs:            battle.stats.aKOs,
      playerTeam:      battle.pTeam.map(function (f) {
        return { id: f.id, n: f.n, hp: f.hp, mhp: f.mhp, fainted: f.fainted };
      }),
      aiTeam:          battle.aTeam.map(function (f) {
        return { id: f.id, n: f.n, hp: f.hp, mhp: f.mhp, fainted: f.fainted };
      }),
      // Battle log for replay modal on victory screen
      log:             (battle.log || []).map(function (entry) {
        if (typeof entry === 'string') return { msg: entry, type: 'info' };
        return {
          msg:  entry.msg || entry.text || String(entry),
          type: entry.type || 'info',
          turn: entry.turn || null
        };
      }),
      newAchievements: this._checkAchievements(battle, won),
      eloChange:       eloChange,
      timestamp:       Date.now()
    };

    try {
      sessionStorage.setItem(this._SS_VICTORY, JSON.stringify(victoryData));
    } catch (e) {
      console.error('[PolitiBattle] Failed to save victory data:', e);
    }

    // Navigate after brief delay so final KO animation can play
    setTimeout(function () {
      window.location.href = '/politibattle/victory';
    }, 1500);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT CHECKER (runs at end of battle)
  // ═══════════════════════════════════════════════════════════════════════════
  _checkAchievements(battle, won) {
    var achievements = [];
    var stats;
    try { stats = JSON.parse(localStorage.getItem(this._SS_STATS)) || {}; } catch (e) { stats = {}; }

    // First victory
    if (won && !stats.wins) {
      achievements.push({ icon: '🏆', name: 'First Victory', description: 'Win your first battle!' });
    }
    // Flawless — won without losing a single fighter
    if (won && battle.pTeam.every(function (f) { return !f.fainted; })) {
      achievements.push({ icon: '✨', name: 'Flawless', description: 'Win without any KOs on your team.' });
    }
    // Underdog — won when 4+ of your team fainted
    var pFainted = battle.pTeam.filter(function (f) { return f.fainted; }).length;
    if (won && pFainted >= 4) {
      achievements.push({ icon: '💪', name: 'Underdog', description: 'Win with 4+ fighters KO\'d.' });
    }
    // Crit Lord — 5+ crits in one battle
    if ((battle.stats.pCrits || 0) >= 5) {
      achievements.push({ icon: '🎯', name: 'Crit Lord', description: 'Land 5+ critical hits in one battle.' });
    }
    // Quick Draw — win in 10 turns or fewer
    if (won && battle.turn <= 10) {
      achievements.push({ icon: '⚡', name: 'Quick Draw', description: 'Win in 10 turns or fewer.' });
    }
    // Streak milestones
    var streak = (stats.streak || 0) + (won ? 1 : 0);
    if (won && streak === 5) {
      achievements.push({ icon: '🔥', name: 'On Fire', description: 'Reach a 5-win streak.' });
    }
    if (won && streak === 10) {
      achievements.push({ icon: '🌋', name: 'Unstoppable', description: 'Reach a 10-win streak.' });
    }

    return achievements;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VICTORY PAGE  —  /politibattle/victory  →  pb-victory.html
  // The actual rich rendering is done by the inline script in pb-victory.html.
  // This stub handles the minimal case and updates localStorage stats.
  // ═══════════════════════════════════════════════════════════════════════════
  _initVictoryPage() {
    var raw;
    try { raw = JSON.parse(sessionStorage.getItem(this._SS_VICTORY)); } catch (e) {}
    if (!raw) {
      window.location.href = '/politibattle';
      return;
    }

    var won = !!raw.won;

    // Init sound and play result fanfare
    var S = window.PBSound;
    if (S && S.init) {
      S.init();
      setTimeout(function () {
        try { won ? S.playVictory() : S.playDefeat(); } catch (e) {}
      }, 400);
    }

    // Update localStorage stats
    this._recordBattleStats(won, raw.eloChange || 0);

    console.log('[PolitiBattle] Victory page loaded. Won:', won);
  },

  // ── Persist win/loss/elo to localStorage ──
  _recordBattleStats(won, eloChange) {
    var key = this._SS_STATS;
    var stats;
    try { stats = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { stats = {}; }

    stats.wins   = (stats.wins   || 0) + (won ? 1 : 0);
    stats.losses = (stats.losses || 0) + (won ? 0 : 1);
    stats.games  = (stats.games  || 0) + 1;
    stats.elo    = (stats.elo    || 1000) + eloChange;
    if (stats.elo < 0) stats.elo = 0;

    // Streak tracking
    if (won) {
      stats.streak    = (stats.streak || 0) + 1;
      stats.maxStreak = Math.max(stats.maxStreak || 0, stats.streak);
    } else {
      stats.streak = 0;
    }

    try { localStorage.setItem(key, JSON.stringify(stats)); } catch (e) {}

    // Also use PBStats module if available
    if (window.PBStats && typeof PBStats.recordResult === 'function') {
      try { PBStats.recordResult(won, eloChange); } catch (e) {}
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEX PAGE  —  /politibattle/dex  →  pb-dex.html
  // The actual grid + modal rendering lives in pb-dex.html's inline script.
  // This stub initialises sound and calls PBUI.renderDex if available.
  // ═══════════════════════════════════════════════════════════════════════════
  _initDexPage() {
    try { if (window.PBSound && PBSound.init) PBSound.init(); } catch (_) {}

    var D  = window.PBData;
    var UI = window.PBUI;
    if (UI && typeof UI.renderDex === 'function' && D && D.POLS) {
      UI.renderDex(D.POLS);
    }

    console.log('[PolitiBattle] Dex page loaded.');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN / OVERLAY MANAGEMENT
  // showScreen() now only handles modals and overlays on the CURRENT page.
  // All cross-page navigation is done via window.location.href.
  // ═══════════════════════════════════════════════════════════════════════════
  showScreen(screenId) {
    // Legacy calls that map to page navigations
    var NAV_MAP = {
      'home':       '/politibattle',
      'teamSelect': '/politibattle/team',
      'preview':    '/politibattle/preview',
      'battle':     '/politibattle/battle',
      'victory':    '/politibattle/victory',
      'dex':        '/politibattle/dex'
    };
    if (NAV_MAP[screenId]) {
      window.location.href = NAV_MAP[screenId];
      return;
    }

    // Otherwise treat as a modal/overlay ID on the current page
    var el = document.getElementById(screenId);
    if (el) {
      // Close all other overlays first
      document.querySelectorAll('.pb-modal-overlay.open').forEach(function (m) {
        m.classList.remove('open');
      });
      el.classList.add('open');
    }
  },

  hideScreen(screenId) {
    var el = document.getElementById(screenId);
    if (el) el.classList.remove('open');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE CHART MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  _openTypeChart() {
    var modal = document.getElementById('typeChartModal');
    if (!modal) return;

    // Build chart HTML if the table is empty
    var body = document.getElementById('pbTypeChartBody');
    var head = document.getElementById('pbTypeChartHead');
    if (body && body.children.length === 0) {
      this._buildTypeChartHTML(head, body);
    }

    modal.classList.add('open');
  },

  _buildTypeChartHTML(thead, tbody) {
    var D = window.PBData;
    if (!D || !D.TC) return;

    var types = Object.keys(D.TC);
    var TCOL_CSS = {
      Republican:     '#ef4444', Democrat:     '#3b82f6', Libertarian:  '#eab308',
      Green:          '#22c55e', Socialist:    '#ec4899', Authoritarian:'#7c3aed',
      Centrist:       '#94a3b8', Populist:     '#f97316', Corporate:    '#475569',
      Revolutionary:  '#dc2626'
    };

    // Abbreviate type names for compact header
    var abbr = function (t) { return t.substring(0, 3).toUpperCase(); };

    // Header row
    if (thead) {
      var hr = '<tr><th class="tc-corner"></th>';
      types.forEach(function (t) {
        hr += '<th class="tc-colhead" title="' + t + '" style="color:' + (TCOL_CSS[t] || '#666') + '">' + abbr(t) + '</th>';
      });
      hr += '</tr>';
      thead.innerHTML = hr;
    }

    // Body rows
    if (tbody) {
      var html = '';
      types.forEach(function (atkType) {
        html += '<tr>';
        html += '<th class="tc-rowhead" title="' + atkType + '" style="color:' + (TCOL_CSS[atkType] || '#666') + '">' + abbr(atkType) + '</th>';
        types.forEach(function (defType) {
          var val = D.TC[atkType][defType];
          var cls = 'tc-norm';
          if (val >= 2)        cls = 'tc-2x';
          else if (val === 1.5) cls = 'tc-15x';
          else if (val === 0)  cls = 'tc-zero';
          else if (val < 1)    cls = 'tc-half';
          var label = val === 0 ? '0' : val === 1 ? '' : val + '×';
          html += '<td class="' + cls + '">' + label + '</td>';
        });
        html += '</tr>';
      });
      tbody.innerHTML = html;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOW TO PLAY MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  _openHowToPlay() {
    var modal = document.getElementById('howToPlayModal');
    if (modal) modal.classList.add('open');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  _openSettings() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('open');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM BUILDER HELPERS
  // These are default stubs. pb-team.html overrides most of them with its
  // own local implementations that have access to the grid state.
  // ═══════════════════════════════════════════════════════════════════════════

  // Render the full politician picker grid
  _renderPolGrid() {
    var D = window.PBData;
    var grid = document.getElementById('pol-grid') || document.getElementById('tb-grid');
    if (!D || !D.POLS || !grid) return;

    var TCOL_CSS = {
      Republican:'#ef4444', Democrat:'#3b82f6', Libertarian:'#eab308',
      Green:'#22c55e', Socialist:'#ec4899', Authoritarian:'#7c3aed',
      Centrist:'#94a3b8', Populist:'#f97316', Corporate:'#475569',
      Revolutionary:'#dc2626'
    };

    grid.innerHTML = '';
    D.POLS.forEach(function (pol) {
      var card = document.createElement('div');
      card.className = 'tb-pol-card';
      card.dataset.id = pol.id;

      var typeColor = TCOL_CSS[pol.tps[0]] || '#666';
      var typePills = (pol.tps || []).map(function (t) {
        return '<span class="tb-type-pill" style="background:' + (TCOL_CSS[t] || '#666') + '">' + t + '</span>';
      }).join('');

      // Build BST total for quick reference
      var bst = pol.bs ? (pol.bs.hp + pol.bs.atk + pol.bs.def + pol.bs.spa + pol.bs.spd + pol.bs.spe) : 0;

      card.innerHTML =
        '<div class="tb-pol-avatar" style="border-color:' + typeColor + '">' +
          (pol.e || pol.id.charAt(0).toUpperCase()) +
        '</div>' +
        '<div class="tb-pol-name">' + pol.n + '</div>' +
        '<div class="tb-pol-types">' + typePills + '</div>' +
        '<div class="tb-pol-bst">BST ' + bst + '</div>';

      card.addEventListener('click', function () {
        if (typeof PolitiBattle._tbTogglePol === 'function') {
          PolitiBattle._tbTogglePol(pol.id);
        }
      });

      grid.appendChild(card);
    });
  },

  // Toggle selection of a politician in the team builder
  _tbTogglePol(polId) {
    // Default stub — pb-team.html overrides this with its own selection logic
    console.log('[PolitiBattle] _tbTogglePol stub called for:', polId);
  },

  // Update the team slot indicators in the builder
  _updateTBSlots() {
    // Default stub — pb-team.html overrides
    console.log('[PolitiBattle] _updateTBSlots stub');
  },

  // Update the team analysis panel (type coverage, weaknesses, etc.)
  _updateTBAnalysis() {
    // Default stub — pb-team.html overrides
    console.log('[PolitiBattle] _updateTBAnalysis stub');
  },

  // Build type pill HTML elements
  _buildTypePills(types) {
    var TCOL_CSS = {
      Republican:'#ef4444', Democrat:'#3b82f6', Libertarian:'#eab308',
      Green:'#22c55e', Socialist:'#ec4899', Authoritarian:'#7c3aed',
      Centrist:'#94a3b8', Populist:'#f97316', Corporate:'#475569',
      Revolutionary:'#dc2626'
    };
    return (types || []).map(function (t) {
      return '<span class="tb-type-pill" style="background:' + (TCOL_CSS[t] || '#666') + '">' + t + '</span>';
    }).join('');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTLE UI HELPERS — delegates to PBUI but callable from main
  // ═══════════════════════════════════════════════════════════════════════════

  // Process a single battle event (for manual event replay)
  _processEvent(ev, battle) {
    var UI = window.PBUI;
    if (UI && typeof UI.animateEvents === 'function') {
      return UI.animateEvents([ev], battle);
    }
  },

  // Render the full battle UI (HP, moves, sprites, etc.)
  _renderBattleUI(battle) {
    var UI = window.PBUI;
    if (UI && typeof UI.fullRefresh === 'function') {
      UI.fullRefresh(battle || this._battle);
    }
  },

  // Render move buttons for the active fighter
  _renderMoves(battle) {
    var UI = window.PBUI;
    var b  = battle || this._battle;
    if (!UI || !b) return;
    if (typeof UI._renderMoves === 'function') {
      UI._renderMoves(b);
    } else if (typeof UI.fullRefresh === 'function') {
      UI.fullRefresh(b);
    }
  },

  // Render the switch list (bench fighters)
  _renderSwitchList(battle) {
    var UI = window.PBUI;
    var b  = battle || this._battle;
    if (!UI || !b) return;
    if (typeof UI._renderSwitchList === 'function') {
      UI._renderSwitchList(b);
    }
  },

  // Update HP box displays
  _updateHPBoxes(battle) {
    var UI = window.PBUI;
    var b  = battle || this._battle;
    if (!UI || !b) return;
    if (typeof UI._updateHP === 'function') {
      UI._updateHP(b);
    } else if (typeof UI.fullRefresh === 'function') {
      UI.fullRefresh(b);
    }
  },

  // Append a message to the battle log
  _appendLog(msg, type) {
    var UI = window.PBUI;
    if (UI && typeof UI.log === 'function') {
      UI.log(msg, type || 'info');
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TURN TIMER — delegates to PBUI
  // ═══════════════════════════════════════════════════════════════════════════
  startTurnTimer(seconds) {
    var UI = window.PBUI;
    if (UI && typeof UI.startTimer === 'function') {
      UI.startTimer(seconds || 60);
    }
  },

  stopTurnTimer() {
    var UI = window.PBUI;
    if (UI && typeof UI.stopTimer === 'function') {
      UI.stopTimer();
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT LOCK — delegates to PBUI
  // ═══════════════════════════════════════════════════════════════════════════
  lockInput() {
    var UI = window.PBUI;
    if (UI && typeof UI.disableInput === 'function') {
      UI.disableInput();
    }
  },

  unlockInput() {
    var UI = window.PBUI;
    if (UI && typeof UI.enableInput === 'function') {
      UI.enableInput();
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════
  initKeyboard() {
    var self = this;
    document.addEventListener('keydown', function (e) {
      // Only handle keys during a battle
      if (!self._battle || self._battle.over || self._battleBusy) return;
      var UI = window.PBUI;
      if (!UI) return;

      var key = e.key;

      // 1-4 = moves
      if (key >= '1' && key <= '4') {
        var moveIdx = parseInt(key, 10) - 1;
        var active  = self._battle.pTeam[self._battle.pIdx];
        if (active && active.mvs[moveIdx] && active.mvs[moveIdx].cpp > 0) {
          e.preventDefault();
          self.handlePlayerAction({ type: 'move', idx: moveIdx });
        }
        return;
      }

      // S = open/close switch panel
      if (key === 's' || key === 'S') {
        e.preventDefault();
        if (UI._switchOpen) UI.hideSwitchPanel();
        else UI.showSwitchPanel();
        return;
      }

      // 5-9 or Q-T = switch to bench slot
      if (key >= '5' && key <= '9') {
        var sIdx = parseInt(key, 10) - 5;
        e.preventDefault();
        self.handlePlayerAction({ type: 'switch', idx: sIdx });
        return;
      }

      // F = forfeit
      if (key === 'f' || key === 'F') {
        e.preventDefault();
        self._forfeitBattle();
        return;
      }

      // Escape = close modals/switch panel
      if (key === 'Escape') {
        if (UI._switchOpen) UI.hideSwitchPanel();
        document.querySelectorAll('.pb-modal-overlay.open').forEach(function (m) {
          m.classList.remove('open');
        });
        return;
      }
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEX HELPERS — stubs callable from main, actual rendering in pb-dex.html
  // ═══════════════════════════════════════════════════════════════════════════

  // Render the dex grid (all politicians)
  _renderDexGrid(pols) {
    var UI = window.PBUI;
    if (UI && typeof UI.renderDex === 'function') {
      UI.renderDex(pols || (window.PBData && window.PBData.POLS) || []);
      return;
    }

    // Fallback: minimal grid renderer
    var grid = document.getElementById('dex-grid');
    if (!grid) return;
    var D = window.PBData;
    if (!D) return;

    var list = pols || D.POLS || [];
    grid.innerHTML = '';
    var TCOL_CSS = {
      Republican:'#ef4444', Democrat:'#3b82f6', Libertarian:'#eab308',
      Green:'#22c55e', Socialist:'#ec4899', Authoritarian:'#7c3aed',
      Centrist:'#94a3b8', Populist:'#f97316', Corporate:'#475569',
      Revolutionary:'#dc2626'
    };

    list.forEach(function (pol, idx) {
      var card = document.createElement('div');
      card.className = 'dex-card';
      card.dataset.id = pol.id;
      var tc = TCOL_CSS[pol.tps[0]] || '#666';
      card.innerHTML =
        '<div class="dex-card-num">#' + String(idx + 1).padStart(3, '0') + '</div>' +
        '<div class="dex-card-emoji">' + (pol.e || '🏛️') + '</div>' +
        '<div class="dex-card-name">' + pol.n + '</div>' +
        '<div class="dex-card-types">' + (pol.tps || []).map(function (t) {
          return '<span style="background:' + (TCOL_CSS[t] || '#666') + ';color:#fff;padding:1px 6px;border-radius:6px;font-size:0.65rem">' + t + '</span>';
        }).join(' ') + '</div>';

      card.addEventListener('click', function () {
        if (typeof PolitiBattle._openDexDetail === 'function') {
          PolitiBattle._openDexDetail(pol);
        }
      });

      grid.appendChild(card);
    });
  },

  // Open the detail modal for a single politician
  _openDexDetail(pol) {
    // Default stub — pb-dex.html overrides with its rich modal
    var modal = document.getElementById('dex-modal');
    if (!modal) return;

    var content = document.getElementById('modal-content');
    if (content) {
      content.innerHTML =
        '<h2>' + (pol.e || '') + ' ' + pol.n + '</h2>' +
        '<p>Types: ' + (pol.tps || []).join(', ') + '</p>' +
        '<p>Ability: ' + (pol.abl || 'None') + '</p>';
    }
    modal.classList.add('open');
  },

  // Draw a radar chart for base stats (canvas-based)
  _drawRadar(canvasId, baseStats, nature) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var R  = Math.min(cx, cy) * 0.78;

    var labels = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
    var keys   = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    var MAX    = 150;
    var n      = labels.length;
    var step   = (Math.PI * 2) / n;
    var offset = -Math.PI / 2; // start from top

    ctx.clearRect(0, 0, W, H);

    // Background rings
    ctx.strokeStyle = 'rgba(100,116,139,0.15)';
    ctx.lineWidth   = 1;
    for (var ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      var rr = R * (ring / 3);
      for (var i = 0; i <= n; i++) {
        var a = offset + step * (i % n);
        var px = cx + Math.cos(a) * rr;
        var py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Axis lines + labels
    ctx.fillStyle = 'rgba(100,116,139,0.7)';
    ctx.font      = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < n; i++) {
      var a = offset + step * i;
      var ex = cx + Math.cos(a) * R;
      var ey = cy + Math.sin(a) * R;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // Label
      var lx = cx + Math.cos(a) * (R + 14);
      var ly = cy + Math.sin(a) * (R + 14);
      ctx.fillText(labels[i], lx, ly + 3);
    }

    // Data polygon
    var STAT_COLORS = {
      hp: '#22c55e', atk: '#ef4444', def: '#f59e0b',
      spa: '#818cf8', spd: '#06b6d4', spe: '#ec4899'
    };
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var val = baseStats[keys[i]] || 0;
      var frac = Math.min(val / MAX, 1);
      var a = offset + step * i;
      var px = cx + Math.cos(a) * R * frac;
      var py = cy + Math.sin(a) * R * frac;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle   = 'rgba(99,102,241,0.25)';
    ctx.strokeStyle = 'rgba(99,102,241,0.8)';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();

    // Stat value dots
    for (var i = 0; i < n; i++) {
      var val = baseStats[keys[i]] || 0;
      var frac = Math.min(val / MAX, 1);
      var a = offset + step * i;
      var px = cx + Math.cos(a) * R * frac;
      var py = cy + Math.sin(a) * R * frac;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = STAT_COLORS[keys[i]] || '#6366f1';
      ctx.fill();
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  goHome() {
    window.location.href = '/politibattle';
  },

  goTeam() {
    window.location.href = '/politibattle/team';
  },

  goPreview() {
    window.location.href = '/politibattle/preview';
  },

  goBattle() {
    window.location.href = '/politibattle/battle';
  },

  goVictory() {
    window.location.href = '/politibattle/victory';
  },

  goDex() {
    window.location.href = '/politibattle/dex';
  },

  goArena() {
    window.location.href = '/arena';
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  _ssGet(key) {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch (e) { return null; }
  },

  _ssSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {
      console.error('[PolitiBattle] sessionStorage write failed:', key, e);
    }
  },

  _ssRemove(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  },

  _lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  },

  _lsSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP — call when leaving a battle page to free memory
  // ═══════════════════════════════════════════════════════════════════════════
  _cleanup() {
    this._battle     = null;
    this._battleBusy = false;
    this._playerTeam = null;
    this._aiTeam     = null;
    this._aiLeadIdx  = null;
    var UI = window.PBUI;
    if (UI && typeof UI.stopTimer === 'function') UI.stopTimer();
  },

}; // end window.PolitiBattle
