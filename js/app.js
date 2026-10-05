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
  const openApps = new Set();
  const TASKBAR_APPS = {
    'screen-shell':['Mail','📬'], 'screen-maker':['Level Maker','🛠️'],
    'screen-browser':['Browser','🌐'], 'screen-shop':['Shop','🛍️'],
    'screen-stats':['Stats','📊'], 'screen-editor':['Editor','✏️'],
    settings:['Settings','⚙️'], profile:['Profile','👤'], stats:['Stats','📊']
  };
  // Running apps use the same icon art as the desktop and taskbar.
  const sprite = sym => `<svg class="game-taskbar-icon" aria-hidden="true"><use href="assets/icons/editor-sprite.svg#${sym}"/></svg>`;
  const iconImg = file => `<img src="assets/icons/${file}" alt="" aria-hidden="true" />`;
  const TASKBAR_ICONS = {
    'screen-shell':sprite('mail'), 'screen-shop':sprite('shop'), 'screen-editor':iconImg('maker-icon.svg'),
    'screen-maker':iconImg('maker-icon.svg'), 'screen-browser':iconImg('browser-icon.svg'),
    'screen-stats':iconImg('stats-icon.svg'), stats:iconImg('stats-icon.svg'), settings:sprite('settings'), profile:sprite('person'),
  };
  function renderTaskbarApps(active){
    const host = document.getElementById('taskbar-open-apps');
    if(!host) return;
    host.replaceChildren();
    openApps.forEach(id=>{
      const spec=TASKBAR_APPS[id];
      if(!spec || id==='profile') return; // Profile is pinned
      const button=document.createElement('button');
      button.type='button';
      button.className='taskbar-running-app'+(active===id?' active':'');
      button.dataset.app=id;
      button.setAttribute('aria-label',`Switch to ${spec[0]}`);
      button.title=spec[0];
      button.innerHTML=TASKBAR_ICONS[id] || `<span aria-hidden="true">${spec[1]}</span>`;
      button.addEventListener('click',()=>{
        if(id==='settings'){ openSettingsApp(); return; }
        if(id==='profile' || id==='stats'){
          showScreen('screen-desktop',()=>openTaskbarStatsPopup(document.getElementById(id==='profile'?'icon-profile':'icon-stats'),id),{preserve:true});
          return;
        }
        if(document.getElementById(id).classList.contains('active')) showScreen('screen-desktop',null,{preserve:true});
        else{
          if(id==='screen-shop') returnShopPanel();
          showScreen(id, id==='screen-shop' ? renderShopPanel : undefined);
        }
      });
      host.appendChild(button);
    });
  }

  function announce(text){
    document.getElementById('a11y-announcer').textContent = text;
  }

  // onShown fires exactly when `name` actually gets .active applied — which
  // is NOT necessarily synchronous with this call returning, since the
  // outgoing screen may still be mid-closing-animation. Anything that reads
  // layout (e.g. EC_EDITOR.open() measuring the canvas wrap's size) MUST
  // wait for onShown rather than running right after showScreen() returns,
  // or it'll measure a still-display:none element and compute a bogus size.
  function showScreen(name, onShown, options={}){
    // Guarantee any content currently on loan to the monitor popup (see
    // openMonitorAppPopup) is back in its real screen before that screen
    // might be shown for real — otherwise it would appear empty. Instant,
    // not animated — the screen switch itself is about to animate anyway.
    closeMonitorAppPopup(true);
    const current = document.querySelector('.screen.active');
    const reduceMotion = document.body.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swap = () => {
      if(name==='screen-home'){
        closeSettingsWindow();
        closeTaskbarStatsPopup();
        openApps.clear();
      }
      if(name==='screen-desktop' && current && !options.preserve) openApps.delete(current.id);
      if(TASKBAR_APPS[name]) openApps.add(name);
      const settingsWindow=document.getElementById('desktop-settings-window');
      if(settingsWindow && name!=='screen-desktop') settingsWindow.hidden=true;
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','closing'));
      document.getElementById(name).classList.add('active');
      renderTaskbarApps(name==='screen-desktop' && settingsWindow && !settingsWindow.hidden?'settings':name);
      if(window.EC_FIT) window.EC_FIT();
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
  const pikoEnabled = !window.EC_NO_PIKO; // e2e tests opt out
  let pikoStage = null;
  function isFirstDay(){
    return !profile.onboarding?.seen && profile.completed.length === 0 && profile.history.length === 0;
  }
  // Piko's intro: three lines, then he points at the Mail icon once the
  // first client email arrives — same beats as the reference build's
  // pikoScript.tutorial, just driven by EC_PIKO instead of a static modal.
  function runPikoIntro(){
    const P = window.EC_PIKO, lines = P.SCRIPT.tutorial;
    document.body.classList.add('piko-intro', 'piko-no-badge'); // apps locked while Piko talks; mail "arrives" later
    P.say(lines[0], { onDone: ()=>{
      P.say(lines[1], { onDone: ()=>{
        window.EC_SOUND.play('newMail');
        const mailIcon = document.getElementById('icon-mail');
        if(mailIcon) mailIcon.classList.add('tutorial-mail-pulse');
        announce('New email received.');
        // The red count pops in first; a beat later Piko points it out
        // (the dim fades in together with his "you've got mail" line).
        document.body.classList.remove('piko-no-badge');
        setTimeout(()=>{
          document.body.classList.remove('piko-intro');
          pikoStage = 'mail';
          P.pointAt(mailIcon);
          P.say(lines[2]);
        }, 400); // + Piko's own 0.6s pop-in delay ≈ 1s after the count appears
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
    if(profile.onboarding) profile.onboarding.lessons = {};
    window.EC_PIKO.clearTarget();
    window.EC_PIKO.hideBubble();
    showScreen('screen-desktop', ()=>{
      document.getElementById('icon-mail')?.classList.remove('tutorial-mail-pulse');
      runPikoIntro();
    });
  }
  // Day one in the editor: intro, red problem dots pop in one by one, then
  // "click any" (no highlight). The click handler continues the tour.
  function runPikoWorkspaceTour(level){
    const P = window.EC_PIKO, W = P.SCRIPT.workspace, body = document.body;
    profile.onboarding = profile.onboarding || {};
    // Promise helpers: a line the player clicks through, and "wait until".
    const talk = (line, opts = {}) => new Promise(done => P.say(line, Object.assign({ top:true }, opts, { onDone:done })));
    const until = test => new Promise(done => { const t = setInterval(()=>{ if(test()){ clearInterval(t); done(); } }, 200); });
    const elDiv = id => document.querySelector(`#editor-canvas .el[data-id="${id}"]`);
    const goalsMet = id => window.EC_GRADING.checkGoals(level, window.EC_EDITOR.getElements())
      .filter(r => window.EC_GRADING.goalIds(r.goal.check).includes(id)).every(r => r.met);
    // Glow (no dim) so the player can see exactly what to click.
    const glow = id => { document.querySelectorAll('.piko-glow').forEach(n => n.classList.remove('piko-glow')); if(id) elDiv(id)?.classList.add('piko-glow'); };
    const step = (sel, line, opts) => { P.pointAt(document.querySelector(sel)); return talk(line, opts); };
    (async ()=>{
      body.classList.add('piko-tour-lock', 'piko-marks-hidden');
      await talk(W.intro);
      // Learn by doing: these lines can't be clicked away, only done.
      const wrap = document.getElementById('editor-canvas-wrap');
      P.say(W.pan, { top:true });
      let held = 0; // ~1s of actual panning, in 200ms ticks
      await until(()=>(held += wrap.classList.contains('panning') ? 1 : 0) >= 5);
      await new Promise(r => setTimeout(r, 2000)); // let them pan around a bit more
      P.say(W.zoom, { top:true });
      let zoomed = false; wrap.addEventListener('wheel', ()=>{ zoomed = true; }, { once:true });
      await until(()=>zoomed);
      await new Promise(r => setTimeout(r, 2000)); // let them play with zoom first
      const marks = [...document.querySelectorAll('#editor-canvas .el.needs-edit')];
      marks.forEach(m => m.classList.add('piko-mark-wait'));
      body.classList.remove('piko-marks-hidden');
      marks.forEach((m, i) => setTimeout(()=>{
        m.classList.remove('piko-mark-wait'); m.classList.add('piko-mark-pop');
        window.EC_SOUND.play('pikoLine');
        setTimeout(()=>m.classList.remove('piko-mark-pop'), 500);
      }, 300 + i * 350));
      // Let every dot pop in first, then Piko talks about them.
      P.hideBubble();
      await new Promise(r => setTimeout(r, 300 + marks.length * 350 + 400));
      await talk(W.problems);
      await talk(W.dotsLater);
      // Hands-on: fix "About" together.
      const practice = elDiv('about') && !goalsMet('about') ? 'about' : null;
      body.classList.remove('piko-tour-lock');
      if(practice){
        await talk(W.together);
        P.clearTarget(); glow(practice);
        P.say(W.selectAbout, { top:true });
        await until(()=>elDiv(practice)?.classList.contains('selected'));
        await step('#element-settings', W.controls, { left:true });
        P.clearTarget(); glow(practice);
        P.say(W.dragAbout, { top:true });
        // Praise only once it's lined up AND the mouse is let go.
        let down = false;
        const onDown = () => { down = true; }, onUp = () => { down = false; };
        document.addEventListener('pointerdown', onDown, true); document.addEventListener('pointerup', onUp, true);
        await until(()=>!down && goalsMet(practice));
        document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('pointerup', onUp, true);
        glow(null);
        await talk(W.nice);
      } else {
        P.clearTarget();
        P.say(W.element, { top:true });
        await until(()=>document.querySelector('#editor-canvas .el.selected'));
        await step('#element-settings', W.controls, { left:true });
      }
      await step('#screen-editor .editor-side-rail:not(.editor-right-rail)', W.tasks);
      await step('#tool-grid', W.grid);
      await step('#tool-grid-settings', W.gridSettings);
      body.classList.add('piko-no-submit');
      await step('#tool-save', W.submit, { left:true });
      body.classList.remove('piko-no-submit');
      P.clearTarget();
      pikoStage = null;
      profile.onboarding.seen = true;
      save();
      runPikoLevelTips(level, ()=>{});
    })();
  }
  // First reply to a client: type it out, attach the edited design, send.
  function initPikoComposeGuide(){
    const modal = document.getElementById('modal-compose');
    const until = test => new Promise(done => { const t = setInterval(()=>{ if(test()){ clearInterval(t); done(); } }, 200); });
    const $ = id => document.getElementById(id);
    new MutationObserver(async ()=>{
      profile.onboarding = profile.onboarding || {};
      if(!pikoEnabled || modal.classList.contains('hidden') || profile.onboarding.compose) return;
      profile.onboarding.compose = true; save();
      const P = window.EC_PIKO, C = P.SCRIPT.compose, open = () => !modal.classList.contains('hidden');
      // Only the step's own control is clickable; everything else (close,
      // backdrop, taskbar, inbox) is frozen so the reply can't be abandoned.
      const allow = (...els) => { document.querySelectorAll('.piko-allow').forEach(n => n.classList.remove('piko-allow')); els.forEach(n => n?.classList.add('piko-allow')); };
      document.body.classList.add('piko-focus');
      allow($('compose-body'));
      P.pointAt(modal.querySelector('.compose-card')); P.say(C.type, { top:true });
      await until(()=>!open() || !document.querySelector('#compose-body .ghost')?.textContent);
      allow($('compose-attach-btn'), $('attach-popover'));
      if(open()){ P.pointAt($('compose-attach-btn')); P.say(C.attach, { top:true }); }
      await until(()=>!open() || !$('attach-popover').classList.contains('hidden'));
      if(open()) P.pointAt($('attach-option-edited')); // the file to pick
      await until(()=>!open() || !$('compose-attachment-chip').classList.contains('hidden'));
      allow($('btn-send-mail'));
      if(open()){ P.pointAt($('btn-send-mail')); P.say(C.send, { top:true }); }
      await until(()=>!open());
      allow(); document.body.classList.remove('piko-focus');
      P.clearTarget(); P.hideBubble();
      // Sent: freeze the screen until the client's reply lands.
      if(!profile.onboarding.reply) document.body.classList.add('piko-lock-all');
    }).observe(modal, { attributes:true, attributeFilter:['class'] });
  }
  // Jobs 2 and 3 of the tutorial: once the reward card is gone, Piko points
  // at the new email; only that row works until it's opened.
  function pikoNextMail(level){
    profile.onboarding = profile.onboarding || {};
    const seen = profile.onboarding.nextMail = profile.onboarding.nextMail || {};
    if(!pikoEnabled || !(level.levelNumber > 1 && level.levelNumber <= 3) || seen[level.id]) return;
    seen[level.id] = true; save();
    const reward = document.getElementById('modal-reward');
    const t = setInterval(()=>{
      if(!reward.classList.contains('hidden')) return;
      clearInterval(t);
      setTimeout(()=>{
        const row = document.querySelector(`#mail-list .mail-item[data-level-id="${level.id}"]`);
        if(!row) return;
        const P = window.EC_PIKO;
        row.classList.add('piko-allow'); document.body.classList.add('piko-focus');
        P.pointAt(row); P.say(P.SCRIPT.nextMail(level.clientName));
        row.addEventListener('click', ()=>{
          row.classList.remove('piko-allow');
          P.clearTarget(); P.hideBubble();
          setTimeout(()=>document.body.classList.remove('piko-focus'), 1500); // spam clicks can't close it
        }, { once:true });
      }, 800);
    }, 200);
  }
  // Short Piko intro the first time each of the first three jobs opens.
  function runPikoLevelTips(level, done){
    const key = level.project || level.id; // lessons are keyed by client: mayo, yappers, haybuhay
    const P = window.EC_PIKO, lines = pikoEnabled && P.SCRIPT.levels[key];
    profile.onboarding = profile.onboarding || {};
    const seen = profile.onboarding.lessons = profile.onboarding.lessons || {};
    if(!lines || seen[key]){ requestAnimationFrame(done); return; }
    seen[key] = true; save();
    let lastSel = null;
    const step = i => {
      if(i >= lines.length){ P.clearTarget(); done(); return; }
      const [line, sel] = lines[i], el = sel && document.querySelector(sel);
      if(el){ P.pointAt(el); lastSel = sel; } // no selector: keep the last highlight
      P.say(line, { top:true, left:lastSel === '#element-settings', onDone: ()=>step(i + 1) });
    };
    requestAnimationFrame(()=>step(0));
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
      const level = window.EC_MAIL.arrivedInbox(profile)[0];
      if(row && level){
        // Only this email works for now: no scrolling, no other rows.
        row.classList.add('piko-target'); document.body.classList.add('piko-inbox');
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
        document.body.classList.remove('piko-inbox');
        document.querySelectorAll('.piko-target').forEach(n => n.classList.remove('piko-target'));
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        pikoStage = 'attachment';
        // Freeze everything (spam clicks can't close the email); after ~2.5s
        // of reading, only the attachment works.
        document.body.classList.add('piko-focus');
        setTimeout(()=>{
          const chip = document.getElementById('attachment-chip');
          chip?.classList.add('piko-allow');
          if(chip){ window.EC_PIKO.pointAt(chip); window.EC_PIKO.say(window.EC_PIKO.SCRIPT.previewGuide); }
        }, 2500);
        return;
      }
      if(['attachment','preview','accept'].includes(pikoStage) && e.target.closest('#btn-accept-job')){
        pikoStage = 'element';
        document.body.classList.remove('piko-focus');
        document.querySelectorAll('.piko-allow').forEach(n => n.classList.remove('piko-allow'));
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        return;
      }
      if(pikoStage === 'attachment' && e.target.closest('#attachment-chip')){
        // Let the player look at the preview; the Accept hint waits until it closes.
        pikoStage = 'preview';
        document.getElementById('attachment-chip').classList.remove('piko-allow');
        document.getElementById('btn-close-preview').classList.add('piko-allow');
        window.EC_PIKO.clearTarget(); window.EC_PIKO.hideBubble();
        const modal = document.getElementById('modal-preview');
        const obs = new MutationObserver(()=>{
          if(!modal.classList.contains('hidden') || pikoStage !== 'preview') return;
          obs.disconnect();
          document.getElementById('btn-close-preview').classList.remove('piko-allow');
          pikoStage = 'accept';
          // Accept unlocks the moment Piko's "Click Accept" line is on screen.
          const unlock = setInterval(()=>{
            if(document.querySelector('.piko-bubble:not(.hidden)')){ clearInterval(unlock); document.getElementById('btn-accept-job').classList.add('piko-allow'); }
          }, 50);
          window.EC_PIKO.pointAt(document.getElementById('btn-accept-job'));
          window.EC_PIKO.say(window.EC_PIKO.SCRIPT.acceptGuide, { top:true });
        });
        obs.observe(modal, { attributes:true, attributeFilter:['class'] });
        return;
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
    const unread = window.EC_MAIL.arrivedInbox(profile).length;
    const badge = document.getElementById('mini-badge-mail');
    if(badge){
      badge.textContent = unread;
      badge.classList.toggle('hidden', unread===0);
    }
    const currency = document.getElementById('mini-taskbar-currency');
    if(currency) currency.innerHTML = window.EC_MONEY(profile.currency);
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
    // Hide the mail count before the desktop even shows: on day one it
    // only "arrives" after Piko's second line.
    if(pikoEnabled && isFirstDay()) document.body.classList.add('piko-intro', 'piko-no-badge');
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
    if(window.EC_FIT) window.EC_FIT(); // Size is capped to what the screen can hold
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

      { tab:'gameplay', id:'panButton', label:'Pan the Canvas With', desc:'Which mouse button drags you around the design. Left click always selects and moves things.',
        tip:'Scroll the mouse wheel to zoom.', type:'seg', options:[['both','Right or Middle'],['right','Right'],['middle','Middle']] },
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
        <div class="settings-item-text"><div class="settings-item-label">🧪 Testing: Add coins</div>
        <div class="settings-item-desc">Grants a big batch of coins so you can browse the store freely. Temporary testing aid.</div></div>
        <div class="settings-item-control"><button class="btn btn-accept btn-sm" id="set-add-sparks">+¢99,999</button></div>
      </div>
      <div class="settings-item">
        <div class="settings-item-text"><div class="settings-item-label">🐾 Replay Piko's Tutorial</div>
        <div class="settings-item-desc">Runs Piko's first-day guide again from the desktop, even if you've already played.</div></div>
        <div class="settings-item-control"><button class="btn btn-accept btn-sm" id="set-replay-piko">Replay</button></div>
      </div></div>`;
      html += `<div class="settings-card settings-danger-card"><div class="settings-item">
        <div class="settings-item-text"><div class="settings-item-label">Reset Everything</div>
        <div class="settings-item-desc">Starts the game over: progress, coins, mail, settings and Piko's tutorial. Level Maker edits are kept.</div></div>
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
      if(resetBtn) resetBtn.addEventListener('click', resetEverything);
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
    const unreadCount = window.EC_MAIL.arrivedInbox(profile).length;
    for(const id of ['inbox-count','desktop-inbox-badge']){
      const badge=document.getElementById(id);
      badge.textContent=unreadCount;
      badge.classList.toggle('hidden',unreadCount===0);
    }
    updateCurrencyDisplays();
    updateMiniDesktop();
  }

  function updateCurrencyDisplays(){
    const text = window.EC_MONEY(profile.currency);
    const taskbar = document.getElementById('taskbar-currency');
    if(taskbar) taskbar.innerHTML = text;
    const shopChip = document.getElementById('shop-currency-chip');
    if(shopChip) shopChip.innerHTML = text;
    const desktopChip = document.getElementById('desktop-currency');
    if(desktopChip) desktopChip.innerHTML = text;
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
        <div class="stat-card"><div class="num">${window.EC_MONEY(profile.currency)}</div><div class="lbl">Coins</div></div>
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
    if(sceneEl){
      if(wp) sceneEl.style.setProperty('background', wp.css, sceneEl.id === 'desktop-wallpaper' ? 'important' : '');
      else sceneEl.style.removeProperty('background');
    }

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
    if(miniDesktop){
      if(wp) miniDesktop.style.setProperty('background', wp.css);
      else miniDesktop.style.removeProperty('background');
    }

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
    returnShopPanel();
    showScreen('screen-shop');
    updateCurrencyDisplays();
    renderShopPanel();
  }

  // ---------------- Browser app ----------------
  // A pretend web browser: a bookmarks home page, the EyeCon Store (the Shop
  // panel, borrowed into the browser window) and a website for every client
  // you've worked with, showing your approved redesigns page by page.
  const slug = text => text.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');
  let browserPage = { kind:'home' };
  function workedProjects(){
    return (window.EC_PROJECTS || []).filter(p => window.EC_LEVELS.some(l => l.project===p.id && profile.completed.includes(l.id)));
  }
  function returnShopPanel(){
    const panel = document.getElementById('shop-panel');
    const home = document.querySelector('#screen-shop .app-content-wrap');
    if(panel && home && panel.parentNode !== home) home.appendChild(panel);
  }
  function openBrowserApp(page){
    browserPage = page || { kind:'home' };
    showScreen('screen-browser', renderBrowser);
  }
  function renderBrowser(){
    const view = document.getElementById('browser-view');
    const tabs = document.getElementById('browser-tabs');
    const address = document.getElementById('browser-address');
    returnShopPanel();
    tabs.replaceChildren();
    view.replaceChildren();
    if(browserPage.kind === 'store'){
      address.textContent = 'https://www.eyecon.store';
      const panel = document.getElementById('shop-panel');
      view.appendChild(panel);
      updateCurrencyDisplays();
      renderShopPanel();
      return;
    }
    if(browserPage.kind === 'site'){
      const project = window.EC_PROJECTS.find(p => p.id === browserPage.project);
      const pages = window.EC_LEVELS.filter(l => l.project === project.id);
      const level = pages[browserPage.page] || pages[0];
      address.textContent = `https://www.${slug(project.name)}.com/${level.pageIndex ? slug(level.pageLabel) : ''}`;
      pages.forEach((p, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'browser-tab' + (p === level ? ' active' : '');
        tab.textContent = p.pageLabel;
        tab.setAttribute('aria-pressed', String(p === level));
        tab.addEventListener('click', () => { browserPage = { kind:'site', project:project.id, page:i }; renderBrowser(); });
        tabs.appendChild(tab);
      });
      const design = (profile.designs || {})[level.id];
      if(!design){
        const note = document.createElement('p');
        note.className = 'browser-note';
        note.textContent = profile.completed.includes(level.id)
          ? 'You finished this page before designs were saved, so this is the original version.'
          : "This page hasn't been redesigned yet. This is how it looks today.";
        view.appendChild(note);
      }
      const frame = document.createElement('div');
      frame.className = 'browser-page';
      view.appendChild(frame);
      const box = view.getBoundingClientRect();
      window.EC_EDITOR.renderStatic(frame, level, design || level.elements, { fitW: Math.max(200, box.width - 48), fitH: Math.max(160, box.height - (design ? 48 : 96)) });
      return;
    }
    address.textContent = 'eyecon://home';
    const heading = document.createElement('h2');
    heading.className = 'browser-home-title';
    heading.textContent = 'Bookmarks';
    view.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'browser-bookmarks';
    const card = (icon, name, url, page) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'browser-bookmark';
      b.innerHTML = `<span class="browser-bookmark-icon" aria-hidden="true">${icon}</span><b></b><small></small>`;
      b.querySelector('b').textContent = name;
      b.querySelector('small').textContent = url;
      b.addEventListener('click', () => { browserPage = page; renderBrowser(); });
      grid.appendChild(b);
    };
    card('🛍️', 'EyeCon Store', 'eyecon.store', { kind:'store' });
    workedProjects().forEach(p => card(p.avatarEmoji, p.name, `${slug(p.name)}.com`, { kind:'site', project:p.id, page:0 }));
    view.appendChild(grid);
    if(!workedProjects().length){
      const tip = document.createElement('p');
      tip.className = 'browser-note';
      tip.textContent = "Finish a client's page and their website will appear here.";
      view.appendChild(tip);
    }
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
    return `<section class="daily-store-hero"><span class="store-eyebrow">SHOPPEYEE / COSMETICS</span><h2>A little refresh for your desk.</h2><p>Boris Wallpaper is always here, alongside four daily finds.</p><span>New daily selection in ${hours}h &middot; Refreshes at 00:00 UTC</span></section>
      <div class="store-section-head"><h3>Daily Specials</h3><button class="btn" data-tab="cart">&#128722; Cart (${cart.ids.length})</button></div>
      <div class="daily-store-grid">${shop.items.map(item=>{
        const owned=profile.inventory.includes(item.id), added=cart.ids.includes(item.id);
        return `<article class="daily-item">${itemPreviewHtml(item)}<h4>${item.name}</h4><p>${C.RARITY[item.rarity].label} &middot; ${C.CATEGORY_LABELS[item.category]}</p><strong>${window.EC_MONEY(S.itemPrice(item))}</strong><button class="btn" data-cart-id="${item.id}" ${owned?'disabled':''}>${owned?'Owned':added?'Remove from cart':'Add to cart'}</button><button class="store-preview" data-preview-id="${item.id}">Preview</button></article>`;
      }).join('')}</div>`;
  }
  function renderCartHtml(){
    const S=window.EC_STORE, cart=S.getCart(profile), C=window.EC_COSMETICS;
    const items=cart.ids.map(id=>C.getItem(id));
    const total=items.reduce((sum,item)=>sum+S.itemPrice(item),0);
    return `<div class="store-section-head"><h2>Your cart</h2><button class="btn" data-tab="featured">Continue shopping</button></div>
      <div class="store-cart-list">${items.length ? items.map(item=>`<article class="store-cart-row">${itemPreviewHtml(item)}<div><h3>${item.name}</h3><p>${C.RARITY[item.rarity].label} &middot; ${C.CATEGORY_LABELS[item.category]} &middot; 1x</p></div><strong>${window.EC_MONEY(S.itemPrice(item))}</strong><button class="btn" data-cart-id="${item.id}" aria-label="Remove ${item.name}">Remove</button></article>`).join('') : '<p class="store-empty">Your cart is empty. Find something you love in Daily Specials.</p>'}</div>
      <div class="store-checkout"><span>Total <b>${window.EC_MONEY(total)}</b> &middot; Balance ${window.EC_MONEY(profile.currency)}</span><button class="btn btn-accept" id="store-checkout" data-date="${cart.date}" ${!items.length || total>profile.currency?'disabled':''}>Checkout</button></div>${total>profile.currency?'<p>Not enough coins. Complete a client project to earn more.</p>':''}
      <details class="store-history"><summary>Purchase history</summary>${(profile.purchases||[]).slice().reverse().map(order=>`<p>${order.date.slice(0,10)} &middot; ${order.ids.map(id=>C.getItem(id)?.name || 'Cosmetic').join(', ')} &middot; ${window.EC_MONEY(order.total)}</p>`).join('') || '<p>No purchases yet.</p>'}</details>`;
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
        <button class="upgrade-buy-btn ${affordable || owned ? '' : 'insufficient'}" data-upgrade-id="${upgrade.id}" ${owned?'disabled':''}>${owned ? 'Installed' : `${window.EC_MONEY(upgrade.price)} Buy`}</button>
      </article>`;
    }).join('');
    return `<section class="upgrades-hero"><h2>🛠️ Studio Upgrades</h2><p>Spend coins on guaranteed, permanent editing assists. They make the workspace friendlier but never change your grade.</p><div class="gacha-balance">${window.EC_MONEY(profile.currency)}</div></section><div class="upgrade-list">${cards}</div>`;
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
    if(!window.EC_STORE.beginWorkSubmission(profile)){
      showToast('Your workday is complete or a client reply is still waiting.',2800);return;
    }
    const {level,result,elapsedMs}=pendingSubmission;
    profile.pendingClientReply={levelId:level.id,result,elapsedMs,elements:window.EC_EDITOR.getElements(),dueAt:Date.now()+3000};
    pendingSubmission=null; save(); updateClock(); openMailApp();
    showToast('Reply sent! Your client is reviewing the attached design.',2800);
    scheduleClientReply();
  }
  // Fires when the "client is reviewing" delay elapses: the client's reply
  // lands in the inbox with its verdict. Nothing is paid yet; rewards are
  // banked when the player reads the reply and marks the task complete.
  function deliverClientReply(){
    if(!pendingSubmission) return;
    const { level, result, elapsedMs, elements } = pendingSubmission;
    pendingSubmission = null;
    window.EC_SOUND.play('newMail');
    const missionComplete = result.stars >= window.EC_STORE.REVISION_STAR_THRESHOLD && (!result.mission || result.mission.complete);
    profile.readyReply = { levelId: level.id, result, elapsedMs, missionComplete, elements };
    save();
    refreshHeader();
    openMailApp();
    showToast(`📧 New reply from ${level.clientName}`, 3200);
    // First client reply ever: Piko shows where it landed.
    profile.onboarding = profile.onboarding || {};
    if(pikoEnabled && !profile.onboarding.reply){
      profile.onboarding.reply = true; save();
      setTimeout(()=>{
        const row = document.querySelector(`#mail-list .mail-item[data-level-id="${level.id}"]`);
        document.body.classList.remove('piko-lock-all');
        if(row){ row.classList.add('piko-target', 'piko-allow'); document.body.classList.add('piko-inbox', 'piko-focus'); window.EC_PIKO.pointAt(row); }
        window.EC_PIKO.say(window.EC_PIKO.SCRIPT.reply.arrived(level.clientName));
        pikoStage = 'reply';
      }, 450);
    }
  }

  // Player opens the reply from the inbox. "Mark Completed" banks the
  // rewards and celebrates; "Back to Editor" records the review and reopens
  // the page. Closing the email leaves the reply waiting in the inbox.
  function openReadyReply(level){
    const ready = profile.readyReply;
    if(!ready || ready.levelId !== level.id) return;
    const { result, elapsedMs, missionComplete, elements } = ready;
    if(pikoStage === 'reply'){
      pikoStage = null;
      const P = window.EC_PIKO;
      P.clearTarget(); P.hideBubble();
      document.body.classList.remove('piko-inbox');
      document.querySelectorAll('.piko-target').forEach(n => n.classList.remove('piko-target', 'piko-allow'));
      document.body.classList.add('piko-focus'); // read first: only the button wakes up, with Piko
      setTimeout(()=>{
        document.getElementById('btn-accept-job').classList.add('piko-allow');
        P.pointAt(document.getElementById('btn-accept-job'));
        P.say(missionComplete ? P.SCRIPT.reply.complete : P.SCRIPT.reply.revise, { top:true });
        document.getElementById('btn-accept-job').addEventListener('click', ()=>{
          P.clearTarget(); P.hideBubble();
          document.body.classList.remove('piko-focus');
          document.getElementById('btn-accept-job').classList.remove('piko-allow');
        }, { once:true });
      }, 2000); // a moment to read their message first
    }
    window.EC_MAIL.openClientReply(level, result, missionComplete, ()=>{
      delete profile.readyReply;
      const prevLevel = window.EC_STORE.levelFromTotalXp(profile.totalXp).level;
      const outcome = window.EC_STORE.recordSubmission(profile, level, result, elapsedMs || 0);
      // Keep the client's words so Completed mail can show the whole thread.
      profile.history[0].reply = window.EC_MAIL.buildClientReplyText(level, result, missionComplete);
      profile.history[0].elements = elements; // the design the player sent, shown in Completed mail
      profile.revisionDrafts=Object.assign({},profile.revisionDrafts,{[level.id]:elements});
      if(outcome.missionComplete) profile.designs = Object.assign({}, profile.designs, { [level.id]: elements });
      save();
      refreshHeader();
      renderCurrentFolder();
      if(outcome.missionComplete){
        showRewardPopup(level, result, outcome, window.EC_STORE.levelFromTotalXp(profile.totalXp).level > prevLevel);
        // All three tutorial jobs done: Piko wraps up the basics.
        const tutorialIds = window.EC_LEVELS.filter(l => l.levelNumber <= 3).map(l => l.id);
        if(pikoEnabled && !profile.onboarding?.basics && tutorialIds.every(id => profile.completed.includes(id))){
          profile.onboarding = profile.onboarding || {}; profile.onboarding.basics = true; save();
          const P = window.EC_PIKO, lines = P.SCRIPT.basicsDone;
          const say = i => i < lines.length && P.say(lines[i], { top:true, onDone: ()=>say(i + 1) });
          setTimeout(()=>say(0), 1500);
        }
        return;
      }
      if(window.EC_STORE.workday(profile).submissions>=window.EC_STORE.dailyTaskLimit()){showDaySummary();return;}
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

  // Celebration card after marking a task complete: stars, coins, XP, streak
  // End-of-day animation (placeholder): a sunset over the hills before the
  // recap. Click or any key skips it; reduced motion shows it briefly, still.
  function playDayEndAnimation(dayNumber, done){
    const reduce = document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.createElement('div');
    el.className = 'day-end-scene' + (reduce ? ' still' : '');
    el.setAttribute('role','status');
    el.innerHTML = `<div class="day-end-sun"></div><div class="day-end-hill"></div><div class="day-end-text"><b>Day ${dayNumber} · 17:00</b><span>Clocking out…</span></div>`;
    document.body.appendChild(el);
    let finished = false;
    const finish = () => {
      if(finished) return; finished = true;
      document.removeEventListener('keydown', finish, true);
      el.classList.add('leaving');
      setTimeout(() => { el.remove(); done(); }, 300);
    };
    el.addEventListener('click', finish);
    document.addEventListener('keydown', finish, true);
    setTimeout(finish, reduce ? 1200 : 2600);
  }

  function showDaySummary(){
    const day=window.EC_STORE.workday(profile);
    if(day.submissions<window.EC_STORE.dailyTaskLimit() || profile.pendingClientReply || profile.readyReply)return;
    if(showDaySummary.animatedDay !== day.day){
      showDaySummary.animatedDay = day.day;
      playDayEndAnimation(day.day, showDaySummary);
      return;
    }
    let modal=document.getElementById('modal-workday');
    if(!modal){
      modal=document.createElement('div');modal.id='modal-workday';modal.className='modal-overlay hidden';
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','workday-title');
      modal.innerHTML='<div class="modal-card workday-card"><div id="workday-summary"></div><button class="btn btn-accept" id="next-workday">Continue to next day</button></div>';
      document.body.appendChild(modal);
      document.getElementById('next-workday').addEventListener('click',()=>{
        if(!window.EC_STORE.nextWorkday(profile))return;
        window.EC_MODAL.hide(modal);updateClock();refreshHeader();currentFolder='inbox';openMailApp();
      });
    }
    const summary=document.getElementById('workday-summary');
    summary.innerHTML=`<h2 id="workday-title">Day ${day.day} complete</h2><p>5:00 PM · Your shift is over</p><div class="workday-totals"><span>${day.submissions} submissions</span><span>${day.reviews.filter(r=>r.approved).length} approved</span><span>${day.reviews.length} client reviews</span><span>${window.EC_MONEY(day.coins)} earned</span><span>+${day.xp} XP</span></div><ul class="workday-reviews"></ul>`;
    day.reviews.forEach(review=>{
      const item=document.createElement('li');
      item.textContent=`${review.name} · ${review.page || 'Website'} — ${'★'.repeat(review.stars)}${'☆'.repeat(5-review.stars)} · ${review.approved?'Approved':'Needs revision'} · +${review.reward} coins`;
      summary.querySelector('ul').appendChild(item);
    });
    window.EC_MODAL.show(modal);document.getElementById('next-workday').focus();
  }

  // and badges, with a confetti burst unless particles/motion are off.
  function showRewardPopup(level, result, outcome, leveledUp){
    const { currencyEarned, daily, newBadges, rewardBreakdown } = outcome;
    const stars = '★'.repeat(outcome.stars) + '☆'.repeat(5 - outcome.stars);
    const lines = [
      `<li><span>Client payment</span><b>${window.EC_MONEY(rewardBreakdown.base)}</b></li>`,
      rewardBreakdown.starBonus ? `<li><span>Bonus stars</span><b>+${window.EC_MONEY(rewardBreakdown.starBonus)}</b></li>` : '',
      daily.claimed ? `<li><span>🔥 Daily streak ${daily.streak}</span><b>+${window.EC_MONEY(daily.bonus)}</b></li>` : '',
      `<li><span>Experience</span><b>+${result.xpAwarded} XP</b></li>`,
    ].join('');
    const extras = [
      leveledUp ? `⭐ Level up! You are now Level ${window.EC_STORE.levelFromTotalXp(profile.totalXp).level}.` : '',
      newBadges.length ? `🏅 New badge: ${newBadges.map(id=>window.EC_STORE.BADGES.find(b=>b.id===id).name).join(', ')}` : '',
    ].filter(Boolean).map(t=>`<p>${t}</p>`).join('');
    const card = document.getElementById('reward-card-body');
    card.innerHTML = `<div class="reward-stars" aria-label="${outcome.stars} out of 5 stars">${stars}</div>
      <h2 id="reward-title">Task complete!</h2>
      <p class="reward-sub">${level.clientName} · ${level.pageLabel}</p>
      <div class="reward-total">+${window.EC_MONEY(currencyEarned)}</div>
      <ul class="reward-lines">${lines}</ul>${extras}`;
    const fx = document.getElementById('reward-confetti');
    fx.replaceChildren();
    const particles = profile.settings.particles;
    if(particles !== 'off' && !profile.settings.reduceMotion){
      const colors = ['#9a6ae6','#6ccf8e','#f2a541','#e0728a','#5fb8d6','#f0c64a'];
      const count = particles === 'reduced' ? 24 : 60;
      for(let i=0;i<count;i++){
        const bit = document.createElement('span');
        bit.style.setProperty('--x', `${(Math.random()*2-1)*260}px`);
        bit.style.setProperty('--y', `${-120-Math.random()*260}px`);
        bit.style.setProperty('--r', `${Math.random()*720-360}deg`);
        bit.style.background = colors[i % colors.length];
        bit.style.animationDelay = `${Math.random()*0.15}s`;
        fx.appendChild(bit);
      }
    }
    window.EC_SOUND.play('revealLegendary');
    window.EC_MODAL.show('modal-reward');
    document.getElementById('btn-reward-collect').focus();
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
    if(!requestFn()){
      // iPhone Safari can't make a web page fullscreen; adding it to the Home
      // Screen opens it without browser bars, so the button explains that.
      if(navigator.standalone){ btn.style.display = 'none'; return; }
      btn.addEventListener('click', ()=>showToast('📱 For fullscreen on iPhone: tap the Share button, then “Add to Home Screen”, and open EyeCon from there.', 6000));
      return;
    }
    btn.addEventListener('click', toggleFullscreen);
    ['fullscreenchange','webkitfullscreenchange','MSFullscreenChange'].forEach(evt=>{
      document.addEventListener(evt, updateFullscreenBtn);
    });
  }

  // ---------------- Clock ----------------
  function updateClock(){
    const shift=window.EC_STORE.workday(profile);
    const text=['8:00 am','11:00 am','2:00 pm','5:00 pm'][Math.min(3,shift.submissions)];
    const day=shift.day;
    const taskbarClock = document.getElementById('taskbar-clock');
    taskbarClock.dataset.time = text;
    const hhmm = ['08:00','11:00','14:00','17:00'][Math.min(3,shift.submissions)];
    taskbarClock.innerHTML = `<span class="taskbar-time">${hhmm}</span><span class="taskbar-day">Day ${day}</span>`;
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
  // Settings list inside the profile card (opened with its Settings button):
  // sliders for sound, music and size, an on/off switch for reduced motion,
  // and ◀ ▶ arrows to pick a colorblind mode. 50% is the default for the
  // sliders and matches the original volume and look.
  const SCALE_FOR = { 25:0.8, 50:1, 75:1.2, 100:1.4 };
  const CVD_STEPS = ['none','protanopia','deuteranopia','tritanopia'];
  const CVD_NAMES = { none:'Off', protanopia:'Red-blind', deuteranopia:'Green-blind', tritanopia:'Blue-blind' };
  function quickLevel(key){
    const v = profile.settings[key + 'Level'];
    return v == null ? 50 : v;
  }
  // Editor look options (see editor.js): stored per browser, not in the profile.
  const EDITOR_LAYOUTS = ['double','single','compact'];
  const EDITOR_LAYOUT_NAMES = { double:'2 bars', single:'1 bar', compact:'1 bar, no top bar' };
  const EDITOR_THEMES = ['blue','classic'];
  const EDITOR_THEME_NAMES = { blue:'Blue', classic:'Classic' };
  function setQuickSetting(key, value){
    const s = profile.settings;
    if(key === 'motion') s.reduceMotion = !!value;
    else if(key === 'cvd') s.cvd = value;
    else{
      s[key + 'Level'] = value;
      if(key === 'sfx'){ s.soundEnabled = value > 0; s.soundVolume = value/100 * 1.2; }
      if(key === 'music'){ s.musicEnabled = value > 0; s.musicVolume = value/100 * 0.56; }
      if(key === 'scale'){ s.uiScale = SCALE_FOR[value]; }
    }
    save();
    applySettings();
    requestAnimationFrame(positionStatsPopup);
  }
  // Settings > Reset all: wipe every game save except Level Maker work, then start fresh.
  function resetEverything(){
    if(!window.confirm('Reset everything? Progress, mail, settings and the tutorial start over. Level Maker edits are kept.')) return;
    const keep = ['eyecon_level_overrides', 'eyecon.level-maker.v1', 'eyecon.maker-grid'];
    Object.keys(localStorage).filter(k => /^eyecon/.test(k) && !keep.includes(k)).forEach(k => localStorage.removeItem(k));
    location.reload();
  }
  const PAN_NAMES = { both:'Right / Middle', right:'Right', middle:'Middle' };
  function quickSettingsList(){
    const slider = (key, name, min, step) => `<li class="profile-setting">
        <label for="qs-${key}">${name}</label>
        <div class="profile-control"><input type="range" id="qs-${key}" data-setting="${key}" min="${min}" max="100" step="${step}" value="${quickLevel(key)}"/></div>
        <output for="qs-${key}">${quickLevel(key)}%</output>
      </li>`;
    const motion = !!profile.settings.reduceMotion;
    const cvd = profile.settings.cvd || 'none';
    const picker = (key, label, value) => `<li class="profile-setting">
        <span id="qs-${key}-label">${label}</span>
        <div class="profile-control profile-picker" role="group" aria-labelledby="qs-${key}-label">
          <button type="button" data-pick="${key}" data-step="-1" aria-label="Previous ${label.toLowerCase()}">◀</button>
          <output aria-live="polite">${value}</output>
          <button type="button" data-pick="${key}" data-step="1" aria-label="Next ${label.toLowerCase()}">▶</button>
        </div>
      </li>`;
    const look = window.EC_EDITOR.readVariant();
    const inEditor = document.getElementById('screen-editor').classList.contains('active');
    const editorRows = `${picker('layout','Editor layout',EDITOR_LAYOUT_NAMES[look.layout])}
      ${picker('theme','Editor theme',EDITOR_THEME_NAMES[look.theme])}`;
    return `<ul class="profile-settings-list">
      ${inEditor ? editorRows : ''}
      ${slider('sfx','Sound',0,5)}
      ${slider('music','Music',0,5)}
      ${slider('scale','Size',25,25)}
      <li class="profile-setting">
        <span id="qs-motion-label">Reduce motion</span>
        <div class="profile-control profile-control-wide"><button type="button" class="profile-switch" role="switch" aria-checked="${motion}" aria-labelledby="qs-motion-label" data-setting="motion"><span></span></button></div>
      </li>
      <li class="profile-setting">
        <span id="qs-cvd-label">Colorblind</span>
        <div class="profile-control profile-picker" role="group" aria-labelledby="qs-cvd-label">
          <button type="button" data-cvd-step="-1" aria-label="Previous colorblind mode">◀</button>
          <output aria-live="polite">${CVD_NAMES[cvd]}</output>
          <button type="button" data-cvd-step="1" aria-label="Next colorblind mode">▶</button>
        </div>
      </li>
      ${picker('keys','Keyboard sound',window.EC_SOUND.KEY_PACKS[window.EC_SOUND.getKeyPack()].name)}
      ${picker('pan','Pan with',PAN_NAMES[profile.settings.panButton || 'both'])}
      ${inEditor ? '' : editorRows}
      <li class="profile-setting">
        <span>Start over</span>
        <div class="profile-control profile-control-wide"><button type="button" class="btn btn-no btn-sm" id="qs-reset">Reset all</button></div>
      </li>
    </ul>`;
  }
  function bindQuickSettings(root){
    root.querySelectorAll('input[type=range][data-setting]').forEach(input=>{
      const out = input.closest('.profile-setting').querySelector('output');
      input.addEventListener('input', ()=>{ out.textContent = input.value + '%'; if(input.dataset.setting !== 'scale') setQuickSetting(input.dataset.setting, Number(input.value)); });
      // Size re-lays out the whole UI, so apply it once the slider is let go.
      input.addEventListener('change', ()=>setQuickSetting(input.dataset.setting, Number(input.value)));
    });
    const sw = root.querySelector('[data-setting="motion"]');
    sw.addEventListener('click', ()=>{
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      setQuickSetting('motion', on);
    });
    root.querySelectorAll('[data-pick]').forEach(btn=>btn.addEventListener('click', ()=>{
      const key = btn.dataset.pick;
      if(key === 'pan'){
        const ids = Object.keys(PAN_NAMES), i = ids.indexOf(profile.settings.panButton || 'both');
        profile.settings.panButton = ids[(i + Number(btn.dataset.step) + ids.length) % ids.length];
        save();
        btn.closest('.profile-picker').querySelector('output').textContent = PAN_NAMES[profile.settings.panButton];
        return;
      }
      if(key === 'keys'){
        const ids = Object.keys(window.EC_SOUND.KEY_PACKS);
        const i = ids.indexOf(window.EC_SOUND.getKeyPack());
        const next = ids[(i + Number(btn.dataset.step) + ids.length) % ids.length];
        window.EC_SOUND.setKeyPack(next);
        btn.closest('.profile-picker').querySelector('output').textContent = window.EC_SOUND.KEY_PACKS[next].name;
        setTimeout(()=>window.EC_SOUND.typeKey('a'), 150); // preview once the pack has loaded
        return;
      }
      const list = key === 'layout' ? EDITOR_LAYOUTS : EDITOR_THEMES;
      const names = key === 'layout' ? EDITOR_LAYOUT_NAMES : EDITOR_THEME_NAMES;
      const i = list.indexOf(window.EC_EDITOR.readVariant()[key]);
      const next = list[(i + Number(btn.dataset.step) + list.length) % list.length];
      window.EC_EDITOR.setVariant(key, next);
      btn.closest('.profile-picker').querySelector('output').textContent = names[next];
    }));
    root.querySelector('#qs-reset')?.addEventListener('click', resetEverything);
    root.querySelectorAll('[data-cvd-step]').forEach(btn=>btn.addEventListener('click', ()=>{
      const i = CVD_STEPS.indexOf(profile.settings.cvd || 'none');
      const next = CVD_STEPS[(i + Number(btn.dataset.cvdStep) + CVD_STEPS.length) % CVD_STEPS.length];
      setQuickSetting('cvd', next);
      btn.closest('.profile-picker').querySelector('output').textContent = CVD_NAMES[next];
    }));
  }

  // The newest client quote for the profile card.
  function profileQuoteMarkup(){
    const latest = window.EC_STORE.completedFeedback(profile).find(entry=>entry.quote);
    const quote = latest ? `<blockquote class="profile-quote">“${latest.quote}”<cite>${latest.name}</cite></blockquote>` : '';
    return quote;
  }
  function profileQuickPanelMarkup(){
    const feedback = window.EC_STORE.completedFeedback(profile);
    const average = feedback.length ? feedback.reduce((sum,item)=>sum+(item.stars || 0),0)/feedback.length : 0;
    const filledStars = Math.max(0,Math.min(5,Math.round(average)));
    const stars = Array.from({length:5},(_,i)=>`<span class="${i<filledStars?'filled':''}">${i<filledStars?'★':'☆'}</span>`).join('');
    const unlocked = new Set(profile.unlockedBadges || []);
    const badges = Array.from({length:12},(_,i)=>`<span class="profile-badge-dot ${window.EC_STORE.BADGES[i] && unlocked.has(window.EC_STORE.BADGES[i].id)?'unlocked':''}"></span>`).join('');
    return `<section class="profile-quick-card">
      <img class="profile-quick-avatar" src="assets/icons/profile.svg" alt="" />
      <h2>Hi, User!</h2>
      <div class="profile-rating-row"><div class="profile-quick-stars" aria-label="${filledStars} out of 5 stars">${stars}</div><span class="profile-feedback-count" aria-label="${feedback.length} feedback">(${feedback.length})</span></div>
      ${profileQuoteMarkup()}
      <div class="profile-quick-strip">Coins: ${window.EC_MONEY(profile.currency || 0)}</div>
      <div class="profile-quick-strip">Badges</div>
      <div class="profile-badge-grid">${badges}</div>

      <button class="profile-quick-action" id="profile-quick-signout">⇥ Sign out</button>
    </section>`;
  }
  function openTaskbarStatsPopup(anchor, mode){
    closeMonitorAppPopup(true);
    closeTaskbarStatsPopup();
    const popup = document.getElementById('taskbar-stats-popup');
    const body = document.getElementById('taskbar-stats-popup-body');
    const content = document.querySelector('#screen-stats .app-content-wrap');
    if(!popup || !body || !content) return;
    const isStats = mode === 'stats', isSettings = mode === 'settings';
    popup.classList.toggle('profile-layout', !isStats);
    popup.classList.toggle('settings-layout', isSettings);
    popup.dataset.mode = mode;
    if(isSettings){
      if(taskbarStatsBorrowed){
        taskbarStatsBorrowed.parent.insertBefore(taskbarStatsBorrowed.el, taskbarStatsBorrowed.next);
        taskbarStatsBorrowed = null;
      }
      body.innerHTML = `<div class="settings-quick-card">${quickSettingsList()}</div>`;
      bindQuickSettings(body);
    }else if(isStats){
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
      document.getElementById('profile-quick-signout').addEventListener('click', ()=>{ closeTaskbarStatsPopup(); showScreen('screen-home'); });
    }
    document.getElementById('taskbar-stats-popup-title').textContent = isSettings ? 'Settings' : isStats ? 'Studio Stats' : 'Profile';
    document.getElementById('taskbar-stats-popup-icon').src = isSettings ? 'assets/icons/settings-icon.svg' : isStats ? 'assets/icons/stats-icon.svg' : 'assets/icons/profile.svg';
    popup.classList.remove('hidden');
    statsPopupAnchor = anchor;
    positionStatsPopup();
    document.getElementById('taskbar-settings').setAttribute('aria-expanded', String(isSettings));
    if(isSettings) return;
    openApps.add(isStats?'stats':'profile');
    renderTaskbarApps(isStats?'stats':'profile');
  }
  // Keep the pop-up (and its title bar with ✕) inside the part of the screen
  // you can actually see, at every Size setting — Safari's bars can cover
  // part of the window on phones.
  let statsPopupAnchor = null;
  function positionStatsPopup(){
    const popup = document.getElementById('taskbar-stats-popup');
    if(!popup || popup.classList.contains('hidden') || !statsPopupAnchor) return;
    const bar = document.getElementById('global-taskbar').getBoundingClientRect();
    const button = statsPopupAnchor.getBoundingClientRect();
    const visibleTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
    popup.style.left = Math.max(12, Math.min(button.left, innerWidth - popup.offsetWidth - 12)) + 'px';
    popup.style.bottom = Math.max(8, innerHeight - bar.top + 8) + 'px';
    popup.style.maxHeight = Math.max(160, bar.top - 16 - visibleTop) + 'px';
  }
  window.addEventListener('resize', () => requestAnimationFrame(positionStatsPopup));
  function closeTaskbarStatsPopup(){
    const popup = document.getElementById('taskbar-stats-popup');
    if(!popup || popup.classList.contains('hidden')) return;
    document.getElementById('taskbar-settings')?.setAttribute('aria-expanded','false');
    popup.classList.add('hidden');
    if(taskbarStatsBorrowed){
      taskbarStatsBorrowed.parent.insertBefore(taskbarStatsBorrowed.el, taskbarStatsBorrowed.next);
      taskbarStatsBorrowed = null;
    }
    openApps.delete(popup.classList.contains('profile-layout')?'profile':'stats');
    renderTaskbarApps(document.querySelector('.screen.active')?.id);
  }
  let settingsWindowContent = null;
  function closeSettingsWindow(){
    const popup=document.getElementById('desktop-settings-window');
    if(popup.hidden && !settingsWindowContent) return;
    popup.hidden=true;
    if(settingsWindowContent){
      settingsWindowContent.parent.appendChild(settingsWindowContent.el);
      settingsWindowContent=null;
    }
    openApps.delete('settings');
    renderTaskbarApps('screen-desktop');
  }
  function openSettingsApp(){
    closeTaskbarStatsPopup();
    const open=()=>{
      const popup=document.getElementById('desktop-settings-window');
      if(!settingsWindowContent){
        const content=document.querySelector('#screen-settings .app-content-wrap');
        settingsWindowContent={el:content,parent:content.parentNode};
        document.getElementById('desktop-settings-window-body').appendChild(content);
      }
      renderSettingsPanel();
      popup.hidden=false;
      openApps.add('settings');
      renderTaskbarApps('settings');
    };
    if(document.getElementById('screen-desktop').classList.contains('active')) open();
    else showScreen('screen-desktop',open,{preserve:true});
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
    document.getElementById('mini-desktop').addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); miniDesktopBackgroundAction(); }
    });
    document.getElementById('monitor-app-popup-close').addEventListener('click', ()=>closeMonitorAppPopup());
    initPikoGuideChain();
    initPikoComposeGuide();

    document.getElementById('icon-mail').addEventListener('click', openMailApp);
    document.getElementById('icon-maker').addEventListener('click', ()=>{
      window.EC_PIKO.hideBubble();window.EC_PIKO.clearTarget();
      showScreen('screen-maker', ()=>window.EC_MAKER.open());
    });
    document.getElementById('icon-browser').addEventListener('click', ()=>openBrowserApp());
    document.getElementById('browser-back-btn').addEventListener('click', ()=>{ returnShopPanel(); showScreen('screen-desktop'); });
    document.getElementById('browser-home-btn').addEventListener('click', ()=>{ browserPage = { kind:'home' }; renderBrowser(); });
    document.getElementById('icon-stats').addEventListener('click', e=>openTaskbarStatsPopup(e.currentTarget,'stats'));
    document.getElementById('icon-profile').addEventListener('click', e=>openTaskbarStatsPopup(e.currentTarget,'profile'));
    document.getElementById('icon-shop').addEventListener('click', openShopApp);
    document.getElementById('icon-settings').addEventListener('click', openSettingsApp);
    document.getElementById('desktop-settings-close').addEventListener('click', closeSettingsWindow);

    document.getElementById('mail-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('stats-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('settings-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));
    document.getElementById('shop-back-btn').addEventListener('click', ()=>showScreen('screen-desktop'));

    document.getElementById('taskbar-home').addEventListener('click', ()=>{
      closeTaskbarStatsPopup();
      document.getElementById('desktop-settings-window').hidden=true;
      showScreen('screen-desktop',null,{preserve:true});
    });
    // A way back to the title screen from the real desktop — matters most in
    // fullscreen, where there's no browser chrome to fall back on.
    document.getElementById('desktop-watermark-btn').addEventListener('click', ()=>showScreen('screen-home'));
    // Clicking outside the profile or stats window dismisses it.
    document.addEventListener('pointerdown', e=>{
      const popup = document.getElementById('taskbar-stats-popup');
      if(popup.classList.contains('hidden') || popup.contains(e.target) || e.target.closest('#icon-profile, #icon-stats, #taskbar-settings, #taskbar-profile, .taskbar-running-app')) return;
      closeTaskbarStatsPopup();
    });
    document.getElementById('taskbar-stats-popup-close').addEventListener('click', closeTaskbarStatsPopup);
    // ⚙ Settings: its own pop-up, reachable from every screen (including the editor).
    const toggleSettingsPopup = ()=>{
      const popup = document.getElementById('taskbar-stats-popup');
      if(!popup.classList.contains('hidden') && popup.dataset.mode === 'settings') closeTaskbarStatsPopup();
      else openTaskbarStatsPopup(document.getElementById('taskbar-settings'), 'settings');
    };
    document.getElementById('taskbar-settings').addEventListener('click', toggleSettingsPopup);
    document.addEventListener('keydown', e=>{
      if(e.key !== ',' || e.ctrlKey || e.metaKey || e.altKey) return;
      if(e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if(document.getElementById('screen-home').classList.contains('active')) return;
      e.preventDefault(); toggleSettingsPopup();
    });
    document.getElementById('taskbar-profile').addEventListener('click', e=>{
      const popup = document.getElementById('taskbar-stats-popup');
      if(!popup.classList.contains('hidden') && popup.dataset.mode === 'profile') closeTaskbarStatsPopup();
      else openTaskbarStatsPopup(e.currentTarget, 'profile');
    });
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeTaskbarStatsPopup(); });
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
    // A client's email lands a few seconds after the previous job, like real mail.
    window.addEventListener('ec-mail-arrived', e=>{
      window.EC_SOUND.play('newMail');
      showToast(`📧 New email from ${e.detail.clientName}`, 3200);
      refreshHeader();
      if(document.getElementById('screen-shell').classList.contains('active')) renderCurrentFolder();
      pikoNextMail(e.detail);
    });
    document.getElementById('btn-reward-collect').addEventListener('click', ()=>{window.EC_MODAL.hide('modal-reward');showDaySummary();});
    window.EC_EDITOR.initToolbarOnce();

    window.EC_MAIL.setHandlers({
      onAccept: level => {
        if(profile.pendingClientReply || profile.readyReply){showToast('Read your client reply before starting another task.',2500);return;}
        showLoadingTransition((finishFade)=>{
          showScreen('screen-editor', ()=>{
            window.EC_EDITOR.open(level,profile.revisionDrafts?.[level.id]);
            levelStartTime = Date.now();
            startTimerIfNeeded();
            finishFade();
            if(pikoStage === 'element') runPikoWorkspaceTour(level);
            else runPikoLevelTips(level, ()=>{});
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
      openMailApp(); // the reply is written in the mail app, not over the canvas
      window.EC_MAIL.openCompose(level, result);
    });

    currentFolder = 'inbox';
    scheduleClientReply();
    showDaySummary();
    let inboxDay=Math.floor(Date.now()/86400000);
    setInterval(()=>{const day=Math.floor(Date.now()/86400000);if(day!==inboxDay){inboxDay=day;refreshHeader();if(document.getElementById('screen-shell').classList.contains('active'))renderCurrentFolder();}},1000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
