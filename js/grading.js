/* =====================================================
   EyeCon — Grading engine
   Exposes window.EC_GRADING.gradeSubmission(level, elements)
===================================================== */
(function(){

  const INTERACTIVE_ROLES = ['button','nav'];
  const TYPE_ROLES = ['heading','subheading','body','small','label','button','nav'];

  function roleSpec(level, role){
    const override = (level.rubric.roles && level.rubric.roles[role]) || {};
    const base = window.EC_ROLE_DEFAULTS[role] || {};
    return Object.assign({}, base, override);
  }

  function clamp01(n){ return Math.max(0, Math.min(1, n)); }

  function centerOf(el){ return { x: el.x + el.w/2, y: el.y + el.h/2 }; }

  function rectsOverlap(a,b){
    return !(a.x+a.w <= b.x || b.x+b.w <= a.x || a.y+a.h <= b.y || b.y+b.h <= a.y);
  }

  function overlapArea(a,b){
    const ox = Math.max(0, Math.min(a.x+a.w,b.x+b.w) - Math.max(a.x,b.x));
    const oy = Math.max(0, Math.min(a.y+a.h,b.y+b.h) - Math.max(a.y,b.y));
    return ox*oy;
  }

  // Find the effective background color behind an element by scanning
  // filled rects beneath it (lower z, overlapping its center point).
  function effectiveBg(elements, canvasBg, el){
    // An element with its own fill covers whatever is behind it, so its
    // own background color — not anything beneath — is what its text sits on.
    if(el.bg) return el.bg;
    const c = centerOf(el);
    let best = null, bestZ = -Infinity;
    elements.forEach(other => {
      if(other.id === el.id) return;
      if(!other.bg) return;
      if(other.z >= el.z) return;
      if(c.x >= other.x && c.x <= other.x+other.w && c.y >= other.y && c.y <= other.y+other.h){
        if(other.z > bestZ){ bestZ = other.z; best = other.bg; }
      }
    });
    return best || canvasBg;
  }

  function gridColumnPositions(canvasW, cols, gutter){
    const colW = (canvasW - gutter*(cols+1)) / cols;
    const positions = [];
    for(let i=0;i<=cols;i++) positions.push(gutter + i*(colW+gutter) - gutter*(i>0?0:0));
    // recompute cleanly
    const xs = [];
    for(let i=0;i<cols;i++) xs.push(gutter + i*(colW+gutter));
    xs.push(canvasW - gutter); // right edge guide too
    return { colW, xs };
  }

  function nearestDist(value, arr){
    let best = Infinity;
    arr.forEach(v => { const d = Math.abs(value-v); if(d<best) best = d; });
    return best;
  }

  function gradeSubmission(level, elements){
    const canvasBg = level.canvas.bg;
    const canvasW = level.canvas.w, canvasH = level.canvas.h;
    const editable = elements.filter(el => !el.locked);
    const feedback = [];
    const scores = {};

    // ---------- 1. CONTRAST ----------
    (function(){
      const textEls = editable.filter(el => el.text && el.color);
      if(textEls.length === 0){ scores.contrast = 100; return; }
      let total = 0;
      textEls.forEach(el => {
        const bg = effectiveBg(elements, canvasBg, el);
        const bold = (el.fontWeight === '700' || el.fontWeight === 'bold' || Number(el.fontWeight) >= 700);
        const res = window.WCAG.passesWCAG(el.color, bg, el.fontSize, bold, 'AA');
        const frac = res.pass ? 1 : clamp01(res.ratio / res.required);
        total += frac;
        if(res.pass){
          feedback.push({ type:'good', category:'Contrast', elId: el.id,
            title: `"${el.text}" has strong contrast (${res.ratio.toFixed(1)}:1)`,
            detail: `Meets WCAG AA (needs ${res.required}:1 for this text size).`, suggest:'' });
        } else {
          feedback.push({ type:'bad', category:'Contrast', elId: el.id,
            title: `"${el.text}" fails color contrast (${res.ratio.toFixed(1)}:1, needs ${res.required}:1)`,
            detail: `WCAG AA requires ${res.required}:1 contrast for ${el.fontSize}px text against its background.`,
            suggest: `Darken the text or lighten/darken the background behind "${el.text}" to raise the ratio.` });
        }
      });
      scores.contrast = Math.round((total/textEls.length)*100);
    })();

    // ---------- 2. ALIGNMENT / GRID ----------
    (function(){
      const cols = level.rubric.gridColumns, gutter = level.rubric.gridGutter;
      const { xs } = gridColumnPositions(canvasW, cols, gutter);
      const tol = 8;
      const candidates = editable.filter(el => el.type !== 'background');
      if(candidates.length === 0){ scores.alignment = 100; return; }
      let hits = 0;
      candidates.forEach(el => {
        const d = nearestDist(el.x, xs);
        if(d <= tol) hits++;
        else{
          // Per-element note, tagged editorOnly so it drives the live
          // in-editor Inspector (which needs an exact offender to point at)
          // without also cluttering the Design Review screen, which keeps
          // the summary version below instead.
          feedback.push({ type:'bad', category:'Alignment', elId: el.id, editorOnly:true,
            title: `"${el.text || el.role}" isn't aligned to the grid`,
            detail: `Its left edge sits ${Math.round(d)}px from the nearest column line.`,
            suggest: 'Turn on Snap and drag it so the left edge locks onto a grid line.' });
        }
      });
      const frac = hits / candidates.length;
      scores.alignment = Math.round(frac*100);
      if(frac >= 0.8){
        feedback.push({ type:'good', category:'Alignment', title:'Elements line up cleanly to the grid.',
          detail:`${hits}/${candidates.length} elements snap within ${tol}px of a column line.`, suggest:'' });
      } else {
        feedback.push({ type:'bad', category:'Alignment', title:'Several elements are off-grid.',
          detail:`Only ${hits}/${candidates.length} elements align to the ${cols}-column grid.`,
          suggest:'Enable the Grid tool and drag elements so their left edge snaps to a column line.' });
      }
      // out-of-bounds check feeds into usability, but also worth an alignment note
      const oob = candidates.filter(el => el.x < 0 || el.y < 0 || el.x+el.w > canvasW || el.y+el.h > canvasH);
      oob.forEach(el => {
        feedback.push({ type:'bad', category:'Alignment', elId: el.id, editorOnly:true,
          title: `"${el.text || el.role}" spills outside the canvas`,
          detail: 'Part of this element extends past the visible frame.',
          suggest: 'Resize or reposition it so it stays fully inside the canvas.' });
      });
      if(oob.length){
        feedback.push({ type:'bad', category:'Alignment', title:`${oob.length} element(s) spill outside the canvas.`,
          detail: oob.map(e=>e.id).join(', ') + ' extend past the visible frame.',
          suggest:'Resize or reposition these elements so they stay fully inside the canvas.' });
      }
    })();

    // ---------- 3. HIERARCHY ----------
    (function(){
      const typed = editable.filter(el => el.text && TYPE_ROLES.includes(el.role));
      if(typed.length === 0){ scores.hierarchy = 100; return; }
      let inRange = 0;
      typed.forEach(el => {
        const spec = roleSpec(level, el.role);
        if(spec.minSize!=null && el.fontSize >= spec.minSize && el.fontSize <= spec.maxSize) inRange++;
      });
      const rangeFrac = inRange/typed.length;

      // ordering: average heading size > average subheading size > average body size
      const avgOf = role => {
        const list = typed.filter(e=>e.role===role);
        if(!list.length) return null;
        return list.reduce((s,e)=>s+e.fontSize,0)/list.length;
      };
      const hAvg = avgOf('heading'), sAvg = avgOf('subheading'), bAvg = avgOf('body');
      let orderOk = true, orderNote = '';
      if(hAvg!=null && sAvg!=null && !(hAvg > sAvg)){ orderOk=false; orderNote='Headings should be larger than subheadings.'; }
      if(sAvg!=null && bAvg!=null && !(sAvg > bAvg)){ orderOk=false; orderNote='Subheadings should be larger than body text.'; }
      if(hAvg!=null && bAvg!=null && !(hAvg > bAvg)){ orderOk=false; orderNote='Headings should be larger than body text.'; }

      const orderFrac = orderOk ? 1 : 0.3;
      scores.hierarchy = Math.round(((rangeFrac*0.6) + (orderFrac*0.4))*100);

      if(rangeFrac < 1){
        const bad = typed.filter(el => { const s=roleSpec(level, el.role); return !(s.minSize!=null && el.fontSize>=s.minSize && el.fontSize<=s.maxSize); });
        bad.forEach(el => {
          const s = roleSpec(level, el.role);
          feedback.push({ type:'bad', category:'Hierarchy', elId: el.id,
            title: `"${el.text}" (${el.role}) is ${el.fontSize}px — outside the ${s.minSize}-${s.maxSize}px range`,
            detail: `A ${el.role} should typically be ${s.minSize}-${s.maxSize}px so it reads at the right level of importance.`,
            suggest:`Adjust the font size of "${el.text}" into the ${el.role} range.` });
        });
      }
      if(!orderOk){
        feedback.push({ type:'bad', category:'Hierarchy', title:'Type scale order is inconsistent.', detail: orderNote,
          suggest:'Make sure headings > subheadings > body text in size, so the eye knows what to read first.' });
      } else if (hAvg!=null || sAvg!=null){
        feedback.push({ type:'good', category:'Hierarchy', title:'Clear visual hierarchy.', detail:'Headings, subheadings and body text are correctly scaled relative to each other.', suggest:'' });
      }
    })();

    // ---------- 4. SPACING ----------
    (function(){
      const unit = level.rubric.spacingUnit || 8;
      const stackRoles = ['heading','subheading','body','label','nav','small'];
      const candidates = editable.filter(el => stackRoles.includes(el.role))
        .slice().sort((a,b)=>a.y-b.y);
      const pairs = [];
      for(let i=0;i<candidates.length-1;i++){
        const a = candidates[i], b = candidates[i+1];
        const horizOverlap = Math.max(0, Math.min(a.x+a.w,b.x+b.w) - Math.max(a.x,b.x));
        if(horizOverlap < 10) continue; // not really stacked in the same column
        const gap = b.y - (a.y + a.h);
        if(gap > -2 && gap < 300) pairs.push({ a, b, gap });
      }
      const gaps = pairs.map(p=>p.gap);
      if(gaps.length === 0){ scores.spacing = 100; return; }
      const tol = Math.max(4, unit*0.4);
      let consistent = 0;
      pairs.forEach(p => {
        const nearestMultiple = Math.round(p.gap/unit)*unit;
        const ok = Math.abs(p.gap-nearestMultiple) <= tol && p.gap >= 0;
        if(ok) consistent++;
        else feedback.push({ type:'bad', category:'Spacing', elId: p.b.id, editorOnly:true,
          title: `"${p.b.text || p.b.role}" sits an uneven ${Math.round(p.gap)}px below "${p.a.text || p.a.role}"`,
          detail: `Nearest ${unit}px-multiple gap would be ${Math.round(nearestMultiple)}px.`,
          suggest: `Nudge it so the gap above lands on a multiple of ${unit}px.` });
      });
      const frac = consistent/gaps.length;
      scores.spacing = Math.round(frac*100);
      if(frac >= 0.8){
        feedback.push({ type:'good', category:'Spacing', title:'Spacing follows a consistent rhythm.',
          detail:`Most gaps are close to multiples of ${unit}px.`, suggest:'' });
      } else {
        feedback.push({ type:'bad', category:'Spacing', title:'Spacing between elements feels uneven.',
          detail:`Only ${consistent}/${gaps.length} gaps match a ${unit}px spacing scale.`,
          suggest:`Try keeping vertical gaps as multiples of ${unit}px for a calmer, more predictable rhythm.` });
      }
      const overlaps = [];
      for(let i=0;i<candidates.length-1;i++){
        const a=candidates[i], b=candidates[i+1];
        if(rectsOverlap(a,b) && overlapArea(a,b) > 40) overlaps.push([a,b]);
      }
      overlaps.forEach(([a,b]) => {
        feedback.push({ type:'bad', category:'Spacing', elId: b.id, editorOnly:true,
          title: `"${b.text || b.role}" overlaps "${a.text || a.role}"`,
          detail: 'These two elements currently cover part of each other.',
          suggest: 'Move or resize one so they no longer overlap.' });
      });
      if(overlaps.length){
        feedback.push({ type:'bad', category:'Spacing', title:'Some elements overlap each other.',
          detail: overlaps.map(([a,b])=>a.id+' / '+b.id).join(', '),
          suggest:'Add breathing room so overlapping text and controls do not obscure one another.' });
      }
    })();

    // ---------- 5. CONSISTENCY ----------
    (function(){
      const textEls = editable.filter(el => el.text);
      if(textEls.length === 0){ scores.consistency = 100; return; }
      const families = new Set(textEls.map(e=>e.fontFamily));
      const colors = new Set(textEls.map(e=>e.color));
      let score = 100;
      if(families.size > 2) score -= (families.size-2)*15;
      if(colors.size > 6) score -= (colors.size-6)*8;
      score = Math.max(0, Math.min(100, score));
      scores.consistency = Math.round(score);
      if(families.size > 2){
        feedback.push({ type:'bad', category:'Consistency', title:`${families.size} different fonts are in use.`,
          detail:'Too many typefaces fragments the design language.',
          suggest:'Limit the palette to 1-2 font families for a cohesive look.' });
      } else {
        feedback.push({ type:'good', category:'Consistency', title:'Typography stays consistent.', detail:`${families.size} font family used across the design.`, suggest:'' });
      }
    })();

    // ---------- 6. ACCESSIBILITY ----------
    (function(){
      const parts = [];
      // tap targets
      const interactive = editable.filter(el => INTERACTIVE_ROLES.includes(el.role));
      if(interactive.length){
        let ok = 0;
        interactive.forEach(el => {
          const spec = roleSpec(level, el.role);
          const minW = spec.minW||44, minH = spec.minH||44;
          if(el.w >= minW && el.h >= minH) ok++;
          else feedback.push({ type:'bad', category:'Accessibility', elId: el.id,
            title:`"${el.text||el.id}" tap target is ${Math.round(el.w)}×${Math.round(el.h)}px — below ${minW}×${minH}px`,
            detail:'Small tap targets are hard to hit accurately, especially on touchscreens.',
            suggest:`Resize this control to at least ${minW}×${minH}px.` });
        });
        parts.push(ok/interactive.length);
        if(ok===interactive.length) feedback.push({ type:'good', category:'Accessibility', title:'All interactive elements meet minimum tap-target size.', detail:'', suggest:'' });
      }
      // min font size
      const textEls = editable.filter(el => el.text);
      if(textEls.length){
        let ok=0;
        textEls.forEach(el => {
          if(el.fontSize >= 12) ok++;
          else feedback.push({ type:'bad', category:'Accessibility', elId: el.id,
            title:`"${el.text}" is only ${el.fontSize}px — below the 12px minimum`,
            detail:'Very small text is difficult for many users to read comfortably.',
            suggest:'Increase the font size to at least 12px (14px+ recommended for body copy).' });
        });
        parts.push(ok/textEls.length);
      }
      const avg = parts.length ? parts.reduce((a,b)=>a+b,0)/parts.length : 1;
      scores.accessibility = Math.round(avg*100);

      // Informational: color-alone status indicators (not auto-graded, teaches the principle)
      (level.rubric.colorOnlyIds||[]).forEach(id => {
        feedback.push({ type:'info', category:'Accessibility', elId:id,
          title:'Reminder: never rely on color alone.',
          detail:'Status/warning indicators should pair color with an icon, label, or pattern so colorblind users can perceive them too.', suggest:'' });
      });
    })();

    // ---------- 7. USABILITY / COMPOSITION ----------
    (function(){
      const candidates = editable;
      let inBounds = 0;
      candidates.forEach(el => {
        if(el.x>=0 && el.y>=0 && el.x+el.w<=canvasW && el.y+el.h<=canvasH) inBounds++;
      });
      const boundsFrac = candidates.length ? inBounds/candidates.length : 1;
      let usability = boundsFrac;
      if(boundsFrac < 1){
        feedback.push({ type:'bad', category:'Usability', title:'Some content is clipped by the canvas edge.',
          detail:`${candidates.length-inBounds} element(s) extend beyond the visible area.`,
          suggest:'Keep every element fully inside the design canvas so nothing gets cut off.' });
      } else {
        feedback.push({ type:'good', category:'Usability', title:'Composition stays neatly within the frame.', detail:'', suggest:'' });
      }

      const safeMargin = level.rubric.safeMargin;
      if(safeMargin){
        const nonDecorative = candidates.filter(el => el.role !== 'decorative');
        let withinMargin = 0;
        const offenders = [];
        nonDecorative.forEach(el => {
          const ok = el.x >= safeMargin && el.y >= safeMargin &&
            (el.x+el.w) <= (canvasW-safeMargin) && (el.y+el.h) <= (canvasH-safeMargin);
          if(ok) withinMargin++;
          else{
            offenders.push(el.id);
            feedback.push({ type:'bad', category:'Usability', elId: el.id, editorOnly:true,
              title: `"${el.text || el.role}" crowds the screen edge`,
              detail: `Needs at least ${safeMargin}px of clearance from the nearest edge.`,
              suggest: 'Move it further from the edge for comfortable breathing room.' });
          }
        });
        const marginFrac = nonDecorative.length ? withinMargin/nonDecorative.length : 1;
        usability = (usability + marginFrac) / 2;
        if(marginFrac >= 0.9){
          feedback.push({ type:'good', category:'Usability', title:`Content respects a ${safeMargin}px safe margin.`, detail:'This keeps things comfortable on small screens.', suggest:'' });
        } else {
          feedback.push({ type:'bad', category:'Usability', title:`Some elements crowd the screen edge (need ${safeMargin}px safe margin).`,
            detail: offenders.join(', ') + ' sit closer than the safe margin to an edge.',
            suggest:`On small screens, keep at least ${safeMargin}px of breathing room from every edge.` });
        }
      }
      scores.usability = Math.round(usability*100);
    })();

    // ---------- OVERALL ----------
    const weights = level.rubric.weights;
    let weightedTotal = 0, weightSum = 0;
    Object.keys(weights).forEach(k => {
      const s = scores[k] != null ? scores[k] : 100;
      weightedTotal += s * weights[k];
      weightSum += weights[k];
    });
    const score = Math.round(weightedTotal/weightSum);

    let grade;
    if(score >= 96) grade = 'S+';
    else if(score >= 90) grade = 'S';
    else if(score >= 80) grade = 'A';
    else if(score >= 70) grade = 'B';
    else if(score >= 60) grade = 'C';
    else grade = 'Needs Improvement';

    // sort feedback: bad first, then good, then info
    const order = { bad:0, good:1, info:2 };
    feedback.sort((a,b)=> order[a.type]-order[b.type]);

    const xpAwarded = window.EC_STORE.xpAwardForGrade(grade);

    return { score, grade, categoryScores: scores, feedback, xpAwarded };
  }

  window.EC_GRADING = { gradeSubmission, effectiveBg };
})();
