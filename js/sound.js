/* =====================================================
   EyeCon — Synthesized UI sound effects (Web Audio API)
   No audio asset files are used — every effect is a tiny
   procedural blip so the game stays a zero-dependency,
   open-index.html project. Exposes window.EC_SOUND.
===================================================== */
(function(){

  let ctx = null;
  let enabled = true;
  let volume = 0.6;
  let musicEnabled = true;
  let musicVolume = 0.28;
  let musicTimer = null;
  let musicStep = 0;
  let musicBus = null;

  function getCtx(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    ctx = new AC();
    return ctx;
  }

  // Unlocks/resumes the AudioContext — browsers require a user gesture,
  // so this is called on the first pointerdown anywhere in the app.
  function unlock(){
    const c = getCtx();
    if(!c) return;
    loadKeyPack();
    if(c.state === 'suspended') c.resume().then(startMusic);
    else startMusic();
  }

  function setEnabled(v){ enabled = !!v; }
  function setVolume(v){ volume = Math.max(0, Math.min(1, v)); }

  function getMusicBus(){
    const c = getCtx();
    if(!c) return null;
    if(!musicBus){
      musicBus = c.createGain();
      musicBus.gain.value = 0.0001;
      // Low-pass keeps the loop warm and tucked behind the UI, lo-fi style.
      const warm = c.createBiquadFilter();
      warm.type = 'lowpass'; warm.frequency.value = 2200; warm.Q.value = 0.4;
      musicBus.connect(warm); warm.connect(c.destination);
    }
    musicBus.gain.setTargetAtTime(musicEnabled ? musicVolume * 0.18 : 0.0001, c.currentTime, 0.08);
    return musicBus;
  }

  // Cozy 70 BPM lo-fi loop for a pastel design studio: soft Rhodes-like
  // pads, a round bass, a kalimba melody, and brushed percussion (no hard
  // snare). Audio-clock scheduling keeps it steady on slow phones.
  // Progression: Fmaj7 – Em7 – Dm7 – Cmaj7 (voiced low, gentle).
  const MUSIC = [[174.61,220,261.63,329.63],
    [164.81,196,246.94,293.66],
    [146.83,174.61,220,261.63],
    [130.81,164.81,196,246.94]];
  // Kalimba line, one note (or 0 = rest) per eighth, 8 per chord.
  const MELODY = [[659.25,0,523.25,0,587.33,523.25,0,0],
    [587.33,0,493.88,0,0,392,440,0],
    [523.25,0,440,0,523.25,0,587.33,0],
    [493.88,0,392,0,329.63,0,0,0]];
  const EIGHTH = 60 / 70 / 2;
  let nextBeat = 0;
  function musicNote(freq, time, duration, level=0.3, type='sine', attack=0.012){
    const c = getCtx(), bus = getMusicBus();
    if(!c || !bus || !musicEnabled) return;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain); gain.connect(bus);
    osc.start(time); osc.stop(time + duration + 0.03);
    osc.onended = ()=>{ osc.disconnect(); gain.disconnect(); };
  }
  function drum(time, kind){
    const c = getCtx(), bus = getMusicBus();
    const g = c.createGain();
    g.connect(bus);
    if(kind === 'kick'){
      const o = c.createOscillator();
      o.frequency.setValueAtTime(90,time);
      o.frequency.exponentialRampToValueAtTime(45,time+.12);
      g.gain.setValueAtTime(.5,time);
      g.gain.exponentialRampToValueAtTime(.0001,time+.22);
      o.connect(g); o.start(time); o.stop(time+.24);
      o.onended = ()=>{o.disconnect(); g.disconnect();};
    } else {
      // 'brush' = soft band-passed swish on the backbeat, 'hat' = tiny tick.
      const duration = kind === 'brush' ? .18 : .03;
      const buffer = c.createBuffer(1, Math.ceil(c.sampleRate*duration),c.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
      const source = c.createBufferSource(), filter = c.createBiquadFilter();
      source.buffer=buffer; filter.type='bandpass';
      filter.frequency.value=kind === 'brush' ? 2600 : 7000; filter.Q.value=.7;
      g.gain.setValueAtTime(kind === 'brush' ? .12 : .035,time);
      g.gain.exponentialRampToValueAtTime(.0001,time+duration);
      source.connect(filter); filter.connect(g); source.start(time);
      source.onended=()=>{ source.disconnect(); filter.disconnect(); g.disconnect(); };
    }
  }
  function musicTick(){
    if(!musicEnabled || !ctx || ctx.state !== 'running' || document.hidden) return;
    if(nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + .03;
    while(nextBeat < ctx.currentTime + .15){
      const step = musicStep % 8;
      const bar = Math.floor(musicStep / 8) % MUSIC.length;
      const chord = MUSIC[bar];
      const t = nextBeat + (step % 2 ? EIGHTH*.18 : 0); // lazy swing
      if(step === 0){
        // Soft pad: slow attack so chords bloom instead of stab.
        chord.forEach((f,i)=>{ musicNote(f,t+i*.02,EIGHTH*8,.13,'sine',.18); musicNote(f*2,t+i*.02,EIGHTH*3,.025,'triangle',.05); });
      }
      if(step === 0 || step === 5) musicNote(chord[0]/2,t,EIGHTH*2.5,.32,'sine',.02);
      const m = MELODY[bar][step];
      if(m){ musicNote(m,t,.7,.07,'sine',.004); musicNote(m*3,t,.12,.012,'sine',.002); }
      if(step === 0 || step === 5) drum(t,'kick');
      if(step === 4) drum(t,'brush');
      if(step % 2 === 0) drum(t,'hat');
      musicStep = (musicStep+1)%32;
      nextBeat += EIGHTH;
    }
  }
  function startMusic(){
    const c = getCtx();
    if(!musicEnabled || !c || c.state !== 'running' || musicTimer || document.hidden) return;
    getMusicBus(); nextBeat = c.currentTime + .04;
    musicTick(); musicTimer = window.setInterval(musicTick, 25);
  }
  function stopMusic(){
    if(musicTimer){ window.clearInterval(musicTimer); musicTimer = null; }
    if(musicBus && ctx){
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
    }
  }
  function setMusicEnabled(v){
    musicEnabled = !!v;
    if(!musicEnabled) stopMusic();
    else startMusic();
  }
  function setMusicVolume(v){
    musicVolume = Math.max(0, Math.min(1, v));
    getMusicBus();
  }

  function tone(freq, { duration=0.12, type='sine', gain=0.22, delay=0, glideTo=null, attack=0.008 } = {}){
    if(!enabled) return;
    const c = getCtx();
    if(!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * volume, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst({ duration=0.08, gain=0.12, delay=0, filterFreq=2200 } = {}){
    if(!enabled) return;
    const c = getCtx();
    if(!c) return;
    const t0 = c.currentTime + delay;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filt = c.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * volume, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start(t0);
  }

  // Kalimba/marimba-style pluck: a sine with a quick bright overtone.
  function pluck(freq, delay=0, gain=0.14, duration=0.35){
    tone(freq, { duration, type:'sine', gain, delay, attack:0.004 });
    tone(freq*3, { duration:duration*0.25, type:'sine', gain:gain*0.18, delay, attack:0.002 });
  }

  // Soft, rounded effects to match the pastel look — no square/sawtooth buzz.
  // Keyboard sound packs. "classic" is the built-in synthesized click; the
  // others are optional local files in assets/sounds/keyboard (kept out of
  // git). If a pack's files are missing, typing falls back to classic.
  const KEY_BASE = 'assets/sounds/keyboard/';
  const KEY_PACKS = {
    creamy:{ name:'Creamy', letters:['creamy/letter_1.wav','creamy/letter_2.wav','creamy/letter_3.wav'],
      Backspace:'creamy/backspace.wav', Enter:'creamy/enter.wav', ' ':'creamy/space.wav' },
    creams:{ name:'Creams', letters:['Creams.ogg'] },
    classic:{ name:'Classic' },
  };
  const KEY_PACK_PREF = 'eyecon_key_pack';
  const keyBuffers = {};   // file -> AudioBuffer | 'loading' | 'missing'
  let keyPackId = (()=>{ try{ return localStorage.getItem(KEY_PACK_PREF) || 'creamy'; }catch(e){ return 'creamy'; } })();
  function packFiles(pack){ return [...(pack.letters||[]), pack.Backspace, pack.Enter, pack[' ']].filter(Boolean); }
  function loadKeyPack(){
    const c = getCtx(), pack = KEY_PACKS[keyPackId];
    if(!c || !pack) return;
    packFiles(pack).forEach(file=>{
      if(keyBuffers[file]) return;
      keyBuffers[file] = 'loading';
      fetch(KEY_BASE + file).then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(buf => c.decodeAudioData(buf)).then(b => { keyBuffers[file] = b; })
        .catch(() => { keyBuffers[file] = 'missing'; });
    });
  }
  function setKeyPack(id){
    if(!KEY_PACKS[id]) return;
    keyPackId = id;
    try{ localStorage.setItem(KEY_PACK_PREF, id); }catch(e){}
    loadKeyPack();
  }
  const KEY_VOLUME = 0.8;
  let lastLetter = -1;
  // Plays the pack's sound for this key (letters rotate, never the same twice in a row).
  function playKeySample(key){
    const pack = KEY_PACKS[keyPackId];
    if(!enabled || !pack || !pack.letters) return false;
    let file = pack[key];
    if(!file){
      let n = 0;
      if(pack.letters.length > 1){ do{ n = Math.floor(Math.random() * pack.letters.length); }while(n === lastLetter); }
      lastLetter = n; file = pack.letters[n];
    }
    const buffer = keyBuffers[file];
    if(!buffer || typeof buffer === 'string') return false;
    const c = getCtx(), src = c.createBufferSource(), g = c.createGain();
    src.buffer = buffer;
    g.gain.value = volume * KEY_VOLUME;
    src.connect(g); g.connect(c.destination);
    src.start();
    src.onended = () => { src.disconnect(); g.disconnect(); };
    return true;
  }
  let pendingKey = 'a';

  const SOUNDS = {
    typing: () => { if(playKeySample(pendingKey)) return; noiseBurst({duration:.018,gain:.05,filterFreq:3200}); tone(1800+Math.random()*400,{duration:.012,gain:.02,attack:.001}); },
    click: () => { tone(620,{duration:.06,gain:.14,glideTo:520,attack:.002}); noiseBurst({duration:.012,gain:.03,filterFreq:3000}); },
    menuOpen: () => { [523.25,659.25,783.99].forEach((f,i)=>pluck(f,i*.06,.1,.4)); },
    menuBack: () => { pluck(659.25,0,.1,.25); pluck(523.25,.07,.09,.3); },
    toggle: () => { tone(880,{duration:.05,gain:.1,glideTo:1100,attack:.002}); },
    tabSwitch: () => { tone(520,{duration:.09,gain:.12,glideTo:700,attack:.004}); },
    equip: () => { pluck(783.99,0,.12,.25); pluck(1046.5,.07,.11,.35); },
    error: () => { tone(330,{duration:.12,gain:.14,glideTo:300}); tone(262,{duration:.2,gain:.12,delay:.1,glideTo:240}); },
    coin: () => { pluck(1318.5,0,.12,.2); pluck(1760,.06,.12,.45); },
    newMail: () => { pluck(1046.5,0,.14,.35); pluck(1318.5,.12,.14,.55); },
    pullCharge: () => {
      noiseBurst({ duration:0.6, gain:0.04, filterFreq:900 });
      tone(220, { duration:0.6, gain:0.1, glideTo:660, attack:0.1 });
    },
    revealCommon: () => { pluck(659.25,0,.14,.4); },
    revealRare: () => { pluck(659.25,0,.14,.3); pluck(987.77,.1,.14,.5); },
    revealEpic: () => { [659.25,783.99,987.77].forEach((f,i)=>pluck(f,i*.09,.15,.45)); },
    revealLegendary: () => {
      [523.25,659.25,783.99,1046.5].forEach((f,i)=>pluck(f,i*.08,.16,.4));
      pluck(1567.98, .36, .14, .9);
      noiseBurst({ duration:0.4, gain:0.03, delay:0.34, filterFreq:5000 });
    },
    pity: () => { pluck(880,0,.12,.2); pluck(1174.66,.08,.12,.35); },
  };

  function play(name){
    const fn = SOUNDS[name];
    if(fn) fn();
  }

  // Plays the typing sound for a specific key ('Backspace', 'Enter', ' ' or any letter).
  function typeKey(key){ pendingKey = key || 'a'; play('typing'); pendingKey = 'a'; }
  window.EC_SOUND = { typeKey, setKeyPack, getKeyPack: () => keyPackId, KEY_PACKS, play, setEnabled, setVolume, setMusicEnabled, setMusicVolume, unlock };

  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', e=>{ if(e.key === 'Enter' || e.key === ' ') unlock(); });
  // Delegate activation, so touch, mouse and keyboard share the same sounds.
  // Run after control handlers; their more specific effects win over clicks.
  let lastEffect = -Infinity;
  const originalPlay = window.EC_SOUND.play;
  window.EC_SOUND.play = name=>{ lastEffect = performance.now(); originalPlay(name); };
  document.addEventListener('keydown', e=>{
    if(e.repeat || !['Enter',' '].includes(e.key)) return;
    const control = e.target.closest('[role="button"]:not(button)');
    if(control && control.getAttribute('aria-disabled') !== 'true' && performance.now()-lastEffect >= 60){
      window.EC_SOUND.play(control.id === 'mini-desktop' ? 'menuOpen' : 'click');
    }
  });
  document.addEventListener('click', e=>{
    const control = e.target.closest('button,[role="button"],.mail-item,.mini-desktop-icon');
    if(!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    if(performance.now()-lastEffect < 60) return;
    const name = control.matches('#mini-desktop,.desktop-icon,.mini-desktop-icon') ? 'menuOpen'
      : control.matches('.app-back-btn,#desktop-watermark-btn') ? 'menuBack' : 'click';
    window.EC_SOUND.play(name);
  });
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) stopMusic(); else if(ctx) unlock();
  });
})();

// Typing in any text field clicks too (the reply composer plays its own).
document.addEventListener('keydown', e=>{
  if(e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if(!t.closest || !t.closest('input:not([type=range]):not([type=checkbox]), textarea, [contenteditable="true"]') || t.closest('#compose-body')) return;
  if(e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') window.EC_SOUND.typeKey(e.key);
});
