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
  // Phones held sideways (~844×390) are too short for the portrait phone
  // layout. Ask the browser to lay the page out at a desktop width instead
  // (it then shrinks the page to fit the screen), so they get the desktop
  // layout at a size that fits. Portrait phones keep the phone layout.
  const LANDSCAPE_LAYOUT_H = 760;
  function fitPhoneViewport(){
    const meta = document.querySelector('meta[name="viewport"]');
    if(!meta || !window.matchMedia('(pointer:coarse)').matches) return;
    const sw = screen.width, sh = screen.height;
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    const short = Math.min(sw, sh), long = Math.max(sw, sh);
    const content = landscape && short < 600
      ? `width=${Math.max(1280, Math.round(LANDSCAPE_LAYOUT_H * long / short))}, user-scalable=no, viewport-fit=cover`
      : 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    if(meta.content !== content){
      meta.content = content;
      // iOS reports the new window size a moment after the viewport changes,
      // so measure again once it has settled (otherwise the UI stays at 100%
      // until the phone is rotated).
      [60, 300, 800].forEach(ms => setTimeout(fit, ms));
    }
  }
  function fit(){
    fitPhoneViewport();
    // Use the visible height (Safari's toolbars can cover part of the window).
    const w = window.innerWidth, h = Math.min(window.innerHeight, window.visualViewport ? window.visualViewport.height : Infinity);
    const f = w <= 900 ? 1 : Math.max(MIN_FIT, Math.min(1, w / DESIGN_W, h / DESIGN_H));
    document.documentElement.style.setProperty('--fit', f.toFixed(3));
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  // Safari's address bar showing/hiding changes the visible area without a resize.
  if(window.visualViewport) window.visualViewport.addEventListener('resize', fit);
})();

// No pinch-zoom on phones: the game handles its own sizing. iOS ignores
// user-scalable=no, so cancel its pinch gesture directly. The design canvases
// keep their own two-finger zoom.
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => {
  if(e.touches.length > 1 && !e.target.closest('#editor-canvas-wrap, .maker-stage')) e.preventDefault();
}, { passive:false });
