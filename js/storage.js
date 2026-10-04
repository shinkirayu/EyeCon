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
      designs: {},                               // levelId -> last approved design (for the Browser app)
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
    const today = 'workday-' + workday(profile).day;
    const daily = profile.daily || (profile.daily = { date:'', streak:0 });
    if(daily.date === today) return { bonus:0, streak:daily.streak, claimed:false };
    daily.streak = daily.date === 'workday-' + (workday(profile).day-1) ? daily.streak + 1 : 1;
    daily.date = today;
    return { bonus:20 + Math.min(daily.streak, 7) * 5, streak:daily.streak, claimed:true };
  }

  // Below this star rating the client sends the work back instead of
  // accepting it — the mission stays open in the inbox for a resubmit.
  const REVISION_STAR_THRESHOLD = 3;
  const GOOD_STARS = 4;
  function completedFeedback(profile){
    return (profile.history || []).filter(entry=>entry.missionComplete === true || (entry.missionComplete == null && profile.completed.includes(entry.levelId)));
  }
  // Best approved rating per page, so redoing a page can raise it but never
  // counts twice.
  function bestStars(profile){
    const best = {};
    completedFeedback(profile).forEach(e=>{ best[e.levelId] = Math.max(best[e.levelId] || 0, e.stars || 0); });
    return best;
  }
  function goodFeedbackCount(profile){
    return Object.values(bestStars(profile)).filter(stars=>stars >= GOOD_STARS).length;
  }
  function projectOf(level){ return (window.EC_PROJECTS || []).find(p=>p.id===level.project) || { needsGood:0, pay:40 }; }
  function projectUnlocked(profile, project){ return goodFeedbackCount(profile) >= project.needsGood; }
  // Three submissions per workday, including revisions.
  function dailyTaskLimit(){ return 3; }
  function workday(profile){
    if(!profile.workday) profile.workday={day:1,submissions:0,reviews:[],coins:0,xp:0};
    return profile.workday;
  }
  function beginWorkSubmission(profile){
    const day=workday(profile);
    if(day.submissions>=3 || profile.pendingClientReply || profile.readyReply)return false;
    day.submissions++;save(profile);return true;
  }
  function nextWorkday(profile){
    const day=workday(profile);
    if(day.submissions<3 || profile.pendingClientReply || profile.readyReply)return false;
    profile.workday={day:day.day+1,submissions:0,reviews:[],coins:0,xp:0};
    save(profile);return true;
  }
  // Redoing an already-approved page (to earn a better review) pays half.
  function commissionPay(profile, level){
    const pay = projectOf(level).pay;
    const base = profile.completed.includes(level.id) ? Math.round(pay/2) : pay;
    return { base, perBonusStar: Math.round(base/4) };
  }
  function commissionPrize(profile, level){ return commissionPay(profile, level).base; }

  function recordSubmission(profile, level, result, elapsedMs){
    const stars = result.stars || window.EC_GRADING.scoreToStars(result.score);
    const missionComplete = stars >= REVISION_STAR_THRESHOLD && (!result.mission || result.mission.complete);
    const pay = commissionPay(profile, level);
    const templates = level.replyTemplates || {};
    const entry = {
      levelId: level.id, name: level.clientName, page: level.pageLabel, date: new Date().toISOString(),
      score: result.score, grade: result.grade, scores: result.categoryScores, stars, missionComplete,
      quote: missionComplete ? (stars >= 5 ? templates.great : templates.ok) : templates.bad,
    };
    profile.history.unshift(entry);
    const needsRevision = !missionComplete;
    const firstClear = missionComplete && !profile.completed.includes(level.id);
    if(firstClear) profile.completed.push(level.id);
    if(missionComplete) profile.totalXp += result.xpAwarded;

    // Exactly what the email promised: the base pay, plus a bonus per extra
    // star, plus the once-a-day streak bonus.
    const starBonus = missionComplete ? Math.max(0, stars - REVISION_STAR_THRESHOLD) * pay.perBonusStar : 0;
    const daily = missionComplete ? claimDailyMissionBonus(profile) : { bonus:0, streak:(profile.daily||{}).streak||0, claimed:false };
    const reward = missionComplete ? pay.base + starBonus + daily.bonus : 0;
    profile.currency += reward;
    const shift=workday(profile);
    entry.workDay=shift.day;
    entry.currencyEarned=reward;
    shift.coins+=reward;
    shift.xp+=missionComplete ? (result.xpAwarded || 0) : 0;
    shift.reviews.push({name:level.clientName,page:level.pageLabel,stars,approved:missionComplete,reward});

    const before = new Set(profile.unlockedBadges);
    BADGES.forEach(b => { if(!before.has(b.id) && b.cond(profile)) profile.unlockedBadges.push(b.id); });
    const newBadges = profile.unlockedBadges.filter(id => !before.has(id));

    save(profile);
    return { newBadges, currencyEarned: reward, stars, needsRevision, missionComplete,
      rewardBreakdown: { base: missionComplete ? pay.base : 0, starBonus, dailyBonus:daily.bonus, elapsedMs }, daily };
  }

  function xpAwardForGrade(grade){
    return { 'S+':160, 'S':130, 'A':100, 'B':70, 'C':45, 'Needs Improvement':20 }[grade] || 20;
  }

  // Emails come from a mix of clients in the order pages are listed. A page
  // is open once its client has written in (enough 4★+ reviews) and that
  // client's previous page is done; the inbox shows the first two, so there
  // are one or two emails at a time. A day holds three submissions. If no
  // new work is left while a client is still out of reach, earlier pages
  // rated below 4★ come back as polish requests to raise those reviews.
  const OPEN_EMAILS = 7;
  function dayKey(date){ return date.toISOString().slice(0,10); }
  function tasksDoneToday(profile, date = new Date()){
    return workday(profile).submissions;
  }
  function nextLockedProject(profile){
    return (window.EC_PROJECTS || []).find(p=>!projectUnlocked(profile, p));
  }
  // ponytail: every unfinished email open at once, no day limit, for testing; set false to restore the normal flow.
  const ALL_EMAILS_OPEN = true;
  function commissionInbox(profile, date = new Date()){
    if(ALL_EMAILS_OPEN) return window.EC_LEVELS.filter(l => !profile.completed.includes(l.id));
    const remaining = Math.max(0, dailyTaskLimit(profile) - tasksDoneToday(profile, date));
    const levels = window.EC_LEVELS;
    const done = id => profile.completed.includes(id);
    let tasks = levels.filter(level => {
      if(done(level.id) || !projectUnlocked(profile, projectOf(level))) return false;
      const earlier = levels.filter(l => l.project === level.project);
      return earlier.slice(0, earlier.indexOf(level)).every(l => done(l.id));
    }).slice(0, OPEN_EMAILS);
    if(!tasks.length && nextLockedProject(profile)){
      const best = bestStars(profile);
      tasks = levels.filter(l => done(l.id) && (best[l.id] || 0) < GOOD_STARS);
    }
    // Every open email shows; the day still allows only three submissions.
    return remaining ? tasks : [];
  }
  function isPolishTask(profile, level){ return profile.completed.includes(level.id); }

  // What the player needs for the next client, for the inbox and profile.
  function progression(profile, date = new Date()){
    const good = goodFeedbackCount(profile);
    const next = nextLockedProject(profile);
    return {
      good, doneToday: tasksDoneToday(profile, date), dailyLimit: dailyTaskLimit(profile),
      nextProject: next || null, goodNeeded: next ? Math.max(0, next.needsGood - good) : 0,
    };
  }

  // One deterministic selection per UTC day, independent of device or reload.
  const ITEM_PRICES = { common:35, rare:75, epic:140, legendary:240 };
  function dailyShop(date = new Date()){
    const key = date.toISOString().slice(0,10);
    const day = Math.floor(Date.parse(key+'T00:00:00Z')/86400000);
    const defaults = Object.values(window.EC_COSMETICS.CATEGORY_DEFAULT);
    const C=window.EC_COSMETICS;
    const always=C.ITEMS.filter(i=>i.alwaysInShop && !defaults.includes(i.id));
    const groups=C.CATEGORY_ORDER.map(category=>C.ITEMS.filter(i=>i.category===category && !defaults.includes(i.id) && !i.alwaysInShop));
    const catalog=[];
    for(let round=0;round<Math.max(...groups.map(g=>g.length));round++){
      groups.forEach(group=>{ if(group[round]) catalog.push(group[round]); });
    }
    const rotating = Array.from({length:Math.min(5-always.length,catalog.length)}, (_,i)=>catalog[(day*5+i)%catalog.length]);
    const items = [...always, ...rotating];
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
    if(profile.currency < total) return {error:'Not enough coins. Complete a client project to earn more.'};
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
    workday, beginWorkSubmission, nextWorkday,
    load, save, defaultProfile, defaultSettings, levelFromTotalXp, xpForLevel, recordSubmission, xpAwardForGrade, BADGES,
    commissionInbox, commissionPrize, commissionPay, completedFeedback, goodFeedbackCount, bestStars, dailyTaskLimit, progression, isPolishTask, projectUnlocked, GOOD_STARS, dailyShop, itemPrice, getCart, toggleCart, checkout, equipItem, hasUpgrade, buyUpgrade, UPGRADES, MULTI_SLOT_CATEGORIES,
    REVISION_STAR_THRESHOLD,
  };
})();
