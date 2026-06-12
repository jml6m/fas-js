#!/usr/bin/env node
// Encoding gate: fails the build if any tracked text file uses a disallowed
// encoding. Catches the things that quietly corrupt a repo when a file is saved
// from the wrong editor/locale:
//   - non-UTF-8 byte sequences
//   - a leading byte-order mark (BOM)
//   - CRLF / lone-CR line endings (except Windows script types)
//   - stray control characters (NUL, etc.)
//
// Only inspects files git actually tracks (`git ls-files`). Binary types are
// skipped by extension. Wire this into `lint` so bad bytes never get committed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tif', 'tiff', 'avif',
  'pdf', 'zip', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'mp4', 'wav', 'ogg', 'webm', 'mov', 'avi', 'mkv', 'flac',
  'node', 'wasm', 'exe', 'dll', 'so', 'dylib', 'bin', 'o', 'a', 'lib',
  'class', 'jar', 'pyc', 'pdb', 'snap',
  'ppm', 'pgm', 'pbm', 'dds', 'glb', 'gltf', 'ktx',
]);

// Windows script types are conventionally CRLF (and sometimes BOM); allow it.
const CRLF_OK = new Set(['ps1', 'bat', 'cmd']);

// tab, LF, CR are legitimate; everything else < 0x20 is a stray control char.
const ALLOWED_CTRL = new Set([0x09, 0x0a, 0x0d]);

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
  return out.toString('utf8').split('\0').filter(Boolean);
}

function isValidUtf8(buf) {
  try {
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

const problems = [];
let scanned = 0;

for (const file of trackedFiles()) {
  const ext = (file.split('.').pop() || '').toLowerCase();
  if (BINARY_EXT.has(ext)) continue;

  let buf;
  try {
    buf = readFileSync(file);
  } catch {
    continue;
  }
  scanned++;
  if (buf.length === 0) continue;

  const allowCrlf = CRLF_OK.has(ext);
  const issues = [];

  if (!allowCrlf && buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    issues.push('UTF-8 BOM');
  }
  if (buf.length >= 2 && ((buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff))) {
    issues.push('UTF-16 BOM');
  }
  if (!isValidUtf8(buf)) issues.push('invalid UTF-8 byte sequence');

  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0x0d) {
      if (!allowCrlf) issues.push(buf[i + 1] === 0x0a ? 'CRLF line endings' : 'lone CR (0x0D)');
      continue;
    }
    if ((b < 0x20 && !ALLOWED_CTRL.has(b)) || b === 0x7f) {
      issues.push(`control char 0x${b.toString(16).padStart(2, '0')}`);
      break;
    }
  }

  if (issues.length) problems.push(`${file}: ${[...new Set(issues)].join(', ')}`);
}

if (problems.length) {
  console.error(`✖ Encoding check failed (${problems.length} file(s)):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nText files must be UTF-8 (no BOM), LF line endings, no stray control characters.');
  process.exit(1);
}

console.log(`✓ Encoding check passed (${scanned} text file(s) scanned).`);
