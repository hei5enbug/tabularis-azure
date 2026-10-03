import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { extractPinnedRuntime } from '../../scripts/package/runtime.mjs';
import { NODE_PINS } from '../../scripts/package/pins.mjs';
import { NODE_CACHE } from './fixtures.mjs';

if (process.platform === 'darwin') {
  for (const [platform, arch] of [['linux', 'arm64'], ['linux', 'x64'], ['win32', 'x64']]) {
    test(`${platform} ${arch} 고정 archive에서 Node와 원문 라이선스만 추출한다`, () => {
      // given
      const filePlatform = platform === 'win32' ? 'win' : platform;
      const archive = path.join(NODE_CACHE, `node-v24.21.0-${filePlatform}-${arch}.${platform === 'win32' ? 'zip' : 'tar.gz'}`);
      // when
      const result = extractPinnedRuntime({ platform, arch, archive });
      // then
      assert.equal(result.archive_sha256, NODE_PINS[`${platform}-${arch}`]);
      assert.equal(result.runtime_path, platform === 'win32' ? 'runtime/node.exe' : 'runtime/bin/node');
      assert.ok(result.node.length > 1000000);
      assert.ok(result.license.toString('utf8').includes('Node'));
      assert.equal(result.node.subarray(0, platform === 'win32' ? 2 : 4).toString('hex'), platform === 'win32' ? '4d5a' : '7f454c46');
      assert.deepEqual(Object.keys(result).sort(), ['archive_sha256', 'license', 'node', 'runtime_path']);
    });
  }
}
