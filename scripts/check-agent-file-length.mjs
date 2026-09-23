#!/usr/bin/env node
/**
 * Caps the agent-instruction files that are auto-loaded into an LLM's context
 * every session, and enforces the CLAUDE.md thin-pointer convention.
 *
 * Why 9,000: some agents truncate at 10,000 characters with no warning, so this
 * leaves headroom. Independent of that hard cap, bloated instruction files
 * measurably degrade adherence to the rules that do matter.
 *
 * CLAUDE.md is a pointer, not a second rulebook: it must open with `@AGENTS.md`
 * and stays on a much tighter cap so repo-specific Claude notes are possible
 * without the file becoming a competing source of truth.
 *
 * `.cursorrules` / `GEMINI.md` are forbidden outright per the repo-hygiene
 * decision (AGENTS.md is the single source) -- their presence is a failure,
 * not something to measure.
 *
 * Scope: root-only. Nested copies are ignored -- keep the check cheap and explicit.
 * Counts characters, not bytes.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIMITS = { 'AGENTS.md': 9000, 'CLAUDE.md': 1500 };
export const FORBIDDEN_FILENAMES = ['.cursorrules', 'GEMINI.md'];
export const POINTER = '@AGENTS.md';
export const AGENT_FILENAMES = Object.keys(LIMITS);

/** Pure: true when character count exceeds the cap. */
export function exceedsCap(content, max) {
  return content.length > max;
}

/** Pure: CLAUDE.md must lead with the AGENTS.md import. */
export function hasPointer(content) {
  const firstLine = content.split('\n').find((l) => l.trim() !== '') ?? '';
  return firstLine.trim() === POINTER;
}

/**
 * Root-only agent-instruction basenames that exist under cwd.
 * @returns {string[]} basenames only
 */
export function findAgentFiles(cwd = process.cwd(), deps = {}) {
  const exists = deps.exists ?? existsSync;
  return AGENT_FILENAMES.filter((name) => exists(path.join(cwd, name)));
}

/** Root-only forbidden files that exist under cwd. */
export function findForbiddenFiles(cwd = process.cwd(), deps = {}) {
  const exists = deps.exists ?? existsSync;
  return FORBIDDEN_FILENAMES.filter((name) => exists(path.join(cwd, name)));
}

/**
 * @returns {{ ok: boolean, results: Array<{ file: string, chars: number, max: number, ok: boolean, reason?: string }> }}
 */
export function checkFiles(files, deps = {}) {
  const cwd = deps.cwd ?? process.cwd();
  const read = deps.readFile ?? ((f) => readFileSync(path.isAbsolute(f) ? f : path.join(cwd, f), 'utf8'));

  const results = [];
  let ok = true;
  for (const file of files) {
    const base = path.basename(file);
    const max = LIMITS[base] ?? LIMITS['AGENTS.md'];
    const content = read(file);
    const chars = content.length;
    let reason;
    if (exceedsCap(content, max)) {
      reason = `${chars.toLocaleString('en-US')} characters, over the ${max.toLocaleString('en-US')}-character cap`;
    } else if (base === 'CLAUDE.md' && !hasPointer(content)) {
      reason = `must open with \`${POINTER}\` -- AGENTS.md is the single source`;
    }
    if (reason) ok = false;
    results.push({ file, chars, max, ok: !reason, reason });
  }
  return { ok, results };
}

export function runCheck({ cwd = process.cwd(), find = findAgentFiles, findForbidden = findForbiddenFiles, check = checkFiles } = {}) {
  const forbidden = findForbidden(cwd);
  const { ok, results } = check(find(cwd), { cwd });

  const lines = results.map((r) =>
    r.ok ? `ok    ${r.file}: ${r.chars.toLocaleString('en-US')} / ${r.max.toLocaleString('en-US')} characters` : `FAIL  ${r.file}: ${r.reason}`
  );
  for (const f of forbidden) {
    lines.push(`FAIL  ${f}: forbidden -- AGENTS.md is the single agent-instruction source`);
  }
  // One write: a reader that closes the pipe early (`| head`) then cannot cause
  // an EPIPE on a second one.
  process.stdout.write(`${lines.join('\n')}\n`);

  if (!ok || forbidden.length > 0) {
    process.stderr.write('Over the cap: move detail into linked docs or the PR description, and keep these files dense.\n');
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) runCheck();
