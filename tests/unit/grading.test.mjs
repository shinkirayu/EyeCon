import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadGrading(){
  const context = {
    window: {
      EC_ROLE_DEFAULTS: { body: { minSize: 14, maxSize: 17 } },
      EC_STORE: { xpAwardForGrade: () => 0 }
    }
  };
  vm.runInNewContext(await readFile('js/wcag.js', 'utf8'), context);
  vm.runInNewContext(await readFile('js/grading.js', 'utf8'), context);
  return context.window.EC_GRADING;
}

test('level one grades only its alignment mission objective', async () => {
  const grading = await loadGrading();
  const level = {
    levelNumber: 1,
    canvas: { w: 900, h: 560, bg: '#ffffff' },
    rubric: {
      gridColumns: 12,
      gridGutter: 20,
      spacingUnit: 16,
      weights: { contrast: 10, alignment: 30, hierarchy: 10, spacing: 12, consistency: 8, accessibility: 15, usability: 15 }
    }
  };
  const elements = [
    { id: 'background', type: 'rect', role: 'background', x: 0, y: 0, w: 900, h: 560, bg: '#ffffff', locked: true, z: 0 },
    { id: 'copy', type: 'text', role: 'body', text: 'Low contrast but not taught yet', x: 20, y: 20, w: 240, h: 24, color: '#ffffff', fontSize: 16, fontWeight: '400', z: 2 }
  ];

  const result = grading.gradeSubmission(level, elements);
  assert.deepEqual(Array.from(result.activeCategories), ['alignment']);
  assert.equal(result.score, 100);
  assert.equal(result.categoryScores.contrast < 100, true);
  assert.equal(result.mission.complete, true);
});

test('hidden target placement gives exact, near, and far positions progressively less credit', async () => {
  const grading = await loadGrading();
  const level = {
    levelNumber: 1,
    canvas: { w: 800, h: 600, bg: '#ffffff' },
    rubric: { gridColumns: 8, gridGutter: 16, gridUnit: 8, placementFalloff: 100, weights: { alignment: 30 } },
    hiddenTargets: [{ id:'copy', x:100, y:100, w:200, h:40 }],
  };
  const element = { id:'copy', type:'text', role:'body', text:'Place me', x:100, y:100, w:200, h:40, color:'#000000', fontSize:16, fontWeight:'400', z:2 };
  const exact = grading.gradeSubmission(level,[element]).categoryScores.placement;
  const near = grading.gradeSubmission(level,[{...element,x:120}]).categoryScores.placement;
  const far = grading.gradeSubmission(level,[{...element,x:180}]).categoryScores.placement;
  assert.equal(exact,100);
  assert.ok(near < exact && near > far);
  assert.ok(far > 0);
});
