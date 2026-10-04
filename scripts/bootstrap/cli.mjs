import { bootstrap } from './index.mjs';

if (process.argv.length !== 2) {
  process.stderr.write('INVALID_ARGUMENT\n');
  process.exitCode = 2;
} else {
  try { process.stdout.write(`${JSON.stringify(bootstrap())}\n`); }
  catch (error) { process.stderr.write(`${['NODE_VERSION_MISMATCH', 'PNPM_VERSION_MISMATCH', 'SOURCE_MISMATCH', 'INVALID_SNAPSHOT', 'BOOTSTRAP_LOCKED', 'DESTINATION_EXISTS', 'COMMAND_FAILED', 'INVALID_TOOLCHAIN'].includes(error.code) ? error.code : 'BOOTSTRAP_FAILED'}\n`); process.exitCode = 1; }
}
