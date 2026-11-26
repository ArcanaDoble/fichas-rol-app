const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../..');
const cache = path.join(process.env.LOCALAPPDATA,'npm-cache','_npx');
const installed = fs.readdirSync(cache).map(dir => path.join(cache,dir,'node_modules','esbuild')).find(dir => fs.existsSync(path.join(dir,'lib','main.js')));
const esbuild = require(installed);
const output = 'output/playwright/parry-free-integration-preview';
esbuild.build({
  absWorkingDir:root, entryPoints:[path.join(__dirname,'integration-preview.jsx')], bundle:true, minify:true, outfile:`${output}.js`,
  alias:{ 'firebase/firestore':'./src/features/parry-free/testing/memoryFirestore.js', 'firebase/storage':'./docs/design/prototypes/fixtures/memoryStorage.js' },
  define:{ 'process.env':'{}', 'process.env.NODE_ENV':'"production"' },
  plugins:[{ name:'rose-only-preview', setup(builder) {
    builder.onResolve({ filter:/^\.\/CanvasCombatDetails$/ }, args => args.importer.endsWith('CampaignCombatControls.jsx') ? { path:'unused-dice', namespace:'preview' } : undefined);
    builder.onLoad({ filter:/.*/, namespace:'preview' }, () => ({ contents:'export const ActionDieButton=()=>null;', loader:'js' }));
  } }],
}).then(() => {
  fs.writeFileSync(path.join(root,`${output}.html`), '<!doctype html>\n<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Parry libre integrado · Prueba local</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;1,400&family=Cinzel:wght@400;500;600&family=Lato:wght@400;700&display=swap"><link rel="stylesheet" href="parry-free-integration-preview.css"><style>body{margin:0;background:#070a10}button{cursor:pointer}a{color:#c8aa6e}</style></head><body><div id="root"></div><script src="parry-free-integration-preview.js"></script></body></html>');
  console.log(`${output}.html`);
}).catch(error => { console.error(error); process.exitCode=1; });
