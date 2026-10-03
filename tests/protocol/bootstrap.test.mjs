import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

function runDriver(frames) {
  return new Promise((resolve, reject) => {
    const driver = fileURLToPath(new URL("../../dist/index.js", import.meta.url));
    const child = execFile(process.execPath, [driver], { timeout: 5000, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR } }, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
    child.stdin.end(frames);
  });
}

test("한글 RPC 프레임은 성공을 가장하지 않고 독립 오류로 응답한다", async () => {
  // given
  const frames = JSON.stringify({ jsonrpc: "2.0", id: "한글", method: "initialize", params: {} }) + "\n" + JSON.stringify({ jsonrpc: "2.0", id: 2, method: "unsupported" }) + "\n";

  // when
  const actual = await runDriver(frames);

  // then
  assert.equal(actual.stderr, "");
  assert.equal(actual.stdout.trim().split("\n").length, 2);
  assert.equal(JSON.parse(actual.stdout.split("\n")[0]).id, "한글");
  assert.equal(JSON.parse(actual.stdout.split("\n")[0]).error.data.code, "CAPABILITY_UNAVAILABLE");
  assert.equal(JSON.parse(actual.stdout.split("\n")[1]).error.data.code, "UNSUPPORTED_OPERATION");
});

test("잘못된 JSON은 입력 원문을 노출하지 않고 parse 오류로 응답한다", async () => {
  // given
  const frames = '{"canary":"bootstrap-redaction-canary"\n';

  // when
  const actual = await runDriver(frames);

  // then
  assert.equal(JSON.parse(actual.stdout).error.code, -32700);
  assert.equal(actual.stdout.includes("bootstrap-redaction-canary"), false);
  assert.equal(actual.stderr, "");
});
