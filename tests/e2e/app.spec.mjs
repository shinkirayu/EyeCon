import { expect, test } from '@playwright/test';

async function beginFirstDay(page) {
  await page.getByRole('button', { name: 'Open EyeCon' }).click();
  await page.getByRole('button', { name: /ready/i }).click();
  await page.getByRole('button', { name: 'Open Eye Mail' }).click();
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
  await page.locator('[data-maker-add="heading"]').click();
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
    expect(before.workspace).toBeGreaterThan(.7);
    expect(before.fill).toBeGreaterThan(.9);
    await page.getByRole('button',{name:'Show or hide element settings'}).click();
    const after=await readGeometry();
    expect(after.width).toBeCloseTo(before.width,0);
    expect(after.height).toBeCloseTo(before.height,0);
    await page.getByRole('button',{name:'Show or hide element settings'}).click();
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
  await expect.poll(() => page.evaluate(() => EC_STORE.load().history.length)).toBe(1);
  await expect(page.locator('#mail-detail-body')).not.toContainText('/5');
  expect(await page.evaluate(()=>EC_STORE.load().totalXp)).toBe(0);
  await expect(page.locator('#taskbar-currency')).toHaveCount(0);
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
  expect(await page.evaluate(() => window.audioStarts)).toBe(4);
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
