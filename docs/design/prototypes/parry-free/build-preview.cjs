const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../..');
const cache = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
const installed = fs.readdirSync(cache).map(dir => path.join(cache, dir, 'node_modules', 'esbuild')).find(dir => fs.existsSync(path.join(dir, 'lib', 'main.js')));
const esbuild = require(installed);
const output = path.join(root, 'output/playwright/parry-free-preview');
async function build() {
  const result = await esbuild.build({
    absWorkingDir:root, entryPoints:[path.join(__dirname, 'entry.jsx')], bundle:true, minify:true, write:false,
    outfile:`${output}.js`, define:{ 'process.env.NODE_ENV':'"production"' },
    plugins:[{ name:'rose-only-preview', setup(builder) {
      // The preview uses only CombatRose. Avoid loading the unrelated dice/Firebase chain.
      builder.onResolve({ filter:/^\.\/CanvasCombatDetails$/ }, args => args.importer.endsWith('CampaignCombatControls.jsx') ? { path:'unused-dice', namespace:'preview' } : undefined);
      builder.onLoad({ filter:/.*/, namespace:'preview' }, () => ({ contents:'export const ActionDieButton = () => null;', loader:'js' }));
    } }],
  });
  const script = result.outputFiles.find(file => file.path.endsWith('.js')).text;
  const css = result.outputFiles.find(file => file.path.endsWith('.css')).text;
  const images = Object.fromEntries([['player','Yerma'],['master','Taiga']].map(([seat, name]) => [seat, `data:image/webp;base64,${fs.readFileSync(path.join(root,`public/yerma/${name}.webp`)).toString('base64')}`]));
  const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,600;1,400&family=Cinzel:wght@400;500;600&family=Lato:wght@400;700&display=swap">';
  const fragment = fs.readFileSync(path.join(__dirname,'fragment.html'),'utf8')
    .replace('<!-- PARRY_STYLES -->', `${fonts}\n<style>${css}</style>`)
    .replace('<!-- PARRY_IMAGES -->', `<script>globalThis.parryPreviewImages=${JSON.stringify(images)};</script>`)
    .replace('<!-- PARRY_SCRIPT -->', `<script>${script.replace(/<\/script/gi,'<\\/script')}</script>`);
  fs.mkdirSync(path.dirname(output), { recursive:true });
  fs.writeFileSync(`${output}.html`, `<!doctype html>\n<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Parry libre · NOMA · Previa</title><style>body{margin:0;padding:20px 12px 24px;background:#070a10}button{cursor:pointer}</style></head><body>${fragment}</body></html>`);
  // This exact same compiled component is also usable in the conversation.
  const inline = process.argv[2];
  if (inline) fs.writeFileSync(path.resolve(inline), fragment);
  console.log(JSON.stringify({ preview:`${output}.html`, inline: inline || null, bytes:Buffer.byteLength(fragment) }));
}
build().catch(error => { console.error(error); process.exitCode=1; });
