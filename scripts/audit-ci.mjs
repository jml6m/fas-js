#!/usr/bin/env node
// Audit gate policy:
//   - HARD-FAIL only on critical/high advisories in PRODUCTION dependencies.
//   - Dev/build-tool advisories (and all moderate/low) are reported but never
//     block the build — they don't ship to consumers.
//   - If npm can't be spawned (missing/not executable), that's always a hard
//     failure — a broken environment must not pass as "no vulnerabilities".
//   - For offline/registry/unparseable output: fail when running in CI (the
//     gate must actually run there), but only warn locally.
//
// To address a production finding: run `npm audit --omit=dev` for detail, then
// update/bump the offending dependency. (Some repos prohibit `npm audit fix`
// because it rewrites the lockfile unpredictably — prefer targeted bumps.)
import { execFile } from 'node:child_process';

const isWin = process.platform === 'win32';
const inCI = !!process.env.CI;

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
  // A spawn-level failure surfaces a string err.code (ENOENT/EACCES/EPERM/...).
  // A normal non-zero exit (vulns found) surfaces a numeric code and still has output.
  if (err && typeof err.code === 'string') return { spawnError: err.code };
  try {
    return { data: JSON.parse(out || errOut) };
  } catch {
    return { unparseable: true };
  }
}

// `npm audit` couldn't run at all → always a hard failure.
function failIfSpawnError(res, label) {
  if (res.spawnError) {
    console.error(`✖ Could not run the audit gate (${label}): npm failed to start (${res.spawnError}).`);
    process.exit(1);
  }
}

// No usable output (offline / registry / malformed) → fail in CI, warn locally.
function bailOnNoData(res, label) {
  if (res.unparseable || res.data?.error) {
    const reason = `npm audit produced no usable output (${label}: offline, registry, or malformed data)`;
    if (inCI) {
      console.error(`✖ ${reason}. Failing because CI is set (the gate must run in CI).`);
      process.exit(1);
    }
    console.warn(`⚠ ${reason}. Skipping audit gate (local run).`);
    process.exit(0);
  }
}

// Full audit — reports every severity (dev + prod) for visibility.
const full = parse(await npmAudit([]));
failIfSpawnError(full, 'full');
bailOnNoData(full, 'full audit');
const all = full.data?.metadata?.vulnerabilities || {};
console.log(
  `All advisories — critical: ${all.critical || 0}, high: ${all.high || 0}, ` +
    `moderate: ${all.moderate || 0}, low: ${all.low || 0}.`
);

// Production-only audit — this is what gates the build.
const prod = parse(await npmAudit(['--omit=dev']));
failIfSpawnError(prod, 'production');
bailOnNoData(prod, 'production audit');
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
