/* =====================================================
   EyeCon — Piko's dialogue in play order (window.EC_FLOW)
   Used by the admin dialogue editor to show each section as a script:
   the line, then what the game does next. `wait`:
     'click'  → talk line; the player clicks to continue (lines can be added after it)
     'action' → the player must DO something before Piko continues
   Keep this in step with the tutorial code in js/app.js.
===================================================== */
window.EC_FLOW = [
  { id:'desktop', scene:'desktop', title:'Day 1: Desktop welcome', steps:[
    { key:'piko.tutorial.0', wait:'click', cue:'Click to continue' },
    { key:'piko.askName', scene:'desktop', card:true, wait:'action', cue:'Name card pops up · player types their name' },
    { key:'piko.askNameTitle', wait:'action', cue:'(Title of the name card)' },
    { key:'piko.niceToMeet', wait:'click', cue:'Click to continue' },
    { key:'piko.tutorial.1', wait:'click', cue:'Click · red mail count pops onto the Mail app' },
    { key:'piko.tutorial.2', scene:'desktop', target:'#icon-mail', wait:'action', cue:'Screen dims · highlights the Mail app · waits for the player to open Mail' },
  ]},
  { id:'email', scene:'mail', title:'First email', steps:[
    { key:'piko.inboxGuide', scene:'mail', target:'#mail-list .mail-item', wait:'action', cue:'Highlights the email · waits for the player to open it' },
    { key:'piko.previewGuide', scene:'mail-detail', target:'#attachment-chip', wait:'action', cue:'(Shown after 2.5s of reading) highlights the attachment · waits for the player to open it' },
    { key:'piko.acceptGuide', scene:'mail-detail', target:'#btn-accept-job', top:true, wait:'action', cue:'(Shown after the preview closes) highlights Accept · waits for the click' },
  ]},
  { id:'workspace', scene:'editor:mayo-portfolio', title:'Workspace tour', steps:[
    { key:'piko.workspace.intro', wait:'click', cue:'Click to continue' },
    { key:'piko.workspace.pan', wait:'action', cue:'Player must pan with middle/right mouse for ~1s · 2s pause' },
    { key:'piko.workspace.zoom', wait:'action', cue:'Player must scroll to zoom · 2s pause · red dots pop in one by one' },
    { key:'piko.workspace.problems', wait:'click', cue:'Click to continue' },
    { key:'piko.workspace.dotsLater', wait:'click', cue:'Click to continue' },
    { key:'piko.workspace.together', wait:'click', cue:'Click · "About" gets a gold glow' },
    { key:'piko.workspace.selectAbout', wait:'action', cue:'Waits for the player to select "About"' },
    { key:'piko.workspace.controls', target:'#element-settings', left:true, wait:'click', cue:'Highlights the right panel · click to continue' },
    { key:'piko.workspace.taskLit', target:'#editor-mail-points .editor-goal', wait:'click', cue:'Highlights About’s task · click to continue' },
    { key:'piko.workspace.dragAbout', wait:'action', cue:'Waits until About is lined up and the mouse is released' },
    { key:'piko.workspace.nice', wait:'click', cue:'Click to continue' },
    { key:'piko.workspace.tasks', target:'#screen-editor .editor-side-rail:not(.editor-right-rail)', wait:'click', cue:'Highlights the task list · click to continue' },
    { key:'piko.workspace.grid', target:'#tool-grid', wait:'action', cue:'Highlights the grid button · waits for the click' },
    { key:'piko.workspace.gridDone', target:'#editor-canvas-wrap', wait:'click', cue:'Highlights the canvas · click to continue' },
    { key:'piko.workspace.gridSettings', target:'#tool-grid-settings', wait:'action', cue:'Highlights grid settings · waits for the click' },
    { key:'piko.workspace.gridSettingsDone', target:'#editor-canvas-wrap', wait:'action', cue:'Waits for a slider change · 1s pause · panel closes' },
    { key:'piko.workspace.submit', target:'#tool-save', left:true, wait:'click', cue:'Highlights Submit (locked) · click · Level 1 lesson starts' },
    { key:'piko.workspace.element', wait:'action', cue:'(Only if About is already aligned) waits for any red-dot element to be selected' },
  ]},
  { id:'lesson-mayo', scene:'editor:mayo-portfolio', title:'Lesson: Level 1 (alignment)', prefix:'piko.levels.mayo.' },
  { id:'compose', scene:'compose', title:'Writing the reply', steps:[
    { key:'piko.compose.type', target:'.compose-card', wait:'action', cue:'Highlights the reply · player types until the message is complete' },
    { key:'piko.compose.attach', target:'#compose-attach-btn', wait:'action', cue:'Highlights Attach · waits for the file to be attached' },
    { key:'piko.compose.send', target:'#btn-send-mail', wait:'action', cue:'Highlights Send · waits for the click · screen locks until the reply arrives' },
  ]},
  { id:'reply', scene:'mail', title:'Client reply', steps:[
    { key:'piko.reply.arrived', scene:'mail', target:'#mail-list .mail-item', wait:'action', cue:'Highlights the reply email · waits for the player to open it' },
    { key:'piko.reply.complete', scene:'mail-detail', target:'#btn-accept-job', top:true, wait:'action', cue:'(If approved, after 2s) highlights Mark Completed · waits for the click' },
    { key:'piko.reply.revise', scene:'mail-detail', target:'#btn-accept-job', top:true, wait:'action', cue:'(If sent back, after 2s) highlights Back to Editor · waits for the click' },
  ]},
  { id:'next-mail', scene:'mail', title:'Next client email', steps:[
    { key:'piko.nextMail', scene:'mail', target:'#mail-list .mail-item', wait:'action', cue:'After the reward card closes · highlights the new email · waits for it to be opened' },
  ]},
  { id:'lesson-yappers', scene:'editor:yappers-login', title:'Lesson: Level 2 (contrast)', prefix:'piko.levels.yappers.' },
  { id:'lesson-haybuhay', scene:'editor:haybuhay-settings', title:'Lesson: Level 3 (typography)', prefix:'piko.levels.haybuhay.' },
  { id:'basics', scene:'mail', title:'End of day 1', prefix:'piko.basicsDone.', lastCue:'Day summary appears' },
  { id:'lesson-antoks', scene:'editor:antoks-home', title:'Lesson: Level 4 (hints)', prefix:'piko.levels.antoks.' },
];
// Lesson sections: every numbered line under the prefix, clicked through in order.
window.EC_FLOW_STEPS = section => section.steps || Object.keys(window.EC_TEXT?.defaults || {})
  .filter(k => k.startsWith(section.prefix))
  .sort((a, b) => parseInt(a.slice(section.prefix.length)) - parseInt(b.slice(section.prefix.length)))
  .map((key, i, all) => {
    // Lesson lines are [text, selector]: point at the same thing the game does.
    const m = key.match(/^piko\.levels\.(\w+)\.(\d+)\.0$/), sel = m && window.EC_PIKO?.SCRIPT?.levels?.[m[1]]?.[+m[2]]?.[1];
    return { key, wait:'click', target: sel || undefined, left: sel === '#element-settings', cue: i === all.length - 1 ? (section.lastCue || 'Click · lesson ends') : 'Click to continue' };
  });
