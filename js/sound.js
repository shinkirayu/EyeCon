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
      musicBus.connect(c.destination);
    }
    musicBus.gain.setTargetAtTime(musicEnabled ? musicVolume * 0.18 : 0.0001, c.currentTime, 0.08);
    return musicBus;
  }

  // Original 78 BPM neo-soul groove: extended electric-piano voicings,
  // syncopated bass, soft backbeat and swung eighths. Audio-clock scheduling
  // keeps the groove steady when rendering frames takes longer on a phone.
  const MUSIC = [[130.81,155.56,196,233.08,293.66],
    [103.83,155.56,196,233.08,261.63],
    [138.59,174.61,207.65,261.63,311.13],
    [98,146.83,174.61,220,277.18]];
  const EIGHTH = 60 / 78 / 2;
  let nextBeat = 0;
  function musicNote(freq, time, duration, level=0.3, type='sine'){
    const c = getCtx(), bus = getMusicBus();
    if(!c || !bus || !musicEnabled) return;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.012);
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
      o.frequency.setValueAtTime(125,time);
      o.frequency.exponentialRampToValueAtTime(43,time+.13);
      g.gain.setValueAtTime(.85,time);
      g.gain.exponentialRampToValueAtTime(.0001,time+.25);
      o.connect(g); o.start(time); o.stop(time+.27);
      o.onended = ()=>{o.disconnect(); g.disconnect();};
    } else {
      const duration = kind === 'snare' ? .13 : .045;
      const buffer = c.createBuffer(1, Math.ceil(c.sampleRate*duration),c.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
      const source = c.createBufferSource(), filter = c.createBiquadFilter();
      source.buffer=buffer; filter.type='highpass';
      filter.frequency.value=kind === 'snare' ? 1400 : 6500;
      g.gain.setValueAtTime(kind === 'snare' ? .28 : .09,time);
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
      const chord = MUSIC[Math.floor(musicStep / 8) % MUSIC.length];
      const t = nextBeat + (step % 2 ? EIGHTH*.16 : 0);
      if(step === 0 || step === 5){
        chord.forEach((f,i)=>{
          musicNote(f,t+i*.009,1.65,.23);
          musicNote(f*2,t+i*.009,.55,.045,'triangle');
        });
      }
      if([0,3,6].includes(step)) musicNote(chord[0]/2,t,.48,.6);
      if(step === 0 || step === 3 || step === 6) drum(t,'kick');
      if(step === 2 || step === 6) drum(t,'snare');
      drum(t,'hat');
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

  const SOUNDS = {
    typing: () => { tone(460+Math.random()*140,{duration:.025,type:'triangle',gain:.045}); noiseBurst({duration:.015,gain:.03,filterFreq:2400}); },
    click: () => { tone(740,{duration:.045,type:'sine',gain:.13,glideTo:430}); noiseBurst({duration:.025,gain:.045,filterFreq:1800}); },
    menuOpen: () => { [261.63,329.63,392,493.88].forEach((f,i)=>tone(f,{duration:.3,gain:.09,delay:i*.045})); },
    menuBack: () => { tone(440,{duration:.09,gain:.12}); tone(329.63,{duration:.16,gain:.1,delay:.07}); },
    toggle: () => tone(640, { duration:0.07, type:'square', gain:0.12 }),
    tabSwitch: () => tone(440, { duration:0.08, type:'sine', gain:0.15, glideTo:560 }),
    equip: () => { tone(700, {duration:0.07,type:'triangle',gain:0.16}); tone(920,{duration:0.09,type:'triangle',gain:0.14,delay:0.05}); },
    error: () => { tone(220, {duration:0.14,type:'sawtooth',gain:0.16}); tone(160,{duration:0.16,type:'sawtooth',gain:0.14,delay:0.06}); },
    coin: () => { tone(880,{duration:0.06,type:'square',gain:0.14}); tone(1180,{duration:0.09,type:'square',gain:0.12,delay:0.05}); },
    newMail: () => { tone(988,{duration:0.08,type:'sine',gain:0.18}); tone(1318,{duration:0.18,type:'triangle',gain:0.16,delay:0.1}); },
    pullCharge: () => {
      noiseBurst({ duration:0.5, gain:0.06, filterFreq:600 });
      tone(140, { duration:0.55, type:'sawtooth', gain:0.1, glideTo:340 });
    },
    revealCommon: () => tone(523, { duration:0.22, type:'sine', gain:0.2, glideTo:659 }),
    revealRare: () => { tone(587,{duration:0.16,type:'sine',gain:0.2}); tone(784,{duration:0.28,type:'sine',gain:0.2,delay:0.09}); },
    revealEpic: () => {
      tone(523,{duration:0.14,type:'triangle',gain:0.18});
      tone(659,{duration:0.14,type:'triangle',gain:0.18,delay:0.08});
      tone(880,{duration:0.32,type:'triangle',gain:0.22,delay:0.16});
    },
    revealLegendary: () => {
      [523,659,784,1047].forEach((f,i)=> tone(f, { duration:0.18, type:'triangle', gain:0.22, delay:i*0.08 }));
      tone(1568, { duration:0.5, type:'sine', gain:0.18, delay:0.34 });
      noiseBurst({ duration:0.3, gain:0.05, delay:0.32, filterFreq:3000 });
    },
    pity: () => { tone(660,{duration:0.1,type:'square',gain:0.14}); tone(880,{duration:0.14,type:'square',gain:0.14,delay:0.07}); },
  };

  function play(name){
    const fn = SOUNDS[name];
    if(fn) fn();
  }

  window.EC_SOUND = { play, setEnabled, setVolume, setMusicEnabled, setMusicVolume, unlock };

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
