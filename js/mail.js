/* =====================================================
   EyeCon — Eye Mail: inbox, detail, attachment preview, compose
   Exposes window.EC_MAIL
===================================================== */
(function(){

  const TIER_LABEL = { novice:'NOVICE', intermediate:'INTERMEDIATE', advanced:'ADVANCED', expert:'EXPERT' };
  let handlers = { onAccept:()=>{}, onSend:()=>{} };
  let activeLevel = null;
  let pendingGradeResult = null;

  // Typewriter-reveal compose state: the reply is pre-written but shown
  // greyed out; any keypress reveals the next character.
  let composeState = { fullText:'', revealed:0, attached:false, attachedFileName:'', editedLevel:null, editedElements:null };

  // DEV: every level is unlocked regardless of player level, for testing —
  // flip to false to restore normal progression-gated unlocking.
  const DEV_UNLOCK_ALL_LEVELS = true;

  function isUnlocked(level, profile){
    if(DEV_UNLOCK_ALL_LEVELS) return true;
    const lvl = window.EC_STORE.levelFromTotalXp(profile.totalXp).level;
    return lvl >= level.unlockLevel || profile.completed.includes(level.id);
  }

  function renderInbox(profile){
    const list = document.getElementById('mail-list');
    list.innerHTML = '';
    const levels = window.EC_LEVELS.filter(l => !profile.completed.includes(l.id));
    if(levels.length === 0){
      list.innerHTML = `<div class="empty-state">📭 Inbox zero! You've completed every client project. Check Stats for your final results.</div>`;
      return;
    }
    levels.forEach(level=>{
      const unlocked = isUnlocked(level, profile);
      const row = document.createElement('div');
      row.className = 'mail-item' + (unlocked ? '' : ' locked');
      row.setAttribute('role','listitem');
      row.tabIndex = unlocked ? 0 : -1;
      row.innerHTML = `
        <div class="avatar-circle">${level.avatarEmoji}</div>
        <div class="mail-item-name">${level.clientName} <span style="font-weight:600;color:var(--ink-faint)">— Lv.${level.levelNumber} ${level.concept}</span></div>
        <div class="mail-item-preview">${unlocked ? '"'+level.emailPreview+'"' : '🔒 Reach a higher level to unlock this client'}</div>
        <span class="tag ${level.tier}">${TIER_LABEL[level.tier]}</span>
        ${unlocked ? '<span class="unread-dot" aria-hidden="true"></span>' : ''}
      `;
      if(unlocked){
        row.addEventListener('click', ()=>openMailDetail(level));
        row.addEventListener('keydown', e=>{ if(e.key==='Enter') openMailDetail(level); });
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
      const hist = profile.history.find(h=>h.levelId===level.id);
      const row = document.createElement('div');
      row.className = 'mail-item completed';
      row.innerHTML = `
        <div class="avatar-circle">${level.avatarEmoji}</div>
        <div class="mail-item-name">${level.clientName}</div>
        <div class="mail-item-preview">Grade ${hist?hist.grade:'—'} · Score ${hist?hist.score:'—'}</div>
        <span class="tag ${level.tier}">${TIER_LABEL[level.tier]}</span>
      `;
      row.addEventListener('click', ()=>openMailDetail(level, true));
      list.appendChild(row);
    });
  }

  function openMailDetail(level, readOnly){
    activeLevel = level;
    document.getElementById('mail-detail-title').textContent = level.clientName;
    document.getElementById('mail-detail-level-tag').textContent = `LEVEL ${level.levelNumber} · ${level.concept}`;
    document.getElementById('mail-detail-body').textContent = level.emailBody;
    document.getElementById('mail-detail-attachment').innerHTML =
      `<div class="attachment-chip" id="attachment-chip">📎 ${level.attachmentName}</div>`;
    document.getElementById('attachment-chip').addEventListener('click', ()=>openPreview(level, level.elements));
    document.getElementById('btn-accept-job').style.display = readOnly ? 'none' : '';
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

  function updateSendEnabled(){
    const done = composeState.revealed >= composeState.fullText.length;
    document.getElementById('btn-send-mail').disabled = !(done && composeState.attached);
  }

  function openCompose(level, gradeResult){
    activeLevel = level; pendingGradeResult = gradeResult;
    document.getElementById('compose-to-name').textContent = level.clientName;
    let template;
    if(gradeResult.score >= 90) template = level.replyTemplates.great;
    else if(gradeResult.score >= 70) template = level.replyTemplates.ok;
    else template = level.replyTemplates.bad;

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
    pop.innerHTML = `<button class="attach-option" id="attach-option-edited" type="button">📄 ${fname}<span class="attach-option-sub">Your edited version — click to attach</span></button>`;
    pop.classList.remove('hidden');
    document.getElementById('attach-option-edited').addEventListener('click', ()=>{
      composeState.attached = true;
      composeState.attachedFileName = fname;
      const chip = document.getElementById('compose-attachment-chip');
      chip.textContent = `📎 ${fname}  ✓`;
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
      composeState.revealed = Math.min(composeState.fullText.length, composeState.revealed + n);
      renderComposeText();
    });
    document.getElementById('compose-attach-btn').addEventListener('click', toggleAttachPopover);

    document.getElementById('btn-send-mail').addEventListener('click', ()=>{
      if(document.getElementById('btn-send-mail').disabled) return;
      window.EC_MODAL.hide('modal-compose');
      handlers.onSend(activeLevel, pendingGradeResult);
    });
  }

  window.EC_MAIL = {
    renderInbox, renderCompleted, openMailDetail, openCompose,
    setHandlers: h => handlers = Object.assign(handlers, h),
    initOnce,
  };
})();
