const fs = require('fs');
const path = require('path');
const cache = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
const installed = fs.readdirSync(cache).map(dir => path.join(cache, dir, 'node_modules', 'esbuild')).find(dir => fs.existsSync(path.join(dir, 'lib', 'main.js')));
const output = 'output/playwright/campaign-roster-preview';
const manifest = JSON.parse(fs.readFileSync('build/asset-manifest.json', 'utf8'));
fs.copyFileSync(path.join('build', manifest.files['main.css']), `${output}-production.css`);
require(installed).build({
  entryPoints: ['docs/design/prototypes/campaign-roster/preview.jsx'], bundle: true, minify: true, outfile: `${output}.js`,
  alias: { 'firebase/firestore': './docs/design/prototypes/campaign-roster/memoryFirestore.js', 'firebase/storage': './docs/design/prototypes/fixtures/memoryStorage.js' },
  define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'rose-only-preview', setup(builder) {
    builder.onResolve({ filter: /^\.\/CanvasCombatDetails$/ }, args => args.importer.endsWith('CampaignCombatControls.jsx') ? { path: 'unused-dice', namespace: 'preview' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'preview' }, () => ({ contents: 'export const ActionDieButton=()=>null;', loader: 'js' }));
  } }],
}).then(() => {
  fs.writeFileSync(`${output}.html`, '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PNJ y enemigos de Campaña · Comprobación local</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap"><link rel="stylesheet" href="campaign-roster-preview-production.css"><link rel="stylesheet" href="campaign-roster-preview.css"></head><body><div id="root"></div><p id="deployment" style="padding:16px;color:#c8aa6e;font:14px Lato,Arial,sans-serif"></p><script src="campaign-roster-preview.js"></script></body></html>');
}).catch(error => { console.error(error); process.exitCode = 1; });
