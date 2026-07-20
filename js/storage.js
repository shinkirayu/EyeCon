/* =====================================================
   EyeCon — Player profile persistence (localStorage)
   Exposes window.EC_STORE
===================================================== */
(function(){
  const KEY = 'eyecon_profile_v1';
  const GACHA_COST = 50;
  const GACHA_COST_X10 = 450; // 10% cheaper than 10 singles
  // Hard-pity safety nets: guarantees a floor on how unlucky a streak can
  // get, on top of the base weighted odds (epic=12%, legendary=3%).
  const PITY_EPIC_AT = 10;       // an Epic-or-better is guaranteed by the 10th pull without one
  const PITY_LEGENDARY_AT = 40;  // a Legendary is guaranteed by the 40th pull without one

  const BADGES = [
    { id:'first_job',    emoji:'🎓', name:'First Day',        cond:p => p.history.length >= 1 },
    { id:'perfectionist',emoji:'💎', name:'Perfectionist',    cond:p => p.history.some(h => h.grade === 'S+') },
    { id:'five_jobs',    emoji:'📁', name:'Five Projects',    cond:p => p.history.length >= 5 },
    { id:'all_novice',   emoji:'🌱', name:'Novice Cleared',   cond:p => window.EC_LEVELS.filter(l=>l.tier==='novice').every(l=>p.completed.includes(l.id)) },
    { id:'contrast_king',emoji:'◐',  name:'Contrast Champion',cond:p => p.history.filter(h=>h.scores && h.scores.contrast>=95).length >= 3 },
    { id:'no_mistakes',  emoji:'✨', name:'Flawless Run',     cond:p => p.history.some(h => h.score >= 98) },
    { id:'graduate',     emoji:'🏆', name:'Studio Graduate',  cond:p => p.completed.length >= window.EC_LEVELS.length },
    { id:'collector',    emoji:'🎨', name:'Collector',        cond:p => p.inventory.length >= 10 },
    { id:'legendary_pull',emoji:'🌟',name:'Legendary Find',   cond:p => p.inventory.some(id => { const it=window.EC_COSMETICS.getItem(id); return it && it.rarity==='legendary'; }) },
  ];

  function xpForLevel(level){
    // XP required to go from `level` to `level+1`
    return 100 + (level-1) * 60;
  }

  function levelFromTotalXp(totalXp){
    let level = 1, remaining = totalXp;
    while(remaining >= xpForLevel(level)){
      remaining -= xpForLevel(level);
      level++;
    }
    return { level, xpIntoLevel: remaining, xpForNext: xpForLevel(level) };
  }

  function defaultProfile(){
    const startingItems = Object.values(window.EC_COSMETICS.CATEGORY_DEFAULT);
    return {
      totalXp: 0,
      currency: 100, // small starter balance so the shop isn't empty on day one
      completed: [],       // level ids completed
      history: [],         // {levelId, name, date, score, grade, scores:{...}}
      unlockedBadges: [],
      inventory: startingItems.slice(),          // owned cosmetic item ids
      equipped: Object.assign({ decor: [], poster: [] }, window.EC_COSMETICS.CATEGORY_DEFAULT),
      pity: { sinceEpic: 0, sinceLegendary: 0 },
      settings: defaultSettings(),
    };
  }

  // Settings only (no progress/currency/inventory) — used both to seed a
  // fresh profile and to back the Settings screen's "Reset to Default" button.
  function defaultSettings(){
    return {
      theme: 'default',   // 'default' | 'hc'
      cvd: 'none',         // none|protanopia|deuteranopia|tritanopia
      uiScale: 1,
      reduceMotion:false,
      timedMode:false,
      soundEnabled:true,
      soundVolume:0.6,
      particles:'full',    // off|reduced|full
    };
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return defaultProfile();
      const parsed = JSON.parse(raw);
      const base = defaultProfile();
      const merged = Object.assign({}, base, parsed, {
        settings: Object.assign({}, base.settings, parsed.settings||{}),
        equipped: Object.assign({}, base.equipped, parsed.equipped||{}),
        pity: Object.assign({}, base.pity, parsed.pity||{}),
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : base.inventory,
      });
      return merged;
    }catch(e){
      console.warn('EyeCon: could not read save data, starting fresh.', e);
      return defaultProfile();
    }
  }

  function save(profile){
    try{ localStorage.setItem(KEY, JSON.stringify(profile)); }
    catch(e){ console.warn('EyeCon: could not persist save data.', e); }
  }

  // ---------------- Level-completion currency reward ----------------
  // Scales with: level difficulty (levelNumber), performance/accuracy
  // (grading score), mastery (grade bonus — rewards aiming for S+, not just
  // passing), and completion time (rewards a brisk, confident pass without
  // punishing careful work too harshly).
  const GRADE_BONUS = { 'S+':1.5, 'S':1.3, 'A':1.15, 'B':1.0, 'C':0.85, 'Needs Improvement':0.6 };

  function computeLevelReward(level, result, elapsedMs){
    const levelNumber = level.levelNumber || 1;
    const base = 20 + levelNumber * 15; // 35 (Lv1) .. 140 (Lv8)
    const scoreMult = Math.max(0.15, result.score / 100);
    const gradeBonus = GRADE_BONUS[result.grade] || 0.6;
    const elapsedSec = Math.max(1, Math.round((elapsedMs || 0) / 1000));
    const par = 60 + levelNumber * 30; // generous "good pace" benchmark, scales with difficulty
    let timeMult;
    if(elapsedSec <= par) timeMult = 1.25;
    else if(elapsedSec <= par * 2) timeMult = 1.0;
    else timeMult = 0.85;
    const reward = Math.max(10, Math.round(base * scoreMult * gradeBonus * timeMult));
    return { reward, breakdown: { base, scoreMult, gradeBonus, timeMult, elapsedSec, par } };
  }

  function recordSubmission(profile, level, result, elapsedMs){
    const entry = {
      levelId: level.id, name: level.clientName, date: new Date().toISOString(),
      score: result.score, grade: result.grade, scores: result.categoryScores
    };
    profile.history.unshift(entry);
    if(!profile.completed.includes(level.id)) profile.completed.push(level.id);
    profile.totalXp += result.xpAwarded;

    const { reward, breakdown } = computeLevelReward(level, result, elapsedMs);
    profile.currency += reward;

    const before = new Set(profile.unlockedBadges);
    BADGES.forEach(b => { if(!before.has(b.id) && b.cond(profile)) profile.unlockedBadges.push(b.id); });
    const newBadges = profile.unlockedBadges.filter(id => !before.has(id));

    save(profile);
    return { newBadges, currencyEarned: reward, rewardBreakdown: breakdown };
  }

  function xpAwardForGrade(grade){
    return { 'S+':160, 'S':130, 'A':100, 'B':70, 'C':45, 'Needs Improvement':20 }[grade] || 20;
  }

  // ---------------- Gacha ----------------
  function rollRarity(){
    const weights = window.EC_COSMETICS.RARITY_WEIGHTS;
    const total = Object.values(weights).reduce((s,w)=>s+w, 0);
    let roll = Math.random() * total;
    for(const key of Object.keys(weights)){
      if(roll < weights[key]) return key;
      roll -= weights[key];
    }
    return 'common';
  }

  // Pity-aware roll: applies the base weighted roll, then overrides it with
  // a forced floor once a dry streak hits the pity threshold. Mutates
  // profile.pity counters in place; caller is responsible for saving.
  function rollRarityWithPity(profile){
    const pity = profile.pity || (profile.pity = { sinceEpic:0, sinceLegendary:0 });
    let rarity = rollRarity();
    let pityTriggered = false;
    if(pity.sinceLegendary >= PITY_LEGENDARY_AT - 1){
      rarity = 'legendary'; pityTriggered = true;
    } else if(pity.sinceEpic >= PITY_EPIC_AT - 1 && rarity !== 'legendary'){
      rarity = 'epic'; pityTriggered = true;
    }
    if(rarity === 'legendary'){ pity.sinceLegendary = 0; pity.sinceEpic = 0; }
    else if(rarity === 'epic'){ pity.sinceEpic = 0; pity.sinceLegendary++; }
    else { pity.sinceEpic++; pity.sinceLegendary++; }
    return { rarity, pityTriggered };
  }

  function getPityInfo(profile){
    const pity = profile.pity || { sinceEpic:0, sinceLegendary:0 };
    return {
      sinceEpic: pity.sinceEpic, epicPityAt: PITY_EPIC_AT,
      sinceLegendary: pity.sinceLegendary, legendaryPityAt: PITY_LEGENDARY_AT,
    };
  }

  function rollOne(profile){
    const { rarity, pityTriggered } = rollRarityWithPity(profile);
    const pool = window.EC_COSMETICS.ITEMS.filter(i=>i.rarity===rarity);
    const item = pool[Math.floor(Math.random()*pool.length)];
    const owned = profile.inventory.includes(item.id);
    let refund = 0;
    if(owned){
      refund = window.EC_COSMETICS.DUPLICATE_REFUND[rarity] || 0;
      profile.currency += refund;
    } else {
      profile.inventory.push(item.id);
    }
    return { item, rarity, owned, refund, pityTriggered };
  }

  // Spends currency and grants one cosmetic item (or a currency refund if
  // the roll duplicates something already owned). Returns null if the
  // player can't afford it; caller is expected to check cost beforehand too.
  function pullGacha(profile){
    if(profile.currency < GACHA_COST) return null;
    profile.currency -= GACHA_COST;
    const result = rollOne(profile);
    save(profile);
    return result;
  }

  function pullGachaX10(profile){
    if(profile.currency < GACHA_COST_X10) return null;
    profile.currency -= GACHA_COST_X10;
    const results = [];
    for(let i=0;i<10;i++) results.push(rollOne(profile));
    save(profile);
    return results;
  }

  // Categories where several items can be worn at once, each with its own
  // slot cap — decor (desk stickers) and poster (wall art).
  const MULTI_SLOT_CATEGORIES = { decor: 3, poster: 2 };

  function equipItem(profile, item){
    const slotCap = MULTI_SLOT_CATEGORIES[item.category];
    if(slotCap){
      const list = profile.equipped[item.category] || (profile.equipped[item.category] = []);
      const idx = list.indexOf(item.id);
      if(idx >= 0){ list.splice(idx,1); }
      else {
        if(list.length >= slotCap) return false; // slots full
        list.push(item.id);
      }
    } else {
      profile.equipped[item.category] = item.id;
    }
    save(profile);
    return true;
  }

  window.EC_STORE = {
    load, save, defaultProfile, defaultSettings, levelFromTotalXp, xpForLevel, recordSubmission, xpAwardForGrade, BADGES,
    computeLevelReward, pullGacha, pullGachaX10, equipItem, getPityInfo, MULTI_SLOT_CATEGORIES,
    GACHA_COST, GACHA_COST_X10, PITY_EPIC_AT, PITY_LEGENDARY_AT,
  };
})();
