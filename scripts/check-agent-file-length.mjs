#!/usr/bin/env node
/**
 * Caps the character count of agent-instruction files that get auto-loaded
 * into an LLM's context every session.
 *
 * Why 9,000: Grok truncates at 10,000 with no warning; 9,000 leaves headroom.
 * Scope: AGENTS.md / CLAUDE.md / .cursorrules / GEMINI.md only (force-loaded).
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_CHARS = 9000;
export const AGENT_FILENAMES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  "GEMINI.md",
]);
const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", "lib"]);

/** Pure: true when character count exceeds the cap. */
export function exceedsCap(content, max = MAX_CHARS) {
  return content.length > max;
}

/**
 * Walk the tree for agent-instruction basenames (Node 20+ recursive readdir).
 */
export function findAgentFiles(cwd = process.cwd(), deps = {}) {
  const readdir = deps.readdir ?? readdirSync;
  const entries = readdir(cwd, { recursive: true, withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (!entry.isFile() || !AGENT_FILENAMES.has(entry.name)) continue;
    const parent = entry.parentPath ?? entry.path ?? ".";
    const absDir = path.isAbsolute(parent) ? parent : path.resolve(cwd, parent);
    const relDir = path.relative(cwd, absDir) || ".";
    if (relDir.split(path.sep).some(part => part && EXCLUDED_DIRS.has(part))) continue;
    found.push(path.join(relDir, entry.name).replace(/\\/g, "/"));
  }
  return found;
}

/**
 * @returns {{ ok: boolean, results: Array<{ file: string, chars: number, ok: boolean }> }}
 */
export function checkFiles(files, deps = {}) {
  const read = deps.readFile ?? (f => readFileSync(f, "utf-8"));
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
  const { ok, results } = check(files);
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
