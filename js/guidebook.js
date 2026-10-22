// "Don't Get Sued: The UI Survival Guide" — a taskbar app that opens as a book in the middle of the screen.
// Each page is HTML (same text as the in-game manual in the thesis, Appendix G), two pages per spread.
(() => {
  // Each rule has a small looping demo beside it, drawn like the game's editor (grid, selection, hand cursor).
  // m(): an element that moves from (x0,y0) to (x1,y1) every loop (percent of the demo).
  const m = (cls, x0, y0, x1, y1, more = '', html = '') => `<i class="${cls}" style="--x0:${x0}%;--y0:${y0}%;--x1:${x1}%;--y1:${y1}%;${more}">${html}</i>`;
  const hand = (x0, y0, x1, y1) => m('gd-hand gd-mv', x0, y0, x1, y1);
  const swap = (a, b) => `<i class="gd-tag gd-b4">${a}</i><i class="gd-tag gd-af">${b}</i>`;
  const DEMOS = {
    grid: m('gd-box gd-mv gd-sel', 14, 30, 25, 37.5, 'width:37.5%;height:25%') + hand(40, 48, 51, 55.5) + '<i class="gd-guide gd-v gd-af" style="left:25%"></i><i class="gd-guide gd-af" style="top:37.5%"></i>',
    spacing: m('gd-bar gd-mv', 15, 12.5, 15, 12.5, 'width:70%') + m('gd-bar gd-mv', 15, 28, 15, 37.5, 'width:70%') + m('gd-bar gd-mv gd-sel', 15, 72, 15, 62.5, 'width:70%') + hand(60, 80, 60, 70.5) + '<i class="gd-gap gd-af" style="top:22%">16</i><i class="gd-gap gd-af" style="top:47%">16</i>',
    align: m('gd-line gd-mv', 22, 20, 15, 20, 'width:60%') + m('gd-line gd-mv gd-sel', 6, 45, 15, 45, 'width:50%') + m('gd-line gd-mv', 18, 70, 15, 70, 'width:65%') + hand(36, 53, 45, 53) + '<i class="gd-guide gd-v gd-af" style="left:15%"></i>',
    group: '<i class="gd-card gd-af" style="left:7%;width:40%"></i><i class="gd-card gd-af" style="left:53%;width:40%"></i>' + m('gd-chip gd-mv', 10, 12, 12, 22) + m('gd-chip gd-mv', 60, 22, 12, 52) + m('gd-chip gd-mv', 20, 72, 58, 22) + m('gd-chip gd-mv', 65, 62, 58, 52),
    hierarchy: '<i class="gd-bar" style="left:15%;top:40%;width:70%"></i><i class="gd-bar" style="left:15%;top:54%;width:55%"></i><i class="gd-bar" style="left:15%;top:68%;width:62%"></i>' + m('gd-title gd-mv gd-hier gd-sel', 15, 84, 15, 10) + hand(42, 88, 75, 22),
    contrast: '<i class="gd-text gd-fade" style="--c0:#d4d4d4;--c1:#2b2540">Aa</i>' + swap('2.1:1 ✗', '7.4:1 ✓'),
    large: '<i class="gd-text gd-big gd-fade" style="--c0:#e4e4e4;--c1:#8a7fa8">Aa</i>' + swap('1.4:1 ✗', '3.6:1 ✓'),
    ui: '<i class="gd-btn gd-fade" style="--c0:#e6e3ee;--c1:#8e7cc3">Sign in</i>' + swap('1.2:1 ✗', '3.4:1 ✓'),
    color: '<i class="gd-lbl">Email</i><i class="gd-field"></i><i class="gd-err gd-af">⚠ Email is required</i>' + swap('Red only ✗', 'Icon + label ✓'),
    combos: '<i class="gd-sw gd-p1" style="left:18%;background:#f7d96a"></i><i class="gd-sw gd-p1" style="left:54%;background:#fff"></i><i class="gd-text gd-p23 gd-sale">Sale!</i><i class="gd-tag gd-p1" style="color:#4a3a8c">Looks pretty</i><i class="gd-tag gd-p2" style="color:#c2334f">Can’t read 1.4:1 ✗</i><i class="gd-tag gd-p3" style="color:#2f7a52">Dark text 9:1 ✓</i>',
    typeHier: '<i class="gd-bar gd-grow" style="left:15%;top:16%;--h0:7%;--h1:15%;background:#4a3a8c;width:70%"></i><i class="gd-bar gd-grow" style="left:15%;top:38%;--h0:7%;--h1:10%;background:#7b6bb8;width:55%"></i><i class="gd-bar" style="left:15%;top:60%;width:70%"></i><i class="gd-bar" style="left:15%;top:74%;width:60%"></i>',
    sizes: '<i class="gd-word gd-zoom">Body text</i>' + swap('10px ✗', '16px ✓'),
    sameFont: '<i class="gd-nav"><b>Home</b><b class="gd-odd">About</b><b>Shop</b></i>' + swap('Mixed fonts ✗', 'One font ✓'),
    scale: '<i class="gd-steps"><b style="--h0:30%;--h1:100%">40</b><b style="--h0:75%;--h1:80%">32</b><b style="--h0:45%;--h1:60%">24</b><b style="--h0:55%;--h1:40%">16</b></i>' + swap('Random sizes ✗', 'Type scale ✓'),
    mind: '<i class="gd-lines"><b></b><b></b><b></b><b></b></i>',
  };
  const rule = (t, d, right, demo) => `<div class="gb-row${right ? ' r' : ''}"><div class="gb-rule"><b>${t}</b><p>${d}</p></div>${demo ? `<div class="gb-demo" aria-hidden="true">${DEMOS[demo]}</div>` : ''}</div>`;
  const head = (t, prob) => `<h2>${t}</h2><h3>What’s the problem?</h3><p class="gb-prob">${prob}</p><div class="gb-banner">RULES</div>`;
  const note = (t, d) => `<div class="gb-note"><span>${t}</span><p>${d}</p></div>`;
  const ALIGN = 'Misaligned elements and inconsistent spacing make an interface feel messy.';
  const CONTR = 'Low contrast makes text and controls hard to see.';
  const TYPO = 'Tiny text, decorative fonts, cramped spacing, and unclear headings make information hard to read.';
  const SPREADS = [
    { tab:'Cover', pages:[`<img class="gb-cover-img" src="assets/guide/cover.jpg" alt="Don’t Get Sued: The UI Survival Guide">`] },
    { tab:'Alignment', pages:[
      head('ALIGNMENT', ALIGN) + rule('Follow a Grid', 'Use a consistent grid to position elements.', 0, 'grid') + rule('Keep Spacing Consistent', 'Use EyeCon’s 8-point spacing system as your default: 8, 16, 24, 32, and so on.', 1, 'spacing') + rule('Align Related Elements', 'Align related text, icons, fields, and buttons consistently.', 0, 'align'),
      head('ALIGNMENT', ALIGN) + rule('Group Related Content', 'Use spacing, containers, and proximity to show which elements are connected.', 0, 'group') + rule('Respect Visual Hierarchy', 'Place the most important information where users can find it easily.', 1, 'hierarchy') + note('THE 8-POINT RULE', 'Use multiples of 8 for consistent spacing and layout. This is a design guideline, not a WCAG requirement.')] },
    { tab:'Contrast', pages:[
      head('CONTRAST', CONTR) + rule('Meet the Text Contrast Minimum', 'Normal text needs a contrast ratio of at least 4.5:1.', 0, 'contrast') + rule('Give Large Text More Flexibility', 'Large text (18pt, or 14pt bold) needs at least 3:1 contrast.', 1, 'large') + rule('Check Important UI Components', 'UI components and states need 3:1 contrast against neighboring colors.', 0, 'ui'),
      head('CONTRAST', CONTR) + rule('Don’t Rely on Color Alone', 'Pair color with labels, icons, or patterns when conveying meaning.', 0, 'color') + rule('Test Actual Color Combinations', 'A palette that looks attractive can still fail accessibility checks.', 1, 'combos') + note('EYECON’S NOTE', 'Never assume a color combination is accessible just because it looks readable on your screen. Check the contrast ratio.')] },
    { tab:'Typography', pages:[
      head('TYPOGRAPHY', TYPO) + rule('Establish a Hierarchy', 'Use distinct styles for titles, headings, body text, and supporting information.', 0, 'typeHier') + rule('Use Appropriate Text Sizes', 'Body text should be at least 16px; make headings clearly larger than the text below them.', 1, 'sizes') + rule('Follow the Type Scale', 'Pick sizes from a set ladder (like 40, 32, 24, 16) so each level is clearly bigger than the one below.', 0, 'scale'),
      head('TYPOGRAPHY', TYPO) + rule('Mind Your Spacing', 'Give letters, lines, and paragraphs enough room to breathe.', 0, 'mind') + rule('Keep Fonts Consistent', 'Give elements with the same role the same font, so the page feels like one design.', 1, 'sameFont') + note('ACCESSIBILITY FACT', 'WCAG 2.2 AA requires text to resize up to 200% and allow spacing adjustments without losing content or functionality.')] },
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
  // Demos run on one shared 5s clock, so a page that's re-drawn picks up exactly where it was.
  const sync = () => modal.style.setProperty('--gd-off', -(performance.now() % 5000) + 'ms');
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
  const finish = () => { if(busy){ sync(); spread.innerHTML = pending; busy = false; } };
  function show(i){
    i = Math.max(0, Math.min(SPREADS.length - 1, i));
    seen.add(i); if(mustRead && allRead()){ closeBtn.classList.add('gb-ready'); closeBtn.title = 'Close'; tip.textContent = 'All read! Close the book to continue.'; }
    const dir = Math.sign(i - at), old = slots(at), next = slots(i);
    at = i;
    modal.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === at));
    modal.querySelectorAll('.gb-prev').forEach(b => b.disabled = at === 0);
    modal.querySelectorAll('.gb-next').forEach(b => b.disabled = at === SPREADS.length - 1);
    finish(); // a turn still running snaps to its end, so a new one can start
    if(!dir || matchMedia('(prefers-reduced-motion: reduce)').matches){ sync(); spread.innerHTML = next.join(''); clip(); return; }
    // Quick clicks get quicker turns.
    const now = performance.now(), fast = now - lastTurn < 900; lastTurn = now;
    modal.style.setProperty('--gb-turn', fast ? '.32s' : '.85s');
    // Page turn: a sheet with the leaving page on its front and the arriving page on its back
    // swings over the spine. Underneath, the side it lands on keeps the old page until it lands.
    busy = true; pending = next.join('');
    const fwd = dir > 0;
    sync(); spread.innerHTML = fwd ? old[0] + next[1] : next[0] + old[1];
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
  // Tutorial: open({ mustRead, onDone }) keeps the book open until every spread has been seen.
  let seen = new Set(), mustRead = null;
  const closeBtn = modal.querySelector('.gb-close');
  const tip = Object.assign(document.createElement('p'), { className:'gb-must' });
  modal.querySelector('.gb-stage').append(tip);
  const open = opts => { mustRead = opts?.mustRead ? opts : null; seen = new Set(); tip.textContent = mustRead ? 'Turn through every page, then close the book to continue.' : ''; modal.classList.remove('hidden'); at = 0; show(0); closeBtn.focus(); }; // always opens closed, on the cover
  const allRead = () => seen.size >= SPREADS.length;
  const close = () => {
    if(mustRead && !allRead()){ closeBtn.title = 'Read every page first'; return; }
    modal.classList.add('hidden'); btn.focus();
    const m = mustRead; mustRead = null; closeBtn.classList.remove('gb-ready'); tip.textContent = ''; m?.onDone?.();
  };

  modal.addEventListener('click', e => {
    if(e.target.closest('.gb-close')) return close(); // clicking outside the book doesn't close it
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

  const btn = Object.assign(document.createElement('button'), { id:'taskbar-guide', className:'taskbar-btn', title:'UI Survival Guide', innerHTML:'<svg class="game-taskbar-icon" aria-hidden="true"><use href="#ico-book"/></svg>' });
  btn.setAttribute('aria-label', 'Open the UI Survival Guide');
  document.getElementById('taskbar-settings')?.after(btn);
  btn.addEventListener('click', () => modal.classList.contains('hidden') ? open() : close());
  document.getElementById('icon-guide')?.addEventListener('click', () => open());
  window.EC_GUIDE = { open, close };
})();
