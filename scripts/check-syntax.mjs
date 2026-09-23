import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const files = [
  'js/wcag.js',
  'js/ui-helpers.js',
  'js/storage.js',
  'js/sound.js',
  'js/mail.js',
  'js/levels.js',
  'js/grading.js',
  'js/editor.js',
  'js/maker.js',
  'js/piko.js',
  'js/cosmetics.js',
  'js/app.js'
];

await Promise.all(files.map(async file => {
  await access(file);
  await execFileAsync(process.execPath, ['--check', file]);
}));

console.log(`Syntax check passed for ${files.length} browser scripts.`);
