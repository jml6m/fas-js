#!/usr/bin/env node
/**
 * Caps the character count of agent-instruction files that get auto-loaded
 * into an LLM's context every session.
 *
 * Why 9,000: Grok truncates at 10,000 with no warning; 9,000 leaves headroom.
 * Scope: **root-only** AGENTS.md / CLAUDE.md / .cursorrules / GEMINI.md.
 * Nested copies are ignored — keep the check cheap and explicit.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_CHARS = 9000;
export const AGENT_FILENAMES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  "GEMINI.md",
];

/** Pure: true when character count exceeds the cap. */
export function exceedsCap(content, max = MAX_CHARS) {
  return content.length > max;
}

/**
 * Root-only agent-instruction basenames that exist under cwd.
 * @param {string} [cwd]
 * @param {{ exists?: (p: string) => boolean }} [deps]
 * @returns {string[]} basenames only
 */
export function findAgentFiles(cwd = process.cwd(), deps = {}) {
  const exists = deps.exists ?? existsSync;
  return AGENT_FILENAMES.filter(name => exists(path.join(cwd, name)));
}

/**
 * @param {string[]} files basenames or paths
 * @param {{ readFile?: (p: string) => string, cwd?: string }} [deps]
 * @returns {{ ok: boolean, results: Array<{ file: string, chars: number, ok: boolean }> }}
 */
export function checkFiles(files, deps = {}) {
  const cwd = deps.cwd ?? process.cwd();
  const read =
    deps.readFile ??
    (f => {
      const abs = path.isAbsolute(f) ? f : path.join(cwd, f);
      return readFileSync(abs, "utf-8");
    });
  const results = [];
  let ok = true;
  for (const file of files) {
    const content = read(file);
    const chars = content.length;
    const fileOk = !exceedsCap(content);
    if (!fileOk) ok = false;
    results.push({ file, chars, ok: fileOk });
  }
  return { ok, results };
}

export function runCheck({
  cwd = process.cwd(),
  log = msg => console.log(msg),
  error = msg => console.error(msg),
  exit = code => process.exit(code),
  find = findAgentFiles,
  check = checkFiles,
} = {}) {
  const files = find(cwd);
  const { ok, results } = check(files, { cwd });
  for (const r of results) {
    if (r.ok) {
      log(`✓ ${r.file}: ${r.chars} / ${MAX_CHARS} characters`);
    } else {
      error(`✖ ${r.file}: ${r.chars} characters, over the ${MAX_CHARS}-character cap.`);
      error(`  Move detail into linked docs and keep this file dense (cap is ${MAX_CHARS}).`);
    }
  }
  exit(ok ? 0 : 1);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runCheck();
}
