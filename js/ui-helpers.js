/* =====================================================
   EyeCon — Shared UI helpers (animated modal show/hide)
   Exposes window.EC_MODAL
===================================================== */
(function(){

  const CARD_SELECTOR = '.modal-card, .mail-detail-card, .confirm-card, .compose-card, .preview-frame, .gacha-reveal-card';

  function show(id){
    const overlay = typeof id === 'string' ? document.getElementById(id) : id;
    if(!overlay) return;
    overlay.classList.remove('closing');
    overlay.classList.remove('hidden');
  }

  function hide(id){
    const overlay = typeof id === 'string' ? document.getElementById(id) : id;
    if(!overlay || overlay.classList.contains('hidden')) return;
    const card = overlay.querySelector(CARD_SELECTOR);
    if(!card){ overlay.classList.add('hidden'); return; }
    overlay.classList.add('closing');
    const finish = () => {
      overlay.classList.add('hidden');
      overlay.classList.remove('closing');
      card.removeEventListener('animationend', finish);
    };
    card.addEventListener('animationend', finish, { once:true });
    // Safety net in case the animation event doesn't fire (e.g. reduced-motion).
    setTimeout(finish, 260);
  }

  window.EC_MODAL = { show, hide };
})();
