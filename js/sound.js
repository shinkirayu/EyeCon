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
    if(c && c.state === 'suspended') c.resume();
  }

  function setEnabled(v){ enabled = !!v; }
  function setVolume(v){ volume = Math.max(0, Math.min(1, v)); }

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
    click: () => tone(520, { duration:0.06, type:'triangle', gain:0.16 }),
    toggle: () => tone(640, { duration:0.07, type:'square', gain:0.12 }),
    tabSwitch: () => tone(440, { duration:0.08, type:'sine', gain:0.15, glideTo:560 }),
    equip: () => { tone(700, {duration:0.07,type:'triangle',gain:0.16}); tone(920,{duration:0.09,type:'triangle',gain:0.14,delay:0.05}); },
    error: () => { tone(220, {duration:0.14,type:'sawtooth',gain:0.16}); tone(160,{duration:0.16,type:'sawtooth',gain:0.14,delay:0.06}); },
    coin: () => { tone(880,{duration:0.06,type:'square',gain:0.14}); tone(1180,{duration:0.09,type:'square',gain:0.12,delay:0.05}); },
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

  window.EC_SOUND = { play, setEnabled, setVolume, unlock };

  document.addEventListener('pointerdown', unlock, { once:true });
})();
