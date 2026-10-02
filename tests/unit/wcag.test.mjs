import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadWcag(){
  const source = await readFile('js/wcag.js', 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.WCAG;
}

test('contrast ratio is 21:1 for black on white', async () => {
  const wcag = await loadWcag();
  assert.equal(wcag.contrastRatio('#000000', '#ffffff'), 21);
});

test('WCAG AA distinguishes readable and unreadable normal text', async () => {
  const wcag = await loadWcag();
  assert.equal(wcag.passesWCAG('#1A1A1A', '#FFFFFF', 16, false, 'AA').pass, true);
  assert.equal(wcag.passesWCAG('#9AA0A6', '#FFFFFF', 12, false, 'AA').pass, false);
});

test('all text, large or small, needs 4.5:1', async () => {
  const wcag = await loadWcag();
  assert.equal(wcag.requiredRatio(19, true, 'AA'), 4.5);
  assert.equal(wcag.requiredRatio(19, false, 'AA'), 4.5);
});
