import { expect, test } from '@playwright/test';

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
  expect(maker.y).toBeGreaterThan(mail.y+mail.height);
  expect(Math.abs(maker.x-mail.x)).toBeLessThan(2);
  expect(Math.abs(maker.width-mail.width)).toBeLessThan(2);
  expect(mail.width).toBeLessThanOrEqual(104);
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
  await page.locator('.maker-selection-box').dblclick();
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
  const small=await size();
  expect(small.palette/big.palette).toBeCloseTo(2/3,1);
  expect(small.taskbar/big.taskbar).toBeCloseTo(2/3,1);
});

test('the shop is available from the desktop', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('button', { name: 'Back to desktop' }).click();
  await page.getByRole('button', { name: 'Open Shop app' }).click();
  await expect(page.getByRole('region', { name: 'Shop' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /A little refresh for your desk/ })).toBeVisible();
});

test('the studio upgrades tab sells a guaranteed upgrade', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('button', { name: 'Back to desktop' }).click();
  await page.getByRole('button', { name: 'Open Shop app' }).click();
  await page.getByRole('button', { name: /Upgrades/ }).click();

  await expect(page.getByRole('heading', { name: /Studio Upgrades/ })).toBeVisible();
  await page.getByRole('button', { name: /90.*Buy/ }).click();
  await expect(page.getByRole('button', { name: 'Installed' })).toBeVisible();
});

test('the canvas fills its workspace without a mission strip or resizing for settings', async ({ page }) => {
  await page.goto('/');
  await beginFirstDay(page);
  await expect(page.locator('#mail-list .mail-prize').first()).toContainText('¢');
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
    expect(before.fill).toBeGreaterThan(.9);
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
  await page.getByRole('button', { name: 'Save and submit' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();

  await expect(page.getByRole('dialog', { name: 'Compose reply' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Design Report' })).toHaveCount(0);
  const send = page.getByRole('button', { name: 'Send', exact: true });
  await expect(send).toBeDisabled();
  expect(await page.evaluate(() => EC_STORE.load().history.length)).toBe(0);
  await page.locator('#compose-body').click();
  await expect.poll(()=>page.locator('#compose-body .revealed').textContent()).toBe('Goo');
  await page.locator('#compose-body').click();
  await page.locator('#compose-body').click();
  await expect.poll(async()=> (await page.locator('#compose-body .revealed').textContent()).length).toBe(9);
  await page.locator('#compose-body').focus();
  await page.keyboard.insertText('Typing my reply to the client. '.repeat(20));
  await expect(page.locator('#compose-hint')).toHaveText('Message complete.', { timeout:15000 });
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Attach file' }).click();
  await page.locator('#attach-option-edited').click();
  await expect(send).toBeEnabled();
  await send.click();
  expect(await page.evaluate(()=>EC_STORE.load().history.length)).toBe(0);
  await expect(page.locator('#mail-list')).toContainText('Awaiting their reply');
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
    await page.locator(`#editor-layers-panel [data-layer-id="${id}"] .editor-layer-select`).click();
    const input = page.locator('#f-' + field);
    await input.fill(String(value));
    await input.dispatchEvent('change');
  };
  await set('sub', 'x', 64); await set('cta', 'x', 64);
  await set('navlink2', 'y', 24); await set('navlink3', 'y', 24);
  await expect(page.locator('.editor-goal.met')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save and submit' }).click();
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
  const reward = page.getByRole('dialog', { name: 'Task complete!' });
  await expect(reward).toBeVisible();
  await expect(reward).toContainText('Client payment');
  const after = await page.evaluate(() => EC_STORE.load().currency);
  expect(after).toBeGreaterThanOrEqual(before + 40);
  await page.getByRole('button', { name: 'Collect' }).click();
  await expect(reward).toBeHidden();
  await expect(page.locator('#mail-list')).toContainText('Thanks for the homepage');
});

test('reference desktop keeps app shortcuts reachable across screen sizes',async({page})=>{
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('button',{name:'Back to desktop'}).click();
  for(const [width,height] of [[320,568],[390,844],[652,1146],[768,1024],[844,390],[1366,768],[2560,1080]]){
    await page.setViewportSize({width,height});
    await expect(page.getByRole('button',{name:'Open Mail app'})).toBeVisible();
    const bounds=await page.locator('.desktop-icon').evaluateAll(items=>items.map(el=>{
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    }));
    for(const box of bounds){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);expect(box.bottom).toBeLessThanOrEqual(height);expect(box.width).toBeGreaterThanOrEqual(40);}
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
  await page.getByRole('button',{name:'Back to desktop'}).click();
  await page.getByRole('button',{name:'Open Shop app'}).click();
  await expect(page.getByRole('button',{name:/Gacha|Pull/})).toHaveCount(0);
  await expect(page.locator('.daily-item')).toHaveCount(5);
  const first=page.locator('.daily-item').first();
  const name=await first.locator('h4').textContent();
  await first.getByRole('button',{name:'Add to cart'}).click();
  await page.getByRole('button',{name:'Cart (1)'}).click();
  await expect(page.locator('.store-cart-row')).toContainText(name);
  await page.getByRole('button',{name:'Checkout',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Store delivery'})).toBeVisible();
  await expect(page.locator('#delivery-message')).toContainText('Delivered!');
  await page.getByRole('button',{name:'Open wardrobe'}).click();
  expect(await page.evaluate(()=>EC_STORE.load().purchases.length)).toBe(1);
});

test('selection handles match the artwork bounds and retain their size when zooming',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  const button=page.locator('#editor-canvas .el').filter({hasText:/^Order Now$/});
  await button.click();
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
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  await page.locator('#editor-canvas .el').filter({hasText:/^Order Now$/}).click();
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
  await page.locator('#editor-layers-panel .editor-layer-select').filter({hasText:/Order Now/}).click();
  await expect(inspector).toBeVisible();
  expect(await inspector.locator('.editor-setting-card summary').first().evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Baloo');
  await expect(inspector.getByText('Alignment Controls')).toHaveCount(0);
  await expect(inspector.locator('[data-align]')).toHaveCount(0);
  const mail=page.locator('.editor-rail-card');
  await expect(mail).toBeVisible();
  await expect(page.locator('#editor-mail-sender')).toHaveText('Brewbird Coffee Co.');
  await expect(page.locator('#editor-mail-stage')).toContainText('Homepage');
  await expect(page.locator('#editor-mail-points')).toContainText('Line up the headline');
  const mailBox=await mail.boundingBox();
  const settingsBox=await inspector.boundingBox();
  const layersBox=await page.locator('#editor-layers-panel').boundingBox();
  // Desktop: brief on the left, Design tools above Layers on the right (phones stack them).
  if(page.viewportSize().width>900) expect(mailBox.x+mailBox.width).toBeLessThanOrEqual(settingsBox.x);
  expect(settingsBox.y+settingsBox.height).toBeLessThanOrEqual(layersBox.y+1);
  const rem=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(layersBox.height).toBeGreaterThanOrEqual(7.5*rem-1);
});

test('the first day starts with one email showing difficulty and reward',async({page})=>{
  await page.goto('/');
  await beginFirstDay(page);
  const rows=page.locator('#mail-list [role="listitem"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('.tag')).toHaveText('NOVICE');
  await expect(rows.first()).not.toContainText('Step');
  await rows.first().click();
  await expect(page.locator('#mail-detail-reward')).toContainText('40');
  await expect(page.locator('#mail-detail-body')).not.toContainText(/tour/i);
});

test('text alignment moves the text, ticks the client goal and is saved with the design',async({page})=>{
  // Start with Brewbird's homepage approved, so the menu page is the open email.
  await page.addInitScript(()=>{
    if(localStorage.getItem('eyecon_profile_v1')) return;
    localStorage.setItem('eyecon_profile_v1',JSON.stringify({completed:['coffee-shop'],onboarding:{seen:true},
      history:[{levelId:'coffee-shop',name:'Brewbird Coffee Co.',date:'2026-01-01T00:00:00Z',stars:4,missionComplete:true}]}));
  });
  await page.goto('/');
  await beginFirstDay(page);
  await page.getByRole('listitem').filter({hasText:'Brewbird Coffee Co.'}).click();
  await page.getByRole('button',{name:'Accept'}).click();
  await expect(page.locator('#editor-mail-stage')).toContainText('Menu page');
  const priceGoal=page.locator('.editor-goal').filter({hasText:'Right-align all four prices'});
  await expect(priceGoal).not.toHaveClass(/met/);
  const controls=page.locator('.editor-align-options');
  for(const id of ['p1','p2','p3','p4']){
    await page.locator(`#editor-layers-panel [data-layer-id="${id}"] .editor-layer-select`).click();
    await controls.getByRole('button',{name:'Right'}).click();
    await expect(controls.getByRole('button',{name:'Right'})).toHaveAttribute('aria-pressed','true');
    const style=await page.locator(`#editor-canvas .el[data-id="${id}"]`).evaluate(el=>[getComputedStyle(el).textAlign,getComputedStyle(el).justifyContent]);
    expect(style).toEqual(['right','flex-end']);
  }
  await expect(priceGoal).toHaveClass(/met/);
  // Center and left work too, on the title.
  await page.locator('#editor-layers-panel [data-layer-id="title"] .editor-layer-select').click();
  for(const [name,expected] of [['Left','left'],['Center','center']]){
    await controls.getByRole('button',{name}).click();
    expect(await page.locator('#editor-canvas .el[data-id="title"]').evaluate(el=>getComputedStyle(el).textAlign)).toBe(expected);
  }
  const saved=await page.evaluate(()=>window.EC_EDITOR.getElements().filter(el=>/^p\d$/.test(el.id)).map(el=>el.align));
  expect(saved).toEqual(['right','right','right','right']);
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

test('editing canvas uses one toolbar for history and zoom',async({page})=>{
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  const bar=page.locator('#screen-editor .editor-topbar');
  await expect(bar.locator('#tool-undo')).toBeVisible();
  await expect(bar.locator('#tool-redo')).toBeVisible();
  await expect(bar.locator('#editor-zoom-label')).toHaveText('100%');
  await bar.locator('#editor-zoom-in').click();
  await expect(bar.locator('#editor-zoom-label')).toHaveText('125%');
  await bar.locator('#editor-zoom-out').click();
  await expect(bar.locator('#editor-zoom-label')).toHaveText('100%');
  await expect(bar.locator('#editor-zoom-fit')).toHaveCount(0);
});

test('editor layers select editable elements while structural layers stay locked',async({page})=>{
  await page.goto('/');await beginFirstDay(page);
  await page.getByRole('listitem').first().click();
  await page.getByRole('button',{name:'Accept'}).click();
  const bar=page.locator('#screen-editor .editor-topbar');
  const save=page.locator('#tool-save');
  await expect(save).toBeVisible();
  expect(await bar.locator('#tool-save').count()).toBe(0);
  await expect(page.locator('#tool-preview')).toBeHidden();
  await expect(page.locator('#tool-show-clickable')).toBeHidden();
  await expect(page.locator('#tool-hint')).toBeHidden();
  await expect(page.locator('#tool-inspector')).toBeHidden();
  await expect(page.locator('#editor-hint-banner')).toBeHidden();
  const panel=page.locator('#editor-layers-panel');
  await expect(panel).toBeVisible();
  expect(await page.locator('#tool-layers').count()).toBe(0);
  const panelBox=await panel.boundingBox();
  const stageBox=await page.locator('#editor-canvas-wrap').boundingBox();
  // On desktop, Layers live in the right-hand column (phones stack the panels).
  if(page.viewportSize().width>900) expect(panelBox.x).toBeGreaterThan(stageBox.x+stageBox.width/2);
  if(page.viewportSize().width>900){
    const settingsBox=await page.locator('#element-settings').boundingBox();
    expect(panelBox.y).toBeGreaterThanOrEqual(settingsBox.y+settingsBox.height);
  }
  await expect(panel.locator('.editor-layer-select:disabled').first()).toBeVisible();
  const editable=panel.locator('.editor-layer-row:not(.locked)').first();
  const id=await editable.getAttribute('data-layer-id');
  await editable.locator('button').click();
  await expect(page.locator(`#editor-canvas .el[data-id="${id}"]`)).toHaveClass(/selected/);
  await save.click();
  await expect(page.getByRole('alertdialog',{name:'Save and submit'})).toBeVisible();
});

test('profile settings list and the browser shows the store and client sites',async({page})=>{
  await page.addInitScript(()=>{
    if(localStorage.getItem('eyecon_profile_v1')) return;
    localStorage.setItem('eyecon_profile_v1',JSON.stringify({completed:['coffee-shop'],onboarding:{seen:true},
      history:[{levelId:'coffee-shop',name:'Brewbird Coffee Co.',date:'2026-01-01T00:00:00Z',stars:4,missionComplete:true}]}));
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon'}).click();
  await page.locator('#taskbar-profile').click();
  await expect(page.locator('#profile-settings-panel')).toBeHidden();
  await page.getByRole('button',{name:'⚙ Settings'}).click();
  await page.getByLabel('Sound').fill('25');
  await page.getByLabel('Music').fill('0');
  await page.getByRole('switch',{name:'Reduce motion'}).click();
  await page.getByRole('button',{name:'Next colorblind mode'}).click();
  await page.getByRole('button',{name:'Next colorblind mode'}).click();
  const saved=await page.evaluate(()=>EC_STORE.load().settings);
  expect([saved.sfxLevel,saved.musicEnabled,saved.reduceMotion,saved.cvd]).toEqual([25,false,true,'deuteranopia']);
  await page.getByRole('button',{name:'Previous colorblind mode'}).click();
  await expect(page.locator('[aria-labelledby="qs-cvd-label"] output')).toHaveText('Red-blind');
  await page.locator('#taskbar-stats-popup-close').click();
  await page.getByRole('button',{name:'Open Browser app'}).click();
  await page.locator('.browser-bookmark').filter({hasText:'Brewbird'}).click();
  await expect(page.locator('#browser-address')).toContainText('brewbird');
  await expect(page.locator('.browser-tab')).toHaveCount(3);
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
