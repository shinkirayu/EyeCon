/* =====================================================
   EyeCon — Player profile persistence (localStorage)
   Exposes window.EC_STORE
===================================================== */
(function(){
  const KEY = 'eyecon_profile_v1';
  const UPGRADES = [
    { id:'grid-buddy', icon:'🧲', name:'Grid Buddy', price:110, description:'Starts every mission with the grid and snap switched on.' },
    { id:'guide-radar', icon:'📐', name:'Guide Radar', price:150, description:'Starts missions with alignment guides and the issue scanner on.' },
    { id:'studio-notes', icon:'🗒️', name:'Studio Notes', price:90, description:'Shows exact mission targets beside your canvas.' },
  ];

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
      upgrades: [],                              // permanent, non-random editing assists
      daily: { date:'', streak:0 },
      onboarding: { seen:false },                 // first-day guide / intro email
      equipped: Object.assign({ decor: [], poster: [] }, window.EC_COSMETICS.CATEGORY_DEFAULT),
      shopCart: { date:'', ids:[] },
      purchases: [],
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
      musicEnabled:true,
      musicVolume:0.28,
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
        upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades : base.upgrades,
        daily: Object.assign({}, base.daily, parsed.daily||{}),
        onboarding: Object.assign({}, base.onboarding, parsed.onboarding||{}),
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
    const objectives = (result.mission && result.mission.objectives) || [];
    const complete = objectives.filter(o=>o.complete).length;
    const mastered = objectives.filter(o=>o.mastered).length;
    const base = 20 + levelNumber * 10;
    const objectiveBonus = complete * 12;
    const masteryBonus = mastered * 10;
    const gradeBonus = Math.round(12 * ((GRADE_BONUS[result.grade] || 0.6) - 0.6));
    const reward = Math.max(10, base + objectiveBonus + masteryBonus + gradeBonus);
    return { reward, breakdown: { base, objectiveBonus, masteryBonus, gradeBonus, elapsedMs } };
  }

  function localDayKey(date){
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function previousDayKey(date){
    const prior = new Date(date);
    prior.setDate(prior.getDate()-1);
    return localDayKey(prior);
  }

  function claimDailyMissionBonus(profile){
    const today = localDayKey(new Date());
    const daily = profile.daily || (profile.daily = { date:'', streak:0 });
    if(daily.date === today) return { bonus:0, streak:daily.streak, claimed:false };
    daily.streak = daily.date === previousDayKey(new Date()) ? daily.streak + 1 : 1;
    daily.date = today;
    return { bonus:20 + Math.min(daily.streak, 7) * 5, streak:daily.streak, claimed:true };
  }

  // Below this star rating the client sends the work back instead of
  // accepting it — the mission stays open in the inbox for a resubmit.
  const REVISION_STAR_THRESHOLD = 3;

  function recordSubmission(profile, level, result, elapsedMs){
    const stars = result.stars || window.EC_GRADING.scoreToStars(result.score);
    const entry = {
      levelId: level.id, name: level.clientName, date: new Date().toISOString(),
      score: result.score, grade: result.grade, scores: result.categoryScores, stars
    };
    profile.history.unshift(entry);
    const missionComplete = stars >= REVISION_STAR_THRESHOLD && (!result.mission || result.mission.complete);
    const needsRevision = !missionComplete;
    const firstClear = missionComplete && !profile.completed.includes(level.id);
    if(firstClear) profile.completed.push(level.id);
    if(missionComplete) profile.totalXp += result.xpAwarded;

    const { reward: baseReward, breakdown } = computeLevelReward(level, result, elapsedMs);
    const firstClearBonus = firstClear ? 25 : 0;
    // Ratings above the revision threshold pay extra, scaling with how many
    // stars you cleared it by — good work should pay noticeably more.
    const starBonus = missionComplete ? Math.max(0, stars - REVISION_STAR_THRESHOLD) * 15 : 0;
    const daily = missionComplete ? claimDailyMissionBonus(profile) : { bonus:0, streak:(profile.daily||{}).streak||0, claimed:false };
    const reward = missionComplete ? baseReward + firstClearBonus + starBonus + daily.bonus : 0;
    profile.currency += reward;

    const before = new Set(profile.unlockedBadges);
    BADGES.forEach(b => { if(!before.has(b.id) && b.cond(profile)) profile.unlockedBadges.push(b.id); });
    const newBadges = profile.unlockedBadges.filter(id => !before.has(id));

    save(profile);
    return { newBadges, currencyEarned: reward, stars, needsRevision, missionComplete,
      rewardBreakdown: Object.assign(breakdown, { firstClearBonus, starBonus, dailyBonus:daily.bonus }), daily };
  }

  function xpAwardForGrade(grade){
    return { 'S+':160, 'S':130, 'A':100, 'B':70, 'C':45, 'Needs Improvement':20 }[grade] || 20;
  }

  // A personal inbox: one new commission per UTC day; unfinished jobs stay.
  function commissionInbox(profile, date = new Date()){
    const day=Math.floor(date.getTime()/86400000);
    if(!profile.commissions){
      const known=window.EC_LEVELS.filter(l=>profile.completed.includes(l.id) || profile.history.some(h=>h.levelId===l.id));
      const initial=Math.min(window.EC_LEVELS.length, Math.max(1,...known.map(l=>l.levelNumber+1)));
      profile.commissions={startDay:day,initial}; save(profile);
    }
    const count=Math.min(window.EC_LEVELS.length,profile.commissions.initial+Math.max(0,day-profile.commissions.startDay));
    // Only one open commission shows at a time — the next one doesn't pop up
    // until the current one is completed, even if the day-based drip has
    // already unlocked several.
    const open=window.EC_LEVELS.slice(0,count).filter(l=>!profile.completed.includes(l.id));
    return open.slice(0,1);
  }

  // One deterministic selection per UTC day, independent of device or reload.
  const ITEM_PRICES = { common:35, rare:75, epic:140, legendary:240 };
  function dailyShop(date = new Date()){
    const key = date.toISOString().slice(0,10);
    const day = Math.floor(Date.parse(key+'T00:00:00Z')/86400000);
    const defaults = Object.values(window.EC_COSMETICS.CATEGORY_DEFAULT);
    const C=window.EC_COSMETICS;
    const groups=C.CATEGORY_ORDER.map(category=>C.ITEMS.filter(i=>i.category===category && !defaults.includes(i.id)));
    const catalog=[];
    for(let round=0;round<Math.max(...groups.map(g=>g.length));round++){
      groups.forEach(group=>{ if(group[round]) catalog.push(group[round]); });
    }
    const items = Array.from({length:Math.min(5,catalog.length)}, (_,i)=>catalog[(day*5+i)%catalog.length]);
    return { date:key, items, refreshAt:(day+1)*86400000 };
  }
  function itemPrice(item){ return ITEM_PRICES[item.rarity]; }
  function getCart(profile, date = new Date()){
    const shop = dailyShop(date);
    const cart = profile.shopCart;
    const ids = cart && cart.date === shop.date && Array.isArray(cart.ids) ? cart.ids : [];
    profile.shopCart = { date:shop.date, ids:[...new Set(ids)].filter(id=>shop.items.some(i=>i.id===id) && !profile.inventory.includes(id)) };
    return profile.shopCart;
  }
  function toggleCart(profile, id){
    const cart = getCart(profile);
    if(!dailyShop().items.some(i=>i.id===id) || profile.inventory.includes(id)) return false;
    cart.ids = cart.ids.includes(id) ? cart.ids.filter(v=>v!==id) : [...cart.ids,id];
    save(profile); return true;
  }
  function checkout(profile, expectedDate){
    const shop = dailyShop();
    if(expectedDate !== shop.date){ getCart(profile); save(profile); return {error:'The daily selection refreshed. Choose from the new daily specials.'}; }
    const cart = getCart(profile);
    if(!cart.ids.length) return {error:'Your cart is empty.'};
    const items = cart.ids.map(id=>window.EC_COSMETICS.getItem(id));
    const total = items.reduce((sum,item)=>sum+itemPrice(item),0);
    if(profile.currency < total) return {error:'Not enough Sparks. Complete a client project to earn more.'};
    profile.currency -= total;
    profile.inventory.push(...items.map(i=>i.id));
    const order = { date:new Date().toISOString(), ids:items.map(i=>i.id), total };
    profile.purchases = [...(Array.isArray(profile.purchases) ? profile.purchases : []),order];
    profile.shopCart = {date:shop.date,ids:[]};
    save(profile);
    return {items,total};
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

  function hasUpgrade(profile, id){
    return (profile.upgrades || []).includes(id);
  }

  function buyUpgrade(profile, id){
    const upgrade = UPGRADES.find(u=>u.id===id);
    if(!upgrade || hasUpgrade(profile, id) || profile.currency < upgrade.price) return null;
    profile.currency -= upgrade.price;
    profile.upgrades.push(id);
    save(profile);
    return upgrade;
  }

  window.EC_STORE = {
    load, save, defaultProfile, defaultSettings, levelFromTotalXp, xpForLevel, recordSubmission, xpAwardForGrade, BADGES,
    computeLevelReward, commissionInbox, dailyShop, itemPrice, getCart, toggleCart, checkout, equipItem, hasUpgrade, buyUpgrade, UPGRADES, MULTI_SLOT_CATEGORIES,
    REVISION_STAR_THRESHOLD,
  };
})();
