import { cp, mkdir, rm } from 'node:fs/promises';

const outputDir = 'dist';
const files = ['index.html', 'icon.svg', 'manifest.json'];
const directories = ['css', 'js', 'assets'];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await Promise.all([
  ...files.map(file => cp(file, `${outputDir}/${file}`)),
  ...directories.map(directory => cp(directory, `${outputDir}/${directory}`, { recursive: true }))
]);

console.log('Static production build created in dist/.');
