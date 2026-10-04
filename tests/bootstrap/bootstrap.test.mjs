import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bootstrap, commandFor, HOST_COMMIT, prepareHost, readProvenance, verifyFiles } from '../../scripts/bootstrap/index.mjs';

function fixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'tabularis-x1-c 테스트 '));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const source = path.join(parent, 'cosmos checkout');
  fs.mkdirSync(source);
  const files = ['package.json', 'packages/plugin-api/src/index.ts', 'packages/service-contracts/schema/v1/request.json'].map((name, i) => {
    const bytes = Buffer.from(`synthetic-${i}`);
    const target = path.join(source, 'build-support/host', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    return { path: name, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), mode: '100644' };
  });
  const provenance = { version: 1, host_commit: HOST_COMMIT, files };
  fs.writeFileSync(path.join(source, 'build-support/provenance.json'), JSON.stringify(provenance));
  return { parent, source, provenance, host: path.join(parent, 'tabularis-host'), lock: path.join(parent, '.tabularis-host-bootstrap.lock') };
}
function observe(action) { try { return { value: action() }; } catch (error) { return { code: error.code }; } }
function publishFailure(f) {
  const result = observe(() => prepareHost({ ...f, beforePublish: () => { throw new Error('synthetic-copy-failure'); } }));
  return { result, entries: fs.readdirSync(f.parent), lock: fs.existsSync(f.lock) };
}
function publicationRace(f) {
  const result = observe(() => prepareHost({ ...f, beforePublish: (_, destination) => fs.mkdirSync(destination) }));
  return { result, host: fs.readdirSync(f.host), lock: fs.existsSync(f.lock) };
}

test('고정 호스트 snapshot의 모든 바이트는 출처 원장의 SHA와 일치한다', () => {
  // given
  const source = fileURLToPath(new URL('../../', import.meta.url));
  const provenance = readProvenance(source);
  // when
  const actual = observe(() => verifyFiles(path.join(source, 'build-support/host'), provenance.files));
  // then
  assert.equal(actual.code, undefined);
  assert.equal(provenance.host_commit, HOST_COMMIT);
  assert.equal(provenance.files.length, 128);
  assert.equal(provenance.files.reduce((sum, file) => sum + file.size, 0), 1225818);
  assert.equal(provenance.upstream_base_sha, 'b78a40946f072f6b8f2f1a4c80c1e04ff9b54cd4');
});
test('sibling이 없으면 한글과 공백 경로에 고정 snapshot을 생성한다', t => {
  // given
  const f = fixture(t);
  // when
  const actual = prepareHost(f);
  // then
  assert.deepEqual(actual, { host: f.host, created: true });
  assert.equal(fs.readFileSync(path.join(f.host, f.provenance.files[1].path), 'utf8'), 'synthetic-1');
  assert.equal(fs.existsSync(f.lock), false);
  assert.deepEqual(fs.readdirSync(f.parent).sort(), ['cosmos checkout', 'tabularis-host']);
});
test('동일한 SDK와 계약 source가 있는 sibling은 덮어쓰지 않고 재사용한다', t => {
  // given
  const f = fixture(t);
  prepareHost(f);
  fs.writeFileSync(path.join(f.host, 'package.json'), 'existing-root-preserved');
  // when
  const actual = prepareHost(f);
  // then
  assert.equal(actual.created, false);
  assert.equal(fs.readFileSync(path.join(f.host, 'package.json'), 'utf8'), 'existing-root-preserved');
});
test('기존 sibling의 source가 다르면 설치를 시작하지 않고 원본을 보존한다', t => {
  // given
  const f = fixture(t);
  prepareHost(f);
  const file = path.join(f.host, f.provenance.files[1].path);
  fs.writeFileSync(file, 'mismatch-preserved');
  const calls = [];
  // when
  const actual = observe(() => bootstrap({ source: f.source, nodeVersion: '24.21.0', run: args => { calls.push(args); return '10.30.3'; }, env: {} }));
  // then
  assert.equal(actual.code, 'SOURCE_MISMATCH');
  assert.deepEqual(calls, [['--version']]);
  assert.equal(fs.readFileSync(file, 'utf8'), 'mismatch-preserved');
  assert.equal(fs.existsSync(f.lock), false);
});
test('다른 실행의 lock은 탈취하거나 삭제하지 않는다', t => {
  // given
  const f = fixture(t);
  fs.writeFileSync(f.lock, 'foreign-lock');
  // when
  const actual = observe(() => prepareHost(f));
  // then
  assert.equal(actual.code, 'BOOTSTRAP_LOCKED');
  assert.equal(fs.readFileSync(f.lock, 'utf8'), 'foreign-lock');
  assert.equal(fs.existsSync(f.host), false);
});
test('부분 생성 실패는 자신이 만든 임시 디렉터리와 lock만 정리한다', t => {
  // given
  const f = fixture(t);
  fs.mkdirSync(path.join(f.parent, 'unrelated'));
  // when
  const actual = publishFailure(f);
  // then
  assert.equal(actual.lock, false);
  assert.deepEqual(actual.entries.sort(), ['cosmos checkout', 'unrelated']);
  assert.equal(actual.result.value, undefined);
});
test('발행 직전에 나타난 빈 sibling도 덮어쓰지 않는다', t => {
  // given
  const f = fixture(t);
  // when
  const actual = publicationRace(f);
  // then
  assert.equal(actual.result.code, 'DESTINATION_EXISTS');
  assert.deepEqual(actual.host, []);
  assert.equal(actual.lock, false);
});
test('bootstrap은 계약과 SDK를 먼저 빌드한 뒤 각 frozen install과 Cosmos 빌드를 실행한다', t => {
  // given
  const f = fixture(t);
  const calls = [];
  // when
  const actual = bootstrap({ source: f.source, nodeVersion: '24.21.0', run: (args, cwd) => { calls.push({ args, cwd }); return '10.30.3'; }, env: {} });
  // then
  assert.equal(actual.created, true);
  assert.equal(calls.length, 8);
  assert.deepEqual(calls[1].args, ['--filter', '@tabularis/service-contracts', '--filter', '@tabularis/plugin-api', 'install', '--frozen-lockfile', '--ignore-scripts']);
  assert.deepEqual(calls[2].args, ['--filter', '@tabularis/service-contracts', 'build']);
  assert.deepEqual(calls[3].args, ['--filter', '@tabularis/plugin-api', 'build']);
  assert.ok(calls.slice(1, 4).every(call => call.cwd === f.host));
  assert.ok(calls.slice(4).every(call => call.cwd === f.source));
  assert.deepEqual(calls[5].args, ['--dir', 'ui', 'install', '--frozen-lockfile', '--ignore-scripts']);
  assert.deepEqual(calls[7].args, ['--dir', 'ui', 'build']);
});
for (const [nodeVersion, pnpmVersion, code] of [['24.11.0', '10.30.3', 'NODE_VERSION_MISMATCH'], ['24.21.0', '10.0.0', 'PNPM_VERSION_MISMATCH']]) {
  test(`${code}이면 sibling 생성 전에 거부한다`, t => {
    // given
    const f = fixture(t);
    // when
    const actual = observe(() => bootstrap({ source: f.source, nodeVersion, run: () => pnpmVersion, env: {} }));
    // then
    assert.equal(actual.code, code);
    assert.equal(fs.existsSync(f.host), false);
  });
}
test('Windows pnpm 실행은 고정 cmd 명령을 쓰며 사용자 경로를 명령 문자열에 넣지 않는다', () => {
  // given
  const args = ['--filter', '@tabularis/plugin-api', 'build'];
  // when
  const actual = commandFor(args, 'win32', 'C:\\Windows');
  // then
  assert.equal(actual.executable, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(actual.args, ['/d', '/s', '/c', 'pnpm --filter @tabularis/plugin-api build']);
});
test('pnpm 인자에 셸 제어 문자가 있으면 거부한다', () => {
  // given
  const args = ['build&echo'];
  // when
  const actual = observe(() => commandFor(args, 'win32', 'C:\\Windows'));
  // then
  assert.equal(actual.code, 'INVALID_COMMAND');
});
