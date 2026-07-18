/* =====================================================
   EyeCon — App shell: desktop, navigation, mail, stats, settings, report
===================================================== */
(function(){

  let profile = window.EC_STORE.load();
  let currentFolder = 'inbox';
  let lastReportLevel = null, lastReportResult = null;
  let timerInterval = null;
  let levelStartTime = null;
  let shopTab = 'gacha';
  let wardrobeCategory = 'wallpaper';
  let currentParticleSetting = profile.settings.particles || 'full';

  // ---- Settings screen draft state (Apply/Cancel pattern) ----
  let settingsDraft = Object.assign({}, profile.settings);
  let settingsDirty = false;
  let settingsTab = 'general';
  let settingsQuery = '';

  function announce(text){
    document.getElementById('a11y-announcer').textContent = text;
  }

  function showScreen(name){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    document.getElementById('global-taskbar').classList.toggle('desktop-hidden', name === 'screen-home');
    announce(name.replace('screen-','').replace('-',' ') + ' screen');
  }

  // ---------------- Settings application ----------------
  // Applies an arbitrary settings object live to the document — used both
  // for the persisted profile.settings and for the Settings screen's draft
  // state, so toggling a control gives instant feedback before Apply commits it.
  function applySettingsObj(s){
    document.documentElement.setAttribute('data-theme', s.theme === 'hc' ? 'hc' : 'light');
    if(s.cvd && s.cvd !== 'none') document.documentElement.setAttribute('data-cvd', s.cvd);
    else document.documentElement.removeAttribute('data-cvd');
    document.documentElement.style.setProperty('--ui-scale', s.uiScale || 1);
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    window.EC_SOUND.setEnabled(!!s.soundEnabled);
    window.EC_SOUND.setVolume(s.soundVolume != null ? s.soundVolume : 0.6);
    currentParticleSetting = s.particles || 'full';
    applyCosmetics();
  }
  function applySettings(){ applySettingsObj(profile.settings); }

  // ---------------- Settings schema (drives both tab rendering & search) ----------------
  function getSettingsSchema(){
    return [
      { tab:'audio', id:'soundEnabled', label:'Sound Effects', desc:'Pulls, reveals, toggles and clicks play a soft chime.',
        tip:'Turns all UI sound effects on or off. Synthesized in the browser — no audio files.', type:'toggle' },
      { tab:'audio', id:'soundVolume', label:'SFX Volume', desc:'How loud sound effects play.',
        tip:'Only matters while Sound Effects is on.', type:'slider', min:0, max:1, step:0.05, format:v=>Math.round(v*100)+'%' },

      { tab:'graphics', id:'particles', label:'Particle Effects', desc:'Sparkle / confetti density from your equipped UI Skin.',
        tip:'Off disables particle effects entirely. Reduced shows fewer particles — handy on slower machines.', type:'seg',
        options:[['off','Off'],['reduced','Reduced'],['full','Full']] },

      { tab:'accessibility', id:'theme', label:'High Contrast Mode', desc:'Maximizes contrast across every screen.',
        tip:'Swaps the palette for a WCAG AAA-contrast black-and-white theme.', type:'toggle', on:'hc', off:'default' },
      { tab:'accessibility', id:'cvd', label:'Colorblind-Friendly Palette', desc:'Remaps the reds/greens used for pass/fail states.',
        tip:'Adjusts feedback colors (correct / incorrect, tags) for common color-vision differences.', type:'select',
        options:[['none','Default'],['protanopia','Protanopia'],['deuteranopia','Deuteranopia'],['tritanopia','Tritanopia']] },
      { tab:'accessibility', id:'reduceMotion', label:'Reduce Motion', desc:'Turns off animations, transitions and drifting particles.',
        tip:'For motion sensitivity — disables screen transitions, pop-ins and background effects app-wide.', type:'toggle' },
      { tab:'accessibility', id:'uiScale', label:'UI Scale', desc:'Scales text and UI elements across the app.',
        tip:'Bigger values make everything larger and easier to read.', type:'slider', min:0.85, max:1.3, step:0.05, format:v=>Math.round(v*100)+'%' },

      { tab:'gameplay', id:'timedMode', label:'Timed Challenge Mode', desc:'Adds a 5-minute countdown to each client project.',
        tip:'When time runs out, your current design is auto-submitted as-is.', type:'toggle' },
    ];
  }

  const SETTINGS_TABS = [
    { id:'general', icon:'🏠', label:'General' },
    { id:'audio', icon:'🔊', label:'Audio' },
    { id:'graphics', icon:'🎨', label:'Graphics' },
    { id:'accessibility', icon:'♿', label:'Accessibility' },
    { id:'gameplay', icon:'🎮', label:'Gameplay' },
  ];

  function settingRowControlHtml(def, value){
    const tip = def.tip ? `<span class="info-tip" tabindex="0" data-tip="${def.tip.replace(/"/g,'&quot;')}">i</span>` : '';
    let control = '';
    if(def.type === 'toggle'){
      const checked = def.on ? (value === def.on) : !!value;
      control = `<label class="toggle-switch"><input type="checkbox" data-setting-id="${def.id}" data-type="toggle" ${checked?'checked':''}/><span class="track"><span class="thumb"></span></span></label>`;
    } else if(def.type === 'slider'){
      control = `<span class="slider-readout" id="readout-${def.id}">${def.format(value)}</span>
        <input class="ec-slider" type="range" data-setting-id="${def.id}" data-type="slider" min="${def.min}" max="${def.max}" step="${def.step}" value="${value}"/>`;
    } else if(def.type === 'seg'){
      control = `<div class="seg-control" data-setting-id="${def.id}" data-type="seg">${def.options.map(([v,l])=>
        `<button type="button" class="seg-btn ${value===v?'active':''}" data-value="${v}">${l}</button>`).join('')}</div>`;
    } else if(def.type === 'select'){
      control = `<div class="select-wrap"><select class="settings-select" data-setting-id="${def.id}" data-type="select">
        ${def.options.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}
      </select></div>`;
    }
    return { tip, control };
  }

  function renderSettingRow(def, value, opts){
    opts = opts || {};
    const { tip, control } = settingRowControlHtml(def, value);
    const tabTag = opts.showTabTag ? `<span class="settings-search-result-tag" data-jump-tab="${def.tab}">${SETTINGS_TABS.find(t=>t.id===def.tab).label}</span>` : '';
    return `<div class="settings-item" data-row-for="${def.id}">
      <div class="settings-item-text">
        <div class="settings-item-label">${def.label}${tip}${tabTag}</div>
        ${def.desc?`<div class="settings-item-desc">${def.desc}</div>`:''}
      </div>
      <div class="settings-item-control">${control}</div>
    </div>`;
  }

  function renderSettingsTabBody(tabId){
    const schema = getSettingsSchema().filter(d=>d.tab===tabId);
    let html = '';
    if(tabId === 'general'){
      html += `<p class="settings-tab-desc">Your EyeCon Studio profile — Level ${window.EC_STORE.levelFromTotalXp(profile.totalXp).level}, ${profile.completed.length}/${window.EC_LEVELS.length} projects completed, ${profile.inventory.length} cosmetics collected.</p>`;
      html += `<div class="settings-card settings-danger-card"><div class="settings-item">
        <div class="settings-item-text"><div class="settings-item-label">Reset All Progress</div>
        <div class="settings-item-desc">Erases XP, Sparks, inventory and completed levels. This cannot be undone.</div></div>
        <div class="settings-item-control"><button class="btn btn-no btn-sm" id="set-reset-progress">Reset</button></div>
      </div></div>`;
      return html;
    }
    html += `<div class="settings-card">${schema.map(def=>renderSettingRow(def, settingsDraft[def.id])).join('')}</div>`;
    return html;
  }

  function renderSettingsSearchResults(query){
    const q = query.trim().toLowerCase();
    const matches = getSettingsSchema().filter(d => d.label.toLowerCase().includes(q) || (d.desc||'').toLowerCase().includes(q));
    if(matches.length === 0) return `<div class="settings-no-results">No settings match "${query}".</div>`;
    return `<div class="settings-search-results">${matches.map(def=>renderSettingRow(def, settingsDraft[def.id], {showTabTag:true})).join('')}</div>`;
  }

  function renderSettingsPanel(){
    const panel = document.getElementById('settings-panel');
    settingsDraft = Object.assign({}, profile.settings);
    settingsDirty = false;

    panel.innerHTML = `<div class="settings-shell">
      <div class="settings-search-row">
        <div class="settings-search"><span class="icon-search">🔍</span>
          <input type="text" id="settings-search-input" placeholder="Search settings…" value="${settingsQuery}" aria-label="Search settings"/>
        </div>
      </div>
      <div class="settings-body">
        <nav class="settings-nav" id="settings-nav">
          ${SETTINGS_TABS.map(t=>`<button class="settings-nav-btn ${settingsTab===t.id?'active':''}" data-tab="${t.id}"><span class="settings-nav-icon">${t.icon}</span>${t.label}</button>`).join('')}
        </nav>
        <div class="settings-content" id="settings-content"></div>
      </div>
      <div class="settings-footer">
        <div class="footer-group"><span class="settings-dirty-note" id="settings-dirty-note">Unsaved changes</span></div>
        <div class="footer-group">
          <button class="btn btn-ghost btn-sm" id="set-reset-default">Reset to Default</button>
          <button class="btn btn-ghost btn-sm" id="set-cancel">Cancel</button>
          <button class="btn btn-apply btn-sm" id="set-apply" disabled>Apply</button>
        </div>
      </div>
    </div>`;

    function renderBody(){
      const content = document.getElementById('settings-content');
      if(settingsQuery.trim()){
        content.innerHTML = renderSettingsSearchResults(settingsQuery);
      } else {
        const meta = SETTINGS_TABS.find(t=>t.id===settingsTab);
        content.innerHTML = `<h3 class="settings-tab-title">${meta.icon} ${meta.label}</h3>` + renderSettingsTabBody(settingsTab);
      }
      wireContentControls();
    }

    function markDirty(){
      settingsDirty = true;
      document.getElementById('settings-dirty-note').classList.add('show');
      document.getElementById('set-apply').disabled = false;
    }

    function wireContentControls(){
      const content = document.getElementById('settings-content');
      content.querySelectorAll('[data-jump-tab]').forEach(tag=>{
        tag.addEventListener('click', ()=>{ settingsTab = tag.dataset.jumpTab; settingsQuery=''; document.getElementById('settings-search-input').value=''; refreshNavAndBody(); });
      });
      const resetBtn = document.getElementById('set-reset-progress');
      if(resetBtn) resetBtn.addEventListener('click', ()=>{
        if(window.confirm('Reset all EyeCon progress? This cannot be undone.')){
          profile = window.EC_STORE.defaultProfile();
          save(); applySettings(); refreshHeader(); renderSettingsPanel();
        }
      });
      content.querySelectorAll('[data-type="toggle"]').forEach(input=>{
        input.addEventListener('change', ()=>{
          const def = getSettingsSchema().find(d=>d.id===input.dataset.settingId);
          settingsDraft[def.id] = def.on ? (input.checked ? def.on : def.off) : input.checked;
          window.EC_SOUND.play('toggle');
          applySettingsObj(settingsDraft);
          markDirty();
        });
      });
      content.querySelectorAll('[data-type="slider"]').forEach(input=>{
        const def = getSettingsSchema().find(d=>d.id===input.dataset.settingId);
        input.addEventListener('input', ()=>{
          const v = Number(input.value);
          settingsDraft[def.id] = v;
          const readout = document.getElementById('readout-'+def.id);
          if(readout) readout.textContent = def.format(v);
          applySettingsObj(settingsDraft);
        });
        input.addEventListener('change', ()=>{ window.EC_SOUND.play('click'); markDirty(); });
      });
      content.querySelectorAll('[data-type="seg"]').forEach(group=>{
        const def = getSettingsSchema().find(d=>d.id===group.dataset.settingId);
        group.querySelectorAll('.seg-btn').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            settingsDraft[def.id] = btn.dataset.value;
            window.EC_SOUND.play('click');
            applySettingsObj(settingsDraft);
            markDirty();
            group.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b===btn));
          });
        });
      });
      content.querySelectorAll('[data-type="select"]').forEach(sel=>{
        sel.addEventListener('change', ()=>{
          const def = getSettingsSchema().find(d=>d.id===sel.dataset.settingId);
          settingsDraft[def.id] = sel.value;
          window.EC_SOUND.play('click');
          applySettingsObj(settingsDraft);
          markDirty();
        });
      });
    }

    function refreshNavAndBody(){
      document.querySelectorAll('.settings-nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===settingsTab));
      renderBody();
    }

    document.getElementById('settings-nav').querySelectorAll('.settings-nav-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        settingsTab = btn.dataset.tab;
        settingsQuery = ''; document.getElementById('settings-search-input').value = '';
        window.EC_SOUND.play('tabSwitch');
        refreshNavAndBody();
      });
    });
    document.getElementById('settings-search-input').addEventListener('input', e=>{
      settingsQuery = e.target.value;
      renderBody();
    });
    document.getElementById('set-cancel').addEventListener('click', ()=>{
      settingsDraft = Object.assign({}, profile.settings);
      settingsDirty = false;
      applySettings();
      document.getElementById('settings-dirty-note').classList.remove('show');
      document.getElementById('set-apply').disabled = true;
      renderBody();
    });
    document.getElementById('set-apply').addEventListener('click', ()=>{
      profile.settings = Object.assign({}, settingsDraft);
      save();
      applySettings();
      settingsDirty = false;
      document.getElementById('settings-dirty-note').classList.remove('show');
      document.getElementById('set-apply').disabled = true;
      window.EC_SOUND.play('coin');
    });
    document.getElementById('set-reset-default').addEventListener('click', ()=>{
      settingsDraft = window.EC_STORE.defaultSettings();
      applySettingsObj(settingsDraft);
      markDirty();
      renderBody();
    });

    renderBody();
  }

  // ---------------- Header / XP / Currency ----------------
  function refreshHeader(){
    const lv = window.EC_STORE.levelFromTotalXp(profile.totalXp);
    document.getElementById('hdr-level').textContent = lv.level;
    const unreadCount = window.EC_LEVELS.filter(l=>!profile.completed.includes(l.id)).length;
    document.getElementById('inbox-count').textContent = unreadCount;
    document.getElementById('desktop-inbox-badge').textContent = unreadCount;
    updateCurrencyDisplays();
  }

  function updateCurrencyDisplays(){
    const text = `✨ ${profile.currency}`;
    const taskbar = document.getElementById('taskbar-currency');
    if(taskbar) taskbar.textContent = text;
    const shopChip = document.getElementById('shop-currency-chip');
    if(shopChip) shopChip.textContent = text;
  }

  // ---------------- Mail folder switching (within the Mail app) ----------------
  function renderCurrentFolder(){
    document.querySelectorAll('.side-btn').forEach(b=>b.classList.toggle('active', b.dataset.folder===currentFolder));
    if(currentFolder === 'inbox') window.EC_MAIL.renderInbox(profile);
    else window.EC_MAIL.renderCompleted(profile);
  }

  function renderStatsPanel(){
    const panel = document.getElementById('stats-panel');
    const lv = window.EC_STORE.levelFromTotalXp(profile.totalXp);
    const avg = profile.history.length ? Math.round(profile.history.reduce((s,h)=>s+h.score,0)/profile.history.length) : 0;
    const best = profile.history.reduce((b,h)=> (b==null || h.score>b.score) ? h : b, null);

    let html = `<h2 style="font-family:var(--font-display);margin-top:0">Your Studio Profile</h2>
      <div style="font-weight:700;margin-bottom:4px">Level ${lv.level} <span style="color:var(--ink-soft);font-weight:600">(${lv.xpIntoLevel}/${lv.xpForNext} XP)</span></div>
      <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${(lv.xpIntoLevel/lv.xpForNext*100)}%"></div></div>
      <div class="stat-grid">
        <div class="stat-card"><div class="num">${profile.completed.length}/${window.EC_LEVELS.length}</div><div class="lbl">Projects Done</div></div>
        <div class="stat-card"><div class="num">${avg}</div><div class="lbl">Avg. Score</div></div>
        <div class="stat-card"><div class="num">${best?best.grade:'—'}</div><div class="lbl">Best Grade</div></div>
        <div class="stat-card"><div class="num">${profile.totalXp}</div><div class="lbl">Total XP</div></div>
        <div class="stat-card"><div class="num">✨ ${profile.currency}</div><div class="lbl">Sparks</div></div>
        <div class="stat-card"><div class="num">${profile.inventory.length}/${window.EC_COSMETICS.ITEMS.length}</div><div class="lbl">Items Owned</div></div>
      </div>
      <h3 style="font-family:var(--font-display)">Badges</h3>
      <div class="badges-row">`;
    window.EC_STORE.BADGES.forEach(b=>{
      const unlocked = profile.unlockedBadges.includes(b.id);
      html += `<div class="badge-chip ${unlocked?'':'locked'}" title="${b.name}"><span class="badge-emoji">${b.emoji}</span>${b.name}</div>`;
    });
    html += `</div><h3 style="font-family:var(--font-display)">History</h3>`;
    if(profile.history.length === 0){
      html += `<p style="color:var(--ink-soft)">No submissions yet — open Mail and accept a client job to get started.</p>`;
    } else {
      profile.history.slice(0,20).forEach(h=>{
        const d = new Date(h.date);
        html += `<div class="history-row"><span>${h.name}</span><span>${h.grade} · ${h.score}</span><span>${d.toLocaleDateString()}</span></div>`;
      });
    }
    panel.innerHTML = html;
  }


  // ---------------- Desktop customization (applies equipped cosmetics) ----------------
  function buildEmojiCursorCss(emoji){
    if(!emoji) return '';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='1' y='26' font-size='26'>${emoji}</text></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 4, auto`;
  }

  function applyCosmetics(){
    const eq = profile.equipped;
    const C = window.EC_COSMETICS;

    const wallpaperEl = document.getElementById('desktop-wallpaper');
    const wp = C.getItem(eq.wallpaper);
    if(wallpaperEl) wallpaperEl.style.background = wp ? wp.css : '';

    const theme = C.getItem(eq.windowTheme);
    if(theme){
      document.documentElement.style.setProperty('--purple', theme.accent);
      document.documentElement.style.setProperty('--teal', theme.secondary);
      document.documentElement.style.setProperty('--teal-dark', theme.secondaryDark);
    }

    const pack = C.getItem(eq.iconPack);
    if(pack){
      const map = { mail:'glyph-mail', stats:'glyph-stats', settings:'glyph-settings', shop:'glyph-shop' };
      Object.keys(map).forEach(k=>{
        const el = document.getElementById(map[k]);
        if(el && pack.icons[k]) el.textContent = pack.icons[k];
      });
    }

    const cursorItem = C.getItem(eq.cursor);
    document.body.style.cursor = (cursorItem && cursorItem.emoji) ? buildEmojiCursorCss(cursorItem.emoji) : '';

    const decorHost = document.getElementById('desktop-decor');
    if(decorHost){
      decorHost.innerHTML = '';
      (eq.decor||[]).forEach(id=>{
        const item = C.getItem(id);
        if(!item) return;
        const span = document.createElement('span');
        span.className = 'decor-item';
        span.textContent = item.emoji;
        decorHost.appendChild(span);
      });
    }

    if(wallpaperEl){
      const oldFx = document.getElementById('skin-fx-layer');
      if(oldFx) oldFx.remove();
      const skin = C.getItem(eq.uiSkin);
      if(skin && skin.effect && skin.effect !== 'none' && currentParticleSetting !== 'off'){
        const fxLayer = document.createElement('div');
        fxLayer.id = 'skin-fx-layer';
        fxLayer.className = 'skin-fx-layer';
        const glyph = skin.effect === 'sparkle' ? '✨' : '🎉';
        const count = currentParticleSetting === 'reduced' ? 6 : 14;
        for(let i=0;i<count;i++){
          const p = document.createElement('span');
          p.className = 'skin-fx-particle';
          p.textContent = glyph;
          p.style.left = (Math.random()*100).toFixed(1) + '%';
          p.style.animationDuration = (6+Math.random()*6).toFixed(1)+'s';
          p.style.animationDelay = (Math.random()*8).toFixed(1)+'s';
          p.style.fontSize = (14+Math.random()*10).toFixed(0)+'px';
          fxLayer.appendChild(p);
        }
        wallpaperEl.appendChild(fxLayer);
      }
    }
  }

  // ---------------- Shop / Wardrobe / Gacha ----------------
  function openShopApp(){
    showScreen('screen-shop');
    updateCurrencyDisplays();
    renderShopPanel();
  }

  function itemPreviewHtml(item){
    if(item.category==='wallpaper') return `<div class="wardrobe-item-preview" style="background:${item.css}"></div>`;
    if(item.category==='windowTheme') return `<div class="wardrobe-item-preview" style="background:linear-gradient(135deg, ${item.accent}, ${item.secondary})"></div>`;
    if(item.category==='iconPack') return `<div class="wardrobe-item-preview">${item.icons.mail}</div>`;
    if(item.category==='cursor') return `<div class="wardrobe-item-preview">${item.emoji||'🖱️'}</div>`;
    if(item.category==='decor') return `<div class="wardrobe-item-preview">${item.emoji}</div>`;
    if(item.category==='uiSkin') return `<div class="wardrobe-item-preview">${item.effect==='sparkle'?'✨':item.effect==='confetti'?'🎉':'🧩'}</div>`;
    return '<div class="wardrobe-item-preview">❔</div>';
  }

  function previewGlyph(item){
    if(item.category==='wallpaper') return item.emoji;
    if(item.category==='windowTheme') return '🎨';
    if(item.category==='iconPack') return item.icons.mail;
    if(item.category==='cursor') return item.emoji||'🖱️';
    if(item.category==='decor') return item.emoji;
    if(item.category==='uiSkin') return item.effect==='sparkle'?'✨':item.effect==='confetti'?'🎉':'🧩';
    return '🎁';
  }

  function isEquipped(item){
    if(item.category==='decor') return (profile.equipped.decor||[]).includes(item.id);
    return profile.equipped[item.category] === item.id;
  }

  function poolCardHtml(item){
    const C = window.EC_COSMETICS;
    const owned = profile.inventory.includes(item.id);
    return `<div class="pool-card ${owned?'owned':''}" data-preview-id="${item.id}" style="--rarity-color:${C.RARITY[item.rarity].color}">
      <div class="pc-icon">${previewGlyph(item)}</div>
      <div class="pc-name">${item.name}</div>
      <div class="pc-owned ${owned?'yes':'no'}">${owned?'✓ Owned':'Not Owned'}</div>
    </div>`;
  }

  function featuredCardHtml(item){
    const C = window.EC_COSMETICS;
    const r = C.RARITY[item.rarity];
    return `<div class="featured-card" data-preview-id="${item.id}" style="--rarity-color:${r.color};--rarity-glow:${r.glow}">
      <div class="featured-tag">${item.isNew ? 'New & Rare' : 'Featured'}</div>
      <div class="fc-icon">${previewGlyph(item)}</div>
      <div class="fc-name">${item.name}</div>
      <div class="fc-rarity">${r.label}</div>
    </div>`;
  }

  function renderGachaTabHtml(){
    const C = window.EC_COSMETICS;
    const rates = C.RARITY_WEIGHTS;
    const total = Object.values(rates).reduce((a,b)=>a+b,0);
    const rarityPills = Object.keys(C.RARITY).map(key=>{
      const r = C.RARITY[key];
      const pct = Math.round(rates[key]/total*100);
      return `<div class="gacha-rate-pill"><span class="gacha-rate-dot" style="background:${r.color};color:${r.color}"></span>${r.label} ${pct}%</div>`;
    }).join('');
    const canAfford1 = profile.currency >= window.EC_STORE.GACHA_COST;
    const canAfford10 = profile.currency >= window.EC_STORE.GACHA_COST_X10;
    const pity = window.EC_STORE.getPityInfo(profile);
    const featured = C.ITEMS.filter(i=>i.featured);
    const tierOrder = ['legendary','epic','rare','common'];

    let html = `<div class="gacha-hero">
      <h2>🎰 Mystery Studio Crate</h2>
      <p>Spend Sparks for a chance at wallpapers, themes, icons, cursors, desk decor and UI skins. 100% cosmetic — never affects your grade.</p>
      <div class="gacha-balance">✨ ${profile.currency} Sparks</div>
      <div class="gacha-pull-buttons">
        <button class="gacha-pull-btn ${canAfford1?'':'insufficient'}" id="gacha-pull-1" title="${canAfford1?'':'Not enough Sparks'}">Pull ×1<span class="sub">${window.EC_STORE.GACHA_COST} ✨</span></button>
        <button class="gacha-pull-btn x10 ${canAfford10?'':'insufficient'}" id="gacha-pull-10" title="${canAfford10?'':'Not enough Sparks'}">Pull ×10<span class="sub">${window.EC_STORE.GACHA_COST_X10} ✨</span></button>
      </div>
      <div class="pity-bars">
        <div class="pity-bar">
          <div class="pity-bar-label"><span>Epic+ Pity</span><span>${pity.sinceEpic}/${pity.epicPityAt}</span></div>
          <div class="pity-bar-track"><div class="pity-bar-fill epic" style="width:${Math.min(100, pity.sinceEpic/pity.epicPityAt*100)}%"></div></div>
        </div>
        <div class="pity-bar">
          <div class="pity-bar-label"><span>Legendary Pity</span><span>${pity.sinceLegendary}/${pity.legendaryPityAt}</span></div>
          <div class="pity-bar-track"><div class="pity-bar-fill legendary" style="width:${Math.min(100, pity.sinceLegendary/pity.legendaryPityAt*100)}%"></div></div>
        </div>
      </div>
      <div class="gacha-rates">${rarityPills}</div>
    </div>`;

    if(featured.length){
      html += `<div class="pool-heading"><h3>⭐ Featured Rewards</h3><span class="count-chip">${featured.length} highlighted</span></div>
        <div class="featured-row">${featured.map(featuredCardHtml).join('')}</div>`;
    }

    html += `<div class="pool-heading"><h3>📦 Full Reward Pool</h3><span class="count-chip">${C.ITEMS.length} total items — browse before you pull</span></div>`;
    tierOrder.forEach(key=>{
      const r = C.RARITY[key];
      const pct = Math.round(rates[key]/total*100);
      const items = C.ITEMS.filter(i=>i.rarity===key);
      html += `<div class="rarity-tier">
        <div class="rarity-tier-head">
          <span class="rarity-tier-dot" style="background:${r.color};color:${r.color}"></span>
          <span class="rarity-tier-name" style="color:${r.color}">${r.label}</span>
          <span class="rarity-tier-rate">${pct}% drop rate</span>
        </div>
        <div class="pool-grid">${items.map(poolCardHtml).join('')}</div>
      </div>`;
    });

    return html;
  }

  function renderWardrobeTabHtml(){
    const C = window.EC_COSMETICS;
    const catBtns = C.CATEGORY_ORDER.map(c=>
      `<button class="wardrobe-cat-btn ${wardrobeCategory===c?'active':''}" data-cat="${c}">${C.CATEGORY_LABELS[c]}</button>`
    ).join('');
    const items = C.itemsByCategory(wardrobeCategory);
    const ownedTotal = profile.inventory.length;
    const catalogTotal = C.ITEMS.length;
    const extra = wardrobeCategory==='decor'
      ? `<div class="wardrobe-item-slot-count">${(profile.equipped.decor||[]).length}/3 decor slots used — click an owned item to toggle it</div>`
      : '';
    const cards = items.map(item=>{
      const owned = profile.inventory.includes(item.id);
      const equipped = isEquipped(item);
      const rarity = C.RARITY[item.rarity];
      return `<div class="wardrobe-item ${owned?'':'locked'} ${equipped?'equipped':''}" style="--rarity-color:${rarity.color};--rarity-glow:${rarity.glow}" data-id="${item.id}" data-owned="${owned?'1':'0'}">
        ${equipped?'<div class="wardrobe-item-equipped-tag">ON</div>':''}
        ${itemPreviewHtml(item)}
        <div class="wardrobe-item-name">${item.name}</div>
        <div class="wardrobe-item-rarity">${rarity.label}</div>
        <div class="wardrobe-item-badge-row"><span class="owned-badge ${owned?'yes':'no'}">${owned?'Owned':'Not Owned'}</span></div>
        <button class="wardrobe-preview-btn" data-preview-id="${item.id}" title="Preview on desktop" aria-label="Preview ${item.name} on desktop">👁</button>
      </div>`;
    }).join('');
    return `<div class="wardrobe-progress">
        <span class="wardrobe-progress-label">${ownedTotal}/${catalogTotal} collected</span>
        <div class="wardrobe-progress-track"><div class="wardrobe-progress-fill" style="width:${Math.round(ownedTotal/catalogTotal*100)}%"></div></div>
      </div>
      <div class="wardrobe-categories">${catBtns}</div>${extra}<div class="wardrobe-grid">${cards}</div>`;
  }

  function doPull(count, btn){
    const cost = count===1 ? window.EC_STORE.GACHA_COST : window.EC_STORE.GACHA_COST_X10;
    if(profile.currency < cost){
      window.EC_SOUND.play('error');
      btn.classList.add('shake');
      setTimeout(()=>btn.classList.remove('shake'), 400);
      return;
    }
    window.EC_SOUND.play('pullCharge');
    const results = count===1 ? [window.EC_STORE.pullGacha(profile)] : window.EC_STORE.pullGachaX10(profile);
    if(!results || !results[0]) return;
    updateCurrencyDisplays();
    showGachaReveal(results);
  }

  function renderShopPanel(){
    const panel = document.getElementById('shop-panel');
    let html = `<div class="shop-tabs">
      <button class="shop-tab-btn ${shopTab==='gacha'?'active':''}" data-tab="gacha">🎰 Gacha</button>
      <button class="shop-tab-btn ${shopTab==='wardrobe'?'active':''}" data-tab="wardrobe">🧥 Wardrobe</button>
    </div>`;
    html += shopTab === 'gacha' ? renderGachaTabHtml() : renderWardrobeTabHtml();
    panel.innerHTML = html;

    panel.querySelectorAll('.shop-tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{ shopTab = btn.dataset.tab; window.EC_SOUND.play('tabSwitch'); renderShopPanel(); });
    });

    panel.querySelectorAll('[data-preview-id]').forEach(el=>{
      el.addEventListener('click', e=>{
        e.stopPropagation();
        const item = window.EC_COSMETICS.getItem(el.dataset.previewId);
        if(item) openCosmeticPreview(item);
      });
    });

    if(shopTab === 'gacha'){
      const btn1 = document.getElementById('gacha-pull-1');
      if(btn1) btn1.addEventListener('click', ()=>doPull(1, btn1));
      const btn10 = document.getElementById('gacha-pull-10');
      if(btn10) btn10.addEventListener('click', ()=>doPull(10, btn10));
    } else {
      panel.querySelectorAll('.wardrobe-cat-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{ wardrobeCategory = btn.dataset.cat; window.EC_SOUND.play('tabSwitch'); renderShopPanel(); });
      });
      panel.querySelectorAll('.wardrobe-item[data-owned="1"]').forEach(card=>{
        card.addEventListener('click', e=>{
          if(e.target.closest('.wardrobe-preview-btn')) return;
          const item = window.EC_COSMETICS.getItem(card.dataset.id);
          if(window.EC_STORE.equipItem(profile, item)){ window.EC_SOUND.play('equip'); applyCosmetics(); renderShopPanel(); }
        });
      });
    }
  }

  // ---------------- Cosmetic preview modal (mock desktop) ----------------
  function openCosmeticPreview(item){
    const C = window.EC_COSMETICS;
    const rarity = C.RARITY[item.rarity];
    const owned = profile.inventory.includes(item.id);
    const equipped = isEquipped(item);

    const mockup = document.getElementById('cosmetic-preview-mockup');
    const iconsHost = document.getElementById('mockup-icons');
    const decorHost = document.getElementById('mockup-decor');
    mockup.querySelectorAll('.skin-fx-layer, .mockup-cursor-demo, .mockup-theme-swatch').forEach(n=>n.remove());

    const eq = profile.equipped;
    const wp = item.category==='wallpaper' ? item : C.getItem(eq.wallpaper);
    mockup.style.background = wp ? wp.css : '';

    const theme = item.category==='windowTheme' ? item : C.getItem(eq.windowTheme);
    if(item.category === 'windowTheme'){
      const swatch = document.createElement('div');
      swatch.className = 'mockup-theme-swatch';
      swatch.innerHTML = `<span style="background:${theme.accent}"></span><span style="background:${theme.secondary}"></span>`;
      mockup.appendChild(swatch);
    }

    const pack = item.category==='iconPack' ? item : C.getItem(eq.iconPack);
    iconsHost.innerHTML = '';
    if(pack){
      ['mail','stats','shop','settings'].forEach(k=>{
        const div = document.createElement('div');
        div.className = 'mockup-icon';
        div.textContent = pack.icons[k];
        iconsHost.appendChild(div);
      });
    }

    decorHost.innerHTML = '';
    let decorList = (eq.decor || []).slice();
    if(item.category === 'decor' && !decorList.includes(item.id)) decorList = decorList.concat([item.id]).slice(-3);
    decorList.forEach(id=>{
      const d = C.getItem(id);
      if(!d) return;
      const span = document.createElement('span'); span.textContent = d.emoji; decorHost.appendChild(span);
    });

    const cursorItem = item.category==='cursor' ? item : C.getItem(eq.cursor);
    if(cursorItem && cursorItem.emoji){
      const cursorEl = document.createElement('div');
      cursorEl.className = 'mockup-cursor-demo';
      cursorEl.textContent = cursorItem.emoji;
      mockup.appendChild(cursorEl);
    }

    const skin = item.category==='uiSkin' ? item : C.getItem(eq.uiSkin);
    if(skin && skin.effect && skin.effect !== 'none'){
      const fx = document.createElement('div');
      fx.className = 'skin-fx-layer';
      const glyph = skin.effect === 'sparkle' ? '✨' : '🎉';
      for(let i=0;i<8;i++){
        const p = document.createElement('span');
        p.className = 'skin-fx-particle'; p.textContent = glyph;
        p.style.left = (Math.random()*100).toFixed(1) + '%';
        p.style.animationDuration = (5+Math.random()*4).toFixed(1)+'s';
        p.style.animationDelay = (Math.random()*6).toFixed(1)+'s';
        p.style.fontSize = (14+Math.random()*8).toFixed(0)+'px';
        fx.appendChild(p);
      }
      mockup.appendChild(fx);
    }

    document.getElementById('cosmetic-preview-rarity').textContent = rarity.label;
    document.getElementById('cosmetic-preview-rarity').style.background = rarity.color;
    document.getElementById('cosmetic-preview-name').textContent = item.name;
    document.getElementById('cosmetic-preview-status').textContent = owned
      ? (equipped ? 'Equipped on your desktop' : 'Owned — not currently equipped')
      : 'Not owned yet — pull the gacha for a chance at it';

    const equipBtn = document.getElementById('cosmetic-preview-equip');
    if(owned){
      equipBtn.classList.remove('hidden');
      equipBtn.textContent = item.category==='decor' ? (equipped?'Unequip':'Equip') : (equipped?'Equipped ✓':'Equip');
      equipBtn.onclick = () => {
        if(window.EC_STORE.equipItem(profile, item)){
          window.EC_SOUND.play('equip');
          applyCosmetics();
          window.EC_MODAL.hide('modal-cosmetic-preview');
          renderShopPanel();
        }
      };
    } else {
      equipBtn.classList.add('hidden');
    }
    window.EC_MODAL.show('modal-cosmetic-preview');
  }

  function showGachaReveal(results){
    const content = document.getElementById('gacha-reveal-content');
    const card = document.getElementById('gacha-reveal-card');
    const chargeFx = document.getElementById('gacha-charge-fx');
    const continueBtn = document.getElementById('btn-gacha-continue');
    const C = window.EC_COSMETICS;
    const best = results.reduce((a,b)=> C.RARITY[b.rarity].order > C.RARITY[a.rarity].order ? b : a);
    const bestR = C.RARITY[best.rarity];

    card.className = 'gacha-reveal-card charging rarity-' + best.rarity;
    card.style.setProperty('--rarity-color', bestR.color);
    card.style.setProperty('--rarity-glow', bestR.glow);
    chargeFx.classList.add('active');
    continueBtn.classList.add('hidden');
    content.innerHTML = '';
    window.EC_MODAL.show('modal-gacha-reveal');

    setTimeout(()=>{
      card.classList.remove('charging');
      chargeFx.classList.remove('active');
      continueBtn.classList.remove('hidden');

      const anyPity = results.some(r=>r.pityTriggered);
      const totalRefund = results.filter(r=>r.owned).reduce((s,r)=>s+r.refund, 0);

      if(results.length === 1){
        const { item, rarity, owned, refund, pityTriggered } = results[0];
        const r = C.RARITY[rarity];
        content.innerHTML = `
          <div class="gacha-reveal-icon">${previewGlyph(item)}</div>
          <div class="gacha-reveal-rarity">${r.label}</div>
          <div class="gacha-reveal-name">${item.name}</div>
          <div class="gacha-reveal-note">${owned ? `Duplicate — converted to bonus Sparks` : `New ${C.CATEGORY_LABELS[item.category]} unlocked!`}</div>
          ${pityTriggered ? `<div class="gacha-reveal-pity-note">✨ Pity bonus guaranteed this rarity!</div>` : ''}
          ${owned ? `<div class="gacha-reveal-bonus">✨ +${refund} Sparks</div>` : ''}
        `;
      } else {
        const grid = results.map(res=>{
          const rr = C.RARITY[res.rarity];
          return `<div class="mini-item" style="--rarity-color:${rr.color};border-color:${rr.color}">${previewGlyph(res.item)}<span class="mini-name">${res.owned?'+'+res.refund+' ✨':res.item.name}</span></div>`;
        }).join('');
        content.innerHTML = `
          <div class="gacha-reveal-rarity">10-Pull Results</div>
          <div class="gacha-reveal-name">Best pull: ${best.item.name} (${bestR.label})</div>
          ${anyPity ? `<div class="gacha-reveal-pity-note">✨ Pity bonus guaranteed a higher rarity this round!</div>` : ''}
          <div class="gacha-reveal-grid">${grid}</div>
          ${totalRefund>0 ? `<div class="gacha-reveal-bonus">✨ +${totalRefund} bonus Sparks from duplicates</div>` : ''}
        `;
      }

      const soundMap = { common:'revealCommon', rare:'revealRare', epic:'revealEpic', legendary:'revealLegendary' };
      window.EC_SOUND.play(soundMap[best.rarity] || 'revealCommon');
      if(best.rarity === 'epic' || best.rarity === 'legendary'){
        const burst = document.createElement('div');
        burst.className = 'reveal-burst';
        const glyph = best.rarity === 'legendary' ? '⭐' : '✦';
        const n = best.rarity === 'legendary' ? 16 : 10;
        for(let i=0;i<n;i++){
          const s = document.createElement('span');
          const angle = (Math.PI*2*i)/n;
          const dist = 90 + Math.random()*60;
          s.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
          s.style.setProperty('--dy', Math.sin(angle)*dist + 'px');
          s.style.animationDelay = (Math.random()*0.15)+'s';
          s.style.color = bestR.color;
          s.textContent = glyph;
          burst.appendChild(s);
        }
        card.appendChild(burst);
        setTimeout(()=>burst.remove(), 1000);
      }
    }, 700);
  }

  function save(){ window.EC_STORE.save(profile); }

  // ---------------- Toast ----------------
  function showToast(html, duration){
    const t = document.getElementById('toast-levelup');
    t.innerHTML = html;
    t.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(()=>t.classList.add('hidden'), duration||3800);
  }

  // ---------------- Report screen ----------------
  const CATEGORY_LABELS = { contrast:'Contrast', alignment:'Alignment', hierarchy:'Hierarchy', spacing:'Spacing', consistency:'Consistency', accessibility:'Accessibility', usability:'Usability' };
  const GRADE_COLORS = { 'S+':'#2e8c7e','S':'#4fb8a9','A':'#3dbd6e','B':'#f5c544','C':'#ff8a3d','Needs Improvement':'#e15252' };

  function showReportScreen(level, result){
    lastReportLevel = level; lastReportResult = result;
    document.getElementById('report-client-name').textContent = `${level.clientName} — Level ${level.levelNumber}: ${level.concept}`;
    document.getElementById('grade-letter').textContent = result.grade;
    document.getElementById('grade-stamp').style.background = GRADE_COLORS[result.grade] || 'var(--orange)';
    document.getElementById('xp-gain').textContent = `+${result.xpAwarded} XP  ·  Score ${result.score}/100`;

    const thumbs = document.getElementById('compare-thumbs');
    thumbs.innerHTML = '';
    const beforeWrap = document.createElement('div'); beforeWrap.className='thumb';
    const afterWrap = document.createElement('div'); afterWrap.className='thumb';
    thumbs.appendChild(beforeWrap); thumbs.appendChild(afterWrap);
    window.EC_EDITOR.renderStatic(beforeWrap, level, window.EC_EDITOR.getOriginalElements(), {maxSize:100});
    window.EC_EDITOR.renderStatic(afterWrap, level, window.EC_EDITOR.getElements(), {maxSize:100});
    const bLbl = document.createElement('span'); bLbl.textContent='Before'; beforeWrap.appendChild(bLbl);
    const aLbl = document.createElement('span'); aLbl.textContent='After'; afterWrap.appendChild(aLbl);

    const bars = document.getElementById('score-bars');
    bars.innerHTML = '';
    Object.keys(result.categoryScores).forEach(key=>{
      const v = result.categoryScores[key];
      bars.innerHTML += `<div class="score-bar-row"><span class="label">${CATEGORY_LABELS[key]||key}</span>
        <div class="score-bar-track"><div class="score-bar-fill" style="width:${v}%;background:${v>=80?'var(--success)':v>=60?'var(--yellow-dark)':'var(--danger)'}"></div></div>
        <span class="val">${v}</span></div>`;
    });

    const fl = document.getElementById('feedback-list');
    fl.classList.remove('show-details');
    fl.innerHTML = '';
    result.feedback.forEach(f=>{
      const icon = f.type==='good' ? '✅' : f.type==='bad' ? '❌' : '💡';
      fl.innerHTML += `<div class="feedback-item ${f.type}"><span class="fi-icon">${icon}</span>
        <div class="fi-body"><b>${f.title}</b>${f.detail?`<div>${f.detail}</div>`:''}${f.suggest?`<div class="fi-suggest">Tip: ${f.suggest}</div>`:''}</div></div>`;
    });

    document.getElementById('btn-report-details').textContent = 'Show Explanations';
    showScreen('screen-report');
  }

  // ---------------- Timed mode ----------------
  function startTimerIfNeeded(){
    stopTimer();
    if(!profile.settings.timedMode) return;
    let remaining = 300;
    let timerEl = document.getElementById('editor-timer');
    if(!timerEl){
      timerEl = document.createElement('div');
      timerEl.id = 'editor-timer';
      timerEl.className = 'tool-btn';
      document.querySelector('.editor-tools-right').insertBefore(timerEl, document.getElementById('tool-save'));
    }
    const tick = ()=>{
      const m = Math.floor(remaining/60), sec = remaining%60;
      timerEl.textContent = `⏱ ${m}:${sec.toString().padStart(2,'0')}`;
      timerEl.style.color = remaining <= 30 ? 'var(--danger)' : '';
      if(remaining <= 0){
        stopTimer();
        document.getElementById('tool-save').click();
        setTimeout(()=>document.getElementById('btn-confirm-yes').click(), 60);
      }
      remaining--;
    };
    tick();
    timerInterval = setInterval(tick, 1000);
  }
  function stopTimer(){
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    const timerEl = document.getElementById('editor-timer');
    if(timerEl) timerEl.remove();
  }

  // ---------------- Compare popup (report screen) ----------------
  function openBigCompare(){
    const level = lastReportLevel;
    if(!level) return;
    let pop = document.getElementById('report-compare-popup');
    if(pop){ pop.remove(); return; }
    pop = document.createElement('div');
    pop.id = 'report-compare-popup';
    pop.className = 'modal-overlay';
    pop.innerHTML = `<div class="modal-card" style="max-width:820px">
      <h3 style="font-family:var(--font-display);margin-top:0">Before &amp; After</h3>
      <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap">
        <div><div style="text-align:center;font-weight:700;margin-bottom:8px">Before</div><div id="rcmp-before"></div></div>
        <div><div style="text-align:center;font-weight:700;margin-bottom:8px">After</div><div id="rcmp-after"></div></div>
      </div>
      <div class="mail-detail-actions"><button class="btn btn-ghost" id="rcmp-close">Close</button></div>
    </div>`;
    document.body.appendChild(pop);
    window.EC_EDITOR.renderStatic(document.getElementById('rcmp-before'), level, window.EC_EDITOR.getOriginalElements(), {maxSize:320});
    window.EC_EDITOR.renderStatic(document.getElementById('rcmp-after'), level, window.EC_EDITOR.getElements(), {maxSize:320});
    document.getElementById('rcmp-close').addEventListener('click', ()=>pop.remove());
    pop.addEventListener('click', e=>{ if(e.target===pop) pop.remove(); });
  }

  // ---------------- Fullscreen (like a video player's expand button) ----------------
  // A webpage can't hide the browser's own chrome during normal browsing —
  // that's the browser's call, not the page's — but the standard Fullscreen
  // API *is* something a page can invoke directly from a tap, and modern
  // mobile browsers (iOS 16.4+, Android Chrome) honor it: it drops the
  // address bar/toolbars the same way a fullscreen video does. Falls back
  // to vendor-prefixed variants for older WebKit; the button hides itself
  // entirely if nothing is supported at all.
  function getFullscreenEl(){
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
  }
  function requestFn(){
    const el = document.documentElement;
    return el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  }
  function exitFn(){
    return document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  }
  function toggleFullscreen(){
    if(getFullscreenEl()){
      const fn = exitFn();
      if(fn) fn.call(document);
    } else {
      const fn = requestFn();
      if(fn) fn.call(document.documentElement).catch(()=>{});
    }
  }
  function updateFullscreenBtn(){
    const btn = document.getElementById('taskbar-fullscreen');
    if(!btn) return;
    const active = !!getFullscreenEl();
    btn.classList.toggle('active', active);
    btn.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
    btn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  }
  function initFullscreenToggle(){
    const btn = document.getElementById('taskbar-fullscreen');
    if(!requestFn()){ btn.style.display = 'none'; return; }
    btn.addEventListener('click', toggleFullscreen);
    ['fullscreenchange','webkitfullscreenchange','MSFullscreenChange'].forEach(evt=>{
      document.addEventListener(evt, updateFullscreenBtn);
    });
  }

  // ---------------- Clock ----------------
  function updateClock(){
    const now = new Date();
    let h = now.getHours(); const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if(h===0) h = 12;
    document.getElementById('taskbar-clock').textContent = `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
  }

  // ---------------- Desktop apps ----------------
  function openMailApp(){
    showScreen('screen-shell');
    currentFolder = 'inbox';
    renderCurrentFolder();
  }
  function openStatsApp(){
    showScreen('screen-stats');
    renderStatsPanel();
  }
  function openSettingsApp(){
    showScreen('screen-settings');
    renderSettingsPanel();
  }

  // ---------------- Bootstrap ----------------
  function init(){
    applySettings(); // also applies cosmetics (wallpaper/theme/icons/cursor/decor/particles)
    refreshHeader();
    updateClock();
    setInterval(updateClock, 15000);
    initFullscreenToggle();

    document.getElementById('btn-start').addEventListener('click', ()=>{
      showScreen('screen-desktop');
    });

    document.getElementById('icon-mail').addEventListener('click', openMailApp);
    document.getElementById('icon-stats').addEventListener('click', openStatsApp);
    document.getElementById('icon-settings').addEventListener('click', openSettingsApp);
    document.getElementById('icon-shop').addEventListener('click', openShopApp);

    document.getElementById('mail-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('stats-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('settings-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('shop-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));

    document.getElementById('taskbar-home').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('taskbar-profile').addEventListener('click', openStatsApp);
    document.getElementById('taskbar-shop').addEventListener('click', openShopApp);
    document.getElementById('btn-gacha-continue').addEventListener('click', ()=>{
      window.EC_MODAL.hide('modal-gacha-reveal');
      refreshHeader();
      if(document.getElementById('screen-shop').classList.contains('active')) renderShopPanel();
    });
    document.getElementById('cosmetic-preview-close').addEventListener('click', ()=>window.EC_MODAL.hide('modal-cosmetic-preview'));
    document.getElementById('modal-cosmetic-preview').addEventListener('click', e=>{
      if(e.target.id === 'modal-cosmetic-preview') window.EC_MODAL.hide('modal-cosmetic-preview');
    });

    document.querySelectorAll('.side-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{ currentFolder = btn.dataset.folder; renderCurrentFolder(); });
    });

    document.getElementById('mail-search-input').addEventListener('input', e=>{
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#mail-list .mail-item').forEach(row=>{
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    window.EC_MAIL.initOnce();
    window.EC_EDITOR.initToolbarOnce();

    window.EC_MAIL.setHandlers({
      onAccept: level => {
        showScreen('screen-editor');
        window.EC_EDITOR.open(level);
        levelStartTime = Date.now();
        startTimerIfNeeded();
      },
      onSend: (level, result) => {
        showToast(`✉️ Reply sent to ${level.clientName}!`, 2500);
        renderCurrentFolder();
      }
    });

    // Design Review screen is skipped for now — go straight from Save &
    // Submit to recording the result (XP/currency/badges via toast) and
    // composing the reply, instead of showing the full report screen.
    window.EC_EDITOR.setOnSubmit(result => {
      stopTimer();
      const level = window.EC_EDITOR.getLevel();
      const elapsedMs = levelStartTime ? (Date.now() - levelStartTime) : 0;
      levelStartTime = null;
      const prevLevel = window.EC_STORE.levelFromTotalXp(profile.totalXp).level;
      const { newBadges, currencyEarned } = window.EC_STORE.recordSubmission(profile, level, result, elapsedMs);
      const newLevel = window.EC_STORE.levelFromTotalXp(profile.totalXp).level;
      refreshHeader();
      openMailApp();

      let toastHtml = `🎉 ${result.grade} grade — +${result.xpAwarded} XP · +${currencyEarned} ✨ Sparks!`;
      if(newLevel > prevLevel) toastHtml += `<br/>⭐ Level up! You're now Level ${newLevel}.`;
      if(newBadges.length) toastHtml += `<br/>🏅 New badge: ${newBadges.map(id=>window.EC_STORE.BADGES.find(b=>b.id===id).name).join(', ')}`;
      showToast(toastHtml, 4500);

      window.EC_MAIL.openCompose(level, result);
    });

    currentFolder = 'inbox';
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
