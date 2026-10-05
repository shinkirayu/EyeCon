/* =====================================================
   EyeCon — Poster / UI editor
   Exposes window.EC_EDITOR
===================================================== */
(function(){

  const FONTS = ['Baloo 2','Quicksand','Patrick Hand','Georgia','Arial','Verdana','Times New Roman','Fjalla One','Just Another Hand','Modak','Autour One','Roboto Slab','Londrina Solid','Niramit','Righteous','Kumbh Sans','Sansation','Boldonse','Liter','Inter','Lilita One','Kaushan Script','Lato','Mr Dafoe'];
  const WEIGHTS = [ ['400','Regular'], ['500','Medium'], ['600','Semibold'], ['700','Bold'], ['800','Extra Bold'] ];
  const SNAP_THRESHOLD = 6;

  // ---------------- Tutorial-style progressive unlock ----------------
  // Each level teaches one new concept on top of everything before it, so
  // the Element Settings panel only ever exposes fields for what's actually
  // been taught so far — by Level 7 ("combines every prior concept") every
  // field is available, matching the level design in levels.js.
  const SETTINGS_UNLOCK = {
    position:   1, // Position (X,Y) — Level 1: Basic Alignment
    sizing:     2, // Width/Height + Padding/Margin        — Level 2: Consistent Spacing
    typography: 3, // Font, size, weight, text alignment   — Level 3: Typography Hierarchy
    color:      4, // Text & background color              — Level 4: Color Contrast (WCAG)
    shape:      5, // Border radius + border                — Level 5: Accessibility Improvements
    effects:    6, // Shadow + opacity                       — Level 6: Responsive Layout
  };

  // ---------------- Inspector: which grading categories are "fair game" yet ----------------
  // The grading engine (grading.js) always checks everything, but surfacing a
  // Contrast warning before Level 4 has taught color would just be noise —
  // so the live Inspector (and the Hint tool) only ever show issues for
  // concepts the player has actually been taught so far, same pacing idea as
  // SETTINGS_UNLOCK above.
  const CATEGORY_UNLOCK = {
    Alignment: 1, Usability: 1, Spacing: 2, Hierarchy: 3, Contrast: 4, Accessibility: 5, Consistency: 6,
  };
  function unlockedFeedback(feedback, lvl, activeCategories){
    return feedback.filter(f =>
      (CATEGORY_UNLOCK[f.category] || 1) <= lvl &&
      (!activeCategories || activeCategories.includes(f.category.toLowerCase()))
    );
  }

  // ---------------- Friendly element name (settings panel title) ----------------
  // Shows what's actually selected — its own text in quotes plus a plain
  // role label — instead of a generic "Element Settings" heading, so the
  // panel tells you what you're editing without an extra click to check.
  const ROLE_LABELS = {
    heading:'Heading', subheading:'Subheading', body:'Text', small:'Caption',
    button:'Button', nav:'Nav Link', label:'Label', card:'Card',
    decorative:'Shape', background:'Background',
  };
  function friendlyElementName(el){
    const roleLabel = ROLE_LABELS[el.role] || 'Element';
    if(el.text){
      const t = el.text.length > 20 ? el.text.slice(0,20)+'…' : el.text;
      return `“${t}” ${roleLabel}`;
    }
    return roleLabel;
  }

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function roundTo8(n){ return Math.max(8, Math.round(n/8)*8); }
  const ZOOM_MIN = 0.25, ZOOM_MAX = 5; // 25% – 500%
  const ZOOM_EASE = 0.12;          // lower = smoother/slower glide, higher = snappier
  const ZOOM_WHEEL_SENSITIVITY = 0.00085; // lower = gentler zoom per wheel notch

  const state = {
    level: null,
    elements: [],
    original: [],
    selectedId: null,
    history: [],
    future: [],
    tools: { gridVisible:true, snap:true, guides:true, inspector:false, measure:false, showTargets:false, gridSize:8, gridOpacity:0.35 },
    zoom: 1,
    displayZoom: 1,
    panX: 0,
    panY: 0,
    dragging: null,
    domNodes: {},
    onSubmit: null,
    canvasEl: null,
    guideLayerEl: null,
  };

  function byId(id){ return state.elements.find(e=>e.id===id); }

  function ensureDefaults(el){
    if(el.padding == null) el.padding = 8;
    if(el.margin == null) el.margin = 8;
    if(!el.border) el.border = { width:0, color:'#000000', style:'solid' };
    if(!el.shadow) el.shadow = { enabled:false, blur:10, color:'rgba(0,0,0,0.28)' };
    if(el.opacity == null) el.opacity = 1;
    if(el.align == null) el.align = 'center';
  }

  // ---------------- Live scoring ----------------
  // Live score/issues readouts were removed — with client replies now
  // arriving as a real email instead of an instant verdict, showing a
  // running score while editing undercut that (see showHint(), which still
  // gives an on-demand nudge without giving away the number).
  // Client goals as separate cards (one per goal, with a PASS/TO DO badge,
  // what to do, and why it matters once met), then a handoff checklist.
  const TIER_NAMES = { novice:'Novice', intermediate:'Intermediate', advanced:'Advanced', expert:'Expert' };
  const GOAL_TOPIC = { align:'Text alignment', sameX:'Alignment', sameY:'Alignment', sameRight:'Alignment', sameCenterX:'Alignment',
    evenGapsY:'Spacing', evenGapsX:'Spacing', safeMargin:'Margins', minW:'Size', minH:'Tap size', minFont:'Typography',
    maxFont:'Typography', bigger:'Hierarchy', contrast:'Contrast', sameColor:'Consistency' };
  // Goal kinds grouped into the three skills the side panel is organised by.
  const CATEGORY_ORDER = ['Alignment', 'Contrast', 'Typography'];
  const CATEGORY_OF = { contrast:'Contrast', sameColor:'Contrast', minFont:'Typography', maxFont:'Typography', bigger:'Typography' };
  const goalCategory = goal => CATEGORY_OF[window.EC_GRADING.goalKind(goal.check)] || 'Alignment';
  const CATEGORY_ICON = { Alignment:'📐', Contrast:'🎨', Typography:'🔤' };
  // A short live reading for a goal ("x 64 · 96 · 40", "2.1:1 / 4.5") so
  // players see exactly how far off they are.
  function goalMeasure(goal){
    const G = window.EC_GRADING, check = goal.check, kind = G.goalKind(check);
    const els = G.goalIds(check).map(byId).filter(Boolean);
    if(!els.length) return '';
    const list = f => [...new Set(els.map(f))].join(' · ');
    const gaps = (pos, size) => { const o = els.slice().sort((a,b)=>a[pos]-b[pos]); return o.slice(1).map((e,i)=>e[pos]-(o[i][pos]+o[i][size])); };
    switch(kind){
      case 'sameX': return `x ${list(e=>e.x)}`;
      case 'sameY': return `y ${list(e=>e.y)}`;
      case 'sameRight': return `right ${list(e=>e.x+e.w)}`;
      case 'sameCenterX': return `center ${list(e=>e.x+e.w/2)}`;
      case 'evenGapsY': case 'evenGapsX': {
        const g = kind==='evenGapsX' ? gaps('x','w') : gaps('y','h');
        const range = check.minGap!=null || check.maxGap!=null ? ` / ${check.minGap ?? 8}–${check.maxGap ?? '∞'}` : '';
        return `gaps ${g.join(', ')}px${range}`;
      }
      case 'align': return `${els.filter(e=>e.align===check.align).length}/${els.length} ${check.align}`;
      case 'minH': return `height ${Math.min(...els.map(e=>e.h))}px / ${check.minH}`;
      case 'minW': return `width ${Math.min(...els.map(e=>e.w))}px / ${check.minW}`;
      case 'minFont': return `size ${Math.min(...els.map(e=>e.fontSize))}px / ${check.minFont}`;
      case 'maxFont': return `size ${Math.max(...els.map(e=>e.fontSize))}px / ${check.maxFont}`;
      case 'bigger': return `${els[0].fontSize}px vs ${els[1] ? els[1].fontSize : '?'}px`;
      case 'safeMargin': return `edge ${Math.min(...els.map(e=>Math.min(e.x, e.y, state.level.canvas.w-e.x-e.w, state.level.canvas.h-e.y-e.h)))}px / ${check.safeMargin}`;
      case 'contrast': {
        const ratios = els.map(e=>window.WCAG.contrastRatio(e.color, window.EC_GRADING.effectiveBg(state.elements, state.level.canvas.bg, e)));
        // Several elements: show each ratio, and flag when the colors don't match.
        const differ = new Set(els.map(e=>e.color.toLowerCase())).size > 1;
        const shown = els.length > 1 ? [...new Set(ratios.map(r=>r.toFixed(1)))].join(' · ') : ratios[0].toFixed(1);
        return `${shown}:1 / 4.5${differ ? ' · colors differ' : ''}`;
      }
      case 'sameColor': return [...new Set(els.map(e=>e.color.toUpperCase()))].join(' · ');
      case 'centeredX': return `centre ${Math.round(els[0].x + els[0].w/2)} / ${state.level.canvas.w/2}`;
      case 'sameSize': return list(e=>`${e.w}×${e.h}`);
      case 'above': return els.filter((e,i)=>i%2===0).map((e,k)=>{ const gap = els[k*2+1].y-(e.y+e.h); return gap < 0 ? 'inside' : `gap ${gap}px`; }).join(' · ') + (check.minGap!=null ? ` / ${check.minGap}–${check.maxGap}` : '');
      case 'wraps': {
        const [box, ...inner] = els;
        return `padding ${[Math.min(...inner.map(e=>e.y))-box.y, box.x+box.w-Math.max(...inner.map(e=>e.x+e.w)), box.y+box.h-Math.max(...inner.map(e=>e.y+e.h)), Math.min(...inner.map(e=>e.x))-box.x].join(' · ')}`;
      }
    }
    return '';
  }
  function updateLiveScore(){
    updateGoalMarkers();
    const list = document.getElementById('editor-mail-points');
    if(!list || !state.level) return;
    if(!state.level.goals){
      list.replaceChildren(...(state.level.concepts || []).map(c => Object.assign(document.createElement('li'), {textContent:c})));
      return;
    }
    const G = window.EC_GRADING;
    const results = G.checkGoals(state.level, state.elements);
    // Suggest one task at a time, in list order. When it's done, move on to the
    // next unfinished one; an earlier task that breaks again doesn't pull it back.
    const nextOpen = from => { for(let k = 0; k < results.length; k++){ const j = (from + k) % results.length; if(!results[j].met) return j; } return null; };
    if(state.focusGoal == null || results[state.focusGoal]?.met) state.focusGoal = nextOpen(state.focusGoal == null ? 0 : state.focusGoal + 1);
    // Tasks grouped by skill, each section opening with its rule (a level can
    // reword it with level.categoryIntro), then a handoff checklist with one
    // line per skill that ticks when all of that skill's required tasks pass.
    const sections = CATEGORY_ORDER.map(cat => ({ cat, items: results.map((r, i) => Object.assign({ i }, r)).filter(r => goalCategory(r.goal) === cat) }))
      .filter(sec => sec.items.length);
    const doneCount = results.filter(r => r.met).length;
    // Task progress lives in the client card at the top of the rail.
    const brief = document.getElementById('editor-mail-brief');
    let progress = document.getElementById('editor-task-progress');
    if(!progress){ progress = Object.assign(document.createElement('div'), {id:'editor-task-progress', className:'editor-task-progress'}); brief.append(progress); }
    progress.innerHTML = `<div><span>${doneCount} of ${results.length} tasks done</span></div>
      <div class="editor-task-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${results.length}" aria-valuenow="${doneCount}" aria-label="Tasks done"><i style="width:${results.length ? doneCount / results.length * 100 : 0}%"></i></div>`;
    const cards = sections.map(({cat, items}) => {
      const sec = document.createElement('li');
      sec.className = 'editor-goal-section cat-' + cat.toLowerCase();
      // Category header (icon + name), no rule sentence under it.
      const head = document.createElement('div'); head.className = 'editor-goal-cat';
      head.innerHTML = `<span class="editor-goal-cat-icon" aria-hidden="true">${CATEGORY_ICON[cat]}</span><h4></h4>`;
      head.querySelector('h4').textContent = cat;
      sec.append(head);
      const ul = document.createElement('ul');
      items.forEach(({goal, met, i}) => {
        const li = document.createElement('li');
        li.className = 'editor-goal' + (met ? ' met' : '') + (goal.bonus ? ' bonus' : '') + (i === state.focusGoal ? ' focus' : '');
        li.setAttribute('aria-label', `${met ? 'Done' : 'To do'}: ${goal.label}`);
        const box = Object.assign(document.createElement('span'), {className:'editor-goal-tick', textContent: met ? '✓' : ''});
        box.setAttribute('aria-hidden', 'true');
        const body = document.createElement('div');
        const text = Object.assign(document.createElement('p'), {textContent: goal.label});
        if(goal.bonus) text.append(Object.assign(document.createElement('span'), {className:'editor-goal-badge', textContent:'BONUS'}));
        body.append(text, Object.assign(document.createElement('span'), {className:'editor-goal-measure', textContent: goalMeasure(goal)}));
        // The tip shows on the suggested task; the reason shows once a task is done.
        if(i === state.focusGoal) body.append(Object.assign(document.createElement('small'), {textContent:`Tip: ${goal.tip}`}));
        li.append(box, body);
        ul.append(li);
      });
      sec.append(ul);
      return sec;
    });
    // Progress shows once (the client card); each task's tick shows the rest,
    // so the category badges carry no count and there is no separate checklist.
    list.replaceChildren(...cards);
  }


  // ---------------- History ----------------
  function pushHistory(){
    state.history.push(clone(state.elements));
    if(state.history.length > 60) state.history.shift();
    state.future = [];
    updateLiveScore();
  }
  function undo(){
    if(state.history.length < 2) return;
    state.future.push(state.history.pop());
    state.elements = clone(state.history[state.history.length-1]);
    rebuildAll();
  }
  function redo(){
    if(state.future.length === 0) return;
    const next = state.future.pop();
    state.history.push(clone(next));
    state.elements = clone(next);
    rebuildAll();
  }

  // ---------------- Open / build ----------------
  function open(level, savedElements){
    state.level = level;
    state.focusGoal = null; // the suggested next task in the goal list
    state.elements = clone(savedElements || level.elements);
    state.elements.forEach(ensureDefaults);
    state.elements.forEach(el=>{
      for(const key of ['x','y','w','h']) el[key] = Math.round(el[key] / 8) * 8;
      el.w = Math.max(8, el.w);
      el.h = Math.max(8, el.h);
      for(const key of ['padding','margin','radius']){
        if(typeof el[key] === 'number') el[key] = Math.max(0, Math.round(el[key] / 8) * 8);
      }
    });
    state.original = clone(level.elements);
    state.selectedId = null;
    state.history = [];
    state.future = [];
    // Every view aid starts off — an empty canvas to begin with, rather
    // than grid/snap/guides already cluttering it before you've asked for them.
    const profile = window.EC_STORE ? window.EC_STORE.load() : {};
    const hasUpgrade = id => window.EC_STORE && window.EC_STORE.hasUpgrade(profile, id);
    state.tools.gridVisible = hasUpgrade('grid-buddy'); state.tools.snap = true;
    state.tools.guides = true;
    state.tools.inspector = false; state.tools.measure = false; state.tools.showTargets = false;
    state.tools.gridSize = 8;
    state.tools.gridOpacity = 0.35;
    // Start mobile commissions with the whole page visible at the larger
    // mobile zoom baseline, rather than opening cropped at 100%.
    state.zoom = matchMedia('(pointer:coarse)').matches ? 0.3 : 1;
    state.displayZoom = state.zoom;
    state.panX = 0; state.panY = 0;
    if(zoomAnimId){ cancelAnimationFrame(zoomAnimId); zoomAnimId = null; }
    zoomAnchor = null;
    if(hintHighlightTimeout){ clearTimeout(hintHighlightTimeout); hintHighlightTimeout = null; }
    pushHistory();
    buildCanvas();
    updateToolButtonStates();
    updateLiveScore();
    syncGridSettingsUI();
    resetSettingsPlaceholder();
    document.getElementById('editor-mail-sender').textContent = level.clientName;
    document.getElementById('editor-mail-stage').textContent = `${TIER_NAMES[level.tier] || 'Client'} · ${level.pageLabel || 'Website page'}`;
    document.getElementById('editor-mail-avatar').innerHTML = level.avatarEmoji || '✉';
    updateLiveScore();
    // Point straight at the first thing to fix instead of a generic
    // "click anything" — this is what used to require noticing the mission
    // panel and clicking "Focus next objective" yourself.
    const chipLabel = document.querySelector('.edit-mode-chip .btn-label');
    if(chipLabel) chipLabel.textContent = level.clientName;
    document.getElementById('typescale-panel').hidden = true;
    document.getElementById('grid-settings-panel').hidden = true;
  }

  // Mobile 50% matches the former 150% view. PC keeps its fitted baseline.
  function baseFitScale(canvasW, canvasH){
    const wrap = document.getElementById('editor-canvas-wrap');
    const availW = Math.max(1, wrap.clientWidth - 24);
    const availH = Math.max(1, wrap.clientHeight - 24);
    const mobileMultiplier = matchMedia('(pointer:coarse)').matches ? 3 : 1;
    return mobileMultiplier * Math.min(availW/canvasW, availH/canvasH);
  }

  // Applies the current base-fit * displayZoom scale AND the current pan
  // offset to the canvas via a single transform. Panning and zooming both
  // live entirely in this transform (translate + scale) rather than native
  // browser scrolling — that's what lets "zoom to cursor" work exactly the
  // same way whether the design currently fits inside the viewport or
  // spills way outside it; there's no dependency on scrollWidth/scrollLeft
  // (which only exist, and only behave predictably, once content actually
  // overflows).
  function applyCanvasTransform(){
    const level = state.level;
    const canvas = state.canvasEl;
    if(!canvas || !level) return;
    const base = baseFitScale(level.canvas.w, level.canvas.h);
    const scale = base * state.displayZoom;
    canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${scale})`;
    canvas.style.transformOrigin = '0 0';
    canvas.style.setProperty('--selection-unit', (1 / scale) + 'px');
    syncBackdropDots(scale);
    renderRulers();
    renderSpacing();
    updateZoomBadge();
  }

  // Dot backdrop locked to the design's 8-point grid: dots sit on every
  // 8 canvas px (or a multiple of 8 when zoomed far out, so they never get
  // denser than ~8 screen px) and move/scale with the canvas when panning or
  // zooming, so they work as snap guides even with the grid tool off.
  function syncBackdropDots(scale){
    const wrap = document.getElementById('editor-canvas-wrap');
    if(!wrap) return;
    let step = 8 * scale;
    while(step < 8) step *= 2;
    wrap.style.setProperty('--dot-step', step + 'px');
    wrap.style.setProperty('--dot-x', state.panX + 'px');
    wrap.style.setProperty('--dot-y', state.panY + 'px');
  }

  function updateZoomBadge(){
    const badge = document.getElementById('zoom-badge');
    if(badge) badge.textContent = `🔍 ${Math.round(state.zoom*100)}%`;
    const label = document.getElementById('editor-zoom-label');
    if(label) label.textContent = `${Math.round(state.zoom*100)}%`;
    const out = document.getElementById('editor-zoom-out');
    const zoomIn = document.getElementById('editor-zoom-in');
    if(out) out.disabled = state.zoom <= ZOOM_MIN;
    if(zoomIn) zoomIn.disabled = state.zoom >= ZOOM_MAX;
  }

  // Centers the canvas in the wrap at the current displayZoom.
  function centerCanvas(){
    const level = state.level;
    const wrap = document.getElementById('editor-canvas-wrap');
    if(!level || !wrap) return;
    const base = baseFitScale(level.canvas.w, level.canvas.h);
    const scale = base * state.displayZoom;
    state.panX = (wrap.clientWidth - level.canvas.w*scale) / 2;
    state.panY = (wrap.clientHeight - level.canvas.h*scale) / 2;
  }

  let zoomAnimId = null;
  // { canvasX, canvasY, screenX, screenY }: canvasX/Y is the fixed point in
  // *unscaled design space* the user is zooming toward; screenX/Y is where
  // that point must stay glued on screen for the whole gesture. Both are
  // captured once per wheel event (see zoomAt) — recomputed analytically
  // every frame rather than re-measured from the DOM, so there's nothing
  // for scrollbar/overflow state to interfere with.
  let zoomAnchor = null;

  function runZoomAnimation(){
    function frame(){
      state.displayZoom += (state.zoom - state.displayZoom) * ZOOM_EASE;
      if(Math.abs(state.zoom - state.displayZoom) < 0.0008) state.displayZoom = state.zoom;
      if(zoomAnchor){
        const scale = baseFitScale(state.level.canvas.w, state.level.canvas.h) * state.displayZoom;
        state.panX = zoomAnchor.screenX - zoomAnchor.canvasX*scale;
        state.panY = zoomAnchor.screenY - zoomAnchor.canvasY*scale;
      }
      applyCanvasTransform();
      if(state.displayZoom !== state.zoom){
        zoomAnimId = requestAnimationFrame(frame);
      } else {
        zoomAnimId = null;
      }
    }
    if(zoomAnimId) cancelAnimationFrame(zoomAnimId);
    zoomAnimId = requestAnimationFrame(frame);
  }

  function zoomAt(clientX, clientY, factor){
    const wrap = document.getElementById('editor-canvas-wrap');
    const rect = wrap.getBoundingClientRect();
    const screenX = clientX - rect.left, screenY = clientY - rect.top;
    const scale = baseFitScale(state.level.canvas.w, state.level.canvas.h) * state.displayZoom;
    zoomAnchor = {
      canvasX: (screenX - state.panX) / scale,
      canvasY: (screenY - state.panY) / scale,
      screenX, screenY,
    };
    state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.zoom * factor));
    runZoomAnimation();
  }

  function buildCanvas(){
    const level = state.level;
    const canvas = document.getElementById('editor-canvas');
    state.canvasEl = canvas;
    canvas.innerHTML = '';
    canvas.style.width = level.canvas.w + 'px';
    canvas.style.height = level.canvas.h + 'px';
    canvas.style.backgroundColor = level.canvas.bg;

    if(state.panX === 0 && state.panY === 0) centerCanvas();

    state.domNodes = {};
    const sorted = state.elements.slice().sort((a,b)=>a.z-b.z);
    sorted.forEach(el => canvas.appendChild(createElementDom(el)));

    const guideLayer = document.createElement('div');
    guideLayer.className = 'guide-layer';
    guideLayer.id = 'guide-layer-inner';
    canvas.appendChild(guideLayer);
    state.guideLayerEl = guideLayer;

    applyCanvasTransform();
    updateGridBackground();
    renderOverlays();
    updateGoalMarkers();
  }

  // Goal markers replace the Layers list: every element a client goal still
  // needs gets a pulsing marker on the canvas. Once all goals that involve an
  // element (bonus ones included) are met, it locks and the marker goes away.
  function updateGoalMarkers(){
    if(!state.level || !state.level.goals || !state.canvasEl) return;
    const results = window.EC_GRADING.checkGoals(state.level, state.elements);
    const status = {};
    results.forEach(({goal, met}) => window.EC_GRADING.goalIds(goal.check).forEach(id => {
      status[id] = (status[id] !== false) && met;
    }));
    Object.entries(status).forEach(([id, solved]) => {
      const el = byId(id), div = state.canvasEl.querySelector(`.el[data-id="${id}"]`);
      if(!el || !div || el.locked) return; // locked pieces are fixed reference points
      // Solved pieces stay editable: moving one out of place un-solves it.
      if(solved && div.classList.contains('needs-edit')){
        div.classList.add('goal-solved');
        setTimeout(()=>div.classList.remove('goal-solved'), 900);
      }
      // Red dots are training wheels: only the first three jobs show them.
      div.classList.toggle('needs-edit', !solved && (state.level.levelNumber || 99) <= 3);
    });
  }


  function rebuildAll(){
    buildCanvas();
    if(state.selectedId && byId(state.selectedId)) showSettings(byId(state.selectedId));
    else resetSettingsPlaceholder();
  }

  // Teaches "these are the clickable parts" the moment a level opens — a
  // brief outline sweep across every editable element, rather than leaving
  // it to be discovered purely by hovering around (see the hover rule on
  // .el in style.css, which stays on as the ongoing/ambient signal).
  function playIntroFlash(){
    if(!state.canvasEl) return;
    const els = state.canvasEl.querySelectorAll('.el:not([data-locked="1"])');
    els.forEach((div, i)=>{
      setTimeout(()=>{
        div.classList.add('intro-flash');
        const clear = ()=>div.classList.remove('intro-flash');
        div.addEventListener('animationend', clear, { once:true });
        setTimeout(clear, 950); // safety net if reduce-motion skips the animation entirely
      }, i * 40);
    });
  }

  // Image layers (artwork exported from the level's design): drawn as a
  // background so they scale with the element; bgSize/bgPos crop them.
  function paintImage(div, el){
    if(!el.src) return;
    div.style.backgroundImage = `url("${el.src}")`;
    div.style.backgroundSize = el.bgSize || '100% 100%';
    div.style.backgroundPosition = el.bgPos || 'center';
    div.style.backgroundRepeat = 'no-repeat';
  }

  function textAlignToFlex(align){
    return { left:'flex-start', center:'center', right:'flex-end' }[align] || 'center';
  }

  function borderCss(el){
    return (el.border && el.border.width > 0) ? `${el.border.width}px ${el.border.style} ${el.border.color}` : 'none';
  }
  function shadowCss(el){
    return (el.shadow && el.shadow.enabled) ? `0px 4px ${el.shadow.blur}px ${el.shadow.color}` : 'none';
  }

  function shapeClip(shape){
    if(shape==='trapezoid') return 'polygon(7% 0,93% 0,100% 100%,0 100%)';
    if(shape==='starburst') return 'polygon('+Array.from({length:24},(_,i)=>{
      const angle=-Math.PI/2+i*Math.PI/12, r=i%2?37:50;
      return `${50+Math.cos(angle)*r}% ${50+Math.sin(angle)*r}%`;
    }).join(',')+')';
    return 'none';
  }
  function createElementDom(el){
    const div = document.createElement('div');
    div.className = 'el';
    div.dataset.id = el.id;
    div.style.left = el.x + 'px';
    div.style.top = el.y + 'px';
    div.style.width = el.w + 'px';
    div.style.height = el.h + 'px';
    div.style.zIndex = el.z;
    div.style.borderRadius = (el.radius||0) + 'px';
    div.style.clipPath = shapeClip(el.shape);
    div.style.border = borderCss(el);
    div.style.setProperty('--element-border', (el.border.width || 0) + 'px');
    div.style.boxShadow = shadowCss(el);
    div.style.opacity = el.opacity != null ? el.opacity : 1;
    if(el.bg) div.style.background = el.bg;
    paintImage(div, el);
    if(el.text){
      div.style.alignItems = 'center';
      div.style.justifyContent = textAlignToFlex(el.align);
      div.style.textAlign = el.align;
      div.style.padding = `0 ${el.padding}px`;
      div.style.fontFamily = `'${el.fontFamily}', sans-serif`;
      div.style.fontSize = el.fontSize + 'px';
      div.style.fontWeight = el.fontWeight;
      div.style.color = el.color;
      div.style.lineHeight = '1.15';
      div.style.whiteSpace = 'pre-line';
      div.textContent = el.text;
    }
    if(el.locked){
      div.style.pointerEvents = 'none';
      div.dataset.locked = '1';
    } else {
      div.tabIndex = 0;
      // Only pieces the player can actually move get the move cursor.
      const tools = state.level && state.level.tools;
      div.classList.toggle('movable', can(el,'move') && (!tools || tools.includes('position')));
      div.setAttribute('role','button');
      div.setAttribute('aria-label', `${el.role} ${el.text||''}`.trim());
      div.addEventListener('keydown', event=>{
        if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); selectElement(el.id); }
        if(event.key === 'Escape'){ deselect(); }
      });
      if(can(el,'resize')) ['nw','ne','sw','se','n','s','e','w'].forEach(dir=>{
        const h = document.createElement('div');
        h.className = `el-handle ${dir}`;
        h.dataset.handle = dir;
        div.appendChild(h);
      });
    }
    state.domNodes[el.id] = div;
    if(el.id === state.selectedId) div.classList.add('selected');
    return div;
  }

  function refreshElementDom(el){
    const div = state.domNodes[el.id];
    if(!div) return;
    div.style.left = el.x + 'px';
    div.style.top = el.y + 'px';
    div.style.width = el.w + 'px';
    div.style.height = el.h + 'px';
    div.style.borderRadius = (el.radius||0) + 'px';
    div.style.clipPath = shapeClip(el.shape);
    div.style.border = borderCss(el);
    div.style.setProperty('--element-border', (el.border.width || 0) + 'px');
    div.style.boxShadow = shadowCss(el);
    div.style.opacity = el.opacity != null ? el.opacity : 1;
    if(el.bg) div.style.background = el.bg;
    paintImage(div, el);
    if(el.text){
      div.style.padding = `0 ${el.padding}px`;
      div.style.fontFamily = `'${el.fontFamily}', sans-serif`;
      div.style.fontSize = el.fontSize + 'px';
      div.style.fontWeight = el.fontWeight;
      div.style.color = el.color;
      div.style.justifyContent = textAlignToFlex(el.align);
      div.style.textAlign = el.align;
    }
  }

  // ---------------- Selection ----------------
  function selectElement(id){
    if(byId(id)?.locked)return;
    if(state.selectedId){
      const prev = state.domNodes[state.selectedId];
      if(prev) prev.classList.remove('selected');
    }
    clearHintHighlight();
    state.selectedId = id;
    updateGoalMarkers();
    const el = byId(id);
    if(!el){ resetSettingsPlaceholder(); return; }
    const div = state.domNodes[id];
    if(div){ div.classList.remove('intro-flash'); div.classList.add('selected'); }
    showSettings(el);
    renderSpacing();
    // On the mobile/tablet stacked layout the settings panel starts
    // collapsed so the canvas keeps the space — picking something to edit
    // is the one moment it should open itself; the button next to its
    // heading still lets you close it again to get the canvas back.
    // "Click on any element to edit" has done its job the moment you do
    // exactly that — no reason for it to keep sitting over the canvas.
    document.getElementById('editor-hint-banner').classList.add('hidden');
  }

  function deselect(){
    if(state.selectedId){
      const prev = state.domNodes[state.selectedId];
      if(prev) prev.classList.remove('selected');
    }
    state.selectedId = null;
    updateGoalMarkers();
    renderSpacing();
    resetSettingsPlaceholder();
  }

  // ---------------- Settings panel ----------------
  // Collapse toggle only actually changes anything at the mobile/tablet
  // breakpoints (see .element-settings.collapsed in style.css) — on the
  // desktop side-by-side layout the panel always has room and this is a no-op.

  // Always visible (right-hand dock) — shows a placeholder until something
  // is selected, rather than collapsing away.
  function resetSettingsPlaceholder(){
    document.getElementById('settings-fields').innerHTML =
      '<p class="settings-placeholder">Select an element on the canvas to edit its properties.</p>';
    document.getElementById('element-settings-title').textContent = 'Design tools';
    document.getElementById('selection-dimensions').textContent = 'Select something to make it shine';
    document.getElementById('f-reset-icon').classList.add('hidden');
  }

  function contrastBadgeHtml(el){
    if(!el.text || !el.color) return '';
    const bg = window.EC_GRADING.effectiveBg(state.elements, state.level.canvas.bg, el);
    const bold = Number(el.fontWeight) >= 700;
    const res = window.WCAG.passesWCAG(el.color, bg, el.fontSize, bold, 'AA');
    return `<div class="editor-contrast-card" aria-label="Color contrast comparison">
      <div class="editor-contrast-label">Text color</div>
      <div class="editor-contrast-color"><span class="editor-contrast-swatch" style="background:${el.color}"></span><code>${el.color.toUpperCase()}</code></div>
      <div class="editor-contrast-label">Against background</div>
      <div class="editor-contrast-color"><span class="editor-contrast-swatch" style="background:${bg}"></span><code>${String(bg).toUpperCase()}</code></div>
      <div class="editor-contrast-label">Contrast value</div>
      <div class="contrast-badge ${res.pass?'pass':'fail'}">
        <span class="contrast-ratio">${res.ratio.toFixed(1)}:1</span>
        <span class="contrast-check">${res.pass?'✓':'✕'}</span>
      </div>
      <div class="contrast-note">${res.pass?'Passes AA':'Needs '+res.required+':1'}</div>
    </div>`;
  }

  const hexColor = value => /^#[0-9a-f]{6}$/i.test(value||'');
  function originalColor(el,key){
    return state.original.find(item=>item.id===el.id)?.[key] || el[key];
  }
  // HSV, like a colour picker: hue comes from the client's original color,
  // Saturation (grey → vivid) and Brightness (black → brightest) are the sliders.
  function hsvOf(hex){
    const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const max=Math.max(r,g,b),d=max-Math.min(r,g,b);
    let h=0;
    if(d) h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;
    return { h, s:max?d/max:0, v:max };
  }
  function hsvHex(h,sat,val){
    const c=val*sat,x=c*(1-Math.abs(h%2-1)),m=val-c;
    const rgb=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h)%6];
    return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
  }
  const isGrey=(el,key)=>hsvOf(originalColor(el,key)).s<0.05;
  // Slider values (0-100), defaulting to the original color's own S and V.
  function sliderValues(el,key){
    const o=hsvOf(originalColor(el,key));
    return {
      h:o.h,
      // Greys have no hue, so they stay grey (no saturation slider is shown).
      sat:isGrey(el,key)?0:Number.isFinite(el[key+'Sat'])?el[key+'Sat']:Math.round(o.s*100),
      tone:Number.isFinite(el[key+'Tone'])?el[key+'Tone']:Math.round(o.v*100),
    };
  }
  function mixColor(el,key){
    const {h,sat,tone}=sliderValues(el,key);
    return hsvHex(h,sat/100,tone/100);
  }
  // Each bar shows what moving it would give, at the other slider's value.
  function barColors(el,key){
    const {h,sat,tone}=sliderValues(el,key);
    return { grey:hsvHex(h,0,tone/100), vivid:hsvHex(h,1,tone/100), top:hsvHex(h,sat/100,1) };
  }
  function refreshBars(el,key,root){
    const c=barColors(el,key);
    root.querySelectorAll(`[data-bar="${key}"]`).forEach(n=>{ n.style.setProperty('--sat-grey',c.grey); n.style.setProperty('--sat-vivid',c.vivid); n.style.setProperty('--tone-top',c.top); });
  }
  function satControl(el,key,label,id){
    if(isGrey(el,key)) return '';
    const base=originalColor(el,key);
    const amount=sliderValues(el,key).sat;
    const {grey,vivid}=barColors(el,key);
    if(key==='color') return `<label data-bar="${key}" class="editor-tone-field editor-tone-vertical" style="--sat-grey:${grey};--sat-vivid:${vivid}"><span>Text saturation <output>${amount}%</output></span><input type="range" class="editor-sat-range" id="${id}" min="0" max="100" step="1" value="${amount}" aria-label="Text saturation, grey at bottom and vivid at top"/></label>`;
    return `<label class="editor-tone-field"><span>${label} saturation <output>${amount}%</output></span><div class="editor-tone-row"><input type="range" data-bar="${key}" class="editor-sat-range" id="${id}" min="0" max="100" step="1" value="${amount}" aria-label="${label} saturation" style="--sat-grey:${grey};--sat-vivid:${vivid}"/></div><small>Grey <span>Vivid</span></small></label>`;
  }
  function toneControl(el,key,label,id){
    const base=originalColor(el,key);
    if(!hexColor(base))return '';
    const amount=sliderValues(el,key).tone;
    const top=barColors(el,key).top;
    if(key==='color') return `<label data-bar="${key}" class="editor-tone-field editor-tone-vertical editor-bright-bar" style="--tone-top:${top}"><span>Text brightness <output>${amount}%</output></span><input type="range" id="${id}" min="0" max="100" step="1" value="${amount}" aria-label="Text brightness, black at bottom and brightest at top"/><span class="editor-tone-swatch" style="background:${el[key]}"></span><small>Light <span>Dark</span></small></label>`;
    return `<label data-bar="${key}" class="editor-tone-field" style="--tone-top:${barColors(el,key).top}"><span>${label} brightness <output>${amount}%</output></span><div class="editor-tone-row"><span class="editor-tone-swatch" style="background:${el[key]}"></span><input type="range" class="editor-bright-range" id="${id}" min="0" max="100" step="1" value="${amount}" aria-label="${label} brightness"/></div><small>Black <span>Bright</span></small></label>`;
  }

  function showSettings(el){
    const fields = document.getElementById('settings-fields');
    const isLocked = !!el.locked;
    document.getElementById('element-settings-title').textContent = friendlyElementName(el);
    document.getElementById('selection-dimensions').textContent = `${Math.round(el.w)} x ${Math.round(el.h)} px`;

    if(isLocked){
      fields.innerHTML = `<p class="settings-placeholder">This is a structural background element and can't be edited directly.</p>`;
      document.getElementById('f-reset-icon').classList.add('hidden');
      return;
    }
    document.getElementById('f-reset-icon').classList.remove('hidden');

    const lvl = state.level.levelNumber || 1;
    // A level may list its own tools (e.g. a contrast task needs color early).
    const unlocked = key => state.level.tools ? state.level.tools.includes(key) : lvl >= SETTINGS_UNLOCK[key];

    let html = '';
    const introHtmlLen = html.length;

    if(el.text && unlocked('typography') && (can(el,'resize') || can(el,'font'))){ // text-only levels allow font without resize
      html += `<details class="editor-setting-card" open><summary>Typography</summary>`;
      const sizeOnly = el.allow && el.allow.includes('font'); // text-size-only levels
      const sizeRow = `<label class="editor-unit-row"><span>Size</span><span class="editor-unit-input"><input type="number" id="f-size" value="${el.fontSize}" min="8" max="80" aria-label="Font size"/><span>px</span></span></label>`;
      html += sizeOnly ? sizeRow : `<label class="editor-unit-row"><span>Font</span><span class="editor-unit-input"><select id="f-font">${FONTS.map(f=>`<option value="${f}" ${f===el.fontFamily?'selected':''}>${f}</option>`).join('')}</select></span></label>
        ${sizeRow}
        <label class="editor-unit-row"><span>Weight</span><span class="editor-unit-input"><select id="f-weight">${WEIGHTS.map(([v,l])=>`<option value="${v}" ${v===String(el.fontWeight)?'selected':''}>${l}</option>`).join('')}</select></span></label>`;
      html += `</details>`;
    }
    const colorOk = unlocked('color') && can(el,'color');
    if((el.text||el.bg) && colorOk) html += `<details class="editor-setting-card" open><summary>Color</summary>`;
    // Elements with text (buttons) only change their text color for contrast.
    if(el.bg && !el.text && colorOk) html += toneControl(el,'bg','Background','f-bg') + (hexColor(originalColor(el,'bg')) ? satControl(el,'bg','Background','f-bg-sat') : '');
    if(el.text && colorOk){
      html += `<div class="editor-contrast-workbench">${hexColor(originalColor(el,'color')) ? satControl(el,'color','Text','f-color-sat') : ''}${toneControl(el,'color','Text','f-color')}<div id="f-contrast">${contrastBadgeHtml(el)}</div></div>`;
    }
    if((el.text||el.bg) && colorOk) html += `</details>`;

    if(html.length > introHtmlLen) html += `<hr class="section-divider"/>`;

    if(unlocked('position') && can(el,'move')){
      html += `<details class="editor-setting-card" open><summary>Position</summary>
        <label class="editor-unit-row"><span>X</span><span class="editor-unit-input"><input type="number" id="f-x" step="8" value="${Math.round(el.x)}" aria-label="X position"/><span>px</span></span></label>
        <label class="editor-unit-row"><span>Y</span><span class="editor-unit-input"><input type="number" id="f-y" step="8" value="${Math.round(el.y)}" aria-label="Y position"/><span>px</span></span></label>
      </details>`;
    }
    if(unlocked('sizing') && can(el,'resize')){
      html += `<details class="editor-setting-card" open><summary>Size</summary>
        <label class="editor-unit-row"><span>Width</span><span class="editor-unit-input"><input type="number" id="f-w" step="8" value="${Math.round(el.w)}" aria-label="Width"/><span>px</span></span></label>
        <label class="editor-unit-row"><span>Height</span><span class="editor-unit-input"><input type="number" id="f-h" step="8" value="${Math.round(el.h)}" aria-label="Height"/><span>px</span></span></label>
      </details>`;
    }
    if(unlocked('shape') && can(el,'resize')){
      html += `<div class="field-group"><label>Border Radius (px)</label>
        <input type="number" id="f-radius" value="${el.radius||0}" min="0" max="200" step="8"/>
      </div>`;
      html += `<div class="field-group"><label>Border</label>
        <div class="field-row-3">
          <input type="number" id="f-border-w" value="${el.border.width}" min="0" max="12" title="Border width"/>
          <select id="f-border-style">
            <option value="solid" ${el.border.style==='solid'?'selected':''}>Solid</option>
            <option value="dashed" ${el.border.style==='dashed'?'selected':''}>Dashed</option>
            <option value="dotted" ${el.border.style==='dotted'?'selected':''}>Dotted</option>
          </select>
          <input type="color" id="f-border-color" value="${el.border.color}"/>
        </div>
      </div>`;
    }
    if(unlocked('effects')){
      html += `<div class="field-group"><label>Shadow</label>
        <div class="field-row-3">
          <label style="text-transform:none;font-weight:600;display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-shadow-on" ${el.shadow.enabled?'checked':''}/> On</label>
          <input type="number" id="f-shadow-blur" value="${el.shadow.blur}" min="0" max="60" title="Blur"/>
          <input type="color" id="f-shadow-color" value="#000000"/>
        </div>
      </div>`;
      html += `<div class="field-group"><label>Opacity</label>
        <input type="range" id="f-opacity" min="0" max="1" step="0.05" value="${el.opacity}"/>
        <div class="opacity-readout">${Math.round(el.opacity*100)}%</div>
      </div>`;
    }

    fields.innerHTML = html;
    const q = sel => fields.querySelector(sel);

    if(q('#f-font')) q('#f-font').addEventListener('change', e=>{ el.fontFamily = e.target.value; refreshElementDom(el); pushHistory(); refreshLiveOverlays(); });
    if(q('#f-size')) q('#f-size').addEventListener('input', e=>{ el.fontSize = Number(e.target.value)||el.fontSize; refreshElementDom(el); refreshContrastBadge(el); refreshLiveOverlays(); });
    if(q('#f-size')) q('#f-size').addEventListener('change', ()=>pushHistory());
    if(q('#f-weight')) q('#f-weight').addEventListener('change', e=>{
      el.fontWeight = e.target.value; refreshElementDom(el); refreshContrastBadge(el); pushHistory(); refreshLiveOverlays();
    });
    // Sections always stay open: their headings are titles, not collapse toggles.
    fields.querySelectorAll('.editor-setting-card > summary').forEach(summary=>{
      summary.tabIndex=-1;
      summary.addEventListener('click',e=>e.preventDefault());
    });
    if(q('#f-color')) q('#f-color').addEventListener('input', e=>{
      el.colorTone=Number(e.target.value);
      el.color=mixColor(el,'color');refreshElementDom(el);refreshBars(el,'color',fields);
      e.target.closest('.editor-tone-field').querySelector('output').textContent=el.colorTone+'%';
      e.target.closest('.editor-tone-field').querySelector('.editor-tone-swatch').style.background=el.color;
      refreshContrastBadge(el);
    });
    if(q('#f-color')) q('#f-color').addEventListener('change', ()=>{ pushHistory(); refreshLiveOverlays(); });
    // Saturation sliders: same flow as lightness, and the lightness swatch follows.
    for(const [id,key] of [['#f-color-sat','color'],['#f-bg-sat','bg']]){
      const input=q(id); if(!input) continue;
      input.addEventListener('input', e=>{
        el[key+'Sat']=Number(e.target.value);
        el[key]=mixColor(el,key);refreshElementDom(el);
        e.target.closest('.editor-tone-field').querySelector('output').textContent=el[key+'Sat']+'%';
        const swatch=q(key==='color'?'#f-color':'#f-bg')?.closest('.editor-tone-field').querySelector('.editor-tone-swatch');
        refreshBars(el,key,fields);
        if(swatch) swatch.style.background=el[key];
        refreshContrastBadge(el);
      });
      input.addEventListener('change', ()=>{ pushHistory(); refreshLiveOverlays(); if(key==='bg') showSettings(el); });
    }
    if(q('#f-bg')) q('#f-bg').addEventListener('input', e=>{
      el.bgTone=Number(e.target.value);
      el.bg=mixColor(el,'bg');refreshElementDom(el);refreshBars(el,'bg',fields);
      e.target.closest('.editor-tone-field').querySelector('output').textContent=el.bgTone+'%';
      e.target.closest('.editor-tone-field').querySelector('.editor-tone-swatch').style.background=el.bg;
      refreshContrastBadge(el);
    });
    if(q('#f-bg')) q('#f-bg').addEventListener('change', ()=>{ pushHistory(); refreshLiveOverlays(); showSettings(el); });

    ['x','y','w','h'].forEach(k=>{
      const inp = q('#f-'+k);
      if(!inp) return;
      inp.addEventListener('change', e=>{
        el[k] = Math.max(k==='w'||k==='h'?8:-9992, Math.round((Number(e.target.value)||0)/8)*8);
        inp.value = el[k];
        refreshElementDom(el); pushHistory(); refreshLiveOverlays();
      });
    });

    for(const [selector, key] of [['#f-padding','padding'],['#f-margin','margin'],['#f-radius','radius']]){
      const input = q(selector);
      if(!input) continue;
      input.addEventListener('change', e=>{
        el[key] = Math.max(0, Math.round((Number(e.target.value)||0)/8)*8);
        input.value = el[key];
        refreshElementDom(el);
        pushHistory();
      });
    }

    if(q('#f-border-w')) q('#f-border-w').addEventListener('input', e=>{ el.border.width = Number(e.target.value)||0; refreshElementDom(el); });
    if(q('#f-border-w')) q('#f-border-w').addEventListener('change', ()=>pushHistory());
    if(q('#f-border-style')) q('#f-border-style').addEventListener('change', e=>{ el.border.style = e.target.value; refreshElementDom(el); pushHistory(); });
    if(q('#f-border-color')) q('#f-border-color').addEventListener('input', e=>{ el.border.color = e.target.value; refreshElementDom(el); });
    if(q('#f-border-color')) q('#f-border-color').addEventListener('change', ()=>pushHistory());

    if(q('#f-shadow-on')) q('#f-shadow-on').addEventListener('change', e=>{ el.shadow.enabled = e.target.checked; refreshElementDom(el); pushHistory(); });
    if(q('#f-shadow-blur')) q('#f-shadow-blur').addEventListener('input', e=>{ el.shadow.blur = Number(e.target.value)||0; refreshElementDom(el); });
    if(q('#f-shadow-blur')) q('#f-shadow-blur').addEventListener('change', ()=>pushHistory());
    if(q('#f-shadow-color')) q('#f-shadow-color').addEventListener('input', e=>{
      const hex = e.target.value;
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      el.shadow.color = `rgba(${r},${g},${b},0.35)`; refreshElementDom(el);
    });
    if(q('#f-shadow-color')) q('#f-shadow-color').addEventListener('change', ()=>pushHistory());

    if(q('#f-opacity')) q('#f-opacity').addEventListener('input', e=>{
      el.opacity = Number(e.target.value);
      fields.querySelector('.opacity-readout').textContent = Math.round(el.opacity*100)+'%';
      refreshElementDom(el);
    });
    if(q('#f-opacity')) q('#f-opacity').addEventListener('change', ()=>pushHistory());

  }

  function refreshContrastBadge(el){
    const holder = document.getElementById('f-contrast');
    if(holder) holder.innerHTML = contrastBadgeHtml(el);
  }

  // ---------------- Overlays: contrast / a11y ----------------
  function clearOverlayNodes(){
    if(!state.guideLayerEl) return;
    state.guideLayerEl.querySelectorAll('.overlay-node').forEach(n=>n.remove());
  }

  // The Inspector shows two things at once, same as Figma/VS Code style
  // design tools: a small contrast-ratio readout above text (so you can see
  // *why* something reads as low-contrast, not just that it does), and a
  // small corner badge on any element with an unresolved issue — hover or
  // focus it to read the actual explanation, not just "there's a problem here."
  function renderOverlays(){
    clearOverlayNodes();
    if(!state.guideLayerEl) return;
    if(state.tools.showTargets && Array.isArray(state.level.hiddenTargets)){
      state.level.hiddenTargets.forEach(target=>{
        const box = document.createElement('div');
        box.className = 'overlay-node grading-target-box';
        box.style.left = target.x + 'px';
        box.style.top = target.y + 'px';
        box.style.width = target.w + 'px';
        box.style.height = target.h + 'px';
        state.guideLayerEl.appendChild(box);
      });
    }
    if(!state.tools.inspector) return;
    const lvl = state.level.levelNumber;

    if(CATEGORY_UNLOCK.Contrast <= lvl){
      state.elements.filter(el=>!el.locked && el.text && el.color).forEach(el=>{
        const bg = window.EC_GRADING.effectiveBg(state.elements, state.level.canvas.bg, el);
        const bold = Number(el.fontWeight) >= 700;
        const res = window.WCAG.passesWCAG(el.color, bg, el.fontSize, bold, 'AA');
        const tag = document.createElement('div');
        tag.className = 'overlay-node measure-label';
        tag.style.left = el.x + 'px';
        tag.style.top = (el.y - 20) + 'px';
        tag.style.background = res.pass ? '#3dbd6e' : '#e15252';
        tag.textContent = `${res.ratio.toFixed(1)}:1 ${res.pass?'✓':'✕'}`;
        state.guideLayerEl.appendChild(tag);
      });
    }

    const result = window.EC_GRADING.gradeSubmission(state.level, state.elements);
    const bad = unlockedFeedback(result.feedback, lvl, result.activeCategories).filter(f=>f.type==='bad' && f.elId);
    const byElement = new Map();
    bad.forEach(f => { if(!byElement.has(f.elId)) byElement.set(f.elId, []); byElement.get(f.elId).push(f); });
    byElement.forEach((issues, id) => {
      const el = byId(id);
      if(!el) return;
      const flag = document.createElement('div');
      flag.className = 'overlay-node issue-flag';
      flag.style.left = el.x + 'px';
      flag.style.top = el.y + 'px';
      flag.tabIndex = 0;
      flag.setAttribute('role','note');
      flag.innerHTML = `<span class="issue-flag-dot">${issues.length > 1 ? issues.length : '!'}</span>
        <span class="issue-tooltip">${issues.map(f=>`<b>${f.category}:</b> ${f.title}${f.suggest?`<div class="issue-tooltip-tip">Tip: ${f.suggest}</div>`:''}`).join('<hr>')}</span>`;
      state.guideLayerEl.appendChild(flag);
    });
  }

  function refreshLiveOverlays(){
    renderOverlays();
  }

  // ---------------- Grid background ----------------
  // Rendered on the guide layer (which sits above every element) rather than
  // on the canvas element itself, since every level's own opaque "bg" element
  // fully covers the canvas and would otherwise hide the grid completely.
  function updateGridBackground(){
    if(!state.guideLayerEl) return;
    state.guideLayerEl.classList.toggle('show-grid', state.tools.gridVisible);
    state.guideLayerEl.style.backgroundSize = `${state.tools.gridSize}px ${state.tools.gridSize}px`;
    state.guideLayerEl.style.setProperty('--grid-opacity', state.tools.gridOpacity);
  }

  // Anchors the popover directly under the gear button that opened it,
  // recomputed fresh each time it opens (the button itself can live in the
  // desktop topbar or, on mobile, inside the "more tools" sheet). On mobile
  // the sheet's own CSS already positions it sensibly (there's often no
  // room directly below a button crammed in a bottom sheet), so this only
  // takes over on the desktop layout where the button has a stable spot.
  function positionPopoverBelow(panel, btn){
    const sheetGrid = document.getElementById('mobile-tools-sheet-grid');
    if(sheetGrid && sheetGrid.contains(btn)){
      panel.style.position = '';
      panel.style.top = ''; panel.style.left = ''; panel.style.right = '';
      return;
    }
    const r = btn.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 240;
    let left = r.left;
    if(left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
    if(left < 8) left = 8;
    panel.style.position = 'fixed';
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.left = left + 'px';
    panel.style.right = 'auto';
  }
  function positionGridSettingsPanel(btn){
    positionPopoverBelow(document.getElementById('grid-settings-panel'), btn);
  }

  function syncGridSettingsUI(){
    const sizeSlider = document.getElementById('grid-size-slider');
    const opacitySlider = document.getElementById('grid-opacity-slider');
    if(sizeSlider) sizeSlider.value = state.tools.gridSize;
    if(opacitySlider) opacitySlider.value = state.tools.gridOpacity;
    const sizeReadout = document.getElementById('grid-size-readout');
    const opacityReadout = document.getElementById('grid-opacity-readout');
    if(sizeReadout) sizeReadout.textContent = state.tools.gridSize;
    if(opacityReadout) opacityReadout.textContent = Math.round(state.tools.gridOpacity*100);
  }

  // ---------------- Guides while dragging ----------------
  function renderRulers(){
    const wrap=document.getElementById('editor-canvas-wrap');
    let ruler=wrap.querySelector('.canvas-rulers');
    if(!state.tools.measure || !state.level){if(ruler) ruler.remove();return;}
    if(!ruler){ruler=document.createElementNS('http://www.w3.org/2000/svg','svg');ruler.classList.add('canvas-rulers');ruler.setAttribute('aria-hidden','true');wrap.appendChild(ruler);}
    const w=wrap.clientWidth,h=wrap.clientHeight,scale=getScale();
    if(!scale || !Number.isFinite(scale))return;
    ruler.setAttribute('viewBox',`0 0 ${w} ${h}`);
    let step=8;while(step*scale<64)step*=2;
    let html=`<path d="M0 0H${w}V24H24V${h}H0Z" fill="#f4faf7"/>`;
    for(const [axis,length,pan] of [['x',w,state.panX],['y',h,state.panY]]){
      const start=Math.ceil(-pan/scale/step)*step,end=(length-pan)/scale;
      for(let value=start;value<=end;value+=step){
        const p=pan+value*scale;
        if(p<24)continue;
        html+=axis==='x'?`<path d="M${p} 17v7"/><text x="${p+3}" y="12">${Math.round(value)}</text>`:`<path d="M17 ${p}h7"/><text x="3" y="${p-3}" transform="rotate(-90 3 ${p-3})">${Math.round(value)}</text>`;
      }
    }
    ruler.innerHTML=html;
  }

  function renderSpacing(){
    state.guideLayerEl?.querySelector('.spacing-overlay')?.remove();
    const el=byId(state.selectedId);
    if((!state.tools.measure && !(state.dragging && state.tools.guides)) || !el || !state.guideLayerEl)return;
    const nearest={};
    const add=(side,gap,x1,y1,x2,y2)=>{if(gap>=0 && (!nearest[side] || gap<nearest[side].gap))nearest[side]={gap,x1,y1,x2,y2};};
    // Measure to every element, locked ones included (they're the reference points).
    state.elements.filter(o=>o.id!==el.id).forEach(o=>{
      const top=Math.max(el.y,o.y),bottom=Math.min(el.y+el.h,o.y+o.h);
      const left=Math.max(el.x,o.x),right=Math.min(el.x+el.w,o.x+o.w);
      if(bottom>top){const y=(top+bottom)/2;add('left',el.x-o.x-o.w,o.x+o.w,y,el.x,y);add('right',o.x-el.x-el.w,el.x+el.w,y,o.x,y);}
      if(right>left){const x=(left+right)/2;add('top',el.y-o.y-o.h,x,o.y+o.h,x,el.y);add('bottom',o.y-el.y-el.h,x,el.y+el.h,x,o.y);}
    });
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('spacing-overlay');svg.setAttribute('aria-hidden','true');
    const unit=1/getScale(),gaps=Object.values(nearest);
    // Include adjacent gaps across the whole aligned row/column, so moving
    // either end of a group of three still shows both intervals.
    // A row (or column) is everything sharing the selected element's band,
    // locked pieces included, so spacing a card shows every gap in its row.
    const span=(o,axis)=>axis==='x'?[o.x,o.x+o.w]:[o.y,o.y+o.h];
    const overlaps=(a,b,axis)=>{const [a1,a2]=span(a,axis),[b1,b2]=span(b,axis);return Math.min(a2,b2)-Math.max(a1,b1)>0;};
    for(const axis of ['x','y']){
      const cross=axis==='x'?'y':'x';
      // Peers are similar in size across the row, so big backgrounds and bars don't join in.
      const size=o=>axis==='x'?o.h:o.w, similar=o=>size(o)<=size(el)*2 && size(o)>=size(el)/2;
      const group=state.elements.filter(o=>o.id===el.id || (overlaps(el,o,cross) && !overlaps(el,o,axis) && similar(o))).sort((a,b)=>a[axis]-b[axis]);
      if(group.length<3)continue;
      const pos=axis==='x'?Math.min(...group.map(o=>o.y))-16*unit:Math.max(...group.map(o=>o.x+o.w))+16*unit;
      for(let i=1;i<group.length;i++){
        const a=group[i-1],b=group[i],start=a[axis]+a[axis==='x'?'w':'h'],end=b[axis];
        if(end<start)continue;
        const g=axis==='x'?{gap:end-start,x1:start,y1:pos,x2:end,y2:pos}:{gap:end-start,x1:pos,y1:start,x2:pos,y2:end};
        const duplicate=gaps.findIndex(n=>axis==='x'?n.y1===n.y2 && n.x1===start && n.x2===end:n.x1===n.x2 && n.y1===start && n.y2===end);
        if(duplicate>=0)gaps.splice(duplicate,1);
        gaps.push(g);
      }
    }
    svg.innerHTML=gaps.map(g=>{
      const x=(g.x1+g.x2)/2,y=(g.y1+g.y2)/2,equal=gaps.filter(n=>Math.abs(n.gap-g.gap)<1).length>1;
      const color=equal?'#7852b8':'#cf3783',label=`${Math.round(g.gap)} px`,width=label.length*9.5*unit;
      const bracket=g.y1===g.y2?`M${g.x1} ${g.y1+6*unit}V${g.y1}H${g.x2}V${g.y2+6*unit}`:`M${g.x1-6*unit} ${g.y1}H${g.x1}V${g.y2}H${g.x2-6*unit}`;
      return `<path class="spacing-bracket" d="${bracket}" stroke="${color}" stroke-width="${unit}" fill="none"/><rect x="${x-width/2-3*unit}" y="${y-11*unit}" width="${width+6*unit}" height="${22*unit}" rx="${3*unit}" fill="${color}"/><text x="${x}" y="${y+5.5*unit}" text-anchor="middle" font-size="${16*unit}" fill="white">${label}</text>`;
    }).join('');
    state.guideLayerEl.appendChild(svg);
  }

  function clearGuideLines(){
    if(!state.guideLayerEl) return;
    state.guideLayerEl.querySelectorAll('.guide-line, .drag-label, .alignment-reference').forEach(n=>n.remove());
  }

  function drawVGuide(x, isCenter){
    const l = document.createElement('div');
    l.className = 'guide-line v' + (isCenter ? ' center' : '');
    l.style.left = x + 'px';
    state.guideLayerEl.appendChild(l);
  }
  function drawHGuide(y, isCenter){
    const l = document.createElement('div');
    l.className = 'guide-line h' + (isCenter ? ' center' : '');
    l.style.top = y + 'px';
    state.guideLayerEl.appendChild(l);
  }
  function drawDragLabel(x,y,text){
    const l = document.createElement('div');
    l.className = 'measure-label drag-label';
    l.style.left = x + 'px'; l.style.top = y + 'px';
    l.textContent = text;
    state.guideLayerEl.appendChild(l);
  }
  function applyGuideSnap(el, nx, ny){
    if(!state.tools.guides && !state.tools.measure) return { x:nx, y:ny };
    const cw = state.level.canvas.w, ch = state.level.canvas.h;
    const others = state.elements.filter(o=>o.id!==el.id);
    const vCandidates = [0, cw/2, cw];
    const hCandidates = [0, ch/2, ch];
    others.forEach(o=>{ vCandidates.push(o.x, o.x+o.w/2, o.x+o.w); hCandidates.push(o.y, o.y+o.h/2, o.y+o.h); });

    let snappedX = nx, snappedY = ny, matchedV = null, matchedH = null;
    const edgesX = [ {v:nx, off:0}, {v:nx+el.w/2, off:el.w/2}, {v:nx+el.w, off:el.w} ];
    for(const cand of vCandidates){
      for(const e of edgesX){
        if(Math.abs(e.v-cand) <= SNAP_THRESHOLD && Math.abs((cand-e.off)/8-Math.round((cand-e.off)/8))<0.001){ snappedX = cand-e.off; matchedV = cand; break; }
      }
      if(matchedV!=null) break;
    }
    const edgesY = [ {v:ny, off:0}, {v:ny+el.h/2, off:el.h/2}, {v:ny+el.h, off:el.h} ];
    for(const cand of hCandidates){
      for(const e of edgesY){
        if(Math.abs(e.v-cand) <= SNAP_THRESHOLD && Math.abs((cand-e.off)/8-Math.round((cand-e.off)/8))<0.001){ snappedY = cand-e.off; matchedH = cand; break; }
      }
      if(matchedH!=null) break;
    }
    if(matchedV!=null) drawVGuide(matchedV, matchedV === cw/2);
    if(matchedH!=null) drawHGuide(matchedH, matchedH === ch/2);
    others.filter(o=>o.role!=='background').forEach(o=>{
      const matches=(matchedV!=null && [o.x,o.x+o.w/2,o.x+o.w].includes(matchedV)) || (matchedH!=null && [o.y,o.y+o.h/2,o.y+o.h].includes(matchedH));
      if(!matches)return;
      const outline=document.createElement('div');
      outline.className='alignment-reference';outline.dataset.referenceId=o.id;
      Object.assign(outline.style,{left:o.x+'px',top:o.y+'px',width:o.w+'px',height:o.h+'px',borderWidth:(1/getScale())+'px'});
      state.guideLayerEl.appendChild(outline);
    });
    return { x:snappedX, y:snappedY };
  }

  // ---------------- Pointer interaction ----------------
  function getScale(){
    return baseFitScale(state.level.canvas.w, state.level.canvas.h) * state.displayZoom;
  }

  // What the player may do to an element. Levels (or the Level Maker) can
  // narrow it with el.allow = ['move','resize','color']; no list = all.
  const can = (el, what) => !el.allow || el.allow.includes(what);

  function onPointerDown(e){
    if(e.button !== 0) return; // left click only — middle-click is reserved for panning
    const target = e.target;
    const elDiv = target.closest('.el');
    if(!elDiv){ deselect(); return; }
    const id = elDiv.dataset.id;
    const el = byId(id);
    if(!el || el.locked) return;
    selectElement(id);
    const handle = target.dataset.handle;
    if(!(handle ? can(el,'resize') : can(el,'move'))) return;
    const scale = getScale();
    state.dragging = {
      id, mode: handle ? 'resize' : 'move', handle,
      startClientX: e.clientX, startClientY: e.clientY,
      startX: el.x, startY: el.y, startW: el.w, startH: el.h,
      scale
    };
    // Belt-and-suspenders against the browser's native text-selection
    // highlight flashing (often blue/green) while dragging fast over text.
    document.body.classList.add('eyecon-dragging');
    try{ elDiv.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  }

  function onPointerMove(e){
    const d = state.dragging;
    if(!d) return;
    const el = byId(d.id);
    if(!el) return;
    // CSS user-select:none stops new selections from starting, but a fast
    // drag can still leave the browser's native highlight painted from a
    // selection gesture that began a frame earlier — actively clearing it
    // every frame guarantees it never stays visible.
    const sel = window.getSelection && window.getSelection();
    if(sel && sel.rangeCount) sel.removeAllRanges();
    const dx = (e.clientX - d.startClientX)/d.scale;
    const dy = (e.clientY - d.startClientY)/d.scale;
    clearGuideLines();

    if(d.mode === 'move'){
      let nx = d.startX + dx, ny = d.startY + dy;
      nx = Math.round(nx/8)*8; ny = Math.round(ny/8)*8;
      const snapped = applyGuideSnap(el, nx, ny);
      el.x = Math.round(snapped.x/8)*8;
      el.y = Math.round(snapped.y/8)*8;
      refreshElementDom(el);
      renderSpacing();
      if(state.tools.measure){
        const marginR = Math.round(state.level.canvas.w - (el.x+el.w));
        const marginB = Math.round(state.level.canvas.h - (el.y+el.h));
        drawDragLabel(el.x, Math.max(0,el.y-24), `x:${Math.round(el.x)} y:${Math.round(el.y)}  →${marginR}px ↓${marginB}px`);
      }
    } else {
      // Snap the edge actually being dragged (not just the final w/h), so
      // resizing from the top or left snaps exactly like resizing from the
      // bottom or right — previously only e/s snapped correctly because w/h
      // were rounded *after* x/y had already been derived from the raw value.
      const dir = d.handle;
      const unit = 8;
      let x = d.startX, y = d.startY, w = d.startW, h = d.startH;

      if(dir.includes('e')){
        let right = d.startX + d.startW + dx;
        if(unit) right = Math.round(right/unit)*unit;
        w = Math.max(16, right - d.startX);
      }
      if(dir.includes('s')){
        let bottom = d.startY + d.startH + dy;
        if(unit) bottom = Math.round(bottom/unit)*unit;
        h = Math.max(16, bottom - d.startY);
      }
      if(dir.includes('w')){
        let left = d.startX + dx;
        if(unit) left = Math.round(left/unit)*unit;
        const right = d.startX + d.startW;
        x = Math.min(left, right - 16);
        w = right - x;
      }
      if(dir.includes('n')){
        let top = d.startY + dy;
        if(unit) top = Math.round(top/unit)*unit;
        const bottom = d.startY + d.startH;
        y = Math.min(top, bottom - 16);
        h = bottom - y;
      }
      Object.assign(el, {x,y,w,h});
      refreshElementDom(el);
      renderSpacing();
      if(state.tools.measure) drawDragLabel(el.x, Math.max(0,el.y-24), `${Math.round(w)}×${Math.round(h)}px`);
    }
  }

  function onPointerUp(){
    if(!state.dragging) return;
    state.dragging = null;
    document.body.classList.remove('eyecon-dragging');
    clearGuideLines();
    pushHistory();
    renderSpacing();
    const el = byId(state.selectedId);
    if(el) showSettings(el);
    refreshLiveOverlays();
  }

  // ---------------- Toolbar ----------------
  function updateToolButtonStates(){
    document.getElementById('tool-grid').classList.toggle('active', state.tools.gridVisible);
    document.getElementById('tool-guides').classList.toggle('active', state.tools.guides);
    document.getElementById('tool-inspector').classList.toggle('active', state.tools.inspector);
    document.getElementById('tool-measure').classList.toggle('active', state.tools.measure);
    document.getElementById('tool-measure').setAttribute('aria-pressed',String(state.tools.measure));
    const targetBtn = document.getElementById('tool-targets');
    targetBtn.classList.toggle('active', state.tools.showTargets);
    targetBtn.setAttribute('aria-pressed', String(state.tools.showTargets));
    updateGridBackground();
  }

  // Re-shows the pill whenever there's something new to say — e.g. tapping
  // the Hint tool — even if the player already dismissed the onboarding
  // message earlier; only an explicit dismiss (or a fresh level) hides it.
  function setHint(text){
    document.getElementById('editor-hint-text').textContent = text;
    document.getElementById('editor-hint-banner').classList.remove('hidden');
  }

  // Short, generic nudges per category — deliberately vaguer than the report
  // feedback (no exact numbers/instructions), since a hint should point you
  // toward the problem, not hand you the fix.
  const HINT_TIPS = {
    Contrast: 'this text might be hard to read against its background.',
    Alignment: "this element doesn't look lined up with the rest.",
    Hierarchy: "this text's size may not match how important it is.",
    Spacing: 'the spacing around this element feels a little off.',
    Consistency: 'this breaks the pattern used by similar elements.',
    Accessibility: 'this element might not be comfortable for every user.',
    Usability: "this element's placement could use a second look.",
  };
  let hintHighlightTimeout = null;

  function clearHintHighlight(){
    document.querySelectorAll('.el.hint-highlight').forEach(n=>n.classList.remove('hint-highlight'));
    if(hintHighlightTimeout){ clearTimeout(hintHighlightTimeout); hintHighlightTimeout = null; }
  }

  function highlightElementForHint(id){
    clearHintHighlight();
    const div = state.domNodes[id];
    if(!div) return;
    div.classList.add('hint-highlight');
    hintHighlightTimeout = setTimeout(()=>div.classList.remove('hint-highlight'), 4000);
  }

  function showHint(){
    const result = window.EC_GRADING.gradeSubmission(state.level, state.elements);
    const bad = unlockedFeedback(result.feedback, state.level.levelNumber, result.activeCategories).find(f=>f.type==='bad');
    if(!bad){
      clearHintHighlight();
      setHint('✨ Looking great — no major issues detected. Try Save when ready!');
      return;
    }
    if(bad.elId && byId(bad.elId)){
      highlightElementForHint(bad.elId);
      const tip = HINT_TIPS[bad.category] || 'take a closer look at this element.';
      setHint(`💡 Click the glowing element — ${tip}`);
    } else {
      clearHintHighlight();
      const tip = HINT_TIPS[bad.category] || 'something in this design needs another look.';
      setHint(`💡 Somewhere in your ${bad.category.toLowerCase()} — ${tip}`);
    }
  }

  function buildTypeScalePanel(){
    const level = state.level;
    const roles = ['heading','subheading','body','small','button','nav','label'];
    let html = '<h4>Type Scale Guide</h4><div class="typescale-info">';
    roles.forEach(r=>{
      const spec = Object.assign({}, window.EC_ROLE_DEFAULTS[r]||{}, (level.rubric.roles&&level.rubric.roles[r])||{});
      if(spec.minSize==null) return;
      html += `<div><b>${r}</b>: ${spec.minSize}–${spec.maxSize}px${spec.minW?` · min ${spec.minW}×${spec.minH}px tap target`:''}</div>`;
    });
    html += '</div>';
    document.getElementById('typescale-panel').innerHTML = html;
  }

  // ---------------- Mobile "more tools" bottom sheet ----------------
  // Same condition as the matching CSS breakpoints in style.css (narrow
  // phones, or a short landscape phone regardless of width) — secondary
  // tools relocate into an on-demand sheet there so the canvas keeps the
  // screen instead of a permanent toolbar row eating it.
  const MOBILE_TOOLS_MQ = window.matchMedia('(max-width: 640px), (max-height: 480px) and (orientation: landscape)');
  let secondaryToolItems = null; // [{el, parent, next}], captured once in original DOM order

  function captureSecondaryToolItems(){
    const ids = ['tool-grid', 'tool-grid-settings', 'tool-guides', 'tool-inspector', 'tool-hint', 'tool-show-clickable'];
    const items = ids.map(id => {
      const el = document.getElementById(id);
      return { el, parent: el.parentNode, next: el.nextElementSibling };
    });

    return items;
  }

  function applyToolbarLayout(isMobile){
    if(!secondaryToolItems) secondaryToolItems = captureSecondaryToolItems();
    const sheetGrid = document.getElementById('mobile-tools-sheet-grid');
    if(isMobile){
      secondaryToolItems.forEach(item => sheetGrid.appendChild(item.el));
    } else {
      hideMobileToolsSheet();
      // Reverse order: each item's stored `next` may itself be one of these
      // items, which only becomes a valid insertBefore() reference once IT
      // has already been reinserted — restoring back-to-front guarantees
      // that's always already happened by the time we need it.
      secondaryToolItems.slice().reverse().forEach(item => item.parent.insertBefore(item.el, item.next));
    }
  }

  function showMobileToolsSheet(){
    document.getElementById('mobile-tools-overlay').classList.remove('hidden', 'closing');
  }
  function hideMobileToolsSheet(){
    const overlay = document.getElementById('mobile-tools-overlay');
    if(overlay.classList.contains('hidden')) return;
    overlay.classList.add('closing');
    setTimeout(()=>{ overlay.classList.add('hidden'); overlay.classList.remove('closing'); }, 220);
  }

  // ---------------- Editor look (layout + theme) ----------------
  // Layouts and color themes to compare, remembered per browser and picked
  // from the profile's Settings list:
  //   single  – one left column (brief, Design tools, Layers) + top bar
  //   double  – brief on the left, Design tools + Layers on the right + top bar
  //   compact – one left column, no top bar (the original look)
  const VARIANT_KEY = 'eyecon_editor_variant';
  const VARIANT_DEFAULT = { layout:'double', theme:'blue' };
  function readVariant(){
    try{ return Object.assign({}, VARIANT_DEFAULT, JSON.parse(localStorage.getItem(VARIANT_KEY) || '{}')); }
    catch(e){ return Object.assign({}, VARIANT_DEFAULT); }
  }
  function applyVariant(v){
    const screen = document.getElementById('screen-editor');
    screen.dataset.layout = v.layout;
    screen.dataset.edTheme = v.theme;
    const left = screen.querySelector('.editor-side-rail:not(.editor-right-rail)');
    const right = screen.querySelector('.editor-right-rail');
    const target = v.layout === 'double' ? right : left;
    target.appendChild(document.getElementById('element-settings'));
    // The canvas area changes size, so re-center the design in it.
    if(state.level) requestAnimationFrame(()=>{ centerCanvas(); applyCanvasTransform(); });
  }
  function setVariant(key, value){
    const v = readVariant();
    v[key] = value;
    try{ localStorage.setItem(VARIANT_KEY, JSON.stringify(v)); }catch(e){}
    applyVariant(v);
  }

  function initToolbarOnce(){
    applyVariant(readVariant());

    document.getElementById('hint-pill-dismiss').addEventListener('click', ()=>{
      document.getElementById('editor-hint-banner').classList.add('hidden');
    });

    // Lives permanently in the panel header (see showSettings), so it's
    // wired once here rather than rebuilt on every render — resolves the
    // currently-selected element at click time instead of closing over one.
    document.getElementById('f-reset-icon').addEventListener('click', ()=>{
      const el = byId(state.selectedId);
      if(!el) return;
      const orig = state.original.find(o=>o.id===el.id);
      Object.assign(el, clone(orig));
      refreshElementDom(el); showSettings(el); pushHistory(); refreshLiveOverlays();
    });

    document.getElementById('mobile-tools-overlay').addEventListener('click', e=>{
      if(e.target.id === 'mobile-tools-overlay') hideMobileToolsSheet();
    });

    document.getElementById('tool-undo').addEventListener('click', undo);
    document.getElementById('tool-redo').addEventListener('click', redo);
    const zoomFromCenter = factor=>{
      const rect=document.getElementById('editor-canvas-wrap').getBoundingClientRect();
      zoomAt(rect.left+rect.width/2,rect.top+rect.height/2,factor);
    };
    document.getElementById('editor-zoom-out').addEventListener('click',()=>zoomFromCenter(0.8));
    document.getElementById('editor-zoom-in').addEventListener('click',()=>zoomFromCenter(1.25));
    document.getElementById('tool-targets').addEventListener('click', ()=>{ state.tools.showTargets=!state.tools.showTargets; updateToolButtonStates(); renderOverlays(); });
    document.getElementById('tool-grid').addEventListener('click', ()=>{ state.tools.gridVisible=!state.tools.gridVisible; updateToolButtonStates(); });
    document.getElementById('tool-grid-settings').addEventListener('click', e=>{
      const panel = document.getElementById('grid-settings-panel');
      const willShow = panel.hidden;
      document.getElementById('typescale-panel').hidden = true;
      if(willShow){
        syncGridSettingsUI();
        positionGridSettingsPanel(e.currentTarget);
      }
      panel.hidden = !willShow;
      if(willShow) hideMobileToolsSheet(); // so the grid/opacity change is visible on the canvas, not hidden behind the sheet
    });
    document.getElementById('grid-size-slider').addEventListener('input', e=>{
      state.tools.gridSize = Number(e.target.value);
      document.getElementById('grid-size-readout').textContent = state.tools.gridSize;
      if(!state.tools.gridVisible){ state.tools.gridVisible = true; updateToolButtonStates(); }
      else updateGridBackground();
    });
    document.getElementById('grid-opacity-slider').addEventListener('input', e=>{
      state.tools.gridOpacity = Number(e.target.value);
      document.getElementById('grid-opacity-readout').textContent = Math.round(state.tools.gridOpacity*100);
      updateGridBackground();
    });
    document.getElementById('tool-guides').addEventListener('click', ()=>{ state.tools.guides=!state.tools.guides; updateToolButtonStates(); });
    document.getElementById('tool-inspector').addEventListener('click', ()=>{ state.tools.inspector=!state.tools.inspector; updateToolButtonStates(); renderOverlays(); });
    document.getElementById('tool-measure').addEventListener('click', ()=>{ state.tools.measure=!state.tools.measure; updateToolButtonStates();renderRulers();renderSpacing(); });
    document.getElementById('tool-hint').addEventListener('click', ()=>{ showHint(); hideMobileToolsSheet(); });
    document.getElementById('tool-show-clickable').addEventListener('click', ()=>{ playIntroFlash(); hideMobileToolsSheet(); });
    document.getElementById('tool-typescale').addEventListener('click', ()=>{
      const panel = document.getElementById('typescale-panel');
      const willShow = panel.hidden;
      document.getElementById('grid-settings-panel').hidden = true;
      if(willShow) buildTypeScalePanel();
      panel.hidden = !willShow;
    });
    const compareBtn = document.getElementById('tool-preview');
    compareBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); showBeforeOverlay(); });
    compareBtn.addEventListener('contextmenu', e=>e.preventDefault());
    document.addEventListener('pointerup', hideBeforeOverlay);
    document.addEventListener('pointercancel', hideBeforeOverlay);
    // Keyboard users: Enter/Space toggles it like a normal button press+release.
    compareBtn.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); showBeforeOverlay(); }
    });
    compareBtn.addEventListener('keyup', e=>{
      if(e.key==='Enter' || e.key===' '){ hideBeforeOverlay(); }
    });
    document.getElementById('tool-save').addEventListener('click', ()=>{
      window.EC_MODAL.show('modal-confirm-submit');
    });
    document.getElementById('btn-confirm-no').addEventListener('click', ()=>{
      window.EC_MODAL.hide('modal-confirm-submit');
    });
    document.getElementById('btn-confirm-yes').addEventListener('click', ()=>{
      window.EC_MODAL.hide('modal-confirm-submit');
      const result = window.EC_GRADING.gradeSubmission(state.level, state.elements);
      if(state.onSubmit) state.onSubmit(result);
    });

    const canvasWrap = document.getElementById('editor-canvas-wrap');
    canvasWrap.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    canvasWrap.addEventListener('wheel', e=>{
      if(!state.level) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY);
      zoomAt(e.clientX, e.clientY, factor);
    }, { passive:false });

    // Middle-mouse-button drag to pan around the canvas, like Figma/Miro.
    // Adjusts state.panX/panY directly (the same values the zoom transform
    // uses) rather than native scroll, so it composes cleanly with zooming.
    let panState = null;
    // Which buttons pan: Settings > Gameplay > Pan the canvas with.
    const panButtons = () => ({ middle:[1], right:[2] }[window.EC_STORE.load().settings?.panButton] || [1, 2]);
    canvasWrap.addEventListener('contextmenu', e=>{ if(panButtons().includes(2)) e.preventDefault(); });
    canvasWrap.addEventListener('pointerdown', e=>{
      if(!panButtons().includes(e.button)) return;
      e.preventDefault();
      if(zoomAnimId){ cancelAnimationFrame(zoomAnimId); zoomAnimId = null; }
      panState = {
        pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY,
        startPanX: state.panX, startPanY: state.panY,
      };
      canvasWrap.classList.add('panning');
      try{ canvasWrap.setPointerCapture(e.pointerId); }catch(_){}
    });
    canvasWrap.addEventListener('pointermove', e=>{
      if(!panState || e.pointerId !== panState.pointerId) return;
      state.panX = panState.startPanX + (e.clientX - panState.startX);
      state.panY = panState.startPanY + (e.clientY - panState.startY);
      applyCanvasTransform();
    });
    const endPan = e=>{
      if(!panState || (e && e.pointerId !== panState.pointerId)) return;
      panState = null;
      canvasWrap.classList.remove('panning');
    };
    canvasWrap.addEventListener('pointerup', endPan);
    canvasWrap.addEventListener('pointercancel', endPan);
    canvasWrap.addEventListener('auxclick', e=>{ if(e.button === 1) e.preventDefault(); });

    // ---------------- Touch gestures: one-finger pan on empty canvas,
    // two-finger pinch-to-zoom anchored on the touch midpoint ----------------
    const activeTouches = new Map(); // pointerId -> {x,y}
    let touchPanState = null;        // { pointerId, startX, startY, startPanX, startPanY }
    let pinchState = null;           // { startDist, startZoom, anchorCanvasX, anchorCanvasY }

    function touchPoints(){ return Array.from(activeTouches.values()); }
    function touchDistance(){
      const pts = touchPoints();
      return pts.length < 2 ? 0 : Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
    }
    function touchMidpoint(){
      const pts = touchPoints();
      return { x:(pts[0].x+pts[1].x)/2, y:(pts[0].y+pts[1].y)/2 };
    }
    function beginPinch(){
      touchPanState = null;
      if(state.dragging){ state.dragging = null; document.body.classList.remove('eyecon-dragging'); }
      if(zoomAnimId){ cancelAnimationFrame(zoomAnimId); zoomAnimId = null; }
      const rect = canvasWrap.getBoundingClientRect();
      const mid = touchMidpoint();
      const scale = getScale();
      pinchState = {
        startDist: touchDistance(),
        startZoom: state.zoom,
        anchorCanvasX: (mid.x - rect.left - state.panX) / scale,
        anchorCanvasY: (mid.y - rect.top - state.panY) / scale,
      };
    }

    canvasWrap.addEventListener('pointerdown', e=>{
      if(e.pointerType !== 'touch') return;
      activeTouches.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(activeTouches.size === 2){
        beginPinch();
      } else if(activeTouches.size === 1 && !state.dragging){
        const elDiv = e.target.closest('.el');
        const isInteractive = elDiv && !elDiv.dataset.locked;
        if(!isInteractive){
          touchPanState = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startPanX: state.panX, startPanY: state.panY };
        }
      }
    });

    canvasWrap.addEventListener('pointermove', e=>{
      if(e.pointerType !== 'touch' || !activeTouches.has(e.pointerId)) return;
      activeTouches.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(pinchState && activeTouches.size >= 2){
        const dist = touchDistance();
        if(dist > 0 && pinchState.startDist > 0){
          state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchState.startZoom * (dist/pinchState.startDist)));
          state.displayZoom = state.zoom;
          const rect = canvasWrap.getBoundingClientRect();
          const mid = touchMidpoint();
          const scale = getScale();
          state.panX = (mid.x - rect.left) - pinchState.anchorCanvasX*scale;
          state.panY = (mid.y - rect.top) - pinchState.anchorCanvasY*scale;
          applyCanvasTransform();
        }
      } else if(touchPanState && e.pointerId === touchPanState.pointerId){
        state.panX = touchPanState.startPanX + (e.clientX - touchPanState.startX);
        state.panY = touchPanState.startPanY + (e.clientY - touchPanState.startY);
        applyCanvasTransform();
      }
    });

    function endTouch(e){
      if(e.pointerType !== 'touch') return;
      activeTouches.delete(e.pointerId);
      if(touchPanState && e.pointerId === touchPanState.pointerId) touchPanState = null;
      if(pinchState && activeTouches.size < 2){
        pinchState = null;
        const remainingIds = Array.from(activeTouches.keys());
        if(remainingIds.length === 1){
          const pt = activeTouches.get(remainingIds[0]);
          touchPanState = { pointerId: remainingIds[0], startX: pt.x, startY: pt.y, startPanX: state.panX, startPanY: state.panY };
        }
      }
    }
    canvasWrap.addEventListener('pointerup', endTouch);
    canvasWrap.addEventListener('pointercancel', endTouch);

    document.addEventListener('keydown', e=>{
      if(!document.getElementById('screen-editor').classList.contains('active')) return;
      const typing = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); return; }
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
      if(typing) return;
      if(state.selectedId && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
        const el = byId(state.selectedId);
        if(!el || el.locked || !can(el,'move')) return;
        const step = e.shiftKey ? 32 : 8; // stays on the 8px grid
        if(e.key==='ArrowUp') el.y -= step;
        if(e.key==='ArrowDown') el.y += step;
        if(e.key==='ArrowLeft') el.x -= step;
        if(e.key==='ArrowRight') el.x += step;
        refreshElementDom(el);
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', e=>{
      if(state.selectedId && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) pushHistory();
    });

    new ResizeObserver(()=>{
      if(state.level){ centerCanvas(); applyCanvasTransform(); }
    }).observe(canvasWrap);
  }

  // Press-and-hold "Compare": overlays the ORIGINAL (unedited) design directly
  // on top of the live canvas while held, so you can see exactly what changed
  // in place — rather than a separate side-by-side popup. The overlay is a
  // child of #editor-canvas itself, so it automatically inherits the same
  // pan/zoom transform and lines up pixel-for-pixel with the current view.
  function showBeforeOverlay(){
    if(!state.canvasEl || !state.level || document.getElementById('before-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'before-overlay';
    overlay.className = 'before-overlay';
    // buildStaticInner already sizes itself to exactly canvas.w x canvas.h,
    // matching #editor-canvas exactly, so it drops in with no extra sizing.
    overlay.appendChild(buildStaticInner(state.level, state.original));
    const badge = document.createElement('div');
    badge.className = 'before-badge';
    badge.textContent = 'BEFORE';
    overlay.appendChild(badge);
    state.canvasEl.appendChild(overlay);
  }

  function hideBeforeOverlay(){
    const overlay = document.getElementById('before-overlay');
    if(overlay) overlay.remove();
  }

  // ---------------- Static (non-interactive) renderer ----------------
  // Used for: attachment preview modal, before/after thumbnails, report screen.
  function buildStaticInner(level, elements){
    const inner = document.createElement('div');
    inner.style.width = level.canvas.w+'px';
    inner.style.height = level.canvas.h+'px';
    inner.style.position = 'relative';
    inner.style.background = level.canvas.bg;
    elements.slice().sort((a,b)=>a.z-b.z).forEach(el=>{
      const d = document.createElement('div');
      d.style.position = 'absolute';
      d.style.left = el.x+'px'; d.style.top = el.y+'px'; d.style.width = el.w+'px'; d.style.height = el.h+'px';
      d.style.borderRadius = (el.radius||0)+'px';
      d.style.clipPath = shapeClip(el.shape);
      d.style.whiteSpace = 'pre-line';
      d.style.opacity = el.opacity != null ? el.opacity : 1;
      if(el.border && el.border.width>0) d.style.border = `${el.border.width}px ${el.border.style} ${el.border.color}`;
      if(el.shadow && el.shadow.enabled) d.style.boxShadow = `0px 4px ${el.shadow.blur}px ${el.shadow.color}`;
      if(el.bg) d.style.background = el.bg;
      paintImage(d, el);
      if(el.text){
        d.style.display = 'flex'; d.style.alignItems='center'; d.style.justifyContent = textAlignToFlex(el.align);
        d.style.fontFamily = `'${el.fontFamily}', sans-serif`;
        d.style.fontSize = el.fontSize+'px'; d.style.fontWeight = el.fontWeight; d.style.color = el.color;
        d.style.padding = `0 ${el.padding!=null?el.padding:4}px`; d.textContent = el.text;
      }
      inner.appendChild(d);
    });
    return inner;
  }

  function renderStatic(container, level, elements, opts){
    opts = opts || {};
    const maxSize = opts.maxSize || 260;
    // fitW/fitH fit a rectangle (e.g. a browser window) instead of a square.
    const scale = opts.fitW ? Math.min(opts.fitW/level.canvas.w, opts.fitH/level.canvas.h)
      : Math.min(maxSize/level.canvas.w, maxSize/level.canvas.h);
    container.innerHTML = '';
    const outer = document.createElement('div');
    outer.style.width = (level.canvas.w*scale)+'px';
    outer.style.height = (level.canvas.h*scale)+'px';
    outer.style.position = 'relative';
    outer.style.overflow = 'hidden';
    outer.style.borderRadius = '8px';
    outer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    outer.style.background = level.canvas.bg;
    const inner = buildStaticInner(level, elements);
    inner.style.transform = `scale(${scale})`;
    inner.style.transformOrigin = '0 0';
    outer.appendChild(inner);
    container.appendChild(outer);
  }

  // Only text size is typed; position/size/etc. snap to the 8px grid, so they
  // change by dragging, arrow keys or the spinner, never free typing.
  document.addEventListener('keydown', e => {
    const t = e.target;
    if(t.matches?.('#element-settings input[type="number"]:not(#f-size)') && !/^(Arrow|Tab|Escape|Enter)/.test(e.key)) e.preventDefault();
  }, true);
  ['paste','drop'].forEach(ev => document.addEventListener(ev, e => {
    if(e.target.matches?.('#element-settings input[type="number"]:not(#f-size)')) e.preventDefault();
  }, true));

  window.EC_EDITOR = {
    readVariant, setVariant, selectElement,
    open, undo, redo,
    setOnSubmit: fn => state.onSubmit = fn,
    getElements: () => state.elements,
    getOriginalElements: () => state.original,
    getLevel: () => state.level,
    renderStatic,
    initToolbarOnce,
  };
})();
