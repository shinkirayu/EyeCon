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
        window.EC_EDITOR.renderStatic(frame,level,elements,{fitW:width,fitH:width*level.canvas.h/level.canvas.w,onElement:(node,el)=>{
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
      main.innerHTML=`<section class="client-section"><p class="client-eyebrow">${workLabel.toUpperCase()}</p><h1>${project.id==='mayo'?'Explore for more!':project.id==='yappers'?'Find your kind of people.':'There’s a whole world waiting.'}</h1><p>${s.intro}</p>${cards()}</section><section class="client-section client-approved"><h2>${project.id==='mayo'?'The portfolio':project.id==='yappers'?'A familiar welcome':'Inside the game'}</h2><p>Your studio design, brought along for the journey.</p><div class="client-saved-design"></div></section>`;
      const level=window.EC_LEVELS.find(l=>l.project===project.id);
      if(level){
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
  window.EC_CLIENT_SITES={render};
})();
