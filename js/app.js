/* =====================================================
   EyeCon — App shell: desktop, navigation, mail, stats, settings, report
===================================================== */
(function(){

  let profile = window.EC_STORE.load();
  let currentFolder = 'inbox';
  let pendingSubmission = null;
  let timerInterval = null;
  let levelStartTime = null;
  let shopTab = 'featured';
  let wardrobeCategory = 'wallpaper';
  let currentParticleSetting = profile.settings.particles || 'full';

  // ---- Settings screen draft state (Apply/Cancel pattern) ----
  let settingsDraft = Object.assign({}, profile.settings);
  let settingsDirty = false;
  let settingsQuery = '';

  function announce(text){
    document.getElementById('a11y-announcer').textContent = text;
  }

  // onShown fires exactly when `name` actually gets .active applied — which
  // is NOT necessarily synchronous with this call returning, since the
  // outgoing screen may still be mid-closing-animation. Anything that reads
  // layout (e.g. EC_EDITOR.open() measuring the canvas wrap's size) MUST
  // wait for onShown rather than running right after showScreen() returns,
  // or it'll measure a still-display:none element and compute a bogus size.
  function showScreen(name, onShown){
    // Guarantee any content currently on loan to the monitor popup (see
    // openMonitorAppPopup) is back in its real screen before that screen
    // might be shown for real — otherwise it would appear empty. Instant,
    // not animated — the screen switch itself is about to animate anyway.
    closeMonitorAppPopup(true);
    const current = document.querySelector('.screen.active');
    const reduceMotion = document.body.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swap = () => {
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','closing'));
      document.getElementById(name).classList.add('active');
      document.getElementById('global-taskbar').classList.toggle('desktop-hidden', name === 'screen-home');
      announce(name.replace('screen-','').replace('-',' ') + ' screen');
      if(onShown) onShown();
    };
    if(current && current.id !== name && !reduceMotion){
      current.classList.add('closing');
      setTimeout(swap, 180);
    } else {
      swap();
    }
  }

  // ---------------- First-day guide ----------------
  // The first trip from the title screen lands on the desk, then Pixel gives
  // the player a compact explanation before their very first client email.
  // Piko's guide sequence: null | 'mail' | 'inbox' | 'attachment' | 'accept' | 'element' | 'controls' | 'save' | 'send'
  const pikoEnabled = false;
  let pikoStage = null;
  function isFirstDay(){
    return !profile.onboarding?.seen && profile.completed.length === 0 && profile.history.length === 0;
  }
  // Piko's intro: three lines, then he points at the Mail icon once the
  // first client email arrives — same beats as the reference build's
  // pikoScript.tutorial, just driven by EC_PIKO instead of a static modal.
  function runPikoIntro(){
    const P = window.EC_PIKO, lines = P.SCRIPT.tutorial;
    P.say(lines[0], { onDone: ()=>{
      P.say(lines[1], { onDone: ()=>{
        window.EC_SOUND.play('newMail');
        const mailIcon = document.getElementById('icon-mail');
        if(mailIcon) mailIcon.classList.add('tutorial-mail-pulse');
        announce('New email received.');
        P.say(lines[2], { onDone: ()=>{
          pikoStage = 'mail';
          P.pointAt(mailIcon);
        }});
      }});
    }});
  }
  function startFirstDayGuide(){
    if(!pikoEnabled || !isFirstDay()) return;
    runPikoIntro();
  }
  // Settings > Testing: re-runs Piko's whole guide chain from the desktop,
  // bypassing the isFirstDay() gate so it can be replayed on a save that's
  // already past day one.
  function replayPikoTutorial(){
    if(!pikoEnabled) return;
    pikoStage = null;
    window.EC_PIKO.clearTarget();
    window.EC_PIKO.hideBubble();
    showScreen('screen-desktop', ()=>{
      document.getElementById('icon-mail')?.classList.remove('tutorial-mail-pulse');
      runPikoIntro();
    });
  }
  // Called once Mail is opened while Piko is waiting on the 'mail' stage —
  // points at the first ticket row and asks the player to open it.
  function pikoAdvanceToInbox(){
    if(pikoStage !== 'mail') return;
    // Drop the spotlight immediately (screen is mid-transition to Mail) and
    // wait for it to actually settle before re-showing it on the inbox row —
    // re-measuring too early is what put the cursor in the corner before.
    window.EC_PIKO.clearTarget();
    document.getElementById('icon-mail')?.classList.remove('tutorial-mail-pulse');
    pikoStage = 'inbox';
    setTimeout(()=>{
      const row = document.querySelector('#mail-list .mail-item');
      const level = window.EC_STORE.commissionInbox(profile)[0];
      if(row && level){
        window.EC_PIKO.pointAt(row);
        window.EC_PIKO.say(window.EC_PIKO.SCRIPT.inboxGuide(level.clientName));
      }
    }, 450);
  }
  // The rest of Piko's chain (attachment → accept → element → controls →
  // save → send) is driven by delegated clicks — see initPikoGuideChain().
  function initPikoGuideChain(){
    document.addEventListener('click', e=>{
      if(pikoStage === 'inbox' && e.target.closest('#mail-list .mail-item')){
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        pikoStage = 'attachment';
        requestAnimationFrame(()=>{
          const chip = document.getElementById('attachment-chip');
          if(chip){ window.EC_PIKO.pointAt(chip); window.EC_PIKO.say(window.EC_PIKO.SCRIPT.previewGuide); }
        });
        return;
      }
      if((pikoStage === 'attachment' || pikoStage === 'accept') && e.target.closest('#btn-accept-job')){
        pikoStage = 'element';
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        return;
      }
      if(pikoStage === 'attachment' && e.target.closest('#attachment-chip')){
        pikoStage = 'accept';
        requestAnimationFrame(()=>{
          window.EC_PIKO.pointAt(document.getElementById('btn-accept-job'));
          window.EC_PIKO.say(window.EC_PIKO.SCRIPT.acceptGuide, { top:true });
        });
        return;
      }
      if(pikoStage === 'element' && e.target.closest('#editor-canvas .el:not([data-locked="1"])')){
        pikoStage = 'controls';
        window.EC_PIKO.clearTarget();
        requestAnimationFrame(()=>{
          const panel = document.getElementById('element-settings');
          window.EC_PIKO.pointAt(panel);
          window.EC_PIKO.say(window.EC_PIKO.SCRIPT.workspace.controls, { top:true, onDone: ()=>{
            pikoStage = 'save';
            window.EC_PIKO.pointAt(document.getElementById('tool-save'));
          }});
        });
        return;
      }
      if(pikoStage === 'save' && e.target.closest('#tool-save')){
        pikoStage = 'send';
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        requestAnimationFrame(()=>{
          const yes = document.getElementById('btn-confirm-yes');
          if(yes){ window.EC_PIKO.pointAt(yes); window.EC_PIKO.say(window.EC_PIKO.SCRIPT.workspace.send, { top:true }); }
        });
        return;
      }
      if(pikoStage === 'send' && e.target.closest('#btn-confirm-yes')){
        pikoStage = null;
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        profile.onboarding.seen = true;
        save();
      }
    });
  }

  // A brief loading transition between screens — currently used between
  // "Accept" on a mail job and the editor actually opening, since cutting
  // straight in feels abrupt for what's framed as "opening your workspace."
  // There's no real async work to wait on, so this is a fixed-length,
  // purely cosmetic beat; skipped entirely under reduced motion.
  //
  // onDone receives a `finishFade` callback instead of the overlay fading
  // itself out immediately — the screen switch it triggers (showScreen)
  // can itself take another beat to actually swap (its own closing
  // animation on the outgoing screen), and fading the loading overlay out
  // before that swap has actually happened let the old screen show through.
  // The caller is expected to call finishFade() only once the new screen
  // has genuinely finished showing (e.g. from showScreen's onShown).
  function showLoadingTransition(onDone){
    const overlay = document.getElementById('app-loading-screen');
    const reduceMotion = document.body.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finishFade = () => {
      overlay.classList.add('leaving');
      setTimeout(()=> overlay.classList.add('hidden'), 350);
    };
    if(!overlay || reduceMotion){ onDone(()=>{}); return; }
    overlay.classList.remove('hidden', 'leaving');
    overlay.classList.add('entering');
    // Double rAF: the first lets the browser actually paint the opacity:0
    // "entering" state before the second one removes it, so the transition
    // to opacity:1 plays instead of being coalesced into a single frame.
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=> overlay.classList.remove('entering'));
    });
    setTimeout(()=> onDone(finishFade), 600);
  }

  // ---------------- Title-screen monitor: live mini desktop ----------------
  // The monitor IS the entry point now (no separate logo/Start button) — it
  // shows a small honest live view of the real desktop. Clicking the
  // background takes you straight to the real desktop; clicking a mini icon
  // instead pops a floating app window up over the monitor (see
  // openMonitorAppPopup below) — no navigation, no transition. Profile data
  // is already loaded at this point (see the top of this file), so these
  // numbers are accurate immediately.
  function updateMiniDesktop(){
    const unread = window.EC_STORE.commissionInbox(profile).length;
    const badge = document.getElementById('mini-badge-mail');
    if(badge){
      badge.textContent = unread;
      badge.style.display = unread > 0 ? '' : 'none';
    }
    const currency = document.getElementById('mini-taskbar-currency');
    if(currency) currency.textContent = `✨ ${profile.currency}`;
    const clock = document.getElementById('mini-taskbar-clock');
    const realClock = document.getElementById('taskbar-clock');
    if(clock && realClock) clock.textContent = realClock.dataset.time || realClock.textContent;
  }

  // ---------------- Monitor app popup (title-screen floating window) ----------------
  // Clicking a mini icon doesn't navigate anywhere — it borrows that app's
  // real content pane (same render function, same listeners, already wired
  // once at init) into a floating window over the monitor, then hands it
  // back to its normal screen on close. Same move-and-restore idea as the
  // editor's mobile tools sheet, just for one element instead of many.
  const MONITOR_APPS = {
    mail:     { title:'Eye Mail',     icon:'📬', screenId:'screen-shell',    contentSelector:'.mail-body',        render: ()=>renderCurrentFolder() },
    stats:    { title:'Studio Stats', icon:'📊', screenId:'screen-stats',    contentSelector:'.app-content-wrap', render: ()=>renderStatsPanel() },
    shop:     { title:'Shop',         icon:'🛍️', screenId:'screen-shop',     contentSelector:'.app-content-wrap', render: ()=>{ renderShopPanel(); updateCurrencyDisplays(); } },
    settings: { title:'Settings',     icon:'⚙️', screenId:'screen-settings', contentSelector:'.app-content-wrap', render: ()=>renderSettingsPanel() },
  };
  let monitorPopupBorrowed = null; // { el, parent, next } of whatever content is currently on loan

  function openMonitorAppPopup(appKey, opts){
    const spec = MONITOR_APPS[appKey];
    if(!spec) return;
    closeMonitorAppPopup(true); // instant — about to replace its content anyway, no need to animate the old one out
    const screenEl = document.getElementById(spec.screenId);
    const contentEl = screenEl && screenEl.querySelector(spec.contentSelector);
    if(!contentEl) return;
    monitorPopupBorrowed = { el: contentEl, parent: contentEl.parentNode, next: contentEl.nextElementSibling };
    document.getElementById('monitor-app-popup-body').appendChild(contentEl);
    spec.render();
    document.getElementById('monitor-app-popup-icon').textContent = spec.icon;
    document.getElementById('monitor-app-popup-title').textContent = spec.title;
    const popup = document.getElementById('monitor-app-popup');
    popup.classList.toggle('note-style', !!(opts && opts.noteStyle));
    popup.classList.remove('hidden');
  }

  function closeMonitorAppPopup(instant){
    const popup = document.getElementById('monitor-app-popup');
    if(!popup || popup.classList.contains('hidden')) return;
    const reduceMotion = document.body.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const restore = () => {
      if(monitorPopupBorrowed){
        monitorPopupBorrowed.parent.insertBefore(monitorPopupBorrowed.el, monitorPopupBorrowed.next);
        monitorPopupBorrowed = null;
      }
    };
    if(instant || reduceMotion){
      popup.classList.remove('closing');
      popup.classList.add('hidden');
      restore();
      return;
    }
    popup.classList.add('closing');
    setTimeout(()=>{
      popup.classList.remove('closing');
      popup.classList.add('hidden');
      restore();
    }, 180);
  }

  // Clicking the monitor's plain background: if a popup window is open,
  // this just dismisses it (same as clicking outside any other floating
  // window); otherwise it's the "enter" action.
  function miniDesktopBackgroundAction(){
    const popup = document.getElementById('monitor-app-popup');
    if(popup && !popup.classList.contains('hidden')){ closeMonitorAppPopup(); return; }
    showScreen('screen-desktop', startFirstDayGuide);
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
    window.EC_SOUND.setMusicEnabled(!!s.musicEnabled);
    window.EC_SOUND.setMusicVolume(s.musicVolume != null ? s.musicVolume : 0.28);
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
      { tab:'audio', id:'musicEnabled', label:'Background Music', desc:'A mellow R&B groove with warm keys, swung drums and soft bass. Starts when you interact.',
        tip:'Music is synthesized in the browser and starts only after you interact, as required by browser audio rules.', type:'toggle' },
      { tab:'audio', id:'musicVolume', label:'Music Volume', desc:'How loud the background music plays.',
        tip:'Set this to zero for a silent atmosphere while retaining sound effects.', type:'slider', min:0, max:1, step:0.05, format:v=>Math.round(v*100)+'%' },

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

  // Still called "tab" in the schema (def.tab) purely as a grouping key —
  // there's no actual tab UI anymore, every section renders on one page.
  const SETTINGS_SECTIONS = [
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

  function renderSettingRow(def, value){
    const { tip, control } = settingRowControlHtml(def, value);
    return `<div class="settings-item" data-row-for="${def.id}">
      <div class="settings-item-text">
        <div class="settings-item-label">${def.label}${tip}</div>
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
      html += `<div class="settings-card settings-testing-card"><div class="settings-item">
        <div class="settings-item-text"><div class="settings-item-label">🧪 Testing: Add Sparks</div>
        <div class="settings-item-desc">Grants a big batch of Sparks so you can browse the store freely. Temporary testing aid.</div></div>
        <div class="settings-item-control"><button class="btn btn-accept btn-sm" id="set-add-sparks">+99,999 ✨</button></div>
      </div>
      <div class="settings-item">
        <div class="settings-item-text"><div class="settings-item-label">🐾 Replay Piko's Tutorial</div>
        <div class="settings-item-desc">Runs Piko's first-day guide again from the desktop, even if you've already played.</div></div>
        <div class="settings-item-control"><button class="btn btn-accept btn-sm" id="set-replay-piko">Replay</button></div>
      </div></div>`;
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

  function renderAllSectionsHtml(){
    return SETTINGS_SECTIONS.map(sec =>
      `<section class="settings-section"><h3 class="settings-tab-title">${sec.icon} ${sec.label}</h3>${renderSettingsTabBody(sec.id)}</section>`
    ).join('');
  }

  function renderSettingsSearchResults(query){
    const q = query.trim().toLowerCase();
    const matches = getSettingsSchema().filter(d => d.label.toLowerCase().includes(q) || (d.desc||'').toLowerCase().includes(q));
    if(matches.length === 0) return `<div class="settings-no-results">No settings match "${query}".</div>`;
    return `<div class="settings-search-results">${matches.map(def=>renderSettingRow(def, settingsDraft[def.id])).join('')}</div>`;
  }

  function renderSettingsPanel(){
    const panel = document.getElementById('settings-panel');
    settingsDraft = Object.assign({}, profile.settings);
    settingsDirty = false;

    panel.innerHTML = `<div class="settings-shell settings-shell-single">
      <div class="settings-search-row">
        <div class="settings-search"><span class="icon-search">🔍</span>
          <input type="text" id="settings-search-input" placeholder="Search settings…" value="${settingsQuery}" aria-label="Search settings"/>
        </div>
      </div>
      <div class="settings-content settings-content-single" id="settings-content"></div>
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
      content.innerHTML = settingsQuery.trim() ? renderSettingsSearchResults(settingsQuery) : renderAllSectionsHtml();
      wireContentControls();
    }

    function markDirty(){
      settingsDirty = true;
      document.getElementById('settings-dirty-note').classList.add('show');
      document.getElementById('set-apply').disabled = false;
    }

    function wireContentControls(){
      const content = document.getElementById('settings-content');
      const resetBtn = document.getElementById('set-reset-progress');
      if(resetBtn) resetBtn.addEventListener('click', ()=>{
        if(window.confirm('Reset all EyeCon progress? This cannot be undone.')){
          profile = window.EC_STORE.defaultProfile();
          save(); applySettings(); refreshHeader(); renderSettingsPanel();
        }
      });
      const addSparksBtn = document.getElementById('set-add-sparks');
      if(addSparksBtn) addSparksBtn.addEventListener('click', ()=>{
        profile.currency += 99999;
        save();
        updateCurrencyDisplays();
        window.EC_SOUND.play('coin');
      });
      const replayPikoBtn = document.getElementById('set-replay-piko');
      if(replayPikoBtn) replayPikoBtn.addEventListener('click', replayPikoTutorial);
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
    const unreadCount = window.EC_STORE.commissionInbox(profile).length;
    document.getElementById('inbox-count').textContent = unreadCount;
    document.getElementById('desktop-inbox-badge').textContent = unreadCount;
    updateCurrencyDisplays();
    updateMiniDesktop();
  }

  function updateCurrencyDisplays(){
    const text = `✨ ${profile.currency}`;
    const taskbar = document.getElementById('taskbar-currency');
    if(taskbar) taskbar.textContent = text;
    const shopChip = document.getElementById('shop-currency-chip');
    if(shopChip) shopChip.textContent = text;
    const desktopChip = document.getElementById('desktop-currency');
    if(desktopChip) desktopChip.textContent = text;
    updateMiniDesktop();
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
        <div class="stat-card"><div class="num">🔥 ${(profile.daily||{}).streak||0}</div><div class="lbl">Daily Streak</div></div>
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

  // Applies the equipped wallpaper, decor stickers and particle effect to
  // any "scene" host + its decor container — used for both the OS desktop
  // and the title screen's desk, so a cosmetic you've equipped shows up
  // everywhere your workspace is visible, not just after you hit Start.
  function applyCosmeticsToScene(sceneEl, decorHost, fxLayerId, wp, decorIds, skin){
    if(sceneEl) sceneEl.style.background = wp ? wp.css : '';

    if(decorHost){
      decorHost.innerHTML = '';
      (decorIds||[]).forEach(id=>{
        const item = window.EC_COSMETICS.getItem(id);
        if(!item) return;
        const span = document.createElement('span');
        span.className = 'decor-item';
        span.textContent = item.emoji;
        decorHost.appendChild(span);
      });
    }

    if(sceneEl){
      const oldFx = document.getElementById(fxLayerId);
      if(oldFx) oldFx.remove();
      if(skin && skin.effect && skin.effect !== 'none' && currentParticleSetting !== 'off'){
        const fxLayer = document.createElement('div');
        fxLayer.id = fxLayerId;
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
        sceneEl.appendChild(fxLayer);
      }
    }
  }

  function applyCosmetics(){
    const eq = profile.equipped;
    const C = window.EC_COSMETICS;

    const wp = C.getItem(eq.wallpaper);
    const skin = C.getItem(eq.uiSkin);

    applyCosmeticsToScene(
      document.getElementById('desktop-wallpaper'), document.getElementById('desktop-decor'),
      'skin-fx-layer', wp, eq.decor, skin
    );
    applyCosmeticsToScene(
      document.getElementById('desk-scene'), document.getElementById('desk-decor'),
      'desk-skin-fx-layer', wp, eq.decor, skin
    );
    // The monitor's mini desktop mirrors the real desktop's wallpaper (no
    // decor/particles at that scale — too small to read).
    const miniDesktop = document.getElementById('mini-desktop');
    if(miniDesktop) miniDesktop.style.background = wp ? wp.css : '';

    // Workstation prop skins — desk surface, keyboard, mouse, PC tower,
    // monitor bezel. Each just overrides that element's background via
    // inline style; clearing it (no equipped item) falls back to the CSS
    // default, so an old save with no deskSkin/etc. equipped still looks
    // exactly as it did before this system existed.
    const propSkinTargets = {
      deskSkin: '#desk-scene .desk-surface',
      keyboardSkin: '#desk-scene .keyboard',
      mouseSkin: '#desk-scene .mouse',
      towerSkin: '#desk-scene .tower',
      monitorSkin: '#desk-scene .monitor',
    };
    Object.keys(propSkinTargets).forEach(cat=>{
      const el = document.querySelector(propSkinTargets[cat]);
      if(!el) return;
      const item = C.getItem(eq[cat]);
      el.style.background = item ? item.css : '';
    });

    // Wall posters — up to 2 equipped at once, hung above the desk.
    const postersHost = document.getElementById('desk-posters');
    if(postersHost){
      postersHost.innerHTML = '';
      (eq.poster||[]).forEach(id=>{
        const item = C.getItem(id);
        if(!item) return;
        const frame = document.createElement('div');
        frame.className = 'poster-item';
        frame.style.background = item.css;
        frame.textContent = item.emoji;
        postersHost.appendChild(frame);
      });
    }

    const theme = C.getItem(eq.windowTheme);
    if(theme){
      document.documentElement.style.setProperty('--purple', theme.accent);
      document.documentElement.style.setProperty('--teal', theme.secondary);
      document.documentElement.style.setProperty('--teal-dark', theme.secondaryDark);
    }

    const pack = C.getItem(eq.iconPack);
    if(pack){
      const map = {
        mail:['glyph-mail','mini-icon-mail'], stats:['glyph-stats','mini-icon-stats'],
        settings:['glyph-settings','mini-icon-settings'], shop:['glyph-shop','mini-icon-shop'],
      };
      Object.keys(map).forEach(k=>{
        if(!pack.icons[k]) return;
        map[k].forEach(id=>{
          const el = document.getElementById(id);
          if(!el) return;
          // mini-icon-mail nests a live badge span — only touch the glyph's
          // own text node so the badge (added/updated by updateMiniDesktop)
          // survives an icon-pack swap.
          const textNode = Array.from(el.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
          if(textNode) textNode.nodeValue = pack.icons[k];
          else el.insertBefore(document.createTextNode(pack.icons[k]), el.firstChild);
        });
      });
    }

    const cursorItem = C.getItem(eq.cursor);
    document.body.style.cursor = (cursorItem && cursorItem.emoji) ? buildEmojiCursorCss(cursorItem.emoji) : '';
  }

  // ---------------- Daily Store / Wardrobe ----------------
  function openShopApp(){
    showScreen('screen-shop');
    updateCurrencyDisplays();
    renderShopPanel();
  }

  const SKIN_CATEGORIES = ['deskSkin','keyboardSkin','mouseSkin','towerSkin','monitorSkin'];
  const SKIN_GLYPHS = { deskSkin:'🪑', keyboardSkin:'⌨️', mouseSkin:'🖱️', towerSkin:'🖥️', monitorSkin:'🖼️' };

  function itemPreviewHtml(item){
    if(item.category==='wallpaper') return `<div class="wardrobe-item-preview" style="background:${item.css}"></div>`;
    if(item.category==='windowTheme') return `<div class="wardrobe-item-preview" style="background:linear-gradient(135deg, ${item.accent}, ${item.secondary})"></div>`;
    if(item.category==='iconPack') return `<div class="wardrobe-item-preview">${item.icons.mail}</div>`;
    if(item.category==='cursor') return `<div class="wardrobe-item-preview">${item.emoji||'🖱️'}</div>`;
    if(item.category==='decor') return `<div class="wardrobe-item-preview">${item.emoji}</div>`;
    if(item.category==='poster') return `<div class="wardrobe-item-preview" style="background:${item.css}">${item.emoji}</div>`;
    if(SKIN_CATEGORIES.includes(item.category)) return `<div class="wardrobe-item-preview" style="background:${item.css}"></div>`;
    if(item.category==='uiSkin') return `<div class="wardrobe-item-preview">${item.effect==='sparkle'?'✨':item.effect==='confetti'?'🎉':'🧩'}</div>`;
    return '<div class="wardrobe-item-preview">❔</div>';
  }

  function previewGlyph(item){
    if(item.category==='wallpaper') return item.emoji;
    if(item.category==='windowTheme') return '🎨';
    if(item.category==='iconPack') return item.icons.mail;
    if(item.category==='cursor') return item.emoji||'🖱️';
    if(item.category==='decor') return item.emoji;
    if(item.category==='poster') return item.emoji;
    if(SKIN_CATEGORIES.includes(item.category)) return SKIN_GLYPHS[item.category];
    if(item.category==='uiSkin') return item.effect==='sparkle'?'✨':item.effect==='confetti'?'🎉':'🧩';
    return '🎁';
  }

  function isEquipped(item){
    if(window.EC_STORE.MULTI_SLOT_CATEGORIES[item.category]) return (profile.equipped[item.category]||[]).includes(item.id);
    return profile.equipped[item.category] === item.id;
  }

  function renderDailyShopHtml(){
    const S = window.EC_STORE, C = window.EC_COSMETICS;
    const shop = S.dailyShop(), cart = S.getCart(profile);
    const hours = Math.ceil((shop.refreshAt-Date.now())/3600000);
    return `<section class="daily-store-hero"><span class="store-eyebrow">SHOPPEYEE / COSMETICS</span><h2>A little refresh for your desk.</h2><p>Five daily finds. Pick your favorites and make them yours.</p><span>New selection in ${hours}h &middot; Refreshes at 00:00 UTC</span></section>
      <div class="store-section-head"><h3>Daily Specials</h3><button class="btn" data-tab="cart">&#128722; Cart (${cart.ids.length})</button></div>
      <div class="daily-store-grid">${shop.items.map(item=>{
        const owned=profile.inventory.includes(item.id), added=cart.ids.includes(item.id);
        return `<article class="daily-item">${itemPreviewHtml(item)}<h4>${item.name}</h4><p>${C.RARITY[item.rarity].label} &middot; ${C.CATEGORY_LABELS[item.category]}</p><strong>${S.itemPrice(item)} Sparks</strong><button class="btn" data-cart-id="${item.id}" ${owned?'disabled':''}>${owned?'Owned':added?'Remove from cart':'Add to cart'}</button><button class="store-preview" data-preview-id="${item.id}">Preview</button></article>`;
      }).join('')}</div>`;
  }
  function renderCartHtml(){
    const S=window.EC_STORE, cart=S.getCart(profile), C=window.EC_COSMETICS;
    const items=cart.ids.map(id=>C.getItem(id));
    const total=items.reduce((sum,item)=>sum+S.itemPrice(item),0);
    return `<div class="store-section-head"><h2>Your cart</h2><button class="btn" data-tab="featured">Continue shopping</button></div>
      <div class="store-cart-list">${items.length ? items.map(item=>`<article class="store-cart-row">${itemPreviewHtml(item)}<div><h3>${item.name}</h3><p>${C.RARITY[item.rarity].label} &middot; ${C.CATEGORY_LABELS[item.category]} &middot; 1x</p></div><strong>${S.itemPrice(item)} Sparks</strong><button class="btn" data-cart-id="${item.id}" aria-label="Remove ${item.name}">Remove</button></article>`).join('') : '<p class="store-empty">Your cart is empty. Find something you love in Daily Specials.</p>'}</div>
      <div class="store-checkout"><span>Total <b>${total} Sparks</b> &middot; Balance ${profile.currency} Sparks</span><button class="btn btn-accept" id="store-checkout" data-date="${cart.date}" ${!items.length || total>profile.currency?'disabled':''}>Checkout</button></div>${total>profile.currency?'<p>Not enough Sparks. Complete a client project to earn more.</p>':''}
      <details class="store-history"><summary>Purchase history</summary>${(profile.purchases||[]).slice().reverse().map(order=>`<p>${order.date.slice(0,10)} &middot; ${order.ids.map(id=>C.getItem(id)?.name || 'Cosmetic').join(', ')} &middot; ${order.total} Sparks</p>`).join('') || '<p>No purchases yet.</p>'}</details>`;
  }
  function checkoutCart(date){
    const result=window.EC_STORE.checkout(profile,date);
    if(result.error){ window.EC_SOUND.play('error'); showToast(result.error); renderShopPanel(); return; }
    updateCurrencyDisplays(); renderShopPanel();
    const message=document.getElementById('delivery-message');
    const button=document.getElementById('delivery-continue');
    const truck=document.getElementById('delivery-truck');
    message.textContent='Shipping your new favorites...'; button.disabled=true; truck.classList.add('shipping');
    window.EC_MODAL.show('modal-delivery');
    window.EC_SOUND.play('coin');
    const reduced=profile.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(()=>{ truck.classList.remove('shipping'); message.textContent=`Delivered! ${result.items.length} item${result.items.length===1?'':'s'} added to your wardrobe.`; button.disabled=false; },reduced?0:900);
  }

  function renderWardrobeTabHtml(){
    const C = window.EC_COSMETICS;
    const catBtns = C.CATEGORY_ORDER.map(c=>
      `<button class="wardrobe-cat-btn ${wardrobeCategory===c?'active':''}" data-cat="${c}">${C.CATEGORY_LABELS[c]}</button>`
    ).join('');
    const items = C.itemsByCategory(wardrobeCategory);
    const ownedTotal = profile.inventory.length;
    const catalogTotal = C.ITEMS.length;
    const slotCap = window.EC_STORE.MULTI_SLOT_CATEGORIES[wardrobeCategory];
    const extra = slotCap
      ? `<div class="wardrobe-item-slot-count">${(profile.equipped[wardrobeCategory]||[]).length}/${slotCap} ${C.CATEGORY_LABELS[wardrobeCategory].toLowerCase()} slots used — click an owned item to toggle it</div>`
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

  function renderUpgradesTabHtml(){
    const cards = window.EC_STORE.UPGRADES.map(upgrade => {
      const owned = window.EC_STORE.hasUpgrade(profile, upgrade.id);
      const affordable = profile.currency >= upgrade.price;
      return `<article class="upgrade-card ${owned?'owned':''}">
        <div class="upgrade-icon">${upgrade.icon}</div>
        <div class="upgrade-copy"><h3>${upgrade.name}</h3><p>${upgrade.description}</p></div>
        <button class="upgrade-buy-btn ${affordable || owned ? '' : 'insufficient'}" data-upgrade-id="${upgrade.id}" ${owned?'disabled':''}>${owned ? 'Installed' : `${upgrade.price} ✨ Buy`}</button>
      </article>`;
    }).join('');
    return `<section class="upgrades-hero"><h2>🛠️ Studio Upgrades</h2><p>Spend Sparks on guaranteed, permanent editing assists. They make the workspace friendlier but never change your grade.</p><div class="gacha-balance">✨ ${profile.currency} Sparks</div></section><div class="upgrade-list">${cards}</div>`;
  }

  function renderShopPanel(){
    const panel = document.getElementById('shop-panel');
    let html = `<div class="shop-tabs">
      <button class="shop-tab-btn ${shopTab==='featured'?'active':''}" data-tab="featured">Daily Specials</button>
      <button class="shop-tab-btn ${shopTab==='wardrobe'?'active':''}" data-tab="wardrobe">🧥 Wardrobe</button>
    </div>`;
    html = html.replace('</div>', `<button class="shop-tab-btn ${shopTab==='upgrades'?'active':''}" data-tab="upgrades">🛠️ Upgrades</button></div>`);
    html += shopTab === 'featured' ? renderDailyShopHtml() : shopTab === 'cart' ? renderCartHtml() : shopTab === 'wardrobe' ? renderWardrobeTabHtml() : renderUpgradesTabHtml();
    panel.innerHTML = html;

    panel.querySelectorAll('[data-tab]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ shopTab = btn.dataset.tab; window.EC_SOUND.play('tabSwitch'); renderShopPanel(); });
    });

    panel.querySelectorAll('[data-preview-id]').forEach(el=>{
      el.addEventListener('click', e=>{
        e.stopPropagation();
        const item = window.EC_COSMETICS.getItem(el.dataset.previewId);
        if(item) openCosmeticPreview(item);
      });
    });

    panel.querySelectorAll('[data-cart-id]').forEach(btn=>btn.addEventListener('click',()=>{
      window.EC_STORE.toggleCart(profile,btn.dataset.cartId); renderShopPanel();
    }));
    const checkoutButton=panel.querySelector('#store-checkout');
    if(checkoutButton) checkoutButton.addEventListener('click',()=>checkoutCart(checkoutButton.dataset.date));
    if(shopTab === 'wardrobe') {
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
    } else {
      panel.querySelectorAll('[data-upgrade-id]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const upgrade = window.EC_STORE.buyUpgrade(profile, btn.dataset.upgradeId);
          if(!upgrade){ window.EC_SOUND.play('error'); return; }
          window.EC_SOUND.play('equip');
          updateCurrencyDisplays();
          showToast(`🛠️ ${upgrade.name} installed!`, 2600);
          renderShopPanel();
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
      : 'Not owned yet - watch for it in Daily Specials';

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

  function save(){ window.EC_STORE.save(profile); }

  // ---------------- Toast ----------------
  function showToast(html, duration){
    const t = document.getElementById('toast-levelup');
    t.innerHTML = html;
    t.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(()=>t.classList.add('hidden'), duration||3800);
  }

  // Record progress only after the player sends their reply and attachment.
  let replyTimer=null;
  function scheduleClientReply(){
    clearTimeout(replyTimer);
    const waiting=profile.pendingClientReply;
    if(!waiting) return;
    replyTimer=setTimeout(()=>{
      const level=window.EC_LEVELS.find(l=>l.id===waiting.levelId);
      if(!level){delete profile.pendingClientReply;save();return;}
      pendingSubmission={level,result:waiting.result,elapsedMs:waiting.elapsedMs,elements:waiting.elements};
      delete profile.pendingClientReply;
      deliverClientReply();
    },Math.max(0,waiting.dueAt-Date.now()));
  }
  function finishMissionSubmission(){
    if(!pendingSubmission) return;
    const {level,result,elapsedMs}=pendingSubmission;
    profile.pendingClientReply={levelId:level.id,result,elapsedMs,elements:window.EC_EDITOR.getElements(),dueAt:Date.now()+3000};
    pendingSubmission=null; save(); openMailApp();
    showToast('Reply sent! Your client is reviewing the attached design.',2800);
    scheduleClientReply();
  }
  // Fires when the "client is reviewing" delay elapses: grades the work and
  // banks the rewards in the background, but doesn't force the reply open —
  // it just lands as a normal, clickable reply in the inbox, same as any
  // other piece of mail, until the player opens it themselves.
  function deliverClientReply(){
    if(!pendingSubmission) return;
    const { level, result, elapsedMs, elements } = pendingSubmission;
    pendingSubmission = null;
    window.EC_SOUND.play('newMail');
    const { newBadges, currencyEarned, daily, needsRevision, missionComplete } = window.EC_STORE.recordSubmission(profile, level, result, elapsedMs);
    profile.readyReply = { levelId: level.id, result, missionComplete, needsRevision, elements, newBadges, currencyEarned, daily };
    save();
    refreshHeader();
    openMailApp();
    showToast(`📧 New reply from ${level.clientName}`, 3200);
  }

  // Player opens the reply themselves from the inbox — this is where the
  // grade/reward toast and the actual reply UI show up, not at delivery time.
  function openReadyReply(level){
    const ready = profile.readyReply;
    if(!ready || ready.levelId !== level.id) return;
    delete profile.readyReply;
    save();
    const { result, missionComplete, needsRevision, elements, newBadges, currencyEarned, daily } = ready;
    const prevLevel = window.EC_STORE.levelFromTotalXp(profile.totalXp).level;
    const newLevel = window.EC_STORE.levelFromTotalXp(profile.totalXp).level;
    if(needsRevision){
      showToast(`📧 ${level.clientName} sent this back for another pass.`, 3500);
    } else {
      let toastHtml = `🎉 ${result.grade} grade (${result.stars}★) — +${result.xpAwarded} XP · +${currencyEarned} ✨ Sparks!`;
      if(result.mission.mastery) toastHtml += '<br/>★ Mission mastery bonus earned!';
      if(newLevel > prevLevel) toastHtml += `<br/>⭐ Level up! You are now Level ${newLevel}.`;
      if(newBadges.length) toastHtml += `<br/>🏅 New badge: ${newBadges.map(id=>window.EC_STORE.BADGES.find(b=>b.id===id).name).join(', ')}`;
      if(daily.claimed) toastHtml += `<br/>🔥 Daily mission streak ${daily.streak} — +${daily.bonus} Sparks!`;
      showToast(toastHtml, 4500);
    }
    window.EC_MAIL.openClientReply(level, result, missionComplete, ()=>{
      renderCurrentFolder();
      if(!needsRevision) return;
      showLoadingTransition((finishFade)=>{
        showScreen('screen-editor', ()=>{
          window.EC_EDITOR.open(level, elements);
          levelStartTime = Date.now();
          startTimerIfNeeded();
          finishFade();
        });
      });
    });
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
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12; if(h===0) h = 12;
    const text = `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
    const startDay = profile.commissions?.startDay;
    const today = Math.floor(now.getTime()/86400000);
    const day = Math.max(1, startDay == null ? 1 : today - startDay + 1);
    const taskbarClock = document.getElementById('taskbar-clock');
    taskbarClock.dataset.time = text;
    taskbarClock.innerHTML = `<span>Day ${day}</span><span>${text}</span>`;
    const desktopClock = document.getElementById('desktop-clock');
    if(desktopClock) desktopClock.textContent = text;
    updateMiniDesktop();
  }

  // ---------------- Desktop apps ----------------
  function openMailApp(){
    showScreen('screen-shell');
    currentFolder = 'inbox';
    renderCurrentFolder();
    pikoAdvanceToInbox();
  }
  function openStatsApp(){
    showScreen('screen-stats');
    renderStatsPanel();
  }

  // Profile and Stats are quick-glance taskbar tools. Keep the user on the
  // current screen and lend the existing live stats panel to a small window
  // anchored immediately above whichever taskbar button opened it.
  let taskbarStatsBorrowed = null;
  function profileQuickPanelMarkup(){
    const average = profile.history.length ? profile.history.reduce((sum,item)=>sum + item.score,0)/profile.history.length : 0;
    const filledStars = Math.max(0,Math.min(5,Math.round(average/20)));
    const stars = Array.from({length:5},(_,i)=>`<span class="${i<filledStars?'filled':''}">${i<filledStars?'★':'☆'}</span>`).join('');
    const unlocked = new Set(profile.unlockedBadges || []);
    const badges = Array.from({length:12},(_,i)=>`<span class="profile-badge-dot ${window.EC_STORE.BADGES[i] && unlocked.has(window.EC_STORE.BADGES[i].id)?'unlocked':''}"></span>`).join('');
    return `<section class="profile-quick-card">
      <img class="profile-quick-avatar" src="assets/icons/profile.svg" alt="" />
      <h2>Hi, User!</h2>
      <div class="profile-quick-stars" aria-label="${filledStars} out of 5 stars">${stars}</div>
      <div class="profile-quick-strip">Junior Designer</div>
      <div class="profile-quick-strip">EyeCoins: $${Number(profile.currency || 0).toFixed(2)}</div>
      <div class="profile-quick-strip">Badges</div>
      <div class="profile-badge-grid">${badges}</div>
      <button class="profile-quick-action" id="profile-quick-settings">⚙ Settings</button>
      <button class="profile-quick-action" id="profile-quick-signout">⇥ Sign out</button>
    </section>`;
  }
  function openTaskbarStatsPopup(anchor, mode){
    closeMonitorAppPopup(true);
    const popup = document.getElementById('taskbar-stats-popup');
    const body = document.getElementById('taskbar-stats-popup-body');
    const content = document.querySelector('#screen-stats .app-content-wrap');
    if(!popup || !body || !content) return;
    const isStats = mode === 'stats';
    popup.classList.toggle('profile-layout', !isStats);
    if(isStats){
      if(!taskbarStatsBorrowed){
        taskbarStatsBorrowed = { el:content, parent:content.parentNode, next:content.nextElementSibling };
        body.replaceChildren(content);
      }
      renderStatsPanel();
    }else{
      if(taskbarStatsBorrowed){
        taskbarStatsBorrowed.parent.insertBefore(taskbarStatsBorrowed.el, taskbarStatsBorrowed.next);
        taskbarStatsBorrowed = null;
      }
      body.innerHTML = profileQuickPanelMarkup();
      document.getElementById('profile-quick-settings').addEventListener('click', ()=>{ closeTaskbarStatsPopup(); openSettingsApp(); });
      document.getElementById('profile-quick-signout').addEventListener('click', ()=>{ closeTaskbarStatsPopup(); showScreen('screen-home'); });
    }
    document.getElementById('taskbar-stats-popup-title').textContent = isStats ? 'Studio Stats' : 'Profile';
    document.getElementById('taskbar-stats-popup-icon').src = isStats ? 'assets/icons/stats-icon.svg' : 'assets/icons/profile.svg';
    popup.classList.remove('hidden');
    const bar = document.getElementById('global-taskbar').getBoundingClientRect();
    const button = anchor.getBoundingClientRect();
    popup.style.left = Math.max(12, Math.min(button.left, innerWidth - popup.offsetWidth - 12)) + 'px';
    popup.style.bottom = Math.max(8, innerHeight - bar.top + 8) + 'px';
    document.getElementById('taskbar-profile').setAttribute('aria-expanded', String(!isStats));
  }
  function closeTaskbarStatsPopup(){
    const popup = document.getElementById('taskbar-stats-popup');
    if(!popup || popup.classList.contains('hidden')) return;
    popup.classList.add('hidden');
    if(taskbarStatsBorrowed){
      taskbarStatsBorrowed.parent.insertBefore(taskbarStatsBorrowed.el, taskbarStatsBorrowed.next);
      taskbarStatsBorrowed = null;
    }
    document.getElementById('taskbar-profile').setAttribute('aria-expanded','false');
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

    // Centralized on the whole desk scene rather than just the monitor,
    // since the popup window floats well beyond the monitor's own bounds —
    // clicking anywhere outside it (not just within the tiny monitor) should
    // dismiss it, same as any other floating window.
    document.getElementById('desk-scene').addEventListener('click', e=>{
      // composedPath() is captured at dispatch time, before any handler runs —
      // e.target.closest() would break here, because clicking something
      // inside the popup (e.g. a Shop tab) can re-render that content via
      // innerHTML, detaching e.target from the document before this bubble
      // listener runs, which would make .closest() wrongly report "outside."
      const path = e.composedPath();
      const popup = document.getElementById('monitor-app-popup');
      if(path.includes(popup)) return;
      if(!popup.classList.contains('hidden')){ closeMonitorAppPopup(); return; }
      if(path.includes(document.getElementById('sticky-note-settings'))){ openMonitorAppPopup('settings', { noteStyle:true }); return; }
      const iconEl = e.target.closest('.mini-desktop-icon');
      if(iconEl && iconEl.dataset.app === 'stats'){
        // Profile & Stats has too much detail for the small floating preview
        // window — jump straight to the real full-screen app instead.
        showScreen('screen-desktop', ()=> openStatsApp());
        return;
      }
      if(iconEl){ openMonitorAppPopup(iconEl.dataset.app); return; }
      if(path.includes(document.getElementById('mini-desktop'))) miniDesktopBackgroundAction();
    });
    document.getElementById('sticky-note-settings').addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openMonitorAppPopup('settings', { noteStyle:true }); }
    });
    document.getElementById('mini-desktop').addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); miniDesktopBackgroundAction(); }
    });
    document.getElementById('monitor-app-popup-close').addEventListener('click', ()=>closeMonitorAppPopup());
    initPikoGuideChain();

    document.getElementById('icon-mail').addEventListener('click', openMailApp);
    document.getElementById('icon-maker').addEventListener('click', ()=>{
      window.EC_PIKO.hideBubble();window.EC_PIKO.clearTarget();
      showScreen('screen-maker', ()=>window.EC_MAKER.open());
    });
    document.getElementById('icon-stats').addEventListener('click', e=>openTaskbarStatsPopup(e.currentTarget,'stats'));
    document.getElementById('icon-shop').addEventListener('click', openShopApp);
    document.getElementById('icon-settings').addEventListener('click', openSettingsApp);

    document.getElementById('mail-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('stats-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('settings-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('shop-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));

    document.getElementById('taskbar-home').addEventListener('click', ()=>{ closeTaskbarStatsPopup(); showScreen('screen-desktop'); });
    // A way back to the title screen from the real desktop — matters most in
    // fullscreen, where there's no browser chrome to fall back on.
    document.getElementById('desktop-watermark-btn').addEventListener('click', ()=>showScreen('screen-home'));
    document.getElementById('taskbar-profile').addEventListener('click', e=>openTaskbarStatsPopup(e.currentTarget,'profile'));
    document.getElementById('taskbar-stats-popup-close').addEventListener('click', closeTaskbarStatsPopup);
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeTaskbarStatsPopup(); });
    document.getElementById('taskbar-shop').addEventListener('click', openShopApp);
    document.getElementById('maker-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    window.EC_MAKER.init();
    document.getElementById('delivery-continue').addEventListener('click',()=>{
      window.EC_MODAL.hide('modal-delivery'); shopTab='wardrobe'; renderShopPanel();
    });
    let storeDate=window.EC_STORE.dailyShop().date;
    setInterval(()=>{
      const today=window.EC_STORE.dailyShop().date;
      if(today!==storeDate){ storeDate=today; renderShopPanel(); }
    },1000);
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
        showLoadingTransition((finishFade)=>{
          showScreen('screen-editor', ()=>{
            window.EC_EDITOR.open(level);
            levelStartTime = Date.now();
            startTimerIfNeeded();
            finishFade();
            if(pikoStage === 'element'){
              requestAnimationFrame(()=>{
                const el = document.querySelector('#editor-canvas .el:not([data-locked="1"])');
                if(el){ window.EC_PIKO.pointAt(el); window.EC_PIKO.say(window.EC_PIKO.SCRIPT.workspace.element, { top:true }); }
              });
            }
          });
        });
      },
      onSend: () => finishMissionSubmission(),
      onOpenReply: level => openReadyReply(level)
    });

    // Save opens the familiar type-to-reveal reply. The client responds and
    // rewards are recorded only after the message and edited file are sent.
    window.EC_EDITOR.setOnSubmit(result => {
      stopTimer();
      const level = window.EC_EDITOR.getLevel();
      const elapsedMs = levelStartTime ? (Date.now() - levelStartTime) : 0;
      pendingSubmission = { level, result, elapsedMs };
      window.EC_MAIL.openCompose(level, result);
    });

    currentFolder = 'inbox';
    scheduleClientReply();
    let inboxDay=Math.floor(Date.now()/86400000);
    setInterval(()=>{const day=Math.floor(Date.now()/86400000);if(day!==inboxDay){inboxDay=day;refreshHeader();if(document.getElementById('screen-shell').classList.contains('active'))renderCurrentFolder();}},1000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
