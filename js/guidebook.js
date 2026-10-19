// "Don't Get Sued: The UI Survival Guide" — a taskbar app that opens as a book in the middle of the screen.
// Each page is HTML (same text as the in-game manual in the thesis, Appendix G), two pages per spread.
(() => {
  const rule = (t, d, right) => `<div class="gb-rule${right ? ' r' : ''}"><b>${t}</b><p>${d}</p></div>`;
  const head = (t, prob) => `<h2>${t}</h2><h3>What’s the problem?</h3><p class="gb-prob">${prob}</p><div class="gb-banner">RULES</div>`;
  const note = (t, d) => `<div class="gb-note"><span>${t}</span><p>${d}</p></div>`;
  const ALIGN = 'Misaligned elements and inconsistent spacing make an interface feel messy.';
  const CONTR = 'Low contrast makes text and controls hard to see.';
  const TYPO = 'Tiny text, decorative fonts, cramped spacing, and unclear headings make information hard to read.';
  const SPREADS = [
    { tab:'Cover', pages:[`<img class="gb-cover-img" src="assets/guide/cover.jpg" alt="Don’t Get Sued: The UI Survival Guide">`] },
    { tab:'Alignment', pages:[
      head('ALIGNMENT', ALIGN) + rule('Follow a Grid', 'Use a consistent grid to position elements.') + rule('Keep Spacing Consistent', 'Use EyeCon’s 8-point spacing system as your default: 8, 16, 24, 32, and so on.', 1) + rule('Align Related Elements', 'Align related text, icons, fields, and buttons consistently.'),
      head('ALIGNMENT', ALIGN) + rule('Group Related Content', 'Use spacing, containers, and proximity to show which elements are connected.') + rule('Respect Visual Hierarchy', 'Place the most important information where users can find it easily.', 1) + note('THE 8-POINT RULE', 'Use multiples of 8 for consistent spacing and layout. This is a design guideline, not a WCAG requirement.')] },
    { tab:'Contrast', pages:[
      head('CONTRAST', CONTR) + rule('Meet the Text Contrast Minimum', 'Normal text needs a contrast ratio of at least 4.5:1.') + rule('Give Large Text More Flexibility', 'Large text (18pt, or 14pt bold) needs at least 3:1 contrast.', 1) + rule('Check Important UI Components', 'UI components and states need 3:1 contrast against neighboring colors.'),
      head('CONTRAST', CONTR) + rule('Don’t Rely on Color Alone', 'Pair color with labels, icons, or patterns when conveying meaning.') + rule('Test Actual Color Combinations', 'A palette that looks attractive can still fail accessibility checks.', 1) + note('EYECON’S NOTE', 'Never assume a color combination is accessible just because it looks readable on your screen. Check the contrast ratio.')] },
    { tab:'Typography', pages:[
      head('TYPOGRAPHY', TYPO) + rule('Establish a Hierarchy', 'Use distinct styles for titles, headings, body text, and supporting information.') + rule('Choose Readable Fonts', 'Limit decorative fonts; avoid them for paragraphs and key instructions.', 1) + rule('Use Appropriate Text Sizes', 'Body text should be at least 16px; make headings clearly larger than the text below them.'),
      head('TYPOGRAPHY', TYPO) + rule('Mind Your Spacing', 'Give letters, lines, and paragraphs enough room to breathe.') + note('ACCESSIBILITY FACT', 'WCAG 2.2 AA requires text to resize up to 200% and allow spacing adjustments without losing content or functionality.')] },
    { tab:'Remember', pages:[`<h2 class="gb-small">BEFORE YOU DESIGN, REMEMBER THESE THREE THINGS!</h2><ol class="gb-three">
      <li><b>Alignment — Make it make sense.</b> Elements should follow a clear visual structure. Use consistent spacing, align related components, and group information that belongs together.</li>
      <li><b>Contrast — Make it visible.</b> Text and important interface elements must stand out from their backgrounds. If users struggle to distinguish them, your design needs work.</li>
      <li><b>Typography — Make it readable.</b> Choose readable fonts, appropriate text sizes, and clear text hierarchy. Your users shouldn’t have to struggle to read your interface.</li></ol>`
      + note('THE GOLDEN RULE', 'If the user has to guess, squint, or hunt for information, rethink your design.')] },
  ];
  let at = 0;

  const modal = document.createElement('div');
  modal.id = 'guidebook'; modal.className = 'guidebook hidden';
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'UI Survival Guide');
  modal.innerHTML = `<button class="gb-close" aria-label="Close guide">✕</button>
    <div class="gb-stage"><div class="gb-book">
      <div class="gb-spread-wrap"><div class="gb-spread"></div><button class="gb-edge gb-prev" aria-label="Previous page"></button><button class="gb-edge gb-next" aria-label="Next page"></button></div>
    </div>
      <nav class="gb-pager"><button class="gb-arrow gb-prev" aria-label="Previous page">‹</button>${SPREADS.map((s, i) => `<button class="gb-num" data-i="${i}">${i + 1}</button>`).join('')}<button class="gb-arrow gb-next" aria-label="Next page">›</button></nav>
    </div>`;
  document.body.append(modal);
  const spread = modal.querySelector('.gb-spread'), book = modal.querySelector('.gb-book');

  // Every spread has a left and right slot so the book never changes size:
  // the cover sits on the right (closed book); the last page faces the inside back cover.
  function slots(n){
    const s = SPREADS[n], page = (html, k) => `<article class="gb-page${n === 0 ? ' gb-cover-page' : ''}">${html}${n ? `<small class="gb-folio">${n * 2 - 1 + k}</small>` : ''}</article>`;
    const blank = '<div class="gb-blank"></div>';
    if(n === 0) return [blank, page(s.pages[0], 0)];
    // Last page: the right side is the inside of the back cover.
    if(s.pages.length === 1) return [page(s.pages[0], 0), '<div class="gb-endpaper" aria-hidden="true"><span>EyeCon</span></div>'];
    return s.pages.map(page);
  }
  let busy = false, pending = '', lastTurn = 0;
  const closedSide = n => n === 0 ? 'left' : null;
  // Hide the book outside [from, to] (px from the book's left edge) and recentre what's left.
  // With no arguments: the resting state of the current spread.
  function clip(from, to){
    const W = book.offsetWidth, half = W / 2, lip = 6, side = closedSide(at);
    if(from === undefined){ from = side === 'left' ? half : null; to = side === 'right' ? half : null; }
    const l = from == null ? 0 : Math.max(0, from - lip), r = to == null ? 0 : Math.max(0, W - to - lip);
    book.style.clipPath = `inset(0 ${r}px 0 ${l}px round 1.25rem)`;
    book.style.transform = `translateX(${(r - l) / 2}px)`;
  }
  addEventListener('resize', () => { if(!busy) clip(); });
  const finish = () => { if(busy){ spread.innerHTML = pending; busy = false; } };
  function show(i){
    i = Math.max(0, Math.min(SPREADS.length - 1, i));
    const dir = Math.sign(i - at), old = slots(at), next = slots(i);
    at = i;
    modal.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === at));
    modal.querySelectorAll('.gb-prev').forEach(b => b.disabled = at === 0);
    modal.querySelectorAll('.gb-next').forEach(b => b.disabled = at === SPREADS.length - 1);
    finish(); // a turn still running snaps to its end, so a new one can start
    if(!dir || matchMedia('(prefers-reduced-motion: reduce)').matches){ spread.innerHTML = next.join(''); clip(); return; }
    // Quick clicks get quicker turns.
    const now = performance.now(), fast = now - lastTurn < 900; lastTurn = now;
    modal.style.setProperty('--gb-turn', fast ? '.32s' : '.85s');
    // Page turn: a sheet with the leaving page on its front and the arriving page on its back
    // swings over the spine. Underneath, the side it lands on keeps the old page until it lands.
    busy = true; pending = next.join('');
    const fwd = dir > 0;
    spread.innerHTML = fwd ? old[0] + next[1] : next[0] + old[1];
    const sheet = document.createElement('div');
    sheet.className = 'gb-sheet ' + (fwd ? 'fwd' : 'back');
    sheet.innerHTML = `<div class="gb-face front">${fwd ? old[1] : old[0]}</div><div class="gb-face rear">${fwd ? next[0] : next[1]}</div>`;
    spread.append(sheet);
    sheet.addEventListener('animationend', e => { if(e.target !== sheet || !sheet.isConnected) return; finish(); clip(); });
    // The closed side opens and closes exactly with the sheet, so no empty paper shows.
    const sides = { left: closedSide(i - dir) === 'left' || closedSide(i) === 'left', right: closedSide(i - dir) === 'right' || closedSide(i) === 'right' };
    if(!sides.left && !sides.right) clip(); // an interrupted cover turn may have left the book half-closed
    else (function track(){
      if(!sheet.isConnected) return;
      const b = book.getBoundingClientRect(), r = sheet.getBoundingClientRect(), half = book.offsetWidth / 2;
      clip(sides.left ? Math.min(half, r.left - b.left) : null, sides.right ? Math.max(half, r.right - b.left) : null);
      requestAnimationFrame(track);
    })();
    modal.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === at));
    modal.querySelectorAll('.gb-prev').forEach(b => b.disabled = at === 0);
    modal.querySelectorAll('.gb-next').forEach(b => b.disabled = at === SPREADS.length - 1);
  }
  const open = () => { modal.classList.remove('hidden'); at = 0; show(0); modal.querySelector('.gb-close').focus(); }; // always opens closed, on the cover
  const close = () => { modal.classList.add('hidden'); btn.focus(); };

  modal.addEventListener('click', e => {
    if(e.target === modal || e.target.closest('.gb-close')) return close();
    const b = e.target.closest('[data-i]'); if(b) return show(+b.dataset.i);
    if(e.target.closest('.gb-prev')) show(at - 1);
    if(e.target.closest('.gb-next')) show(at + 1);
  });
  addEventListener('keydown', e => {
    if(modal.classList.contains('hidden')) return;
    if(e.key === 'Escape') close();
    if(e.key === 'ArrowLeft') show(at - 1);
    if(e.key === 'ArrowRight') show(at + 1);
  });

  const btn = Object.assign(document.createElement('button'), { id:'taskbar-guide', className:'taskbar-btn', title:'UI Survival Guide', innerHTML:'<svg class="game-taskbar-icon" aria-hidden="true"><use href="assets/icons/editor-sprite.svg#book"/></svg>' });
  btn.setAttribute('aria-label', 'Open the UI Survival Guide');
  document.getElementById('taskbar-settings')?.after(btn);
  btn.addEventListener('click', () => modal.classList.contains('hidden') ? open() : close());
  document.getElementById('icon-guide')?.addEventListener('click', open);
  window.EC_GUIDE = { open, close };
})();
