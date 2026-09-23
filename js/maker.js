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
  let scale = 1, zoom = 1, panX = 0, panY = 0, drag = null, layerDrag = null, stagePan = null, peeking = false;
  let history = [], future = [];
  const $ = id => document.getElementById(id);
  const selected = () => state.elements.find(el=>el.id===state.selected);
  const selectedTarget = () => state.targets.find(target=>target.id===state.selectedTarget);
  const snapshot = () => JSON.stringify({title:state.title,preset:state.preset,canvas:state.canvas,elements:state.elements,targets:state.targets,selected:state.selected,selectedTarget:state.selectedTarget});
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
    el.x = Math.max(0,Math.min(snap(Number(el.x)||0),state.canvas.w-8));
    el.y = Math.max(0,Math.min(snap(Number(el.y)||0),state.canvas.h-8));
    el.w = Math.max(8,Math.min(snap(Number(el.w)||8),state.canvas.w-el.x));
    el.h = Math.max(8,Math.min(snap(Number(el.h)||8),state.canvas.h-el.y));
    el.radius = Math.max(0,snap(Number(el.radius)||0));
    el.fontSize = Math.max(8,snap(Number(el.fontSize)||16));
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
  function setZoom(value){zoom=Math.max(.25,Math.min(4,Math.round(value*4)/4));if(zoom===1){panX=0;panY=0;}fit();}
  function renderCanvas(){
    const canvas=$('maker-canvas');
    canvas.innerHTML='';
    canvas.classList.toggle('peek-targets',peeking);
    state.elements.forEach(el=>{
      const node=document.createElement('div');
      node.className='maker-element'+(el.id===state.selected?' selected':'');
      node.dataset.id=el.id;
      node.style.cssText=`left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z||1};border-radius:${el.radius||0}px;background:${el.bg||'transparent'};color:${el.color||'#3b172e'};font-size:${el.fontSize||16}px;`;
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
    if(item&&!peeking){
      const box=document.createElement('div');
      box.className='maker-selection-box';
      box.style.cssText=`left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;`;
      for(const dir of ['nw','n','ne','e','se','s','sw','w']){
        const handle=document.createElement('span');
        handle.className='maker-resize-handle '+dir;
        handle.dataset.resize=dir;
        handle.setAttribute('aria-label',`Resize ${dir}`);
        box.appendChild(handle);
      }
      canvas.appendChild(box);
    }
    fit();
  }
  function syncZ(){state.elements.forEach((el,i)=>el.z=i+1);}
  function renderLayers(){
    const list=$('maker-layers'); list.innerHTML='';
    [...state.elements].reverse().forEach(el=>{
      const row=document.createElement('div');row.className='maker-layer-row'+(el.id===state.selected?' active':'');row.dataset.layerId=el.id;
      const button=document.createElement('button');button.type='button';button.className='maker-layer-select';
      button.innerHTML='<span class="maker-layer-grip" aria-hidden="true">☰</span>';
      button.appendChild(document.createTextNode((el.type==='image'?'▧ ':el.type==='rect'?'▢ ':'T ')+(el.text||el.type)));
      button.addEventListener('click',e=>{if(e.detail===0)select(el.id);});row.appendChild(button);
      if(el.id===state.selected){
        const remove=document.createElement('button');remove.type='button';remove.className='maker-layer-delete';
        remove.setAttribute('aria-label','Delete selected layer');remove.title='Delete selected layer';remove.textContent='×';
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
      ${el.type==='rect'||el.type==='image'?'':field('Text','text','text',el.text||'')}
      ${field('Fill','bg','color',el.bg||'#ffffff')}
      ${el.type==='rect'||el.type==='image'?'':field('Text color','color','color',el.color||'#3b172e')}
      ${el.type==='rect'||el.type==='image'?'':field('Text size','fontSize','number',el.fontSize||16)}
      ${field('Corner radius','radius','number',el.radius||0)}
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
    const offsets={text:[240,64],heading:[320,80],button:[160,56],shape:[160,128],image:[240,160]};
    const [w,h]=offsets[type];
    const el={id:nextId(),type:type==='shape'?'rect':type,role:type==='shape'?'card':type==='image'?'decorative':type,
      x:32,y:32,w,h,text:{text:'New text',heading:'Heading',button:'Button'}[type]||'',
      bg:{shape:'#bfe9db',button:'#91d8d0'}[type]||'#ffffff',color:'#3b172e',fontSize:type==='heading'?40:24,
      radius:0,z:state.elements.length+1,src:src||''};
    normalize(el);state.elements.push(el);state.selected=el.id;state.selectedTarget=null;render();record();
  }
  function deleteSelection(){
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
    const nodes=state.elements.map(el=>{
      const style=`position:absolute;box-sizing:border-box;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z||1};border-radius:${el.radius||0}px;background:${el.bg||'transparent'};color:${el.color||'#3b172e'};font-size:${el.fontSize||16}px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:pre-wrap;text-align:center;`;
      const body=el.type==='image'&&el.src?`<img src="${safe(el.src)}" alt="${safe(el.text||'')}" style="width:100%;height:100%;object-fit:cover">`:safe(el.text||'');
      return `<div style="${style}">${body}</div>`;
    }).join('\n');
    download(filename('html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(state.title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eee;font-family:Arial,sans-serif}.canvas{position:relative;width:${state.canvas.w}px;height:${state.canvas.h}px;background:${state.canvas.bg};overflow:hidden;max-width:100vw}</style><main class="canvas">${nodes}</main></html>`,'text/html');
  }
  async function exportPng(){
    const canvas=document.createElement('canvas');canvas.width=state.canvas.w;canvas.height=state.canvas.h;
    const ctx=canvas.getContext('2d');ctx.fillStyle=state.canvas.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
    for(const el of [...state.elements].sort((a,b)=>(a.z||0)-(b.z||0))){
      ctx.save();ctx.beginPath();ctx.roundRect(el.x,el.y,el.w,el.h,el.radius||0);ctx.clip();
      ctx.fillStyle=el.bg||'transparent';ctx.fillRect(el.x,el.y,el.w,el.h);
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
  function init(){
    load();
    history=[snapshot()];updateToolbar();
    $('maker-zoom-out').addEventListener('click',()=>setZoom(zoom-.25));
    $('maker-zoom-in').addEventListener('click',()=>setZoom(zoom+.25));
    $('maker-zoom-fit').addEventListener('click',()=>setZoom(1));
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
      el[key]=['x','y','w','h','fontSize','radius'].includes(key)?Number(e.target.value):e.target.value;
      normalize(el);render();record();
    });
    $('maker-properties-fields').addEventListener('click',e=>{
      const action=e.target.dataset.makerAction,el=selected();if(!action)return;
      if(action==='delete-target'){
        deleteSelection();return;
      }
      if(!el)return;
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
      const handle=e.target.closest('[data-resize]');
      if(handle){
        e.preventDefault();e.stopPropagation();
        const item=selectedTarget()||selected();if(!item)return;
        drag={mode:'resize',kind:selectedTarget()?'target':'element',id:item.id,dir:handle.dataset.resize,
          x:item.x,y:item.y,w:item.w,h:item.h,clientX:e.clientX,clientY:e.clientY,before:snapshot()};
        $('maker-canvas').setPointerCapture(e.pointerId);return;
      }
      if(e.target.closest('.maker-selection-box')){
        e.preventDefault();e.stopPropagation();
        const item=selectedTarget()||selected();if(!item)return;
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
      select(node.dataset.id);
      const el=selected();drag={mode:'move',kind:'element',id:el.id,x:el.x,y:el.y,clientX:e.clientX,clientY:e.clientY,before:snapshot()};
      $('maker-canvas').setPointerCapture(e.pointerId);
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
      if(zoom<=1||e.target.closest('button,.maker-element,.maker-target,.maker-selection-box,.maker-resize-handle'))return;
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
    window.addEventListener('resize',fit);
  }
  window.EC_MAKER={init,open:render};
})();
