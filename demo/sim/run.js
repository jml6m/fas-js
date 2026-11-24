/**
 * Running a machine for the simulator. Every verdict and every set of states comes from the
 * library's simulateFSA and stepOnceFSA; this module only splits the typed input into symbols
 * and works out, from the definition, which edges lead from one set of states to the next.
 */
import { Problem, codeOf } from "./machine.js";

const quoted = (value) => `“${value}”`;
const codePoints = (text) => [...text].length;

/** True when every symbol of the alphabet is one Unicode code point. */
export const singleCodePointAlphabet = (alphabet) => alphabet.every((symbol) => codePoints(symbol) === 1);

/**
 * Splits typed input into symbols the way the library reads input: one code point per symbol,
 * or, when any symbol of the alphabet is longer than that, symbols separated by spaces.
 */
export function readInput(text, alphabet) {
  if (singleCodePointAlphabet(alphabet)) return [...text];
  return text.split(/\s+/).filter((symbol) => symbol !== "");
}

const asList = (states) => (Array.isArray(states) ? states : [states]);

// The edges that lead from `before` to `after` on `symbol`, and the ε-edges among `after`
function edgesTaken(machine, before, after, symbol) {
  const from = new Set(before);
  const into = new Set(after);
  return machine.edges.filter((edge) =>
    edge.input === "" ? into.has(edge.from) && into.has(edge.to) : edge.input === symbol && from.has(edge.from) && into.has(edge.to)
  );
}

/**
 * Runs `symbols` through the machine one step at a time.
 *
 * Returns { steps, accepted, problem }:
 * - steps[0] is the start: the start state for a DFA, the ε-closure of the start state for an NFA.
 * - each later step has the symbol read, the states before and after, and the edges taken.
 * - accepted is simulateFSA's verdict, or null when the input cannot be read.
 * - problem is a plain sentence when a symbol is not in the alphabet, with `at` set to its position.
 */
export function trace(fas, machine, symbols) {
  const { fsa, type, definition } = machine;
  const isNfa = type === "NFA";

  const start = isNfa ? fas.stepOnceFSA("", definition.start, fsa) : definition.start;
  const steps = [
    {
      symbol: null,
      before: [definition.start],
      after: asList(start),
      edges: isNfa ? edgesTaken(machine, [], asList(start), null) : [],
    },
  ];

  let current = start;
  for (let at = 0; at < symbols.length; at++) {
    const symbol = symbols[at];
    let next;
    try {
      next = fas.stepOnceFSA(symbol, current, fsa);
    } catch (error) {
      // The library rejects a symbol that is not in the alphabet; anything else is not the reader's doing
      const unknown = codeOf(error) === "E-009";
      const problem = unknown ? unknownSymbol(symbol, definition.alphabet) : "This step could not be taken. Load the machine again.";
      return { steps, accepted: null, problem, at };
    }
    steps.push({ symbol, before: asList(current), after: asList(next), edges: edgesTaken(machine, asList(current), asList(next), symbol) });
    current = next;
  }

  return { steps, accepted: fas.simulateFSA(symbols, fsa), problem: null, at: null };
}

function unknownSymbol(symbol, alphabet) {
  const known = alphabet.map(quoted).join(", ");
  const hint = singleCodePointAlphabet(alphabet) ? "" : " Separate symbols with spaces.";
  return `${quoted(symbol)} is not in this machine's alphabet (${known}).${hint}`;
}

/** The verdict in words. */
export function verdict(accepted, symbols) {
  const input = symbols.length === 0 ? "the empty input" : "this input";
  return accepted ? `Accepted: the machine ends in an accept state for ${input}.` : `Rejected: the machine does not end in an accept state for ${input}.`;
}

export { Problem };
