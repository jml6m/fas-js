#!/usr/bin/env node
// @ts-check
/**
 * fas-js theorem-annotation guard.
 *
 * Enforces docs/function-annotation-protocol.md so that a non-exhaustive test
 * can NEVER be used to falsely confirm that a core function is fully proven.
 *
 * Rules enforced (see docs/function-annotation-protocol.md):
 *   R1. Every `@fas-correctness THEOREM-IMPLEMENTED` function in src/ must be
 *       accompanied by a `@coverage-caveat` comment (c8 100% != mathematically enclosed function).
 *   R2. Every `@fas-correctness DEFINITIONAL | THEOREM-IMPLEMENTED` label in
 *       src/ must have at least one paired `@theorem-implemented-test` in test/.
 *   R3. Incorrect claims must not appear anywhere in src/ or test/, such as:
 *         - bounded `maxLength` enumeration claimed as fully closed proof
 *         - equivalence oracles living in src/ (languagesEquivalent-style)
 *         - naming a finite/spot check "proved", "proven", or "iff"
 *         - treating c8 / coverage % as proof of a theorem
 *
 * This guard is intentionally dependency-free (Node core only) so it can run
 * in any CI step before install completes if needed.
 *
 * Exit code 0 = clean, 1 = one or more violations (fail merge + release).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');
const TEST_DIR = join(ROOT, 'test');

const SRC_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const TEST_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

const LABEL_RE = /@fas-correctness\s+(DEFINITIONAL|THEOREM-IMPLEMENTED)/g;
const COVERAGE_CAVEAT_RE = /@coverage-caveat/;
const THEOREM_TEST_RE = /@theorem-implemented-test/;

/**
 * Forbidden over-claim patterns. Each entry pairs a human-readable reason with
 * a matcher. `appliesTo` limits where the pattern is illegal.
 * @type {{ reason: string, re: RegExp, appliesTo: "src" | "test" | "all" }[]}
 */
const FORBIDDEN_PATTERNS = [
  {
    reason: 'bounded enumeration (maxLength / Sigma^<=n) cannot be claimed as a theorem proof',
    re: /\bmax_?length\b[^\n]*\b(proof|proven|proved|theorem|verif)/i,
    appliesTo: 'all',
  },
  {
    reason: 'equivalence oracles (languagesEquivalent / dfaLanguagesEqual) must not live in src/',
    re: /\b(languagesEquivalent|languageEquivalence|equivalenceOracle)\b/i,
    appliesTo: 'src',
  },
  {
    reason: 'a finite or spot check must not be named "proved"/"proven"/"iff"',
    re: /\b(spot[\s-]?check|sample|fixture|instance|witness)[^\n]*\b(proved|proven|\biff\b)/i,
    appliesTo: 'all',
  },
  {
    reason: 'c8 / coverage percentage must not be described as proof of a theorem',
    re: /\b(c8|coverage)\b[^\n]*\b\d{1,3}\s*%[^\n]*\b(proof|proven|proved|theorem)\b/i,
    appliesTo: 'all',
  },
];

/** @param {string} dir @param {Set<string>} exts @returns {string[]} */
function walk(dir, exts) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'lib' || entry === 'coverage') continue;
      out.push(...walk(full, exts));
    } else if (exts.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const srcFiles = walk(SRC_DIR, SRC_EXTENSIONS);
const testFiles = walk(TEST_DIR, TEST_EXTENSIONS);

/** @type {{ file: string, rule: string, detail: string }[]} */
const violations = [];

// Aggregate test contents once for R2 / R3.
const testBlob = testFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const hasAnyTheoremTest = THEOREM_TEST_RE.test(testBlob);

let labeledFunctionCount = 0;

for (const file of srcFiles) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, 'utf8');

  // R1 + R2: inspect every @fas-correctness label.
  let match;
  LABEL_RE.lastIndex = 0;
  while ((match = LABEL_RE.exec(text)) !== null) {
    labeledFunctionCount += 1;
    const label = match[1];

    // R1: THEOREM-IMPLEMENTED requires a coverage caveat in the same file.
    if (label === 'THEOREM-IMPLEMENTED' && !COVERAGE_CAVEAT_RE.test(text)) {
      violations.push({
        file: rel,
        rule: 'R1',
        detail: 'THEOREM-IMPLEMENTED function is missing a @coverage-caveat comment (c8 100% != Sigma* proof).',
      });
    }

    // R2: any labeled boundary needs at least one paired theorem test.
    if (!hasAnyTheoremTest) {
      violations.push({
        file: rel,
        rule: 'R2',
        detail: `@fas-correctness ${label} present but no @theorem-implemented-test found in test/.`,
      });
    }
  }
}

// R3: forbidden over-claim patterns.
/** @param {string[]} files @param {"src" | "test"} scope */
function scanForbidden(files, scope) {
  for (const file of files) {
    const rel = relative(ROOT, file);
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.appliesTo !== 'all' && pattern.appliesTo !== scope) continue;
      if (pattern.re.test(text)) {
        violations.push({ file: rel, rule: 'R3', detail: pattern.reason });
      }
    }
  }
}
scanForbidden(srcFiles, 'src');
scanForbidden(testFiles, 'test');

// Report.
const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

if (violations.length === 0) {
  console.log(
    `${GREEN}[fas-js theorem-guard] OK${RESET} ${DIM}(${labeledFunctionCount} labeled boundary function(s) checked across ${srcFiles.length} src + ${testFiles.length} test files)${RESET}`
  );
  process.exit(0);
}

console.error(`${RED}[fas-js theorem-guard] FAILED${RESET} — ${violations.length} violation(s):\n`);
for (const v of violations) {
  console.error(`  ${RED}x${RESET} [${v.rule}] ${v.file}\n      ${v.detail}`);
}
console.error(`\n${DIM}See docs/function-annotation-protocol.md. A non-exhaustive test must never be labeled a theorem proof.${RESET}`);
process.exit(1);
