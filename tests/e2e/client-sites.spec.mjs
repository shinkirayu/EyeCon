import { test, expect } from '@playwright/test';

test('client websites fill the browser and support navigation and interactions',async({page},testInfo)=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.EC_NO_PIKO=true;
    localStorage.setItem('eyecon_profile_v1',JSON.stringify({completed:['mayo-portfolio','yappers-login','haybuhay-settings'],onboarding:{seen:true}}));
  });
  await page.goto('/');
  await page.getByRole('button',{name:'Open EyeCon',exact:true}).click();
  await page.getByRole('button',{name:'Open Browser app',exact:true}).click();
  for(const [name,section] of [['Mayonnaisegee','Work'],['Yappers.com','Community'],['Hay Buhay 3','World']]){
    await page.locator('.browser-bookmark').filter({hasText:name}).click();
    const nav=page.getByRole('navigation',{name:`${name} navigation`});
    if(name==='Mayonnaisegee'){
      await expect(page.locator('.client-original-layout')).toBeVisible();
      await expect(page.locator('.client-hero')).toHaveCount(0);
    }else await expect(nav).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`${section.toLowerCase()}-home.png`)});
    await expect(page.locator('.browser-tabs')).toBeEmpty();
    expect(await page.locator('.client-site').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
    await page.locator('.client-site').getByRole('button',{name:'About',exact:true}).click();
    await expect(page.locator('.client-values')).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`${section.toLowerCase()}-about.png`)});
    await nav.getByRole('button',{name:'Contact',exact:true}).click();
    await page.screenshot({path:testInfo.outputPath(`${section.toLowerCase()}-contact.png`)});
    await page.getByLabel('Your name', {exact:true}).fill('Alex');
    await page.getByLabel('Email address',{exact:true}).fill('alex@example.com');
    await page.getByLabel('What’s on your mind?',{exact:true}).fill('Hello there!');
    await page.getByRole('button',{name:'Leave a note'}).click();
    await expect(page.locator('.client-form-status')).toContainText('Thanks, Alex!');
    await nav.getByRole('button',{name:section,exact:true}).click();
    await expect(page.locator('.client-saved-design > div')).toBeVisible();
    await page.locator('.client-card').first().click();
    await expect(page.locator('.client-detail')).toBeVisible();
    if(name==='Yappers.com'){
      await page.getByLabel('Your introduction',{exact:true}).fill('Hello flock!');
      await page.getByRole('button',{name:'Post introduction'}).click();
      await expect(page.locator('.client-detail [role=status]')).toHaveText('Your introduction: Hello flock!');
    }
    if(name==='Hay Buhay 3'){
      await nav.getByRole('button',{name:'Settings',exact:true}).click();
      await page.getByLabel('Background music',{exact:true}).uncheck();
      await page.getByLabel('Graphics quality',{exact:true}).selectOption('Low');
      await nav.getByRole('button',{name:'Home',exact:true}).click();
      await nav.getByRole('button',{name:'Settings',exact:true}).click();
      await expect(page.getByLabel('Background music',{exact:true})).not.toBeChecked();
      await expect(page.getByLabel('Graphics quality',{exact:true})).toHaveValue('Low');
    }
    await page.locator('#browser-home-btn').click();
  }
  expect(errors).toEqual([]);
  const inherited=await page.evaluate(()=>{
    const project=EC_PROJECTS.find(p=>p.id==='yappers');
    const level=EC_LEVELS.find(l=>l.project==='yappers');
    const design=structuredClone(level.elements);
    design.find(el=>el.id==='title').color='#663322';
    design.find(el=>el.id==='user').color='#334455';
    EC_CLIENT_SITES.render(document.getElementById('browser-view'),project,{designs:{[level.id]:design}},'about',()=>{});
    return {heading:getComputedStyle(document.querySelector('.client-site h1')).color,body:getComputedStyle(document.querySelector('.client-hero p:not(.client-eyebrow)')).color,font:getComputedStyle(document.querySelector('.client-site h1')).fontFamily};
  });
  expect(inherited.heading).toBe('rgb(102, 51, 34)');
  expect(inherited.body).toBe('rgb(51, 68, 85)');
  expect(inherited.font).toContain('Londrina Solid');
});
