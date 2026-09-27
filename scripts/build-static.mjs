import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const outputDir = 'dist';
const files = ['index.html', 'icon.svg', 'manifest.json'];
const directories = ['css', 'js', 'assets'];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await Promise.all([
  ...files.map(file => cp(file, `${outputDir}/${file}`)),
  ...directories.map(directory => cp(directory, `${outputDir}/${directory}`, { recursive: true }))
]);

// vercel.json caches css/ and js/ for a year, so give their URLs a per-build
// version; otherwise browsers keep running old code after a deploy.
const version = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 12);
const indexPath = `${outputDir}/index.html`;
const html = await readFile(indexPath, 'utf8');
await writeFile(indexPath, html.replace(/((?:href|src)="(?:css|js)\/[^"?]+)"/g, `$1?v=${version}"`));

console.log(`Static production build created in dist/ (version ${version}).`);
