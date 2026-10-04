import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readProvenance, verifyFiles } from '../../scripts/bootstrap/index.mjs';

const source = fileURLToPath(new URL('../../', import.meta.url));
function checkoutFixture(root, provenance) {
  const env = {
    PATH: process.env.PATH,
    HOME: root, USERPROFILE: root, APPDATA: root, LOCALAPPDATA: root, TMPDIR: root, TEMP: root, TMP: root,
    GIT_CONFIG_NOSYSTEM: '1', GIT_ATTR_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(root, 'empty-gitconfig'),
    ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}),
  };
  fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '');
  const hooks = path.join(root, 'empty-hooks');
  fs.mkdirSync(hooks);
  const run = args => {
    const result = spawnSync('git', ['-c', 'core.autocrlf=true', '-c', `core.hooksPath=${hooks}`, ...args], { cwd: root, env, shell: false, encoding: 'utf8', timeout: 30_000 });
    if (result.error || result.status !== 0) throw new Error('FIXTURE_GIT_FAILED');
  };
  run(['init', '--quiet', '--initial-branch=main']);
  run(['add', '.gitattributes', 'build-support/host']);
  run(['-c', 'user.name=checkout-fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture']);
  fs.rmSync(path.join(root, 'build-support/host'), { recursive: true });
  run(['checkout', 'HEAD', '--', 'build-support/host']);
  verifyFiles(path.join(root, 'build-support/host'), provenance.files);
  return { checked: provenance.files.length, attribute: fs.readFileSync(path.join(root, '.gitattributes'), 'utf8') };
}

test('autocrlf가 켜진 실제 Git checkout도 canonical snapshot의 128개 SHA를 보존한다', t => {
  // given
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tabularis-x1-c-checkout-bytes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const provenance = readProvenance(source);
  fs.copyFileSync(path.join(source, '.gitattributes'), path.join(root, '.gitattributes'));
  for (const record of provenance.files) {
    const target = path.join(root, 'build-support/host', record.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, 'build-support/host', record.path), target);
  }
  // when
  const actual = checkoutFixture(root, provenance);
  // then
  assert.equal(actual.checked, 128);
  assert.equal(actual.attribute.trim(), 'build-support/host/** -text');
});
