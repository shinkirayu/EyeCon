/* EyeCon credits roll, shared by the website easter egg and the end of the game.
   EC_CREDITS(onEnd): plays once; Esc, Close or the end of the roll calls onEnd. */
(function(){
  const CSS = `/* Easter egg: the Foresight logo rolls the team credits. */
  .egg{position:fixed;inset:0;z-index:300;overflow:hidden;background:#123b54;color:#fff3d6;font-family:'Nunito',sans-serif;}
  .egg .roll{position:absolute;left:0;right:0;top:100%;display:grid;justify-items:center;gap:6px;text-align:center;animation:eggRoll 40s linear forwards;}
  .egg img{width:260px;}
  .egg h2{margin:48px 0 8px;font:800 20px 'Nunito';letter-spacing:.2em;text-transform:uppercase;color:#94d9cf;}
  .egg p{margin:0;display:grid;font:700 20px/1.4 'Nunito';}
  .egg p b{font:800 36px/1.15 'Baloo 2',sans-serif;color:#fff;}
  .egg a{color:#f9d985;font-weight:800;}
  .egg .heart{margin-top:24px;font-size:22px;}
  .egg .x{all:unset;position:absolute;right:24px;bottom:24px;cursor:pointer;color:#fff3d6;font:800 18px 'Nunito';text-decoration:underline;}
  .egg .x:focus-visible{outline:3px solid #f5b83d;outline-offset:3px;}
  @keyframes eggRoll{to{transform:translateY(calc(-100% - 100vh))}}
  @media (prefers-reduced-motion:reduce){.egg .roll{position:static;animation:none;padding:48px 0;}.egg{overflow:auto;}}`;
  window.EC_CREDITS = (onEnd, closeLabel = 'Close ✕') => {
    if(!document.getElementById('egg-css')){ const st = document.createElement('style'); st.id = 'egg-css'; st.textContent = CSS; document.head.appendChild(st); }
    const d = document.createElement('div'); d.className = 'egg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Credits');
    const who = (n, r) => `<p><b>${n}</b><span>${r}</span></p>`;
    d.innerHTML = `<div class="roll"><img src="assets/landing/v2/foresight.png" alt="Foresight"><p style="margin:24px 0">presents</p><img src="assets/sprites/logo-eyecon.png" alt="EyeCon" style="width:300px">
        <h2>Made by</h2>${who('Nica Caranza', 'The Greatest Animator')}${who('Nadine Santillan', 'The GOAT Artist')}${who('Auoie Dyncy Tan', 'The Brain')}${who('Kryu Maro Vera Cruz', 'The Lead Larper')}
        <h2>Food by</h2><p><b>Almel's Canteen</b></p>
        <h2>Support</h2><p><b>Miguel Mayor</b></p>
        <h2>Music by</h2><p><b>King Anthony Polo</b><a href="https://www.youtube.com/@CrwnlssKing" target="_blank" rel="noopener">youtube.com/@CrwnlssKing</a></p>
        <h2>Level 1 portfolio</h2><p><b>Ate Girnielle</b><a href="https://linktr.ee/mayonnaisegee" target="_blank" rel="noopener">linktr.ee/mayonnaisegee</a></p>
        <h2>Fur babies</h2><p><b>Natto · Brimmy · Tsukki · Boris · Bunsu · Boni · Cotton</b></p>
        <h2>In loving memory of</h2><p><b>Blue · Bogs</b></p>
        <h2>Special thanks</h2><p><b>BINI</b></p>
        <p class="heart">Thank you for playing ♥</p></div><button class="x"></button>`;
    d.querySelector('.x').textContent = closeLabel;
    let done = false;
    const close = () => { if(done) return; done = true; d.remove(); onEnd?.(); };
    d.querySelector('.x').onclick = close;
    d.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });
    d.querySelector('.roll').addEventListener('animationend', () => setTimeout(close, 800));
    document.body.appendChild(d); d.querySelector('.x').focus();
  };
})();
