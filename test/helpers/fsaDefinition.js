/**
 * Test-only FSA definition normalization and comparison.
 */

function normalizeTransition(transition) {
  return {
    from: transition.from,
    to: transition.to
      .split(",")
      .map(part => part.trim())
      .sort()
      .join(","),
    input: transition.input,
  };
}

export function normalizeDefinition(definition) {
  return {
    states: [...definition.states].sort(),
    alphabet: [...definition.alphabet].sort(),
    start: definition.start,
    accepts: [...definition.accepts].sort(),
    transitions: definition.transitions
      .map(normalizeTransition)
      .sort((left, right) => {
        const byFrom = left.from.localeCompare(right.from);
        if (byFrom !== 0) return byFrom;
        const byInput = left.input.localeCompare(right.input);
        if (byInput !== 0) return byInput;
        return left.to.localeCompare(right.to);
      }),
  };
}

export function definitionsEqual(left, right) {
  const a = normalizeDefinition(left);
  const b = normalizeDefinition(right);
  return JSON.stringify(a) === JSON.stringify(b);
}