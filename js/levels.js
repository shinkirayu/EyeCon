/* =====================================================
   EyeCon — Client projects and their pages
   Emails arrive from a mix of clients, and each client sends its own
   website one page at a time (homepage first), coming back later for
   the next page. Every page has plain-language goals: required ones get
   the work approved, bonus ones earn extra stars. New clients only write
   in once you've collected enough 4★+ reviews.
   Exposes window.EC_LEVELS, window.EC_PROJECTS, window.EC_ROLE_DEFAULTS
===================================================== */
(function(){

  // Fallback typography scale used by the grading engine & the
  // in-editor "Type Scale" reference panel, unless a level overrides a role.
  const ROLE_DEFAULTS = {
    heading:    { minSize:28, maxSize:46 },
    subheading: { minSize:18, maxSize:26 },
    body:       { minSize:14, maxSize:17 },
    small:      { minSize:12, maxSize:13 },
    button:     { minSize:14, maxSize:20, minW:88, minH:44 },
    nav:        { minSize:14, maxSize:17, minW:44, minH:44 },
    label:      { minSize:12, maxSize:14 },
  };

  // needsGood = how many different pages you need rated 4★ or better before
  // this client writes in. pay = coins for an approved page; each bonus
  // star adds a quarter of that on top.
  const PROJECTS = [
    // Figma clients come first: levels 1, 2, 3, then Brewbird as level 4, then 5 and 6.
    { id:'mayo',       name:'Mayonnaisegee',       avatarEmoji:'<img src="assets/sprites/Mayonaisse.png" alt="">', tier:'novice', needsGood:0, pay:40 },
    { id:'yappers',    name:'Yappers.com',         avatarEmoji:'<img src="assets/sprites/Yappers.png" alt="">', tier:'novice', needsGood:1, pay:50 },
    { id:'haybuhay',   name:'Hay Buhay 3',         avatarEmoji:'<img src="assets/sprites/haybuhay3.png" alt="">', tier:'novice',       needsGood:2,  pay:55 },
    { id:'brewbird',   name:'Brewbird Coffee Co.', avatarEmoji:'☕', tier:'novice',       needsGood:3,  pay:40 },
    { id:'cones',      name:'Cones',               avatarEmoji:'<img src="assets/sprites/cones.png" alt="">', tier:'intermediate', needsGood:4, pay:65 },
    { id:'kolehiyo',   name:'Kolehiyo ng Lungsod ng Pitipiw Piw', avatarEmoji:'<img src="assets/sprites/pitipiwpyiw.png" alt="">', tier:'intermediate', needsGood:5, pay:70 },
    { id:'thread',     name:'Thread & Co.',        avatarEmoji:'👕', tier:'novice',       needsGood:6,  pay:55 },
    { id:'cedar',      name:'Cedar Valley School', avatarEmoji:'🎒', tier:'intermediate', needsGood:7,  pay:70 },
    { id:'almel',      name:"Almel's Canteen",     avatarEmoji:'🍱', tier:'intermediate', needsGood:8,  pay:85 },
    { id:'willowmere', name:'Willowmere Clinic',   avatarEmoji:'🏥', tier:'advanced',     needsGood:10, pay:100 },
    { id:'flockr',     name:'Flockr',              avatarEmoji:'🐦', tier:'advanced',     needsGood:12, pay:120 },
    { id:'meridian',   name:'Meridian Bank',       avatarEmoji:'🏦', tier:'expert',       needsGood:13, pay:140 },
    { id:'nimbus',     name:'Nimbus Goods',        avatarEmoji:'🛒', tier:'expert',       needsGood:15, pay:160 },
  ];

  // Compact builders for the page artwork.
  const txt = (id, role, text, x, y, w, h, fontSize, color, o={}) => Object.assign(
    { id, type:'text', role, text, x, y, w, h, fontFamily:'Quicksand', fontSize, fontWeight:'600', color, bg:null, align:'left', z:2 }, o);
  const btn = (id, text, x, y, w, h, fontSize, color, bg, o={}) => Object.assign(
    { id, type:'rect', role:'button', text, x, y, w, h, fontFamily:'Baloo 2', fontSize, fontWeight:'700', color, bg, radius:8, align:'center', z:3 }, o);
  const shape = (id, role, x, y, w, h, bg, o={}) => Object.assign({ id, type:'rect', role, x, y, w, h, bg, locked:true, z:1 }, o);
  // Artwork layer exported from Figma (locked unless o says otherwise); bgSize/bgPos crop it.
  const img = (id, src, x, y, w, h, o={}) => shape(id, 'decorative', x, y, w, h, null, Object.assign({ src, z:2 }, o));
  // Goals: label is the to-do, why explains the design reason once it's met,
  // tip says which control to use. Bonus goals each add a star.
  const goal = (label, check, why, tip, bonus=false) => ({ label, check, why, tip, bonus });
  const bonus = (label, check, why, tip) => goal(label, check, why, tip, true);

  // Pages are listed in the order they arrive: consecutive emails come from
  // different clients, and earlier clients come back with their next page.
  // levelNumber is the skill stage: it decides which editing tools are open
  // (1 position + text alignment, 2 size, 3 type, 4 color, 5+ everything).
  const LEVELS = [
    // ---- Figma client levels (1, 2, 3, 5, 6) ----
    {
      id:'mayo-portfolio', project:'mayo', levelNumber:1, tools:['position'], pageLabel:'Portfolio', concept:'Even spacing',
      emailPreview:'I want my UI fixed. The spacing is inconsistent.',
      emailBody:`Good day,

I want my UI fixed. There is inconsistency in the spacing between elements.

I have an urgent deadline.

Thanks.
— Mayonnaisegee`,
      attachmentName:'mayonnaisegee_portfolio.png',
      canvas:{ w:1920, h:1080, bg:'#C9EEFF' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:8, weights:{ spacing:30 } },
      elements:[
        shape('bg','background',0,0,1920,1080,'#C9EEFF',{z:0}),
        img('art','assets/levels/mayo/art-strips.png',0,120,1920,960,{bgSize:'100% auto',bgPos:'top'}),
        shape('nav','card',0,0,1920,112,'#FFFFFF'),
        txt('logo','heading','Mayonnaisegee',104,32,376,48,36,'#1B1E93',{fontFamily:'Autour One',fontWeight:'400',locked:true}),
        txt('home','nav','Home',1560,40,80,32,24,'#1B1E93',{fontFamily:'Roboto Slab',fontWeight:'400',locked:true}),
        txt('about','nav','About',1656,40,88,32,24,'#1B1E93',{fontFamily:'Roboto Slab',fontWeight:'400',locked:true}),
        txt('contact','nav','Contact',1756,40,120,32,24,'#1B1E93',{fontFamily:'Roboto Slab',fontWeight:'400',locked:true}),
        txt('title','heading','Explore for more!',368,208,384,48,36,'#1B1E93',{fontFamily:'Autour One',fontWeight:'400',align:'center'}),
        img('card1','assets/levels/mayo/card1.png',192,280,184,464,{locked:false,z:3}),
        img('card2','assets/levels/mayo/card2.png',456,280,184,464,{locked:false,z:3}),
        img('card3','assets/levels/mayo/card3.png',688,304,184,464,{locked:false,z:3}),
        img('insta','assets/levels/mayo/instagram.png',432,784,48,48,{locked:false,z:3}),
        img('illus','assets/levels/mayo/illustration.png',496,784,56,48,{locked:false,z:3}),
        img('tumblr','assets/levels/mayo/tumblr.png',600,784,48,48,{locked:false,z:3}),
        txt('caption','body','🇵🇭 Fine Arts Student • Storyboard Artist • Illustrator',224,848,616,32,24,'#1B1E93',{fontFamily:'Roboto Slab',fontWeight:'400',align:'center'}),
        img('banner','assets/levels/mayo/banner.png',80,920,896,88),
      ],
      goals:[
        goal('Space the three artwork cards evenly.', {evenGapsX:['card1','card2','card3']},
          'Equal gaps make the cards read as one tidy set instead of a random pile.',
          'Make the gap between cards 1 and 2 match the gap between cards 2 and 3.'),
        goal('Put the three cards on the same line.', {sameY:['card1','card2','card3']},
          'Cards that share a top edge look like a row, so the eye moves across them smoothly.',
          'Give all three cards the same Y number.'),
        goal('Space the three social icons evenly.', {evenGapsX:['insta','illus','tumblr']},
          'Evenly spaced icons look like one group of links.',
          'Match the gap on both sides of the middle icon.'),
        bonus('Center "Explore for more!" over the caption.', {sameCenterX:['title','caption']},
          'A shared center line ties the heading and caption to the cards between them.',
          "Move the title until its center matches the caption's center."),
      ],
      replyTemplates:{
        great:'Wow, it finally looks clean! Just in time for my deadline. Thank you!',
        ok:'Better, thanks. Still a little uneven in places.',
        bad:"The spacing still looks off. Can you take another look?"
      }
    },
    {
      id:'yappers-login', project:'yappers', levelNumber:2, tools:['color'], pageLabel:'Login screen', concept:'Readable colors',
      emailPreview:'Commission: Yappers.com Login Screen UI Update',
      emailFrom:'Yappers.com Product Design Team', emailSubject:'Commission: Yappers.com Login Screen UI Update',
      emailBody:`Greetings,

We're commissioning you to help refresh the Yappers.com login screen. Our review found that the input labels, placeholder text, and error messages currently fail the WCAG 2.2 minimum 4.5:1 contrast ratio.

Please update these elements to meet accessibility requirements while keeping the interface clean, friendly, and unmistakably Yappers.

We're looking forward to seeing your take on the updated login experience. Please share the revised designs with the team once they're ready for review.

Thanks, and happy yapping!

Best regards,
Yappers.com Product Design Team`,
      attachmentName:'yappers_login.png',
      canvas:{ w:1920, h:1080, bg:'#FFF9E1' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:8, weights:{ contrast:30 } },
      elements:[
        shape('bg','background',0,0,1920,1080,'#FFF9E1',{z:0}),
        img('feet','assets/levels/yappers/feet.png',0,8,1920,1072),
        shape('card','card',272,144,1376,776,'#FFFFFF',{radius:32,z:2,shadow:{enabled:true,blur:24,color:'rgba(160,120,40,.35)'}}),
        img('duck','assets/levels/yappers/duck.png',328,184,560,680,{z:3}),
        txt('title','heading','Welcome Bak!',1104,240,344,80,64,'#FFEA96',{fontFamily:'Londrina Solid',fontWeight:'400',z:4}),
        shape('input1','card',1040,360,456,56,'#FFFFFF',{radius:16,border:{width:1,style:'solid',color:'#000000'},z:3}),
        shape('input2','card',1040,448,456,56,'#FFFFFF',{radius:16,border:{width:1,style:'solid',color:'#000000'},z:3}),
        txt('user','label','Phone, username, or email ...',1048,376,400,24,16,'#E7E7E7',{fontFamily:'Niramit',z:4}),
        txt('pass','label','Password',1048,464,400,24,16,'#E7E7E7',{fontFamily:'Niramit',z:4}),
        txt('forgot','small','Forgot Password?',1048,512,448,24,16,'#0060D6',{fontFamily:'Niramit',align:'right',locked:true,z:4}),
        btn('login','Log in',1040,552,456,72,36,'#CDCDCD','#EDC45C',{fontFamily:'Londrina Solid',fontWeight:'300',radius:32,z:4}),
        txt('or','small','or continue with',1200,648,120,24,15,'#C2C1C1',{fontFamily:'Niramit',fontWeight:'500',align:'center',z:4}),
        img('line1','assets/levels/yappers/line.svg',1024,656,160,8,{bgSize:'100% 1px',z:3}),
        img('line2','assets/levels/yappers/line.svg',1320,656,160,8,{bgSize:'100% 1px',z:3}),
        shape('c1','decorative',1168,688,56,56,'#FFFFFF',{radius:28,border:{width:1,style:'solid',color:'#C2C1C1'},z:3}),
        shape('c2','decorative',1232,688,56,56,'#FFFFFF',{radius:28,border:{width:1,style:'solid',color:'#C2C1C1'},z:3}),
        shape('c3','decorative',1296,688,56,56,'#FFFFFF',{radius:28,border:{width:1,style:'solid',color:'#C2C1C1'},z:3}),
        img('facebook','assets/levels/yappers/facebook.png',1184,704,24,24,{z:4}),
        img('google','assets/levels/yappers/google.png',1248,704,24,24,{z:4}),
        img('apple','assets/levels/yappers/apple.png',1312,704,24,24,{z:4}),
      ],
      goals:[
        goal('Make "Welcome Bak!" readable on the white card.', {contrast:'AA', ids:['title']},
          'Pale yellow on white almost disappears. Big text still needs at least 3:1 contrast.',
          'Pick a darker text color in Color.'),
        goal('Make both placeholder texts pass 4.5:1.', {contrast:'AA', ids:['user','pass']},
          'Light grey placeholders are hard to read, especially for people with low vision.',
          'Darken the text color of both placeholders.'),
        goal('Make the "Log in" text readable on its button.', {contrast:'AA', ids:['login']},
          'If people cannot read the main button, they cannot log in.',
          'Change the text color or the button color until it passes.'),
        bonus('Make "or continue with" readable too.', {contrast:'AA', ids:['or']},
          'Small helper text needs the full 4.5:1, not just the big stuff.',
          'Darken its text color.'),
      ],
      replyTemplates:{
        great:'Clean, friendly and readable. That is unmistakably Yappers. Happy yapping!',
        ok:'Much easier to read, thanks. A few bits are still faint.',
        bad:'Some text still fails contrast. Could you have another go?'
      }
    },
    {
      id:'haybuhay-settings', project:'haybuhay', levelNumber:3, tools:['typography'], pageLabel:'Settings screen', concept:'Text sizes',
      emailPreview:'Settings screen in Hay Buhay 3 needs your help (ASAP, please!)',
      emailFrom:'Dan, Lead Developer at Hay Buhay 3', emailSubject:'Settings screen in Hay Buhay 3 needs your help (ASAP, please!)',
      emailBody:`Hi there,

This is Hay Buhay 3! We'd like to task you with a rescue mission. I built the settings screen at 3 a.m. after too much coffee, and it shows.

Labels, helper text, and values all look the same right now, so players don't know where to look. Please give each its own size, weight, and color. Also, my line-height is under 1.2x and everything feels crammed like a jeepney at rush hour, so please open up the spacing.

Keep it warm and calm, not like a tax form, and make sure contrast works for weaker eyesight and smaller laptop screens. You're free to regroup sections or change controls if you explain why.

Send me a mockup or short screen recording by Friday. Rough is fine, I just want to see your thinking. Ask me anything, salamat!

Mabuhay,
Dan
Lead Developer, Hay Buhay 3`,
      attachmentName:'haybuhay3_settings.png',
      canvas:{ w:1920, h:1080, bg:'#1A0A22' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:8, weights:{ hierarchy:30 } },
      elements:[
        img('photo','assets/levels/haybuhay/photo.png',0,0,1920,1080,{bgSize:'cover',z:0}),
        shape('shade','decorative',0,0,1920,1080,'rgba(0,0,0,.5)'),
        shape('outer','card',552,56,808,968,'linear-gradient(180deg,#7E5590,#6C248A)',{radius:48,z:2}),
        shape('inner','card',576,88,768,912,'radial-gradient(circle,#D87EFF,#AB4FD2)',{radius:40,z:3}),
        ...[[640,'#D397EC',96,'settings'],[752,null,128,'graphics'],[864,null,128,'audio'],[976,null,128,'music'],[1080,null,128,'video']].flatMap(([x,bg,h,name],i)=>[
          shape('tab'+i,'decorative',x,200,88,h,bg || 'linear-gradient(180deg,#A82ADE,#D573FF)',{radius:16,z:4}),
          img('tabicon'+i,`assets/levels/haybuhay/tab-${name}.png`,x+20,216,48,48,{z:5}),
        ]),
        shape('panel','card',600,288,720,688,'linear-gradient(180deg,#D398EC,#9535BD)',{radius:32,z:6}),
        txt('title','heading','Settings',880,128,200,56,28,'#310032',{fontFamily:'Righteous',fontWeight:'400',z:7}),
        txt('graphics','subheading','Graphics',896,304,200,48,15,'#310032',{fontFamily:'Righteous',fontWeight:'400',z:7}),
        txt('sec1','subheading','Screen Settings',632,344,200,32,15,'#310032',{fontFamily:'Kumbh Sans',fontWeight:'700',z:7}),
        txt('sec2','subheading','Detail Settings',632,448,200,32,15,'#310032',{fontFamily:'Kumbh Sans',fontWeight:'700',z:7}),
        shape('div1','decorative',824,376,480,8,'#310032',{z:7}),
        shape('div2','decorative',816,464,488,8,'#310032',{z:7}),
        shape('sizeBox','decorative',896,408,168,24,'#D9D9D9',{radius:8,z:7}),
        shape('rateBox','decorative',1096,408,168,24,'#D9D9D9',{radius:8,z:7}),
        img('sizeArrow','assets/levels/haybuhay/arrow.svg',1056,432,24,24,{z:8}),
        img('rateArrow','assets/levels/haybuhay/arrow.svg',1256,432,24,24,{z:8}),
        txt('size','label','Screen Size',896,384,160,24,15,'#310032',{fontFamily:'Kumbh Sans',fontWeight:'700',locked:true,z:7}),
        txt('rate','label','Screen Refresh Rate',1096,384,200,24,15,'#310032',{fontFamily:'Kumbh Sans',fontWeight:'700',locked:true,z:8}),
        txt('sizeVal','small','1080 x 1920',904,408,152,24,14,'#310032',{fontFamily:'Righteous',fontWeight:'400',locked:true,z:8}),
        txt('rateVal','small','Default',1104,408,152,24,14,'#310032',{fontFamily:'Righteous',fontWeight:'400',locked:true,z:8}),
        txt('hz','small','Hz',1272,408,24,24,14,'#310032',{fontFamily:'Righteous',fontWeight:'400',locked:true,z:8}),
        // Checkbox, label, and whether Figma shows it ticked.
        ...[['opt1','Enable Full Screen Mode',656,400,688,400,true],['opt2','Enable Object Hiding',672,504,704,512,true],['opt3','Enable Reflections',672,552,704,560,false],
            ['opt4','Enable Animation Smoothing',1016,504,1056,512,true],['opt5','Enable Advance Rendering',1016,552,1056,560,false]].flatMap(([id,t,bx,by,x,y,ticked])=>[
          shape(id+'box','decorative',bx,by,32,32,'#D9D9D9',{radius:8,z:7}),
          ...(ticked ? [img(id+'check','assets/levels/haybuhay/check.svg',bx-8,by-8,48,48,{bgSize:'70% auto',z:8})] : []),
          txt(id,'label',t,x,y,256,24,15,'#310032',{fontFamily:'Kumbh Sans',fontWeight:'700',z:7}),
        ]),
        // Slider label, bar and star knob.
        ...[['s1','Edge Smoothing',680,600,688,640,736],['s2','Visual Effects',680,672,688,712,736],['s3','Lighting and Shadows',680,752,688,784,736],['s4','Tree Detail',680,824,672,864,736],
            ['s5','Draw Distance',1056,600,1072,640,1112],['s6','High Detail Lots',1056,672,1072,712,1112],['s7','Texture Detail',1056,752,1072,784,1112],['s8','Character Detail',1056,824,1056,864,1112]].flatMap(([id,t,x,y,bx,by,sx])=>[
          txt(id,'label',t,x,y,240,24,15,'#310032',{fontFamily:'Kumbh Sans',fontWeight:'700',z:7}),
          shape(id+'bar','decorative',bx,by,200,8,'#CE92E8',{border:{width:1,style:'solid',color:'#310032'},radius:4,z:7}),
          img(id+'star','assets/levels/haybuhay/star.svg',sx,by-24,32,56,{z:8}),
        ]),
        // Close (X) and confirm (check) buttons in the top-right corner.
        img('ring1','assets/levels/haybuhay/ring1.svg',1288,32,136,136,{z:7}),
        img('ring2','assets/levels/haybuhay/ring2.svg',1296,40,104,104,{z:8}),
        img('ring3','assets/levels/haybuhay/ring3.svg',1216,24,104,104,{z:7}),
        img('ring4','assets/levels/haybuhay/ring4.svg',1224,40,72,72,{z:8}),
        img('confirm','assets/levels/haybuhay/check.svg',1288,56,80,80,{bgSize:'60% auto',z:9}),
        img('close','assets/levels/haybuhay/x.svg',1224,48,48,48,{bgSize:'60% auto',z:9}),
        btn('restore','Restore Defaults',872,904,184,48,20,'#310032','#E3B2F5',{fontFamily:'Righteous',fontWeight:'400',radius:16,locked:true,z:7}),
      ],
      goals:[
        goal('Make "Screen Settings" and "Detail Settings" at least 20px.', {minFont:20, ids:['sec1','sec2']},
          'Section headings need to stand out from the options under them, so players can find their place.',
          'Raise their font size in Text.'),
        goal('Make "Graphics" bigger than "Screen Settings".', {bigger:['graphics','sec1']},
          'The page title should be the biggest thing in the panel, then sections, then options.',
          'Give Graphics a larger font size than the section headings.'),
        goal('Make the five checkbox labels at least 16px.', {minFont:16, ids:['opt1','opt2','opt3','opt4','opt5']},
          'Tiny labels are hard to read on small laptop screens.',
          'Bump each option label up to 16px or more.'),
        bonus('Make all eight slider labels at least 16px.', {minFont:16, ids:['s1','s2','s3','s4','s5','s6','s7','s8']},
          'Matching sizes across every slider keeps the screen calm and consistent.',
          'Raise each slider label to 16px.'),
        bonus('Make the "Settings" title 36px or bigger.', {minFont:36, ids:['title']},
          'A confident title tells players exactly which screen they are on.',
          'Increase the title font size.'),
      ],
      replyTemplates:{
        great:'Salamat! Players can finally tell where to look. Hay Buhay 3 feels so much calmer.',
        ok:'Better! Some text still blends together, though.',
        bad:'Still feels like a tax form. Everything is the same size.'
      }
    },
    {
      id:'cones-landing', project:'cones', levelNumber:5, tools:['color'], pageLabel:'Landing page', concept:'Readable colors',
      emailPreview:'Our colour-blindness site is hard to read. Ironic, right?',
      emailBody:`Hi!

We run Cones, a small site that helps people understand colour blindness. Embarrassingly, a visitor told us parts of our own landing page are hard to read.

The orange headline fades into the cream background, the "Try the simulator" button text is almost invisible, and the little tagline above the headline is too pale.

Could you fix the colours so everything passes WCAG AA, while keeping our bright orange and blue look?

Thanks for helping everyone see clearly,
— The Cones Team`,
      attachmentName:'cones_landing.png',
      canvas:{ w:1920, h:1080, bg:'#F8F2D8' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:8, weights:{ contrast:30 } },
      elements:[
        shape('bg','background',0,0,1920,1080,'#F8F2D8',{z:0}),
        shape('nav','card',0,0,1920,152,'#1400C3'),
        img('eye','assets/levels/cones/eye.png',40,24,104,104,{z:2}),
        txt('logo','heading','Cones',160,48,200,56,32,'#F8F2D8',{fontFamily:'Boldonse',fontWeight:'400',locked:true}),
        ...[['Home',1352],['Learn',1472],['Tools',1600],['About',1792]].map(([t,x],i)=>txt('nav'+i,'nav',t,x,56,112,40,32,'#F8F2DA',{fontFamily:'Sansation',fontWeight:'700',locked:true})),
        txt('tagline','subheading','Color vision awareness',88,208,400,32,24,'#9D95FF',{fontFamily:'Sansation',fontWeight:'700'}),
        txt('headline','heading','See the world through different eyes!',88,256,944,240,64,'#FF8A4F',{fontFamily:'Boldonse',fontWeight:'400'}),
        txt('para','body','Around 1 in 12 men and 1 in 200 women see colour differently. Explore how everyday colours look through their eyes.',88,512,880,136,32,'#1400C3',{fontFamily:'Sansation',fontWeight:'400',locked:true}),
        btn('sim','Try the simulator',88,656,472,112,36,'#FFD9C4','#FF4E02',{fontFamily:'Sansation',radius:56}),
        btn('test','Take test',600,656,376,112,36,'#A9A1FF','#FFFFFF',{fontFamily:'Sansation',radius:56}),
        shape('card1','card',1072,256,392,496,'#FFFFFF',{radius:48,z:2}),
        shape('card2','card',1488,256,392,496,'#FFFFFF',{radius:48,z:2}),
        ...['#E11D48','#16A34A','#F59E0B','#2563EB','#9333EA'].map((c,i)=>shape('t'+i,'decorative',1104+i*66,288,64,352,c,{radius:32,z:3})),
        ...['#B0AE41','#707169','#D5D452','#4848D4','#7675D0'].map((c,i)=>shape('p'+i,'decorative',1520+i*66,288,64,352,c,{radius:32,z:3})),
        txt('typical','subheading','Typical Vision',1104,680,328,40,32,'#1400C3',{fontFamily:'Sansation',fontWeight:'700',align:'center',locked:true,z:3}),
        txt('prota','subheading','Protanopia',1520,680,328,40,32,'#1400C3',{fontFamily:'Sansation',fontWeight:'700',align:'center',locked:true,z:3}),
        txt('types','heading','Types of Color Blindness',88,848,960,64,40,'#FFB38A',{fontFamily:'Boldonse',fontWeight:'400'}),
        ...['#8C7A2B','#A69A57','#2E8B94','#8A8A8A'].map((c,i)=>shape('b'+i,'decorative',88+i*448,952,416,128,c,{radius:32,z:1})),
      ],
      goals:[
        goal('Make the headline readable on the cream background.', {contrast:'AA', ids:['headline']},
          'Light orange on cream fails even the 3:1 rule for big text.',
          'Pick a deeper orange or a dark color in Color.'),
        goal('Make "Try the simulator" readable on its orange button.', {contrast:'AA', ids:['sim']},
          'The main call to action is useless if nobody can read it.',
          'Change the button text or its background color.'),
        goal('Make the "Color vision awareness" tagline readable.', {contrast:'AA', ids:['tagline']},
          'Pale lavender on cream is hard to see, especially for low vision.',
          'Darken the tagline color.'),
        bonus('Make "Take test" readable too.', {contrast:'AA', ids:['test']},
          'The second button should be just as readable as the first.',
          'Darken its text color.'),
        bonus('Make "Types of Color Blindness" readable.', {contrast:'AA', ids:['types']},
          'Section titles guide people down the page, so they must be easy to see.',
          'Give it a darker color.'),
      ],
      replyTemplates:{
        great:'Everything pops and passes now. Exactly what a colour-blindness site should look like!',
        ok:'Much better, thanks. A couple of bits are still faint.',
        bad:'Some text is still hard to read. That is a bad look for us!'
      }
    },
    {
      id:'kolehiyo-dashboard', project:'kolehiyo', levelNumber:6, tools:['typography'], pageLabel:'Student dashboard', concept:'Text sizes',
      emailPreview:"Our student dashboard's numbers are smaller than their labels.",
      emailBody:`Good day!

This is the IT office of Kolehiyo ng Lungsod ng Pitipiw Piw. Students keep telling us our new dashboard is confusing.

The stat cards shout "GWA", "UNITS" and "ENROLLMENT" in big letters, but the actual numbers are smaller than the labels, so nobody notices their grades. The welcome message is also tiny compared to the date above it.

Could you fix the text sizes so the important information stands out first?

Maraming salamat,
— Kolehiyo IT Office`,
      attachmentName:'kolehiyo_dashboard.png',
      canvas:{ w:1920, h:1080, bg:'#011E60' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:8, weights:{ hierarchy:30 } },
      elements:[
        shape('bg','background',0,0,1920,1080,'linear-gradient(180deg,#011E60,#023EC6)',{z:0}),
        shape('main','card',248,0,1640,1080,'#DADADA',{radius:32,z:1}),
        shape('side','card',104,0,384,1080,'#F2F1EF',{radius:32,z:2}),
        img('logo','assets/levels/kolehiyo/logo.png',104,56,128,96,{bgSize:'contain',z:4}),
        txt('school','small','Kolehiyo ng Lungsod ng Pitipiw Piw',240,64,200,80,24,'#011E60',{fontFamily:'Niramit',fontWeight:'600',locked:true,z:3}),
        img('schoolArrow','assets/levels/kolehiyo/chevron.svg',440,48,24,24,{z:4}),
        shape('navhl','decorative',32,176,456,88,'linear-gradient(90deg,#011E60,#023EC6)',{radius:24,z:3}),
        ...[['Dashboard',208,'home.svg'],['My Profile',272,'user.png'],['Enrollment',344,'pen.png'],['Schedule',424,'calendar.svg'],['Grades',496,'book.png'],['Documents',568,'docs.png'],['Announcements',640,'marketing.png'],['Help',712,'help.svg']].flatMap(([t,y,icon],i)=>[
          txt('nav'+i,'nav',t,160,y,280,40,24,i ? '#011E60' : '#FFFFFF',{fontFamily:'Niramit',fontWeight:'600',locked:true,z:4}),
          img('navicon'+i,`assets/levels/kolehiyo/icon-${icon}`,40,y,40,40,{z:4}),
        ]),
        img('bell','assets/levels/kolehiyo/bell.svg',1464,72,48,48,{z:3}),
        img('juan','assets/levels/kolehiyo/juan.png',1536,48,88,88,{radius:44,bgSize:'cover',z:3}),
        txt('name','subheading','Dela Cruz, Juan',1632,64,240,32,24,'#011E60',{fontFamily:'Niramit',fontWeight:'500',locked:true,z:3}),
        txt('year','small','3rd Year',1632,96,120,32,20,'#6A6A6A',{fontFamily:'Niramit',fontWeight:'500',locked:true,z:3}),
        shape('hero','card',512,168,1336,296,'linear-gradient(90deg,#011E60,#023EC6)',{radius:32,z:3}),
        txt('date','small','Wednesday, July 07, 2027',560,184,400,40,28,'#FFFFFF',{fontFamily:'Liter',fontWeight:'400',z:4}),
        txt('welcome','heading','Welcome Back, Juan!',608,288,720,64,24,'#FFFFFF',{fontFamily:'Niramit',fontWeight:'700',z:4}),
        txt('program','body','BS Entertainment and Multimedia Computing | 3rd Year',696,360,720,32,14,'#FFFFFF',{fontFamily:'Niramit',fontWeight:'500',z:4}),
        shape('stat1','card',512,488,200,128,'#FFFFFF',{radius:24,z:3}),
        shape('stat2','card',744,488,200,128,'#FFFFFF',{radius:24,border:{width:2,style:'solid',color:'#023EC6'},z:3}),
        shape('stat3','card',984,488,432,128,'#FFFFFF',{radius:24,z:3}),
        txt('gwaLbl','label','GWA :',528,496,168,48,36,'#011E60',{fontFamily:'Niramit',fontWeight:'700',z:4}),
        txt('unitsLbl','label','UNITS :',768,496,168,48,36,'#011E60',{fontFamily:'Niramit',fontWeight:'700',z:4}),
        txt('enrLbl','label','ENROLLMENT :',1000,496,400,48,36,'#011E60',{fontFamily:'Niramit',fontWeight:'700',z:4}),
        txt('gwaVal','subheading','1.75',552,552,144,48,24,'#011E60',{fontFamily:'Niramit',fontWeight:'600',z:4}),
        txt('unitsVal','subheading','24',792,552,144,48,24,'#011E60',{fontFamily:'Niramit',fontWeight:'600',z:4}),
        txt('enrVal','subheading','Enrolled',1048,552,352,48,24,'#011E60',{fontFamily:'Niramit',fontWeight:'600',z:4}),
        shape('cal','card',1456,488,384,384,'#FFFFFF',{radius:24,z:3}),
        txt('month','subheading','July, 2027',1480,504,320,48,36,'#011E60',{fontFamily:'Niramit',fontWeight:'700',locked:true,z:4}),
        // July 2027 starts on a Thursday.
        ...['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>txt('dow'+i,'small',d,1480+i*48,568,40,32,14,'#6A6A6A',{fontFamily:'Niramit',fontWeight:'700',align:'center',locked:true,z:4})),
        ...Array.from({length:31},(_,n)=>{ const c=(n+4)%7, r=Math.floor((n+4)/7);
          return txt('day'+(n+1),'small',String(n+1),1480+c*48,600+r*40,40,40,16,n===6 ? '#FFFFFF' : '#011E60',
            {fontFamily:'Niramit',fontWeight:'600',align:'center',locked:true,z:4,bg:n===6 ? '#023EC6' : null,radius:16}); }),
        shape('announce','card',528,656,888,400,'#FFFFFF',{radius:24,z:3}),
        txt('annTitle','subheading','Announcement :',584,688,400,48,20,'#011E60',{fontFamily:'Niramit',fontWeight:'700',z:4}),
        shape('annBody','decorative',560,760,832,272,'#DADADA',{radius:16,z:4}),
      ],
      goals:[
        goal('Make the GWA number bigger than its label.', {bigger:['gwaVal','gwaLbl']},
          'The value is what students came for, so it should be the loudest thing in the card.',
          'Raise 1.75 above 36px, or shrink the label.'),
        goal('Make the units number bigger than its label.', {bigger:['unitsVal','unitsLbl']},
          'Same card style, same rule: the number leads, the label supports.',
          'Raise 24 above the UNITS label size.'),
        goal('Make "Enrolled" bigger than its label.', {bigger:['enrVal','enrLbl']},
          'Keeping all three cards consistent makes the row easy to scan.',
          'Give Enrolled a larger size than ENROLLMENT.'),
        goal('Make "Welcome Back, Juan!" bigger than the date.', {bigger:['welcome','date']},
          'The greeting is the headline of the page. The date is supporting detail.',
          'Increase the welcome size and shrink the date.'),
        bonus('Make the program line at least 20px.', {minFont:20, ids:['program']},
          'Tiny white text on blue is hard to read.',
          'Bump its font size up.'),
        bonus('Make "Announcement :" at least 32px.', {minFont:32, ids:['annTitle']},
          'Card titles should match the weight of the stat cards around them.',
          'Increase the heading size.'),
      ],
      replyTemplates:{
        great:'Students can finally see their grades at a glance. Maraming salamat!',
        ok:'Clearer, thanks. A couple of cards still feel off.',
        bad:'The numbers still get lost. Could you try again?'
      }
    },
    {
      id:'coffee-shop', project:'brewbird', levelNumber:1, pageLabel:'Homepage', concept:'Lining things up',
      emailPreview:'Our homepage looks a bit messy. Could you tidy it up?',
      emailBody:`Hello! We're Brewbird, a little coffee shop on Maple Street.

We just put our homepage online, but it looks messy. The headline, the line under it and the Order Now button all start in slightly different places, and our three menu links sit at different heights.

Could you tidy it up so everything lines up neatly?

Thanks a latte!
— The Brewbird Team`,
      attachmentName:'brewbird_home.png',
      canvas:{ w:900, h:560, bg:'#FBEEDC' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ alignment:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#FBEEDC',{z:0}),
        shape('nav','card',0,0,900,72,'#F3DCB8'),
        txt('logo','subheading','Brewbird',40,16,160,32,20,'#6B4226',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('navlink1','nav','Menu',560,24,64,24,14,'#6B4226'),
        txt('navlink2','nav','About',656,16,64,24,14,'#6B4226'),
        txt('navlink3','nav','Visit',792,32,64,24,14,'#6B4226'),
        txt('heading','heading','Slow mornings, better coffee',64,152,520,48,32,'#6B4226',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('sub','subheading','Small-batch roasts, delivered fresh weekly.',96,232,480,32,18,'#8B6A4B'),
        btn('cta','Order Now',40,296,144,48,16,'#FFFFFF','#6B4226'),
        shape('imgph','decorative',624,120,240,304,'#D7B990',{radius:16}),
        txt('footer','small','© Brewbird Coffee Co.',64,520,400,24,12,'#8B6A4B'),
      ],
      goals:[
        goal('Line up the headline, the line under it and the Order Now button on one left edge.', {sameX:['heading','sub','cta']},
          'A shared left edge gives the eye one straight line to follow, so the page feels calm instead of scattered.',
          'Drag each one until its X number (in Position) matches the others.'),
        goal('Put the Menu, About and Visit links on the same line.', {sameY:['navlink1','navlink2','navlink3']},
          'Links sitting on one line read as a single menu.',
          'Give all three links the same Y number.'),
        bonus('Line up the Brewbird logo with the headline.', {sameX:['logo','heading']},
          'When the logo and headline share an edge, the whole page hangs off one invisible line.',
          "Match the logo's X to the headline's X."),
        bonus('Space the three menu links evenly.', {evenGapsX:['navlink1','navlink2','navlink3']},
          'Even gaps make a menu look deliberate and easy to scan.',
          'Make the space between Menu and About the same as between About and Visit.'),
      ],
      replyTemplates:{
        great:'Everything lines up beautifully now. The page finally feels as calm as our mornings.',
        ok:'Much tidier, thank you! It already feels calmer.',
        bad:"It's getting there, but a few things still start in different places."
      }
    },
    {
      id:'thread-landing', project:'thread', levelNumber:2, pageLabel:'Homepage', concept:'Even spacing',
      emailPreview:'Brewbird recommended you! Can you help with our homepage?',
      emailBody:`Hi! We're Thread & Co., a small clothing brand. Brewbird told us about you.

On our homepage the headline, the text and the button feel randomly spaced: two are squashed together, then there's a big hole before the button. The button is also a bit tiny.

Could you give it a steady, even rhythm and a proper button?

— Thread & Co.`,
      attachmentName:'thread_home.png',
      canvas:{ w:900, h:560, bg:'#F7F3EE' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ spacing:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#F7F3EE',{z:0}),
        txt('brand','subheading','Thread & Co.',48,40,240,32,22,'#2C2420',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('heading','heading','Clothes made to last',64,136,384,96,40,'#2C2420',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('sub','body','Soft linens and sturdy denim, sewn in small batches.',64,240,384,48,16,'#5C4A40'),
        btn('cta','Shop the Collection',64,344,160,32,14,'#FFFFFF','#8A6446'),
        shape('hero','decorative',480,64,360,432,'#E8DCCF',{radius:16}),
      ],
      goals:[
        goal('Even out the space between the headline, the text and the button.', {evenGapsY:['heading','sub','cta']},
          'Matching gaps create a steady rhythm that walks the eye down to the button.',
          'Move the text and button so both gaps are the same, for example 24px.'),
        goal('Make Shop the Collection at least 44px tall.', {minH:44, ids:['cta']},
          'Taller buttons are easier to tap and look more confident.',
          "Raise the button's Height in the Size section."),
        bonus("Widen the button to at least 208px so the label isn't squeezed.", {minW:208, ids:['cta']},
          'Labels need space on both sides to be read comfortably.',
          "Raise the button's Width."),
        bonus('Line up the brand name with the headline, text and button.', {sameX:['brand','heading','sub','cta']},
          'A single left edge ties the brand name to everything under it.',
          'Give all four the same X number.'),
      ],
      replyTemplates:{
        great:'It flows so nicely now. It feels like flipping through a lookbook.',
        ok:'Much calmer, thank you!',
        bad:'The spacing still feels a bit random to us.'
      }
    },
    {
      id:'brewbird-menu', project:'brewbird', levelNumber:2, pageLabel:'Menu page', concept:'Text alignment',
      emailPreview:'Thanks for the homepage! Could you look at our menu page next?',
      emailBody:`Hi again! Customers love the new homepage, so here's our menu page.

The prices are hard to compare because they wobble left and right, and the "Our Menu" title looks lopsided.

Could you center the title and make the prices line up like a neat receipt?

— The Brewbird Team`,
      attachmentName:'brewbird_menu.png',
      canvas:{ w:900, h:560, bg:'#FBEEDC' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ alignment:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#FBEEDC',{z:0}),
        shape('nav','card',0,0,900,64,'#F3DCB8'),
        txt('logo','subheading','Brewbird',40,16,160,32,20,'#6B4226',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('title','heading','Our Menu',240,88,424,56,36,'#6B4226',{fontFamily:'Baloo 2',fontWeight:'700'}),
        shape('card','card',160,168,584,312,'#FFF8EE',{radius:16}),
        txt('n1','body','Espresso',192,200,240,32,18,'#6B4226',{fontWeight:'700'}),
        txt('n2','body','Flat White',200,256,240,32,18,'#6B4226',{fontWeight:'700'}),
        txt('n3','body','Honey Oat Latte',192,312,240,32,18,'#6B4226',{fontWeight:'700'}),
        txt('n4','body','Cold Brew',208,368,240,32,18,'#6B4226',{fontWeight:'700'}),
        txt('p1','body','₱120',560,200,144,32,18,'#6B4226'),
        txt('p2','body','₱150',552,256,144,32,18,'#6B4226'),
        txt('p3','body','₱175',568,312,144,32,18,'#6B4226'),
        txt('p4','body','₱160',560,368,144,32,18,'#6B4226'),
        txt('note','small','Oat milk available for every drink.',192,432,400,24,13,'#8B6A4B'),
      ],
      goals:[
        goal('Center the "Our Menu" title.', {align:'center', ids:['title']},
          'Short titles look balanced when they are centered over the content below them.',
          'Select the title, then choose Center under Text alignment.'),
        goal('Right-align all four prices.', {align:'right', ids:['p1','p2','p3','p4']},
          'Right-aligned numbers stack neatly, so customers can compare prices at a glance.',
          'Select each price and choose Right under Text alignment.'),
        bonus('Line the prices up on one right edge.', {sameRight:['p1','p2','p3','p4']},
          'With one shared edge, the price column reads like a tidy receipt.',
          'Give the four prices the same X number.'),
        bonus('Line up the drink names on one left edge.', {sameX:['n1','n2','n3','n4']},
          'A straight left edge makes a list easy to read from top to bottom.',
          'Give the four drink names the same X number.'),
      ],
      replyTemplates:{
        great:'The menu reads like a proper café board now. Customers find their drink in a second!',
        ok:'The menu is much easier to read, thank you.',
        bad:'The prices are still a bit hard to compare.'
      }
    },
    {
      id:'cedar-home', project:'cedar', levelNumber:3, pageLabel:'Homepage', concept:'Text sizes',
      emailPreview:'Our school homepage needs a clearer headline.',
      emailBody:`Good day! This is the office at Cedar Valley School.

Parents say our homepage is confusing. The small line under our welcome title is actually bigger than the title, and the news items are tiny.

Could you make it obvious what to read first, and make the news easy to read?

— Cedar Valley Office`,
      attachmentName:'cedar_home.png',
      canvas:{ w:900, h:560, bg:'#F5F6FA' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ hierarchy:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#F5F6FA',{z:0}),
        shape('banner','card',0,0,900,200,'#E4E6F2'),
        txt('welcome','heading','Welcome to Cedar Valley',64,56,640,56,22,'#2B2E4A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('tagline','subheading','Learning together since 1962',64,120,560,48,28,'#2B2E4A'),
        txt('newsTitle','subheading','School News',64,240,320,32,20,'#2B2E4A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('news1','body','Science fair entries close Friday',64,288,480,24,12,'#2B2E4A'),
        txt('news2','body','The library is open late on Thursdays',64,320,480,24,12,'#2B2E4A'),
        btn('portal','Open Student Portal',64,392,224,48,16,'#FFFFFF','#2B2E4A'),
      ],
      goals:[
        goal('Make "Welcome to Cedar Valley" bigger than the line under it.', {bigger:['welcome','tagline']},
          'The biggest words on a page are read first, so they should carry the main message.',
          "Raise the title's font Size or lower the tagline's."),
        goal('Make both news items at least 16px.', {minFont:16, ids:['news1','news2']},
          'Parents skim news on their phones, and 16px keeps it readable.',
          'Select each news line and raise its font Size.'),
        bonus('Make the welcome title 32px or bigger.', {minFont:32, ids:['welcome']},
          'A generous title makes the page feel welcoming at first glance.',
          "Raise the title's font Size."),
        bonus('Even out the gaps in the School News list.', {evenGapsY:['newsTitle','news1','news2']},
          'Even gaps show the news items belong under their heading.',
          'Make both gaps the same size.'),
      ],
      replyTemplates:{
        great:'Parents already say the homepage feels friendlier. Thank you!',
        ok:'Much clearer, thank you.',
        bad:"It's still a little hard to tell what's most important."
      }
    },
    {
      id:'clothing-store', project:'thread', levelNumber:3, pageLabel:'Shop page', concept:'Consistent rows',
      emailPreview:'Thank you! Next up: our shop page with the product cards.',
      emailBody:`Hi again! Here's our shop page.

The product names and prices sit at slightly different heights on each card, so the row looks wobbly.

Could you line them up so the three cards look like a matching set?

— Thread & Co.`,
      attachmentName:'thread_shop.png',
      canvas:{ w:900, h:560, bg:'#F7F3EE' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ spacing:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#F7F3EE',{z:0}),
        txt('heading','heading','New Arrivals',40,24,400,48,30,'#2C2420',{fontFamily:'Baloo 2',fontWeight:'700'}),
        shape('card1','card',40,96,256,320,'#FFFFFF',{radius:10}),
        shape('card2','card',320,96,256,320,'#FFFFFF',{radius:10}),
        shape('card3','card',600,96,256,320,'#FFFFFF',{radius:10}),
        btn('badge','SALE',56,112,64,24,11,'#7A1F2B','#F7B9B9',{role:'label',radius:6}),
        txt('pname1','body','Linen Shirt',56,344,224,24,16,'#2C2420',{fontWeight:'700'}),
        txt('pprice1','body','₱1,450',56,368,120,24,16,'#2C2420',{fontWeight:'700'}),
        btn('addcart','Add to Cart',56,392,200,32,14,'#FFFFFF','#8A6446'),
        txt('pname2','body','Denim Jacket',336,336,224,24,16,'#2C2420',{fontWeight:'700'}),
        txt('pprice2','body','₱2,900',336,360,120,24,16,'#2C2420',{fontWeight:'700'}),
        txt('pname3','body','Canvas Tote',616,344,224,24,16,'#2C2420',{fontWeight:'700'}),
        txt('pprice3','body','₱980',624,376,120,24,16,'#2C2420',{fontWeight:'700'}),
      ],
      goals:[
        goal('Line up the three product names at the same height.', {sameY:['pname1','pname2','pname3']},
          'When names share one line, shoppers can scan across the row without hunting.',
          'Give the three names the same Y number.'),
        goal('Line up the three prices at the same height.', {sameY:['pprice1','pprice2','pprice3']},
          'Prices on one line make comparing them effortless.',
          'Give the three prices the same Y number.'),
        bonus('Make Add to Cart at least 44px tall.', {minH:44, ids:['addcart']},
          'A comfortable tap size means fewer missed taps on phones.',
          "Raise the button's Height."),
        bonus("Line up the tote's name and price on one left edge.", {sameX:['pname3','pprice3']},
          'A name and price that share an edge read as one little label.',
          "Match the price's X to the name's X."),
      ],
      replyTemplates:{
        great:'The cards look like a real matching set now. Love it!',
        ok:'The row looks much tidier, thanks.',
        bad:'The cards still look a little wobbly.'
      }
    },
    {
      id:'almel-home', project:'almel', levelNumber:4, pageLabel:'Homepage', concept:'Readable colors',
      emailPreview:'Our phone homepage is hard to read in the sun!',
      emailBody:`Hi, good day! This is Almel's Canteen.

Students open our homepage on their phones outside, and they say the title and opening hours almost disappear. The colors just blend into the background.

Could you change the text colors so everything is easy to read?

— Almel's Canteen Team`,
      attachmentName:'almel_home.png',
      canvas:{ w:512, h:720, bg:'#F4D444' },
      rubric:{ gridColumns:4, gridGutter:16, spacingUnit:12, weights:{ contrast:30 } },
      elements:[
        shape('bg','background',0,0,512,720,'#F4D444',{z:0}),
        txt('title','heading',"ALMEL'S CANTEEN",48,48,416,64,40,'#F7B733',{fontFamily:'Just Another Hand',fontWeight:'400',align:'center'}),
        txt('tagline','subheading','Home-cooked meals every school day',48,120,416,40,22,'#E9A23B',{align:'center'}),
        shape('card','card',32,184,448,320,'#EFFFFF',{radius:24}),
        txt('special','body',"Today's special: Chicken Adobo",64,224,384,40,20,'#17201D',{fontWeight:'700',align:'center'}),
        txt('hours','body','Open 7am – 3pm',64,288,384,32,18,'#A7B3B3',{align:'center'}),
        btn('menuBtn','See Full Menu',128,560,256,56,22,'#FFD1A6','#FF7900',{radius:24}),
      ],
      goals:[
        goal("Make the ALMEL'S CANTEEN title easy to read on the yellow.", {contrast:'AA', ids:['title']},
          'Text needs enough difference from its background (called contrast) to stay readable, even in sunlight.',
          'Pick a much darker title color in the Color section. The badge tells you when it passes.'),
        goal('Make the opening hours easy to read.', {contrast:'AA', ids:['hours']},
          'Pale grey on a pale card is one of the most common readability problems.',
          'Choose a darker color for the hours.'),
        bonus('Make the line under the title easy to read too.', {contrast:'AA', ids:['tagline']},
          'Every line of text deserves to be readable, not just the big ones.',
          'Darken the tagline color.'),
        bonus('Make the See Full Menu label stand out from its orange button.', {contrast:'AA', ids:['menuBtn']},
          "A button label people can't read is a button people won't press.",
          'Try a very dark label, or change the button color.'),
      ],
      replyTemplates:{
        great:'Students can read everything even outside in the sun. Salamat!',
        ok:"It's easier to read now, thank you.",
        bad:'Some text still disappears into the background.'
      }
    },
    {
      id:'brewbird-visit', project:'brewbird', levelNumber:4, pageLabel:'Visit us page', concept:'Even spacing',
      emailPreview:'One more from us: the page that shows where to find the café.',
      emailBody:`Hello! One more page from us: how to find the café.

Our opening hours look squashed together in one spot and far apart in another. The Get Directions button is also so thin that people keep missing it on their phones.

Could you even out the hours and make the button easier to tap?

— The Brewbird Team`,
      attachmentName:'brewbird_visit.png',
      canvas:{ w:900, h:560, bg:'#FBEEDC' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ spacing:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#FBEEDC',{z:0}),
        shape('nav','card',0,0,900,64,'#F3DCB8'),
        txt('logo','subheading','Brewbird',40,16,160,32,20,'#6B4226',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('title','heading','Come visit us',64,96,480,48,34,'#6B4226',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('addr','body','18 Maple Street, open every day',80,160,480,32,16,'#8B6A4B'),
        txt('h1','body','Mon–Fri · 7am – 6pm',64,232,360,32,16,'#6B4226'),
        txt('h2','body','Saturday · 8am – 5pm',64,264,360,32,16,'#6B4226'),
        txt('h3','body','Sunday · 9am – 2pm',64,328,360,32,16,'#6B4226'),
        btn('directions','Get Directions',64,408,176,32,15,'#FFFFFF','#6B4226'),
        shape('map','decorative',584,96,256,320,'#D7B990',{radius:16}),
      ],
      goals:[
        goal('Give the three opening-hours lines the same gap between them.', {evenGapsY:['h1','h2','h3']},
          'Even gaps tell visitors these lines belong together as one list.',
          'Move the lines so each gap is the same, for example 16px.'),
        goal('Make the Get Directions button at least 44px tall.', {minH:44, ids:['directions']},
          "44px is about the size of a fingertip, so the button is easy to tap on a phone.",
          'Select the button and raise its Height in the Size section.'),
        bonus('Line up the title, address and button on one left edge.', {sameX:['title','addr','directions']},
          'One left edge keeps the page easy to follow from top to bottom.',
          'Give all three the same X number.'),
        bonus('Make the button at least 200px wide.', {minW:200, ids:['directions']},
          'A little breathing room around the label makes a button look finished.',
          "Raise the button's Width in the Size section."),
      ],
      replyTemplates:{
        great:'Perfect! People are already finding us more easily. Thank you for all your help!',
        ok:'Thank you, the page is clearer now.',
        bad:'The hours still look uneven. Could you take another look?'
      }
    },

    // ================= Thread & Co. =================,
    {
      id:'school-portal', project:'cedar', levelNumber:4, pageLabel:'Student dashboard', concept:'Text sizes',
      emailPreview:'Thank you! Next: the student dashboard.',
      emailBody:`Hi again! Here's the student dashboard.

The section title "Upcoming Assignments" is bigger than the page title, and the assignment links are small.

Could you sort out the sizes so students know where they are and can read their assignments?

— Cedar Valley Office`,
      attachmentName:'portal_dashboard.png',
      canvas:{ w:900, h:576, bg:'#F5F6FA' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ hierarchy:30 } },
      elements:[
        shape('bg','background',0,0,900,576,'#F5F6FA',{z:0}),
        txt('pageTitle','heading','Student Dashboard',40,32,400,40,20,'#2B2E4A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('sectionTitle','subheading','Upcoming Assignments',40,88,400,40,30,'#2B2E4A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        shape('row1','card',40,152,520,48,'#FFFFFF',{radius:8}),
        txt('row1link','nav','Algebra II — Worksheet 4',56,160,400,32,14,'#4B4F7A'),
        shape('row2','card',40,208,520,48,'#FFFFFF',{radius:8}),
        txt('row2link','nav','World History — Essay',56,216,400,32,14,'#4B4F7A'),
        txt('viewAll','button','View All',600,152,120,32,14,'#4B4F7A',{fontFamily:'Baloo 2',fontWeight:'700'}),
      ],
      goals:[
        goal('Make "Student Dashboard" bigger than "Upcoming Assignments".', {bigger:['pageTitle','sectionTitle']},
          'The page title tells students where they are, so it should lead.',
          "Raise the page title's font Size or lower the section title's."),
        goal('Make both assignment links at least 16px.', {minFont:16, ids:['row1link','row2link']},
          'Links are the things students click, so they need to be easy to read.',
          "Raise each link's font Size."),
        bonus('Make "View All" at least 44px tall.', {minH:44, ids:['viewAll']},
          'Bigger click areas are easier for everyone, especially on tablets.',
          'Raise its Height in the Size section.'),
        bonus('Give the page title headline size (28px or more).', {minFont:28, ids:['pageTitle']},
          'A clear headline size helps students find their place instantly.',
          "Raise the page title's font Size."),
      ],
      replyTemplates:{
        great:'Students found their assignments right away. This is exactly what we needed!',
        ok:'Thank you, the dashboard is clearer.',
        bad:'The titles still compete with each other a bit.'
      }
    },

    // ================= Almel's Canteen =================,
    {
      id:'willowmere-home', project:'willowmere', levelNumber:5, pageLabel:'Homepage', concept:'Easy for everyone',
      emailPreview:'Our older patients struggle with our homepage.',
      emailBody:`Hello, this is Willowmere Clinic.

Many of our patients are older or have poor eyesight. They tell us the text on our homepage is tiny and the buttons are hard to press.

Could you make the page comfortable for everyone to read and use?

Thank you,
Willowmere Clinic`,
      attachmentName:'willowmere_home.png',
      canvas:{ w:816, h:600, bg:'#F2F7F6' },
      rubric:{ gridColumns:8, gridGutter:20, spacingUnit:16, weights:{ accessibility:35 } },
      elements:[
        shape('bg','background',0,0,816,600,'#F2F7F6',{z:0}),
        shape('hero','card',0,0,816,248,'#DCEFEC'),
        txt('title','heading','Care close to home',48,56,480,56,36,'#1F3A3A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('intro','body','Family doctors, check-ups and vaccines in Willowmere.',48,120,480,48,13,'#7F9A97'),
        btn('bookBtn','Book a Visit',48,184,144,32,14,'#FFFFFF','#1F6F63'),
        btn('callBtn','Call Us',208,184,112,32,14,'#2E8C7E','#FFFFFF'),
        txt('services','subheading','Our Services',48,288,320,32,22,'#1F3A3A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('s1','body','General check-ups',48,336,320,24,11,'#1F3A3A'),
        txt('s2','body','Child vaccines',48,368,320,24,11,'#1F3A3A'),
        txt('s3','body','Blood tests',48,400,320,24,11,'#1F3A3A'),
      ],
      goals:[
        goal('Make both buttons at least 44px tall.', {minH:44, ids:['bookBtn','callBtn']},
          'Bigger buttons help people with shaky hands or poor eyesight press the right thing.',
          "Raise each button's Height."),
        goal('Make the intro and the three services at least 16px.', {minFont:16, ids:['intro','s1','s2','s3']},
          '16px is a comfortable minimum for reading without zooming in.',
          "Raise each line's font Size."),
        bonus('Make the intro text dark enough to read easily.', {contrast:'AA', ids:['intro']},
          'Light grey text is hard to read for many people, especially older eyes.',
          'Pick a darker color for the intro.'),
        bonus('Make the Call Us label easy to read.', {contrast:'AA', ids:['callBtn']},
          'Teal text on white is borderline, and a deeper shade reads clearly.',
          'Darken the Call Us text color.'),
      ],
      replyTemplates:{
        great:'Our patients can finally read and use the page comfortably. Thank you so much.',
        ok:"It's more comfortable to use now, thank you.",
        bad:'Some parts are still hard for our patients.'
      }
    },
    {
      id:'thread-product', project:'thread', levelNumber:5, pageLabel:'Product page', concept:'Text sizes',
      emailPreview:'One last page: the page for a single product.',
      emailBody:`Hello! One last page from us: the page for a single product.

Right now the price is shouting louder than the product name, and the description is so small that people squint at it.

Could you fix the text sizes so it's clear what to read first?

— Thread & Co.`,
      attachmentName:'thread_product.png',
      canvas:{ w:900, h:560, bg:'#F7F3EE' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ hierarchy:30 } },
      elements:[
        shape('bg','background',0,0,900,560,'#F7F3EE',{z:0}),
        txt('brand','subheading','Thread & Co.',64,32,240,32,20,'#2C2420',{fontFamily:'Baloo 2',fontWeight:'700'}),
        shape('photo','decorative',64,96,384,400,'#E8DCCF',{radius:16}),
        txt('name','heading','Linen Shirt',496,112,352,48,18,'#2C2420',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('price','subheading','₱1,450',496,176,200,48,30,'#2C2420',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('desc','body','Breathable linen with a relaxed fit. Machine washable.',496,240,352,64,12,'#5C4A40'),
        btn('addbag','Add to Bag',496,328,200,48,14,'#FFFFFF','#8A6446'),
      ],
      goals:[
        goal('Make the product name bigger than the price.', {bigger:['name','price']},
          'Shoppers look for what the item is first, then how much it costs.',
          "Raise the name's font Size, or lower the price's."),
        goal('Make the description at least 16px.', {minFont:16, ids:['desc']},
          'Text below 16px gets tiring to read, especially on phones.',
          'Select the description and raise its font Size.'),
        bonus('Give the product name headline size (28px or more).', {minFont:28, ids:['name']},
          'A big, confident name anchors the whole page.',
          "Raise the name's font Size to 28 or more."),
        bonus('Make the Add to Bag label 16px or larger.', {minFont:16, ids:['addbag']},
          'Button labels should be at least as readable as the text around them.',
          "Raise the button's font Size."),
      ],
      replyTemplates:{
        great:'Now the shirt is the star and everything else supports it. Thank you for everything!',
        ok:"It's much easier to read now, thanks.",
        bad:'The price still steals the spotlight a bit.'
      }
    },

    // ================= Cedar Valley School =================,
    {
      id:'almel-canteen', project:'almel', levelNumber:5, pageLabel:'Menu poster', concept:'Readable colors',
      emailPreview:'Thank you! Next: our menu poster for phones.',
      emailBody:`Hi! Here's the menu poster we show on phones.

Some parts are hard to read. The menu items are too pale, and "BEST FOOD EVER" gets lost on the orange starburst.

We hope to make it clear and readable for our customers. Looking forward to your help. Thank you!

— Almel's Canteen Team`,
      attachmentName:'poster_layout.png',
      canvas:{ w:512, h:720, bg:'#F4D444' },
      rubric:{ gridColumns:4, gridGutter:16, spacingUnit:12, weights:{ contrast:30 } },
      elements:[
        shape('bg','background',0,0,512,720,'#F4D444',{z:0}),
        shape('paper','card',72,112,368,464,'#EFFFFF',{shape:'trapezoid'}),
        txt('title','heading',"ALMEL's CANTEEN",120,32,272,48,28,'#E98A7A',{fontFamily:'Just Another Hand',fontWeight:'700',align:'center',z:3}),
        btn('menuBadge',"TODAY'S MENU",224,96,224,80,40,'#FFFFFF','#B8441A',{fontFamily:'Just Another Hand',radius:24,z:4}),
        txt('item1','body','Rice Meals - 80',112,192,304,48,36,'#8FB8B8',{fontFamily:'Modak',fontWeight:'400',align:'center',z:3}),
        txt('item2','body','Dessert - 80',112,240,304,48,36,'#8FB8B8',{fontFamily:'Modak',fontWeight:'400',align:'center',z:3}),
        txt('item3','body','Drinks - 30',112,288,304,48,36,'#8FB8B8',{fontFamily:'Modak',fontWeight:'400',align:'center',z:3}),
        txt('cash','small','WE ACCEPT CASH ONLY',152,384,224,40,10,'#17201D',{fontFamily:'Fjalla One',align:'center',z:3}),
        shape('starburst','decorative',136,424,240,240,'#FF7900',{shape:'starburst',z:2}),
        txt('burstText','button','BEST FOOD\nEVER',168,496,176,88,32,'#9AA0A6',{fontFamily:'Fjalla One',fontWeight:'700',align:'center',z:5}),
      ],
      goals:[
        goal('Make the three menu items easy to read.', {contrast:'AA', ids:['item1','item2','item3']},
          'The food and prices are why people open the poster, so they must be the easiest thing to read.',
          'Choose a dark color for each menu item.'),
        goal('Make BEST FOOD EVER readable on the orange starburst.', {contrast:'AA', ids:['burstText']},
          'Grey on orange blends together, while very dark text pops.',
          'Try a very dark brown or black.'),
        bonus('Make the cash-only note at least 14px.', {minFont:14, ids:['cash']},
          'Important rules like "cash only" should never be fine print.',
          'Raise its font Size.'),
        bonus('Make the canteen name readable too.', {contrast:'AA', ids:['title']},
          'Your name is your brand, so customers should read it instantly.',
          'Darken the title color.'),
      ],
      replyTemplates:{
        great:'The poster is so clear now, customers read it from across the room!',
        ok:"It's more readable now, thank you.",
        bad:'Some parts are still hard to read.'
      }
    },

    // ================= Willowmere Clinic =================,
    {
      id:'flockr-landing', project:'flockr', levelNumber:6, pageLabel:'Welcome screen', concept:'Phone layout',
      emailPreview:'Our app welcome screen feels cramped on phones.',
      emailBody:`Hey! We're Flockr, a friendly little social app.

On phones our welcome screen feels cramped. The logo and text touch the edge of the screen, and the "I already have an account" link is really hard to tap.

Could you give it room to breathe on a small screen?

— Flockr Team`,
      attachmentName:'flockr_welcome.png',
      canvas:{ w:416, h:640, bg:'#FFFFFF' },
      rubric:{ gridColumns:4, gridGutter:12, spacingUnit:12, safeMargin:16, weights:{ usability:30 } },
      elements:[
        shape('bg','background',0,0,416,640,'#FFFFFF',{z:0}),
        txt('logo','heading','Flockr',8,40,200,48,36,'#2B2E4A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('pitch','body','Share little moments with the people you like.',8,104,400,48,16,'#2B2E4A'),
        shape('art','decorative',0,176,416,240,'#E6ECFF'),
        btn('join','Join Flockr',24,448,368,48,18,'#FFFFFF','#3651D4',{radius:24}),
        txt('login','nav','I already have an account',24,512,368,24,15,'#3651D4',{align:'center'}),
      ],
      goals:[
        goal('Keep all text and buttons at least 16px from the screen edges.', {safeMargin:16, ids:['logo','pitch','join','login']},
          'Phone edges are curved and often covered by thumbs, so content needs a safe margin.',
          'Move the logo and text right (and make them narrower if needed) so nothing is closer than 16px to an edge.'),
        goal('Make "I already have an account" at least 44px tall.', {minH:44, ids:['login']},
          'Small links are easy to miss with a thumb, and 44px is a comfortable tap size.',
          'Raise its Height in the Size section.'),
        bonus('Center the logo and the line under it.', {align:'center', ids:['logo','pitch']},
          'Welcome screens often center their message for a friendly, balanced look.',
          'Choose Center under Text alignment for both.'),
        bonus('Line everything up on one left edge.', {sameX:['logo','pitch','join','login']},
          'Shared edges keep a narrow screen feeling orderly.',
          'Give all four the same X number.'),
      ],
      replyTemplates:{
        great:'It feels so comfy on a phone now. Our sign-ups are already up!',
        ok:'Much better on phones, thanks!',
        bad:'It still feels a bit cramped on a phone.'
      }
    },
    {
      id:'hospital-app', project:'willowmere', levelNumber:6, pageLabel:'Booking form', concept:'Easy for everyone',
      emailPreview:'Thank you! Next: the appointment booking form.',
      emailBody:`Hello again! Here's our booking form.

Patients can barely see the form labels, and the Confirm Booking button looks switched off because its text is so faint. The page title and the section title also look the same.

Could you make the form clear and easy to fill in?

Thank you,
Willowmere Clinic`,
      attachmentName:'booking_form.png',
      canvas:{ w:816, h:600, bg:'#F2F7F6' },
      rubric:{ gridColumns:8, gridGutter:20, spacingUnit:16, weights:{ accessibility:35 } },
      elements:[
        shape('bg','background',0,0,816,600,'#F2F7F6',{z:0}),
        txt('title','heading','Book an Appointment',48,32,496,40,20,'#1F3A3A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('section','subheading','Patient Details',48,96,400,32,20,'#1F3A3A',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('lbl1','label','Full Name *',48,152,200,24,12,'#9FB3B1'),
        shape('input1','card',48,176,336,40,'#FFFFFF',{radius:8}),
        txt('lbl2','label','Preferred Date *',48,232,200,24,12,'#9FB3B1'),
        shape('input2','card',48,256,216,40,'#FFFFFF',{radius:8}),
        txt('lbl3','label','Reason for Visit',48,312,200,24,12,'#9FB3B1'),
        shape('input3','card',48,336,496,72,'#FFFFFF',{radius:8}),
        btn('submit','Confirm Booking',48,440,200,48,15,'#DCEFEC','#BFE3DC',{radius:10}),
      ],
      goals:[
        goal('Make all three form labels easy to read.', {contrast:'AA', ids:['lbl1','lbl2','lbl3']},
          "Labels tell people what to type. If they can't read them, they can't fill in the form.",
          'Choose a darker color for each label.'),
        goal('Make the Confirm Booking label stand out from its button.', {contrast:'AA', ids:['submit']},
          'Faint buttons look switched off, so people hesitate to press them.',
          'Use a dark label or a darker button color.'),
        bonus('Make "Book an Appointment" bigger than "Patient Details".', {bigger:['title','section']},
          'Different sizes show which title is for the page and which is for a section.',
          "Raise the page title's font Size."),
        bonus('Make the labels at least 14px.', {minFont:14, ids:['lbl1','lbl2','lbl3']},
          'Slightly bigger labels make the form much more comfortable.',
          "Raise each label's font Size."),
      ],
      replyTemplates:{
        great:'Bookings went up this week and nobody called confused. Wonderful work!',
        ok:'The form is clearer now, thank you.',
        bad:'Patients still find the form hard to read.'
      }
    },

    // ================= Flockr =================,
    {
      id:'meridian-landing', project:'meridian', levelNumber:7, pageLabel:'Homepage', concept:'Putting it together',
      emailPreview:'We want our homepage to feel trustworthy.',
      emailBody:`Good afternoon, this is Meridian Bank.

We want our homepage to feel calm and trustworthy. Right now our name disappears into the dark top bar, the headline is smaller than the sentence under it, and the two buttons don't sit together.

Could you bring it up to a professional standard?

Regards,
Meridian Bank`,
      attachmentName:'meridian_home.png',
      canvas:{ w:900, h:560, bg:'#EAF0F6' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ hierarchy:14, contrast:14 } },
      elements:[
        shape('bg','background',0,0,900,560,'#EAF0F6',{z:0}),
        shape('topbar','card',0,0,900,72,'#274472'),
        txt('brand','subheading','Meridian Bank',48,24,240,32,22,'#3B5D8C',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('heading','heading','Banking that feels calm',48,136,520,56,18,'#1E2A38',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('sub','body','Check balances, pay bills and save, all in one place.',48,208,520,48,20,'#3F4E5C'),
        btn('openBtn','Open an Account',48,296,176,40,15,'#FFFFFF','#1F6F63'),
        btn('loginBtn','Log In',240,304,112,40,15,'#FFFFFF','#274472'),
        shape('art','decorative',600,112,256,320,'#D5E1EE',{radius:16}),
      ],
      goals:[
        goal('Make the Meridian Bank name readable on the dark top bar.', {contrast:'AA', ids:['brand']},
          'Your name is the first trust signal, so it must be clearly visible.',
          'Pick a light color, like white, for the name.'),
        goal('Make the headline bigger than the sentence under it.', {bigger:['heading','sub']},
          'Headlines lead and supporting sentences follow.',
          "Raise the headline's font Size."),
        bonus('Put the two buttons side by side on one line.', {sameY:['openBtn','loginBtn']},
          'Buttons that line up read as a pair of choices.',
          'Give both buttons the same Y number.'),
        bonus('Make both buttons at least 44px tall.', {minH:44, ids:['openBtn','loginBtn']},
          'Comfortable button sizes feel more reassuring to press.',
          "Raise each button's Height."),
      ],
      replyTemplates:{
        great:'This looks like a bank people can trust. Excellent work.',
        ok:'A clear improvement, thank you.',
        bad:"It doesn't feel quite professional yet."
      }
    },
    {
      id:'social-app', project:'flockr', levelNumber:7, pageLabel:'Home feed', concept:'Phone layout',
      emailPreview:'Thanks! Next: the home feed, where people keep mis-tapping.',
      emailBody:`Hey again! Here's the home feed.

People keep tapping the wrong icon because like, comment and share are tiny and squished against the edge. The username and the @handle also look exactly the same.

Could you make it comfy to use with one thumb?

— Flockr Team`,
      attachmentName:'feed_card.png',
      canvas:{ w:416, h:640, bg:'#FFFFFF' },
      rubric:{ gridColumns:4, gridGutter:12, spacingUnit:12, safeMargin:16, weights:{ usability:30 } },
      elements:[
        shape('bg','background',0,0,416,640,'#FFFFFF',{z:0}),
        shape('topbar','card',0,0,416,56,'#F0F2F5'),
        txt('icon1','nav','🏠',24,16,24,24,16,'#2B2E4A'),
        txt('icon2','nav','🔍',56,16,24,24,16,'#2B2E4A'),
        txt('icon3','nav','➕',88,16,24,24,16,'#2B2E4A'),
        shape('avatar','decorative',16,80,48,48,'#CFE3E8',{radius:24}),
        txt('username','body','jordan.codes',80,80,200,24,14,'#2B2E4A'),
        txt('handle','body','@jordan.codes · 2h',80,104,200,24,14,'#2B2E4A'),
        shape('photo','decorative',0,152,416,256,'#DDE6EE'),
        txt('likeIcon','button','♥',0,424,24,24,15,'#D64545'),
        txt('commentIcon','button','💬',24,424,24,24,15,'#2B2E4A'),
        txt('shareIcon','button','↗',48,424,24,24,15,'#2B2E4A'),
      ],
      goals:[
        goal('Make like, comment and share at least 44px tall.', {minH:44, ids:['likeIcon','commentIcon','shareIcon']},
          'Tiny icons cause mis-taps, and 44px fits a thumb.',
          "Raise each icon's Height."),
        goal('Keep the icons and names at least 16px from the screen edges.', {safeMargin:16, ids:['likeIcon','commentIcon','shareIcon','username','handle']},
          'Content hugging the edge is hard to reach and looks cramped.',
          'Move the icons right, away from the edge.'),
        bonus('Make the username bigger than the @handle.', {bigger:['username','handle']},
          'The name is what people recognise, and the handle is extra detail.',
          "Raise the username's font Size."),
        bonus('Make the icons at least 44px wide too.', {minW:44, ids:['likeIcon','commentIcon','shareIcon']},
          'Wide enough tap areas stop neighbouring icons being pressed by accident.',
          "Raise each icon's Width, then space them out."),
      ],
      replyTemplates:{
        great:'No more accidental likes! The feed feels great with one thumb.',
        ok:'Tapping is much easier now, thanks.',
        bad:'The icons are still hard to tap.'
      }
    },

    // ================= Meridian Bank =================,
    {
      id:'nimbus-shop', project:'nimbus', levelNumber:8, pageLabel:'Shop homepage', concept:'Putting it together',
      emailPreview:'Our online shop needs a full polish.',
      emailBody:`Hello, this is Nimbus Goods, an online homeware shop.

Our shop homepage has a few problems at once. The shipping note is bigger than our headline and hard to read, and the product names sit at different heights.

Could you give it a proper polish?

Thank you,
Nimbus Goods`,
      attachmentName:'nimbus_home.png',
      canvas:{ w:960, h:640, bg:'#F7F8FA' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:16, weights:{ hierarchy:14, contrast:14 } },
      elements:[
        shape('bg','background',0,0,960,640,'#F7F8FA',{z:0}),
        shape('header','card',0,0,960,72,'#FFFFFF'),
        txt('logo','subheading','Nimbus Goods',40,24,240,32,22,'#22262E',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('heading','heading','Everyday things, beautifully made',40,112,640,56,22,'#22262E',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('sub','body','Free shipping on orders over ₱1,500',40,184,560,40,24,'#A9B0BA'),
        shape('c1card','card',40,256,272,240,'#FFFFFF',{radius:14}),
        shape('c2card','card',344,256,272,240,'#FFFFFF',{radius:14}),
        shape('c3card','card',648,256,272,240,'#FFFFFF',{radius:14}),
        txt('c1','body','Cloud Mug',56,448,240,32,16,'#22262E',{fontWeight:'700'}),
        txt('c2','body','Rain Tote',360,456,240,32,16,'#22262E',{fontWeight:'700'}),
        txt('c3','body','Mist Candle',664,440,240,32,16,'#22262E',{fontWeight:'700'}),
        btn('shopBtn','Shop All',40,544,128,32,14,'#FFFFFF','#22262E'),
      ],
      goals:[
        goal('Make the headline bigger than the shipping note.', {bigger:['heading','sub']},
          'The headline sells the shop, and the shipping note is a helpful extra.',
          "Raise the headline's font Size or lower the note's."),
        goal('Line up the three product names.', {sameY:['c1','c2','c3']},
          'Names on one line make the row feel like a tidy shelf.',
          'Give the three names the same Y number.'),
        goal('Make the shipping note easy to read.', {contrast:'AA', ids:['sub']},
          "Free shipping is a selling point, so don't let it fade away.",
          'Choose a darker color for the note.'),
        bonus('Make Shop All at least 44px tall.', {minH:44, ids:['shopBtn']},
          'Main buttons deserve a comfortable size.',
          "Raise the button's Height."),
        bonus('Give the headline 32px or more.', {minFont:32, ids:['heading']},
          'A confident headline sets the tone for the whole shop.',
          "Raise the headline's font Size."),
      ],
      replyTemplates:{
        great:'This finally looks like the shop we imagined. Wonderful!',
        ok:'A big improvement, thank you.',
        bad:'A few problems are still there.'
      }
    },
    {
      id:'banking-dashboard', project:'meridian', levelNumber:8, pageLabel:'Account page', concept:'Putting it together',
      emailPreview:'Thank you. Next: customers cannot find their balance quickly.',
      emailBody:`Good afternoon again. Here is the account page.

Customers can't find their balance quickly, the sidebar links are hard to read, and the Transfer and Pay Bills buttons don't line up.

Please make the balance the star of the page and tidy up the rest.

Regards,
Meridian Bank`,
      attachmentName:'dashboard_layout.png',
      canvas:{ w:900, h:576, bg:'#EAF0F6' },
      rubric:{ gridColumns:12, gridGutter:20, spacingUnit:16, weights:{ hierarchy:14, contrast:14 }, colorOnlyIds:['warnIcon'] },
      elements:[
        shape('bg','background',0,0,900,576,'#EAF0F6',{z:0}),
        shape('sidebar','card',0,0,200,576,'#274472'),
        txt('nav1','nav','Overview',24,40,152,24,14,'#3B5D8C'),
        txt('nav2','nav','Transfers',24,88,152,24,14,'#3B5D8C'),
        txt('nav3','nav','Cards',24,152,152,24,14,'#3B5D8C'),
        txt('balanceLbl','body','Available Balance',240,40,304,24,14,'#4A5B6B'),
        txt('balance','heading','₱42,081.12',240,72,344,40,20,'#1E2A38',{fontFamily:'Baloo 2',fontWeight:'700'}),
        shape('card1','card',240,144,304,160,'#FFFFFF',{radius:12}),
        shape('card2','card',560,144,304,160,'#FFFFFF',{radius:12}),
        txt('warnIcon','label','⚠ Low balance',256,336,200,24,13,'#B42318',{fontWeight:'700'}),
        btn('transferBtn','Transfer',240,400,128,48,15,'#FFFFFF','#1F6F63'),
        btn('payBtn','Pay Bills',392,408,128,48,15,'#FFFFFF','#1F6F63'),
      ],
      goals:[
        goal('Make the sidebar links readable.', {contrast:'AA', ids:['nav1','nav2','nav3']},
          "Navigation you can't read is navigation nobody uses.",
          'Pick a light color for each link on the dark sidebar.'),
        goal('Make the balance big: 32px or more.', {minFont:32, ids:['balance']},
          'The balance is why customers open this page, so it should be the biggest thing on it.',
          "Raise the balance's font Size."),
        bonus('Line up Transfer and Pay Bills.', {sameY:['transferBtn','payBtn']},
          'Aligned buttons look deliberate and trustworthy.',
          'Give both buttons the same Y number.'),
        bonus('Space the sidebar links evenly.', {evenGapsY:['nav1','nav2','nav3']},
          'Even spacing makes a menu easy to scan.',
          'Make both gaps between the links the same.'),
      ],
      replyTemplates:{
        great:'Customers find their balance instantly now. Outstanding work.',
        ok:'The page is clearer, thank you.',
        bad:'Customers still struggle to find their balance.'
      }
    },

    // ================= Nimbus Goods =================,
    {
      id:'checkout-page', project:'nimbus', levelNumber:8, pageLabel:'Checkout page', concept:'Putting it together',
      emailPreview:'Thank you! Last and most important: our checkout page.',
      emailBody:`Hello again. This is our most important page: checkout.

Too many customers give up here. The error message is easy to miss, the Place Order button looks switched off, the total doesn't stand out from the subtotal, and the step labels are faint.

Please use everything you've learned to make checkout clear and confident.

Thank you,
Nimbus Goods`,
      attachmentName:'checkout_layout.png',
      canvas:{ w:960, h:640, bg:'#F7F8FA' },
      rubric:{ gridColumns:12, gridGutter:24, spacingUnit:16, weights:{ hierarchy:14, contrast:14 }, colorOnlyIds:['errorMsg'] },
      elements:[
        shape('bg','background',0,0,960,640,'#F7F8FA',{z:0}),
        txt('step1','label','1 Cart',40,24,80,24,13,'#4A5360',{fontWeight:'700'}),
        txt('step2','label','2 Shipping',136,24,104,24,13,'#C7CEDA',{fontWeight:'700'}),
        txt('step3','label','3 Payment',256,24,104,24,13,'#C7CEDA',{fontWeight:'700'}),
        txt('heading','heading','Shipping Details',40,72,400,40,28,'#22262E',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('lblName','label','Full Name',40,128,200,24,13,'#4A5360'),
        shape('inputName','card',40,152,280,40,'#FFFFFF',{radius:8}),
        txt('lblEmail','label','Email',352,128,200,24,13,'#4A5360'),
        shape('inputEmail','card',344,152,280,40,'#FFFFFF',{radius:8}),
        txt('errorMsg','small','⚠ Invalid email address',344,200,256,24,12,'#E3A0A0'),
        txt('lblAddr','label','Address',40,232,200,24,13,'#4A5360'),
        shape('inputAddr','card',40,256,584,40,'#FFFFFF',{radius:8}),
        shape('summaryCard','card',664,72,256,336,'#FFFFFF',{radius:14}),
        txt('subtotalLbl','body','Subtotal',680,96,136,24,15,'#4A5360'),
        txt('subtotalVal','body','₱4,300',816,96,88,24,15,'#4A5360',{align:'right'}),
        txt('totalLbl','body','Total',680,296,136,32,15,'#22262E',{fontFamily:'Baloo 2',fontWeight:'700'}),
        txt('totalVal','body','₱4,725',800,296,104,32,15,'#22262E',{fontFamily:'Baloo 2',fontWeight:'700',align:'right'}),
        btn('placeOrder','Place Order',664,432,256,48,16,'#F0E4D0','#E8C9A0',{radius:10}),
      ],
      goals:[
        goal('Make the error message easy to read.', {contrast:'AA', ids:['errorMsg']},
          "An error nobody notices can't help anyone fix their mistake.",
          'Choose a deep red for the error text.'),
        goal('Make the Place Order label readable on its button.', {contrast:'AA', ids:['placeOrder']},
          'The final button must look ready to press, not switched off.',
          'Use a dark label or a darker button color.'),
        goal('Make the total price bigger than the subtotal.', {bigger:['totalVal','subtotalVal']},
          'The total is what people actually pay, so it deserves the spotlight.',
          "Raise the total's font Size."),
        bonus('Line up the Email label and the error message on one left edge.', {sameX:['lblEmail','errorMsg']},
          'Things that belong to the same field should share an edge.',
          'Match their X numbers.'),
        bonus('Make the upcoming checkout steps readable.', {contrast:'AA', ids:['step2','step3']},
          'Knowing what comes next makes people more likely to finish.',
          'Darken the Shipping and Payment step colors.'),
      ],
      replyTemplates:{
        great:"Fewer people are giving up at checkout already. You're a real pro now!",
        ok:'Checkout is clearer now, thank you.',
        bad:'Customers still get stuck at checkout.'
      }
    },
  ];

  // Edits saved from the Level Maker ("Save to game") replace a level's
  // canvas and artwork on this browser. An edit that removed an element a
  // goal needs is ignored so the level stays solvable.
  try{
    const saved = JSON.parse(localStorage.getItem('eyecon_level_overrides') || '{}');
    LEVELS.forEach(level=>{
      const edit = saved[level.id];
      if(!edit || !Array.isArray(edit.elements)) return;
      const ids = new Set(edit.elements.map(el=>el.id));
      const needed = (level.goals || []).flatMap(g=>Object.values(g.check).filter(Array.isArray).flat());
      if(needed.every(id=>ids.has(id))) Object.assign(level, { canvas:edit.canvas, elements:edit.elements, edited:true });
    });
  }catch(e){ /* No storage (tests) or bad data: keep the built-in levels. */ }

  // Keep every canvas element's position and size on the 8-point grid.
  const to8=n=>Math.round(n/8)*8;
  LEVELS.forEach(level=>{
    level.canvas.w=to8(level.canvas.w); level.canvas.h=to8(level.canvas.h);
    level.rubric.gridUnit=8; level.rubric.spacingUnit=8;
    level.elements.forEach(el=>{
      el.w=Math.max(8,to8(el.w)); el.h=Math.max(8,to8(el.h));
      el.x=to8(el.x);el.y=to8(el.y);
      el.x=Math.max(0,Math.min(el.x,level.canvas.w-el.w));
      el.y=Math.max(0,Math.min(el.y,level.canvas.h-el.h));
    });
  });
  // Normalize the final authored artwork, including the poster overrides.
  LEVELS.forEach(level=>level.elements.forEach(el=>{
    for(const key of ['x','y','w','h','padding','margin','radius']){
      if(typeof el[key] === 'number') el[key] = to8(el[key]);
    }
    el.w = Math.max(8, el.w);
    el.h = Math.max(8, el.h);
    el.x = Math.max(0, Math.min(el.x, level.canvas.w - el.w));
    el.y = Math.max(0, Math.min(el.y, level.canvas.h - el.h));
  }));

  // Invisible answer boxes used by the placement grader. They deliberately
  // live in level data rather than the editor's element list, so players
  // cannot see or select them. Each editable element has one identity-matched
  // destination; imperfect proximity still earns proportional credit.
  LEVELS.forEach(level=>{
    level.hiddenTargets = level.elements.filter(el=>!el.locked).map(el=>({
      id:el.id,
      x:to8(el.x),
      y:to8(el.y),
      w:el.w,
      h:el.h,
    }));
  });

  // Link each page to its company and remember where it sits in that project.
  LEVELS.forEach(level=>{
    const project = PROJECTS.find(p=>p.id===level.project);
    const pages = LEVELS.filter(l=>l.project===level.project);
    Object.assign(level, {
      name: project.name, clientName: project.name, avatarEmoji: project.avatarEmoji, tier: project.tier,
      pageIndex: pages.indexOf(level), pageCount: pages.length,
    });
  });

  window.EC_LEVELS = LEVELS;
  window.EC_PROJECTS = PROJECTS;
  window.EC_ROLE_DEFAULTS = ROLE_DEFAULTS;
})();
