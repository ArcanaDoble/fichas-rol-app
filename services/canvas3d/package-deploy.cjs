'use strict';

// Build a minimal Cloud Run source context. Working documents, credentials,
// local rooms, the rest of the game's assets and other apps stay on disk.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

async function packageDeploy() {
  const project = path.resolve(__dirname, '../..');
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'noma-canvas3d-deploy-'));
  const copy = async (from, to = from) => {
    const dest = path.join(output, to);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.cp(path.join(project, from), dest, { recursive: true });
  };
  await copy('services/canvas3d/Dockerfile', 'Dockerfile');
  for (const filename of ['server.cjs', 'rooms.cjs', 'store.cjs', 'errors.cjs', 'map-image.cjs',
    'package.json', 'package-lock.json']) await copy('services/canvas3d/' + filename);
  const shared = 'src/features/canvas/table3d';
  for (const filename of await fs.readdir(path.join(project, shared))) {
    if (/^game(?:[A-Z][a-zA-Z]+)?\.cjs$/.test(filename) || ['gamePieces.js','gameSightMask.js'].includes(filename)) await copy(shared + '/' + filename);
  }
  await copy('public/canvas3d');
  await copy('public/scenery');
  return output;
}

if (require.main === module) packageDeploy().then(console.log).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { packageDeploy };
