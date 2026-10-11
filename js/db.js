/* =====================================================
   EyeCon — Supabase link (window.EC_DB)
   - Signs each player in anonymously (one id per browser).
   - On start: restores the saved game from `profiles`, or uploads an
     existing local save the first time.
   - While playing: mirrors every local save to the database (debounced),
     and logs each client reply to `submissions` / `level_progress`.
   The game always keeps working from localStorage; if Supabase is
   unreachable it plays offline and syncs again next time.
===================================================== */
(function(){
  const PROFILE_KEY = 'eyecon_profile_v1', MAIL_KEY = 'eyecon_mail_state';
  const cfg = window.EC_SUPABASE || {};
  const api = { ready: Promise.resolve(), online: false, userId: null, error: null, isGuest: true, email: null,
    queueSave(){}, logSubmission(){}, track(){}, signInWithGoogle(){ return Promise.reject(new Error('offline')); } };
  window.EC_DB = api;
  if(window.EC_NO_DB || !window.supabase || !cfg.url || !cfg.publishableKey){ api.error = 'not configured'; return; } // tests set EC_NO_DB

  const sb = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth:{ persistSession:true, autoRefreshToken:true } });
  api.client = sb;

  const readJSON = k => { try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(_){ return null; } };
  const writeJSON = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timed out')), ms))]);

  // What goes into profiles.state: the whole save plus mail arrival state.
  const snapshot = profile => Object.assign({}, profile, { __mail: readJSON(MAIL_KEY) });
  const rowFor = profile => ({
    id: api.userId,
    display_name: (profile.displayName || '').trim().slice(0, 24) || null,
    currency: Math.round(profile.currency || 0),
    total_xp: Math.round(profile.totalXp || 0),
    state: snapshot(profile),
  });

  async function start(){
    let { data:{ session } } = await sb.auth.getSession();
    if(!session){
      const { data, error } = await sb.auth.signInAnonymously();
      if(error) throw error;
      session = data.session;
    }
    api.userId = session.user.id;
    api.isGuest = !!session.user.is_anonymous;
    api.email = session.user.email || null;
    api.fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';

    const { data:row, error } = await sb.from('profiles').select('state, updated_at').eq('id', api.userId).maybeSingle();
    if(error) throw error;
    const local = readJSON(PROFILE_KEY);
    const remoteNewer = row && row.state && Object.keys(row.state).length &&
      (!local || !local.savedAt || new Date(row.updated_at) >= new Date(local.savedAt) - 2000);
    if(remoteNewer){
      // Restore: the database copy wins (e.g. browser data was cleared).
      const { __mail, ...profile } = row.state;
      writeJSON(PROFILE_KEY, profile);
      if(__mail) writeJSON(MAIL_KEY, __mail);
    }else if(local){
      // First sign-in with an existing local save (or offline progress): upload it.
      const { error:upErr } = await sb.from('profiles').upsert(rowFor(local));
      if(upErr) throw upErr;
    }else if(!row){
      const { error:insErr } = await sb.from('profiles').insert({ id: api.userId });
      if(insErr) throw insErr;
    }
    api.online = true;
    // Admin-edited game text (published values only).
    const { data:texts } = await sb.from('content_text').select('key, value');
    if(texts) window.EC_TEXT?.load(texts);
  }

  // Debounced write-through of the full save.
  let saveTimer = null, pending = null;
  api.queueSave = profile => {
    if(!api.online) return;
    pending = profile;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 1200);
  };
  async function flush(){
    if(!pending) return;
    const p = pending; pending = null;
    const { error } = await sb.from('profiles').upsert(rowFor(p));
    if(error) console.warn('EyeCon: cloud save failed, will retry on next save.', error.message);
  }
  addEventListener('pagehide', () => { if(pending) flush(); });

  // One row per client reply; best stars + designs kept per level.
  api.logSubmission = async ({ level, result, approved, reward, xp, reply, quote, elements }) => {
    if(!api.online) return;
    const stars = result.stars || 0;
    const { error } = await sb.from('submissions').insert({
      player_id: api.userId, level_id: level.id, stars, score: result.score ?? null, approved,
      reward: reward || 0, xp: xp || 0, reply: reply || null, quote: quote || null, elements: elements || null,
    });
    if(error){ console.warn('EyeCon: could not log submission.', error.message); return; }
    const { data:prev } = await sb.from('level_progress').select('best_stars, completed_at').eq('player_id', api.userId).eq('level_id', level.id).maybeSingle();
    await sb.from('level_progress').upsert({
      player_id: api.userId, level_id: level.id,
      best_stars: Math.max(stars, prev?.best_stars || 0),
      completed_at: prev?.completed_at || (approved ? new Date().toISOString() : null),
      design: approved ? elements : undefined,
      draft: elements,
    });
  };

  // Google: a guest links Google to the SAME account (progress kept, now usable on
  // any device). If that Google account already has an EyeCon save, sign into it.
  api.signInWithGoogle = async () => {
    const redirectTo = location.origin + location.pathname;
    if(api.isGuest && api.userId){
      const { error } = await sb.auth.linkIdentity({ provider:'google', options:{ redirectTo } });
      if(!error) return;
      // Already linked elsewhere, or linking switched off in Supabase: plain Google sign-in instead.
      if(!/already|exists|linked|linking/i.test(error.message)) throw error;
      console.warn('EyeCon: could not link Google to this guest:', error.message);
    }
    const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo } });
    if(error) throw error;
  };

  // Settings > Reset all: blank this player's cloud save so it isn't restored.
  api.resetCloudSave = async () => {
    if(!api.online) return;
    clearTimeout(saveTimer); pending = null;
    const { error } = await sb.from('profiles').update({ state: {}, display_name: null, currency: 0, total_xp: 0 }).eq('id', api.userId);
    if(error) console.warn('EyeCon: could not reset cloud save.', error.message);
    await sb.from('level_progress').delete().eq('player_id', api.userId);
  };

  // ── Thesis analytics: one row per moment in play_events (fire-and-forget). ──
  api.track = (type, fields = {}) => {
    if(!api.online) return;
    sb.from('play_events').insert(Object.assign({ player_id: api.userId, session_id: fields.session_id || 'none', type }, fields))
      .then(({ error }) => { if(error) console.warn('EyeCon: event not saved.', error.message); });
  };

  api.ready = withTimeout(start(), 8000).catch(err => {
    api.error = err.message || String(err);
    console.warn('EyeCon: playing offline.', api.error);
  });
})();

// Active-time clock for analytics: counts time the tab is visible and the
// player has touched mouse/keys within the last 60s.
(function(){
  const IDLE_MS = 60000;
  let total = 0, last = Date.now(), lastInput = Date.now();
  const tick = () => {
    const now = Date.now();
    if(!document.hidden && now - lastInput < IDLE_MS) total += now - last;
    last = now;
  };
  ['pointerdown','pointermove','keydown','wheel'].forEach(e => addEventListener(e, () => { tick(); lastInput = Date.now(); }, { passive:true, capture:true }));
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 5000);
  window.EC_ACTIVE = { now(){ tick(); return total; } };
})();
