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
    mailIntro: "This is EyeMail, your work inbox! Clients send you their design jobs here.",
    mailExplain: "Each email shows who it's from, what they need, and how tricky it is. Finished jobs move to Completed.",
    inboxGuide: "{client} needs a hand. Open their email to see the job.",
    previewGuide: "They sent their design. Click the attachment to take a look.",
    acceptGuide: "Seen enough? Click Accept to start the job.",
    workspace: {
      intro: "Welcome to your workspace! That's Mayonnaisegee's portfolio in the middle.",
      pan: "First, the controls! Hold the middle mouse button or right click, then drag to move around the page. Try it!",
      zoom: "Nice moves! Now scroll your mouse wheel to zoom in and out.",
      problems: "Spot the red dots? Each one marks something the client wants fixed.",
      dotsLater: "Heads up! As you clear more clients, the trickier each level will get and the fewer warning hints will show up.",
      toolbar: "This is the toolbar! Everything for working on the design lives up here.",
      toolbarUndo: "Made a mistake? You can undo and redo your changes right here. No need to click, just remember it's here!",
      toolbarZoom: "You can also zoom in and out here whenever you want a closer look.",
      grid: "Click this button to show or hide the grid.",
      gridDone: "See? Everything snaps to the grid, so lining things up is easy.",
      gridSettings: "Now click this one.",
      gridSettingsDone: "Here you can change how see-through the grid is. Give the slider a try!",
      together: "Let's fix one together so you get the feel of it.",
      selectAbout: "See \"About\" up in the top menu? It sits a little lower than Home and Contact. Left click it to pick it.",
      element: "Click any element with a red dot to get started.",
      controls: "This is the element panel. You can also adjust it here, and you'll use it more later!",
      dragAbout: "Drag it upwards to make sure it's aligned with the \"Home\" and \"Contact\" line. The arrow keys work too!",
      guides: "Hold on! See these guides? The purple tags show the space between elements, and the pink line shows what it lines up with. Use them to line things up!",
      nice: "Perfect! See how much tidier that menu row looks? That's alignment.",
      rulers: "When you drag, alignment rulers and the spacing between elements show up. Use them as your guide to line things up!",
      submit: "Fix the rest, then hit Submit to send it to the client.",
      compare: "All tasks done! Press and hold this button to compare your design with the original.",
      submitNow: "See the difference? Now hit Submit to send it to the client."
    },
    reply: {
      arrived: "Ooh, {client} wrote back! Open their reply to see what they think.",
      complete: "They love it! Hit Mark Completed to get paid for the job.",
      revise: "They want a few more fixes. Hit Back to Editor and give it another go!"
    },
    shop: {
      browser: "Great job! Let's take a little break. Open the Browser.",
      store: "This is the EyeCon Store. Spend the coins you earn on things for your desk!",
      browse: "Have a look around! Close the store or go Home when you're done."
    },
    completed: {
      tab: "Finished jobs go to Completed. Click it to take a look!",
      open: "This is the history of your chats with each client. Open it to read it again, then close it when you're done."
    },
    nextMail: "Ooh, you got another email! {client} needs your help next. Open it up!",
    // End of each day (2+), before the sunset. {jobs} {approved} {coins} {xp} are filled in.
    dayEnd: {
      day2: ["Two clients down! Antoks and Cones learned what spacing and readable color can do.", "You did {jobs} jobs today and earned {coins} coins. Tomorrow there's a bigger one waiting. Get some sleep!"],
      day3: ["BEAR ORAS's sign-in screen finally makes sense. That one had everything: alignment, contrast and size.", "You're becoming a real UI designer. See you tomorrow!"],
      later: ["{jobs} jobs done today, {approved} approved. Nice work!", "Clock out, rest your eyes, and come back fresh."]
    },
    // Level 4: training wheels off.
    handoff: [
      "Look at you! You've really got the hang of it. I'm so proud of you!",
      "From here on, it's real client work. No red dots, no ticks, and no counter telling you when something is right.",
      "Read the client's email, look at the page, and decide for yourself what's wrong and how it should look. Use what you learned: alignment, contrast and hierarchy.",
      "When you think it's ready, send it. The client will tell you if something still feels off.",
      "If you ever feel stuck, that's okay! Tap the hint button. For a few coins, I'll gently show you where to look.",
      "You could read your **Guidebook** too! It has every rule, with examples.",
      "I'll always be right here cheering you on. Go get 'em, designer!"
    ],
    basicsDone: [
      "You did it! You've finished the basics: alignment, contrast and typography.",
      "Good job today! Every screen you fixed is now easier to read for somebody out there.",
      ["Need a refresher? Open your **Guidebook**. It covers alignment, contrast and typography, with examples.", '#taskbar-guide'],
      ["It's always right here on your taskbar, and on your desktop too.", '#taskbar-guide'],
      "That's a wrap for your first shift. Go rest those eyes!",
      "I'll see you tomorrow!"
    ],
    compose: {
      type: "To get your client's approval, send them an email. Press any key on your keyboard to start typing!",
      attach: "Great message! Now attach your updated design so they can see your fix.",
      send: "All set. Hit Send!"
    },
    // First visit to each of the first three jobs: one basic skill per level.
    // [line, selector to point at (optional)]
    // Hands-on practice that replaces a lesson line (see PRACTICE in app.js).
    practice: {
      yappers: {
        pick: "Let's try it on the heading. Left click \"Welcome Bak!\" to pick it.",
        fg: "This is the **foreground**: the color of the text itself.",
        bgc: "This is the **background**: the color right behind the text. Here it's the white card.",
        ratio: "Contrast compares the two. The further apart they are in lightness, the bigger the number.",
        guide: "This is the **contrast guide**. It lists how much contrast each kind of text needs: headings, titles and buttons 7:1 and up; labels, hints and captions 4.5 to 7:1.",
        guideRow: "The highlighted row shows where this text is right now. Ask yourself what kind of text it is, then move it into that row.",
        demo: "Same text color, different background, different contrast! It's always about the pair.",
        slider: "Here you can only change the foreground. Darker text on a light background means more contrast.",
        bar: "This is its color panel. Drag the brightness slider down to make the text darker.",
        watch: "See the contrast number climb? Keep going until it says On target: 7:1 or more.",
        done: "Perfect! The heading now stands out the most. That's hierarchy!",
        phPick: "Now the placeholders. Left click \"Phone, username, or email\" to pick it.",
        phSlide: "Slide it into the green band: readable (at least 4.5:1) but lighter than the heading, so it still looks like a hint.",
        phShift: "\"Username\" and \"Password\" are grouped, so they need the same contrast. Hold Shift and click \"Password\" to select both, then one slider changes them together.",
        phBoth: "Slide both into the green band: readable (at least 4.5:1) but lighter than the heading. They stay the same contrast ratio, since they're grouped.",
        phDone: "Both placeholders match, and they stay lighter than the heading. Nice work!"
      },
      haybuhay: {
        intro: "Typography is how text looks: its size, weight and font.",
        ladder: "Here's this page's size ladder. Bigger means more important.",
        first: "The biggest text, the page title, is read first.",
        last: "The smallest, like the labels, is read last.",
        min: "16px is the smallest comfortable size for reading on screen. Below that, people squint or zoom.",
        pick: "Let's fix one. Left click \"1920 x 1080\" to pick it.",
        size: "Use the arrows, or type, to make it 16px. Watch it grow!",
        groupIntro: "Nice! Now the checkbox labels. Some are too small, and they're grouped, so they can be fixed together.",
        groupPick: "Left click the glowing label to pick it.",
        shift: "The outlined labels are grouped, so they need the same size. Hold Shift and click each one to set them all at once.",
        both: "Make them all exactly 16px.",
        done: "Perfect! Every label reads clearly, and they're still smaller than the titles. That's hierarchy!"
      }
    },
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
        ["Heads up: some elements are grouped. Fix every element in the group, and only then will the task be done."],
        ["Tip: you only need to change the color, not the layout. Go for it!"],
        ["One more thing: contrast also shows what matters most. The heading gets the strongest contrast, at least 7:1."],
        ["Placeholders are hints, so keep them softer: readable, but not as dark as real text. Aim for 4.5 to 7:1."],
        ["Heads up: that 7:1 limit is a design guideline, not a WCAG rule. WCAG only sets the 4.5:1 minimum."]
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
  const fill = (t, vars) => t.replace(/\{([^{}\s]+)\}/g, (m, k) => { const plain = k.normalize('NFKC'), v = vars[plain]; return v == null ? m : (plain !== k ? '**' + v + '**' : v); });
  window.EC_TEXT?.bindObject('piko', SCRIPT, 'piko', 'Piko dialogue');
  const TEMPLATED = { niceToMeet:'name', inboxGuide:'client', nextMail:'client' };
  // Filled through EC_TEXT.t so the filled line still maps back to its key (the visual tutorial needs it).
  Object.entries(TEMPLATED).forEach(([k, v]) => { SCRIPT[k] = x => window.EC_TEXT ? window.EC_TEXT.t('piko.' + k, { [v]: x }) : fill(k, { [v]: x }); });
  SCRIPT.reply.arrived = x => window.EC_TEXT ? window.EC_TEXT.t('piko.reply.arrived', { client: x }) : '';

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
    // Visual tutorial: a hand that acts out the move (tap / hold / slide) on the target.
    const hand = document.createElement('div'); hand.className = 'tv-hand hidden'; hand.setAttribute('aria-hidden', 'true');
    hand.innerHTML = '<i class="tv-ripple"></i><img src="assets/sprites/cursor-point.png" alt="">';
    document.body.appendChild(hole);
    document.body.appendChild(cursor);
    document.body.appendChild(bubble);
    document.body.appendChild(hand);
    dom = { hole, cursor, hand, bubble, textEl: bubble.querySelector('.piko-text'), caretEl: bubble.querySelector('.piko-caret'),
      hint: bubble.querySelector('.piko-hint'), prev: bubble.querySelector('.prev'), next: bubble.querySelector('.next') };
    // ‹ › re-read earlier lines of this conversation; › on the newest line advances it.
    dom.prev.addEventListener('click', e => { e.stopPropagation(); if(!cue && view > 0){ view--; showView(); } });
    dom.next.addEventListener('click', e => { e.stopPropagation(); if(!cue && view < history.length - 1){ view++; showView(); } else if(latestCanAdvance) bubble.onclick?.(); });
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
  // Compact arrow cluster, keyboard layout: ▲ on top, ◀ ▼ ▶ underneath.
  const arrowKey = (x, y, d) => `<g transform="translate(${x} ${y})"><rect x="1" y="1" width="12" height="12" rx="3" fill="#fff3d6" stroke="#4d0d74" stroke-width="1.6"/><path d="${d}" fill="#7656b3"/></g>`;
  const ARROWS = `<svg class="piko-ico piko-arrows" viewBox="0 0 42 28" aria-hidden="true">${arrowKey(14,0,'M7 4l3 4H4z')}${arrowKey(0,14,'M4 7l4-3v6z')}${arrowKey(14,14,'M4 5h6l-3 4z')}${arrowKey(28,14,'M10 7L6 4v6z')}</svg>`;
  const CONTROL_ICONS = [
    [/(middle or right mouse button|middle mouse button or right click)/gi, () => mouseIcon('middle', 'right')],
    [/(middle mouse button|middle-click|middle click)/gi, () => mouseIcon('middle')],
    [/(right mouse button|right-click|right click)/gi, () => mouseIcon('right')],
    [/(left mouse button|left-click|left click)/gi, () => mouseIcon('left')],
    [/(mouse wheel|scroll wheel)/gi, () => mouseIcon('middle')],
    [/(arrow keys)/gi, () => ARROWS],
    // A wide Shift keycap stands in for the word itself (true = replace the word, not follow it).
    [/\b(Shift)\b/g, () => `<kbd class="piko-kbd">⇧ Shift</kbd>`, true],
  ];
  // ---------- Device wording ----------
  // The lines are written for a mouse and keyboard (PC: shown exactly as written). On a
  // touchscreen or a Mac trackpad, words naming mouse buttons or keys become the matching
  // gesture. Done when a line is shown, so the stored text (and its admin key) never changes.
  const INPUT = () => window.EC_INPUT?.mode || 'pc';
  const WORDS = {
    touch: [
      [/Hold the middle mouse button or right click, then drag to move around the page\./g, 'Drag an empty spot with one finger to move around the page.'],
      [/scroll your mouse wheel to zoom in and out/gi, 'pinch with two fingers to zoom in and out'],
      [/ ?The arrow keys work too!/g, ''],
      [/Press any key on your keyboard to start typing!/g, 'Tap the message, then type anything to start!'],
      [/Press any key to type/g, 'Tap the message, then type'],
      [/Hold Shift and click/g, 'Tap'], [/Shift \+ click/g, 'Tap'],
      [/\b([Ll])eft[ -]click\b/g, (m, l) => l === 'L' ? 'Tap' : 'tap'],
      [/\b([Cc])licking\b/g, (m, c) => c === 'C' ? 'Tapping' : 'tapping'],
      [/\b([Cc])lick(s?)\b/g, (m, c, pl) => (c === 'C' ? 'Tap' : 'tap') + pl],
    ],
    mac: [
      [/Hold the middle mouse button or right click, then drag to move around the page\./g, 'Scroll with two fingers on the trackpad (or your mouse wheel) to move around the page.'],
      [/scroll your mouse wheel to zoom in and out/gi, 'pinch with two fingers on the trackpad (or ⌘ + scroll) to zoom in and out'],
      [/\b([Ll])eft[ -]click\b/g, (m, l) => l === 'L' ? 'Click' : 'click'],
    ],
  };
  const localize = t => (WORDS[INPUT()] || []).reduce((str, [re, to]) => str.replace(re, to), String(t));
  function richText(t){
    t = localize(t);
    // Any line (including admin-added ones) can say {name}: fill it with the player's name.
    // (No name yet, e.g. the admin preview: "Designer", like the home screen greeting.)
    const name = window.EC_STORE?.load?.().displayName || 'Designer';
    t = String(t).replace(/\{([^{}\s]+)\}/g, (m, k) => { const plain = k.normalize('NFKC'); return plain !== 'name' ? m : plain !== k ? '**' + name + '**' : name; });
    const esc = String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    let html = esc
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(?:[\u{1D400}-\u{1D7FF}](?:[\s'’.,!?-]*[\u{1D400}-\u{1D7FF}])*)+/gu, m => '<b>' + m.normalize('NFKC') + '</b>');
    // One pass over all rules so a phrase only gets one icon.
    const all = new RegExp(CONTROL_ICONS.map(([re]) => re.source).join('|'), 'gi');
    html = html.replace(all, m => { if(m === 'shift') return m; // "your first shift" (work), not the Shift key
      const [, icon, replace] = CONTROL_ICONS.find(([re]) => new RegExp('^(?:' + re.source + ')$', 'i').test(m)); return replace ? icon() : m + ' ' + icon(); });
    return html;
  }

  // ---------- Visual tutorial ("Show me") ----------
  // Same tutorial steps as the classic one (app.js drives both), shown differently:
  // each Piko line maps to a short cue beside the target, a hand that acts the move
  // out, or a small animated card. Talk lines that only explain are skipped or play
  // as a few-second card; lines that wait for an action stay until it is done.
  let style = 'classic';
  const visual = () => style === 'visual';
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const playerName = () => window.EC_STORE?.load?.().displayName || 'Designer';
  // Keys pressing, for "press any key".
  const KEYS = '<span class="tv-keys" aria-hidden="true"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>';
  // Either button pans: the middle and right buttons light up in turn (not both at once).
  const PAN_EITHER = () => `<span class="tv-either">${mouseIcon('middle')}${mouseIcon('right')}</span>`;
  // Mac: a trackpad with two fingertips. Touch: Piko's pointing-finger hand.
  const TRACKPAD = '<svg class="piko-ico" viewBox="0 0 40 30" aria-hidden="true"><rect x="2" y="2" width="36" height="26" rx="5" fill="#fff" stroke="#4d0d74" stroke-width="2.4"/><circle cx="16" cy="15" r="3.4" fill="#7c3aed"/><circle cx="24" cy="15" r="3.4" fill="#7c3aed"/></svg>';
  const FINGER = '<img class="pd-finger" src="assets/sprites/cursor-point.png" alt="">';
  const touchless = draw => () => INPUT() === 'touch' ? '' : draw(); // nothing to press on a touchscreen
  const ICON = { left: touchless(() => mouseIcon('left')), keys: touchless(() => KEYS), shift: touchless(() => '<kbd class="piko-kbd">⇧ Shift</kbd>'),
    pan: touchless(() => INPUT() === 'mac' ? TRACKPAD : PAN_EITHER()), wheel: touchless(() => INPUT() === 'mac' ? TRACKPAD : mouseIcon('middle')) };
  // Little animated pictures for the ideas that used to be paragraphs.
  const ART = {
    fix: '<div class="tva tva-fix"><div class="tva-win bad"><i></i><i></i><i></i></div><b class="tva-arrow">➜</b><div class="tva-win good"><i></i><i></i><i></i></div></div>',
    align: '<div class="tva tva-align"><s></s><i></i><i></i><i></i></div>',
    gaps: '<div class="tva tva-gaps"><i></i><i></i><i></i></div>',
    contrast: '<div class="tva tva-contrast"><span class="aa">Aa</span><b class="r lo">1.6 : 1</b><b class="r hi">7.5 : 1</b></div>',
    ratio: '<div class="tva tva-ratio"><span class="sw bad">Aa<em>✕</em></span><span class="sw good">Aa<em>✓</em></span><b>4.5 : 1</b></div>',
    type: '<div class="tva tva-type"><b>Title</b><span>Subtitle</span><small>Small details</small></div>',
    min16: '<div class="tva tva-min"><span class="bad"><em>12px</em>Aa ✕</span><span class="good"><em>16px</em>Aa ✓</span></div>',
    noDots: '<div class="tva tva-nodots"><span class="dot">!</span><b class="tva-arrow">➜</b><span class="bulb">💡</span></div>',
    basics: '<div class="tva tva-basics"><span>✓ Alignment</span><span>✓ Contrast</span><span>✓ Typography</span></div>',
  };
  const SKIP = { skip:true };
  const tap = (cue, more) => Object.assign({ cue, icon:'left', gesture:'tap' }, more);
  const VISUAL = {
    // Each cue: what to do (cue), shown on the real control, plus one short line on why it
    // matters (why). Lines that only chat are skipped; concepts are kept, just shorter.
    'piko.tutorial.0': { cue:'Hi! I’m Piko 👋', why:'Welcome to your first day at EyeCon Studio!', mid:1 },
    'piko.niceToMeet': () => ({ cue:`Nice to meet you, ${playerName()}!`, mid:1, auto:1600 }),
    'piko.tutorial.1': { cue:'You fix clients’ designs', why:'Their pages are hard to read or use. You make them work for everyone.', card:ART.fix },
    'piko.tutorial.2': tap('Open Mail', { why:'Your first client job just arrived.' }),
    'piko.mailIntro': SKIP, 'piko.mailExplain': SKIP,
    'piko.inboxGuide': tap('Open the email', { why:'Each email is a job: who it’s from and what they need.' }),
    'piko.previewGuide': tap('See their design', { why:'Look at the page before you start fixing it.' }),
    'piko.acceptGuide': tap('Accept the job', { why:'This opens their page in your workspace.' }),
    'piko.workspace.intro': SKIP,
    'piko.workspace.pan': { cue:'Hold and drag to move around', at:'.piko-demo', stack:1,
      touch:{ cue:'Drag an empty spot to move around' }, mac:{ cue:'Scroll with two fingers to move around' } },
    'piko.workspace.zoom': { cue:'Scroll to zoom in and out', at:'.piko-demo', stack:1,
      touch:{ cue:'Pinch with two fingers to zoom in and out' }, mac:{ cue:'Pinch (or ⌘ + scroll) to zoom in and out' } },
    'piko.workspace.problems': { cue:'Red ! = needs fixing', why:'Each mark is something the client wants fixed.', at:'#editor-canvas .el.needs-edit' },
    'piko.workspace.dotsLater': SKIP, 'piko.workspace.together': SKIP,
    'piko.workspace.selectAbout': tap('Click “About”', { why:'It sits lower than Home and Contact, so the menu looks uneven.',
      onShow: () => offsetHint(['home', 'contact'], 'about'), onHide: () => offsetHint() }),
    'piko.workspace.element': { cue:'Click an item with a red !', why:'Start with any problem the client marked.', icon:'left' },
    'piko.workspace.controls': { cue:'Exact numbers live here', why:'Use them when dragging isn’t precise enough.' },
    'piko.workspace.dragAbout': { cue:'Drag it up onto the line', why:'Items in a row should share the same top edge.', icon:'left', at:'#editor-canvas .el.piko-glow' },
    'piko.workspace.guides': { cue:'Guides help you line things up', why:'Pink line: it lines up. Purple tags: the space between items.', at:'#editor-canvas .el.selected' },
    'piko.workspace.nice': { success:'Lined up!', why:'The menu now reads as one tidy row. That’s alignment.', at:'#editor-canvas .el.selected' },
    'piko.workspace.rulers': SKIP, 'piko.workspace.toolbar': SKIP,
    'piko.workspace.toolbarUndo': { cue:'Undo · Redo', why:'Made a mistake? Step back anytime.', at:'.piko-tb-glow' },
    'piko.workspace.toolbarZoom': { cue:'Zoom', at:'.piko-tb-glow', auto:1500 },
    'piko.workspace.grid': tap('Show the grid', { why:'The grid helps you place things evenly.', at:'.piko-tb-glow' }),
    'piko.workspace.gridDone': { cue:'Things snap to 8px', why:'Snapping keeps sizes and gaps consistent.' },
    'piko.workspace.gridSettings': tap('Grid options', { at:'.piko-tb-glow' }),
    'piko.workspace.gridSettingsDone': { cue:'Try the slider', why:'It sets how see-through the grid is.', icon:'left', at:'#grid-settings-panel input[type=range]', gesture:'slide-x' },
    'piko.workspace.submit': { cue:'Fix the rest first', why:'This shows how many tasks are left. Submit comes when they’re all done.' },
    'piko.workspace.compare': { cue:'Hold to compare', why:'All tasks done! See your page next to the original.', icon:'left', gesture:'hold' },
    'piko.workspace.submitNow': tap('Submit', { why:'Send your fixed design to the client.' }),
    'piko.reply.arrived': tap('Open their reply', { why:'See what the client thinks of your fix.' }),
    'piko.reply.complete': tap('Mark Completed', { why:'They’re happy! This finishes the job and pays you.' }),
    'piko.reply.revise': tap('Back to Editor', { why:'Something still feels off. Their email says what.' }),
    'piko.shop.browser': tap('Open the Browser', { why:'Break time! Spend the coins you earned.' }),
    'piko.shop.store': tap('Visit the Store', { why:'Buy things for your desk.' }),
    'piko.shop.browse': { cue:'Look around, then close it', why:'Your next client writes in after.' },
    'piko.completed.tab': tap('Open Completed', { why:'Finished jobs are kept here.' }),
    'piko.completed.open': tap('Open this chat', { why:'Reread a client’s feedback anytime.' }),
    'piko.nextMail': tap('New email! Open it', { why:'Your next client needs help.' }),
    'piko.compose.type': { cue:'Press any key to type', why:'Tell your client what you fixed.', icon:'keys' },
    'piko.compose.attach': tap('Attach your design', { why:'So they can see the fix.' }),
    'piko.compose.send': tap('Send'),
    // Level 4: training wheels off.
    'piko.handoff.0': { cue:'From now on, you decide', why:'No more red marks. You find the problems yourself.', card:ART.noDots },
    'piko.handoff.1': SKIP, 'piko.handoff.5': SKIP,
    'piko.handoff.2': { cue:'Read the email, then fix the page', why:'Use what you learned: alignment, contrast and hierarchy.', mid:1 },
    'piko.handoff.3': { cue:'Submit when it looks right', why:'The client will tell you if something still feels off.', mid:1 },
    'piko.handoff.4': { cue:'Stuck? Use a hint', why:'For a few coins, I’ll show you where to look.', gesture:'tap' },
    'piko.basicsDone.0': { cue:'Basics done!', why:'Every screen you fixed is now easier for someone to read.', card:ART.basics },
    'piko.basicsDone.1': SKIP, 'piko.basicsDone.3.0': SKIP, 'piko.basicsDone.4': SKIP,
    'piko.basicsDone.2.0': { cue:'Your Guidebook', why:'A refresher on all three basics, with examples, anytime.', gesture:'tap' },
    'piko.basicsDone.5': { cue:'See you tomorrow!', mid:1, auto:1800 },
    // Lessons, each right before the job that needs it.
    'piko.levels.mayo.0.0': SKIP, 'piko.levels.mayo.3.0': SKIP,
    'piko.levels.mayo.1.0': { cue:'Alignment: line up the edges', why:'Lined-up pages feel calm and are easy to scan.', card:ART.align },
    'piko.levels.mayo.2.0': { cue:'Spacing: keep gaps equal', why:'Equal gaps show which items belong together.', card:ART.gaps },
    'piko.levels.yappers.0.0': { cue:'New skill: contrast', why:'Text that blends into its background is hard to read, even more on a phone in the sun.', card:ART.contrast },
    'piko.levels.yappers.1.0': SKIP, 'piko.levels.yappers.4.0': SKIP, 'piko.levels.yappers.7.0': SKIP, 'piko.levels.yappers.8.0': SKIP,
    'piko.levels.yappers.2.0': { cue:'Normal text: 4.5 : 1 or more', why:'Contrast is a ratio. The bigger the number, the easier to read.', card:ART.ratio },
    'piko.levels.yappers.5.0': { cue:'Grouped? Fix them all', why:'Grouped items must match, so a task ticks only when all are fixed.' },
    'piko.levels.yappers.6.0': { cue:'Only colors this time', why:'This job is about contrast, so leave the layout as it is.' },
    'piko.levels.yappers.9.0': { cue:'Good to know', why:'7 : 1 for headings is a design guideline. WCAG’s minimum is 4.5 : 1.' },
    'piko.levels.antoks.0.0': { cue:'Stuck? Use a hint', why:'Your first hint is free!', gesture:'tap' },
    'piko.levels.haybuhay.0.0': { cue:'New skill: typography', why:'How text looks: its size, weight and spacing.', card:ART.type },
    'piko.levels.haybuhay.2.0': SKIP, 'piko.levels.haybuhay.3.0': SKIP, 'piko.levels.haybuhay.4.0': SKIP,
    // Level 2 practice: see the problem, learn the idea, fix it, hear why it worked.
    'piko.practice.yappers.pick': tap('Click the heading', { why:'Its color is too close to the white behind it, so it’s hard to read.' }),
    'piko.practice.yappers.fg': { cue:'Text color', why:'The color of the letters.', side:'left' },
    'piko.practice.yappers.bgc': { cue:'Background color', why:'The color right behind them: the white card.', side:'left' },
    'piko.practice.yappers.ratio': { cue:'Their contrast', why:'How far apart the two colors are. Bigger = easier to read.', side:'left' },
    'piko.practice.yappers.guide': { cue:'How much each text needs', why:'Headings 7 : 1 and up. Labels and hints 4.5 to 7.', side:'left' },
    'piko.practice.yappers.guideRow': { cue:'Too faint right now', why:'It’s a heading, so it belongs in the top row.', at:'#element-settings .cz-guide li.here', side:'left' },
    'piko.practice.yappers.demo': { cue:'Same text, new background', why:'Contrast is always about the pair of colors.', at:'.piko-fgbg-demo' },
    'piko.practice.yappers.slider': { cue:'Down = darker', why:'Darker text on a light card means more contrast.', at:'#f-color', side:'left' },
    'piko.practice.yappers.bar': { cue:'Drag the slider down', why:'Darken the text until it stands out from the white.', icon:'left', at:'#f-color', side:'left', gesture:'slide-y' },
    'piko.practice.yappers.watch': { cue:'Keep going: 7 : 1 or more', why:'Watch the number climb as the text darkens.', at:'#element-settings .cz-box', side:'left' },
    'piko.practice.yappers.done': { success:'Easy to read!', why:'Dark text stands out from the white, and the heading now leads the page.', at:'#editor-canvas .el.selected' },
    'piko.practice.yappers.phPick': tap('Click the placeholder', { why:'These hints are too faint to read, too.' }),
    'piko.practice.yappers.phSlide': SKIP,
    'piko.practice.yappers.phShift': tap('Shift + click “Password”', { why:'The two fields are a pair, so they should match.', icon:'shift' }),
    'piko.practice.yappers.phBoth': { cue:'Slide into 4.5–7 : 1', why:'Readable, but softer than the heading, so they still look like hints.', icon:'left', at:'#f-color', side:'left', gesture:'slide-y' },
    'piko.practice.yappers.phDone': { success:'Matched!', why:'Readable hints that stay softer than the heading.', at:'#editor-canvas .el.selected' },
    // Level 3 practice.
    'piko.practice.haybuhay.intro': SKIP, 'piko.practice.haybuhay.groupIntro': SKIP,
    'piko.practice.haybuhay.ladder': { cue:'This is hierarchy', why:'Bigger = more important. This page’s sizes, from the title down to the labels.', at:'.piko-ladder-demo' },
    'piko.practice.haybuhay.first': { cue:'Read first', why:'The biggest text gets noticed first.' },
    'piko.practice.haybuhay.last': { cue:'Read last', why:'Small text is for details.' },
    'piko.practice.haybuhay.min': { cue:'Body text: 16px or more', why:'Any smaller and people squint or zoom.', card:ART.min16 },
    'piko.practice.haybuhay.pick': tap('Click “1920 x 1080”', { why:'It’s too small to read comfortably.' }),
    'piko.practice.haybuhay.size': tap('Make it 16px', { why:'Click the arrow, or type the number.', at:'#f-size + button', side:'left' }),
    'piko.practice.haybuhay.groupPick': tap('Click the glowing label', { why:'These grouped labels are too small, too.' }),
    'piko.practice.haybuhay.shift': tap('Shift + click the glowing ones', { why:'Grouped labels need the same size, so pick them all.', icon:'shift' }),
    'piko.practice.haybuhay.both': tap('Make them 16px', { why:'One change fixes the whole group.', at:'#f-size + button', side:'left' }),
    'piko.practice.haybuhay.done': { success:'All readable!', why:'Every label is clear, and still smaller than the titles. That’s hierarchy.', at:'#editor-canvas .el.selected' },
    // End of days 2+: one short story beat each (the day summary shows the numbers).
    'piko.dayEnd.day2.0': { cue:'Two clients down! 🎉', mid:1, auto:2200 },
    'piko.dayEnd.day3.0': { cue:'BEAR ORAS is fixed! 🐻', mid:1, auto:2200 }, 'piko.dayEnd.day3.1': { cue:'See you tomorrow!', mid:1, auto:1800 },
    'piko.dayEnd.later.1': { cue:'Clock out, rest your eyes 😴', mid:1, auto:2200 },
  };
  // What to show for a line: an entry above, or (unknown / admin-added lines) skip it if it
  // only talks, show it as-is if it asks for an action.
  function visualFor(line, isTalk){
    const key = window.EC_TEXT?.keyFor(line);
    let v = key && VISUAL[key];
    if(typeof v === 'function') v = v(line);
    if(!v) return isTalk ? SKIP : { cue: line, raw:true };
    return v[INPUT()] ? Object.assign({}, v, v[INPUT()]) : v; // touch/mac wording for this step
  }
  function cueHtml(v, line, timed){
    const timer = timed ? `<small class="tv-next">${localize('Click to continue')}</small>` : ''; // talk beats wait for a click
    const why = v.why ? `<span class="tv-why">${esc(localize(v.why))}</span>` : ''; // the reason, in Piko's words
    if(v.success) return `<span class="tv-ok" aria-hidden="true">✓</span><b class="tv-cap">${esc(localize(v.success))}</b>${why}${timer}`;
    const icon = v.icon && ICON[v.icon] && ICON[v.icon]() ? `<span class="tv-icon">${ICON[v.icon]()}</span>` : '';
    const text = v.raw ? richText(line) : esc(localize(v.cue));
    return `${v.card ? `<div class="tv-art">${v.card}</div>` : ''}<span class="tv-row">${icon}<b class="tv-cap">${text}</b></span>${why}${timer}`;
  }
  function setStyle(s){
    style = s === 'visual' ? 'visual' : 'classic';
    document.body.classList.toggle('tut-visual', visual());
  }
  let typeTimer = null;
  let currentTarget = null;
  // Lines shown since Piko last appeared, for ‹ › re-reading.
  let history = [], view = -1, latestCanAdvance = false;
  window.EC_TEXT?.register('piko.ui.continue', 'Click anywhere to continue', 'ui', 'Hint under Piko’s line');
  window.EC_TEXT?.register('piko.ui.reread', 'Next', 'ui', 'Hint while re-reading an earlier line (a (2/4) counter is added)');
  const hintText = k => window.EC_TEXT ? window.EC_TEXT.t(k) : '';
  function showView(){
    const { textEl, hint, prev, next } = dom, latest = view === history.length - 1;
    textEl.innerHTML = richText(history[view]);
    dom.bubble.classList.toggle('piko-reviewing', !latest);
    hint.textContent = !latest ? `${hintText('piko.ui.reread')} (${view + 1}/${history.length})` : latestCanAdvance ? localize(hintText('piko.ui.continue')) : '';
    prev.disabled = view <= 0;
    next.disabled = latest && !latestCanAdvance;
    prev.hidden = next.hidden = history.length < 2 && !latestCanAdvance;
  }

  // Pause before each Piko line so beats don't land back to back.
  const LINE_DELAY_MS = 600;
  const lineDelay = () => visual() ? 250 : LINE_DELAY_MS; // visual cues are short: less wait
  let sayDelayTimer = null;

  function hideBubble(){
    clearTimeout(sayDelayTimer); clearTimeout(unlockTimer);
    document.body.classList.remove('piko-line-pending');
    document.removeEventListener('click', advanceAnywhere, true);
    if(!dom) return; // (history kept: ‹ can re-read lines from before the last action too)
    endCue(true); stopClassicHand();
    dom.bubble.classList.add('hidden');
    clearInterval(typeTimer);
    typeTimer = null;
  }

  // The cue on screen in the visual tutorial: follows its target every frame.
  let cue = null; // { v, action, frame, autoTimer, rect }
  function endCue(done){
    if(!cue) return;
    clearTimeout(cue.autoTimer); cancelAnimationFrame(cue.frame);
    cue.v.onHide?.();
    dom.hand.className = 'tv-hand hidden';
    dom.bubble.style.left = dom.bubble.style.top = '';
    cue = null;
  }

  // Places the cue beside its target (below it, else above; inside the bottom of tall
  // areas like the canvas), and the hand on the target, every frame. Nothing to point
  // at: cards and greetings sit in the middle, the rest low and centred.
  // The hand acting the move out on a target rect (tap / hold / slide-x / slide-y), or hidden.
  function placeHand(g, r){
    const hand = dom.hand;
    hand.className = 'tv-hand' + (g ? ' g-' + g : ' hidden');
    if(!g) return;
    hand.style.left = (r.left + r.width * (g === 'slide-x' ? .3 : .5)) + 'px';
    hand.style.top = (r.top + r.height * (g === 'slide-y' ? .3 : .55)) + 'px';
    hand.style.setProperty('--slide', (g === 'slide-y' ? r.height * .45 : r.width * .45) + 'px');
  }
  // Classic tutorial ("Explain it"): Piko's words stay as they are, and the same hand
  // shows the click (or slide / hold) on whatever an action line asks for.
  let classicHand = null;
  function stopClassicHand(){ if(!classicHand) return; cancelAnimationFrame(classicHand.frame); classicHand = null; dom.hand.className = 'tv-hand hidden'; }
  function followClassicHand(){
    if(!classicHand || !dom) return;
    const v = classicHand.v, t = (v.at && document.querySelector(v.at)) || currentTarget;
    const r = t && t.isConnected ? t.getBoundingClientRect() : null;
    placeHand(r && r.width && r.height <= innerHeight * .45 ? v.gesture : null, r);
    classicHand.frame = requestAnimationFrame(followClassicHand);
  }
  function placeCue(){
    if(!cue || !dom) return;
    const { bubble, hand } = dom, v = cue.v;
    const t = (v.at && document.querySelector(v.at)) || currentTarget;
    const r = t && t.isConnected ? t.getBoundingClientRect() : null;
    const cw = bubble.offsetWidth, ch = bubble.offsetHeight, W = innerWidth, H = innerHeight, gap = 16;
    let x, y;
    if(r && r.width && !(v.card && !v.at)){
      const big = r.height > H * .45;
      x = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), W - cw - 8);
      // Read top to bottom: a target in the lower half gets its cue above it, otherwise below.
      const lower = r.top + r.height / 2 > H / 2;
      y = big ? Math.min(r.bottom, H) - gap - ch : lower && r.top - gap - ch >= 8 ? r.top - gap - ch : r.bottom + gap + ch <= H - 8 ? r.bottom + gap : Math.max(8, r.top - gap - ch);
      if(v.side === 'left'){ // beside it instead, left of the side panel, so what's under the target stays in view
        const panel = t.closest('#element-settings')?.getBoundingClientRect() || r;
        x = Math.max(8, panel.left - gap - cw); y = Math.min(Math.max(8, r.top + r.height / 2 - ch / 2), H - ch - 8);
      }
      cue.rect = r;
      placeHand(v.gesture && !big ? v.gesture : null, r);
    } else {
      x = (W - cw) / 2; y = v.card || v.success || v.mid ? Math.max(8, (H - ch) / 2) : Math.max(8, H - ch - 144);
      hand.className = 'tv-hand hidden';
    }
    bubble.style.left = Math.round(x) + 'px'; bubble.style.top = Math.round(y) + 'px';
    cue.frame = requestAnimationFrame(placeCue);
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
    // Both tutorials: Level 1's quick tips are the animated cards, and every "click this" step is the
    // short cue with Piko under the cursor (unless an admin added lines around it).
    const key0 = window.EC_TEXT?.keyFor(line) || '', x0 = key0 && window.EC_TEXT.extras(key0);
    const clickStep = (opts.tap || !opts.onDone && visualFor(line, false).gesture) && !(x0 && (x0.before.length || x0.after.length)); // click / slide / hold
    // Classic too: any line with a cue (not skipped, no admin-added lines) shows as that cue; the rest stay full lines.
    const hasCue = /^piko\.(levels|practice)\.|^piko\.workspace\.(pan|zoom|guides)$/.test(key0) && !/^piko\.levels\.yappers\.[69]\.0$/.test(key0) && !(x0 && (x0.before.length || x0.after.length || x0.skip));
    const touchAction = INPUT() === 'touch' && !opts.onDone && VISUAL[key0] && VISUAL[key0] !== SKIP && !(x0 && (x0.before.length || x0.after.length));
    if(visual() || clickStep || hasCue || touchAction){
      // Lines that only explain are skipped; the rest become a short cue (admin-added
      // before/after lines are left to the classic tutorial).
      const v = opts.tap && !VISUAL[key0] ? { cue: line, raw:true, icon:'left', gesture:'tap' } : visualFor(line, !!opts.onDone); // an admin-added click line
      if(v.skip && opts.onDone){ hideBubble(); setTimeout(opts.onDone); return; }
      return sayOne(line, Object.assign({}, opts, { _v: v }));
    }
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
    const fillName = t => String(t).replace(/\{([^{}\s]+)\}/g, (m, k) => { const plain = k.normalize('NFKC'); return plain !== 'name' ? m : plain !== k ? '**' + name + '**' : name; });
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
      sayDelayTimer = setTimeout(() => sayOne(line, Object.assign({}, opts, { now:true })), lineDelay());
      return;
    }
    const { textEl, caretEl, bubble } = ensureDom();
    const v = opts._v;
    endCue(true); // a new line replaces the cue (✓ if it had asked for an action)
    stopClassicHand();
    if(!v && !opts.onDone){ const g = visualFor(line, false); if(g.gesture){ classicHand = { v: g }; followClassicHand(); } }
    bubble.classList.toggle('piko-cue', !!v);
    bubble.classList.toggle('piko-cue-card', !!(v && (v.card || v.success)));
    bubble.classList.toggle('piko-cue-ok', !!(v && v.success));
    bubble.classList.toggle('piko-cue-stack', !!(v && v.stack)); // centred under its card, Piko below
    bubble.classList.toggle('piko-top', !v && !!opts.top);
    bubble.classList.toggle('piko-left', !v && !!opts.left); // keep clear of right-side highlights
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
    const words = t => String(t || '').split(/\s+/).filter(Boolean).length;
    const autoMs = !v || !opts.onDone ? 0 : v.why ? Math.max(v.auto || 0, 1500 + 300 * words(`${v.cue || v.success} ${v.why}`)) : v.auto || 2200;
    if(v){
      textEl.innerHTML = cueHtml(v, full, autoMs);
      cue = { v, action: !opts.onDone, frame: 0, autoTimer: 0, rect: null };
      v.onShow?.();
      placeCue();
    }
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
    const advance = () => {
      document.removeEventListener('click', advanceAnywhere, true);
      if(typeTimer){ finishTyping(); return; }
      // If onDone chains another line, Piko stays up; otherwise he leaves.
      saidAgain = false;
      if(opts.onDone) opts.onDone();
      // Wait a tick: async tours (await talk) say their next line in a
      // microtask, so Piko should stay up instead of leaving and popping back.
      setTimeout(() => { if(!saidAgain) hideBubble(); });
    };
    bubble.onclick = () => {
      if(view < history.length - 1){ view++; showView(); return; } // re-reading: a click steps forward one line
      if(!opts.onDone || lastPointerDown < shownAt) return; // an instruction: it stays until the player does it
      advance();
    };
    // Visual tutorial: explaining beats wait for a click, like the classic lines.

  }

  let placeRetryTimer = null, pointTimer = null; // pointTimer: a highlight waiting to land
  let liftLeaveTimer = null;

  function finishLiftLeave(){
    clearTimeout(liftLeaveTimer); liftLeaveTimer = null;
    document.querySelectorAll('.piko-lift.piko-leaving').forEach(n => n.classList.remove('piko-lift', 'piko-leaving'));
    document.querySelectorAll('.piko-lift-dim.piko-leaving').forEach(n => n.remove());
  }

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
    if(opts.delay == null && (!dom || dom.bubble.classList.contains('hidden'))) opts.delay = lineDelay();
    const lift = el.classList.contains('desktop-icon');
    const run = () => {
      const { cursor, hole } = ensureDom();
      // Small screens: the target can sit below the fold (e.g. a long email on a phone), and the
      // tutorial freezes everything else, so bring it into view. (PC: already in view; unchanged.)
      if(INPUT() !== 'pc') el.scrollIntoView?.({ block:'nearest', inline:'nearest' });
      // The icon lives inside low z-index stacking contexts, so a body-level
      // dim can never sit under it. Put a dim right beside it instead.
      if(lift){
        finishLiftLeave(); // a new lift replaces any still fading out
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
        // Every new highlight fades in from clear, like the first one on the Mail
        // app (instead of the dim snapping straight from one target to the next).
        if(!lift && currentTarget !== el && !hole.classList.contains('hidden')){
          hole.style.transition = 'none'; hole.classList.add('hidden'); void hole.offsetWidth; hole.style.transition = '';
        }
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
        // Exact fit: same box and corner radius as the target, clipped to the
        // editor's visible canvas area (a page-wide bar shouldn't spill over the panels).
        const clip = el.closest('#editor-canvas') && document.getElementById('editor-canvas-wrap')?.getBoundingClientRect();
        const L = clip ? Math.max(r.left, clip.left) : r.left, T = clip ? Math.max(r.top, clip.top) : r.top;
        const R = clip ? Math.min(r.right, clip.right) : r.right, B = clip ? Math.min(r.bottom, clip.bottom) : r.bottom;
        hole.style.left = L + 'px';
        hole.style.top = T + 'px';
        hole.style.width = Math.max(0, R - L) + 'px';
        hole.style.height = Math.max(0, B - T) + 'px';
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
    clearTimeout(pointTimer);
    if(opts.delay) pointTimer = setTimeout(run, opts.delay); else run();
  }

  function clearTarget(){
    if(cue?.action) hideBubble(); // visual tutorial: the step is done, the cue leaves with its ✓
    if(dom) stopClassicHand(); // classic: the highlight went, so did the step
    const { cursor, hole } = ensureDom();
    clearTimeout(pointTimer); // a highlight still waiting to land is cancelled too
    clearInterval(placeRetryTimer); placeRetryTimer = null;
    document.querySelectorAll('.piko-pointed').forEach(n => n.classList.remove('piko-pointed'));
    currentTarget = null;
    // Fade the lifted icon's dim + outline out instead of dropping them.
    document.querySelectorAll('.piko-lift:not(.piko-leaving), .piko-lift-dim:not(.piko-leaving)').forEach(n => n.classList.add('piko-leaving'));
    clearTimeout(liftLeaveTimer);
    liftLeaveTimer = setTimeout(finishLiftLeave, DIM_FADE_MS);
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
    if(visual()) hideBubble(); else say(line, { top:false }); // visual: the card alone asks
    const { bubble } = ensureDom();
    const waitForBubble = setInterval(() => {
      if(!visual() && bubble.classList.contains('hidden')) return;
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

  // On-screen control demos for players who skip reading: a "TRY IT" card with a big
  // mouse (and arrows) acting the move out in the middle of the canvas, until Piko's
  // step is done.
  function demo(kind, el){
    document.querySelectorAll('.piko-demo, .tv-ghost').forEach(n => n.remove());
    if(!kind) return;
    if(kind === 'drag' && ghostDrag(el || document.querySelector('#editor-canvas .el.piko-glow'))) return;
    const wrap = document.getElementById('editor-canvas-wrap');
    if(!wrap) return;
    const r = wrap.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'piko-demo piko-demo-' + kind;
    d.setAttribute('aria-hidden', 'true');
    // The drag demo sits to the side: About is centred in the canvas and must stay visible.
    const cx = kind === 'drag' ? r.left + r.width * .78 : r.left + r.width / 2, cy = kind === 'drag' ? r.top + r.height * .36 : r.top + r.height / 2;
    d.style.left = cx + 'px'; d.style.top = cy + 'px';
    const mode = INPUT();
    const mouse = mode === 'touch' ? FINGER : mode === 'mac' && kind !== 'drag' ? TRACKPAD
      : kind === 'pan' ? PAN_EITHER() : kind === 'zoom' ? mouseIcon('middle') : mouseIcon('left');
    const label = ({ touch:{ pan:'Drag', zoom:'Pinch', drag:'Drag up' }, mac:{ pan:'Two-finger scroll', zoom:'Pinch', drag:'Click + drag up' } }[mode]
      || { pan:'Hold + drag', zoom:'Scroll', drag:'Click + drag up' })[kind];
    // Which button(s), spelled out under the action.
    const how = ({ touch:{ pan:'One finger on an empty spot', zoom:'Two fingers', drag:'One finger' }, mac:{ pan:'Two fingers on the trackpad', zoom:'Pinch, or ⌘ + scroll', drag:'Click and drag' } }[mode]
      || { pan:'Middle mouse button or right click', zoom:'Mouse wheel', drag:'Left click' })[kind];
    d.innerHTML = `<div class="pd-stage"><span class="pd-mouse">${mouse}</span>
      ${kind === 'pan' ? '<i class="pd-arrow l">◀</i><i class="pd-arrow r">▶</i>' : ''}
      ${kind === 'zoom' ? '<i class="pd-arrow u">▲</i><i class="pd-arrow d">▼</i><b class="pd-zoom">+ / −</b>' : ''}
      ${kind === 'drag' ? '<i class="pd-arrow u">▲</i>' : ''}</div>
      <p>${label}</p><p class="pd-how">${how}</p>${kind === 'drag' ? `<p class="pd-or">or ${ARROWS}</p>` : ''}`;
    document.body.appendChild(d);
  }
  // Visual tutorial: a see-through copy of the element (with the hand) slides from
  // where it is up to the line it should share, so the move is shown, not told.
  function ghostDrag(node){
    const E = window.EC_EDITOR, G = window.EC_GRADING, canvas = document.getElementById('editor-canvas');
    const els = E?.getElements?.() || [], me = node && els.find(e => e.id === node.dataset.id);
    const goal = me && (E.getLevel()?.goals || []).find(g => g.check.sameY && G.goalIds(g.check).includes(me.id));
    const refs = goal ? G.goalIds(goal.check).map(id => els.find(e => e.id === id)).filter(e => e && e.id !== me.id) : [];
    if(!canvas || !refs.length) return false;
    const all = [...refs, me], left = Math.min(...all.map(e => e.x)) - 12, right = Math.max(...all.map(e => e.x + e.w)) + 12;
    const g = document.createElement('div');
    g.className = 'tv-ghost'; g.setAttribute('aria-hidden', 'true');
    // Design pixels inside the canvas: it pans and zooms with the page.
    g.style.cssText = `left:${me.x}px;top:${me.y}px;width:${me.w}px;height:${me.h}px;--dy:${refs[0].y - me.y}px;` +
      `font:${me.fontWeight || 400} ${me.fontSize || 16}px '${me.fontFamily || 'Nunito'}';color:${me.color || '#3b172e'}`;
    // The dashed line is the shared top edge it should move onto.
    g.innerHTML = `<i class="tv-ghost-line" style="left:${left - me.x}px;width:${right - left}px"></i>` +
      `<span class="tv-ghost-el">${esc(me.text || '')}<img src="assets/sprites/cursor-point.png" alt=""></span>`;
    canvas.appendChild(g);
    return true;
  }
  // "Sits a little lower": a dashed guide along Home/Contact's top edge and a
  // bracket showing how far About drops below it, drawn in with a bounce.
  function offsetHint(refIds, id){
    document.querySelectorAll('.piko-offset, .po-tag-top').forEach(n => n.remove());
    const canvas = document.getElementById('editor-canvas'), els = window.EC_EDITOR?.getElements?.() || [];
    const refs = [].concat(refIds || []).map(r => els.find(e => e.id === r)).filter(Boolean), el = els.find(e => e.id === id);
    if(!canvas || !refs.length || !el) return;
    // Line, box and bracket are drawn inside the canvas in design pixels, so they
    // stay put while panning and scale with the canvas when zooming.
    const all = [...refs, el];
    const left = Math.min(...all.map(r => r.x)) - 12, right = Math.max(...all.map(r => r.x + r.w)) + 12;
    const top = Math.min(...refs.map(r => r.y)); // the shared line Home and Contact sit on
    const h = document.createElement('div');
    h.className = 'piko-offset'; h.setAttribute('aria-hidden', 'true');
    h.innerHTML = `<i class="po-line" style="left:${left}px;top:${top}px;width:${right - left}px"></i>
      <i class="po-ghost" style="left:${el.x - 6}px;top:${el.y - 6}px;width:${el.w + 12}px;height:${el.h + 12}px"></i>
      <i class="po-gap" style="left:${el.x - 16}px;top:${top}px;height:${Math.max(4, el.y - top)}px"></i>`;
    canvas.appendChild(h);
    if(visual()) return; // the line, box and bracket say it; the cue sits where the tag would
    // The tag lives on the top layer (above the dim) and tracks the page every frame.
    const q = i => canvas.querySelector(`.el[data-id="${i.id}"]`);
    const aboutDom = q(el), refDoms = refs.map(q);
    const tag = document.createElement('div');
    tag.className = 'po-tag-top'; tag.setAttribute('aria-hidden', 'true');
    tag.innerHTML = '<span>↑ a little lower than Home &amp; Contact</span>';
    document.body.appendChild(tag);
    const place = () => {
      if(!tag.isConnected || !aboutDom) return;
      const ab = aboutDom.getBoundingClientRect(), sc = ab.width / el.w;
      tag.style.transform = `scale(${sc})`;
      tag.style.left = (ab.left + ab.width / 2 - 20 * sc) + 'px'; // its ↑ sits right under the middle of About
      tag.style.top = (ab.bottom + 14 * sc) + 'px';
      requestAnimationFrame(place);
    };
    place();
  }

  // Callout labels pointing at the drag guides (spacing tags, alignment line, the
  // elements it lines up with). Top layer, fixed in place while the drag is held.
  function guideNotes(on){
    document.querySelectorAll('.piko-anno').forEach(n => n.remove());
    if(!on) return;
    const add = (x, y, text, dir) => {
      const n = document.createElement('div');
      n.className = 'piko-anno piko-anno-' + dir; n.setAttribute('aria-hidden', 'true');
      n.textContent = text; n.style.left = x + 'px'; n.style.top = y + 'px';
      document.body.appendChild(n);
    };
    const about = document.querySelector('#editor-canvas .el.selected')?.getBoundingClientRect();
    const mid = r => r.left + r.width / 2;
    // The gap tag nearest the dragged element (in its row, above it).
    const tags = [...document.querySelectorAll('#editor-canvas .spacing-overlay rect')].map(n => n.getBoundingClientRect());
    if(tags.length && about){
      const t = tags.filter(r => r.bottom <= about.top + 4).sort((a, b) => Math.abs(mid(a) - mid(about)) - Math.abs(mid(b) - mid(about)))[0] || tags[0];
      add(mid(t), t.top - 10, 'Space between elements', 'down');
    }
    // Only the pieces it lines up with (not the whole bar behind them).
    const refs = [...document.querySelectorAll('#editor-canvas .alignment-reference')].map(n => n.getBoundingClientRect())
      .filter(r => !about || r.width < about.width * 4);
    const line = document.querySelector('#editor-canvas .guide-line.h') || document.querySelector('#editor-canvas .guide-line.v');
    if(line){
      const r = line.getBoundingClientRect();
      if(line.classList.contains('h')) add((refs.length ? Math.max(...refs.map(q => q.right)) : r.left + r.width * .75) + 18, r.top, 'Line they all line up on', 'left');
      else add(r.left + 18, (refs.length ? Math.min(...refs.map(q => q.top)) : r.top + 40) - 10, 'Line they all line up on', 'left');
    }
    if(refs.length){
      const q = about ? refs.sort((a, b) => Math.abs(mid(a) - mid(about)) - Math.abs(mid(b) - mid(about)))[0] : refs[0];
      add(mid(q), q.bottom + 12, 'Lines up with this', 'up');
    }
  }
  // Dim with several lit holes at once (e.g. the text being recolored AND its color
  // panel). An even-odd clip path cuts each target out; it follows them every frame.
  let multiFrame = null;
  function spotlight(els){
    cancelAnimationFrame(multiFrame);
    document.querySelectorAll('.piko-multi-dim').forEach(n => n.remove());
    els = (els || []).filter(Boolean);
    if(!els.length) return;
    clearTarget();
    const dim = document.createElement('div'); dim.className = 'piko-multi-dim'; dim.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dim);
    const draw = () => {
      if(!dim.isConnected) return;
      const W = innerWidth, H = innerHeight, pad = 8;
      const holes = els.filter(e => e.isConnected).map(e => { const r = e.getBoundingClientRect(); return `M${r.left - pad} ${r.top - pad}H${r.right + pad}V${r.bottom + pad}H${r.left - pad}Z`; }).join('');
      dim.style.clipPath = `path(evenodd, 'M0 0H${W}V${H}H0Z${holes}')`;
      multiFrame = requestAnimationFrame(draw);
    };
    draw();
  }
  window.EC_PIKO = { spotlight, demo, offsetHint, guideNotes, SCRIPT, say, ask, hideBubble, pointAt, clearTarget, setStyle, getStyle: () => style };
})();
