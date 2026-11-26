'use strict';

// Source deployment of the room service only. Hosting is released independently.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { packageDeploy } = require('./package-deploy.cjs');

const project = 'base-de-datos-noma', region = 'europe-west1', service = 'noma-canvas3d';
const secret = service + '-master', database = service;
const identity = name => name + '@' + project + '.iam.gserviceaccount.com';
const runner = identity(service + '-run'), builder = identity(service + '-build');

function firebaseTools() {
  try { return path.dirname(require.resolve('firebase-tools/lib/bin/firebase.js')); }
  catch {
    const command = process.platform === 'win32' ? 'where.exe' : 'which';
    const located = spawnSync(command, ['firebase'], { encoding: 'utf8', windowsHide: true }).stdout || '';
    for (const found of located.trim().split(/\r?\n/).filter(Boolean)) {
      const bin = process.platform === 'win32'
        ? path.join(path.dirname(found), 'node_modules/firebase-tools/lib/bin')
        : path.dirname(fs.realpathSync(found));
      if (fs.existsSync(path.join(bin, 'firebase.js'))) return bin;
    }
    throw new Error('No se encuentra Firebase CLI.');
  }
}
function gcloudExecutable() {
  if (process.platform !== 'win32') return { bin: 'gcloud', args: [] };
  const located = spawnSync('where.exe', ['gcloud.cmd'], { encoding: 'utf8', windowsHide: true }).stdout?.trim().split(/\r?\n/)[0];
  if (!located) throw new Error('No se encuentra Google Cloud CLI.');
  const sdk = path.resolve(path.dirname(located), '..');
  const python = path.join(sdk, 'platform/bundledpython/python.exe');
  return { bin: fs.existsSync(python) ? python : (process.env.CLOUDSDK_PYTHON || 'python'), args: [path.join(sdk, 'lib/gcloud.py')] };
}
function plan() {
  return [
    'Proyecto ' + project + ', región ' + region + '.',
    'Habilitar Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Firestore e IAM.',
    'Firestore ' + database + ' con acceso exclusivo del servicio. Reglas independientes para esta base.',
    'Identidad de ejecución ' + runner + ' e identidad de compilación ' + builder + '.',
    'Secreto de máster ' + secret + '. Se reutiliza el existente. Un secreto nuevo se genera por entrada estándar.',
    'Cloud Run ' + service + ' con 0–2 instancias, 1 vCPU, 512 MiB y concurrencia 40.',
    'El origen del despliegue contiene únicamente el servicio, el modelo y los artes locales necesarios.',
  ].join('\n');
}
async function deploy(args = process.argv.slice(2)) {
  const unknown = args.filter(a => !['--apply', '--firebase-login', '--plan'].includes(a));
  if (unknown.length) throw new Error('Opción desconocida: ' + unknown.join(' '));
  console.log(plan());
  if (!args.includes('--apply')) return;
  const bin = firebaseTools(), gc = gcloudExecutable();
  let accessToken;
  if (args.includes('--firebase-login')) {
    const lib = path.dirname(bin), auth = require(path.join(lib, 'auth'));
    const account = auth.getGlobalDefaultAccount(), options = { project };
    if (!account) throw new Error('Firebase CLI requiere una sesión.');
    auth.setActiveAccount(options, account);
    await require(path.join(lib, 'requireAuth')).requireAuth(options);
    accessToken = await require(path.join(lib, 'apiv2')).getAccessToken();
  }
  const cloudEnv = { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: '1',
    ...(accessToken && { CLOUDSDK_AUTH_ACCESS_TOKEN: accessToken }) };
  function execute(command, argv, opts = {}) {
    const result = spawnSync(command, argv, {
      encoding: 'utf8', env: cloudEnv, windowsHide: true, maxBuffer: 10 * 1024 * 1024,
      stdio: opts.capture || opts.input ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      ...(opts.input && { input: opts.input }),
    });
    if (result.error || result.status !== 0) {
      // Captured output for a describe/list can identify the failed resource,
      // but never print stdin, authentication material or the whole command env.
      throw new Error(result.error?.message || result.stderr?.trim() || 'El despliegue devolvió ' + result.status);
    }
    return (result.stdout || '').trim();
  }
  function cloud(argv, opts) { return execute(gc.bin, [...gc.args, ...argv, '--project=' + project, '--quiet'], opts); }
  function exists(argv, value) {
    return cloud([...argv, '--format=value(name)'], { capture: true }).split(/\r?\n/).some(name => name === value || name.endsWith('/' + value));
  }
  function addAccount(name, display) {
    const email = identity(name);
    if (!exists(['iam', 'service-accounts', 'list', '--filter=email=' + email], email))
      cloud(['iam', 'service-accounts', 'create', name, '--display-name=' + display]);
  }

  cloud(['services', 'enable', 'run.googleapis.com', 'cloudbuild.googleapis.com', 'artifactregistry.googleapis.com',
    'secretmanager.googleapis.com', 'firestore.googleapis.com', 'iam.googleapis.com']);
  if (!exists(['firestore', 'databases', 'list'], database)) cloud(['firestore', 'databases', 'create',
    '--database=' + database, '--location=' + region, '--type=firestore-native']);
  execute(process.execPath, [path.join(bin, 'firebase.js'), 'deploy', '--only', 'firestore:' + database, '--config',
    path.join(__dirname, 'firebase.database.json'), '--project', project, '--non-interactive']);
  addAccount(service + '-run', 'Canvas 3D · sesiones de mesa');
  addAccount(service + '-build', 'Canvas 3D · compilación');
  cloud(['projects', 'add-iam-policy-binding', project, '--member=serviceAccount:' + runner, '--role=roles/datastore.user',
    '--condition=title=canvas3d-room-database,expression=resource.name=="projects/' + project + '/databases/' + database + '"']);
  cloud(['projects', 'add-iam-policy-binding', project, '--member=serviceAccount:' + builder,
    '--role=roles/run.builder', '--condition=None']);
  if (!exists(['secrets', 'list', '--filter=name:' + secret], secret))
    cloud(['secrets', 'create', secret, '--replication-policy=user-managed', '--locations=' + region]);
  const active = cloud(['secrets', 'versions', 'list', secret, '--filter=state=ENABLED', '--limit=1', '--format=value(name)'], { capture: true });
  if (!active) cloud(['secrets', 'versions', 'add', secret, '--data-file=-'],
    { input: process.env.CANVAS3D_SETUP_MASTER_KEY || randomBytes(32).toString('base64url') });
  cloud(['secrets', 'add-iam-policy-binding', secret, '--member=serviceAccount:' + runner, '--role=roles/secretmanager.secretAccessor']);
  const output = await packageDeploy();
  try {
    cloud(['run', 'deploy', service, '--source=' + output, '--region=' + region,
      '--service-account=' + runner, '--build-service-account=projects/' + project + '/serviceAccounts/' + builder,
      '--min-instances=0', '--max-instances=2', '--concurrency=40', '--cpu=1', '--memory=512Mi', '--timeout=60',
      '--set-env-vars=CANVAS3D_DATABASE=' + database + ',GOOGLE_CLOUD_PROJECT=' + project,
      '--set-secrets=CANVAS3D_MASTER_KEY=' + secret + ':latest', '--allow-unauthenticated']);
  } finally {
    if (path.dirname(output) === os.tmpdir() && path.basename(output).startsWith('noma-canvas3d-deploy-'))
      await fs.promises.rm(output, { recursive: true, force: true });
  }
}
if (require.main === module) deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
