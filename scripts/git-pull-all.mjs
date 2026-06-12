#!/usr/bin/env node
// "Full" pull: fetch every remote (pruning stale remote branches and tags), then
// fast-forward the current branch. Uses --ff-only so it never silently creates a
// merge commit or clobbers local work — if the branch has diverged it stops and
// tells you to resolve manually.
import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { stdio: 'inherit' });
const gitOut = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const branch = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']);

console.log('▶ Fetching all remotes (prune branches + tags)...');
git(['fetch', '--all', '--prune', '--prune-tags', '--tags']);

console.log(`▶ Fast-forwarding ${branch}...`);
try {
  git(['pull', '--ff-only']);
} catch {
  console.error(`✖ ${branch} has diverged from its upstream; cannot fast-forward. Resolve manually (rebase/merge).`);
  process.exit(1);
}

console.log('✓ Up to date.');
