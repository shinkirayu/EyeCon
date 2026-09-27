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
  const REVEAL_CHARS_PER_KEY = 3;

  function renderInbox(profile){
    const list=document.getElementById('mail-list');
    list.innerHTML='';
    const S=window.EC_STORE;
    const levels=S.commissionInbox(profile);
    // Replies stay visible even once the page counts as done or the day is full.
    [profile.pendingClientReply, profile.readyReply].forEach(r=>{
      const level = r && window.EC_LEVELS.find(l=>l.id===r.levelId);
      if(level && !levels.includes(level)) levels.unshift(level);
    });
    if(!levels.length){
      const prog=S.progression(profile);
      list.innerHTML = prog.doneToday >= prog.dailyLimit
        ? `<div class="empty-state">That's all for today, you finished ${prog.doneToday} tasks! New emails arrive tomorrow.</div>`
        : '<div class="empty-state">All caught up! Your finished work is in Completed.</div>';
      return;
    }
    levels.forEach(level=>{
      const waiting=profile.pendingClientReply?.levelId===level.id;
      const replied=profile.readyReply?.levelId===level.id;
      const polish=!waiting && !replied && S.isPolishTask(profile,level);
      const clickable=!waiting;
      const row=document.createElement('div');
      row.className='mail-item'+(replied?' unread':''); row.setAttribute('role','listitem'); row.tabIndex=clickable?0:-1;
      const preview = waiting ? 'Your design is with the client. Awaiting their reply...'
        : replied ? `${level.clientName} replied to your design.`
        : polish ? `Could you polish our ${level.pageLabel.toLowerCase()} for an even better result?`
        : level.emailPreview;
      const tag = waiting ? '<span class="tag">Sent</span>' : replied ? '<span class="tag">Reply</span>'
        : `<span class="tag tier-${level.tier}">${polish ? 'Polish' : TIER_LABEL[level.tier]}</span>`;
      const pay=S.commissionPay(profile,level);
      const prize=waiting || replied ? '' : `<span class="mail-prize" title="Paid on approval, plus ${pay.perBonusStar} for each bonus star">${window.EC_MONEY(pay.base)} <small>+${pay.perBonusStar}/★</small></span>`;
      row.innerHTML=`<div class="avatar-circle">${level.avatarEmoji}</div><div class="mail-item-name">${level.clientName}</div><div class="mail-item-preview">${preview}</div>${prize}${tag}${replied?'<span class="unread-dot"></span>':''}`;
      if(clickable){
        const open = () => replied ? handlers.onOpenReply(level) : openMailDetail(level);
        row.addEventListener('click', open);
        row.addEventListener('keydown', e=>{ if(e.key==='Enter') open(); });
      }
      list.appendChild(row);
    });
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
      row.addEventListener('click', ()=>openMailDetail(level, true));
      list.appendChild(row);
    });
  }

  // Client-voice reply: a short, personal note when approved; if the work
  // is sent back, the client lists what's still missing.
  function buildClientReplyText(level, result, missionComplete){
    const stars = result.stars;
    const starLine = '★'.repeat(stars) + '☆'.repeat(5 - stars) + `  (${stars}/5)`;
    const goals = result.feedback.filter(f => f.category === 'Goals');
    const relevant = t => goals.length ? goals.filter(f => f.type===t)
      : result.feedback.filter(f => f.type===t && !f.editorOnly && result.activeCategories.includes(f.category.toLowerCase()));
    const templates = level.replyTemplates || {};
    const lines = [`Hi, ${level.clientName} here.`, ''];
    if(missionComplete){
      lines.push(starLine, '', stars >= 5 ? (templates.great || 'This is exactly what I wanted, thank you!') : (templates.ok || 'This works well, thank you.'));
      lines.push('', `— ${level.clientName}`);
    } else {
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
  function openClientReply(level, result, missionComplete, onContinue){
    activeLevel = level;
    replyMode = true;
    document.getElementById('mail-detail-title').textContent = level.clientName;
    document.getElementById('mail-detail-level-tag').textContent = 'Personal design commission';
    document.getElementById('mail-detail-body').textContent = buildClientReplyText(level, result, missionComplete);
    document.getElementById('mail-detail-attachment').innerHTML = '';
    document.getElementById('mail-detail-reward').innerHTML = '';
    const btn = document.getElementById('btn-accept-job');
    btn.style.display = '';
    btn.textContent = missionComplete ? 'Mark Completed' : 'Back to Editor';
    btn.onclick = () => { window.EC_MODAL.hide('modal-mail-detail'); btn.onclick = null; replyMode = false; onContinue(); };
    window.EC_MODAL.show('modal-mail-detail');
  }

  function openMailDetail(level, readOnly){
    activeLevel = level;
    replyMode = false;
    document.getElementById('btn-accept-job').onclick = null;
    document.getElementById('mail-detail-title').textContent = level.clientName;
    document.getElementById('mail-detail-level-tag').textContent = 'Personal design commission';
    const profile = window.EC_STORE.load();
    const pay = window.EC_STORE.commissionPay(profile, level);
    const polish = !readOnly && window.EC_STORE.isPolishTask(profile, level);
    document.getElementById('mail-detail-body').textContent = polish
      ? `Hi! We loved your work on our ${level.pageLabel.toLowerCase()}. If you have time, could you give it one more polish? We'd happily raise our review.\n\n— ${level.clientName}`
      : level.emailBody;
    document.getElementById('mail-detail-reward').innerHTML =
      `${readOnly ? 'Paid' : 'Reward'}: <b>${window.EC_MONEY(pay.base)}</b> · +${pay.perBonusStar} per bonus ★`;
    document.getElementById('mail-detail-attachment').innerHTML =
      `<button type="button" class="attachment-card" id="attachment-chip" aria-label="Preview ${level.attachmentName}"><span class="attachment-thumb"></span><span class="attachment-name"><b>PNG</b>${level.attachmentName}</span></button>`;
    window.EC_EDITOR.renderStatic(document.querySelector('#attachment-chip .attachment-thumb'), level, level.elements, { maxSize:280 });
    document.getElementById('attachment-chip').addEventListener('click', ()=>openPreview(level, level.elements));
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
      window.EC_SOUND.play('typing');
      renderComposeText();
    },18);
  }

  function updateSendEnabled(){
    const done = composeState.revealed >= composeState.fullText.length;
    document.getElementById('btn-send-mail').disabled = !(done && composeState.attached);
  }

  function openCompose(level, gradeResult){
    clearInterval(revealTimer); revealTimer = null; // stop any leftover cascade from a previous compose
    revealTarget=0;
    activeLevel = level; pendingGradeResult = gradeResult;
    document.getElementById('compose-to-name').textContent = level.clientName;
    const template = 'I have attached the updated design for your review. Let me know what you think, and I will be happy to make any adjustments.';

    composeState = {
      fullText: `Good day, ${level.clientName} team,\n\n${template}\n\nBest regards,\nEyeCon`,
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
      queueReveal(n * REVEAL_CHARS_PER_KEY);
    });
    document.getElementById('compose-body').addEventListener('click', ()=>queueReveal(REVEAL_CHARS_PER_KEY));
    document.getElementById('compose-attach-btn').addEventListener('click', toggleAttachPopover);

    document.getElementById('btn-send-mail').addEventListener('click', ()=>{
      if(document.getElementById('btn-send-mail').disabled) return;
      window.EC_MODAL.hide('modal-compose');
      handlers.onSend(activeLevel, pendingGradeResult);
    });
  }

  window.EC_MAIL = {
    renderInbox, renderCompleted, openMailDetail, openCompose, openClientReply,
    setHandlers: h => handlers = Object.assign(handlers, h),
    initOnce,
  };
})();
