import { mkdir, copyFile, cp, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('public/application-reader/', root);
await mkdir(output, { recursive: true });
await copyFile(new URL('node_modules/tesseract.js/dist/worker.min.js', root), new URL('worker.min.js', output));
await copyFile(new URL('node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz', root), new URL('eng.traineddata.gz', output));
const core = new URL('node_modules/tesseract.js-core/', root);
for (const name of await readdir(core)) {
  if (name.endsWith('.wasm') || name.endsWith('.wasm.js') || name === 'LICENSE') await copyFile(new URL(name, core), new URL(name, output));
}
for (const name of ['cmaps', 'standard_fonts', 'wasm']) await cp(new URL(`node_modules/pdfjs-dist/${name}`, root), new URL(name, output), { recursive: true });
await copyFile(new URL('node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt', root), new URL('worker.min.js.LICENSE.txt', output));
await copyFile(new URL('node_modules/tesseract.js/LICENSE.md', root), new URL('LICENSE_TESSERACT_JS', output));
await copyFile(new URL('node_modules/pdfjs-dist/LICENSE', root), new URL('LICENSE_PDFJS', output));
