/* =====================================================
   EyeCon — Eye Mail: inbox, detail, attachment preview, compose
   Exposes window.EC_MAIL
===================================================== */
(function(){

  const TIER_LABEL = { novice:'NOVICE', intermediate:'INTERMEDIATE', advanced:'ADVANCED', expert:'EXPERT' };
  let handlers = { onAccept:()=>{}, onSend:()=>{}, onOpenReply:()=>{} };
  let activeLevel = null;
  let pendingGradeResult = null;
  let replyMode = false; // true while modal-mail-detail is showing a post-grading client reply, not a fresh job brief

  // Typewriter-reveal compose state: the reply is pre-written but shown
  // greyed out; any keypress reveals the next few characters (not just one —
  // a long reply at 1 char/keypress took far too many presses — but not a
  // whole word either, which just looked like chunks popping in rather than typing).
  let composeState = { fullText:'', revealed:0, attached:false, attachedFileName:'', editedLevel:null, editedElements:null };
  const REVEAL_CHARS_PER_KEY = 6;

  // ---- Mail arrival + "new" state ----
  // After the very first email, new client emails don't pop into the inbox
  // instantly: each one "arrives" a few seconds later (staggered), with the
  // new-mail sound and a toast. Opened emails lose their red "new" dot.
  // Stored per browser, apart from the profile the app saves.
  const MAIL_KEY = 'eyecon_mail_state';
  function mailState(){
    try{ return Object.assign({arrivals:{}, seen:[]}, JSON.parse(localStorage.getItem(MAIL_KEY) || '{}')); }
    catch(e){ return {arrivals:{}, seen:[]}; }
  }
  function saveMailState(m){ try{ localStorage.setItem(MAIL_KEY, JSON.stringify(m)); }catch(e){} }
  let arrivalTimer = null;
  function arrivedInbox(profile){
    const all = window.EC_STORE.commissionInbox(profile);
    const m = mailState(), now = Date.now();
    let changed = false;
    all.forEach(level=>{
      if(m.arrivals[level.id] != null) return;
      // First email is there right away; later ones land a moment later.
      m.arrivals[level.id] = Object.keys(m.arrivals).length ? now + 2500 : now;
      changed = true;
    });
    if(changed) saveMailState(m);
    const pending = all.filter(l=>m.arrivals[l.id] > now);
    clearTimeout(arrivalTimer);
    if(pending.length){
      const next = pending.reduce((a,b)=>m.arrivals[a.id] <= m.arrivals[b.id] ? a : b);
      arrivalTimer = setTimeout(()=>window.dispatchEvent(new CustomEvent('ec-mail-arrived', {detail:next})), m.arrivals[next.id] - now + 50);
    }
    return all.filter(l=>m.arrivals[l.id] <= now);
  }
  function markSeen(level){
    const m = mailState();
    if(!m.seen.includes(level.id)){ m.seen.push(level.id); saveMailState(m); }
    document.querySelector(`#mail-list [data-level-id="${level.id}"]:not(.unread) .unread-dot`)?.remove();
  }

  function renderInbox(profile){
    const list=document.getElementById('mail-list');
    list.innerHTML='';
    const S=window.EC_STORE;
    const seen=mailState().seen;
    // While a design is with the client it leaves the inbox; the reply comes back as new mail.
    const levels=arrivedInbox(profile).filter(l=>profile.pendingClientReply?.levelId!==l.id);
    [profile.readyReply].forEach(r=>{
      const level = r && window.EC_LEVELS.find(l=>l.id===r.levelId);
      if(level && !levels.includes(level)) levels.unshift(level);
    });
    if(!levels.length){
      const prog=S.progression(profile);
      list.innerHTML = prog.doneToday >= prog.dailyLimit
        ? `<div class="empty-state">It's 5 PM. Continue from the day summary to receive tomorrow's mail.</div>`
        : '<div class="empty-state">All caught up! Your finished work is in Completed.</div>';
      return;
    }
    levels.forEach(level=>{
      const waiting=profile.pendingClientReply?.levelId===level.id;
      const replied=profile.readyReply?.levelId===level.id;
      const polish=!waiting && !replied && S.isPolishTask(profile,level);
      const clickable=!waiting;
      const row=document.createElement('div');
      row.className='mail-item'+(replied?' unread':''); row.dataset.levelId=level.id; row.setAttribute('role','listitem'); row.tabIndex=clickable?0:-1;
      const preview = waiting ? 'Your design is with the client. Awaiting their reply...'
        : replied ? `${level.clientName} replied to your design.`
        : polish ? `Could you polish our ${level.pageLabel.toLowerCase()} for an even better result?`
        : level.emailPreview;
      const tag = waiting ? '<span class="tag">Sent</span>' : replied ? '<span class="tag">Reply</span>'
        : `<span class="tag tier-${level.tier}">${polish ? 'Polish' : TIER_LABEL[level.tier]}</span>`;
      const pay=S.commissionPay(profile,level);
      const prize=waiting || replied ? '' : `<span class="mail-prize" title="Paid on approval, plus ${pay.perBonusStar} for each bonus star">${window.EC_MONEY(pay.base)} <small>+${pay.perBonusStar}/★</small></span>`;
      row.innerHTML=`<div class="avatar-circle">${level.avatarEmoji}</div><div class="mail-item-name">${level.clientName}</div><div class="mail-item-preview">${preview}</div>${prize}${tag}${replied || !seen.includes(level.id) ?'<span class="unread-dot" title="New"></span>':''}`;
      if(!waiting) row.appendChild(debugButton('Skip ⏭', 'Debug: approve this page at 5★ without editing', p => skipLevel(p, level)));
      if(clickable){
        const open = () => replied ? handlers.onOpenReply(level) : openMailDetail(level);
        row.addEventListener('click', open);
        row.addEventListener('keydown', e=>{ if(e.key==='Enter') open(); });
      }
      list.appendChild(row);
    });
  }

  // ponytail: debug-only Skip / Repeat buttons on mail rows; remove before release.
  // Skip approves the page at 5★ without editing; Repeat forgets it so the
  // email comes back. Both save and reload so the app re-reads the profile.
  function debugButton(label, title, run){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mail-debug-btn'; b.textContent = label; b.title = title;
    b.addEventListener('click', e => { e.stopPropagation(); const p = window.EC_STORE.load(); run(p); window.EC_STORE.save(p); location.reload(); });
    return b;
  }
  function skipLevel(p, level){
    if(!p.completed.includes(level.id)) p.completed.push(level.id);
    p.history.unshift({ levelId:level.id, name:level.clientName, page:level.pageLabel, date:new Date().toISOString(), stars:5, missionComplete:true,
      quote:'(Skipped for debugging)', reply:`Hi, ${level.clientName} here.\n\n★★★★★  (5/5)\n\n(Skipped for debugging.)\n\n— ${level.clientName}` });
    if(p.readyReply && p.readyReply.levelId === level.id) delete p.readyReply;
  }
  function repeatLevel(p, level){
    p.completed = p.completed.filter(id => id !== level.id);
    p.history = p.history.filter(h => h.levelId !== level.id);
    if(p.designs) delete p.designs[level.id];
    if(p.revisionDrafts) delete p.revisionDrafts[level.id];
    if(p.readyReply && p.readyReply.levelId === level.id) delete p.readyReply;
  }

  function renderCompleted(profile){
    const list = document.getElementById('mail-list');
    list.innerHTML = '';
    const levels = window.EC_LEVELS.filter(l => profile.completed.includes(l.id));
    if(levels.length === 0){
      list.innerHTML = `<div class="empty-state">Nothing here yet — finish a client project and it'll show up in Completed.</div>`;
      return;
    }
    levels.forEach(level=>{
      const stars = window.EC_STORE.bestStars(profile)[level.id] || 0;
      const hist = profile.history.find(h=>h.levelId===level.id && h.stars===stars) || profile.history.find(h=>h.levelId===level.id);
      const row = document.createElement('div');
      row.className = 'mail-item completed';
      row.innerHTML = `
        <div class="avatar-circle">${level.avatarEmoji}</div>
        <div class="mail-item-name">${level.clientName}</div>
        <div class="mail-item-preview">${'★'.repeat(stars)+'☆'.repeat(5-stars)} · ${level.pageLabel}${hist && hist.quote ? ` · “${hist.quote}”` : ''}</div>
        <span class="tag tier-${level.tier}">${TIER_LABEL[level.tier]}</span>
      `;
      row.appendChild(debugButton('Repeat ↺', 'Debug: forget this page so its email comes back', p => repeatLevel(p, level)));
      row.addEventListener('click', ()=>openMailDetail(level, true));
      list.appendChild(row);
    });
  }

  // Client-voice reply: a short, personal note when approved; if the work
  // is sent back, the client lists what's still missing.
  // What each client offers when they approve the job.
  const THANK_YOU_GIFT = {
    mayo: 'we would love to send you a signed art print',
    yappers: 'we would be happy to give you a free year of Yappers Premium',
    haybuhay: 'we would love to give you an early copy of Hay Buhay 3 before launch',
    antoks: 'we would be happy to treat you to a meal at Antoks Manoks anytime',
    cones: 'we would love to treat you to free ice cream at Cones anytime',
    kolehiyo: 'we would be happy to invite you as a guest speaker at our next design talk',
    oras: 'we would love to send you a BEAR ORAS watch',
  };
  function buildClientReplyText(level, result, missionComplete){
    const stars = result.stars;
    const goals = result.feedback.filter(f => f.category === 'Goals');
    const relevant = t => goals.length ? goals.filter(f => f.type===t)
      : result.feedback.filter(f => f.type===t && !f.editorOnly && result.activeCategories.includes(f.category.toLowerCase()));
    const templates = level.replyTemplates || {};
    if(missionComplete){
      // Warm thank-you note: what got better, then a small gift.
      const tool = (level.tools || [])[0];
      const better = tool === 'color' ? 'the text is clearer and easier to read'
        : tool === 'typography' ? 'the text is so much easier to read'
        : 'everything lines up neatly';
      const custom = stars >= 5 ? templates.great : templates.ok;
      return ['Good day,', '',
        `Thank you so much for the revised ${(level.pageLabel || 'design').toLowerCase()}. It looks much better now and ${better}.`,
        ...(custom ? ['', custom] : []), '',
        `We truly appreciate your help and effort. As a small token of our gratitude, ${THANK_YOU_GIFT[level.project] || "we'll be recommending EyeCon to all our friends"}.`,
        '', `— ${level.emailFrom || level.clientName}`].join('\n');
    }
    const lines = [`Hi, ${level.clientName} here.`, ''];
    {
      lines.push(templates.bad || "A few things still aren't quite right.", 'Could you take another look? We would still love it if you could:', '');
      const bad = relevant('bad').filter(f => !f.bonus);
      (bad.length ? bad : [{title:'Give it a little more polish.'}]).forEach(f => lines.push(`• ${f.title}`));
      lines.push('', 'Send us an updated version when you can. Thanks!', '', `— ${level.clientName}`);
    }
    return lines.join('\n');
  }

  // Shows the client's reply after grading — approves and pays out (stars
  // met the threshold) or sends the work back for revision (mission stays
  // open in the inbox, same modal reused with a different button/behavior).
  // Email header: subject as the title, then who it's from and who it's to.
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function emailAddress(level){
    const domain = /\.[a-z]+$/i.test(level.clientName) ? level.clientName.toLowerCase()
      : level.clientName.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'') + '.com';
    return 'hello@' + domain;
  }
  function setEmailHeader(level, subject, fromMe){
    const client = `${esc(level.emailFrom || level.clientName)} <span>&lt;${emailAddress(level)}&gt;</span>`;
    const me = 'You <span>&lt;junior.designer@eyecon.studio&gt;</span>';
    document.getElementById('mail-detail-title').textContent = subject;
    document.getElementById('mail-detail-avatar').innerHTML = level.avatarEmoji || '✉';
    document.getElementById('mail-detail-meta').innerHTML =
      `<dd class="mail-detail-name">${fromMe ? me : client}</dd><dd class="mail-detail-to">To: ${fromMe ? client : me}</dd>`;
  }
  function emailSubject(level){ return level.emailSubject || `${level.pageLabel}: ${level.emailPreview}`; }

  // The reply the player types out (same text every time).
  function myReplyText(level){
    return `Good day, ${level.clientName} team,\n\nI have attached the updated design for your review. Let me know what you think, and I will be happy to make any adjustments.\n\nBest regards,\nEyeCon`;
  }
  // Completed mail: the whole conversation, newest first, so the approval
  // sits on top and scrolling down goes back to the original request.
  function threadHtml(level, profile){
    const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ', ' + d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); };
    const msg = (cls, avatar, name, date, text, extra='') => `<article class="mail-thread-msg ${cls}">
        <header><span class="avatar-circle">${avatar}</span><b>${name}</b><time>${esc(date)}</time></header>
        <p>${esc(text)}</p>${extra}</article>`;
    const client = level.avatarEmoji || '✉', me = '<img src="assets/icons/profile.svg" alt="">';
    const clientName = esc(level.emailFrom || level.clientName);
    const file = (level.attachmentName || 'design.png').replace(/(\.\w+)$/, '_edited$1');
    const designs = [];
    const attach = (name, elements) => {
      if(!elements) return `<span class="mail-thread-file">📎 ${esc(name)}</span>`;
      designs.push(elements);
      return `<button type="button" class="attachment-card mail-thread-attachment" data-design="${designs.length - 1}" aria-label="Preview ${esc(name)}"><span class="attachment-thumb"></span><span class="attachment-name"><b>PNG</b>${esc(name)}</span></button>`;
    };
    const approvedDesign = (profile.designs || {})[level.id];
    const parts = [];
    profile.history.filter(h => h.levelId === level.id).forEach(h => {
      const stars = '★'.repeat(h.stars || 0) + '☆'.repeat(5 - (h.stars || 0));
      const text = h.reply || `Hi, ${level.clientName} here.\n\n${stars}\n\n${h.quote || ''}\n\n— ${level.clientName}`;
      const badge = h.missionComplete ? '<span class="mail-thread-badge done">Approved</span>' : '<span class="mail-thread-badge">Needs changes</span>';
      parts.push(msg('from-client', client, clientName + badge, when(h.date), text));
      // Older saves only kept the approved design, not every attempt.
      parts.push(msg('from-me', me, 'You', when(h.date), myReplyText(level), attach(file, h.elements || (h.missionComplete ? approvedDesign : null))));
    });
    parts.push(msg('from-client original', client, clientName, 'Original request', level.emailBody, attach(level.attachmentName || 'design.png', level.elements)));
    return { html: parts.join(''), designs };
  }

  function openClientReply(level, result, missionComplete, onContinue){
    activeLevel = level;
    replyMode = true;
    document.getElementById('mail-detail-body').classList.remove('mail-thread');
    setEmailHeader(level, 'Re: ' + emailSubject(level));
    document.getElementById('mail-detail-level-tag').textContent = 'Personal design commission';
    document.getElementById('mail-detail-body').textContent = buildClientReplyText(level, result, missionComplete);
    document.getElementById('mail-detail-attachment').innerHTML = '';
    document.getElementById('mail-detail-reward').innerHTML = '';
    const btn = document.getElementById('btn-accept-job');
    btn.style.display = '';
    btn.textContent = missionComplete ? 'Mark Completed' : window.EC_STORE.workday(window.EC_STORE.load()).submissions>=window.EC_STORE.dailyTaskLimit() ? 'Finish workday' : 'Back to Editor';
    btn.onclick = () => { window.EC_MODAL.hide('modal-mail-detail'); btn.onclick = null; replyMode = false; onContinue(); };
    window.EC_MODAL.show('modal-mail-detail');
  }

  function openMailDetail(level, readOnly){
    activeLevel = level;
    markSeen(level);
    replyMode = false;
    document.getElementById('btn-accept-job').onclick = null;
    const polishing = !readOnly && window.EC_STORE.isPolishTask(window.EC_STORE.load(), level);
    setEmailHeader(level, polishing ? `One more polish? (${level.pageLabel})` : emailSubject(level));
    document.getElementById('mail-detail-level-tag').textContent = 'Personal design commission';
    const profile = window.EC_STORE.load();
    const pay = window.EC_STORE.commissionPay(profile, level);
    const polish = !readOnly && window.EC_STORE.isPolishTask(profile, level);
    document.getElementById('mail-detail-body').textContent = polish
      ? `Hi! We loved your work on our ${level.pageLabel.toLowerCase()}. If you have time, could you give it one more polish? We'd happily raise our review.\n\n— ${level.clientName}`
      : level.emailBody;
    const bodyEl = document.getElementById('mail-detail-body');
    bodyEl.classList.toggle('mail-thread', !!readOnly);
    if(readOnly){
      const thread = threadHtml(level, profile);
      bodyEl.innerHTML = thread.html;
      bodyEl.querySelectorAll('[data-design]').forEach(btn => {
        const elements = thread.designs[btn.dataset.design];
        window.EC_EDITOR.renderStatic(btn.querySelector('.attachment-thumb'), level, elements, { maxSize:280 });
        btn.addEventListener('click', () => openPreview(level, elements));
      });
      document.getElementById('mail-detail-title').textContent = 'Re: ' + emailSubject(level);
    }
    document.getElementById('mail-detail-reward').innerHTML =
      readOnly ? '' : `Reward: <b>${window.EC_MONEY(pay.base)}</b>`;
    document.getElementById('mail-detail-attachment').innerHTML = readOnly ? '' :
      `<button type="button" class="attachment-card" id="attachment-chip" aria-label="Preview ${level.attachmentName}"><span class="attachment-thumb"></span><span class="attachment-name"><b>PNG</b>${level.attachmentName}</span></button>`;
    if(!readOnly){
      window.EC_EDITOR.renderStatic(document.querySelector('#attachment-chip .attachment-thumb'), level, level.elements, { maxSize:280 });
      document.getElementById('attachment-chip').addEventListener('click', ()=>openPreview(level, level.elements));
    }
    const acceptBtn = document.getElementById('btn-accept-job');
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.display = readOnly ? 'none' : '';
    window.EC_MODAL.show('modal-mail-detail');
  }

  function openPreview(level, elements){
    window.EC_MODAL.show('modal-preview');
    const mount = document.getElementById('preview-stage-mount');
    // Fill as much of the viewport as comfortably fits (minus a small margin
    // for the modal's own padding/close button) so the whole design reads
    // clearly without needing to zoom in.
    const maxSize = Math.max(420, Math.min(window.innerWidth - 70, window.innerHeight - 70, 1300));
    window.EC_EDITOR.renderStatic(mount, level, elements || level.elements, { maxSize });
  }

  // ---------------- Compose: typewriter reveal + attach file ----------------
  // Rebuilds the whole contenteditable's innerHTML from scratch every call,
  // rather than querying/patching its existing children — necessary because
  // on mobile the browser's own contenteditable engine mutates this DOM
  // arbitrarily as the user types (see the 'input' listener below), so any
  // previous structure can't be trusted to still be there.
  function renderComposeText(){
    const container = document.getElementById('compose-body');
    const done = composeState.revealed >= composeState.fullText.length;
    container.innerHTML = '<span class="revealed"></span><span class="type-cursor" aria-hidden="true"></span><span class="ghost"></span>';
    container.querySelector('.revealed').textContent = composeState.fullText.slice(0, composeState.revealed);
    container.querySelector('.ghost').textContent = composeState.fullText.slice(composeState.revealed);
    container.querySelector('.type-cursor').style.visibility = done ? 'hidden' : 'visible';
    document.getElementById('compose-hint').textContent = done
      ? 'Message complete.'
      : 'Tap or press any key to type your reply…';
    // Once fully revealed there's nothing left to type — turn editing off so
    // mobile browsers dismiss the on-screen keyboard automatically.
    container.contentEditable = done ? 'false' : 'true';
    if(done) container.blur();
    updateSendEnabled();
  }

  // Reveals up to `target` one character at a time on a fast tick, instead
  // of jumping straight there — a single keypress advancing several
  // characters at once read as chunks popping in rather than typing.
  // Re-targeting an already-running reveal (rapid keypresses) just extends
  // it from wherever it currently is, so nothing skips or double-counts.
  let revealTimer = null;
  let revealTarget = 0;
  function queueReveal(count){
    revealTarget=Math.min(composeState.fullText.length,Math.max(revealTarget,composeState.revealed)+count);
    if(revealTimer) return;
    revealTimer=setInterval(()=>{
      if(composeState.revealed>=revealTarget){clearInterval(revealTimer);revealTimer=null;return;}
      composeState.revealed++;
      renderComposeText();
    },10); // one letter per tick, so it still reads as typing
  }

  function updateSendEnabled(){
    const done = composeState.revealed >= composeState.fullText.length;
    document.getElementById('btn-send-mail').disabled = !(done && composeState.attached);
  }

  function openCompose(level, gradeResult){
    clearInterval(revealTimer); revealTimer = null; // stop any leftover cascade from a previous compose
    revealTarget=0;
    activeLevel = level; pendingGradeResult = gradeResult;
    // Same header as a received email, but from you to the client.
    document.getElementById('compose-avatar').innerHTML = level.avatarEmoji || '✉';
    document.getElementById('compose-subject').textContent = 'Re: ' + emailSubject(level);
    document.getElementById('compose-meta').innerHTML =
      `<dd class="mail-detail-name">From: You <span>&lt;junior.designer@eyecon.studio&gt;</span></dd><dd class="mail-detail-to">To: ${esc(level.emailFrom || level.clientName)} <span>&lt;${emailAddress(level)}&gt;</span></dd>`;

    composeState = {
      fullText: myReplyText(level),
      revealed: 0,
      attached: false,
      attachedFileName: '',
      editedLevel: (window.EC_EDITOR.getLevel && window.EC_EDITOR.getLevel()) || level,
      editedElements: (window.EC_EDITOR.getElements && window.EC_EDITOR.getElements()) || level.elements,
    };
    renderComposeText();
    document.getElementById('compose-attachment-chip').classList.add('hidden');
    document.getElementById('attach-popover').classList.add('hidden');
    document.getElementById('compose-attach-btn').classList.remove('hidden');

    window.EC_MODAL.show('modal-compose');
    document.getElementById('compose-body').focus();
  }

  function toggleAttachPopover(){
    const pop = document.getElementById('attach-popover');
    if(!pop.classList.contains('hidden')){ pop.classList.add('hidden'); return; }
    const fname = (composeState.editedLevel.attachmentName || 'design.png').replace(/(\.\w+)$/, '_edited$1');
    const card = `<span class="attachment-thumb"></span><span class="attachment-name"><b>PNG</b>${fname}</span>`;
    pop.innerHTML = `<button class="attachment-card" id="attach-option-edited" type="button" aria-label="Attach ${fname}">${card}</button>`;
    const drawThumb = root => window.EC_EDITOR.renderStatic(root.querySelector('.attachment-thumb'), composeState.editedLevel, composeState.editedElements, { maxSize:280 });
    drawThumb(pop);
    pop.classList.remove('hidden');
    document.getElementById('attach-option-edited').addEventListener('click', ()=>{
      composeState.attached = true;
      composeState.attachedFileName = fname;
      const chip = document.getElementById('compose-attachment-chip');
      chip.innerHTML = `<span class="attachment-card attached">${card}</span>`;
      drawThumb(chip);
      chip.classList.remove('hidden');
      chip.onclick = () => openPreview(composeState.editedLevel, composeState.editedElements);
      pop.classList.add('hidden');
      // Nothing else to attach once the edited file is picked.
      document.getElementById('compose-attach-btn').classList.add('hidden');
      updateSendEnabled();
    });
  }

  function initOnce(){
    document.getElementById('btn-close-mail').addEventListener('click', ()=>{
      window.EC_MODAL.hide('modal-mail-detail');
    });
    // Clicking the dimmed area around an email closes it, like the attachment preview.
    document.getElementById('modal-mail-detail').addEventListener('click', e=>{
      if(e.target.id === 'modal-mail-detail') window.EC_MODAL.hide('modal-mail-detail');
    });
    document.getElementById('btn-close-preview').addEventListener('click', ()=>{
      window.EC_MODAL.hide('modal-preview');
    });
    document.getElementById('modal-preview').addEventListener('click', e=>{
      if(e.target.id === 'modal-preview') window.EC_MODAL.hide('modal-preview');
    });
    document.getElementById('btn-accept-job').addEventListener('click', ()=>{
      if(replyMode) return; // handled by openClientReply's own onclick instead
      window.EC_MODAL.hide('modal-mail-detail');
      handlers.onAccept(activeLevel);
    });

    // 'input' fires for every real content change — physical-keyboard typing,
    // mobile virtual-keyboard taps, IME composition, autocomplete, voice
    // dictation, paste — unlike 'keydown', which mobile virtual keyboards
    // often don't dispatch in a usable way (and which never fires at all
    // unless the field is genuinely editable, hence contenteditable above).
    // Whatever the browser actually inserted is discarded and redrawn from
    // composeState on every event, so it never matters *where* the browser
    // put it or *what* it was — only that something happened.
    document.getElementById('compose-body').addEventListener('input', e=>{
      if(composeState.revealed >= composeState.fullText.length){ renderComposeText(); return; }
      const n = (e.data && e.data.length) ? e.data.length : 1;
      // The browser has *already* inserted whatever was typed into the real
      // DOM by the time 'input' fires (that's the whole point of the event) —
      // queueReveal's first tick doesn't land for another 25ms, so without
      // this, that stray real character was visible (at wherever the native
      // caret happened to be, usually the very start) for a whole tick
      // before getting wiped: it visibly typed itself in, then vanished.
      // Discarding it synchronously, right here, closes that window.
      renderComposeText();
      // Reveal several characters per keystroke rather than exactly one —
      // long replies used to need a keypress per letter, which dragged on
      // far past the point of feeling like a fun typing flourish — but
      // stagger them on a fast tick (queueReveal) rather than jumping there
      // instantly, so it still reads as typing and not chunks popping in.
      // One sound per key press (not per revealed letter), matched to the key type.
      window.EC_SOUND.typeKey(e.inputType === 'deleteContentBackward' ? 'Backspace' : e.inputType === 'insertParagraph' ? 'Enter' : e.data === ' ' ? ' ' : 'a');
      queueReveal(n * REVEAL_CHARS_PER_KEY);
    });
    document.getElementById('compose-attach-btn').addEventListener('click', toggleAttachPopover);
    // Typing works even if a stray click took focus off the message.
    document.addEventListener('keydown', e=>{
      const body = document.getElementById('compose-body');
      if(document.getElementById('modal-compose').classList.contains('hidden') || document.activeElement === body) return;
      if(e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') body.focus();
    }, true);

    document.getElementById('btn-send-mail').addEventListener('click', ()=>{
      if(document.getElementById('btn-send-mail').disabled) return;
      window.EC_MODAL.hide('modal-compose');
      handlers.onSend(activeLevel, pendingGradeResult);
    });
  }

  window.EC_MAIL = {
    renderInbox, renderCompleted, arrivedInbox, openMailDetail, buildClientReplyText, openCompose, openClientReply,
    setHandlers: h => handlers = Object.assign(handlers, h),
    initOnce,
  };
})();
