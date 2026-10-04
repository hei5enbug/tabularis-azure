import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const HOST_COMMIT = 'a10ba47979320766f0cb706afd48e6cecd7331e8';
export const NODE_VERSION = '24.21.0';
export const PNPM_VERSION = '10.30.3';
const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function relative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || value.split('/').some(part => !part || part === '.' || part === '..')) fail('INVALID_SNAPSHOT');
  return value;
}
function regular(source, name) {
  let current = source;
  const parts = relative(name).split('/');
  for (let i = 0; i < parts.length; i += 1) {
    current = path.join(current, parts[i]);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (i === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) fail('SOURCE_MISMATCH');
  }
  return current;
}
export function readProvenance(source = root) {
  const provenance = JSON.parse(fs.readFileSync(path.join(source, 'build-support/provenance.json'), 'utf8'));
  if (provenance.version !== 1 || provenance.host_commit !== HOST_COMMIT || !Array.isArray(provenance.files) || provenance.files.length === 0) fail('INVALID_SNAPSHOT');
  const names = new Set();
  for (const file of provenance.files) {
    relative(file.path);
    if ((!['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'LICENSE'].includes(file.path) && !file.path.startsWith('packages/')) || names.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0 || !['100644', '100755'].includes(file.mode)) fail('INVALID_SNAPSHOT');
    names.add(file.path);
  }
  return provenance;
}
export function verifyFiles(directory, records) {
  try {
    if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) fail('SOURCE_MISMATCH');
    for (const file of records) {
      const bytes = fs.readFileSync(regular(directory, file.path));
      if (bytes.length !== file.size || hash(bytes) !== file.sha256) fail('SOURCE_MISMATCH');
    }
  } catch { fail('SOURCE_MISMATCH'); }
}
export function prepareHost({ source = root, provenance = readProvenance(source), beforePublish = () => {} } = {}) {
  const snapshot = path.join(source, 'build-support/host');
  verifyFiles(snapshot, provenance.files);
  const parent = path.dirname(source);
  const destination = path.join(parent, 'tabularis-host');
  const lock = path.join(parent, '.tabularis-host-bootstrap.lock');
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx', 0o600); } catch { fail('BOOTSTRAP_LOCKED'); }
  let temporary;
  try {
    if (fs.existsSync(destination)) {
      verifyFiles(destination, provenance.files.filter(file => file.path.startsWith('packages/service-contracts/') || file.path.startsWith('packages/plugin-api/')));
      return { host: destination, created: false };
    }
    temporary = fs.mkdtempSync(path.join(parent, '.tabularis-host-bootstrap-'));
    for (const file of provenance.files) {
      const target = path.join(temporary, ...file.path.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, fs.readFileSync(regular(snapshot, file.path)), { flag: 'wx', mode: file.mode === '100755' ? 0o755 : 0o644 });
    }
    verifyFiles(temporary, provenance.files);
    beforePublish(temporary, destination);
    if (fs.existsSync(destination)) fail('DESTINATION_EXISTS');
    fs.renameSync(temporary, destination);
    temporary = undefined;
    return { host: destination, created: true };
  } finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}
export function commandFor(args, platform = process.platform, systemRoot) {
  if (args.some(arg => !/^[a-zA-Z0-9@/*:.=-]+$/.test(arg))) fail('INVALID_COMMAND');
  if (platform === 'win32') {
    if (typeof systemRoot !== 'string' || !path.win32.isAbsolute(systemRoot)) fail('INVALID_TOOLCHAIN');
    return { executable: path.win32.join(systemRoot, 'System32', 'cmd.exe'), args: ['/d', '/s', '/c', `pnpm ${args.join(' ')}`] };
  }
  return { executable: 'pnpm', args };
}
export function runPnpm(args, cwd, { platform = process.platform, env, capture = false } = {}) {
  const command = commandFor(args, platform, env?.SystemRoot);
  const result = spawnSync(command.executable, command.args, { cwd, env, shell: false, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error || result.status !== 0) fail('COMMAND_FAILED');
  return result.stdout?.trim();
}
export function toolEnvironment() {
  const env = {};
  for (const key of ['PATH', 'HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'LOCALAPPDATA', 'APPDATA', 'PNPM_HOME']) if (process.env[key] !== undefined) env[key] = process.env[key];
  return env;
}
export function bootstrap({ source = root, nodeVersion = process.versions.node, run = runPnpm, env = toolEnvironment() } = {}) {
  if (nodeVersion !== NODE_VERSION) fail('NODE_VERSION_MISMATCH');
  if (run(['--version'], source, { env, capture: true }) !== PNPM_VERSION) fail('PNPM_VERSION_MISMATCH');
  const provenance = readProvenance(source);
  const prepared = prepareHost({ source, provenance });
  const commands = [
    [prepared.host, ['--filter', '@tabularis/service-contracts', '--filter', '@tabularis/plugin-api', 'install', '--frozen-lockfile', '--ignore-scripts']],
    [prepared.host, ['--filter', '@tabularis/service-contracts', 'build']],
    [prepared.host, ['--filter', '@tabularis/plugin-api', 'build']],
    [source, ['install', '--frozen-lockfile', '--ignore-scripts']],
    [source, ['--dir', 'ui', 'install', '--frozen-lockfile', '--ignore-scripts']],
    [source, ['build']],
    [source, ['--dir', 'ui', 'build']],
  ];
  for (const [cwd, args] of commands) run(args, cwd, { env });
  return { host_commit: HOST_COMMIT, host: prepared.host, created: prepared.created, node: NODE_VERSION, pnpm: PNPM_VERSION };
}
