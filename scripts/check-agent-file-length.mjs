#!/usr/bin/env node
/**
 * Caps the character count of agent-instruction files that get auto-loaded
 * into an LLM's context every session.
 *
 * A markdownlint custom rule was tried first (per repo convention of
 * preferring lint over ad-hoc scripts) but markdownlint-cli2 cascades
 * every `.markdownlint-cli2.yaml` found in the directory tree regardless of
 * an explicit --config, so a second, isolated config for just these files
 * isn't achievable without either (a) removing AGENTS.md/CLAUDE.md from the
 * main config's `ignores` — reversing the deliberate "formatting is exempt,
 * only length matters" policy for these files — or (b) polluting the files
 * themselves with inline `markdownlint-configure-file` directives, which
 * fights the "keep it minimal" goal this check exists to enforce. A plain
 * script sidesteps both.
 *
 * Why 9,000: Grok scans AGENTS.md/CLAUDE.md and truncates at 10,000 chars
 * with no warning past that point, so 9,000 leaves headroom. Independent of
 * any hard cap, community guidance for Claude/Copilot converges on the same
 * order of magnitude (AGENTS.md under ~150 lines, CLAUDE.md under ~100)
 * because bloated instruction files degrade adherence to the instructions
 * that DO matter, not just the ones past some cutoff.
 *
 * Scope: only files actually auto-loaded whole into context every session
 * (root or nested AGENTS.md/CLAUDE.md/.cursorrules/GEMINI.md). Linked
 * reference docs (e.g. docs/agent-rules/*.md) are read on demand, not
 * force-loaded, so they're intentionally not covered here.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MAX_CHARS = 9000;
const AGENT_FILENAMES = new Set(['AGENTS.md', 'CLAUDE.md', '.cursorrules', 'GEMINI.md']);
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

// fs.readdirSync's recursive option (Node 20.1+, no external glob dependency
// needed) rather than fs.globSync, which requires Node 22+ and would break
// this repo's Node 20 CI floor.
function findAgentFiles() {
  const entries = readdirSync('.', { recursive: true, withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (!entry.isFile() || !AGENT_FILENAMES.has(entry.name)) continue;
    const relDir = entry.parentPath ?? entry.path ?? '.';
    if (relDir.split(path.sep).some((part) => EXCLUDED_DIRS.has(part))) continue;
    found.push(path.join(relDir, entry.name));
  }
  return found;
}

function main() {
  const files = findAgentFiles();
  let failed = false;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const charCount = content.length;
    if (charCount > MAX_CHARS) {
      failed = true;
      console.error(
        `✖ ${file}: ${charCount} characters, over the ${MAX_CHARS}-character cap.`
      );
      console.error(
        `  Move detail into linked docs/agent-rules/*.md (read on demand, not force-loaded every session) and keep this file dense.`
      );
    } else {
      console.log(`✓ ${path.relative(process.cwd(), file)}: ${charCount} / ${MAX_CHARS} characters`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();
