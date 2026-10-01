/* A free-form 8 px level maker, separate from graded commissions. */
(function(){
  const KEY = 'eyecon.level-maker.v1';
  const PRESETS = {
    website:{w:960,h:640},poster:{w:512,h:720},slide:{w:1280,h:720},
    square:{w:1080,h:1080},story:{w:1080,h:1920},mobile:{w:384,h:832},
    banner:{w:1200,h:400}
  };
  const snap = n => Math.round(n/8)*8;
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {title:'My design',preset:'website',canvas:{w:960,h:640,bg:'#fffaf3'},elements:[],targets:[],selected:null,selectedTarget:null};
  let scale = 1, zoom = 1, panX = 0, panY = 0, drag = null, layerDrag = null, stagePan = null, peeking = false, spacePan = false;
  const RAIL_KEY='eyecon.maker-rails.v1';
  let rails={left:22,right:20};
  try{Object.assign(rails,JSON.parse(localStorage.getItem(RAIL_KEY)||'{}'));}catch(_){}
  let history = [], future = [];
  const $ = id => document.getElementById(id);
  const icon = name => {
    const paths={
      eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
      hidden:'<path d="M3 3l18 18M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3.1 3.6M6.1 6.1C3.4 8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      unlock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.8-1.2"/>',
      delete:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  };
  const selected = () => state.elements.find(el=>el.id===state.selected);
  const selectedTarget = () => state.targets.find(target=>target.id===state.selectedTarget);
  const snapshot = () => JSON.stringify({gameLevel:state.gameLevel,title:state.title,preset:state.preset,canvas:state.canvas,elements:state.elements,targets:state.targets,selected:state.selected,selectedTarget:state.selectedTarget});
  function record(){
    const next=snapshot();if(history.at(-1)===next)return;
    history.push(next);if(history.length>60)history.shift();future=[];updateToolbar();
  }
  function restore(data){Object.assign(state,JSON.parse(data));render();}
  function undo(){if(history.length<2)return;future.push(history.pop());restore(history.at(-1));updateToolbar();}
  function redo(){if(!future.length)return;const next=future.pop();history.push(next);restore(next);updateToolbar();}
  function updateToolbar(){
    $('maker-undo').disabled=history.length<2;$('maker-redo').disabled=!future.length;
    $('maker-zoom-label').textContent=Math.round(zoom*100)+'%';
    $('maker-zoom-out').disabled=zoom<=.25;$('maker-zoom-in').disabled=zoom>=4;
  }
  const persist = () => { try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){/* Large images can exceed storage; export still works. */} };
  const nextId = () => 'element-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
  function normalize(el){
    el.w = Math.max(8,Math.min(snap(Number(el.w)||8),state.canvas.w));
    el.h = Math.max(8,Math.min(snap(Number(el.h)||8),state.canvas.h));
    el.x = Math.max(0,Math.min(snap(Number(el.x)||0),state.canvas.w-el.w));
    el.y = Math.max(0,Math.min(snap(Number(el.y)||0),state.canvas.h-el.h));
    el.radius = Math.max(0,snap(Number(el.radius)||0));
    el.fontSize = Math.max(8,Math.round(Number(el.fontSize)||16));
  }
  function normalizeTarget(target){
    target.x=Math.max(0,Math.min(snap(Number(target.x)||0),state.canvas.w-8));
    target.y=Math.max(0,Math.min(snap(Number(target.y)||0),state.canvas.h-8));
    target.w=Math.max(8,Math.min(snap(Number(target.w)||8),state.canvas.w-target.x));
    target.h=Math.max(8,Math.min(snap(Number(target.h)||8),state.canvas.h-target.y));
  }
  function validSize(value){return Math.max(64,Math.min(4096,snap(Number(value)||64)));}
  function resizeCanvas(w,h){
    state.canvas.w=validSize(w);state.canvas.h=validSize(h);
    state.elements.forEach(normalize);state.targets.forEach(normalizeTarget);
    render();record();
  }
  function load(){
    try{
      const draft=JSON.parse(localStorage.getItem(KEY)||'null');
      if(draft && Array.isArray(draft.elements) && draft.canvas){
        state.title=String(draft.title||'My design');
        state.gameLevel=draft.gameLevel||null;
        state.preset=(PRESETS[draft.preset]||draft.preset==='custom')?draft.preset:'website';
        state.canvas={w:validSize(draft.canvas.w),h:validSize(draft.canvas.h),bg:draft.canvas.bg||'#fffaf3'};
        state.elements=draft.elements.filter(el=>el&&typeof el.id==='string').map(el=>({...el}));
        state.elements.forEach(normalize);
        const savedTargets=Array.isArray(draft.targets)?draft.targets:draft.hiddenTargets;
        state.targets=Array.isArray(savedTargets)?savedTargets.filter(t=>t&&typeof t.id==='string').map(t=>({...t})):[];
        state.targets.forEach(normalizeTarget);
      }
    }catch(_){/* Start with a blank draft. */}
  }
  function fit(){
    const stage=$('maker-stage'), canvas=$('maker-canvas');
    if(!stage || !canvas) return;
    const base=Math.min(1,(stage.clientWidth-64)/state.canvas.w,(stage.clientHeight-112)/state.canvas.h);
    scale=Math.max(.05,base*zoom);
    canvas.style.width=state.canvas.w+'px';
    canvas.style.height=state.canvas.h+'px';
    canvas.style.transform=`translate(calc(-50% + ${panX}px),calc(-50% + ${panY}px)) scale(${scale})`;
    canvas.style.backgroundColor=state.canvas.bg;
    canvas.style.setProperty('--maker-handle-zoom',String(Math.max(1,1/scale)));
    updateToolbar();
  }
  function setZoom(value){zoom=Math.max(.25,Math.min(4,Math.round(value*4)/4));fit();}
  // Styling that game levels carry (see levels.js); plain maker designs skip it.
  function gameStyle(node,el){
    if(el.src && el.type!=='image'){
      node.style.backgroundImage=`url("${el.src}")`;
      node.style.backgroundSize=el.bgSize||'100% 100%';
      node.style.backgroundPosition=el.bgPos||'center';
      node.style.backgroundRepeat='no-repeat';
    }
    if(el.fontFamily) node.style.fontFamily=`'${el.fontFamily}', sans-serif`;
    if(el.fontWeight) node.style.fontWeight=el.fontWeight;
    if(el.border&&el.border.width) node.style.border=`${el.border.width}px ${el.border.style} ${el.border.color}`;
    if(el.align){ node.style.textAlign=el.align; node.style.justifyContent={left:'flex-start',right:'flex-end'}[el.align]||'center'; }
    if(el.opacity!=null) node.style.opacity=el.opacity;
  }
  function renderCanvas(){
    const canvas=$('maker-canvas');
    canvas.innerHTML='';
    canvas.classList.toggle('peek-targets',peeking);
    state.elements.filter(el=>!el.hidden).forEach(el=>{
      const node=document.createElement('div');
      node.className='maker-element'+(el.id===state.selected?' selected':'')+(el.locked?' locked':'');
      node.dataset.id=el.id;
      node.style.cssText=`left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z||1};border-radius:${el.shape==='circle'?'50%':(el.radius||0)+'px'};background:${el.bg||'transparent'};color:${el.color||'#3b172e'};font-size:${el.fontSize||16}px;${el.shape==='triangle'?'clip-path:polygon(50% 0,100% 100%,0 100%);':''}`;
      gameStyle(node,el);
      if(el.type==='image' && el.src){
        const img=document.createElement('img'); img.src=el.src; img.alt=el.text||''; node.appendChild(img);
      } else node.textContent=el.text||'';
      canvas.appendChild(node);
    });
    state.targets.forEach(target=>{
      if(!peeking && target.id!==state.selectedTarget)return;
      const node=document.createElement('div');
      node.className='maker-target';node.dataset.targetId=target.id;
      node.style.cssText=`left:${target.x}px;top:${target.y}px;width:${target.w}px;height:${target.h}px;`;
      canvas.appendChild(node);
    });
    const item=selectedTarget()||selected();
    if(item&&!item.hidden&&!peeking){
      const box=document.createElement('div');
      box.className=item.locked?'maker-locked-outline':'maker-selection-box';
      box.style.cssText=`left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;`;
      if(!item.locked)for(const dir of ['nw','n','ne','e','se','s','sw','w']){
        const handle=document.createElement('span');
        handle.className='maker-resize-handle '+dir;
        handle.dataset.resize=dir;
        handle.setAttribute('aria-label',`Resize ${dir}`);
        box.appendChild(handle);
      }
      canvas.appendChild(box);
      if(selected()){
        const actions=document.createElement('div');actions.className='maker-selection-actions';
        actions.style.cssText=`left:${item.x+item.w/2}px;top:${item.y}px;`;
        actions.innerHTML=`<button type="button" data-maker-quick="visibility" aria-label="Hide selected element" title="Hide">${icon('eye')}</button><button type="button" data-maker-quick="lock" aria-label="${item.locked?'Unlock':'Lock'} selected element" title="${item.locked?'Unlock':'Lock'}">${icon(item.locked?'lock':'unlock')}</button><button type="button" data-maker-quick="delete" aria-label="Delete selected element" title="Delete" ${item.locked?'disabled':''}>${icon('delete')}</button>`;
        canvas.appendChild(actions);
      }
    }
    fit();
  }
  function syncZ(){state.elements.forEach((el,i)=>el.z=i+1);}
  function renderLayers(){
    const list=$('maker-layers'); list.innerHTML='';
    [...state.elements].reverse().forEach(el=>{
      const row=document.createElement('div');row.className='maker-layer-row'+(el.id===state.selected?' active':'')+(el.hidden?' is-hidden':'');row.dataset.layerId=el.id;
      const button=document.createElement('button');button.type='button';button.className='maker-layer-select';
      button.innerHTML='<span class="maker-layer-grip" aria-hidden="true">☰</span>';
      button.appendChild(document.createTextNode((el.type==='image'?'▧ ':el.type==='rect'?'▢ ':'T ')+(el.text||(el.id.startsWith('element-')?el.type:el.id))));
      button.textContent='';
      const preview=document.createElement('span');preview.className='maker-layer-preview';
      if(el.src){const img=document.createElement('img');img.src=el.src;img.alt='';preview.appendChild(img);}
      else if(el.type==='text'||el.text){preview.textContent=(el.text||'T').slice(0,12);preview.style.color=el.color||'#3b172e';preview.style.background=el.bg||'#fff';}
      else{preview.classList.add('shape');preview.style.background=el.bg||'#bfe9db';preview.style.borderRadius=el.shape==='circle'?'50%':`${el.radius||0}px`;if(el.shape==='triangle')preview.style.clipPath='polygon(50% 0,100% 100%,0 100%)';}
      button.appendChild(preview);
      const label=document.createElement('span');label.className='maker-layer-label';label.textContent=el.text||el.id;button.appendChild(label);
      button.addEventListener('click',e=>{if(e.detail===0)select(el.id);});row.appendChild(button);
      const visibility=document.createElement('button');visibility.type='button';visibility.className='maker-layer-visibility';
      visibility.setAttribute('aria-label',el.hidden?'Show layer':'Hide layer');visibility.title=el.hidden?'Show layer':'Hide layer';visibility.setAttribute('aria-pressed',String(!el.hidden));visibility.innerHTML=icon(el.hidden?'hidden':'eye');
      visibility.addEventListener('pointerdown',e=>e.stopPropagation());
      visibility.addEventListener('click',e=>{e.stopPropagation();el.hidden=!el.hidden;render();record();});row.appendChild(visibility);
      const lock=document.createElement('button');lock.type='button';lock.className='maker-layer-lock';
      lock.setAttribute('aria-label',el.locked?'Unlock layer':'Lock layer');lock.title=el.locked?'Unlock layer':'Lock layer';lock.textContent=el.locked?'🔒':'🔓';
      lock.innerHTML=icon(el.locked?'lock':'unlock');
      lock.addEventListener('pointerdown',e=>e.stopPropagation());
      lock.addEventListener('click',e=>{e.stopPropagation();el.locked=!el.locked;render();record();});row.appendChild(lock);
      if(el.id===state.selected&&!el.locked){
        const remove=document.createElement('button');remove.type='button';remove.className='maker-layer-delete';
        remove.setAttribute('aria-label','Delete selected layer');remove.title='Delete selected layer';remove.textContent='×';
        remove.innerHTML=icon('delete');
        remove.addEventListener('pointerdown',e=>e.stopPropagation());
        remove.addEventListener('click',e=>{e.stopPropagation();deleteSelection();});row.appendChild(remove);
      }
      list.appendChild(row);
    });
    const targets=$('maker-targets-list');targets.innerHTML='';
    state.targets.forEach(target=>{
      const owner=state.elements.find(el=>el.id===target.id);
      const row=document.createElement('div');row.className='maker-layer-row'+(target.id===state.selectedTarget?' active':'');
      const button=document.createElement('button');button.type='button';button.className='maker-layer-select';
      button.textContent='□ '+(owner?.text||owner?.type||target.id);
      button.addEventListener('click',()=>selectTarget(target.id));row.appendChild(button);
      if(target.id===state.selectedTarget){
        const remove=document.createElement('button');remove.type='button';remove.className='maker-layer-delete';
        remove.setAttribute('aria-label','Delete selected target');remove.title='Delete selected target';remove.textContent='×';
        remove.addEventListener('click',e=>{e.stopPropagation();deleteSelection();});row.appendChild(remove);
      }
      targets.appendChild(row);
    });
  }
  function field(label,key,type='text',value=''){
    return `<label>${label}<input data-maker-field="${key}" type="${type}" value="${safe(value)}"${type==='number'?' step="8"':''}/></label>`;
  }
  function renderProperties(){
    const host=$('maker-properties-fields'), el=selected(), target=selectedTarget();
    if(target){
      host.innerHTML=`<p>Target for ${safe(state.elements.find(el=>el.id===target.id)?.text||target.id)}</p><div class="maker-props-grid">
        ${field('X','targetX','number',target.x)}${field('Y','targetY','number',target.y)}
        ${field('Width','targetW','number',target.w)}${field('Height','targetH','number',target.h)}
      </div><div class="maker-props-actions"><button data-maker-action="delete-target">Delete target</button></div>`;
      return;
    }
    if(!el){
      host.innerHTML=field('Canvas color','canvasBg','color',state.canvas.bg)+`<p>${state.canvas.w} × ${state.canvas.h} px · 8 px grid</p>`;
      return;
    }
    host.innerHTML=`<div class="maker-props-grid">
      ${field('X','x','number',el.x)}${field('Y','y','number',el.y)}
      ${field('Width','w','number',el.w)}${field('Height','h','number',el.h)}
      ${el.type==='rect'||el.type==='image'||el.type==='text'?'':field('Text','text','text',el.text||'')}
      ${el.type==='text'?'':field('Fill','bg','color',el.bg||'#ffffff')}
      ${(el.type==='rect'||el.type==='image')&&!el.text?'':field('Text color','color','color',el.color||'#3b172e')}
      ${(el.type==='rect'||el.type==='image')&&!el.text?'':field('Text size','fontSize','number',el.fontSize||16)}
      ${el.type==='rect'&&el.shape!=='circle'&&el.shape!=='triangle'?field('Corner radius','radius','number',el.radius||0):''}
    </div><div class="maker-props-actions">
      <button data-maker-action="back">Send back</button>
      <button data-maker-action="front">Bring front</button>
      <button data-maker-action="duplicate">Duplicate</button>
    </div>`;
  }
  function render(){
    $('maker-title').value=state.title;
    $('maker-preset').value=state.preset;
    $('maker-custom-size').hidden=state.preset!=='custom';
    $('maker-width').value=state.canvas.w;$('maker-height').value=state.canvas.h;
    renderCanvas();renderLayers();renderProperties();persist();updateToolbar();
  }
  function select(id){state.selected=id;state.selectedTarget=null;renderCanvas();renderLayers();renderProperties();updateToolbar();}
  function selectTarget(id){state.selectedTarget=id;state.selected=null;renderCanvas();renderLayers();renderProperties();updateToolbar();}
  function add(type,src){
    const offsets={text:[240,64],button:[160,56],shape:[128,128],image:[240,160]};
    const [w,h]=offsets[type];
    const el={id:nextId(),type:type==='shape'?'rect':type,role:type==='shape'?'card':type==='image'?'decorative':type,
      x:32,y:32,w,h,text:{text:'New text',heading:'Heading',button:'Button'}[type]||'',
      bg:{shape:'#bfe9db',button:'#91d8d0'}[type]||'transparent',color:'#3b172e',fontSize:24,
      radius:0,shape:type==='shape'?$('maker-shape').value:undefined,z:state.elements.length+1,src:src||''};
    normalize(el);state.elements.push(el);state.selected=el.id;state.selectedTarget=null;render();record();
  }
  function deleteSelection(){
    if(selected()?.locked)return;
    if(state.selectedTarget){state.targets=state.targets.filter(t=>t.id!==state.selectedTarget);state.selectedTarget=null;}
    else if(state.selected){
      state.elements=state.elements.filter(el=>el.id!==state.selected);
      state.targets=state.targets.filter(t=>t.id!==state.selected);
      state.selected=null;syncZ();
    }else return;
    render();record();
  }
  function download(name,content,type){
    const url=URL.createObjectURL(new Blob([content],{type}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function filename(ext){return (state.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'eyecon-level')+'.'+ext;}
  function exportLevel(){
    const level={format:'eyecon-level-maker-v1',id:filename('json').slice(0,-5),name:state.title,
      preset:state.preset,canvas:{...state.canvas},elements:state.elements.map(el=>({...el})),
      hiddenTargets:state.targets.map(target=>({...target}))};
    download(filename('json'),JSON.stringify(level,null,2),'application/json');
  }
  function exportHtml(){
    const nodes=state.elements.filter(el=>!el.hidden).map(el=>{
      const style=`position:absolute;box-sizing:border-box;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z||1};border-radius:${el.shape==='circle'?'50%':(el.radius||0)+'px'};background:${el.type==='text'?'transparent':el.bg||'transparent'};color:${el.color||'#3b172e'};font-size:${el.fontSize||16}px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:pre-wrap;text-align:center;${el.shape==='triangle'?'clip-path:polygon(50% 0,100% 100%,0 100%);':''}`;
      const body=el.type==='image'&&el.src?`<img src="${safe(el.src)}" alt="${safe(el.text||'')}" style="width:100%;height:100%;object-fit:cover">`:safe(el.text||'');
      return `<div style="${style}">${body}</div>`;
    }).join('\n');
    download(filename('html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(state.title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eee;font-family:Arial,sans-serif}.canvas{position:relative;width:${state.canvas.w}px;height:${state.canvas.h}px;background:${state.canvas.bg};overflow:hidden;max-width:100vw}</style><main class="canvas">${nodes}</main></html>`,'text/html');
  }
  async function exportPng(){
    const canvas=document.createElement('canvas');canvas.width=state.canvas.w;canvas.height=state.canvas.h;
    const ctx=canvas.getContext('2d');ctx.fillStyle=state.canvas.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
    for(const el of state.elements.filter(el=>!el.hidden).sort((a,b)=>(a.z||0)-(b.z||0))){
      ctx.save();ctx.beginPath();
      if(el.shape==='circle')ctx.ellipse(el.x+el.w/2,el.y+el.h/2,el.w/2,el.h/2,0,0,Math.PI*2);
      else if(el.shape==='triangle'){ctx.moveTo(el.x+el.w/2,el.y);ctx.lineTo(el.x+el.w,el.y+el.h);ctx.lineTo(el.x,el.y+el.h);ctx.closePath();}
      else ctx.roundRect(el.x,el.y,el.w,el.h,el.radius||0);
      ctx.clip();
      ctx.fillStyle=el.type==='text'?'transparent':el.bg||'transparent';ctx.fillRect(el.x,el.y,el.w,el.h);
      if(el.type==='image' && el.src){
        try{const img=new Image();img.src=el.src;await img.decode();ctx.drawImage(img,el.x,el.y,el.w,el.h);}catch(_){}
      }else if(el.text){
        ctx.fillStyle=el.color||'#3b172e';ctx.font=`${el.fontSize||16}px Arial`;
        ctx.textAlign='center';ctx.textBaseline='middle';
        const lines=String(el.text).split('\n');const lineHeight=(el.fontSize||16)*1.2;
        lines.forEach((line,i)=>ctx.fillText(line,el.x+el.w/2,el.y+el.h/2+(i-(lines.length-1)/2)*lineHeight,el.w-16));
      }
      ctx.restore();
    }
    canvas.toBlob(blob=>{if(blob)download(filename('png'),blob,'image/png');},'image/png');
  }
  function moveOrResize(item,e){
    const dx=snap((e.clientX-drag.clientX)/scale);
    const dy=snap((e.clientY-drag.clientY)/scale);
    if(drag.mode==='move'){
      item.x=drag.x+dx;item.y=drag.y+dy;
    }else{
      const dir=drag.dir;
      let left=drag.x,top=drag.y,right=drag.x+drag.w,bottom=drag.y+drag.h;
      const corner=dir.length===2;
      if(corner&&!e.shiftKey){
        const rawW=drag.w+(dir.includes('w')?-dx:dx);
        const rawH=drag.h+(dir.includes('n')?-dy:dy);
        const factor=Math.max(8/Math.min(drag.w,drag.h),(rawW/drag.w+rawH/drag.h)/2);
        const width=Math.max(8,snap(drag.w*factor));
        const height=Math.max(8,snap(drag.h*factor));
        if(dir.includes('w'))left=right-width;else right=left+width;
        if(dir.includes('n'))top=bottom-height;else bottom=top+height;
      }else{
        if(dir.includes('w'))left=snap(left+dx);
        if(dir.includes('e'))right=snap(right+dx);
        if(dir.includes('n'))top=snap(top+dy);
        if(dir.includes('s'))bottom=snap(bottom+dy);
      }
      left=Math.max(0,Math.min(left,right-8));top=Math.max(0,Math.min(top,bottom-8));
      right=Math.min(state.canvas.w,Math.max(left+8,right));
      bottom=Math.min(state.canvas.h,Math.max(top+8,bottom));
      item.x=left;item.y=top;item.w=right-left;item.h=bottom-top;
    }
    if(drag.kind==='target')normalizeTarget(item);else normalize(item);
  }
  // ---- Editing the game's own levels ----
  // A game level loads into the maker unlocked (its "locked" flag is kept as
  // gameLocked), and "Save to game" stores it for levels.js to pick up.
  const OVERRIDES='eyecon_level_overrides';
  const readOverrides=()=>{try{return JSON.parse(localStorage.getItem(OVERRIDES)||'{}');}catch(_){return {};}};
  function gameLevel(){return (window.EC_LEVELS||[]).find(l=>l.id===state.gameLevel);}
  function updateGameButtons(){
    $('maker-game-level').value=state.gameLevel||'';
    $('maker-save-level').hidden=!state.gameLevel;
    $('maker-reset-level').hidden=!state.gameLevel||!readOverrides()[state.gameLevel];
  }
  function openGameLevel(id){
    const level=(window.EC_LEVELS||[]).find(l=>l.id===id);
    if(!level)return;
    const saved=readOverrides()[id];
    const src=saved||level;
    state.gameLevel=id;state.title=`${level.clientName} · ${level.pageLabel}`;state.preset='custom';
    state.canvas={...src.canvas};
    state.elements=[...src.elements].sort((a,b)=>(a.z||0)-(b.z||0)).map(el=>{const c={...el,gameLocked:!!el.locked};delete c.locked;return c;});
    state.targets=[];state.selected=null;state.selectedTarget=null;
    render();record();updateGameButtons();
  }
  function saveGameLevel(){
    const level=gameLevel();if(!level)return;
    const all=readOverrides();
    all[level.id]={canvas:{...state.canvas},elements:state.elements.map(el=>{const c={...el,locked:el.gameLocked};delete c.gameLocked;return c;})};
    const ids=new Set(all[level.id].elements.map(el=>el.id));
    const missing=(level.goals||[]).flatMap(g=>Object.values(g.check).filter(Array.isArray).flat()).filter(id=>!ids.has(id));
    if(missing.length){alert('This level\'s goals need these elements, so put them back first: '+[...new Set(missing)].join(', '));return;}
    try{localStorage.setItem(OVERRIDES,JSON.stringify(all));}catch(_){alert('Could not save: browser storage is full.');return;}
    // Reload so levels.js re-applies grid snapping and targets to the edit.
    if(confirm('Saved. Reload the game now to play the edited level?'))location.reload();
    updateGameButtons();
  }
  function resetGameLevel(){
    const all=readOverrides();delete all[state.gameLevel];
    localStorage.setItem(OVERRIDES,JSON.stringify(all));
    alert('The level is back to its original design after the game reloads.');
    location.reload();
  }
  function init(){
    load();
    const picker=$('maker-game-level');
    (window.EC_LEVELS||[]).forEach(l=>picker.add(new Option(`${l.clientName} · ${l.pageLabel}`,l.id)));
    picker.addEventListener('change',()=>{if(picker.value)openGameLevel(picker.value);else{state.gameLevel=null;updateGameButtons();}});
    $('maker-save-level').addEventListener('click',saveGameLevel);
    $('maker-reset-level').addEventListener('click',resetGameLevel);
    updateGameButtons();
    history=[snapshot()];updateToolbar();
    $('maker-zoom-out').addEventListener('click',()=>setZoom(zoom-.25));
    $('maker-zoom-in').addEventListener('click',()=>setZoom(zoom+.25));
    $('maker-undo').addEventListener('click',undo);
    $('maker-redo').addEventListener('click',redo);
    document.querySelectorAll('[data-maker-add]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.dataset.makerAdd==='image')$('maker-image-upload').click();
      else add(btn.dataset.makerAdd);
    }));
    $('maker-title').addEventListener('input',e=>{state.title=e.target.value;persist();});
    $('maker-title').addEventListener('change',record);
    $('maker-preset').addEventListener('change',e=>{
      state.preset=e.target.value;
      if(PRESETS[state.preset])resizeCanvas(PRESETS[state.preset].w,PRESETS[state.preset].h);
      else {render();record();}
    });
    for(const id of ['maker-width','maker-height'])$(id).addEventListener('change',()=>{
      state.preset='custom';resizeCanvas($('maker-width').value,$('maker-height').value);
    });
    $('maker-add-target').addEventListener('click',()=>{
      const el=selected();if(!el){alert('Select an element before adding its target.');return;}
      const target={id:el.id,x:el.x,y:el.y,w:el.w,h:el.h};
      normalizeTarget(target);
      state.targets=state.targets.filter(t=>t.id!==el.id);
      state.targets.push(target);selectTarget(el.id);persist();record();
    });
    const peek=$('maker-peek-targets');
    const setPeek=value=>{if(peeking===value)return;peeking=value;peek.setAttribute('aria-pressed',String(value));renderCanvas();};
    peek.addEventListener('pointerdown',e=>{e.preventDefault();peek.setPointerCapture(e.pointerId);setPeek(true);});
    peek.addEventListener('pointerup',()=>setPeek(false));
    peek.addEventListener('pointercancel',()=>setPeek(false));
    peek.addEventListener('lostpointercapture',()=>setPeek(false));
    peek.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();setPeek(true);}});
    peek.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();setPeek(false);}});
    peek.addEventListener('blur',()=>setPeek(false));
    const layers=$('maker-layers');
    layers.addEventListener('pointerdown',e=>{
      const row=e.target.closest('[data-layer-id]');if(!row)return;
      layerDrag={id:row.dataset.layerId,startY:e.clientY,over:row.dataset.layerId,moved:false};
      layers.setPointerCapture(e.pointerId);
    });
    layers.addEventListener('pointermove',e=>{
      if(!layerDrag)return;
      if(Math.abs(e.clientY-layerDrag.startY)>8)layerDrag.moved=true;
      if(!layerDrag.moved)return;
      const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-layer-id]');
      layers.querySelectorAll('.drop-target,.dragging').forEach(n=>n.classList.remove('drop-target','dragging'));
      layers.querySelector(`[data-layer-id="${layerDrag.id}"]`)?.classList.add('dragging');
      if(row&&layers.contains(row)){layerDrag.over=row.dataset.layerId;row.classList.add('drop-target');}
    });
    layers.addEventListener('pointerup',()=>{
      if(!layerDrag)return;
      const {id,over,moved}=layerDrag;layerDrag=null;
      if(moved&&id!==over){
        const topFirst=[...state.elements].reverse();
        const from=topFirst.findIndex(el=>el.id===id),to=topFirst.findIndex(el=>el.id===over);
        if(from>=0&&to>=0){const [item]=topFirst.splice(from,1);topFirst.splice(to,0,item);state.elements=topFirst.reverse();syncZ();render();record();return;}
      }
      if(!moved){select(id);return;}
      layers.querySelectorAll('.drop-target,.dragging').forEach(n=>n.classList.remove('drop-target','dragging'));
    });
    layers.addEventListener('pointercancel',()=>{layerDrag=null;layers.querySelectorAll('.drop-target,.dragging').forEach(n=>n.classList.remove('drop-target','dragging'));});
    const exportToggle=$('maker-export-toggle'),exportOptions=$('maker-export-options');
    const closeExport=()=>{exportOptions.hidden=true;exportToggle.setAttribute('aria-expanded','false');};
    exportToggle.addEventListener('click',()=>{
      exportOptions.hidden=!exportOptions.hidden;
      exportToggle.setAttribute('aria-expanded',String(!exportOptions.hidden));
    });
    exportOptions.addEventListener('click',e=>{
      const kind=e.target.closest('[data-maker-export]')?.dataset.makerExport;
      if(!kind)return;
      closeExport();
      if(kind==='json')exportLevel();else if(kind==='html')exportHtml();else if(kind==='png')exportPng();
    });
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('#maker-export'))closeExport();});
    $('maker-image-upload').addEventListener('change',e=>{
      const file=e.target.files[0];if(!file)return;
      const reader=new FileReader();reader.onload=()=>add('image',String(reader.result));reader.readAsDataURL(file);e.target.value='';
    });
    $('maker-import-json').addEventListener('change',async e=>{
      const file=e.target.files[0];if(!file)return;
      try{
        const draft=JSON.parse(await file.text());
        if(!Array.isArray(draft.elements)||!draft.canvas)throw Error('Invalid level file');
        state.title=String(draft.name||draft.title||'Imported design');
        state.preset=(PRESETS[draft.preset]||draft.preset==='custom')?draft.preset:'custom';
        state.canvas={w:validSize(draft.canvas.w),h:validSize(draft.canvas.h),bg:draft.canvas.bg||'#fffaf3'};
        state.elements=draft.elements.filter(el=>el&&typeof el.id==='string').map(el=>({...el}));
        state.elements.forEach(normalize);syncZ();
        const importedTargets=Array.isArray(draft.hiddenTargets)?draft.hiddenTargets:draft.targets;
        state.targets=Array.isArray(importedTargets)?importedTargets.filter(t=>t&&typeof t.id==='string').map(t=>({...t})):[];
        state.targets.forEach(normalizeTarget);
        state.selected=null;state.selectedTarget=null;render();record();
      }catch(err){alert('Could not import this level: '+err.message);}
      e.target.value='';
    });
    $('maker-properties-fields').addEventListener('change',e=>{
      const key=e.target.dataset.makerField;if(!key)return;
      if(key==='canvasBg'){state.canvas.bg=e.target.value;render();record();return;}
      if(key.startsWith('target')){
        const target=selectedTarget();if(!target)return;
        target[key.slice(6).toLowerCase()]=Number(e.target.value);
        normalizeTarget(target);render();record();return;
      }
      const el=selected();if(!el)return;
      if(el.locked){renderProperties();return;}
      el[key]=['x','y','w','h','fontSize','radius'].includes(key)?Number(e.target.value):e.target.value;
      normalize(el);render();record();
    });
    $('maker-properties-fields').addEventListener('click',e=>{
      const action=e.target.dataset.makerAction,el=selected();if(!action)return;
      if(action==='delete-target'){
        deleteSelection();return;
      }
      if(!el)return;
      if(el.locked)return;
      if(action==='delete'){deleteSelection();return;}
      if(action==='duplicate'){
        const copy={...el,id:nextId(),x:el.x+16,y:el.y+16,z:state.elements.length+1};normalize(copy);state.elements.push(copy);state.selected=copy.id;
        const target=state.targets.find(t=>t.id===el.id);
        if(target){const copiedTarget={...target,id:copy.id,x:target.x+16,y:target.y+16};normalizeTarget(copiedTarget);state.targets.push(copiedTarget);}
      }
      if(action==='front'){state.elements=state.elements.filter(item=>item.id!==el.id);el.z=state.elements.length+1;state.elements.push(el);}
      if(action==='back'){state.elements=state.elements.filter(item=>item.id!==el.id);state.elements.unshift(el);}
      syncZ();render();record();
    });
    $('maker-canvas').addEventListener('pointerdown',e=>{
      if(peeking||e.button!==0)return;
      const quick=e.target.closest('[data-maker-quick]');
      if(quick){
        e.preventDefault();e.stopPropagation();
        const el=selected();if(!el)return;
        if(quick.dataset.makerQuick==='visibility'){el.hidden=true;render();record();}
        else if(quick.dataset.makerQuick==='lock'){el.locked=!el.locked;render();record();}
        else deleteSelection();
        return;
      }
      if(spacePan)return;
      if(e.target.closest('[contenteditable="true"]'))return;
      const handle=e.target.closest('[data-resize]');
      if(handle){
        e.preventDefault();e.stopPropagation();
        const item=selectedTarget()||selected();if(!item||item.locked)return;
        drag={mode:'resize',kind:selectedTarget()?'target':'element',id:item.id,dir:handle.dataset.resize,
          x:item.x,y:item.y,w:item.w,h:item.h,clientX:e.clientX,clientY:e.clientY,before:snapshot()};
        $('maker-canvas').setPointerCapture(e.pointerId);return;
      }
      if(e.target.closest('.maker-selection-box')){
        e.preventDefault();e.stopPropagation();
        const item=selectedTarget()||selected();if(!item||item.locked)return;
        drag={mode:'move',kind:selectedTarget()?'target':'element',id:item.id,x:item.x,y:item.y,
          clientX:e.clientX,clientY:e.clientY,before:snapshot()};
        $('maker-canvas').setPointerCapture(e.pointerId);return;
      }
      const targetNode=e.target.closest('.maker-target');
      if(targetNode){
        e.preventDefault();e.stopPropagation();
        selectTarget(targetNode.dataset.targetId);
        const target=selectedTarget();drag={mode:'move',kind:'target',id:target.id,x:target.x,y:target.y,clientX:e.clientX,clientY:e.clientY,before:snapshot()};
        $('maker-canvas').setPointerCapture(e.pointerId);return;
      }
      const node=e.target.closest('.maker-element');
      if(!node){select(null);return;}
      e.preventDefault();e.stopPropagation();
      if(state.selected!==node.dataset.id)select(node.dataset.id);
      const el=selected();drag={mode:'move',kind:'element',id:el.id,x:el.x,y:el.y,clientX:e.clientX,clientY:e.clientY,before:snapshot()};
      if(el.locked){drag=null;return;}
      $('maker-canvas').setPointerCapture(e.pointerId);
    });
    $('maker-canvas').addEventListener('dblclick',e=>{
      const node=e.target.closest('.maker-element');
      const selectedNode=state.selected&&[...$('maker-canvas').querySelectorAll('.maker-element')].find(item=>item.dataset.id===state.selected);
      const rect=selectedNode?.getBoundingClientRect();
      const onSelected=rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
      const id=node?.dataset.id||(onSelected?state.selected:null);
      if(!id)return;
      const el=state.elements.find(item=>item.id===id);
      if(!el||el.type!=='text'||el.locked)return;
      const editable=$('maker-canvas').querySelector(`.maker-element[data-id="${el.id}"]`);
      $('maker-canvas').querySelector('.maker-selection-box')?.remove();
      editable.contentEditable='true';editable.focus();
      const range=document.createRange();range.selectNodeContents(editable);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    });
    $('maker-canvas').addEventListener('focusout',e=>{
      const node=e.target.closest('.maker-element[contenteditable="true"]');if(!node)return;
      const el=state.elements.find(item=>item.id===node.dataset.id);if(!el)return;
      el.text=node.innerText;node.contentEditable='false';render();record();
    });
    $('maker-canvas').addEventListener('pointermove',e=>{
      if(!drag)return;
      const item=drag.kind==='target'?selectedTarget():selected();if(!item||item.id!==drag.id)return;
      moveOrResize(item,e);
      renderCanvas();
    });
    const endDrag=()=>{if(drag){const changed=drag.before!==snapshot();drag=null;renderLayers();renderProperties();persist();if(changed)record();}};
    $('maker-canvas').addEventListener('pointerup',endDrag);
    $('maker-canvas').addEventListener('pointercancel',endDrag);
    $('maker-stage').addEventListener('wheel',e=>{
      e.preventDefault();
      if(e.shiftKey){panX-=e.deltaX||e.deltaY;panY-=e.deltaX?e.deltaY:0;fit();return;}
      setZoom(zoom+(e.deltaY<0?.25:-.25));
    },{passive:false});
    $('maker-stage').addEventListener('pointerdown',e=>{
      if(e.button!==0&&e.button!==1)return;
      if(e.button===1)e.preventDefault();
      if(e.target.closest('button'))return;
      if(e.button!==1&&!spacePan&&e.target.closest('.maker-element,.maker-target,.maker-selection-box,.maker-resize-handle'))return;
      stagePan={x:e.clientX,y:e.clientY,panX,panY};
      $('maker-stage').setPointerCapture(e.pointerId);
    });
    $('maker-stage').addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
    $('maker-stage').addEventListener('pointermove',e=>{
      if(!stagePan)return;
      panX=stagePan.panX+e.clientX-stagePan.x;panY=stagePan.panY+e.clientY-stagePan.y;fit();
    });
    $('maker-stage').addEventListener('pointerup',()=>{stagePan=null;});
    $('maker-stage').addEventListener('pointercancel',()=>{stagePan=null;});
    document.addEventListener('keydown',e=>{
      if(!$('screen-maker').classList.contains('active'))return;
      const editing=e.target.closest('input,textarea,select,[contenteditable="true"]');
      if(e.code==='Space'&&!editing){e.preventDefault();spacePan=true;$('maker-stage').classList.add('panning');return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
        if(editing)return;e.preventDefault();if(e.shiftKey)redo();else undo();return;
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){
        if(editing)return;e.preventDefault();redo();return;
      }
      if(editing)return;
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelection();}
      if(e.key==='Escape'){
        if(!exportOptions.hidden)closeExport();else select(null);
      }
    });
    document.addEventListener('keyup',e=>{if(e.code==='Space'){spacePan=false;$('maker-stage').classList.remove('panning');}});
    const workspace=document.querySelector('.maker-workspace');
    const applyRails=()=>{workspace.style.setProperty('--maker-left',rails.left+'rem');workspace.style.setProperty('--maker-right',rails.right+'rem');requestAnimationFrame(fit);};
    applyRails();
    workspace.querySelectorAll('.maker-rail-resizer').forEach(handle=>{
      const side=handle.dataset.side;
      const setSize=value=>{
        const rem=parseFloat(getComputedStyle(document.documentElement).fontSize);
        const other=rails[side==='left'?'right':'left'];
        rails[side]=Math.round(Math.max(9,Math.min(32,workspace.clientWidth/rem-other-16,value))*4)/4;
        applyRails();try{localStorage.setItem(RAIL_KEY,JSON.stringify(rails));}catch(_){}
      };
      handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);});
      handle.addEventListener('pointermove',e=>{if(!handle.hasPointerCapture(e.pointerId))return;const bounds=workspace.getBoundingClientRect();const rem=parseFloat(getComputedStyle(document.documentElement).fontSize);setSize((side==='left'?e.clientX-bounds.left:bounds.right-e.clientX)/rem-1);});
      handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();setSize(rails[side]+(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1));});
    });
    window.addEventListener('resize',fit);
  }
  window.EC_MAKER={init,open:render};
})();
