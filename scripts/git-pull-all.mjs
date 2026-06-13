#!/usr/bin/env node
// "Full" pull: fetch every remote (pruning stale remote branches and tags), then
// fast-forward the current branch. Uses --ff-only so it never silently creates a
// merge commit or clobbers local work.
import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { stdio: 'inherit' });
const gitOut = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const branch = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch === 'HEAD') {
  console.error('✖ Detached HEAD — check out a branch before pulling.');
  process.exit(1);
}

console.log('▶ Fetching all remotes (prune branches + tags)...');
try {
  git(['fetch', '--all', '--prune', '--prune-tags', '--tags']);
} catch {
  console.error('✖ git fetch failed — see git output above (missing git, auth, or a bad remote).');
  process.exit(1);
}

console.log(`▶ Fast-forwarding ${branch}...`);
try {
  git(['pull', '--ff-only']);
} catch {
  // git already printed the specific reason (no upstream, diverged, etc.) above.
  console.error(`✖ Could not fast-forward ${branch} — see git's message above (e.g. no upstream configured, or the branch has diverged). Resolve manually.`);
  process.exit(1);
}

console.log('✓ Up to date.');
