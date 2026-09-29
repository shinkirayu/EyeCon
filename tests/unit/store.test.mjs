import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
async function setupWindow(){
  const context={window:{},localStorage:{getItem:()=>null,setItem:()=>{}},console};
  vm.createContext(context);
  for(const file of ['cosmetics','levels','storage']) vm.runInContext(await readFile(`js/${file}.js`,'utf8'),context);
  return context.window;
}
async function setup(){ return (await setupWindow()).EC_STORE; }
test('daily specials are stable, unique and rotate across UTC midnight',async()=>{
  const s=await setup(), date=new Date('2026-09-15T23:59:59Z');
  const first=s.dailyShop(date), same=s.dailyShop(new Date('2026-09-15T00:00:00Z'));
  assert.deepEqual(first.items.map(i=>i.id),same.items.map(i=>i.id));
  assert.equal(new Set(first.items.map(i=>i.id)).size,5);
  assert.notDeepEqual(first.items.map(i=>i.id),s.dailyShop(new Date('2026-09-16T00:00:00Z')).items.map(i=>i.id));
});
test('Boris wallpaper stays available to buy and equip',async()=>{
  const s=await setup(),p=s.defaultProfile(),shop=s.dailyShop();
  assert.equal(shop.items[0].id,'wp-boris');
  assert.equal(s.dailyShop(new Date('2026-09-16T00:00:00Z')).items[0].id,'wp-boris');
  assert.match(shop.items[0].css,/assets\/wallpapers\/boris\.png/);
  s.toggleCart(p,'wp-boris');
  const result=s.checkout(p,shop.date);
  assert.equal(result.items[0].id,'wp-boris');
  assert.ok(p.inventory.includes('wp-boris'));
  s.equipItem(p,shop.items[0]);
  assert.equal(p.equipped.wallpaper,'wp-boris');
});
test('checkout charges exact prices once and preserves existing inventory',async()=>{
  const s=await setup(),p=s.defaultProfile(),shop=s.dailyShop();p.currency=1000;
  const original=p.inventory.slice(),item=shop.items[0];s.toggleCart(p,item.id);
  const result=s.checkout(p,shop.date);
  assert.equal(result.total,s.itemPrice(item));assert.equal(p.currency,1000-result.total);
  assert.ok(original.every(id=>p.inventory.includes(id)));assert.ok(p.inventory.includes(item.id));
  assert.equal(p.purchases.length,1);assert.equal(s.toggleCart(p,item.id),false);
  assert.ok(s.checkout(p,shop.date).error);assert.equal(p.purchases.length,1);
});
test('insufficient funds and stale carts cannot charge or grant items',async()=>{
  const s=await setup(),p=s.defaultProfile(),shop=s.dailyShop();p.currency=0;
  s.toggleCart(p,shop.items[0].id);assert.ok(s.checkout(p,shop.date).error);
  assert.equal(p.currency,0);assert.equal(p.purchases.length,0);
  p.currency=1000;assert.ok(s.checkout(p,'2000-01-01').error);assert.equal(p.currency,1000);
  p.shopCart.date='2000-01-01';assert.equal(s.getCart(p).ids.length,0);
});

const approve=(s,p,level,stars,date)=>{
  p.completed.includes(level.id)||p.completed.push(level.id);
  p.history.unshift({levelId:level.id,date,stars,missionComplete:true});
};

test('you start with one email and each approval brings the next page',async()=>{
  const s=await setup(),p=s.defaultProfile(),day='2026-09-15T12:00:00Z',now=new Date(day);
  const first=s.commissionInbox(p,now);
  assert.equal(first.map(l=>l.id).join(),'coffee-shop');
  approve(s,p,first[0],3,day);
  assert.equal(s.commissionInbox(p,now).map(l=>l.id).join(),'brewbird-menu');
});

test('a good review brings a different client, and the day holds three tasks',async()=>{
  const s=await setup(),p=s.defaultProfile(),now=new Date('2026-09-15T12:00:00Z');
  approve(s,p,s.commissionInbox(p,now)[0],4,'2026-09-14T12:00:00Z');
  // A 4★ review: Thread & Co. writes in, and Brewbird comes back with its menu page.
  assert.equal(s.commissionInbox(p,now).map(l=>l.id).join(),'thread-landing,brewbird-menu');
  for(let i=0;i<3;i++){
    const task=s.commissionInbox(p,now)[0];
    assert.equal(s.beginWorkSubmission(p),true);
    approve(s,p,task,4,'2026-09-15T12:00:00Z');
  }
  assert.equal(s.dailyTaskLimit(p),3);
  assert.equal(s.commissionInbox(p,now).length,0);
  assert.equal(s.progression(p,now).doneToday,3);
  assert.equal(s.commissionInbox(p,new Date('2026-09-16T09:00:00Z')).length,0);
  assert.equal(s.nextWorkday(p),true);
  assert.ok(s.commissionInbox(p).length>0);
});

test('a redo can raise a rating but a page only counts once',async()=>{
  const s=await setup(),p=s.defaultProfile(),day='2026-09-15T12:00:00Z';
  const level=s.commissionInbox(p,new Date(day))[0];
  approve(s,p,level,3,day); approve(s,p,level,5,day); approve(s,p,level,5,day);
  assert.equal(s.goodFeedbackCount(p),1);
  assert.equal(s.bestStars(p)[level.id],5);
});

test('when the next client is out of reach, low-rated pages come back to polish',async()=>{
  const w=await setupWindow(),s=w.EC_STORE,p=s.defaultProfile(),day='2026-09-15T12:00:00Z';
  w.EC_LEVELS.filter(l=>l.project==='brewbird').forEach(l=>approve(s,p,l,3,'2026-09-14T12:00:00Z'));
  const inbox=s.commissionInbox(p,new Date(day));
  assert.equal(inbox.length,3);
  assert.ok(inbox.every(l=>s.isPolishTask(p,l)));
  assert.equal(s.progression(p).nextProject.id,'thread');
  assert.equal(s.progression(p).goodNeeded,1);
});

test('approval pays exactly the advertised prize plus bonus stars and adds feedback',async()=>{
  const s=await setup(),p=s.defaultProfile();
  const level=s.commissionInbox(p)[0];
  const {base,perBonusStar}=s.commissionPay(p,level);
  const before=p.currency;
  const result={stars:5,score:100,grade:'S+',xpAwarded:100,categoryScores:{},mission:{complete:true,objectives:[]}};
  const out=s.recordSubmission(p,level,result,0);
  assert.equal(out.currencyEarned,base+2*perBonusStar+out.daily.bonus);
  assert.equal(p.currency,before+out.currencyEarned);
  assert.equal(s.completedFeedback(p).length,1);
  assert.equal(s.goodFeedbackCount(p),1);
  assert.ok(p.history[0].quote);
  assert.ok(s.commissionPrize(p,level)<base, 'a redo pays less than the first time');
});

test('revisions use all three workday slots and keep feedback totals',async()=>{
  const s=await setup(),p=s.defaultProfile(),level=s.commissionInbox(p)[0];
  assert.equal(s.workday(p).day,1);
  assert.equal(s.nextWorkday(p),false);
  const result={stars:2,score:40,grade:'C',xpAwarded:20,categoryScores:{},mission:{complete:false}};
  for(let i=1;i<=3;i++){
    assert.equal(s.beginWorkSubmission(p),true);
    s.recordSubmission(p,level,result,0);
    assert.equal(s.workday(p).submissions,i);
  }
  assert.equal(s.beginWorkSubmission(p),false);
  assert.equal(s.workday(p).reviews.length,3);
  assert.equal(s.workday(p).coins,0);
  assert.equal(s.workday(p).xp,0);
  p.readyReply={levelId:level.id};
  assert.equal(s.nextWorkday(p),false);
  delete p.readyReply;
  assert.equal(s.nextWorkday(p),true);
  assert.equal(s.workday(p).day,2);
  assert.equal(s.workday(p).submissions,0);
  assert.ok(s.commissionInbox(p).some(l=>l.id===level.id));
});
