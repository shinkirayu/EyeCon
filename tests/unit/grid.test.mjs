import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('all commissions use 8px structural geometry and keep artwork in bounds',async()=>{
 const c={window:{}};vm.createContext(c);vm.runInContext(await readFile('js/levels.js','utf8'),c);
 for(const level of c.window.EC_LEVELS){
  assert.equal(level.rubric.gridUnit,8);assert.equal(level.rubric.spacingUnit,8);
  for(const el of level.elements){
   assert.equal(el.w%8,0,`${level.id}/${el.id} width`);assert.equal(el.h%8,0,`${level.id}/${el.id} height`);
   assert.ok(el.x>=0 && el.y>=0 && el.x+el.w<=level.canvas.w && el.y+el.h<=level.canvas.h,`${level.id}/${el.id} bounds`);
   assert.equal(el.x%8,0,`${level.id}/${el.id} x`);
   assert.equal(el.y%8,0,`${level.id}/${el.id} y`);
   for(const key of ['padding','margin','radius']){
    if(typeof el[key]==='number')assert.equal(el[key]%8,0,`${level.id}/${el.id} ${key}`);
   }
  }
 }
});
test('alignment grading agrees with the visible 8px grid on both axes',async()=>{
 const c={window:{EC_STORE:{xpAwardForGrade:()=>0}}};vm.createContext(c);
 for(const name of ['levels','wcag','grading'])vm.runInContext(await readFile(`js/${name}.js`,'utf8'),c);
 const level=c.window.EC_LEVELS[0];
 const elements=JSON.parse(JSON.stringify(level.elements));
 elements.filter(e=>!e.locked).forEach(e=>{e.x=Math.round(e.x/8)*8;e.y=Math.round(e.y/8)*8;});
 assert.equal(c.window.EC_GRADING.gradeSubmission(level,elements).categoryScores.alignment,100);
 elements.find(e=>!e.locked).y+=3;
 assert.ok(c.window.EC_GRADING.gradeSubmission(level,elements).categoryScores.alignment<100);
});
