import { type State, type Transition } from "../components";

/*
 * DOT text for an automaton: the states that can be reached from the start state, a point that
 * marks the start state, and one edge for each pair of states, labelled with the symbols that
 * take it.
 *
 * A state name is written bare where DOT allows it and quoted otherwise. In a quoted name or a
 * label, `"` is written `\"` and `\` is written `\\`. In a label the symbols are sorted and
 * separated by commas: a comma or a backslash inside a symbol has a backslash before it, the
 * empty string is shown as ε, and a symbol that is itself "ε" is written `\ε`.
 */

// DOT reads these as keywords in any letter case, so a state with one of these names is quoted
const KEYWORDS = new Set(["node", "edge", "graph", "digraph", "subgraph", "strict"]);

// The two unquoted forms DOT accepts. Non-ASCII characters are allowed in the first.
const IDENTIFIER = /^[A-Za-z_\u0080-\u{10FFFF}][\w\u0080-\u{10FFFF}]*$/u;
const NUMERAL = /^-?(\.[0-9]+|[0-9]+(\.[0-9]*)?)$/;

const EPSILON = "ε";
const START_MARKER = "qi";
const INDENT = " ".repeat(10);

const quote = (text: string): string => `"${text.replace(/[\\"]/g, "\\$&")}"`;

// String(): JavaScript callers can pass names and symbols that are not strings, numbers for example
const id = (name: string): string => {
  const text = String(name);
  const bare = NUMERAL.test(text) || (IDENTIFIER.test(text) && !KEYWORDS.has(text.toLowerCase()));
  return bare ? text : quote(text);
};

const symbolText = (symbol: string): string => {
  const text = String(symbol);
  if (text === "") return EPSILON;
  if (text === EPSILON) return "\\" + EPSILON;
  return text.replace(/[\\,]/g, "\\$&");
};

// States reachable from the start state: depth first, following each state's destinations in
// the order the transition set first names them
const reachableStates = (tfunc: Set<Transition>, start: State): State[] => {
  const links: Map<State, Set<State>> = new Map();
  for (const tr of tfunc) {
    const dests = links.get(tr.origin);
    if (dests) dests.add(tr.dest);
    else links.set(tr.origin, new Set([tr.dest]));
  }
  const destinations = (state: State): Iterator<State> => (links.get(state) ?? new Set<State>()).values();

  // An explicit stack instead of recursion, so a long chain of states cannot overflow the call stack
  const order: State[] = [start];
  const seen: Set<State> = new Set(order);
  const pending: Iterator<State>[] = [destinations(start)];
  while (pending.length > 0) {
    const next = pending[pending.length - 1].next();
    if (next.done) {
      pending.pop();
    } else if (!seen.has(next.value)) {
      seen.add(next.value);
      order.push(next.value);
      pending.push(destinations(next.value));
    }
  }
  return order;
};

interface Edge {
  origin: State;
  dest: State;
  symbols: string[];
}

// One edge for each pair of reachable states, in the order the transition set first joins them
const mergeEdges = (tfunc: Set<Transition>, reachable: Set<State>): Edge[] => {
  const edges: Edge[] = [];
  const byPair: Map<State, Map<State, Edge>> = new Map();
  for (const tr of tfunc) {
    if (!reachable.has(tr.origin)) continue;

    let byDest = byPair.get(tr.origin);
    if (!byDest) {
      byDest = new Map();
      byPair.set(tr.origin, byDest);
    }
    let edge = byDest.get(tr.dest);
    if (!edge) {
      edge = { origin: tr.origin, dest: tr.dest, symbols: [] };
      byDest.set(tr.dest, edge);
      edges.push(edge);
    }
    edge.symbols.push(symbolText(tr.input));
  }
  return edges;
};

// The point that marks the start state needs a name no state has
const startMarker = (states: Set<State>): string => {
  const names: Set<string> = new Set();
  for (const state of states) names.add(state.name);

  let marker = START_MARKER;
  while (names.has(marker)) marker += "_";
  return marker;
};

// Reads the automaton and changes nothing in it
export const toDot = (states: Set<State>, tfunc: Set<Transition>, start: State, accepts: Set<State>): string => {
  const order = reachableStates(tfunc, start);
  const marker = startMarker(states);

  const nodeLines = order.map(state => (accepts.has(state) ? `${id(state.name)} [shape = doublecircle];` : id(state.name)));
  const edgeLines = mergeEdges(tfunc, new Set(order)).map(
    edge => `${id(edge.origin.name)} -> ${id(edge.dest.name)} [ label = ${quote(edge.symbols.sort().join(","))} ];`
  );

  return [
    "digraph fsa {",
    INDENT + nodeLines.join("\n\t"),
    INDENT + "rankdir=LR;",
    INDENT + `node [shape = point ]; ${marker};`,
    INDENT + "node [shape = circle];",
    INDENT + `${marker} -> ${id(start.name)};`,
    INDENT + edgeLines.join("\n\t"),
    "      }",
    "      ",
  ].join("\n");
};
