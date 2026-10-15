/* =====================================================
   EyeCon — Piko, the tutorial guide character
   Ported 1:1 (dialogue + typewriter/cursor mechanics) from the reference
   Eyecon build's PikoTalk/GuideCursor/pikoScript.
   Exposes window.EC_PIKO
===================================================== */
(function(){

  // Piko's dialogue script — text kept verbatim from the reference build.
  const SCRIPT = {
    tutorial: [
      "Hi, I'm Piko! Welcome to your first day at EyeCon Studio.",
      "Clients send us designs that are hard to read or use. We fix them so everyone can enjoy them.",
      "Oh, you've got mail! Click Mail to see your first job."
    ],
    askName: "What's your name?",
    askNameTitle: "What should Piko call you?",
    niceToMeet: "Nice to meet you, {name}! Let's get you settled in.",
    inboxGuide: "{client} needs a hand. Open their email to see the job.",
    previewGuide: "They sent their design. Click the attachment to take a look.",
    acceptGuide: "Seen enough? Click Accept to start the job.",
    workspace: {
      intro: "Welcome to your workspace! That's Mayonnaisegee's portfolio in the middle.",
      pan: "First, the controls! Hold the middle mouse button or right click, then drag to move around the page. Try it!",
      zoom: "Nice moves! Now scroll your mouse wheel to zoom in and out.",
      problems: "Spot the red dots? Each one marks something the client wants fixed.",
      dotsLater: "Heads up! As you clear more clients, the trickier each level will get and the fewer warning hints will show up.",
      grid: "Click this button to show or hide the grid.",
      gridDone: "See? Everything snaps to the grid, so lining things up is easy.",
      gridSettings: "Now click this one.",
      gridSettingsDone: "Here you can change how see-through the grid is. Give the slider a try!",
      together: "Let's fix one together so you get the feel of it.",
      selectAbout: "See \"About\" up in the top menu? It sits a little lower than Home and Contact. Left click it to pick it.",
      element: "Click any element with a red dot to get started.",
      taskLit: "See how its task lit up? Selecting something shows exactly which task it belongs to.",
      controls: "Got it! This panel shows what you picked. You'll use it more later.",
      dragAbout: "Drag it upwards to make sure it's aligned with the \"Home\" and \"Contact\" line. The arrow keys work too!",
      nice: "Perfect! See how much tidier that menu row looks? That's alignment.",
      tasks: "Your task progress keeps score. That one just ticked off!",
      submit: "Fix the rest, then hit Submit to send it to the client."
    },
    reply: {
      arrived: "Ooh, {client} wrote back! Open their reply to see what they think.",
      complete: "They love it! Hit Mark Completed to get paid for the job.",
      revise: "They want a few more fixes. Hit Back to Editor and give it another go!"
    },
    nextMail: "Ooh, you got another email! {client} needs your help next. Open it up!",
    basicsDone: [
      "You did it! You've finished the basics: alignment, contrast and typography.",
      "Good job today! Every screen you fixed is now easier to read for somebody out there.",
      "That's a wrap for your first shift. Go rest those eyes!",
      "Tomorrow, four new clients are writing in. I'll see you then!"
    ],
    compose: {
      type: "To get your client's approval, send them an email. Press any key on your keyboard to start typing!",
      attach: "Great message! Now attach your updated design so they can see your fix.",
      send: "All set. Hit Send!"
    },
    // First visit to each of the first three jobs: one basic skill per level.
    // [line, selector to point at (optional)]
    levels: {
      mayo: [
        ["Quick tip before you go!"],
        ["Alignment means things share an edge or a center. Lined-up pages feel calm and are easy to scan."],
        ["Spacing counts too. Equal gaps tell people which items belong together."],
        ["Everything snaps to an 8px grid, so just drag or nudge. No typing needed. Watch for the pink guides!"]
      ],
      yappers: [
        ["New skill: CONTRAST! It's how much the text color stands out from what's behind it."],
        ["Low contrast, like light gray on white, is really hard to read. Even more so on a phone in the sun, or with weaker eyesight."],
        ["We measure it as a ratio. Normal text needs at least 4.5:1."],
        ["Select some text, then move its color sliders. Darker text on a light background, or lighter text on a dark one.", '#element-settings'],
        ["Watch the ratio badge in the panel. A green check means it passes."],
        ["Tip: you only need to change the color, not the layout. Go for it!"]
      ],
      antoks: [
        ["Click the hint button to help you! Your first hint is on us!", '#tool-hint']
      ],
      haybuhay: [
        ["Last basic: TYPOGRAPHY! That's how your text looks: size, weight and spacing."],
        ["Tiny text makes people squint or zoom. For this job, set the small text to exactly 16px."],
        ["Bigger text for headings, smaller for details. That difference is called hierarchy, and it guides the eye."],
        ["Select a label and raise its Size. This is the one number you can type!", '#element-settings'],
        ["Alignment, contrast and typography: those are the basics. After this, you're ready for real clients!"]
      ]
    }
  };
  // Editable from the admin page (EC_TEXT); lines with {placeholders} are filled when shown.
  const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  window.EC_TEXT?.bindObject('piko', SCRIPT, 'piko', 'Piko dialogue');
  const TEMPLATED = { niceToMeet:'name', inboxGuide:'client', nextMail:'client' };
  Object.entries(TEMPLATED).forEach(([k, v]) => { const tpl = () => window.EC_TEXT ? window.EC_TEXT.t('piko.' + k) : k; SCRIPT[k] = x => fill(tpl(), { [v]: x }); });
  SCRIPT.reply.arrived = x => fill(window.EC_TEXT ? window.EC_TEXT.t('piko.reply.arrived') : '', { client: x });

  const MS_PER_CHAR = 52;
  const SFX_EVERY_N_CHARS = 2;

  let dom = null;
  function ensureDom(){
    if(dom) return dom;
    // A single box shadowed out to fill the whole screen except its own
    // rect is the "spotlight hole" — the target underneath is genuinely
    // never covered by anything, so it can't get stuck under the dim
    // regardless of whatever stacking context it happens to live in (the
    // old approach — raising the *target's own* z-index — broke whenever
    // an ancestor had a lower z-index than the dim itself).
    const hole = document.createElement('div'); hole.className = 'piko-hole hidden';
    const cursor = document.createElement('div'); cursor.className = 'piko-cursor hidden'; cursor.innerHTML = '<img src="assets/sprites/cursor-point.png" alt="">';
    const bubble = document.createElement('div'); bubble.className = 'piko-bubble hidden';
    bubble.innerHTML =
      '<div class="piko-panel"><p class="piko-name">PIKO</p><h4 class="piko-line"><span class="piko-text"></span><span class="piko-caret">|</span></h4>' +
      '<div class="piko-foot"><button type="button" class="piko-nav prev" aria-label="Previous line">‹</button><span class="piko-hint"></span><button type="button" class="piko-nav next" aria-label="Next line">›</button></div></div>' +
      '<img class="piko-img" src="assets/sprites/piko.png" alt="Piko, the EyeCon guide, waves hello." />';
    document.body.appendChild(hole);
    document.body.appendChild(cursor);
    document.body.appendChild(bubble);
    dom = { hole, cursor, bubble, textEl: bubble.querySelector('.piko-text'), caretEl: bubble.querySelector('.piko-caret'),
      hint: bubble.querySelector('.piko-hint'), prev: bubble.querySelector('.prev'), next: bubble.querySelector('.next') };
    // ‹ › re-read earlier lines of this conversation; › on the newest line advances it.
    dom.prev.addEventListener('click', e => { e.stopPropagation(); if(view > 0){ view--; showView(); } });
    dom.next.addEventListener('click', e => { e.stopPropagation(); if(view < history.length - 1){ view++; showView(); } else if(latestCanAdvance) bubble.onclick?.(); });
    addEventListener('keydown', e => {
      if(bubble.classList.contains('hidden') || e.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if(e.key === 'ArrowLeft'){ dom.prev.click(); e.preventDefault(); }
      if(e.key === 'ArrowRight'){ dom.next.click(); e.preventDefault(); }
    });
    return dom;
  }

  // Piko lines may bold words with **double stars** (admin editor, Ctrl+B). Old
  // lines used "fake bold" Unicode letters (𝗣𝗶𝗸𝗼); those become real bold text too.
  // Little control icons in the game's style (cream, dark-purple outline, lilac
  // highlight on the button you use), dropped in after the words that name them.
  const mouseIcon = (...parts) => {
    // The button(s) to use are filled bright purple; the rest stay cream.
    const on = p => parts.includes(p) ? '#7c3aed' : '#ffffff';
    return `<svg class="piko-ico" viewBox="0 0 24 34" aria-hidden="true"><path d="M12 2.5H8A6 6 0 0 0 2 8.5v4h10z" fill="${on('left')}"/><path d="M12 2.5h4a6 6 0 0 1 6 6v4H12z" fill="${on('right')}"/><rect x="2" y="2.5" width="20" height="29" rx="9.5" fill="none" stroke="#4d0d74" stroke-width="2.4"/><path d="M2 12.5h20" stroke="#4d0d74" stroke-width="2"/><path d="M12 2.5v10" stroke="#4d0d74" stroke-width="2"/><rect x="9.6" y="4.5" width="4.8" height="7" rx="2.4" fill="${on('middle')}" stroke="#4d0d74" stroke-width="1.8"/></svg>`;
  };
  const key = k => `<svg class="piko-ico" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="3" fill="#fff3d6" stroke="#4d0d74" stroke-width="1.6"/><path d="${k}" fill="#7656b3"/></svg>`;
  const ARROWS = `<span class="piko-keys">${key('M7 4l3 4H4z')}${key('M4 5h6l-3 4z')}${key('M4 7l4-3v6z')}${key('M10 7L6 4v6z')}</span>`;
  const CONTROL_ICONS = [
    [/(middle or right mouse button|middle mouse button or right click)/gi, () => mouseIcon('middle', 'right')],
    [/(middle mouse button|middle-click|middle click)/gi, () => mouseIcon('middle')],
    [/(right mouse button|right-click|right click)/gi, () => mouseIcon('right')],
    [/(left mouse button|left-click|left click)/gi, () => mouseIcon('left')],
    [/(mouse wheel|scroll wheel)/gi, () => mouseIcon('middle')],
    [/(arrow keys)/gi, () => ARROWS],
  ];
  function richText(t){
    // Any line (including admin-added ones) can say {name}: fill it with the player's name.
    const name = window.EC_STORE?.load?.().displayName;
    if(name) t = String(t).replace(/\{name\}/g, name);
    const esc = String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    let html = esc
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(?:[\u{1D400}-\u{1D7FF}](?:[\s'’.,!?-]*[\u{1D400}-\u{1D7FF}])*)+/gu, m => '<b>' + m.normalize('NFKC') + '</b>');
    // One pass over all rules so a phrase only gets one icon.
    const all = new RegExp(CONTROL_ICONS.map(([re]) => re.source).join('|'), 'gi');
    html = html.replace(all, m => m + ' ' + CONTROL_ICONS.find(([re]) => new RegExp('^(?:' + re.source + ')$', 'i').test(m))[1]());
    return html;
  }
  let typeTimer = null;
  let currentTarget = null;
  // Lines shown since Piko last appeared, for ‹ › re-reading.
  let history = [], view = -1, latestCanAdvance = false;
  window.EC_TEXT?.register('piko.ui.continue', 'Click anywhere to continue', 'ui', 'Hint under Piko’s line');
  window.EC_TEXT?.register('piko.ui.back', 'Earlier line · click to return', 'ui', 'Hint while re-reading an earlier line');
  const hintText = k => window.EC_TEXT ? window.EC_TEXT.t(k) : '';
  function showView(){
    const { textEl, hint, prev, next } = dom, latest = view === history.length - 1;
    textEl.innerHTML = richText(history[view]);
    dom.bubble.classList.toggle('piko-reviewing', !latest);
    hint.textContent = !latest ? hintText('piko.ui.back') : latestCanAdvance ? hintText('piko.ui.continue') : '';
    prev.disabled = view <= 0;
    next.disabled = latest && !latestCanAdvance;
    prev.hidden = next.hidden = history.length < 2 && !latestCanAdvance;
  }

  // Pause before each Piko line so beats don't land back to back.
  const LINE_DELAY_MS = 600;
  let sayDelayTimer = null;

  function hideBubble(){
    clearTimeout(sayDelayTimer); clearTimeout(unlockTimer);
    document.body.classList.remove('piko-line-pending');
    document.removeEventListener('click', advanceAnywhere, true);
    if(!dom) return; // (history kept: ‹ can re-read lines from before the last action too)
    dom.bubble.classList.add('hidden');
    clearInterval(typeTimer);
    typeTimer = null;
  }

  // Shows one line of dialogue with a typewriter reveal; clicking mid-type
  // skips straight to the full line, clicking again (once complete) calls
  // onDone — same click-to-skip/click-to-advance behavior as PikoTalk.
  let saidAgain = false;
  let pendingAfter = [];
  let advanceAnywhere = () => {};
  const CLICK_UNLOCK_MS = 400;
  const DIM_FADE_MS = 1200; // matches the .piko-hole opacity transition
  let dimDoneAt = 0;
  let unlockTimer = null;
  let lastPointerDown = 0;
  document.addEventListener('pointerdown', () => { lastPointerDown = performance.now(); }, true);
  // Admin-added lines: play any lines added before this one, the line itself
  // (unless skipped), then lines added after it, before the game continues.
  function say(line, opts){
    opts = opts || {};
    if(opts._x) return sayOne(line, opts);
    if(pendingAfter.length){ // lines added after the previous action line
      const q = pendingAfter; pendingAfter = [];
      const rest = Object.assign({}, opts); delete rest.onDone;
      const step = i => i < q.length ? sayOne(q[i], Object.assign({}, rest, { _x:true, onDone: () => step(i + 1) })) : say(line, opts);
      return step(0);
    }
    const T = window.EC_TEXT, key = T && T.keyFor(line), x = key && T.extras(key);
    if(!x || (!x.before.length && !x.after.length && !x.skip)) return sayOne(line, opts);
    const finish = opts.onDone;
    const name = (window.EC_STORE && window.EC_STORE.load().displayName) || 'Designer';
    const fillName = t => String(t).replace(/\{name\}/g, name);
    const queue = x.before.map(t => ({ t: fillName(t) }));
    if(!(x.skip && finish)) queue.push({ t: line, main: true }); // only talk lines can be skipped
    if(finish) queue.push(...x.after.map(t => ({ t: fillName(t) })));
    else pendingAfter = x.after.map(fillName); // action line: these play once the player has done it
    const rest = Object.assign({}, opts); delete rest.onDone; delete rest.now;
    const step = i => {
      const q = queue[i];
      if(!q){ if(finish) finish(); return; }
      const o = Object.assign({}, i === 0 ? opts : rest, { _x: true });
      if(q.main && !finish){ delete o.onDone; return sayOne(q.t, o); } // action line: stays up until the player acts
      o.onDone = () => step(i + 1);
      sayOne(q.t, o);
    };
    step(0);
  }
  function sayOne(line, opts){
    opts = opts || {};
    saidAgain = true;
    clearTimeout(sayDelayTimer);
    const showing = dom && !dom.bubble.classList.contains('hidden');
    // Already on screen (chained lines): keep Piko up, no gap.
    if(!opts.now && !showing){
      ensureDom().bubble.classList.add('hidden');
      document.body.classList.add('piko-line-pending'); // the highlighted control waits for this line
      sayDelayTimer = setTimeout(() => sayOne(line, Object.assign({}, opts, { now:true })), LINE_DELAY_MS);
      return;
    }
    const { textEl, caretEl, bubble } = ensureDom();
    bubble.classList.toggle('piko-top', !!opts.top);
    bubble.classList.toggle('piko-left', !!opts.left); // keep clear of right-side highlights
    if(bubble.classList.contains('hidden')){
      // Pop in like a storybook character jumping onto the page.
      bubble.classList.remove('piko-pop'); void bubble.offsetWidth; bubble.classList.add('piko-pop');
      if(window.EC_SOUND && window.EC_SOUND.play) window.EC_SOUND.play('pikoPop');
    } else if(window.EC_SOUND && window.EC_SOUND.play) window.EC_SOUND.play('pikoLine');
    bubble.classList.remove('hidden');
    // Clicks stay off for a short beat after the line appears, so a click
    // aimed at the moment it pops in can't land on what it points to.
    document.body.classList.add('piko-line-pending');
    clearTimeout(unlockTimer);
    // …and not before the dim overlay has finished fading in.
    const unlock = () => {
      const wait = dimDoneAt - Date.now();
      if(wait > 0){ unlockTimer = setTimeout(unlock, wait); return; }
      document.body.classList.remove('piko-line-pending');
    };
    unlockTimer = setTimeout(unlock, CLICK_UNLOCK_MS);
    clearInterval(typeTimer);
    caretEl.classList.remove('idle');
    let i = 0;
    const full = line;
    textEl.textContent = '';
    function finishTyping(){
      textEl.innerHTML = richText(full);
      clearInterval(typeTimer);
      typeTimer = null;
      caretEl.classList.add('idle');
    }
    finishTyping(); // ponytail: typewriter off for now; restore the setInterval reveal to bring it back
    history.push(full); if(history.length > 30) history.shift(); view = history.length - 1; latestCanAdvance = !!opts.onDone;
    showView();
    // Lines that lead somewhere advance on a click anywhere; the click is
    // swallowed so it can't also hit whatever is under it.
    document.removeEventListener('click', advanceAnywhere, true);
    const shownAt = performance.now();
    advanceAnywhere = e => {
      if(bubble.classList.contains('hidden')) return;
      // Ignore the release of a press that started before this line (e.g. the
      // click that selected an element or finished a drag).
      if(lastPointerDown < shownAt) return;
      if(e.target.closest?.('.piko-nav')) return; // ‹ › handle themselves
      e.preventDefault(); e.stopPropagation();
      bubble.onclick();
    };
    if(opts.onDone) setTimeout(() => document.addEventListener('click', advanceAnywhere, true));
    bubble.onclick = () => {
      if(view < history.length - 1){ view = history.length - 1; showView(); return; } // re-reading: a click jumps back to the current line
      if(!opts.onDone || lastPointerDown < shownAt) return; // an instruction: it stays until the player does it
      document.removeEventListener('click', advanceAnywhere, true);
      if(typeTimer){ finishTyping(); return; }
      // If onDone chains another line, Piko stays up; otherwise he leaves.
      saidAgain = false;
      if(opts.onDone) opts.onDone();
      // Wait a tick: async tours (await talk) say their next line in a
      // microtask, so Piko should stay up instead of leaving and popping back.
      setTimeout(() => { if(!saidAgain) hideBubble(); });
    };
  }

  let placeRetryTimer = null;

  // Points the floating cursor + spotlight hole at a live DOM element.
  // `delay` (ms) waits before measuring/showing — needed right after a
  // screen transition or a fresh render, where the element exists but
  // hasn't been laid out yet and would measure as a 0×0 rect at (0,0),
  // which is exactly what put the cursor in the top-left corner before.
  function pointAt(el, opts){
    opts = opts || {};
    clearInterval(placeRetryTimer); placeRetryTimer = null;
    if(!el){ clearTarget(); return; }
    // Piko is about to pop in: land the highlight with him, not before.
    if(opts.delay == null && (!dom || dom.bubble.classList.contains('hidden'))) opts.delay = LINE_DELAY_MS;
    const lift = el.classList.contains('desktop-icon');
    const run = () => {
      const { cursor, hole } = ensureDom();
      // The icon lives inside low z-index stacking contexts, so a body-level
      // dim can never sit under it. Put a dim right beside it instead.
      if(lift){
        el.classList.add('piko-lift');
        const dim = document.createElement('div'); dim.className = 'piko-lift-dim';
        el.parentElement.insertBefore(dim, el);
      }
      // If the rect still isn't real yet (mid-transition), keep retrying
      // for up to ~1s instead of drawing a bogus corner position.
      let r = el.getBoundingClientRect();
      let attempts = 0;
      const tryPlace = () => {
        r = el.getBoundingClientRect();
        if((r.width === 0 && r.height === 0) && attempts < 20){
          attempts++;
          placeRetryTimer = setTimeout(tryPlace, 50);
          return;
        }
        clearInterval(placeRetryTimer); placeRetryTimer = null;
        place();
        cursor.classList.remove('hidden');
        if(opts.dim !== false && !lift){
          if(hole.classList.contains('hidden')) dimDoneAt = Date.now() + DIM_FADE_MS; // overlay is fading in
          hole.classList.remove('hidden');
        } else hole.classList.add('hidden');
        currentTarget = el;
        el.classList.add('piko-pointed');
      };
      const place = () => {
        r = el.getBoundingClientRect();
        // Keep the guide beside the target so the mail itself stays visible.
        // Hand tip lands just inside the target's lower-right area.
        cursor.style.left = (r.left + r.width * .7) + 'px';
        cursor.style.top = (r.top + r.height * .7) + 'px';
        // Desktop icons: dim everything and lift the icon itself above it.
        if(lift) return;
        // Exact fit: same box and corner radius as the target.
        hole.style.left = r.left + 'px';
        hole.style.top = r.top + 'px';
        hole.style.width = r.width + 'px';
        hole.style.height = r.height + 'px';
        hole.style.borderRadius = getComputedStyle(el).borderRadius;
      };
      tryPlace();
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      cursor._reposition = place;
      // Windows/modals animate in with transforms, which fire no resize
      // events — follow the target every frame so the spotlight stays on it.
      const follow = () => {
        if(currentTarget !== el) return;
        place();
        cursor._followFrame = requestAnimationFrame(follow);
      };
      cursor._followFrame = requestAnimationFrame(follow);
    };
    if(opts.delay) setTimeout(run, opts.delay); else run();
  }

  function clearTarget(){
    const { cursor, hole } = ensureDom();
    clearInterval(placeRetryTimer); placeRetryTimer = null;
    document.querySelectorAll('.piko-pointed').forEach(n => n.classList.remove('piko-pointed'));
    currentTarget = null;
    document.querySelectorAll('.piko-lift').forEach(n => n.classList.remove('piko-lift'));
    document.querySelectorAll('.piko-lift-dim').forEach(n => n.remove());
    cursor.classList.add('hidden');
    hole.classList.add('hidden');
    if(cursor._reposition){
      window.removeEventListener('resize', cursor._reposition);
      window.removeEventListener('scroll', cursor._reposition, true);
      cursor._reposition = null;
    }
    if(cursor._followFrame){
      cancelAnimationFrame(cursor._followFrame);
      cursor._followFrame = null;
    }
  }

  // Piko asks a question: his line shows, then a game-style card pops up with
  // a text field + OK. Calls onAnswer(text). `prefill` seeds the field.
  function ask(line, { placeholder = '', maxLength = 24, prefill = '', title = '' } = {}, onAnswer){
    say(line, { top:false });
    const { bubble } = ensureDom();
    const waitForBubble = setInterval(() => {
      if(bubble.classList.contains('hidden')) return;
      clearInterval(waitForBubble);
      const card = document.createElement('div');
      card.className = 'piko-name-card';
      card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', title || line);
      card.innerHTML = `<form class="piko-name-form"><img src="assets/sprites/piko.png" alt="" class="piko-name-face"><h2></h2>
        <input type="text" required autocomplete="nickname" aria-label="Your name"><button type="submit" class="btn btn-accept">OK</button></form>`;
      card.querySelector('h2').textContent = title || line;
      const form = card.querySelector('form'), input = card.querySelector('input');
      input.placeholder = placeholder; input.maxLength = maxLength; input.value = prefill;
      form.addEventListener('click', e => e.stopPropagation());
      form.addEventListener('submit', e => {
        e.preventDefault();
        const value = input.value.replace(/\s+/g, ' ').trim();
        if(!value){ input.focus(); return; }
        card.remove(); hideBubble();
        onAnswer(value);
      });
      document.body.appendChild(card);
      setTimeout(() => input.focus(), 50);
    }, 50);
  }

  window.EC_PIKO = { SCRIPT, say, ask, hideBubble, pointAt, clearTarget };
})();
