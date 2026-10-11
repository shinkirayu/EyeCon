/* =====================================================
   EyeCon — editable game text (window.EC_TEXT)
   Every player-facing string is registered here with a key and its
   built-in default. Admins publish replacements in Supabase
   (`content_text`); the game loads them on start and swaps them in.
   Placeholders like {name} or {client} are filled in at use time.
===================================================== */
(function(){
  const defaults = {};   // key -> { value, area, note }
  const published = {};  // key -> value from Supabase
  const bindings = [];   // { key, apply(value) } for text living inside game objects

  const fill = (text, vars) => vars ? String(text).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m) : text;

  const api = {
    defaults, published,
    register(key, value, area, note = ''){
      if(!(key in defaults)) defaults[key] = { value, area, note };
      return api.t(key);
    },
    // Current text for a key (published edit, else the default), with {placeholders} filled.
    t(key, vars){
      const v = key in published ? published[key] : defaults[key]?.value;
      return fill(v ?? key, vars);
    },
    // Text stored inside a game object (e.g. Piko's SCRIPT): registers each string leaf
    // and rewrites it in place whenever published text arrives.
    bindObject(prefix, obj, area, note){
      const walk = (o, path) => Object.keys(o).forEach(k => {
        const key = path ? `${path}.${k}` : `${prefix}.${k}`;
        if(typeof o[k] === 'string' && !/^[#.][\w-]/.test(o[k])){ // skip CSS selectors (Piko's pointing targets)
          api.register(key, o[k], area, note);
          // (lines later wrapped in a function to fill {placeholders} read through t() instead)
          bindings.push({ key, apply: v => { if(typeof o[k] !== 'function') o[k] = v; } });
          if(key in published) o[k] = published[key];
        }else if(o[k] && typeof o[k] === 'object') walk(o[k], key);
      });
      walk(obj, '');
    },
    bind(key, value, area, note, apply){
      api.register(key, value, area, note);
      bindings.push({ key, apply });
      if(key in published) apply(published[key]);
    },
    // Called once Supabase answers (see db.js).
    load(rows){
      rows.forEach(r => { published[r.key] = r.value; });
      bindings.forEach(b => { if(b.key in published) b.apply(published[b.key]); });
    },
  };
  window.EC_TEXT = api;
})();
