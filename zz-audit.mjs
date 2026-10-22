import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1920,height:1080}});
await p.addInitScript(()=>{ try{ localStorage.setItem('ec-skip-tutorials','1'); }catch(e){} });
const scan = (label) => p.evaluate((label) => {
  const lum = c => { const m=c.match(/[\d.]+/g); if(!m) return null; const a=m[3]!==undefined?+m[3]:1; const ch=m.slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+.055)/1.055)**2.4}); return {L:.2126*ch[0]+.7152*ch[1]+.0722*ch[2],a,rgb:'rgb('+m.slice(0,3).join(',')+')'}; };
  const bgOf = el => { for(let e=el;e;e=e.parentElement){ const s=getComputedStyle(e); const c=lum(s.backgroundColor); if(c && c.a>0.5) return c; if(s.backgroundImage!=='none') return null; } return lum('rgb(255,255,255)'); };
  const sel = el => { let s=el.tagName.toLowerCase(); if(el.id) return s+'#'+el.id; const c=[...el.classList].slice(0,2).join('.'); return s+(c?'.'+c:'') + (el.parentElement?.id?' <#'+el.parentElement.id:''); };
  const out=[];
  const vis = el => { const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return false; const s=getComputedStyle(el); return s.visibility!=='hidden' && s.display!=='none' && +s.opacity>0.05 && r.bottom>0 && r.top<innerHeight; };
  document.querySelectorAll('body *').forEach(el=>{
    if(['SCRIPT','STYLE','SVG','PATH','IMG','VIDEO','CANVAS'].includes(el.tagName.toUpperCase())) return;
    if(el.closest('#editor-canvas, .canvas-inner, .client-site, .gb-demo, svg')) return; // client designs are content, not UI
    if(!vis(el)) return;
    const s=getComputedStyle(el);
    const ownText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    const rec={screen:label, sel:sel(el), text: ownText ? el.textContent.trim().slice(0,30) : ''};
    if(ownText){
      rec.font=parseFloat(s.fontSize); rec.weight=+s.fontWeight;
      const fg=lum(s.color), bg=bgOf(el);
      if(fg&&bg){ rec.ratio=+((Math.max(fg.L,bg.L)+.05)/(Math.min(fg.L,bg.L)+.05)).toFixed(2); rec.fg=fg.rgb; rec.bg=bg.rgb; }
      rec.large = rec.font>=24 || (rec.weight>=700 && rec.font>=18.66);
    }
    const sp={}; for(const k of ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','rowGap','columnGap']){ const v=parseFloat(s[k]); if(v && v%8 !== 0 && v%4 !== 0) sp[k]=v; else if(v && v%8!==0) sp[k]=v; }
    if(Object.keys(sp).length) rec.spacing=sp;
    if(rec.text||rec.spacing) out.push(rec);
  });
  return out;
}, label);
const all=[];
await p.goto('http://localhost:4173/index.html?admin'); await p.waitForTimeout(2500); all.push(...await scan('title'));
await p.click('#mini-desktop').catch(()=>{}); await p.waitForTimeout(3000); all.push(...await scan('desktop'));
await p.evaluate(()=>document.getElementById('icon-mail')?.click()); await p.waitForTimeout(4000); all.push(...await scan('mail'));
await p.evaluate(()=>document.querySelector('#mail-list .mail-item')?.click()); await p.waitForTimeout(1500); all.push(...await scan('mail-detail'));
await p.goto('http://localhost:4173/index.html?admin'); await p.waitForTimeout(2000);
await p.evaluate(()=>document.querySelector('.dev-levels [data-dev-level="2"]').click()); await p.waitForTimeout(6000); all.push(...await scan('editor'));
const pt = await p.evaluate(()=>{ const n=[...document.querySelectorAll('[data-id]')].find(e=>/Welcome Bak/.test(e.textContent)); const r=n.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; });
await p.mouse.click(pt[0],pt[1]); await p.waitForTimeout(1500); all.push(...await scan('editor-selected'));
writeFileSync('C:/Users/shink/AppData/Local/Temp/claude/c--Users-shink-Documents-EyeCon-old/759d457d-bdda-4f08-b14a-1a677a0a0504/scratchpad/audit.json', JSON.stringify(all));
console.log(all.length);
await b.close();
