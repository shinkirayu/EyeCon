/* =====================================================
   EyeCon — Level / client project definitions
   8 concept-driven levels, each introducing one new
   UI/UX or accessibility principle on top of the last.
   Exposes window.EC_LEVELS, window.EC_ROLE_DEFAULTS
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

  const LEVELS = [
    // ============================================================
    // LEVEL 1 — Basic Alignment
    // ============================================================
    {
      id:'coffee-shop',
      levelNumber:1,
      concept:'Basic Alignment',
      name:'Brewbird Coffee Co.',
      clientName:'Brewbird Coffee Co.',
      avatarEmoji:'☕',
      tier:'novice',
      unlockLevel:1,
      concepts:['Grid alignment', 'Snapping elements to a shared grid'],
      emailPreview:'Our new landing page hero feels messy and things don’t line up...',
      emailBody:`Hello! We're Brewbird Coffee Co.

We are getting ready to welcome more customers, but our landing page hero
looks messy because nothing lines up. Logo, links, heading and
button all feel randomly placed. Could you snap everything to a
clean, consistent grid?

Thanks a latte!
— Brewbird Team`,
      attachmentName:'hero_section.png',
      canvas:{ w:900, h:560, bg:'#FBEEDC' },
      rubric:{
        gridColumns:12, gridGutter:20, spacingUnit:16,
        weights:{ contrast:10, alignment:30, hierarchy:10, spacing:12, consistency:8, accessibility:15, usability:15 },
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:900,h:560, bg:'#FBEEDC', locked:true, z:0 },
        { id:'nav', type:'rect', role:'card', x:0,y:0,w:900,h:70, bg:'#F3DCB8', locked:true, z:1 },
        { id:'logo', type:'text', role:'subheading', text:'Brewbird', x:36,y:18,w:160,h:30,
          fontFamily:'Baloo 2', fontSize:20, fontWeight:'700', color:'#6B4226', bg:null, align:'left', z:2 },
        { id:'navlink1', type:'text', role:'nav', text:'Menu', x:560,y:24,w:60,h:22,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'600', color:'#6B4226', bg:null, align:'left', z:2 },
        { id:'navlink2', type:'text', role:'nav', text:'About', x:660,y:24,w:60,h:22,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'600', color:'#6B4226', bg:null, align:'left', z:2 },
        { id:'navlink3', type:'text', role:'nav', text:'Visit', x:790,y:24,w:60,h:22,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'600', color:'#6B4226', bg:null, align:'left', z:2 },
        { id:'heading', type:'text', role:'heading', text:'Slow mornings, better coffee', x:60,y:150,w:520,h:44,
          fontFamily:'Baloo 2', fontSize:32, fontWeight:'700', color:'#6B4226', bg:null, align:'left', z:2 },
        { id:'sub', type:'text', role:'subheading', text:'Small-batch roasts, delivered fresh weekly.', x:60,y:230,w:480,h:30,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'600', color:'#8B6A4B', bg:null, align:'left', z:2 },
        { id:'cta', type:'rect', role:'button', text:'Order Now', x:60,y:300,w:140,h:44,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#FFFFFF', bg:'#6B4226', radius:8, align:'center', z:3 },
        { id:'imgph', type:'rect', role:'decorative', x:620,y:120,w:240,h:300, bg:'#D7B990', radius:16, locked:true, z:1 },
        { id:'footer', type:'text', role:'small', text:'© Brewbird Coffee Co. All rights reserved.', x:60,y:520,w:400,h:18,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'500', color:'#8B6A4B', bg:null, align:'left', z:2 },
      ],
      replyTemplates:{
        great:"We snapped every element to a clean shared grid — logo, nav links, heading and button now all line up perfectly.",
        ok:"Alignment is much better now. A couple of elements could still use a nudge onto the grid.",
        bad:"We started aligning things to the grid, but several elements are still off — try the Grid + Snap tools together."
      }
    },

    // ============================================================
    // LEVEL 2 — Consistent Spacing
    // ============================================================
    {
      id:'clothing-store',
      levelNumber:2,
      concept:'Consistent Spacing',
      name:'Thread & Co.',
      clientName:'Thread & Co.',
      avatarEmoji:'👕',
      tier:'novice',
      unlockLevel:2,
      concepts:['Vertical rhythm', 'Consistent padding between elements', 'Grid reinforcement'],
      emailPreview:'Our product cards look messy and the spacing feels random...',
      emailBody:`Hi there,

Our product grid feels off — the gaps between the product name,
price and button are all different sizes on every card, and the
cards themselves don't quite line up. Please make the spacing feel
consistent and calm.

— Thread & Co.`,
      attachmentName:'product_grid.png',
      canvas:{ w:900, h:560, bg:'#F7F3EE' },
      rubric:{
        gridColumns:12, gridGutter:20, spacingUnit:16,
        weights:{ contrast:10, alignment:14, hierarchy:10, spacing:30, consistency:8, accessibility:13, usability:15 },
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:900,h:560, bg:'#F7F3EE', locked:true, z:0 },
        { id:'heading', type:'text', role:'heading', text:'New Arrivals', x:40,y:24,w:400,h:40,
          fontFamily:'Baloo 2', fontSize:30, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
        { id:'card1', type:'rect', role:'card', x:40,y:100,w:250,h:320, bg:'#FFFFFF', radius:10, locked:true, z:1 },
        { id:'card2', type:'rect', role:'card', x:318,y:96,w:250,h:320, bg:'#FFFFFF', radius:10, locked:true, z:1 },
        { id:'card3', type:'rect', role:'card', x:600,y:104,w:250,h:320, bg:'#FFFFFF', radius:10, locked:true, z:1 },
        { id:'badge', type:'rect', role:'label', text:'SALE', x:52,y:112,w:60,h:24,
          fontFamily:'Baloo 2', fontSize:11, fontWeight:'700', color:'#7A1F2B', bg:'#F7B9B9', radius:6, align:'center', z:3 },
        { id:'pname1', type:'text', role:'body', text:'Linen Shirt', x:52,y:340,w:220,h:24,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
        { id:'pprice1', type:'text', role:'body', text:'$48', x:52,y:368,w:120,h:24,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
        { id:'addcart', type:'rect', role:'button', text:'Add to Cart', x:52,y:396,w:200,h:44,
          fontFamily:'Baloo 2', fontSize:14, fontWeight:'700', color:'#FFFFFF', bg:'#B08968', radius:8, align:'center', z:3 },
        { id:'pname2', type:'text', role:'body', text:'Denim Jacket', x:330,y:334,w:220,h:24,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
        { id:'pprice2', type:'text', role:'body', text:'$96', x:330,y:362,w:120,h:24,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
        { id:'pname3', type:'text', role:'body', text:'Canvas Tote', x:612,y:342,w:220,h:24,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
        { id:'pprice3', type:'text', role:'body', text:'$34', x:612,y:370,w:120,h:24,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'700', color:'#2C2420', bg:null, align:'left', z:2 },
      ],
      replyTemplates:{
        great:"We put every card on the same grid and gave the name/price/button stack a consistent, calm rhythm of spacing.",
        ok:"Spacing is more consistent now. Double-check the gap between price and button on each card.",
        bad:"We nudged some spacing, but the gaps between elements are still inconsistent card to card."
      }
    },

    // ============================================================
    // LEVEL 3 — Typography Hierarchy
    // ============================================================
    {
      id:'school-portal',
      levelNumber:3,
      concept:'Typography Hierarchy',
      name:'Cedar Valley School Portal',
      clientName:'Cedar Valley School Portal',
      avatarEmoji:'🎒',
      tier:'intermediate',
      unlockLevel:3,
      concepts:['Heading order (h1 > h2 > body)', 'Link contrast', 'Notification without color alone'],
      emailPreview:'Parents say they cannot tell what is most important on the page...',
      emailBody:`Hi,

Parents tell us our portal dashboard is confusing — the section
title is bigger than the page title, links are hard to spot, and
our notification dot is the only way to know something is new.
Could you help reorganize the type scale so people know what to
read first?

— Cedar Valley IT Team`,
      attachmentName:'portal_dashboard.png',
      canvas:{ w:900, h:580, bg:'#F5F6FA' },
      rubric:{
        gridColumns:12, gridGutter:20, spacingUnit:16,
        weights:{ contrast:10, alignment:12, hierarchy:30, spacing:10, consistency:8, accessibility:15, usability:15 },
        colorOnlyIds:['notifDot'],
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:900,h:580, bg:'#F5F6FA', locked:true, z:0 },
        { id:'pageTitle', type:'text', role:'heading', text:'Student Dashboard', x:40,y:30,w:400,h:34,
          fontFamily:'Baloo 2', fontSize:20, fontWeight:'700', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'sectionTitle', type:'text', role:'subheading', text:'Upcoming Assignments', x:40,y:90,w:400,h:36,
          fontFamily:'Baloo 2', fontSize:30, fontWeight:'700', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'row1', type:'rect', role:'card', x:40,y:150,w:520,h:50, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'row1link', type:'text', role:'nav', text:'Algebra II — Worksheet 4', x:60,y:166,w:400,h:20,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#B7BAD1', bg:null, align:'left', z:2 },
        { id:'row2', type:'rect', role:'card', x:40,y:210,w:520,h:50, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'row2link', type:'text', role:'nav', text:'World History — Essay', x:60,y:226,w:400,h:20,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#B7BAD1', bg:null, align:'left', z:2 },
        { id:'notifDot', type:'rect', role:'label', x:640,y:30,w:14,h:14, bg:'#D64545', radius:7, locked:false, z:3 },
        { id:'notifBell', type:'text', role:'nav', text:'🔔', x:610,y:24,w:26,h:26,
          fontFamily:'Quicksand', fontSize:18, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'viewAll', type:'text', role:'button', text:'View All', x:600,y:150,w:120,h:34,
          fontFamily:'Baloo 2', fontSize:14, fontWeight:'700', color:'#7B7FAE', bg:null, align:'left', z:2 },
      ],
      replyTemplates:{
        great:"We rebalanced the type scale so the page title now leads, made links clearly distinguishable, and paired the notification dot with a label for non-color users.",
        ok:"Heading hierarchy is much clearer now. Consider double-checking link contrast throughout.",
        bad:"We started adjusting the hierarchy, but heading order and link contrast still need attention."
      }
    },

    // ============================================================
    // LEVEL 4 — Color Contrast (WCAG)
    // ============================================================
    {
      id:'almel-canteen',
      levelNumber:4,
      concept:'Color Contrast (WCAG)',
      name:"Almel's Canteen",
      clientName:"Almel's Canteen",
      avatarEmoji:'🍱',
      tier:'intermediate',
      unlockLevel:4,
      concepts:['WCAG contrast ratios (AA)', 'Large vs. normal text thresholds'],
      emailPreview:'"Hi, good day this is Almel’s Canteen" - we would...',
      emailBody:`Hi, good day this is Almel's Canteen

We would like to request help in improving our poster,
as some parts are hard to read.
We hope to make it more clear, and readable
for our customers. Looking forward to your assistance. Thank you!

Best regards,
Almels Canteen Team`,
      attachmentName:'poster_layout.png',
      canvas:{ w:520, h:720, bg:'#F5C544' },
      rubric:{
        gridColumns:4, gridGutter:16, spacingUnit:12,
        weights:{ contrast:30, alignment:10, hierarchy:10, spacing:10, consistency:8, accessibility:17, usability:15 },
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:520,h:720, color:null, bg:'#F5C544', radius:0, locked:true, z:0 },
        { id:'paper', type:'rect', role:'card', x:60,y:150,w:400,h:520, color:null, bg:'#F0FBFB', radius:4, locked:true, z:1 },
        { id:'title', type:'text', role:'heading', text:"ALMEL's CANTEEN", x:70,y:40,w:300,h:32,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#D8342A', bg:null, align:'left', z:3 },
        { id:'menuBadge', type:'rect', role:'button', text:"TODAY'S MENU", x:250,y:120,w:280,h:60,
          fontFamily:'Baloo 2', fontSize:19, fontWeight:'700', color:'#FFFFFF', bg:'#E4703A', radius:14, align:'center', z:4 },
        { id:'item1', type:'text', role:'body', text:'Rice Meals - 80', x:110,y:290,w:340,h:44,
          fontFamily:'Baloo 2', fontSize:26, fontWeight:'700', color:'#1A1A1A', bg:null, align:'center', z:3 },
        { id:'item2', type:'text', role:'body', text:'Dessert - 80', x:110,y:352,w:340,h:44,
          fontFamily:'Baloo 2', fontSize:26, fontWeight:'700', color:'#1A1A1A', bg:null, align:'center', z:3 },
        { id:'item3', type:'text', role:'body', text:'Drinks - 30', x:110,y:414,w:340,h:44,
          fontFamily:'Baloo 2', fontSize:26, fontWeight:'700', color:'#1A1A1A', bg:null, align:'center', z:3 },
        { id:'cash', type:'text', role:'small', text:'We accept cash only', x:130,y:510,w:300,h:20,
          fontFamily:'Quicksand', fontSize:10, fontWeight:'500', color:'#9AA0A6', bg:null, align:'center', z:3 },
        { id:'starburst', type:'rect', role:'decorative', x:150,y:565,w:220,h:170, color:null, bg:'#E4703A', radius:110, locked:true, z:2 },
        { id:'burstText', type:'text', role:'button', text:'BEST FOOD EVER', x:170,y:610,w:180,h:70,
          fontFamily:'Baloo 2', fontSize:22, fontWeight:'700', color:'#9AA0A6', bg:null, align:'center', z:5 },
      ],
      replyTemplates:{
        great:"Attached is the revised version of your poster with improved clarity and readability. We hope you like the updated design. Please let us know if you need any further changes. Thank you!",
        ok:"Attached is the revised poster. We improved several readability issues, though a few refinements are still possible. Let us know if you'd like another pass.",
        bad:"Attached is a first revision of your poster. We addressed some issues, but recommend another round of edits to fully meet readability standards."
      }
    },

    // ============================================================
    // LEVEL 5 — Accessibility Improvements
    // ============================================================
    {
      id:'hospital-app',
      levelNumber:5,
      concept:'Accessibility Improvements',
      name:'Willowmere Clinic',
      clientName:'Willowmere Clinic',
      avatarEmoji:'🏥',
      tier:'advanced',
      unlockLevel:5,
      concepts:['Form label contrast', 'Minimum readable font size', 'Consistent heading scale'],
      emailPreview:'Patients say the booking form is confusing and hard to read...',
      emailBody:`Hello,

Patients are struggling with our appointment booking form. Labels
are hard to read, text is too small in places, and every heading
looks the same size. Please help us make this more accessible for
patients of all ages and abilities.

Thank you,
Willowmere Clinic`,
      attachmentName:'booking_form.png',
      canvas:{ w:820, h:600, bg:'#F2F7F6' },
      rubric:{
        gridColumns:8, gridGutter:20, spacingUnit:16,
        weights:{ contrast:14, alignment:10, hierarchy:10, spacing:10, consistency:6, accessibility:35, usability:15 },
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:820,h:600, bg:'#F2F7F6', locked:true, z:0 },
        { id:'title', type:'text', role:'heading', text:'Book an Appointment', x:50,y:36,w:500,h:36,
          fontFamily:'Baloo 2', fontSize:19, fontWeight:'700', color:'#1F3A3A', bg:null, align:'left', z:2 },
        { id:'section', type:'text', role:'subheading', text:'Patient Details', x:50,y:96,w:400,h:28,
          fontFamily:'Baloo 2', fontSize:19, fontWeight:'700', color:'#1F3A3A', bg:null, align:'left', z:2 },
        { id:'lbl1', type:'text', role:'label', text:'Full Name *', x:50,y:150,w:200,h:20,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'600', color:'#9FB3B1', bg:null, align:'left', z:2 },
        { id:'input1', type:'rect', role:'card', x:50,y:174,w:340,h:38, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'lbl2', type:'text', role:'label', text:'Preferred Date *', x:50,y:230,w:200,h:20,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'600', color:'#9FB3B1', bg:null, align:'left', z:2 },
        { id:'input2', type:'rect', role:'card', x:50,y:254,w:220,h:38, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'lbl3', type:'text', role:'label', text:'Reason for Visit', x:50,y:310,w:200,h:20,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'600', color:'#9FB3B1', bg:null, align:'left', z:2 },
        { id:'input3', type:'rect', role:'card', x:50,y:334,w:500,h:70, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'submit', type:'rect', role:'button', text:'Confirm Booking', x:50,y:436,w:200,h:42,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#DCEFEC', bg:'#BFE3DC', radius:10, align:'center', z:3 },
      ],
      replyTemplates:{
        great:"We darkened form labels for legibility, distinguished the section heading from the page title, and strengthened the submit button's contrast.",
        ok:"We improved label readability and the submit button. The heading hierarchy could use one more pass.",
        bad:"We started addressing label contrast, but the form still needs hierarchy and contrast improvements."
      }
    },

    // ============================================================
    // LEVEL 6 — Responsive Layout
    // ============================================================
    {
      id:'social-app',
      levelNumber:6,
      concept:'Responsive Layout',
      name:'Flockr',
      clientName:'Flockr',
      avatarEmoji:'🐦',
      tier:'advanced',
      unlockLevel:6,
      concepts:['Safe margins on small screens', 'Touch target size', 'Username/handle hierarchy'],
      emailPreview:'Users are mis-tapping icons and content feels cramped on mobile...',
      emailBody:`Hey!

This is our mobile feed — everything needs to comfortably fit a
narrow phone screen. Right now content crowds the edges, the
like/comment icons are too small and close together, and the
username and handle look identical. Could you clean this up for a
small, responsive screen?

— Flockr Team`,
      attachmentName:'feed_card.png',
      canvas:{ w:420, h:640, bg:'#FFFFFF' },
      rubric:{
        gridColumns:4, gridGutter:12, spacingUnit:12, safeMargin:16,
        weights:{ contrast:10, alignment:12, hierarchy:8, spacing:10, consistency:6, accessibility:24, usability:30 },
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:420,h:640, bg:'#FFFFFF', locked:true, z:0 },
        { id:'topbar', type:'rect', role:'card', x:0,y:0,w:420,h:56, bg:'#F0F2F5', locked:true, z:1 },
        { id:'icon1', type:'text', role:'nav', text:'🏠', x:20,y:14,w:22,h:22,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'icon2', type:'text', role:'nav', text:'🔍', x:48,y:14,w:22,h:22,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'icon3', type:'text', role:'nav', text:'➕', x:76,y:14,w:22,h:22,
          fontFamily:'Quicksand', fontSize:16, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'avatar', type:'rect', role:'decorative', x:20,y:80,w:44,h:44, bg:'#CFE3E8', radius:22, locked:true, z:1 },
        { id:'username', type:'text', role:'body', text:'jordan.codes', x:76,y:84,w:200,h:20,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'handle', type:'text', role:'body', text:'@jordan.codes · 2h', x:76,y:104,w:200,h:20,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'photo', type:'rect', role:'decorative', x:0,y:150,w:420,h:260, bg:'#DDE6EE', locked:true, z:1 },
        { id:'likeIcon', type:'text', role:'button', text:'♥', x:4,y:430,w:20,h:20,
          fontFamily:'Quicksand', fontSize:15, fontWeight:'600', color:'#D64545', bg:null, align:'left', z:2 },
        { id:'commentIcon', type:'text', role:'button', text:'💬', x:28,y:430,w:20,h:20,
          fontFamily:'Quicksand', fontSize:15, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
        { id:'shareIcon', type:'text', role:'button', text:'↗', x:52,y:430,w:20,h:20,
          fontFamily:'Quicksand', fontSize:15, fontWeight:'600', color:'#2B2E4A', bg:null, align:'left', z:2 },
      ],
      replyTemplates:{
        great:"We gave every edge a safe margin so nothing crowds the screen border, enlarged and spaced out the like/comment/share icons for confident tapping, and gave the username clear visual priority over the handle.",
        ok:"Safe margins and icon spacing are improved. Consider enlarging tap targets a bit further for comfortable mobile use.",
        bad:"We made small adjustments, but content still crowds the edges and tap targets need to be bigger."
      }
    },

    // ============================================================
    // LEVEL 7 — Complex Dashboard Design
    // ============================================================
    {
      id:'banking-dashboard',
      levelNumber:7,
      concept:'Complex Dashboard Design',
      name:'Meridian Bank',
      clientName:'Meridian Bank',
      avatarEmoji:'🏦',
      tier:'expert',
      unlockLevel:7,
      concepts:['Hierarchy for critical data', 'Not relying on color alone', 'Sidebar contrast', 'Combining every prior concept at scale'],
      emailPreview:'Users say they cannot find their account balance quickly...',
      emailBody:`Good afternoon,

Our account dashboard is confusing customers — the balance isn't
prominent, the sidebar text is hard to read, and our "insufficient
funds" warning relies only on red text. This is a full dashboard
with a lot of moving pieces, so please bring everything up to
professional standards: alignment, spacing, hierarchy, contrast and
accessibility all at once.

Regards,
Meridian Bank Product Team`,
      attachmentName:'dashboard_layout.png',
      canvas:{ w:900, h:580, bg:'#EAF0F6' },
      rubric:{
        gridColumns:12, gridGutter:20, spacingUnit:16,
        weights:{ contrast:14, alignment:14, hierarchy:14, spacing:14, consistency:10, accessibility:20, usability:14 },
        colorOnlyIds:['warnIcon'],
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:900,h:580, bg:'#EAF0F6', locked:true, z:0 },
        { id:'sidebar', type:'rect', role:'card', x:0,y:0,w:200,h:580, bg:'#274472', locked:true, z:1 },
        { id:'nav1', type:'text', role:'nav', text:'Overview', x:28,y:40,w:150,h:24,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#3B5D8C', bg:null, align:'left', z:2 },
        { id:'nav2', type:'text', role:'nav', text:'Transfers', x:28,y:90,w:150,h:24,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#3B5D8C', bg:null, align:'left', z:2 },
        { id:'nav3', type:'text', role:'nav', text:'Cards', x:28,y:150,w:150,h:24,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#3B5D8C', bg:null, align:'left', z:2 },
        { id:'balanceLbl', type:'text', role:'body', text:'Available Balance', x:240,y:40,w:300,h:22,
          fontFamily:'Quicksand', fontSize:14, fontWeight:'600', color:'#5A6B7B', bg:null, align:'left', z:2 },
        { id:'balance', type:'text', role:'heading', text:'$4,208.12', x:240,y:66,w:340,h:36,
          fontFamily:'Baloo 2', fontSize:20, fontWeight:'700', color:'#1E2A38', bg:null, align:'left', z:2 },
        { id:'card1', type:'rect', role:'card', x:240,y:140,w:300,h:160, bg:'#FFFFFF', radius:12, locked:true, z:1 },
        { id:'card2', type:'rect', role:'card', x:560,y:140,w:300,h:160, bg:'#FFFFFF', radius:12, locked:true, z:1 },
        { id:'warnIcon', type:'text', role:'label', text:'Low balance', x:260,y:340,w:200,h:24,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'700', color:'#D64545', bg:null, align:'left', z:3 },
        { id:'transferBtn', type:'rect', role:'button', text:'Transfer', x:240,y:400,w:130,h:40,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#FFFFFF', bg:'#2E8C7E', radius:8, align:'center', z:3 },
        { id:'payBtn', type:'rect', role:'button', text:'Pay Bills', x:390,y:404,w:130,h:40,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#FFFFFF', bg:'#2E8C7E', radius:8, align:'center', z:3 },
      ],
      replyTemplates:{
        great:"We made the balance the clear visual anchor, brightened sidebar text for legibility, aligned every card to the grid, evened out spacing, and paired the low-balance warning with an icon and label so it doesn't rely on color alone.",
        ok:"We improved balance prominence and sidebar contrast. A few alignment and spacing details could still be tightened up.",
        bad:"We made initial adjustments, but hierarchy, contrast, alignment and spacing on the dashboard still need more work."
      }
    },

    // ============================================================
    // LEVEL 8 — Final Client Challenge (combines everything)
    // ============================================================
    {
      id:'checkout-page',
      levelNumber:8,
      concept:'Final Client Challenge',
      name:'Nimbus Goods',
      clientName:'Nimbus Goods',
      avatarEmoji:'🛒',
      tier:'expert',
      unlockLevel:8,
      concepts:['Multi-column grid alignment', 'Error messaging accessibility', 'Price hierarchy', 'Progress indicators', 'Every concept from Levels 1–7 at once'],
      emailPreview:'Our checkout has a high drop-off rate, please review everything...',
      emailBody:`Hello,

Our checkout page has a high cart-abandonment rate. Customers say
the form fields don't line up, the error message is easy to miss,
the total price doesn't stand out from the subtotal, and it's
unclear what step of checkout they're on. This is our biggest page
and your final assignment with us — please give it your full
attention and put everything you've learned to use.

Thank you,
Nimbus Goods`,
      attachmentName:'checkout_layout.png',
      canvas:{ w:960, h:640, bg:'#F7F8FA' },
      rubric:{
        gridColumns:12, gridGutter:24, spacingUnit:16,
        weights:{ contrast:14, alignment:14, hierarchy:14, spacing:14, consistency:12, accessibility:18, usability:14 },
        colorOnlyIds:['errorMsg'],
      },
      elements:[
        { id:'bg', type:'rect', role:'background', x:0,y:0,w:960,h:640, bg:'#F7F8FA', locked:true, z:0 },
        { id:'step1', type:'text', role:'label', text:'1 Cart', x:40,y:24,w:80,h:22,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'700', color:'#9AA6B2', bg:null, align:'left', z:2 },
        { id:'step2', type:'text', role:'label', text:'2 Shipping', x:140,y:24,w:100,h:22,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'700', color:'#C7CEDA', bg:null, align:'left', z:2 },
        { id:'step3', type:'text', role:'label', text:'3 Payment', x:260,y:24,w:100,h:22,
          fontFamily:'Quicksand', fontSize:13, fontWeight:'700', color:'#C7CEDA', bg:null, align:'left', z:2 },
        { id:'heading', type:'text', role:'heading', text:'Shipping Details', x:40,y:70,w:400,h:36,
          fontFamily:'Baloo 2', fontSize:24, fontWeight:'700', color:'#22262E', bg:null, align:'left', z:2 },
        { id:'lblName', type:'text', role:'label', text:'Full Name', x:40,y:126,w:200,h:18,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'600', color:'#7C8794', bg:null, align:'left', z:2 },
        { id:'inputName', type:'rect', role:'card', x:40,y:148,w:280,h:38, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'lblEmail', type:'text', role:'label', text:'Email', x:352,y:126,w:200,h:18,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'600', color:'#7C8794', bg:null, align:'left', z:2 },
        { id:'inputEmail', type:'rect', role:'card', x:340,y:150,w:280,h:38, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'errorMsg', type:'text', role:'small', text:'Invalid email address', x:340,y:190,w:250,h:18,
          fontFamily:'Quicksand', fontSize:11, fontWeight:'600', color:'#E3A0A0', bg:null, align:'left', z:2 },
        { id:'lblAddr', type:'text', role:'label', text:'Address', x:40,y:222,w:200,h:18,
          fontFamily:'Quicksand', fontSize:12, fontWeight:'600', color:'#7C8794', bg:null, align:'left', z:2 },
        { id:'inputAddr', type:'rect', role:'card', x:40,y:244,w:560,h:38, bg:'#FFFFFF', radius:8, locked:true, z:1 },
        { id:'summaryCard', type:'rect', role:'card', x:660,y:70,w:260,h:340, bg:'#FFFFFF', radius:14, locked:true, z:1 },
        { id:'subtotalLbl', type:'text', role:'body', text:'Subtotal', x:684,y:100,w:140,h:22,
          fontFamily:'Quicksand', fontSize:15, fontWeight:'600', color:'#4A5360', bg:null, align:'left', z:2 },
        { id:'subtotalVal', type:'text', role:'body', text:'$86.00', x:840,y:100,w:80,h:22,
          fontFamily:'Quicksand', fontSize:15, fontWeight:'600', color:'#4A5360', bg:null, align:'right', z:2 },
        { id:'totalLbl', type:'text', role:'body', text:'Total', x:684,y:300,w:140,h:26,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#22262E', bg:null, align:'left', z:2 },
        { id:'totalVal', type:'text', role:'body', text:'$94.50', x:830,y:300,w:90,h:26,
          fontFamily:'Baloo 2', fontSize:15, fontWeight:'700', color:'#22262E', bg:null, align:'right', z:2 },
        { id:'placeOrder', type:'rect', role:'button', text:'Place Order', x:660,y:430,w:260,h:44,
          fontFamily:'Baloo 2', fontSize:16, fontWeight:'700', color:'#F0E4D0', bg:'#E8C9A0', radius:10, align:'center', z:3 },
      ],
      replyTemplates:{
        great:"We aligned every field to a shared grid, made the error state readable with icon + text, gave the total real visual weight over the subtotal, clarified the checkout progress steps, and tightened spacing and contrast across the whole page.",
        ok:"Alignment and price hierarchy are much improved. The error message and progress steps could use one more pass.",
        bad:"We began addressing the checkout issues, but grid alignment, error visibility, and price hierarchy still need work."
      }
    },
  ];

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
  const poster=LEVELS.find(l=>l.id==='almel-canteen');
  poster.canvas={w:512,h:720,bg:'#f4d444'};
  const posterChanges={
    bg:{w:512,h:720,bg:'#f4d444'},
    paper:{x:72,y:112,w:368,h:464,bg:'#efffff',radius:0,shape:'trapezoid'},
    title:{x:120,y:32,w:272,h:48,fontFamily:'Just Another Hand',fontSize:28,align:'center'},
    menuBadge:{x:224,y:96,w:224,h:80,fontFamily:'Just Another Hand',fontSize:40,bg:'#e56b31',radius:24},
    item1:{x:112,y:192,w:304,h:48,fontFamily:'Modak',fontSize:36},
    item2:{x:112,y:240,w:304,h:48,fontFamily:'Modak',fontSize:36},
    item3:{x:112,y:288,w:304,h:48,fontFamily:'Modak',fontSize:36},
    cash:{x:152,y:384,w:224,h:40,fontFamily:'Fjalla One',fontSize:16,color:'#17201d',text:'WE ACCEPT CASH ONLY'},
    starburst:{x:136,y:424,w:240,h:240,bg:'#ff7900',radius:0,shape:'starburst'},
    burstText:{x:168,y:496,w:176,h:88,fontFamily:'Fjalla One',fontSize:32,text:'BEST FOOD\nEVER',color:'#9aa0a6',align:'center'}
  };
  poster.elements.forEach(el=>Object.assign(el,posterChanges[el.id]||{}));

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

  window.EC_LEVELS = LEVELS;
  window.EC_ROLE_DEFAULTS = ROLE_DEFAULTS;
})();
