#!/usr/bin/env node
// Audit gate with a deliberate policy: fail ONLY on critical/high advisories.
// Moderate and low are reported but never break the build. Registry/offline
// errors are a warning, not a failure, so the gate is safe in CI and offline.
//
// To address findings: `npm audit` for detail, then `npm audit fix` or bump the
// offending dependency.
import { execFile } from 'node:child_process';

const isWin = process.platform === 'win32';

function npmAuditJson() {
  return new Promise((resolve) => {
    // npm audit exits non-zero when vulns exist; capture stdout regardless.
    // shell:true on Windows so the npm.cmd shim spawns (Node blocks bare .cmd).
    execFile('npm', ['audit', '--json'], { maxBuffer: 64 * 1024 * 1024, shell: isWin }, (_err, stdout) => {
      resolve(stdout || '');
    });
  });
}

const raw = await npmAuditJson();
let data;
try {
  data = JSON.parse(raw);
} catch {
  console.warn('⚠ npm audit produced no parseable output (offline or registry error). Skipping audit gate.');
  process.exit(0);
}

if (data.error) {
  console.warn(`⚠ npm audit error (${data.error.code || 'unknown'}). Skipping audit gate.`);
  process.exit(0);
}

const v = data?.metadata?.vulnerabilities || {};
const critical = v.critical || 0;
const high = v.high || 0;
const moderate = v.moderate || 0;
const low = v.low || 0;

console.log(
  `Advisories — critical: ${critical}, high: ${high}, moderate: ${moderate}, low: ${low} ` +
    `(only critical/high gate the build).`
);

if (critical + high > 0) {
  console.error(
    `✖ ${critical + high} critical/high advisory(ies) must be addressed. ` +
      'Run `npm audit` for detail, then `npm audit fix` or update the offending dependency.'
  );
  process.exit(1);
}

console.log('✓ No critical or high advisories.');
