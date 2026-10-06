import { expect, test } from '@playwright/test';


const openClient = async (page, name) => {
  await page.getByRole('listitem').filter({hasText:name}).click({timeout:20000});
  await page.getByRole('button',{name:'Accept'}).click();
};

// Piko's tutorial covers the screen on a fresh save; only its own test keeps it.
test.beforeEach(async ({ page }, info) => {
  if(!/Piko/.test(info.title)) await page.addInitScript(()=>{ window.EC_NO_PIKO = true; window.EC_ALL_JOBS = true; });
});

test('Piko welcomes the player on the first desktop visit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  const bubble = page.locator('.piko-bubble');
  await expect(bubble).toBeVisible();
  await expect(bubble).toContainText('Piko');
});

async function beginFirstDay(page) {
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  const ready=page.getByRole('button', { name: /ready/i });
  if(await ready.isVisible()) await ready.click();
  await page.getByRole('button', { name: 'Open Mail app' }).click();
}

test('opens the studio desktop from the home monitor', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/EyeCon/);

  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await expect(page.getByRole('region', { name: 'Desktop' })).toBeVisible();
  await expect(page.locator('.piko-bubble,.piko-cursor,.piko-hole')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Mail app' })).toBeVisible();
  const mail=await page.locator('#icon-mail').boundingBox();
  const maker=await page.locator('#icon-maker').boundingBox();
  // One column of equal square cells.
  expect(maker.y).toBeGreaterThan(mail.y+mail.height-1);
  expect(Math.abs(maker.x-mail.x)).toBeLessThan(2);
  expect(Math.abs(maker.width-mail.width)).toBeLessThan(2);
  expect(Math.abs(mail.width-mail.height)).toBeLessThan(2);
});

test('level maker creates and exports an 8px-aligned design', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await expect(page.getByRole('region', { name: 'Level Maker' })).toBeVisible();
  await page.locator('[data-maker-add="text"]').click();
  await page.locator('[data-maker-field="x"]').fill('19');
  await page.locator('[data-maker-field="x"]').blur();
  await expect(page.locator('[data-maker-field="x"]')).toHaveValue('16');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#maker-export-toggle').click();
  await page.locator('[data-maker-export="json"]').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const pngPromise=page.waitForEvent('download');
  await page.locator('#maker-export-toggle').click();
  await page.locator('[data-maker-export="png"]').click();
  expect((await pngPromise).suggestedFilename()).toMatch(/\.png$/);
});

test('level maker layer visibility hides and restores canvas artwork', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await page.locator('[data-maker-add="shape"]').click();
  await expect(page.locator('#maker-canvas .maker-element')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hide layer' }).click();
  await expect(page.locator('#maker-canvas .maker-element')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show layer' })).toBeVisible();
  await page.getByRole('button', { name: 'Show layer' }).click();
  await expect(page.locator('#maker-canvas .maker-element')).toHaveCount(1);
  await page.getByRole('button', { name: 'Lock selected element' }).click();
  await expect(page.getByRole('button', { name: 'Unlock selected element' })).toBeVisible();
});

test('commission color tool adjusts lightness without opening a free color picker', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.evaluate(() => {
    const level=EC_LEVELS.find(item=>item.id==='yappers-login');
    document.querySelectorAll('.screen.active').forEach(screen=>screen.classList.remove('active'));
    document.getElementById('screen-editor').classList.add('active');
    EC_EDITOR.open(level);
    EC_EDITOR.selectElement('title');
  });
  const slider=page.locator('#f-color');
  await expect(slider).toHaveAttribute('type','range');
  await expect(page.locator('#f-contrast')).toContainText('Against background');
  await expect(page.locator('.editor-tone-vertical #f-color')).toHaveCSS('writing-mode','vertical-lr');
  const before=await page.evaluate(()=>EC_EDITOR.getElements().find(el=>el.id==='title').color);
  const comparison=await slider.evaluate(input=>{input.value='20';input.dispatchEvent(new Event('input',{bubbles:true}));return document.getElementById('f-contrast')?.textContent;});
  const after=await page.evaluate(()=>EC_EDITOR.getElements().find(el=>el.id==='title').color);
  expect(after).not.toBe(before);
  expect(comparison).toContain('Against background');
});

test('level maker custom canvas, layer order, image upload, and target peek', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await page.locator('#maker-preset').selectOption('custom');
  await page.locator('#maker-width').fill('777');
  await page.locator('#maker-width').blur();
  await expect(page.locator('#maker-width')).toHaveValue('776');
  await page.locator('[data-maker-add="text"]').click();
  await page.locator('[data-maker-add="shape"]').click();
  const rows=page.locator('#maker-layers [data-layer-id]');
  const first=await rows.first().getAttribute('data-layer-id');
  await rows.first().dragTo(rows.last());
  await expect(rows.first()).not.toHaveAttribute('data-layer-id',first);
  await page.locator('#maker-image-upload').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aV8AAAAASUVORK5CYII=','base64')});
  await expect(page.locator('#maker-canvas .maker-element img')).toHaveCount(1);
  await page.locator('#maker-add-target').click();
  await expect(page.locator('#maker-targets-list .maker-layer-row')).toHaveCount(1);
  const eye=page.locator('#maker-peek-targets');
  await eye.hover();
  await page.mouse.down();
  await expect(page.locator('#maker-canvas')).toHaveClass(/peek-targets/);
  await page.mouse.up();
  await expect(page.locator('#maker-canvas')).not.toHaveClass(/peek-targets/);
});

test('creator canvas zoom, resize handles, history, and quick delete', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await page.locator('#maker-zoom-in').click();
  await expect(page.locator('#maker-zoom-label')).toHaveText('125%');
  await page.locator('#maker-zoom-out').click();
  await expect(page.locator('#maker-zoom-label')).toHaveText('100%');
  await page.locator('#maker-stage').hover();
  await page.mouse.wheel(0,-100);
  await expect(page.locator('#maker-zoom-label')).toHaveText('125%');
  await page.mouse.wheel(0,100);
  await expect(page.locator('#maker-zoom-label')).toHaveText('100%');
  expect(await page.locator('#taskbar-clock').evaluate(el=>getComputedStyle(el).fontFamily)).toMatch(/Baloo/);
  await page.locator('[data-maker-add="shape"]').click();
  const element=page.locator('#maker-canvas .maker-element');
  await expect(element).toHaveCount(1);
  const originalWidth=await element.evaluate(el=>parseInt(el.style.width,10));
  const handle=page.locator('.maker-resize-handle.e');
  await handle.scrollIntoViewIfNeeded();
  const box=await handle.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+48,box.y+box.height/2,{steps:6});
  await page.mouse.up();
  const grownWidth=await element.evaluate(el=>parseInt(el.style.width,10));
  expect(grownWidth).toBeGreaterThan(originalWidth);
  expect(grownWidth%8).toBe(0);
  await page.locator('#maker-undo').click();
  await expect(element).toHaveCSS('width',`${originalWidth}px`);
  await page.locator('#maker-redo').click();
  await expect(element).toHaveCSS('width',`${grownWidth}px`);
  await page.locator('#maker-layers .maker-layer-delete').click();
  await expect(element).toHaveCount(0);
  await page.locator('#maker-undo').click();
  await expect(element).toHaveCount(1);
});

test('creator canvas selects layers and moves and scales elements', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await page.locator('[data-maker-add="shape"]').click();
  await page.locator('[data-maker-add="text"]').click();
  // Pick the shape from Layers, then move the text box off it so the drag
  // below lands on the shape (clicks go to the topmost element).
  await page.locator('#maker-layers [data-layer-id]').first().click();
  await page.locator('[data-maker-field="x"]').fill('400'); await page.locator('[data-maker-field="x"]').dispatchEvent('change');
  await page.locator('#maker-layers [data-layer-id]').last().click();
  const element=page.locator('#maker-canvas .maker-element.selected');
  await expect(element).toHaveAttribute('data-id',await page.locator('#maker-layers [data-layer-id]').last().getAttribute('data-layer-id'));
  const before=await element.evaluate(el=>({x:parseInt(el.style.left,10),w:parseInt(el.style.width,10),h:parseInt(el.style.height,10)}));
  await element.scrollIntoViewIfNeeded();
  const box=await element.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+48,box.y+box.height/2,{steps:6});
  await page.mouse.up();
  const movedX=await element.evaluate(el=>parseInt(el.style.left,10));
  expect(movedX).toBeGreaterThan(before.x);
  const corner=page.locator('.maker-resize-handle.se');
  await corner.scrollIntoViewIfNeeded();
  const cornerBox=await corner.boundingBox();
  await page.mouse.move(cornerBox.x+cornerBox.width/2,cornerBox.y+cornerBox.height/2);
  await page.mouse.down();
  await page.mouse.move(cornerBox.x+cornerBox.width/2+40,cornerBox.y+cornerBox.height/2+40,{steps:6});
  await page.mouse.up();
  const after=await element.evaluate(el=>({w:parseInt(el.style.width,10),h:parseInt(el.style.height,10)}));
  expect(after.w).toBeGreaterThan(before.w);
  expect(after.h).toBeGreaterThan(before.h);
});

test('level maker keeps element dragging separate from canvas panning', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await expect(page.getByRole('region', { name: 'Level Maker' })).toBeVisible();
  if (testInfo.project.name === 'chromium') {
    const actions=await page.locator('.maker-header-actions').boundingBox();
    const header=await page.locator('.maker-header').boundingBox();
    expect(actions.x+actions.width).toBeGreaterThan(header.x+header.width-32);
  }
  await page.locator('[data-maker-add="shape"]').click();
  await page.locator('#maker-zoom-in').click();
  const element=page.locator('#maker-canvas .maker-element.selected');
  await element.scrollIntoViewIfNeeded();
  const box=await element.boundingBox();
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.click(x,y,{button:'middle'});
  await expect(element).toHaveCount(1);
  const before=await element.evaluate(el=>parseInt(el.style.left,10));
  const canvasTransform=await page.locator('#maker-canvas').evaluate(el=>el.style.transform);
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+48,y,{steps:6});
  await page.mouse.up();
  expect(await element.evaluate(el=>parseInt(el.style.left,10))).toBeGreaterThan(before);
  expect(await page.locator('#maker-canvas').evaluate(el=>el.style.transform)).toBe(canvasTransform);
});

test('level maker edits text, locks layers, and preserves size at canvas edges', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  await page.locator('[data-maker-add="text"]').click();
  const text=page.locator('#maker-canvas .maker-element.selected');
  await expect(text).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await text.dblclick();
  await expect(text).toHaveAttribute('contenteditable','true');
  await text.fill('Canvas copy');
  await page.locator('#maker-title').click();
  await expect(text).toHaveText('Canvas copy');
  await page.getByRole('button', { name: 'Lock layer' }).click();
  await expect(page.getByRole('button', { name: 'Unlock layer' })).toBeVisible();
  await expect(page.locator('.maker-selection-box')).toHaveCount(0);
  await page.getByRole('button', { name: 'Unlock layer' }).click();
  await page.locator('#maker-shape').selectOption('circle');
  await page.locator('[data-maker-add="shape"]').click();
  const shape=page.locator('#maker-canvas .maker-element.selected');
  await expect(shape).toHaveCSS('border-radius','50%');
  const width=await shape.evaluate(el=>parseInt(el.style.width,10));
  await page.locator('[data-maker-field="x"]').fill('900');
  await page.locator('[data-maker-field="x"]').blur();
  await expect(shape).toHaveCSS('width',`${width}px`);
  await expect(page.locator('[data-maker-field="x"]')).toHaveValue(String(960-width));
  const box=await shape.boundingBox();
  const centerX=box.x+box.width/2,centerY=box.y+box.height/2;
  await page.mouse.move(centerX,centerY);
  await page.mouse.down();
  await page.mouse.move(centerX+240,centerY,{steps:6});
  await page.mouse.up();
  await expect(shape).toHaveCSS('width',`${width}px`);
  await expect(page.locator('[data-maker-field="x"]')).toHaveValue(String(960-width));
});

test('desktop UI fits the native 1920 by 1080 layout and scales down proportionally below it', async ({ page }) => {
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  const root=await page.locator('#app-root').boundingBox();
  expect(root.width).toBe(1920);
  expect(root.height).toBe(1080);
  await page.getByRole('button', { name: 'Open Level Maker app' }).click();
  const size=async()=>({palette:(await page.locator('.maker-palette').boundingBox()).width, taskbar:(await page.locator('#global-taskbar').boundingBox()).height});
  await expect(page.locator('.maker-palette')).toBeVisible();
  const big=await size();
  // A 1080p laptop at 150% Windows scaling gives the browser 1280×720: same layout, two-thirds size.
  await page.setViewportSize({width:1280,height:720});
  // The UI rescales just after the resize event, so wait for it to settle.
  await expect.poll(async()=>(await size()).palette/big.palette).toBeCloseTo(2/3,1);
  const small=await size();
  expect(small.taskbar/big.taskbar).toBeCloseTo(2/3,1);
});

test('the shop is available from the desktop', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('button', { name: 'Close Eye Mail' }).click();
  await page.locator('#icon-shop').dispatchEvent('click');
  await expect(page.getByRole('region', { name: 'Shop' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /A little refresh for your desk/ })).toBeVisible();
});

test('desktop shortcuts open centered Settings and running taskbar apps',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon'}).click();
  await expect(page.locator('#taskbar-open-apps button')).toHaveCount(0);
  await expect(page.locator('#taskbar-shop')).toHaveCount(0);
  await expect(page.locator('#taskbar-profile')).toBeVisible();
  await expect(page.locator('#taskbar-settings')).toBeVisible();
  await expect(page.locator('#icon-settings')).toBeHidden();
  await expect(page.locator('#icon-stats')).toBeHidden();
  await page.getByRole('button',{name:'Open Mail app'}).click();
  await expect(page.getByRole('button',{name:'Switch to Mail'})).toBeVisible();
  await page.getByRole('button',{name:'Go to desktop'}).click();
  await page.getByRole('button',{name:'Switch to Mail'}).click();
  await expect(page.locator('#screen-shell')).toBeVisible();
});

test('the studio upgrades tab sells a guaranteed upgrade', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('button', { name: 'Close Eye Mail' }).click();
  await page.locator('#icon-shop').dispatchEvent('click');
  await page.getByRole('button', { name: /Upgrades/ }).click();

  await expect(page.getByRole('heading', { name: /Studio Upgrades/ })).toBeVisible();
  await page.getByRole('button', { name: /90.*Buy/ }).click();
  await expect(page.getByRole('button', { name: 'Installed' })).toBeVisible();
});

test('the canvas fills its workspace without a mission strip or resizing for settings', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await expect(page.locator('#mail-list .mail-prize img.money-icon').first()).toHaveAttribute('src',/COINS.png/);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button', { name: 'Accept' }).click();

  await expect(page.getByRole('region', { name: 'Design Editor' })).toBeVisible();
  await expect(page.locator('#mission-momentum')).toHaveCount(0);
  for(const [width,height] of [[390,844],[844,390],[1366,768],[2560,1440]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(100);
    const readGeometry=()=>page.evaluate(()=>{
      const c=document.getElementById('editor-canvas').getBoundingClientRect();
      const w=document.getElementById('editor-canvas-wrap').getBoundingClientRect();
      return {width:c.width,height:c.height,fill:Math.max(c.width/w.width,c.height/w.height),workspace:w.width/innerWidth};
    });
    const before=await readGeometry();
    // Two sidebars (brief left, tools right) share the width with the canvas.
    expect(before.workspace).toBeGreaterThan(.5);
    expect(before.fill).toBeGreaterThan(.85);
    await expect(page.locator('#element-settings')).toBeVisible();
    const after=await readGeometry();
    expect(after.width).toBeCloseTo(before.width,0);
    expect(after.height).toBeCloseTo(before.height,0);
  }

});

test('submission restores typing and attaching a reply before recording rewards', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Submit for handoff' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByRole('dialog', { name: 'Compose reply' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Design Report' })).toHaveCount(0);
  const send = page.getByRole('button', { name: 'Send', exact: true });
  await expect(send).toBeDisabled();
  expect(await page.evaluate(() => EC_STORE.load().history.length)).toBe(0);
  await page.keyboard.press('a'); // clicking no longer types; a key does
  await expect.poll(()=>page.locator('#compose-body .revealed').textContent()).toBe('Good d'); // 6 letters per press
  await page.keyboard.press('a');
  await page.keyboard.press('a');
  await expect.poll(async()=> (await page.locator('#compose-body .revealed').textContent()).length).toBe(18);
  await page.locator('#compose-body').focus();
  await page.keyboard.insertText('Typing my reply to the client. '.repeat(20));
  await expect(page.locator('#compose-hint')).toHaveText('Message complete.', { timeout:15000 });
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Attach file' }).click();
  await page.locator('#attach-option-edited').click();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.locator('#taskbar-clock')).toContainText('11:00');
  expect(await page.evaluate(()=>EC_STORE.load().history.length)).toBe(0);
  await expect(page.locator('#mail-list')).not.toContainText('Awaiting their reply');
  await expect(page.getByRole('dialog', { name: 'Compose reply' })).toBeHidden();
  // The reply arrives with a verdict, but nothing is recorded until the player acts on it.
  await expect.poll(() => page.evaluate(() => !!EC_STORE.load().readyReply)).toBe(true);
  expect(await page.evaluate(()=>EC_STORE.load().history.length)).toBe(0);
  await page.locator('#mail-list .mail-item.unread').click();
  await expect(page.locator('#mail-detail-body')).toContainText('Could you take another look');
  await page.getByRole('button', { name: 'Back to Editor' }).click();
  expect(await page.evaluate(()=>EC_STORE.load().history.length)).toBe(1);
  expect(await page.evaluate(()=>EC_STORE.load().totalXp)).toBe(0);
  await expect(page.locator('#modal-reward')).toBeHidden();
});

test('marking an approved task complete pays out with a celebration', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button', { name: 'Accept' }).click();
  const set = async (id, field, value) => {
    await page.locator(`#editor-canvas .el[data-id="${id}"]`).waitFor(); await page.evaluate(i=>EC_EDITOR.selectElement(i), id);
    const input = page.locator('#f-' + field);
    await input.fill(String(value));
    await input.dispatchEvent('change');
  };
  // Illustration is locked at 504: Instagram and Tumblr get 24px gaps on one line.
  await set('insta', 'x', 432); await set('tumblr', 'x', 576); await set('tumblr', 'y', 784);
  await set('about', 'y', 40);
  await set('title', 'x', 336); // centre "Explore for more!" over the caption
  await set('title', 'y', 208); // and just above the cards (24px gap)
  await expect(page.locator('.editor-goal.met')).toHaveCount(5);
  await page.getByRole('button', { name: 'Submit for handoff' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.locator('#compose-body').focus();
  await page.keyboard.insertText('Typing my reply to the client. '.repeat(20));
  await page.getByRole('button', { name: 'Attach file' }).click();
  await page.locator('#attach-option-edited').click();
  const before = await page.evaluate(() => EC_STORE.load().currency);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.locator('#mail-list .mail-item.unread').click({ timeout:10000 });
  await expect(page.locator('#mail-detail-body')).not.toContainText('What worked');
  expect(await page.evaluate(() => EC_STORE.load().currency)).toBe(before);
  await page.getByRole('button', { name: 'Mark Completed' }).click();
  const reward = page.getByRole('dialog', { name: 'Job done!' });
  await expect(reward).toBeVisible();
  await expect(reward).toContainText('XP');
  const after = await page.evaluate(() => EC_STORE.load().currency);
  expect(after).toBeGreaterThanOrEqual(before + 40);
  await page.getByRole('button', { name: 'Collect' }).click();
  await expect(reward).toBeHidden();
  await expect(page.locator('#mail-list')).toContainText('Yappers.com');
});

test('reference desktop keeps app shortcuts reachable across screen sizes',async({page})=>{
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('button',{name:'Close Eye Mail'}).click();
  for(const [width,height] of [[320,568],[390,844],[652,1146],[768,1024],[844,390],[1366,768],[2560,1080]]){
    await page.setViewportSize({width,height});
    await expect(page.getByRole('button',{name:'Open Mail app'})).toBeVisible();
    const bounds=await page.locator('.desktop-icon:visible').evaluateAll(items=>items.map(el=>{
      const r=el.getBoundingClientRect();return {id:el.id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    }));
    // Phones held sideways switch to a wider layout viewport, so compare with the page's real size.
    const [vw,vh]=await page.evaluate(()=>[innerWidth,innerHeight]);
    for(const box of bounds){expect(box.x,box.id).toBeGreaterThanOrEqual(0);expect(box.y,box.id).toBeGreaterThanOrEqual(0);expect(box.right,`${box.id} at ${width}x${height}`).toBeLessThanOrEqual(vw);expect(box.bottom,box.id).toBeLessThanOrEqual(vh);expect(box.width,box.id).toBeGreaterThanOrEqual(40);}
  }
});

test('audio works for keyboard activation and respects separate music and effect controls', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.audioStarts = 0;
    window.AudioContext = class extends NativeAudioContext {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => { window.audioStarts++; return start(...args); };
        return oscillator;
      }
    };
  });
  await page.goto('/');
  await page.evaluate(() => { EC_SOUND.setMusicEnabled(false); });
  await page.getByRole('button', { name: 'Open EyeCon' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.audioStarts)).toBeGreaterThan(0);
  await page.evaluate(() => { EC_SOUND.setEnabled(false); window.audioStarts = 0; EC_SOUND.play('menuOpen'); });
  expect(await page.evaluate(() => window.audioStarts)).toBe(0);
  await page.evaluate(() => { EC_SOUND.setMusicEnabled(true); });
  await expect.poll(() => page.evaluate(() => window.audioStarts)).toBeGreaterThan(0);
  await page.evaluate(() => { EC_SOUND.setMusicEnabled(false); EC_SOUND.setEnabled(true); window.audioStarts = 0; EC_SOUND.play('menuOpen'); });
  expect(await page.evaluate(() => window.audioStarts)).toBe(6);
});

test('daily store checks out chosen items and delivers them to the wardrobe', async ({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{ const p=EC_STORE.load();p.currency=1000;EC_STORE.save(p); });
  await page.reload();
  await beginFirstDay(page);
  await page.getByRole('button',{name:'Close Eye Mail'}).click();
  await page.locator('#icon-shop').dispatchEvent('click');
  await expect(page.getByRole('button',{name:/Gacha|Pull/})).toHaveCount(0);
  await expect(page.locator('.daily-item')).toHaveCount(5);
  const first=page.locator('.daily-item').first();
  await expect(first).toContainText('Boris Wallpaper');
  const name=await first.locator('h4').textContent();
  await first.getByRole('button',{name:'Add to cart'}).click();
  await page.getByRole('button',{name:'Cart (1)'}).click();
  await expect(page.locator('.store-cart-row')).toContainText(name);
  await page.getByRole('button',{name:'Checkout',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Store delivery'})).toBeVisible();
  await expect(page.locator('#delivery-message')).toContainText('Delivered!');
  await page.getByRole('button',{name:'Open wardrobe'}).click();
  expect(await page.evaluate(()=>EC_STORE.load().purchases.length)).toBe(1);
  await page.locator('.wardrobe-item[data-id="wp-boris"]').click();
  expect(await page.evaluate(()=>EC_STORE.load().equipped.wallpaper)).toBe('wp-boris');
  expect(await page.locator('#desktop-wallpaper').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('boris.png');
});

test('selection handles match the artwork bounds and retain their size when zooming',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto('/');await beginFirstDay(page);
  // Any resizable element (Hay Buhay is text-only now, so use Cones).
  await openClient(page,'Cones');
  await page.locator('#editor-canvas .el').first().waitFor();
  const id=await page.evaluate(()=>{ for(const el of EC_EDITOR.getElements()){ if(el.locked) continue; EC_EDITOR.selectElement(el.id); if(document.querySelector(`#editor-canvas .el[data-id="${el.id}"] .nw`)) return el.id; } });
  const button=page.locator(`#editor-canvas .el[data-id="${id}"]`);
  const measure=()=>button.evaluate(el=>{
    const b=el.getBoundingClientRect(),n=el.querySelector('.nw').getBoundingClientRect(),s=el.querySelector('.se').getBoundingClientRect();
    return {left:Math.abs(n.x+n.width/2-b.x),top:Math.abs(n.y+n.height/2-b.y),right:Math.abs(s.x+s.width/2-b.right),bottom:Math.abs(s.y+s.height/2-b.bottom),handle:n.width,outline:getComputedStyle(el).outlineStyle};
  });
  const first=await measure();
  for(const edge of ['left','top','right','bottom'])expect(first[edge]).toBeLessThan(1);
  expect(first.outline).toBe('none');
  const zoomArea = await page.locator('#editor-canvas-wrap').boundingBox();
  await page.mouse.move(zoomArea.x + zoomArea.width / 2, zoomArea.y + zoomArea.height / 2);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(400);
  const second=await measure();
  expect(second.handle).toBeCloseTo(first.handle,0);
  for(const edge of ['left','top','right','bottom'])expect(second[edge]).toBeLessThan(1);
  await expect(page.locator('#selection-dimensions')).toContainText('px');
});

test('editor settings cards and pastel toolbar icons remain usable',async({page})=>{
  await page.goto('/');await beginFirstDay(page);
  await openClient(page,'Yappers.com');
  await page.locator('#editor-canvas .el[data-id="login"]').waitFor(); await page.evaluate(()=>EC_EDITOR.selectElement('login'));
  await expect(page.locator('#settings-fields .editor-setting-card summary').first()).toBeVisible();
  await expect(page.locator('#tool-grid .game-tool-icon use')).toHaveAttribute('href','assets/icons/editor-sprite.svg#grid');
  expect(await page.locator('#tool-grid .game-tool-icon use').evaluate(el=>el.getBBox().width)).toBeGreaterThan(0);
  await expect(page.locator('#taskbar-home .game-taskbar-icon use')).toHaveAttribute('href','assets/icons/editor-sprite.svg#home');
  const card=page.locator('#settings-fields .editor-setting-card').first();
  // Sections always stay open; clicking a heading does not collapse it.
  await card.locator('summary').click();
  await expect(card).toHaveAttribute('open','');
});

test('design tools stay open and use the app typography',async({page})=>{
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  const inspector=page.locator('#element-settings');
  await expect(inspector).toBeVisible();
  await expect(page.locator('#settings-fields')).toBeVisible();
  await expect(page.locator('#toggle-element-settings')).toHaveCount(0);
  expect(await inspector.locator('h3').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Baloo');
  await page.locator(`#editor-canvas .el[data-id="${'title'}"]`).waitFor(); await page.evaluate(i=>EC_EDITOR.selectElement(i), 'title');
  await expect(inspector).toBeVisible();
  expect(await inspector.locator('.editor-setting-card summary').first().evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Baloo');
  await expect(inspector.getByText('Alignment Controls')).toHaveCount(0);
  await expect(inspector.locator('[data-align]')).toHaveCount(0);
  const mail=page.locator('.editor-rail-card');
  await expect(mail).toBeVisible();
  await expect(page.locator('#editor-mail-sender')).toHaveText('Mayonnaisegee');
  await expect(page.locator('#editor-mail-stage')).toContainText('Portfolio');
  await expect(page.locator('#editor-mail-points')).toContainText('Space the three social icons');
  const mailBox=await mail.boundingBox();
  const settingsBox=await inspector.boundingBox();
  // Desktop: brief on the left, Design tools above Layers on the right (phones stack them).
  if(page.viewportSize().width>900) expect(mailBox.x+mailBox.width).toBeLessThanOrEqual(settingsBox.x);
});

test.skip('the first day starts with one email showing difficulty and reward',async({page})=>{
  await page.goto('/');
  await beginFirstDay(page);
  const rows=page.locator('#mail-list [role="listitem"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('.tag')).toHaveText('NOVICE');
  await expect(rows.first()).not.toContainText('Step');
  await rows.first().click();
  const reward=page.locator('#mail-detail-reward');
  await expect(reward).toContainText('40');
  expect(await reward.evaluate(el=>parseFloat(getComputedStyle(el.querySelector('b')).fontSize))).toBeGreaterThan(20);
  if(page.viewportSize().width>900){
    // The reward sits just left of the Accept button, on the same line.
    const [acceptBox,rewardBox]=await Promise.all([
      page.locator('#btn-accept-job').boundingBox(),reward.boundingBox()
    ]);
    expect(rewardBox.x+rewardBox.width).toBeLessThanOrEqual(acceptBox.x);
    expect(Math.abs((rewardBox.y+rewardBox.height/2)-(acceptBox.y+acceptBox.height/2))).toBeLessThan(acceptBox.height/2);
  }
  await expect(page.locator('#mail-detail-body')).not.toContainText(/tour/i);
});

test('profile popup matches the app card style',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon'}).click();
  await page.locator('#taskbar-profile').click();
  const popup=page.locator('#taskbar-stats-popup.profile-layout');
  await expect(popup).toBeVisible();
  await expect(popup.locator('.taskbar-quick-popup-head strong')).toHaveText('Profile');
  await expect(popup.locator('.profile-feedback-count')).toHaveText('(0)');
  await expect(popup.getByText(/tasks per day/)).toHaveCount(0);
  const style=await popup.evaluate(el=>({radius:getComputedStyle(el).borderRadius,font:getComputedStyle(el.querySelector('h2')).fontFamily}));
  const rem=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(parseFloat(style.radius)).toBeCloseTo(rem,0);
  expect(style.font).toContain('Baloo');
});

test('editing canvas uses one toolbar for history and zoom',async({page},testInfo)=>{
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  const bar=page.locator('#screen-editor .editor-topbar');
  await expect(bar.locator('#tool-undo')).toBeVisible();
  await expect(bar.locator('#tool-redo')).toBeVisible();
  const mobile=testInfo.project.name==='mobile-chrome';
  await expect(bar.locator('#editor-zoom-label')).toHaveText(mobile?'30%':'100%');
  if(mobile){
    const canvas=await page.locator('#editor-canvas').boundingBox();
    const wrap=await page.locator('#editor-canvas-wrap').boundingBox();
    expect(canvas.width).toBeLessThan(wrap.width);
    expect(canvas.height).toBeLessThan(wrap.height);
  }
  await bar.locator('#editor-zoom-in').click();
  await expect(bar.locator('#editor-zoom-label')).toHaveText(mobile?'38%':'125%');
  await bar.locator('#editor-zoom-out').click();
  await expect(bar.locator('#editor-zoom-label')).toHaveText(mobile?'30%':'100%');
  await expect(bar.locator('#editor-zoom-fit')).toHaveCount(0);
});

test('goal elements show markers until solved, and moving them back un-solves',async({page})=>{
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  await expect(page.locator('#editor-layers-panel')).toHaveCount(0);
  // "About" is the menu link the player moves; Home and Contact are locked.
  const cta=page.locator('#editor-canvas .el[data-id="about"]');
  await expect(cta).toHaveClass(/needs-edit/);
  expect(await cta.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('none');
  expect(await cta.evaluate(el=>getComputedStyle(el,'::after').backgroundColor)).toBe('rgb(229, 59, 66)');
  // Hover outline: desktop only (on phones the 1920px level is zoomed too far out to hover a card).
  if(page.viewportSize().width>900){
    await cta.hover();
    expect(await cta.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('dashed');
  }
  if(page.viewportSize().width>900){
    await expect(page.locator('#screen-editor .editor-mode-corner')).toBeVisible();
    const [left,stage,right]=await Promise.all([
      page.locator('#screen-editor .editor-side-rail:not(.editor-right-rail)').boundingBox(),
      page.locator('#editor-canvas-wrap').boundingBox(),
      page.locator('#screen-editor .editor-right-rail').boundingBox()
    ]);
    expect(left.x+left.width).toBeLessThan(stage.x);
    expect(stage.x+stage.width).toBeLessThan(right.x);
    expect(left.height).toBeGreaterThan(stage.height*.8);
    expect(right.height).toBeGreaterThan(stage.height*.8);
  }
  // Line "About" up with Home and Contact.
  for(const [id,field,v] of [['about','y',40]]){
    await page.locator(`#editor-canvas .el[data-id="${id}"]`).waitFor(); await page.evaluate(i=>EC_EDITOR.selectElement(i), id);
    const input=page.locator('#f-'+field); await input.fill(String(v)); await input.dispatchEvent('change');
  }
  await expect(cta).not.toHaveClass(/needs-edit/);
  // Solved pieces stay editable, and the goal card and checklist show the pass.
  await expect(cta).not.toHaveAttribute('data-locked','1');
  const sameLine=page.locator('.editor-goal').filter({hasText:'its row'});
  await expect(sameLine).toHaveClass(/met/);
  // Overall progress lives in the client card.
  await expect(page.locator('#editor-task-progress')).toContainText('1 of 5 tasks done');
  // Moving it out of line un-solves it again.
  await page.evaluate(()=>EC_EDITOR.selectElement('about'));
  await page.locator('#f-y').fill('56'); await page.locator('#f-y').dispatchEvent('change');
  await expect(sameLine).not.toHaveClass(/met/);
  await expect(cta).toHaveClass(/needs-edit/);
  await page.locator('#editor-canvas .el[data-id="tumblr"]').waitFor(); await page.evaluate(()=>EC_EDITOR.selectElement('tumblr'));
  await expect(page.locator('#editor-canvas .el[data-id="tumblr"]')).toHaveClass(/selected/);
  await expect(page.locator('#editor-canvas .el[data-id="tumblr"]')).toHaveClass(/needs-edit/);
});

test('two-bar editor panels have fixed widths',async({page})=>{
  test.skip(page.viewportSize().width<=900,'Desktop layout only');
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  const label=page.locator('#screen-editor .editor-mode-corner .editor-mode-tab');
  await expect(label).toBeVisible();
  expect(await label.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(20);
  const [noteBox,topStripHeight]=await Promise.all([
    page.locator('#screen-editor .editor-mode-corner').boundingBox(),
    page.locator('#screen-editor').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--editor-topbar-h'))*parseFloat(getComputedStyle(document.documentElement).fontSize))
  ]);
  // The Edit Mode tag sits inside the top strip with a margin, not full-bleed.
  expect(noteBox.height).toBeLessThan(topStripHeight);
  expect(noteBox.y).toBeGreaterThan(0);
  await expect(page.locator('#screen-editor .editor-mode-corner p')).toBeHidden();
  // Side panels have fixed widths: no drag handles.
  await expect(page.locator('.editor-rail-resizer')).toHaveCount(0);
  const panel=await page.locator('#screen-editor .editor-side-rail:not(.editor-right-rail)').boundingBox();
  const rem=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(Math.abs(panel.width/rem-22)).toBeLessThan(1);
});

test('profile settings list and the browser shows the store and client sites',async({page})=>{
  await page.addInitScript(()=>{
    if(localStorage.getItem('eyecon_profile_v1')) return;
    localStorage.setItem('eyecon_profile_v1',JSON.stringify({completed:['mayo-portfolio','yappers-login','haybuhay-settings','coffee-shop'],onboarding:{seen:true},
      history:[...['mayo-portfolio','yappers-login','haybuhay-settings'].map(levelId=>({levelId,date:'2026-01-01T00:00:00Z',stars:4,missionComplete:true})),{levelId:'coffee-shop',name:'Brewbird Coffee Co.',date:'2026-01-01T00:00:00Z',stars:4,missionComplete:true}]}));
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon'}).click();
  // Settings is its own taskbar pop-up, separate from Profile.
  await page.locator('#taskbar-profile').click();
  await expect(page.locator('#taskbar-stats-popup')).not.toContainText('Reduce motion');
  await page.locator('#taskbar-settings').click();
  await page.getByRole('slider',{name:'Sound',exact:true}).fill('25');
  await page.getByRole('slider',{name:'Music',exact:true}).fill('0');
  await page.getByRole('switch',{name:'Reduce motion'}).click();
  await page.getByRole('button',{name:'Next colorblind mode'}).click();
  await page.getByRole('button',{name:'Next colorblind mode'}).click();
  const saved=await page.evaluate(()=>EC_STORE.load().settings);
  expect([saved.sfxLevel,saved.musicEnabled,saved.reduceMotion,saved.cvd]).toEqual([25,false,true,'deuteranopia']);
  await page.getByRole('button',{name:'Previous colorblind mode'}).click();
  await expect(page.locator('[aria-labelledby="qs-cvd-label"] output')).toHaveText('Red-blind');
  await page.locator('#taskbar-stats-popup-close').click();
  await page.getByRole('button',{name:'Open Browser app'}).click();
  await page.locator('.browser-bookmark').filter({hasText:'Mayonnaisegee'}).click();
  await expect(page.locator('#browser-address')).toContainText('mayonnaisegee');
  await expect(page.locator('.browser-tab')).toHaveCount(0);
  await expect(page.locator('.client-original-layout')).toBeVisible();
  await expect(page.locator('.client-original-layout').getByRole('button',{name:'About',exact:true})).toBeVisible();
  await page.locator('#browser-home-btn').click();
  await page.locator('.browser-bookmark').filter({hasText:'Store'}).click();
  await expect(page.locator('#browser-view #shop-panel')).toBeVisible();
  await page.locator('#browser-back-btn').click();
  await expect(page.locator('#screen-shop #shop-panel')).toHaveCount(1);
});

test('desktop size grows across settings and keyboard keeps Mail stable',async({page},testInfo)=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon'}).click();
  await expect(page.locator('#screen-desktop')).toHaveClass(/active/);
  const size=async(value)=>page.evaluate(value=>{document.documentElement.style.setProperty('--ui-scale',value);EC_FIT();return parseFloat(getComputedStyle(document.documentElement).fontSize);},value);
  let previous=await size(.8);
  const desktopBase=previous;
  for(const value of [1,1.2,1.4]){const next=await size(value);expect(next).toBeGreaterThanOrEqual(previous);previous=next;}
  await size(.8);
  await page.getByRole('button',{name:'Open Mail app'}).click();
  await expect(page.locator('#screen-shell')).toHaveClass(/active/);
  const mailSize=await size(.8);
  if(testInfo.project.name==='mobile-chrome') expect(mailSize).toBeLessThan(desktopBase);
  else expect(mailSize).toBeCloseTo(desktopBase,2);
  if(testInfo.project.name==='mobile-chrome'){
    const close=await page.locator('#mail-back-btn').boundingBox();
    expect(close.x+close.width).toBeLessThanOrEqual(page.viewportSize().width-24);
    await page.locator('#mail-search-input').focus();
    const before=await page.locator('#app-root').boundingBox();
    await page.setViewportSize({width:page.viewportSize().width,height:500});
    await page.waitForTimeout(100);
    expect(await page.locator('#app-root').evaluate(el=>el.getBoundingClientRect().height)).toBeCloseTo(before.height,0);
    expect(await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(mailSize,2);
  }
});

test('workday clock and closing summary persist and continue to 8 AM',async({page})=>{
  await page.goto('/');
  for(const [submissions,time] of [[0,'08:00'],[1,'11:00'],[2,'14:00'],[3,'17:00']]){
    await page.evaluate(submissions=>{
      const p=EC_STORE.defaultProfile();p.onboarding.seen=true;
      p.workday={day:2,submissions,coins:90,xp:120,reviews:[{name:'Brewbird',page:'Homepage',stars:4,approved:true,reward:90}]};
      EC_STORE.save(p);
    },submissions);
    await page.reload();
    await expect(page.locator('#taskbar-clock')).toContainText(time);
  }
  // A short end-of-day animation plays first, then the recap.
  await expect(page.locator('.day-end-scene')).toBeVisible();
  await page.screenshot({path:process.env.DAYEND_SHOT||'test-results/dayend.png'});
  const summary=page.getByRole('dialog',{name:'Day 2 complete'});
  await expect(summary).toBeVisible({timeout:8000});
  await expect(page.locator('.day-end-scene')).toHaveCount(0);
  await expect(summary).toContainText('3 submissions');
  await expect(summary).toContainText('120 XP');
  await expect(summary).toContainText('Brewbird');
  await page.getByRole('button',{name:'Continue to next day'}).click();
  await expect(summary).toBeHidden();
  await expect(page.locator('#taskbar-clock')).toContainText('Day 3');
  await expect(page.locator('#taskbar-clock')).toContainText('08:00');
  await expect(page.locator('#mail-list .mail-item').first()).toBeVisible();
});

test.skip('after the first job, new emails arrive a moment later and show a new dot',async({page})=>{
  await page.addInitScript(()=>{
    if(localStorage.getItem('eyecon_profile_v1')) return;
    localStorage.setItem('eyecon_profile_v1',JSON.stringify({completed:['mayo-portfolio','yappers-login','haybuhay-settings','coffee-shop'],onboarding:{seen:true},
      history:[...['mayo-portfolio','yappers-login','haybuhay-settings'].map(levelId=>({levelId,date:'2026-01-01T00:00:00Z',stars:4,missionComplete:true})),{levelId:'coffee-shop',name:'Brewbird Coffee Co.',date:'2026-01-01T00:00:00Z',stars:4,missionComplete:true}]}));
    localStorage.setItem('eyecon_mail_state',JSON.stringify({arrivals:{'coffee-shop':1},seen:['coffee-shop']}));
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon'}).click();
  await page.getByRole('button',{name:'Open Mail app'}).click();
  await expect(page.locator('#mail-list [role="listitem"]')).toHaveCount(0);
  await expect(page.locator('#mail-list [role="listitem"]')).toHaveCount(1,{timeout:8000});
  await expect(page.locator('#mail-list .unread-dot')).toHaveCount(1);
  await page.getByRole('listitem').first().click();
  await page.locator('#btn-close-mail').click();
  await expect(page.locator('#mail-list .unread-dot')).toHaveCount(0,{timeout:3000});
});

test('Piko tours the first email and the workspace', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/');
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  const say = async () => { await page.waitForTimeout(900); await page.locator('.piko-panel').click(); };
  await say(); await say(); await page.waitForTimeout(900);
  await page.locator('#icon-mail').click();
  await page.waitForTimeout(900); await page.locator('#mail-list .mail-item').first().click();
  await page.waitForTimeout(3500); await page.locator('#attachment-chip').click();
  await page.waitForTimeout(800); await page.locator('#btn-close-preview').click();
  await page.waitForTimeout(1200); await page.locator('#btn-accept-job').click();
  await page.waitForTimeout(3000); 
  const bubble = page.locator('.piko-bubble'), next = async () => { await page.mouse.click(800,860); await page.waitForTimeout(700); };
  await next(); await expect(bubble).toContainText('middle mouse');
  await next(); await expect(bubble).toContainText('middle mouse'); // clicking can't skip it
  const wrapBox = await page.locator('#editor-canvas-wrap').boundingBox();
  await page.mouse.move(wrapBox.x + 300, wrapBox.y + 300); await page.mouse.down({button:'middle'});
  for(let i=0;i<12;i++){ await page.mouse.move(wrapBox.x + 300 + i*4, wrapBox.y + 300); await page.waitForTimeout(120); }
  await page.mouse.up({button:'middle'}); await page.waitForTimeout(400);
  await expect(bubble).toContainText('zoom');
  await page.mouse.wheel(0, -120); await page.waitForTimeout(800);
  await expect(bubble).toContainText('red dots');
  await next(); await expect(bubble).toContainText('Heads up');
  await next(); await expect(bubble).toContainText('together');
  await next(); await expect(bubble).toContainText('Left click it');
  const about = page.locator('#editor-canvas .el[data-id="about"]');
  await expect(about).toHaveClass(/piko-glow/);
  await expect(page.locator('.piko-hole')).toHaveClass(/hidden/); // no dim over what to click
  await page.evaluate(()=>EC_EDITOR.selectElement('about')); await page.waitForTimeout(1200);
  await expect(bubble).toContainText('This panel');
  await next(); await expect(bubble).toContainText('Drag it upwards');
  for(let i=0;i<8 && !(await bubble.textContent()).includes('Perfect');i++){ await page.keyboard.press('ArrowUp'); await page.waitForTimeout(400); }
  await expect(bubble).toContainText('Perfect');
  await next(); await expect(bubble).toContainText('task list');
  await next(); await expect(bubble).toContainText('show or hide the grid');
  await page.locator('#tool-grid').click(); await page.waitForTimeout(800); await expect(bubble).toContainText('snaps');
  await next(); await expect(bubble).toContainText('click this one');
  await page.locator('#tool-grid-settings').click(); await page.waitForTimeout(800); await expect(bubble).toContainText('grid size');
  await next(); await expect(bubble).toContainText('Submit');
  await expect(page.locator('#tool-save')).toHaveCSS('pointer-events','none');
});
