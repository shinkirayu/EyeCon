/* =====================================================
   EyeCon — Shared UI helpers (animated modal show/hide)
   Exposes window.EC_MODAL
===================================================== */
(function(){

  const CARD_SELECTOR = '.modal-card, .mail-detail-card, .confirm-card, .compose-card, .preview-frame, .gacha-reveal-card';

  function show(id){
    const overlay = typeof id === 'string' ? document.getElementById(id) : id;
    if(!overlay) return;
    // Attachment previews can open over a compose or client dialog.
    const visible = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
    overlay.style.zIndex = String(Math.max(2000, ...visible.map(el=>Number(getComputedStyle(el).zIndex)||0)) + 1);
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

// The game's currency: a purple ¢ followed by the amount.
window.EC_MONEY = n => `<span class="money" aria-label="${n} coins"><span class="money-icon" aria-hidden="true">¢</span>${n}</span>`;

// Scale the whole interface to the window. The UI is designed at 1920×1080
// CSS px; smaller windows (e.g. a 1080p laptop at 125–150% Windows scaling,
// which the browser sees as 1536×864 or 1280×720) shrink proportionally.
// Bigger windows stay at 1, and phones keep their own layout.
(function(){
  const DESIGN_W = 1920, DESIGN_H = 1080, MIN_FIT = 0.6;
  function fit(){
    const w = window.innerWidth, h = window.innerHeight;
    const f = w <= 900 ? 1 : Math.max(MIN_FIT, Math.min(1, w / DESIGN_W, h / DESIGN_H));
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  fit();
  window.addEventListener('resize', fit);
})();
