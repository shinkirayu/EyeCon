/* Interactive client websites inside the studio browser. */
(function(){
  const specs={
    mayo:{tag:'ILLUSTRATION · CHARACTER ART · LITTLE WORLDS',title:'A little imagination.\nA whole lot of color.',intro:'Welcome to my corner of the internet. I’m Mayonnaisegee, and I turn everyday daydreams into playful characters and colorful stories.',cta:'Explore my work',destination:'work',about:'Hi, I’m Mayonnaisegee.',story:'An illustrator with a soft spot for expressive characters, dreamy colors, and the tiny details that make a story feel alive. This space is a collection of experiments, favorite pieces, and worlds still taking shape.',cards:['Character stories','Colorful daydreams','Little adventures']},
    yappers:{tag:'YOUR PEOPLE. YOUR CONVERSATIONS.',title:'Good conversations\nstart with a hello.',intro:'A cozy corner for big opinions, small updates, and everything you can’t wait to tell your friends. Find your flock on Yappers.',cta:'Join the conversation',destination:'community',about:'A place for your everyday yap.',story:'Yappers brings people together around the things they love. Share a thought, discover a new interest, or just check in with your people. A little kindness goes a long way here.',cards:['Creative corner','Everyday life','Games & good company']},
    haybuhay:{tag:'TAKE A BREATH. START AN ADVENTURE.',title:'Your next chapter\nstarts here.',intro:'Welcome to Hay Buhay 3. Slow down, explore a colorful world, and make a little space for adventure. Play at your own pace.',cta:'Explore the world',destination:'world',about:'Life is better with a little adventure.',story:'Hay Buhay 3 is a world built for curiosity. Meet new characters, discover quiet corners, and make each journey your own. Our team believes games should feel welcoming from the very first screen.',cards:['Explore new places','Meet your neighbors','Make it your own']}
  };
  const settings={volume:70,music:true,quality:'High'};
  let designObserver;
  function applyClientStyle(site, project, profile){
    const level=window.EC_LEVELS.find(l=>l.project===project.id);
    const saved=(profile.designs||{})[level.id];
    const elements=saved||level.elements;
    const byId=id=>elements.find(el=>el.id===id);
    const set=(name,value)=>{if(value!=null)site.style.setProperty(name,String(value));};
    const heading=byId('title');
    const body=byId(project.id==='mayo'?'caption':project.id==='yappers'?'user':'sec1');
    set('--client-heading-font',`"${heading?.fontFamily||'Righteous'}", sans-serif`);
    set('--client-body-font',`"${body?.fontFamily||'Niramit'}", sans-serif`);
    set('--client-heading-weight',heading?.fontWeight||400);
    if(project.id==='mayo'){
      set('--site-paper',byId('bg')?.bg||level.canvas.bg);
      set('--site-ink',byId('logo')?.color||'#1B1E93');
      set('--client-heading-color',heading?.color||'#1B1E93');
      set('--client-body-color',body?.color||'#1B1E93');
      set('--site-accent',byId('logo')?.color||'#1B1E93');
      set('--site-soft','#fff');
      set('--client-nav-font',`"${byId('about')?.fontFamily||'Roboto Slab'}", serif`);
      set('--client-brand-font',`"${byId('logo')?.fontFamily||'Autour One'}", sans-serif`);
      site.querySelector('.client-brand img')?.remove();
    }else if(project.id==='yappers'){
      set('--site-paper',byId('bg')?.bg||level.canvas.bg);
      set('--site-soft',byId('card')?.bg||'#fff');
      set('--site-ink',saved?body?.color:'#43351c');
      set('--client-body-color',saved?body?.color:'#43351c');
      set('--client-heading-color',saved?heading?.color:'#745019');
      set('--site-accent',byId('login')?.bg||'#EDC45C');
      set('--client-button-color',saved?byId('login')?.color:'#43351c');
      set('--client-border',byId('input1')?.border?.color||'#000');
      set('--client-button-font',`"${byId('login')?.fontFamily||'Londrina Solid'}", sans-serif`);
      set('--client-card-shadow',byId('card')?.shadow?.enabled?`0 4px ${byId('card').shadow.blur}px ${byId('card').shadow.color}`:'none');
    }else{
      set('--site-soft',byId('panel')?.bg||'linear-gradient(180deg,#D398EC,#9535BD)');
      set('--site-accent','#D397EC');
      set('--client-body-color','#f6eaff');
    }
  }
  // A design drawn at width w grows to fill a window of height h: full-height backgrounds and side panels
  // stretch (pictures keep their shape), and a full-width footer band moves down with the bottom edge.
  function fill(level,elements,w,h){
    const W=level.canvas.w,H=level.canvas.h,extra=Math.max(0,Math.round(W*h/Math.max(1,w))-H);
    if(!extra)return{level,elements};
    const band=elements.find(e=>!e.text&&e.w>=W*.9&&e.y>=H*.75&&e.h<H*.2),foot=band?band.y:Infinity;
    return{level:{...level,canvas:{...level.canvas,h:H+extra}},elements:elements.map(e=>e.y>=foot?{...e,y:e.y+extra}:e.y+e.h>=H-8&&e.y<H*.5&&!e.src?{...e,h:e.h+extra}:e)};
  }
  function render(host,project,profile,route,navigate){
    designObserver?.disconnect();
    const s=specs[project.id];
    const workLabel=project.id==='mayo'?'Work':project.id==='yappers'?'Community':'World';
    // Mayonnaisegee's site only has the three pages its portfolio header links to.
    const routes=project.id==='mayo'?[['home','Home'],['about','About'],['contact','Contact']]:[['home','Home'],[s.destination,workLabel],['about','About'],['contact','Contact']];
    if(project.id==='haybuhay') routes.push(['settings','Settings']);
    host.innerHTML=`<article class="client-site site-${project.id}"><header class="client-nav"><button class="client-brand" data-route="home">${project.avatarEmoji}<span>${project.name}</span></button><nav aria-label="${project.name} navigation">${routes.map(([r,label])=>`<button data-route="${r}" ${route===r?'aria-current="page"':''}>${label}</button>`).join('')}</nav></header><main class="client-content"></main><footer class="client-footer"><span>${project.name} · A little space of our own.</span><button data-route="contact">Let’s talk ↗</button></footer></article>`;
    const main=host.querySelector('main');
    applyClientStyle(host.querySelector('.client-site'),project,profile);
    // Mayonnaisegee: every page keeps the portfolio's own header (cut from the design), not a generic one.
    if(project.id==='mayo'&&route!=='home'){
      const level=window.EC_LEVELS.find(l=>l.project==='mayo'), els=(profile.designs||{})[level.id]||level.elements;
      const navs=els.filter(e=>['home','about','contact'].includes(e.id)), navB=Math.max(...navs.map(e=>e.y+e.h)), band=els.filter(e=>!e.text&&!e.src&&e.y<=navs[0].y&&e.y+e.h>=navB&&e.w>=level.canvas.w*.9&&e.h<level.canvas.h/2).sort((a,b)=>a.h-b.h)[0], cut=band?band.y+band.h:navB+40; // the header's white band
      const head=document.createElement('div'); head.className='client-design-header';
      host.querySelector('.client-nav').replaceWith(head);
      const draw=()=>{const w=head.clientWidth; if(!w) return; head.style.height=(cut*w/level.canvas.w)+'px';
        window.EC_EDITOR.renderStatic(head,level,els,{fitW:w,fitH:w*level.canvas.h/level.canvas.w,onElement:(node,el)=>{
          if(['home','about','contact'].includes(el.id)){node.setAttribute('role','button');node.tabIndex=0;node.style.cursor='pointer';node.addEventListener('click',()=>navigate(el.id));if(el.id===route)node.setAttribute('aria-current','page');}}});};
      designObserver=new ResizeObserver(draw); designObserver.observe(head); draw();
    }
    const cards=()=>`<div class="client-cards">${s.cards.map((title,i)=>`<button class="client-card" data-detail="${i}">${project.id==='mayo'?`<img src="assets/levels/mayo/card${i+1}.png" alt="${title}" />`:`<span class="client-card-symbol" aria-hidden="true">${(project.id==='yappers'?['✦','☀','♡']:['✧','❀','☾'])[i]}</span>`}<small>0${i+1}</small><h3>${title}</h3><span>Take a closer look ↗</span></button>`).join('')}</div><div class="client-detail" hidden></div>`;
    if(route==='home' && project.id!=='haybuhay'){
      const level=window.EC_LEVELS.find(l=>l.project===project.id);
      const elements=(profile.designs||{})[level.id]||level.elements;
      main.innerHTML='<div class="client-original-layout"></div><p class="client-original-status" role="status"></p>';
      host.querySelector('.client-footer').remove();
      if(project.id==='mayo') host.querySelector('.client-nav').remove();
      const frame=main.querySelector('.client-original-layout');
      const status=main.querySelector('[role="status"]');
      const activate=(node,label,action)=>{
        node.setAttribute('role','button');node.tabIndex=0;node.setAttribute('aria-label',label);node.style.cursor='pointer';
        node.addEventListener('click',action);
        node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});
      };
      const resize=()=>{
        const width=frame.clientWidth;
        if(!width)return;
        const f=fill(level,elements,width,host.clientHeight-(host.querySelector('.client-nav')?.offsetHeight||0)); // the window, not the page (which grows)
        window.EC_EDITOR.renderStatic(frame,f.level,f.elements,{fitW:width,fitH:width*f.level.canvas.h/f.level.canvas.w,onElement:(node,el)=>{
          if(project.id==='mayo'){
            if(['home','about','contact'].includes(el.id)) activate(node,el.text,()=>navigate(el.id));
            if(/^card[123]$/.test(el.id)) activate(node,'View artwork '+el.id.slice(-1),()=>{status.textContent='Interested in this artwork? Visit Contact to discuss a commission.';});
          }else{
            if(el.id==='user'||el.id==='pass'){
              const input=document.createElement('input');input.type=el.id==='pass'?'password':'text';input.placeholder=el.text;input.setAttribute('aria-label',el.id==='pass'?'Password':'Phone, username, or email');input.autocomplete=el.id==='pass'?'current-password':'username';
              input.style.cssText='width:100%;height:100%;border:0;padding:0;background:transparent;color:inherit;font:inherit;outline-offset:4px;';
              node.textContent='';node.appendChild(input);
            }
            if(el.id==='login')activate(node,'Log in',()=>{status.textContent='This is a demo sign-in. No account details are sent or saved.';});
            if(el.id==='forgot')activate(node,'Forgot Password?',()=>{status.textContent='Password recovery is unavailable in this demo. Visit Contact for questions.';});
          }
        }});
      };
      designObserver=new ResizeObserver(resize);designObserver.observe(frame);resize();
    }else if(route==='home'){
      main.innerHTML=`<section class="client-hero"><div><p class="client-eyebrow">${s.tag}</p><h1>${s.title.replace('\n','<br>')}</h1><p>${s.intro}</p><button class="client-primary" data-route="${s.destination}">${s.cta} ↗</button><button class="client-secondary" data-route="about">A little about us</button></div><div class="client-hero-art">${project.avatarEmoji}<span class="client-art-note">${project.id==='mayo'?'Made with imagination ✦':project.id==='yappers'?'There’s room for your voice ♡':'A world worth wandering ✧'}</span></div></section><section class="client-section"><p class="client-eyebrow">${project.id==='mayo'?'SELECTED WORK':'DISCOVER SOMETHING NEW'}</p><h2>${project.id==='mayo'?'Stories in color.':'Find your next favorite thing.'}</h2>${cards()}</section>`;
    }else if(route==='about'){
      main.innerHTML=`<section class="client-hero"><div><p class="client-eyebrow">BEHIND THE ${project.id==='mayo'?'ART':'SCENES'}</p><h1>${s.about}</h1><p>${s.story}</p><button class="client-primary" data-route="contact">Say hello ↗</button></div><div class="client-hero-art">${project.avatarEmoji}<span class="client-art-note">Nice to meet you!</span></div></section><section class="client-section"><h2>What makes this space special.</h2><div class="client-values"><div><b>01 / Creativity</b><p>Stay curious. There’s always something new to discover.</p></div><div><b>02 / Connection</b><p>Good things happen when we share a little of ourselves.</p></div><div><b>03 / Care</b><p>Thoughtful details make everyone feel more at home.</p></div></div></section>`;
    }else if(route==='contact'){
      main.innerHTML=`<section class="client-contact"><div><p class="client-eyebrow">LET’S MAKE SOMETHING HAPPEN</p><h1>${project.id==='mayo'?'Have a story in mind?':'We’re all ears.'}</h1><p>${project.id==='mayo'?'For commissions, collaborations, or a friendly hello, leave a note. Tell me a little about your idea.':'Have a question, an idea, or some feedback? Leave a note below.'}</p><div class="client-contact-note">✦ Every good connection starts with a hello.</div></div><form class="client-form"><label>Your name<input name="name" autocomplete="name" required placeholder="What should we call you?" maxlength="100"></label><label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>What’s on your mind?<textarea name="message" required rows="5" maxlength="3000" placeholder="Tell us a little more…"></textarea></label><p class="client-form-note">This is a demo inbox. Your note stays in this session.</p><button class="client-primary" type="submit">Leave a note ↗</button><p class="client-form-status" role="status"></p></form></section>`;
      main.querySelector('form').addEventListener('submit',e=>{
        e.preventDefault();
        const name=new FormData(e.target).get('name');
        e.target.querySelector('[role="status"]').textContent=`Thanks, ${name}! Your demo note has been received here. No email was sent.`;
        e.target.reset();
      });
    }else if(route==='settings' && project.id==='haybuhay'){
      main.innerHTML=`<section class="client-section"><p class="client-eyebrow">MAKE YOURSELF COMFORTABLE</p><h1>Your game. Your pace.</h1><p>Try the game preferences below. These demo settings stay with you while the studio is open.</p><div class="client-preferences"><label>Audio volume <output>${settings.volume}%</output><input type="range" min="0" max="100" value="${settings.volume}" aria-label="Audio volume"></label><label>Background music<input type="checkbox" ${settings.music?'checked':''}></label><label>Graphics quality<select aria-label="Graphics quality"><option>Low</option><option>Medium</option><option>High</option></select></label><p role="status">Preferences are saved automatically for this session.</p></div></section>`;
      const range=main.querySelector('input[type="range"]');
      range.addEventListener('input',()=>{settings.volume=Number(range.value);main.querySelector('output').textContent=range.value+'%';});
      main.querySelector('input[type="checkbox"]').addEventListener('change',e=>{settings.music=e.target.checked;});
      const quality=main.querySelector('select');quality.value=settings.quality;quality.addEventListener('change',()=>{settings.quality=quality.value;});
    }else{
      main.innerHTML=`<section class="client-section"><p class="client-eyebrow">${workLabel.toUpperCase()}</p><h1>${project.id==='mayo'?'Explore for more!':project.id==='yappers'?'Find your kind of people.':'There’s a whole world waiting.'}</h1><p>${s.intro}</p>${cards()}</section>${project.id==='yappers'?'':`<section class="client-section client-approved"><h2>${project.id==='mayo'?'The portfolio':'Inside the game'}</h2><p>Your studio design, brought along for the journey.</p><div class="client-saved-design"></div></section>`}`;
      const level=window.EC_LEVELS.find(l=>l.project===project.id);
      if(level&&main.querySelector('.client-saved-design')){
        const frame=main.querySelector('.client-saved-design');
        const resize=()=>{if(!frame.isConnected){observer.disconnect();return;} const width=frame.clientWidth;if(width)window.EC_EDITOR.renderStatic(frame,level,(profile.designs||{})[level.id]||level.elements,{fitW:width,fitH:width*level.canvas.h/level.canvas.w});};
        const observer=new ResizeObserver(resize);designObserver=observer;observer.observe(frame);resize();
      }
    }
    host.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.route)));
    host.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{
      const detail=main.querySelector('.client-detail');
      const i=Number(button.dataset.detail);
      detail.hidden=false;
      detail.innerHTML=`<button class="client-detail-close" aria-label="Close details">×</button><p class="client-eyebrow">${workLabel.toUpperCase()} / 0${i+1}</p><h2>${s.cards[i]}</h2><p>${project.id==='mayo'?'A playful study in character, color, and storytelling. Interested in a piece with this spirit? Let’s dream up something together.':project.id==='yappers'?'A space to swap ideas and meet people who share your interests. Try leaving a friendly introduction below.':'Follow your curiosity, meet a new friend, and see where the day takes you. Every little discovery is part of the adventure.'}</p>${project.id==='yappers'?'<form class="client-yap"><label>Your introduction<input required maxlength="240" placeholder="Hello, I’m here for…"></label><button class="client-primary">Post introduction</button><p role="status"></p></form>':`<button class="client-primary" data-detail-contact>Let’s talk ↗</button>`}`;
      detail.querySelector('.client-detail-close').addEventListener('click',()=>{detail.hidden=true;button.focus();});
      detail.querySelector('[data-detail-contact]')?.addEventListener('click',()=>navigate('contact'));
      detail.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();detail.querySelector('[role="status"]').textContent='Your introduction: '+e.target.querySelector('input').value;e.target.reset();});
      detail.scrollIntoView({behavior:'smooth',block:'nearest'});
    }));
  }
  // Levels 4–7: the player's real design is the site. Its menu links open that page (same header or
  // sidebar, colors and fonts; only the content area changes) and its buttons answer like a demo.
  // A little something on each menu page (levels 4–7), keyed by the link text.
  const PAGES={
    antoks:{Delivery:['Hot, crispy and on its way!','Order before 7 PM for same-day delivery anywhere in the city.',['🛵 Free delivery on orders over 500 PHP','⏱️ 30–45 minutes, still crunchy','🍗 Lechong Manok travels best whole']],
      About:['From one grill to your table.','Antoks Manoks started as a single charcoal grill on a busy corner. Same family recipe, same smoky skin, now with a lot more chickens.',['🔥 Charcoal-grilled every morning','🧄 Garlic, lemongrass and a secret sauce','❤️ Family-run since day one']]},
    cones:{Learn:['How your eyes see color','Your eyes have three kinds of cones: red, green and blue. When one works differently, some colors get hard to tell apart.',['👁️ About 1 in 12 men see color differently','🎨 Red and green are the most common mix-up','✅ Good contrast helps everyone']],
      Tools:['Try it yourself','Play with our tools to see the world through different eyes.',['🔬 Color blindness simulator','🧪 Quick color vision test','🖍️ Palette checker for designers']],
      About:['Made for every kind of eye.','Cones is a small team of designers and eye-care fans making color easier to understand.',['💡 Free to use, always','📚 Made with eye doctors','🌈 For people who see color differently']]},
    kolehiyo:{'My Profile':['Dela Cruz, Juan','BS Entertainment and Multimedia Computing · 3rd Year',['🎓 Student no. 2025-04127','📧 juan.delacruz@klpp.edu.ph','🏠 Pitipiw Piw City']],
      Enrollment:['You’re enrolled!','First Semester, A.Y. 2027–2028. 24 units, all set.',['✅ Fees paid','✅ Subjects confirmed','📄 Download your registration form']],
      Schedule:['This week','Classes from Monday to Friday.',['MON 8:00 · Game Design 2','TUE 10:00 · 3D Animation','WED 1:00 · UI/UX Design','THU 8:00 · Audio for Games','FRI 3:00 · Capstone 1']],
      Grades:['Last semester','General Weighted Average: 1.75. Nice work!',['Game Design 1 · 1.50','Digital Illustration · 1.75','Web Development · 2.00','Physical Education · 1.25']],
      Documents:['Your files','Request school documents in a few clicks.',['📄 Certificate of Enrollment','📄 Transcript of Records','📄 Good Moral Certificate']],
      Announcements:['What’s new','News from around campus.',['📣 Enrollment for 2nd sem opens on Dec 1','🎮 Game Jam this Friday at the Media Lab','🌧️ No classes if typhoon signal no. 2 is raised']]}};
  function renderDesign(frame,level,elements,route,navigate,fit,status){
    const navs=elements.filter(e=>e.role==='nav'&&e.text);
    const home=navs[0]?.id;
    const say=t=>{status.textContent=t;};
    const nodes={};
    window.EC_EDITOR.renderStatic(frame,level,elements,Object.assign({},fit,{onElement:(node,el)=>{
      nodes[el.id]=node;
      const go=action=>{node.setAttribute('role','button');node.tabIndex=0;node.style.cursor='pointer';node.addEventListener('click',action);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});};
      if(el.role==='nav'&&el.text){go(()=>navigate(el.id===home?'home':el.id));if((route==='home'?home:route)===el.id)node.setAttribute('aria-current','page');}
      else if(el.role==='button'&&el.text&&level.levelNumber!==7)go(()=>say(`“${el.text}” works in the full site. This preview is just for looking around.`));
    }}));
    if(route==='home'||!navs.length)return;
    const page=navs.find(n=>n.id===route); if(!page)return;
    // The menu's "you are here" highlight (e.g. Kolehiyo's blue pill) moves to this link, colors swapped.
    const hl=elements.find(e=>!e.text&&e.role!=='nav'&&e.y<=navs[0].y&&e.y+e.h>=navs[0].y+navs[0].h&&e.x<=navs[0].x&&e.x+e.w>=navs[0].x+navs[0].w&&e.w*e.h<level.canvas.w*level.canvas.h*.1);
    if(hl&&nodes[hl.id]){nodes[hl.id].style.transform=`translate(${page.x-navs[0].x}px,${page.y-navs[0].y}px)`;
      if(nodes[page.id])nodes[page.id].style.color=navs[0].color; if(nodes[navs[0].id])nodes[navs[0].id].style.color=page.color;}
    // Content area: below a top menu, or right of a side menu.
    const L=Math.min(...navs.map(n=>n.x)),T=Math.min(...navs.map(n=>n.y)),R=Math.max(...navs.map(n=>n.x+n.w)),B=Math.max(...navs.map(n=>n.y+n.h));
    const side=B-T>R-L,W=level.canvas.w,H=level.canvas.h;
    const area=side?{x:R+24,y:T-24,w:W-R-48,h:H-T}:{x:0,y:B+24,w:W,h:H-B-24};
    // A side menu's own panel stays whole: start the content right after it.
    if(side){const panel=elements.filter(e=>!e.text&&e.x<=L&&e.x+e.w>=R&&e.y<=T&&e.y+e.h>=B&&e.w<W/2).sort((a,b)=>b.x+b.w-a.x-a.w)[0];if(panel&&panel.x+panel.w>area.x){const d=panel.x+panel.w-area.x;area.x+=d;area.w-=d;}}
    elements.forEach(e=>{const big0=e.w*e.h>W*H*.6;if(!big0&&e.x>=area.x-24&&e.y<area.y&&e.y+e.h>area.y&&e.y>(side?0:B)){const d=area.y-e.y;area.y-=d;area.h+=d;}});
    const inner=frame.firstChild?.firstChild; if(!inner)return;
    // The content area is covered with the page's own background (the solid shape under its middle).
    const cx=area.x+area.w/2,cy=area.y+area.h/2, solid=e=>!e.text&&!e.src&&typeof e.bg==='string'&&/^#/.test(e.bg);
    const under=elements.filter(e=>solid(e)&&e.x<=cx&&e.x+e.w>=cx&&e.y<=cy&&e.y+e.h>=cy).sort((a,b)=>b.w*b.h-a.w*a.h)[0];
    const bg=under?.bg||level.canvas.bg, C=window.WCAG.contrastRatio;
    const texts=elements.filter(e=>e.text&&/^#/.test(e.color||''));
    const readable=texts.filter(e=>C(e.color,bg)>=4.5);
    const head=(readable.length?readable:texts).slice().sort((a,b)=>b.fontSize-a.fontSize)[0]||{};
    const body=readable.find(e=>e.fontSize<=24)||head;
    const box=document.createElement('div');
    box.style.cssText=`position:absolute;left:${area.x}px;top:${area.y}px;width:${area.w}px;height:${area.h}px;box-sizing:border-box;padding:48px 64px;background:${bg};z-index:999;font-family:"${body.fontFamily||'Quicksand'}",sans-serif;color:${body.color||'#222'};`;
    const contact=/contact|help/i.test(page.text);
    box.innerHTML=`<h1 style="margin:0 0 24px;font:${head.fontWeight||700} ${Math.max(48,Math.min(64,head.fontSize||48))}px/1.1 '${head.fontFamily||'Quicksand'}',sans-serif;color:${head.color||'inherit'}"></h1><p style="margin:0 0 32px;font-size:28px;line-height:1.5"></p>`+
      (contact?`<form style="display:grid;gap:16px;max-width:800px;font-size:24px"><input required placeholder="Your name" style="font:inherit;padding:16px;border:2px solid currentColor;border-radius:12px;background:#fff8;color:inherit"><textarea required rows="3" placeholder="Your message" style="font:inherit;padding:16px;border:2px solid currentColor;border-radius:12px;background:#fff8;color:inherit"></textarea><button style="justify-self:start;font:inherit;font-weight:700;padding:12px 32px;border:0;border-radius:12px;background:${head.color||'#333'};color:#fff;cursor:pointer">Send</button></form>`:'');
    const fun=(PAGES[level.project]||{})[page.text];
    box.querySelector('h1').textContent=fun?fun[0]:page.text;
    box.querySelector('p').textContent=fun?fun[1]:contact?'Questions or orders? Leave a note and we’ll get back to you.':`Nothing new on ${page.text} yet. Check back soon!`;
    if(fun){const ul=document.createElement('ul');ul.style.cssText='margin:0;padding:0;list-style:none;display:grid;gap:16px;font-size:28px;';fun[2].forEach(t=>{const li=document.createElement('li');li.textContent=t;li.style.cssText='padding:16px 24px;border-radius:16px;background:#ffffff99;';ul.appendChild(li);});box.appendChild(ul);}
    // Inside a card styled like the page's own (e.g. Kolehiyo's white rounded panels), when it has one.
    const cardEl=elements.filter(e=>solid(e)&&e!==under&&e.x>=area.x-24&&e.y>=area.y-24&&e.w*e.h<W*H*.5&&e.w>200&&e.h>120&&C(e.bg,body.color||'#222')>=4.5).sort((a,b)=>b.w*b.h-a.w*a.h)[0];
    if(cardEl){const card=document.createElement('div');card.style.cssText=`background:${cardEl.bg};border-radius:${cardEl.radius||0}px;padding:48px 64px;${cardEl.shadow?.enabled?`box-shadow:0 4px ${cardEl.shadow.blur}px ${cardEl.shadow.color};`:''}`;
      card.append(...box.childNodes);box.appendChild(card);box.style.padding='32px';box.querySelectorAll('li').forEach(li=>li.style.background=bg);}
    box.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();say('Thanks! Your demo message was received here. Nothing was sent.');e.target.reset();});
    inner.appendChild(box);
  }
  window.EC_CLIENT_SITES={render,renderDesign,fill};
})();
