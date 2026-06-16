/**
 * Emit a stderr warning so CI/coverage consumers do not treat c8 metrics as Σ* verification.
 */
export function emitTheoremCoverageCaveat(scope) {
  process.stderr.write(
    `[fas-js @coverage-caveat] ${scope}: c8 metrics on THEOREM-IMPLEMENTED / DEFINITIONAL ` +
      "code reflect fixture/contract instances only — not full Σ* verification.\n"
  );
}