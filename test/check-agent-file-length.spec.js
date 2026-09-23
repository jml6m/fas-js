/**
 * Unit tests for scripts/check-agent-file-length.mjs (pure helpers only).
 * End-to-end "real repo files" coverage is the script's job when docs-lint runs it.
 */
import { assert } from 'chai';
import {
  LIMITS,
  FORBIDDEN_FILENAMES,
  POINTER,
  AGENT_FILENAMES,
  exceedsCap,
  hasPointer,
  findAgentFiles,
  findForbiddenFiles,
  checkFiles,
} from '../scripts/check-agent-file-length.mjs';

describe('check-agent-file-length', function () {
  describe('exceedsCap', function () {
    it('is false at and under the cap', function () {
      assert.isFalse(exceedsCap('x'.repeat(100), 100));
      assert.isFalse(exceedsCap('short', 100));
    });

    it('is true over the cap', function () {
      assert.isTrue(exceedsCap('x'.repeat(101), 100));
    });
  });

  describe('hasPointer', function () {
    it('accepts the bare pointer and a pointer followed by notes', function () {
      assert.isTrue(hasPointer(POINTER));
      assert.isTrue(hasPointer(`${POINTER}\n\nClaude-only note.\n`));
    });

    it('skips leading blank lines', function () {
      assert.isTrue(hasPointer(`\n  \n${POINTER}\n`));
    });

    it('rejects content that does not open with the pointer', function () {
      assert.isFalse(hasPointer('# Rules\n@AGENTS.md\n'));
      assert.isFalse(hasPointer(''));
    });
  });

  describe('findAgentFiles', function () {
    it('returns only root basenames that exist (no recursion)', function () {
      const exists = (p) => p.endsWith('AGENTS.md') || p.endsWith('CLAUDE.md');
      assert.deepEqual(findAgentFiles('/repo', { exists }), ['AGENTS.md', 'CLAUDE.md']);
    });

    it('returns empty when none exist', function () {
      assert.deepEqual(findAgentFiles('/repo', { exists: () => false }), []);
    });

    it('measures only AGENTS.md and CLAUDE.md', function () {
      assert.sameMembers([...AGENT_FILENAMES], ['AGENTS.md', 'CLAUDE.md']);
    });
  });

  describe('findForbiddenFiles', function () {
    it('reports .cursorrules and GEMINI.md when present', function () {
      assert.deepEqual(findForbiddenFiles('/repo', { exists: () => true }), [...FORBIDDEN_FILENAMES]);
      assert.sameMembers([...FORBIDDEN_FILENAMES], ['.cursorrules', 'GEMINI.md']);
    });

    it('returns empty when neither exists', function () {
      assert.deepEqual(findForbiddenFiles('/repo', { exists: () => false }), []);
    });
  });

  describe('checkFiles', function () {
    it('passes files under their caps, and a CLAUDE.md that is the pointer', function () {
      const files = { 'AGENTS.md': 'ok', 'CLAUDE.md': POINTER };
      const { ok, results } = checkFiles(Object.keys(files), { readFile: (f) => files[f] });
      assert.isTrue(ok);
      assert.deepEqual(
        results.map((r) => [r.file, r.chars, r.max, r.ok]),
        [
          ['AGENTS.md', 2, LIMITS['AGENTS.md'], true],
          ['CLAUDE.md', POINTER.length, LIMITS['CLAUDE.md'], true],
        ]
      );
    });

    it('fails AGENTS.md over its cap', function () {
      const { ok, results } = checkFiles(['AGENTS.md'], {
        readFile: () => 'x'.repeat(LIMITS['AGENTS.md'] + 1),
      });
      assert.isFalse(ok);
      assert.match(results[0].reason, /over the 9,000-character cap/);
    });

    it('holds CLAUDE.md to its own, tighter cap', function () {
      const { ok, results } = checkFiles(['CLAUDE.md'], {
        readFile: () => `${POINTER}\n${'x'.repeat(LIMITS['CLAUDE.md'])}`,
      });
      assert.isFalse(ok);
      assert.match(results[0].reason, /over the 1,500-character cap/);
    });

    it('fails a CLAUDE.md that does not open with the pointer', function () {
      const { ok, results } = checkFiles(['CLAUDE.md'], { readFile: () => '# Claude rules\n' });
      assert.isFalse(ok);
      assert.match(results[0].reason, /must open with `@AGENTS\.md`/);
    });

    it('resolves paths by basename', function () {
      const { results } = checkFiles(['/repo/CLAUDE.md'], { readFile: () => POINTER });
      assert.equal(results[0].max, LIMITS['CLAUDE.md']);
    });
  });
});
