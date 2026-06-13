#!/usr/bin/env node
// Audit gate policy:
//   - HARD-FAIL only on critical/high advisories in PRODUCTION dependencies.
//   - Dev/build-tool advisories (and all moderate/low) are reported but never
//     block the build — they don't ship to consumers.
//   - A genuine offline/registry error is a warning (exit 0); a missing npm
//     binary (ENOENT) is a hard failure so a broken environment can't pass.
//
// To address a production finding: run `npm audit --omit=dev` for detail, then
// update/bump the offending dependency. (Some repos prohibit `npm audit fix`
// because it rewrites the lockfile unpredictably — prefer targeted bumps.)
import { execFile } from 'node:child_process';

const isWin = process.platform === 'win32';

function npmAudit(extraArgs) {
  return new Promise((resolve) => {
    // npm audit exits non-zero when vulns exist; capture stdout/stderr regardless.
    // shell:true on Windows so the npm.cmd shim spawns (Node blocks bare .cmd).
    execFile('npm', ['audit', '--json', ...extraArgs], { maxBuffer: 64 * 1024 * 1024, shell: isWin }, (err, stdout, stderr) => {
      resolve({ err, out: stdout || '', errOut: stderr || '' });
    });
  });
}

function parse({ err, out, errOut }) {
  if (err && err.code === 'ENOENT') return { enoent: true };
  try {
    return { data: JSON.parse(out || errOut) };
  } catch {
    return { unparseable: true };
  }
}

// Full audit — reports every severity (dev + prod) for visibility.
const full = parse(await npmAudit([]));
if (full.enoent) {
  console.error('✖ Could not run the audit gate: `npm` was not found on PATH.');
  process.exit(1);
}
if (full.unparseable || full.data?.error) {
  console.warn('⚠ npm audit produced no parseable output (offline or registry error). Skipping audit gate.');
  process.exit(0);
}
const all = full.data?.metadata?.vulnerabilities || {};
console.log(
  `All advisories — critical: ${all.critical || 0}, high: ${all.high || 0}, ` +
    `moderate: ${all.moderate || 0}, low: ${all.low || 0}.`
);

// Production-only audit — this is what gates the build.
const prod = parse(await npmAudit(['--omit=dev']));
if (prod.unparseable || prod.data?.error) {
  console.warn('⚠ Could not compute production-only advisories; skipping gate.');
  process.exit(0);
}
const pv = prod.data?.metadata?.vulnerabilities || {};
const critical = pv.critical || 0;
const high = pv.high || 0;
console.log(
  `Production dependencies — critical: ${critical}, high: ${high} ` +
    `(only these gate the build; dev-only advisories above are reported, not gated).`
);

if (critical + high > 0) {
  console.error(
    `✖ ${critical + high} critical/high advisory(ies) in production dependencies must be addressed. ` +
      'Run `npm audit --omit=dev` for detail, then update/bump the offending dependency.'
  );
  process.exit(1);
}

console.log('✓ No critical or high advisories in production dependencies.');
