import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fail } from './errors.mjs';
import { boundedDirectoryEntries, readJSON, regularWithin } from './files.mjs';

function packageName(name) {
  if (typeof name !== 'string' || !/^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/.test(name) || name.split('/').some(part => part === '.' || part === '..')) fail('INVALID_DEPENDENCY');
  return name;
}

function findNamedRoot(file, name) {
  let current = path.dirname(fs.realpathSync(file));
  while (true) {
    const manifest = path.join(current, 'package.json');
    if (fs.existsSync(manifest) && readJSON(manifest).name === name) return fs.realpathSync(current);
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveInstalled(importer, name, optional = false) {
  packageName(name);
  let ancestor = fs.realpathSync(importer);
  let installed;
  while (true) {
    const manifest = path.join(ancestor, 'node_modules', name, 'package.json');
    if (fs.existsSync(manifest) && readJSON(manifest).name === name) {
      installed = fs.realpathSync(path.dirname(manifest));
      break;
    }
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  if (!installed) {
    if (optional) return null;
    fail('DEPENDENCY_MISSING');
  }
  const require = createRequire(path.join(importer, 'package.json'));
  for (const request of [`${name}/package.json`, name]) {
    try {
      const root = findNamedRoot(require.resolve(request), name);
      if (root === installed) return root;
    } catch (error) {
      if (error?.code && !['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(error.code)) throw error;
    }
  }
  return installed;
}

const excludedDirectories = new Set(['node_modules', '.git', '.hg', '.svn', 'test', 'tests', '__tests__', 'coverage', '.nyc_output', '.cache']);
function excluded(relative, name) {
  if (excludedDirectories.has(name)) return true;
  if (/^(?:\.env(?:\..*)?|\.npmrc|\.yarnrc(?:\..*)?|\.pnpmfile.*|.*\.(?:pem|key|pfx|p12)|credentials?(?:\..*)?|secrets?(?:\..*)?|.*\.log)$/i.test(name)) return true;
  return relative.split('/').some(part => excludedDirectories.has(part));
}

function dependencies(manifest) {
  const result = new Map();
  for (const name of Object.keys(manifest.dependencies ?? {})) result.set(packageName(name), false);
  for (const name of Object.keys(manifest.optionalDependencies ?? {})) result.set(packageName(name), true);
  for (const name of Object.keys(manifest.peerDependencies ?? {})) {
    if (!manifest.peerDependenciesMeta?.[name]?.optional && !result.has(name)) result.set(packageName(name), false);
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'));
}

function copyLicenses(stage, root, manifest, notices) {
  if (typeof manifest.version !== 'string' || !manifest.version || typeof manifest.name !== 'string') fail('INVALID_DEPENDENCY');
  const candidates = boundedDirectoryEntries(root, stage.limits.files).filter(name => /^(?:licen[cs]e|copying)(?:[._-].*)?$/i.test(name));
  if (candidates.length === 0) fail('LICENSE_MISSING');
  if (stage.entries.size + candidates.length > stage.limits.files) fail('PACKAGE_TOO_LARGE');
  let total = 0;
  const licenses = candidates.map(name => {
    const file = regularWithin(root, name);
    const stat = fs.lstatSync(file);
    if (stat.size === 0) fail('LICENSE_MISSING');
    if (!Number.isSafeInteger(stat.size) || stat.size > stage.limits.fileBytes) fail('PACKAGE_TOO_LARGE');
    total += stat.size;
    if (!Number.isSafeInteger(total) || total > stage.limits.bytes - stage.bytes) fail('PACKAGE_TOO_LARGE');
    return { name, file, stat };
  });
  const identityHash = createHash('sha256');
  const buffer = Buffer.alloc(1024 * 1024);
  for (const license of licenses) {
    identityHash.update(license.name).update(Buffer.from([0]));
    const descriptor = fs.openSync(license.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const stat = fs.fstatSync(descriptor);
      if (!stat.isFile() || stat.size !== license.stat.size || stat.dev !== license.stat.dev || stat.ino !== license.stat.ino) fail('PACKAGE_TOO_LARGE');
      let bytes = 0;
      let count;
      while ((count = fs.readSync(descriptor, buffer, 0, Math.min(buffer.length, stat.size - bytes + 1), null)) !== 0) {
        bytes += count;
        if (bytes > stat.size) fail('PACKAGE_TOO_LARGE');
        identityHash.update(buffer.subarray(0, count));
      }
      if (bytes !== stat.size || fs.fstatSync(descriptor).size !== stat.size) fail('PACKAGE_TOO_LARGE');
    } finally { fs.closeSync(descriptor); }
    identityHash.update(Buffer.from([0]));
  }
  const hash = identityHash.digest('hex');
  const identity = `${manifest.name}@${manifest.version}:${hash}`;
  if (!notices.has(identity)) {
    const prefix = `licenses/packages/${manifest.name}/${manifest.version}/${hash}`;
    for (const item of licenses) stage.copy(item.file, `${prefix}/${item.name}`);
    notices.set(identity, { name: manifest.name, version: manifest.version, sha256: hash });
  }
}

export function materializeProductionGraph(stage, source) {
  const sourceRoot = fs.realpathSync(source);
  const rootManifest = readJSON(regularWithin(sourceRoot, 'package.json'));
  const notices = new Map();
  const packages = [];
  let count = 0;
  function visit(root, destination, ancestors, depth) {
    if (depth > stage.limits.depth || ++count > stage.limits.packages) fail('GRAPH_TOO_LARGE');
    const manifest = readJSON(regularWithin(root, 'package.json'));
    packageName(manifest.name);
    copyLicenses(stage, root, manifest, notices);
    stage.copyTree(root, destination, excluded);
    packages.push({ name: manifest.name, version: manifest.version, path: destination });
    const lineage = [...ancestors, { name: manifest.name, root }];
    for (const [name, optional] of dependencies(manifest)) {
      const child = resolveInstalled(root, name, optional);
      if (!child || lineage.some(ancestor => ancestor.name === name && ancestor.root === child)) continue;
      visit(child, `${destination}/node_modules/${name}`, lineage, depth + 1);
    }
  }
  for (const [name, optional] of dependencies(rootManifest)) {
    const root = resolveInstalled(sourceRoot, name, optional);
    if (root) visit(root, `node_modules/${name}`, [], 1);
  }
  return { notices: [...notices.values()].sort((a, b) => `${a.name}@${a.version}:${a.sha256}`.localeCompare(`${b.name}@${b.version}:${b.sha256}`, 'en')), packages };
}
