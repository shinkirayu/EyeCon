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
      'Hi! I am Piko, your design helper. We make screens kind to every pair of eyes.',
      'Keep an eye on the corner of your desktop. New client mail arrives there.',
      "You received an email! Follow the moving guide to the inbox, then open the request."
    ],
    inboxGuide: clientName => `Your first request is waiting. Open ${clientName}'s email and read what they need.`,
    previewGuide: "Here's a look at the page before you start editing.",
    acceptGuide: "Whenever you're ready, Accept will get you started.",
    workspace: {
      element: 'Start with the element that looks off, then see what the tools tell you.',
      controls: 'Great. The controls on the left are now editing that element.',
      save: "Your first change is ready. Save will prepare the client's email.",
      send: "Give the email one last look, then it's ready to send."
    }
  };

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
    const cursor = document.createElement('div'); cursor.className = 'piko-cursor hidden'; cursor.innerHTML = '👆';
    const bubble = document.createElement('div'); bubble.className = 'piko-bubble hidden';
    bubble.innerHTML =
      '<div class="piko-panel"><p class="piko-name">PIKO</p><h4 class="piko-line"><span class="piko-text"></span><span class="piko-caret">|</span></h4></div>' +
      '<img class="piko-img" src="assets/sprites/piko.png" alt="Piko, the EyeCon guide, waves hello." />';
    document.body.appendChild(hole);
    document.body.appendChild(cursor);
    document.body.appendChild(bubble);
    dom = { hole, cursor, bubble, textEl: bubble.querySelector('.piko-text'), caretEl: bubble.querySelector('.piko-caret') };
    return dom;
  }

  let typeTimer = null;
  let currentTarget = null;

  function hideBubble(){
    if(!dom) return;
    dom.bubble.classList.add('hidden');
    clearInterval(typeTimer);
    typeTimer = null;
  }

  // Shows one line of dialogue with a typewriter reveal; clicking mid-type
  // skips straight to the full line, clicking again (once complete) calls
  // onDone — same click-to-skip/click-to-advance behavior as PikoTalk.
  function say(line, opts){
    opts = opts || {};
    const { textEl, caretEl, bubble } = ensureDom();
    bubble.classList.toggle('piko-top', !!opts.top);
    bubble.classList.remove('hidden');
    clearInterval(typeTimer);
    caretEl.classList.remove('idle');
    let i = 0;
    const full = line;
    textEl.textContent = '';
    function finishTyping(){
      textEl.textContent = full;
      clearInterval(typeTimer);
      typeTimer = null;
      caretEl.classList.add('idle');
    }
    typeTimer = setInterval(()=>{
      i++;
      textEl.textContent = full.slice(0, i);
      if(i % SFX_EVERY_N_CHARS === 0 && window.EC_SOUND && window.EC_SOUND.play) window.EC_SOUND.play('click');
      if(i >= full.length) finishTyping();
    }, MS_PER_CHAR);
    bubble.onclick = () => {
      if(typeTimer){ finishTyping(); return; }
      hideBubble();
      if(opts.onDone) opts.onDone();
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
    const run = () => {
      const { cursor, hole } = ensureDom();
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
        if(opts.dim !== false) hole.classList.remove('hidden'); else hole.classList.add('hidden');
        currentTarget = el;
      };
      const place = () => {
        r = el.getBoundingClientRect();
        // Keep the guide beside the target so the mail itself stays visible.
        cursor.style.left = (r.right - 10) + 'px';
        cursor.style.top = (r.top + r.height / 2 - 18) + 'px';
        hole.style.left = (r.left - 8) + 'px';
        hole.style.top = (r.top - 8) + 'px';
        hole.style.width = (r.width + 16) + 'px';
        hole.style.height = (r.height + 16) + 'px';
      };
      tryPlace();
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      cursor._reposition = place;
      // CSS transforms do not fire resize/scroll events. Follow the bouncing
      // Mail icon frame by frame so its vignette stays centered on it.
      if(el.id === 'icon-mail'){
        const followBounce = () => {
          if(currentTarget !== el) return;
          place();
          cursor._followFrame = requestAnimationFrame(followBounce);
        };
        cursor._followFrame = requestAnimationFrame(followBounce);
      }
    };
    if(opts.delay) setTimeout(run, opts.delay); else run();
  }

  function clearTarget(){
    const { cursor, hole } = ensureDom();
    clearInterval(placeRetryTimer); placeRetryTimer = null;
    currentTarget = null;
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

  window.EC_PIKO = { SCRIPT, say, hideBubble, pointAt, clearTarget };
})();
