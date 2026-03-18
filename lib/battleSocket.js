'use strict';
/**
 * PolitiBattle — Full Battle Engine v2
 * NEW: PP, Critical Hits, Abilities, Held Items, Weather, Pokemon GO features
 */
const rooms = require('./battleRooms');

// ── TYPE CHART ────────────────────────────────────────────────────────────────
const TYPES = ['Republican','Democrat','Libertarian','Green','Socialist','Authoritarian','Centrist','Populist','Corporate','Revolutionary'];
const TYPE_CHART = {
  Republican:    {Democrat:2,Green:2,Socialist:2,Libertarian:0.5,Authoritarian:0.5,Corporate:0.5},
  Democrat:      {Republican:0.5,Libertarian:2,Corporate:2,Populist:2,Green:0.5,Socialist:0.5},
  Libertarian:   {Authoritarian:2,Socialist:2,Centrist:2,Corporate:0.5,Republican:0.5},
  Green:         {Corporate:2,Populist:2,Republican:0.5,Democrat:0.5},
  Socialist:     {Corporate:2,Populist:2,Libertarian:0.5,Republican:0.5,Revolutionary:0.5},
  Authoritarian: {Revolutionary:2,Democrat:2,Green:2,Libertarian:0,Populist:0.5},
  Centrist:      {Authoritarian:2,Populist:0.5,Revolutionary:0.5,Libertarian:0.5},
  Populist:      {Corporate:2,Centrist:2,Authoritarian:0.5,Democrat:0.5},
  Corporate:     {Socialist:2,Libertarian:2,Green:0.5,Populist:0.5,Revolutionary:0.5},
  Revolutionary: {Corporate:2,Centrist:2,Republican:2,Authoritarian:0,Socialist:0.5},
};
for(const atk of TYPES){if(!TYPE_CHART[atk])TYPE_CHART[atk]={};for(const def of TYPES)if(TYPE_CHART[atk][def]===undefined)TYPE_CHART[atk][def]=1;}
function getEff(mt,dt){let m=1;for(const d of dt)m*=TYPE_CHART[mt]?.[d]??1;return m;}

// ── WEATHER ───────────────────────────────────────────────────────────────────
const WEATHER = {
  none:        {name:'Clear Skies',       icon:'☀️', boostType:null,          penaltyType:null,        dmgMult:1,   special:null},
  mediablitz:  {name:'Media Blitz',       icon:'📺', boostType:'Populist',    penaltyType:'Centrist',  dmgMult:1.3, special:'spa_all'},
  marketcrash: {name:'Market Crash',      icon:'📉', boostType:'Socialist',   penaltyType:'Corporate', dmgMult:1.3, special:'chip_corporate'},
  revolution:  {name:'Revolution Rising', icon:'🔥', boostType:'Revolutionary',penaltyType:'Authoritarian',dmgMult:1.3,special:null},
  coldwar:     {name:'Cold War',          icon:'🧊', boostType:'Republican',  penaltyType:'Democrat',  dmgMult:1.3, special:'halve_speed'},
  scandal:     {name:'Scandal Storm',     icon:'📰', boostType:null,          penaltyType:null,        dmgMult:1,   special:'random_stat_drop'},
};
const WEATHER_TURNS=5;

// ── ABILITIES ─────────────────────────────────────────────────────────────────
const ABILITIES = {
  propaganda_master:{name:'Propaganda Master',desc:'Status moves have +20% infliction chance.',statusChanceBoost:20},
  dealmaker:        {name:'Art of the Deal',desc:'Physical moves deal 1.2× damage.',physMult:1.2},
  thick_skin:       {name:'Thick Skin',desc:'Incoming critical hits deal normal damage.',blockCrits:true},
  populist_surge:   {name:'Populist Surge',desc:'Enters in Revolution/MediaBlitz with +1 Atk.',switchBoost:{weathers:['revolution','mediablitz'],stat:'atk',stages:1}},
  iron_will:        {name:'Iron Will',desc:'Cannot be put to sleep.',immuneStatus:['sleep']},
  free_market:      {name:'Free Market',desc:'Held item effects trigger twice.',doubleItem:true},
  rev_spirit:       {name:'Revolutionary Spirit',desc:'Below 33% HP: Atk sharply rises once.',lowHpBoost:{threshold:0.33,stat:'atk',stages:2}},
  auth_grip:        {name:'Authoritarian Grip',desc:'Opponent cannot switch the turn this enters.',trapOnEnter:true},
  solar_powered:    {name:'Solar Powered',desc:'Sp.Atk ×1.5 in Revolution Rising.',weatherSpaBoost:{weather:'revolution',mult:1.5}},
  grift:            {name:'Grift',desc:'Heals 10% HP when opponent uses a status move.',griftHeal:0.10},
  charisma:         {name:'Charisma',desc:'Moves never miss.',alwaysHit:true},
  turtle_defense:   {name:'Turtle Defense',desc:'Defense ×1.5 below 50% HP.',lowHpDef:{threshold:0.5,mult:1.5}},
  nepotism:         {name:'Nepotism',desc:'Ignores incoming stat drops.',blockStatDrops:true},
  scorched_earth:   {name:'Scorched Earth',desc:'On faint, sets Scandal Storm.',onFaintSetWeather:'scandal'},
  martyrdom:        {name:'Martyrdom',desc:'On faint, deals 25% HP damage to active opponent.',onFaintDamage:0.25},
  censorship:       {name:'Censorship',desc:'Opponent\'s Special moves have −20 accuracy.',oppSpecialAccPenalty:-20},
};

// ── HELD ITEMS ────────────────────────────────────────────────────────────────
const ITEMS = {
  lobbyist_briefcase: {name:'Lobbyist Briefcase',icon:'💼',desc:'Special moves +20%.',spaMult:1.2},
  assault_rifle:      {name:'AR-15 (Prop)',      icon:'🔫',desc:'Physical moves +20%.',atkMult:1.2},
  nuclear_football:   {name:'Nuclear Football',  icon:'☢️',desc:'Once: next move 2×. Consumed.',onceNuclear:true,nuclearUsed:false},
  constitution_shield:{name:'Constitution Shield',icon:'📜',desc:'Blocks first super-effective hit. Consumed.',blockSuperEff:true,blockUsed:false},
  flak_jacket:        {name:'Flak Jacket',       icon:'🦺',desc:'Incoming Physical damage −15%.',physReduce:0.85},
  campaign_funds:     {name:'Campaign Funds',    icon:'💰',desc:'Restores 1/16 HP end of turn.',endTurnHeal:true},
  executive_pardon:   {name:'Executive Pardon',  icon:'🖊️',desc:'Cures status once. Consumed.',cureStatus:true,cureUsed:false},
  air_force_one:      {name:'Air Force One',     icon:'✈️',desc:'Speed ×1.5.',speedMult:1.5},
  candy:              {name:'Political Candy',   icon:'🍬',desc:'Use in battle: +1 random stat. Consumed.',battleUsable:true,candyUsed:false},
  stardust_bag:       {name:'Stardust Bag',      icon:'✨',desc:'25% end-of-turn random stat +1.',stardustProc:0.25},
  poison_pen:         {name:'Poison Pen',        icon:'🖋️',desc:'On enter: opponent is poisoned.',poisonOnEntry:true},
  spin_machine:       {name:'Spin Machine',      icon:'📡',desc:'On enter: Media Blitz 8 turns.',setWeatherEntry:'mediablitz'},
  stock_ticker:       {name:'Stock Ticker',      icon:'📈',desc:'On enter: Market Crash 8 turns.',setWeatherEntry:'marketcrash'},
  shiv:               {name:'Political Shiv',    icon:'🗡️',desc:'Crit rate stage +1.',critBonus:1},
  lucky_egg:          {name:'Lucky Egg',         icon:'🥚',desc:'Lucky: all stats +15%, glows gold.',lucky:true,statMult:1.15},
  shadow_orb:         {name:'Shadow Orb',        icon:'🌑',desc:'Shadow: Atk/SpA +20%, Def −15%, +1 PP cost.',shadow:true},
  purified_heart:     {name:'Purified Heart',    icon:'🕊️',desc:'Purified: all stats +10%, statuses wear off faster.',purified:true,statMult:1.10},
  mega_stone:         {name:'Mega Stone',        icon:'💎',desc:'Once: Surge Mode 3 turns, all stats +1.',surgeItem:true,surgeUsed:false},
  pvp_shield:         {name:'PvP Shield',        icon:'🛡️',desc:'2 shields: each blocks one charged (power≥80) move.',shields:2},
  buddy_bond:         {name:'Buddy Bond',        icon:'🤝',desc:'Buddy bonus: +5% all stats before battle.',buddyBonus:0.05},
};

// ── PP ────────────────────────────────────────────────────────────────────────
function getMovePP(move){
  if(move.effect&&move.effect.ban)return 1;
  if(move.power>=120)return 5;
  if(move.power>=90)return 8;
  if(move.category==='status')return 16;
  return 10;
}

// ── CRITICAL HITS ─────────────────────────────────────────────────────────────
function rollCrit(stage){const t=[1/24,1/8,1/2,1];return Math.random()<t[Math.min(stage,3)];}

// ── STAT HELPERS ──────────────────────────────────────────────────────────────
function effStat(f,stat){
  const base=f.stats[stat], stage=f.stages[stat]||0;
  const m=stage>=0?(2+stage)/2:2/(2-stage);
  return Math.max(1,Math.floor(base*m));
}
function effSpeed(f,battle){
  let s=effStat(f,'spe');
  if(f.status==='paralysis')s=Math.floor(s/2);
  const item=ITEMS[f.heldItem];
  if(item&&item.speedMult)s=Math.floor(s*item.speedMult);
  if(battle&&battle.weather==='coldwar')s=Math.floor(s/2);
  return s;
}

// ── DAMAGE CALC ───────────────────────────────────────────────────────────────
function calcDamage(atk,def,move,atkPol,defPol,battle){
  const atkItem=ITEMS[atk.heldItem], defItem=ITEMS[def.heldItem];
  const atkAbil=ABILITIES[atk.ability], defAbil=ABILITIES[def.ability];
  const weather=battle.weather||'none', wData=WEATHER[weather];

  let atkStat=effStat(atk,move.category==='physical'?'atk':'spa');
  let defStat=effStat(def,move.category==='physical'?'def':'spd');

  // Low-HP def boost (turtle_defense)
  if(defAbil&&defAbil.lowHpDef&&def.currentHp/def.stats.hp<=defAbil.lowHpDef.threshold)
    defStat=Math.floor(defStat*defAbil.lowHpDef.mult);

  // Shadow stat adjust
  if(atk.shadow){atkStat=Math.floor(atkStat*1.2);}
  if(def.shadow){defStat=Math.floor(defStat*0.85);}

  // Crit
  let critStage=atk.critStage||0;
  if(atkItem&&atkItem.critBonus)critStage+=atkItem.critBonus;
  if(move.highCrit)critStage++;
  let crit=rollCrit(critStage);
  if(crit&&defAbil&&defAbil.blockCrits)crit=false;

  const effAtk=crit?Math.max(atkStat,atk.stats[move.category==='physical'?'atk':'spa']):atkStat;
  const effDef=crit?Math.min(defStat,def.stats[move.category==='physical'?'def':'spd']):defStat;

  let dmg=((2*50/5+2)*move.power*(effAtk/effDef))/50+2;

  // STAB
  if(atkPol.types.includes(move.type))dmg*=1.5;
  // Crit
  if(crit)dmg*=1.5;
  // Type
  const eff=getEff(move.type,defPol.types);
  dmg*=eff;
  // Burn
  if(atk.status==='burn'&&move.category==='physical')dmg*=0.5;
  // Weather
  if(wData.boostType===move.type)dmg*=wData.dmgMult;
  if(wData.penaltyType===move.type)dmg*=0.67;
  if(weather==='coldwar'&&move.category==='special')dmg*=0.9;
  // Item atk boosts
  if(atkItem){
    if(atkItem.spaMult&&move.category==='special')dmg*=atkItem.spaMult;
    if(atkItem.atkMult&&move.category==='physical')dmg*=atkItem.atkMult;
  }
  // Ability atk boost
  if(atkAbil&&atkAbil.physMult&&move.category==='physical')dmg*=atkAbil.physMult;
  if(atkAbil&&atkAbil.weatherSpaBoost&&weather===atkAbil.weatherSpaBoost.weather&&move.category==='special')
    dmg*=atkAbil.weatherSpaBoost.mult;
  // Surge mode
  if(atk.surgeMode&&atk.surgeTurnsLeft>0)dmg*=1.5;
  // Nuclear football
  if(battle._nuclearActive){dmg*=2;battle._nuclearActive=false;}

  // Random factor
  dmg*=(Math.random()*0.15+0.85);
  let finalDmg=Math.max(1,Math.floor(dmg));

  // PvP shield check
  if(def.pvpShields>0&&move.power>=80&&!crit){
    def.pvpShields--;
    return{dmg:1,crit:false,shielded:true,shieldsLeft:def.pvpShields,eff};
  }
  // Constitution shield
  if(defItem&&defItem.blockSuperEff&&!defItem.blockUsed&&eff>=2){
    defItem.blockUsed=true;
    return{dmg:0,crit:false,constitutionBlock:true,eff};
  }
  // Flak jacket
  if(defItem&&defItem.physReduce&&move.category==='physical')finalDmg=Math.floor(finalDmg*defItem.physReduce);

  return{dmg:finalDmg,crit,eff};
}

// ── STATUS HELPERS ────────────────────────────────────────────────────────────
function statusMsg(s){return{burn:'burned',paralysis:'paralyzed',poison:'poisoned',toxic:'badly poisoned',sleep:'put to sleep'}[s]||s;}

function tryApplyStatus(fighter,status){
  const abil=ABILITIES[fighter.ability];
  if(abil&&abil.immuneStatus&&abil.immuneStatus.includes(status))return{blocked:true,reason:'ability'};
  const item=ITEMS[fighter.heldItem];
  if(item&&item.cureStatus&&!item.cureUsed){item.cureUsed=true;return{blocked:true,reason:'Pardon',log:`${fighter.name}'s Executive Pardon blocked the ${status}!`};}
  return{blocked:false};
}

// ── END OF TURN ───────────────────────────────────────────────────────────────
function endOfTurn(fighter,battle){
  const msgs=[];
  const item=ITEMS[fighter.heldItem];
  const abil=ABILITIES[fighter.ability];

  if(fighter.status==='burn'){
    const d=Math.max(1,Math.floor(fighter.stats.hp/16));
    fighter.currentHp=Math.max(0,fighter.currentHp-d);
    msgs.push(`${fighter.name} is hurt by burn! (−${d})`);
    if(item&&item.purified){fighter._burnTimer=(fighter._burnTimer||0)+1;if(fighter._burnTimer>=2){fighter.status=null;fighter._burnTimer=0;msgs.push(`Purified Heart cured the burn!`);}}
  }
  if(fighter.status==='poison'){const d=Math.max(1,Math.floor(fighter.stats.hp/8));fighter.currentHp=Math.max(0,fighter.currentHp-d);msgs.push(`${fighter.name} hurt by poison! (−${d})`);}
  if(fighter.status==='toxic'){
    fighter.toxicCounter=fighter.toxicCounter||1;
    const d=Math.max(1,Math.floor(fighter.stats.hp*fighter.toxicCounter/16));
    fighter.currentHp=Math.max(0,fighter.currentHp-d);
    msgs.push(`${fighter.name} badly poisoned! (−${d})`);
    fighter.toxicCounter++;
  }
  // Campaign funds heal
  if(item&&item.endTurnHeal&&fighter.currentHp>0){const h=Math.max(1,Math.floor(fighter.stats.hp/16));fighter.currentHp=Math.min(fighter.stats.hp,fighter.currentHp+h);msgs.push(`${fighter.name}'s Campaign Funds restored ${h} HP!`);}
  // Stardust bag
  if(item&&item.stardustProc&&Math.random()<item.stardustProc){
    const stats=['atk','def','spa','spd','spe'];const s=stats[Math.floor(Math.random()*5)];
    fighter.stages[s]=Math.min(6,(fighter.stages[s]||0)+1);
    msgs.push(`${fighter.name}'s Stardust sparkled! ${s.toUpperCase()} rose!`);
  }
  // Weather damage
  const w=battle.weather||'none';
  if(WEATHER[w].special==='chip_corporate'&&fighter.types.includes('Corporate')){
    const d=Math.max(1,Math.floor(fighter.stats.hp/12));fighter.currentHp=Math.max(0,fighter.currentHp-d);
    msgs.push(`Market Crash chips ${fighter.name}! (−${d})`);
  }
  if(WEATHER[w].special==='random_stat_drop'&&Math.random()<0.4){
    const stats=['atk','def','spa','spd','spe'];const s=stats[Math.floor(Math.random()*5)];
    fighter.stages[s]=Math.max(-6,(fighter.stages[s]||0)-1);
    msgs.push(`Scandal Storm hit ${fighter.name}! ${s.toUpperCase()} fell!`);
  }
  // Low HP ability trigger (rev_spirit)
  if(abil&&abil.lowHpBoost&&!fighter._lowHpTriggered&&fighter.currentHp>0&&fighter.currentHp/fighter.stats.hp<abil.lowHpBoost.threshold){
    fighter._lowHpTriggered=true;
    fighter.stages[abil.lowHpBoost.stat]=Math.min(6,(fighter.stages[abil.lowHpBoost.stat]||0)+abil.lowHpBoost.stages);
    msgs.push(`${fighter.name}'s ${abil.name} triggered! ${abil.lowHpBoost.stat.toUpperCase()} sharply rose!`);
  }
  return msgs;
}

// ── WEATHER TICK ──────────────────────────────────────────────────────────────
function tickWeather(battle){
  if(!battle.weather||battle.weather==='none')return[];
  battle.weatherTurns=(battle.weatherTurns||WEATHER_TURNS)-1;
  if(battle.weatherTurns<=0){const n=WEATHER[battle.weather].name;battle.weather='none';return[`The ${n} has ended.`];}
  const w=WEATHER[battle.weather];
  return[`${w.icon} ${w.name} (${battle.weatherTurns} turns left)`];
}

// ── ENTRY HAZARDS ─────────────────────────────────────────────────────────────
function applyHazards(fighter,side,pol){
  const msgs=[];
  if(side.hazards.stealthRock){const eff=getEff('Republican',pol.types);const d=Math.max(1,Math.floor(fighter.stats.hp*0.125*eff));msgs.push(`Scandal Rocks hit ${fighter.name}! (−${d})`);fighter.currentHp=Math.max(0,fighter.currentHp-d);}
  if(side.hazards.spikes>0){const pct=[0,1/8,1/6,1/4][side.hazards.spikes];const d=Math.max(1,Math.floor(fighter.stats.hp*pct));msgs.push(`Policy Spikes hit ${fighter.name}! (−${d})`);fighter.currentHp=Math.max(0,fighter.currentHp-d);}
  if(side.hazards.stickyWeb){fighter.stages.spe=Math.max(-6,(fighter.stages.spe||0)-1);msgs.push(`Bureaucratic Web slowed ${fighter.name}! (SPE fell)`);}
  return msgs;
}

// ── CAN ACT ───────────────────────────────────────────────────────────────────
function canAct(f){
  if(f.status==='sleep'){if(f.sleepTurns>0){f.sleepTurns--;return{can:false,msg:`${f.name} is fast asleep!`};}else{f.status=null;return{can:true,msg:`${f.name} woke up!`};}}
  if(f.status==='paralysis'&&Math.random()<0.25)return{can:false,msg:`${f.name} is paralyzed!`};
  if(f.flinch){f.flinch=false;return{can:false,msg:`${f.name} flinched!`};}
  return{can:true,msg:null};
}

// ── CREATE FIGHTER ────────────────────────────────────────────────────────────
function createFighter(pol,itemId){
  const item=ITEMS[itemId];
  let stats={...pol.stats};
  // Buddy bond
  if(item&&item.buddyBonus){for(const s of Object.keys(stats))stats[s]=Math.round(stats[s]*(1+item.buddyBonus));}
  // Lucky / Purified stat mult
  if(item&&item.statMult){for(const s of Object.keys(stats))stats[s]=Math.round(stats[s]*item.statMult);}
  // Shadow
  if(item&&item.shadow){stats.atk=Math.round(stats.atk*1.2);stats.spa=Math.round(stats.spa*1.2);stats.def=Math.round(stats.def*0.85);}
  return{
    id:pol.id,name:pol.name,types:pol.types,stats,currentHp:stats.hp,
    moves:pol.moves.map(m=>({...m,pp:getMovePP(m),maxPp:getMovePP(m)})),
    status:null,stages:{atk:0,def:0,spa:0,spd:0,spe:0},critStage:0,
    toxicCounter:1,sleepTurns:0,flinch:false,emoji:pol.emoji,
    ability:pol.ability||null,
    heldItem:itemId||null,
    lucky:!!(item&&item.lucky),shadow:!!(item&&item.shadow),purified:!!(item&&item.purified),
    surgeMode:false,surgeTurnsLeft:0,pvpShields:item&&item.shields?item.shields:0,
    _lowHpTriggered:false,_surgeUsed:false,
  };
}

// ── EXECUTE MOVE ──────────────────────────────────────────────────────────────
function executeMove(atk,def,move,atkPol,defPol,defSide,battle){
  const log=[];
  const atkAbil=ABILITIES[atk.ability];
  const defAbil=ABILITIES[def.ability];
  const atkItem=ITEMS[atk.heldItem];
  const defItem=ITEMS[def.heldItem];

  // BAN
  if(move.effect&&move.effect.ban){
    move.pp=Math.max(0,move.pp-1);
    log.push(`🚫 W!BAN @${def.name} ?R TROLL+L`);
    log.push(`${atk.name} used BAN! (PP: ${move.pp}/${move.maxPp})`);
    atk.currentHp=0;def.currentHp=0;
    log.push(`BOTH fighters BANNED into the shadow realm!`);
    return{log,fainted:true};
  }

  // PP / Struggle
  if(move.pp<=0){
    log.push(`${atk.name} has no PP! Struggling!`);
    const sd=Math.max(1,Math.floor(atk.stats.hp/4));
    def.currentHp=Math.max(0,def.currentHp-sd);
    atk.currentHp=Math.max(0,atk.currentHp-Math.floor(sd/2));
    log.push(`Struggle: −${sd} to ${def.name}, −${Math.floor(sd/2)} recoil`);
    return{log,fainted:def.currentHp<=0||atk.currentHp<=0};
  }
  move.pp=Math.max(0,move.pp-1);
  if(atk.shadow&&move.pp>0)move.pp=Math.max(0,move.pp-1); // shadow +PP cost

  // Nuclear football trigger
  if(atkItem&&atkItem.onceNuclear&&!atkItem.nuclearUsed){atkItem.nuclearUsed=true;battle._nuclearActive=true;log.push(`${atk.name} opened the Nuclear Football! POWER DOUBLED!`);}

  // Surge mode announce
  if(atk.surgeMode&&atk.surgeTurnsLeft>0)log.push(`⚡ SURGE MODE! (${atk.surgeTurnsLeft} turns)`);

  // Accuracy
  if(!(atkAbil&&atkAbil.alwaysHit)&&move.accuracy<100){
    let acc=move.accuracy;
    if(defAbil&&defAbil.oppSpecialAccPenalty&&move.category==='special')acc+=defAbil.oppSpecialAccPenalty;
    if(Math.random()*100>acc){log.push(`${atk.name} used ${move.name} — MISSED! (PP ${move.pp}/${move.maxPp})`);return{log,fainted:false};}
  }
  log.push(`${atk.name} used ${move.name}! (PP ${move.pp}/${move.maxPp})`);

  // STATUS MOVES
  if(move.category==='status'){
    const eff=move.effect||{};
    // Status infliction
    if(eff.status){
      const tgt=eff.self?atk:def;
      if(!tgt.status){
        let chance=eff.statusChance||100;
        if(atkAbil&&atkAbil.statusChanceBoost)chance+=atkAbil.statusChanceBoost;
        if(Math.random()*100<=chance){
          const block=tryApplyStatus(tgt,eff.status);
          if(block.blocked){log.push(block.log||`${tgt.name}'s ${block.reason} blocked it!`);}
          else{tgt.status=eff.status;if(eff.status==='sleep')tgt.sleepTurns=Math.floor(Math.random()*3)+1;log.push(`${tgt.name} was ${statusMsg(eff.status)}!`);}
        }
      } else {log.push(`Failed — ${tgt.name} already has a status!`);}
    }
    // Stat boosts
    if(eff.statBoost){
      for(const[stat,stages] of Object.entries(eff.statBoost)){
        const tgt=eff.self?atk:def;
        if(stages<0&&ABILITIES[tgt.ability]&&ABILITIES[tgt.ability].blockStatDrops){log.push(`${tgt.name}'s Nepotism blocked the stat drop!`);continue;}
        tgt.stages[stat]=Math.max(-6,Math.min(6,(tgt.stages[stat]||0)+stages));
        const sn={atk:'Attack',def:'Defense',spa:'Sp.Atk',spd:'Sp.Def',spe:'Speed'}[stat];
        log.push(`${tgt.name}'s ${sn} ${stages>0?'rose'+(Math.abs(stages)>1?' sharply':''):'fell'+(Math.abs(stages)>1?' harshly':'')}!`);
      }
    }
    // Heal
    if(eff.heal){
      const h=Math.floor(atk.stats.hp*eff.heal);atk.currentHp=Math.min(atk.stats.hp,atk.currentHp+h);log.push(`${atk.name} restored ${h} HP!`);
      // Grift
      if(defAbil&&defAbil.griftHeal){const g=Math.max(1,Math.floor(def.stats.hp*defAbil.griftHeal));def.currentHp=Math.min(def.stats.hp,def.currentHp+g);log.push(`${def.name} grifted ${g} HP!`);}
    }
    // Hazards
    if(eff.hazard){
      if(eff.hazard==='stealthRock'&&!defSide.hazards.stealthRock){defSide.hazards.stealthRock=true;log.push(`Scandal Rocks set on opponent's side!`);}
      else if(eff.hazard==='spikes'&&defSide.hazards.spikes<3){defSide.hazards.spikes++;log.push(`Policy Spikes! Layer ${defSide.hazards.spikes}`);}
      else if(eff.hazard==='stickyWeb'&&!defSide.hazards.stickyWeb){defSide.hazards.stickyWeb=true;log.push(`Bureaucratic Web set!`);}
      else log.push(`Failed!`);
    }
    // Weather setter
    if(eff.setWeather){battle.weather=eff.setWeather;battle.weatherTurns=WEATHER_TURNS;log.push(`${WEATHER[eff.setWeather].icon} ${WEATHER[eff.setWeather].name} started!`);}
    // Surge activation
    if(eff.surge){
      if(!atk._surgeUsed){atk._surgeUsed=true;atk.surgeMode=true;atk.surgeTurnsLeft=3;
        for(const s of['atk','def','spa','spd','spe'])atk.stages[s]=Math.min(6,(atk.stages[s]||0)+1);
        log.push(`⚡ ${atk.name} entered SURGE MODE! All stats +1 for 3 turns!`);}
      else log.push(`Surge Mode already used!`);}

  // DAMAGE MOVES
  } else {
    const res=calcDamage(atk,def,move,atkPol,defPol,battle);
    if(res.constitutionBlock){
      log.push(`${def.name}'s Constitution Shield blocked the super-effective hit! (Shattered!)`);
      def.heldItem=null;
    } else if(res.shielded){
      log.push(`🛡️ ${def.name} used a PvP Shield! (${res.shieldsLeft} left)`);
    } else {
      def.currentHp=Math.max(0,def.currentHp-res.dmg);
      if(res.crit)log.push(`💥 Critical hit!`);
      if(res.eff>=2)log.push(`Super effective! (−${res.dmg} HP)`);
      else if(res.eff<=0)log.push(`No effect!`);
      else if(res.eff<1)log.push(`Not very effective (−${res.dmg} HP)`);
      else log.push(`(−${res.dmg} HP)`);

      // Secondary effects
      const eff=move.effect||{};
      const roll=!eff.chance||Math.random()*100<=eff.chance;
      if(roll){
        if(eff.status&&!def.status){const bl=tryApplyStatus(def,eff.status);if(!bl.blocked){def.status=eff.status;if(eff.status==='sleep')def.sleepTurns=Math.floor(Math.random()*3)+1;log.push(`${def.name} was ${statusMsg(eff.status)}!`);}}
        if(eff.flinch)def.flinch=true;
        if(eff.statBoost){for(const[stat,stages] of Object.entries(eff.statBoost)){const t2=eff.self?atk:def;if(stages<0&&ABILITIES[t2.ability]&&ABILITIES[t2.ability].blockStatDrops)continue;t2.stages[stat]=Math.max(-6,Math.min(6,(t2.stages[stat]||0)+stages));const sn={atk:'Attack',def:'Defense',spa:'Sp.Atk',spd:'Sp.Def',spe:'Speed'}[stat];log.push(`${t2.name}'s ${sn} ${stages>0?'rose':'fell'}!`);}}
        if(eff.recoil){const rd=Math.max(1,Math.floor(res.dmg*eff.recoil));atk.currentHp=Math.max(0,atk.currentHp-rd);log.push(`Recoil: ${atk.name} −${rd} HP`);}
      }
      // Low HP ability trigger on both
      for(const f of[atk,def]){const a=ABILITIES[f.ability];if(a&&a.lowHpBoost&&!f._lowHpTriggered&&f.currentHp>0&&f.currentHp/f.stats.hp<a.lowHpBoost.threshold){f._lowHpTriggered=true;f.stages[a.lowHpBoost.stat]=Math.min(6,(f.stages[a.lowHpBoost.stat]||0)+a.lowHpBoost.stages);log.push(`${f.name}'s ${a.name}! ${a.lowHpBoost.stat.toUpperCase()} sharply rose!`);}}
    }
  }

  // Surge tick
  if(atk.surgeMode){atk.surgeTurnsLeft--;if(atk.surgeTurnsLeft<=0){atk.surgeMode=false;log.push(`${atk.name}'s Surge Mode ended.`);}}

  const fainted=def.currentHp<=0;
  const atkFainted=atk.currentHp<=0;
  if(fainted){
    log.push(`${def.name} fainted!`);
    // Scorched earth
    const da=ABILITIES[def.ability];
    if(da&&da.onFaintSetWeather){battle.weather=da.onFaintSetWeather;battle.weatherTurns=4;log.push(`A Scandal Storm erupted!`);}
    // Martyrdom
    if(da&&da.onFaintDamage){const md=Math.floor(def.stats.hp*da.onFaintDamage);atk.currentHp=Math.max(0,atk.currentHp-md);log.push(`${def.name}'s Martyrdom dealt ${md} to ${atk.name}!`);}
  }
  if(atkFainted&&!fainted)log.push(`${atk.name} fainted from recoil!`);
  return{log,fainted:fainted||atkFainted};
}

// ── AI ────────────────────────────────────────────────────────────────────────
function aiChoose(team,active,opp,oppPol,battle){
  const f=team[active];
  if(f.currentHp<=0){
    const alive=team.map((x,i)=>({x,i})).filter(a=>a.x.currentHp>0&&a.i!==active);
    if(!alive.length)return null;
    return{type:'switch',index:alive.sort((a,b)=>getEff(b.x.types[0],oppPol.types)-getEff(a.x.types[0],oppPol.types))[0].i};
  }
  // Surge item at low HP
  const item=ITEMS[f.heldItem];
  if(item&&item.surgeItem&&!item.surgeUsed&&f.currentHp/f.stats.hp<0.5){item.surgeUsed=true;return{type:'surge'};}

  let best=0,bestScore=-Infinity;
  for(let i=0;i<f.moves.length;i++){
    const m=f.moves[i];if(m.pp<=0)continue;
    let sc=m.category!=='status'?m.power*getEff(m.type,oppPol.types)*(m.accuracy/100):30;
    if(f.types.includes(m.type))sc*=1.5;
    if(m.highCrit)sc*=1.15;
    const w=WEATHER[battle.weather||'none'];if(w.boostType===m.type)sc*=1.3;
    if(m.effect&&m.effect.status==='sleep')sc=65;
    if(m.effect&&m.effect.hazard)sc=50;
    if(sc>bestScore){bestScore=sc;best=i;}
  }
  const alive=team.map((x,i)=>({x,i})).filter(a=>a.x.currentHp>0&&a.i!==active);
  if(alive.length&&bestScore<30){
    for(const a of alive){
      const ss=a.x.moves.filter(m=>m.pp>0).reduce((mx,m)=>{let s=m.category!=='status'?m.power*getEff(m.type,oppPol.types)*(m.accuracy/100):0;if(a.x.types.includes(m.type))s*=1.5;return Math.max(mx,s);},0);
      if(ss>bestScore*1.8)return{type:'switch',index:a.i};
    }
  }
  return{type:'move',index:best};
}
function aiPick(pols){return[...pols].sort(()=>Math.random()-.5).slice(0,6).map(p=>p.id);}

// ── PROCESS TURN ──────────────────────────────────────────────────────────────
function processTurn(room,hostAct,guestAct,POLS){
  const b=room.battle,log=[],events=[];
  const hT=b.hostTeam,gT=b.guestTeam;

  // Switches
  for(const[act,side,team,mySide,theySide,active] of [
    [hostAct,'host',hT,b.hostSide,b.guestSide,'hostActive'],
    [guestAct,'guest',gT,b.guestSide,b.hostSide,'guestActive'],
  ]){
    if(act.type!=='switch')continue;
    b[active]=act.index;
    const nf=team[act.index];
    log.push(`${room.players[side].name} sent out ${nf.name}!`);
    const abil=ABILITIES[nf.ability];
    if(abil&&abil.switchBoost&&(abil.switchBoost.weathers||[]).includes(b.weather)){
      nf.stages[abil.switchBoost.stat]=Math.min(6,(nf.stages[abil.switchBoost.stat]||0)+abil.switchBoost.stages);
      log.push(`${nf.name}'s ${abil.name} boosted ${abil.switchBoost.stat.toUpperCase()}!`);
    }
    if(abil&&abil.trapOnEnter)b[side==='host'?'guestTrapped':'hostTrapped']=true;
    const itm=ITEMS[nf.heldItem];
    if(itm&&itm.setWeatherEntry){b.weather=itm.setWeatherEntry;b.weatherTurns=8;log.push(`${WEATHER[itm.setWeatherEntry].icon} ${itm.name} set ${WEATHER[itm.setWeatherEntry].name}!`);}
    if(itm&&itm.poisonOnEntry){const opp=side==='host'?gT[b.guestActive]:hT[b.hostActive];if(!opp.status){opp.status='poison';log.push(`${opp.name} poisoned by Poison Pen!`);}}
    log.push(...applyHazards(nf,mySide,POLS.find(p=>p.id===nf.id)));
  }

  // Move order
  const hF=hT[b.hostActive],gF=gT[b.guestActive];
  const hPol=POLS.find(p=>p.id===hF.id),gPol=POLS.find(p=>p.id===gF.id);
  let firstHost=true;
  if(hostAct.type==='move'&&guestAct.type==='move'){const hs=effSpeed(hF,b),gs=effSpeed(gF,b);firstHost=hs>gs||(hs===gs&&Math.random()>.5);}
  const actions=[];
  if(hostAct.type==='move')actions.push({side:'host',act:hostAct,f:hF,pol:hPol,opp:gF,oppPol:gPol,defSide:b.guestSide});
  if(guestAct.type==='move')actions.push({side:'guest',act:guestAct,f:gF,pol:gPol,opp:hF,oppPol:hPol,defSide:b.hostSide});
  if(actions.length===2&&!firstHost)actions.reverse();

  for(const a of actions){
    if(a.f.currentHp<=0)continue;
    const ca=canAct(a.f);if(ca.msg)log.push(ca.msg);if(!ca.can)continue;
    const mv=a.f.moves[a.act.index];if(!mv)continue;
    const res=executeMove(a.f,a.opp,mv,a.pol,a.oppPol,a.defSide,b);
    log.push(...res.log);if(res.fainted)events.push({type:'fainted',side:a.side==='host'?'guest':'host'});
  }

  // End of turn effects + weather
  for(const f of[hT[b.hostActive],gT[b.guestActive]]){
    if(f.currentHp>0){const ms=endOfTurn(f,b);log.push(...ms);if(f.currentHp<=0){log.push(`${f.name} fainted!`);const side=hT.includes(f)?'host':'guest';const da=ABILITIES[f.ability];if(da&&da.onFaintSetWeather){b.weather=da.onFaintSetWeather;b.weatherTurns=4;log.push(`Scandal Storm erupted!`);}if(da&&da.onFaintDamage){const opp=hT.includes(f)?gT[b.guestActive]:hT[b.hostActive];const md=Math.floor(f.stats.hp*da.onFaintDamage);opp.currentHp=Math.max(0,opp.currentHp-md);log.push(`Martyrdom: −${md} to ${opp.name}!`);}events.push({type:'fainted',side:hT.includes(f)?'host':'guest'});}}
  }
  log.push(...tickWeather(b));

  const hA=hT.filter(f=>f.currentHp>0).length,gA=gT.filter(f=>f.currentHp>0).length;
  let winner=null;if(!hA&&!gA)winner='draw';else if(!hA)winner='guest';else if(!gA)winner='host';
  b.turnLog=log;b.turn++;
  return{log,events,winner};
}

// ── INIT BATTLE ───────────────────────────────────────────────────────────────
function initBattle(room,hIds,gIds,POLS,hItems,gItems,raidBoss){
  hItems=hItems||{};gItems=gItems||{};
  const hT=hIds.map((id,i)=>createFighter(POLS.find(p=>p.id===id),hItems[i]||null));
  const gT=gIds.map((id,i)=>createFighter(POLS.find(p=>p.id===id),gItems[i]||null));
  if(raidBoss){const boss=gT[0];boss.stats.hp*=3;boss.currentHp=boss.stats.hp;boss._isRaidBoss=true;}
  room.battle={
    hostTeam:hT,guestTeam:gT,hostActive:0,guestActive:0,
    hostSide:{hazards:{stealthRock:false,spikes:0,stickyWeb:false}},
    guestSide:{hazards:{stealthRock:false,spikes:0,stickyWeb:false}},
    weather:'none',weatherTurns:0,turn:1,turnLog:[],
    hostAction:null,guestAction:null,hostTrapped:false,guestTrapped:false,
    raidBoss:raidBoss||false,_nuclearActive:false,
  };
  room.state='battling';
  return room.battle;
}

// ── SOCKET ────────────────────────────────────────────────────────────────────
module.exports=function attachBattleSocket(io){
  const POLS=require('./politiData');
  const BR=require('./battleRooms');
  const ns=io.of('/politibattle');

  function teamSelectPayload(){return{
    politicians:POLS.map(p=>({
      id:p.id,name:p.name,types:p.types,stats:p.stats,emoji:p.emoji,title:p.title,flavor:p.flavor,
      moves:p.moves.map(m=>({name:m.name,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,pp:getMovePP(m),maxPp:getMovePP(m),description:m.description})),
      ability:p.ability?{id:p.ability,...ABILITIES[p.ability]}:null,
    })),
    items:Object.entries(ITEMS).map(([id,it])=>({id,name:it.name,icon:it.icon,desc:it.desc})),
    weather:Object.entries(WEATHER).map(([id,w])=>({id,...w})),
  };}

  ns.on('connection',socket=>{
    console.log('[PolitiBattle v2]',socket.id);

    socket.on('battle:create',(data,cb)=>{const room=BR.createRoom(data.userId||socket.id,data.name||'Trainer');room.players.host.socketId=socket.id;socket.join(room.code);cb({code:room.code});});
    socket.on('battle:join',(data,cb)=>{
      const r=BR.joinRoom(data.code,data.userId||socket.id,data.name||'Trainer 2');
      if(r.error)return cb({error:r.error});
      r.room.players.guest.socketId=socket.id;socket.join(data.code);
      cb({success:true,hostName:r.room.players.host.name});
      ns.to(data.code).emit('battle:playerJoined',{guestName:data.name});
      r.room.state='team_select';ns.to(data.code).emit('battle:teamSelect',teamSelectPayload());
    });
    socket.on('battle:startAI',(data,cb)=>{
      const room=BR.getRoom(data.code);if(!room)return cb&&cb({error:'Room not found'});
      BR.startAIBattle(data.code);room.state='team_select';room._raidMode=data.raidMode||false;
      cb&&cb({success:true});ns.to(data.code).emit('battle:teamSelect',teamSelectPayload());
    });
    socket.on('battle:teamReady',(data)=>{
      const room=BR.getRoom(data.code);if(!room)return;
      if(room.players.host.socketId===socket.id){room.players.host.team=data.team;room.players.host.items=data.items||{};room.players.host.ready=true;}
      else if(room.players.guest?.socketId===socket.id){room.players.guest.team=data.team;room.players.guest.items=data.items||{};room.players.guest.ready=true;}
      if(room.ai&&room.players.host.ready&&!room.players.guest?.ready){room.players.guest.team=aiPick(POLS);room.players.guest.items={};room.players.guest.ready=true;}
      if(room.players.host.ready&&room.players.guest?.ready){
        const b=initBattle(room,room.players.host.team,room.players.guest.team,POLS,room.players.host.items,room.players.guest.items,room._raidMode);
        ns.to(data.code).emit('battle:start',{hostTeam:b.hostTeam.map(sf),guestTeam:b.guestTeam.map(gf),hostActive:0,guestActive:0,turn:1,weather:b.weather,weatherInfo:WEATHER});
      }
    });
    socket.on('battle:action',(data)=>{
      const room=BR.getRoom(data.code);if(!room||room.state!=='battling')return;
      const b=room.battle;
      if(room.players.host.socketId===socket.id)b.hostAction=data.action;
      else if(room.players.guest?.socketId===socket.id)b.guestAction=data.action;
      if(room.ai&&b.hostAction&&!b.guestAction){const gF=b.guestTeam[b.guestActive];const hF=b.hostTeam[b.hostActive];const hPol=POLS.find(p=>p.id===hF.id);b.guestAction=aiChoose(b.guestTeam,b.guestActive,hF,hPol,b);}
      if(b.hostAction&&b.guestAction){
        const res=processTurn(room,b.hostAction,b.guestAction,POLS);
        const hNS=b.hostTeam[b.hostActive].currentHp<=0&&b.hostTeam.some(f=>f.currentHp>0);
        const gNS=b.guestTeam[b.guestActive].currentHp<=0&&b.guestTeam.some(f=>f.currentHp>0);
        ns.to(data.code).emit('battle:turnResult',{log:res.log,hostTeam:b.hostTeam.map(sf),guestTeam:b.guestTeam.map(gf),hostActive:b.hostActive,guestActive:b.guestActive,winner:res.winner,hostNeedsSwitch:hNS,guestNeedsSwitch:gNS,weather:b.weather,weatherInfo:WEATHER[b.weather]||WEATHER.none});
        if(room.ai&&gNS&&!res.winner){const alive=b.guestTeam.map((f,i)=>({f,i})).filter(x=>x.f.currentHp>0);if(alive.length>0){b.guestActive=alive[0].i;setTimeout(()=>ns.to(data.code).emit('battle:switched',{side:'guest',index:b.guestActive,name:b.guestTeam[b.guestActive].name}),500);}}
        if(res.winner)room.state='finished';
        b.hostAction=null;b.guestAction=null;
      }
    });
    socket.on('battle:switch',(data)=>{
      const room=BR.getRoom(data.code);if(!room||!room.battle)return;
      const b=room.battle,isHost=room.players.host.socketId===socket.id;
      const team=isHost?b.hostTeam:b.guestTeam,side=isHost?b.hostSide:b.guestSide;
      if(team[data.index]&&team[data.index].currentHp>0){
        if(isHost)b.hostActive=data.index;else b.guestActive=data.index;
        const nf=team[data.index],pol=POLS.find(p=>p.id===nf.id);
        const hm=applyHazards(nf,side,pol);
        const abil=ABILITIES[nf.ability];const itm=ITEMS[nf.heldItem];
        const abilMsg=abil&&abil.switchBoost&&(abil.switchBoost.weathers||[]).includes(b.weather)?`${nf.name}'s ${abil.name}!`:null;
        const itmMsg=itm&&itm.setWeatherEntry?(b.weather=itm.setWeatherEntry,b.weatherTurns=8,`${itm.name} set ${WEATHER[itm.setWeatherEntry].name}!`):null;
        ns.to(data.code).emit('battle:switched',{side:isHost?'host':'guest',index:data.index,name:nf.name,hazardLog:[...hm,abilMsg,itmMsg].filter(Boolean),hp:nf.currentHp,maxHp:nf.stats.hp});
      }
    });
    socket.on('battle:useSurge',(data)=>{
      const room=BR.getRoom(data.code);if(!room||!room.battle)return;
      const b=room.battle,isHost=room.players.host.socketId===socket.id;
      const team=isHost?b.hostTeam:b.guestTeam,active=isHost?b.hostActive:b.guestActive;
      const f=team[active];const item=ITEMS[f.heldItem];
      if(!item||!item.surgeItem||f._surgeUsed)return;
      f._surgeUsed=true;f.surgeMode=true;f.surgeTurnsLeft=3;
      for(const s of['atk','def','spa','spd','spe'])f.stages[s]=Math.min(6,(f.stages[s]||0)+1);
      item.surgeUsed=true;
      ns.to(data.code).emit('battle:surgeActivated',{side:isHost?'host':'guest',name:f.name});
    });
    socket.on('battle:validate',(data,cb)=>{const room=BR.getRoom(data.code);if(!room)return cb({error:'Room not found'});if(room.state!=='waiting')return cb({error:'Game started'});if(room.players.guest)return cb({error:'Room full'});cb({valid:true,hostName:room.players.host.name});});
    socket.on('disconnect',()=>{});
  });
};

function sf(f){return{name:f.name,emoji:f.emoji,types:f.types,id:f.id,currentHp:f.currentHp,stats:f.stats,moves:f.moves.map(m=>({name:m.name,type:m.type,category:m.category,power:m.power,accuracy:m.accuracy,pp:m.pp,maxPp:m.maxPp,description:m.description})),status:f.status,stages:f.stages,ability:f.ability,heldItem:f.heldItem,lucky:f.lucky,shadow:f.shadow,purified:f.purified,surgeMode:f.surgeMode,surgeTurnsLeft:f.surgeTurnsLeft,pvpShields:f.pvpShields,critStage:f.critStage,_isRaidBoss:f._isRaidBoss||false};}
function gf(f){return{name:f.name,emoji:f.emoji,types:f.types,currentHp:f.currentHp,stats:{hp:f.stats.hp},status:f.status,id:f.id,pvpShields:f.pvpShields,shadow:f.shadow,lucky:f.lucky,_isRaidBoss:f._isRaidBoss||false};}
