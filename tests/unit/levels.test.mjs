import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

async function setup(){
  const context={window:{},localStorage:{getItem:()=>null,setItem:()=>{}},console};
  vm.createContext(context);
  for(const file of ['wcag','cosmetics','levels','storage','grading']) vm.runInContext(await readFile(`js/${file}.js`,'utf8'),context);
  return context.window;
}

// Mirrors SETTINGS_UNLOCK in editor.js; text alignment is always available.
const TOOL_STAGE = { align:1, position:1, sizing:2, typography:3, color:4 };

test('every page is a real, solvable task with the tools unlocked by then',async()=>{
  const w=await setup(), G=w.EC_GRADING;
  for(const level of w.EC_LEVELS){
    assert.ok(level.goals.some(g=>!g.bonus), `${level.id} needs a required goal`);
    assert.ok(level.goals.some(g=>g.bonus), `${level.id} needs a bonus goal`);
    for(const goal of level.goals){
      const kind=G.goalKind(goal.check);
      assert.ok(kind, `${level.id}: unknown goal check`);
      const tool=G.GOAL_TOOL[kind];
      // A level's own tools list (Figma levels) overrides the stage pacing.
      assert.ok(level.tools ? tool==='align' || level.tools.includes(tool) : TOOL_STAGE[tool]<=level.levelNumber, `${level.id}: "${goal.label}" needs a tool not unlocked yet`);
      for(const id of G.goalIds(goal.check)){
        const el=level.elements.find(e=>e.id===id);
        assert.ok(el && !el.locked, `${level.id}: goal target ${id} missing or locked`);
      }
      assert.ok(goal.label && goal.why && goal.tip, `${level.id}: goal needs label, why and tip`);
    }
    const start=G.checkGoals(level, level.elements);
    start.forEach(r=>assert.equal(r.met,false,`${level.id}: "${r.goal.label}" is already done at the start`));
    const result=G.gradeSubmission(level, level.elements);
    assert.equal(result.mission.complete,false, `${level.id} must not be approvable untouched`);
  }
});

test('stars: required goals approve at 3★, each bonus adds a star',async()=>{
  const {EC_GRADING:G}=await setup();
  const r=(req,bon)=>[{goal:{},met:req},{goal:{},met:true},{goal:{bonus:true},met:bon[0]},{goal:{bonus:true},met:bon[1]}];
  assert.equal(G.goalScore(r(true,[false,false])).stars,3);
  assert.equal(G.goalScore(r(true,[true,false])).stars,4);
  assert.equal(G.goalScore(r(true,[true,true])).stars,5);
  assert.ok(G.goalScore(r(false,[true,true])).stars<3);
});

test('fixing the menu page with text alignment approves it',async()=>{
  const w=await setup(), G=w.EC_GRADING;
  const level=w.EC_LEVELS.find(l=>l.id==='brewbird-menu');
  const els=JSON.parse(JSON.stringify(level.elements));
  const by=id=>els.find(e=>e.id===id);
  by('title').align='center';
  ['p1','p2','p3','p4'].forEach(id=>{ by(id).align='right'; by(id).x=560; });
  const result=G.gradeSubmission(level, els);
  assert.equal(result.mission.complete,true);
  assert.equal(result.stars,4);
});
