import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
async function setup(){
  const context={window:{},localStorage:{getItem:()=>null,setItem:()=>{}},console};
  vm.createContext(context);
  for(const file of ['cosmetics','levels','storage']) vm.runInContext(await readFile(`js/${file}.js`,'utf8'),context);
  return context.window.EC_STORE;
}
test('daily specials are stable, unique and rotate across UTC midnight',async()=>{
  const s=await setup(), date=new Date('2026-09-15T23:59:59Z');
  const first=s.dailyShop(date), same=s.dailyShop(new Date('2026-09-15T00:00:00Z'));
  assert.deepEqual(first.items.map(i=>i.id),same.items.map(i=>i.id));
  assert.equal(new Set(first.items.map(i=>i.id)).size,5);
  assert.notDeepEqual(first.items.map(i=>i.id),s.dailyShop(new Date('2026-09-16T00:00:00Z')).items.map(i=>i.id));
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

test('commissions arrive daily without completion locks and keep unfinished requests',async()=>{
  const s=await setup(),p=s.defaultProfile();
  const first=s.commissionInbox(p,new Date('2026-09-15T12:00:00Z'));
  assert.equal(first.length,1);
  assert.equal(s.commissionInbox(p,new Date('2026-09-15T23:00:00Z')).length,1);
  const second=s.commissionInbox(p,new Date('2026-09-16T00:00:00Z'));
  assert.equal(second.length,2);
  assert.equal(second[0].id,first[0].id);
  p.completed.push(first[0].id);
  assert.equal(s.commissionInbox(p,new Date('2026-09-16T12:00:00Z')).length,1);
});
