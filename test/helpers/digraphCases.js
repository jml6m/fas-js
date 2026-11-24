/**
 * Machines whose generateDigraph() text is pinned byte for byte in test/fixtures/digraph/.
 * Each `args` is a createFSA argument list; `fixture` is the file name without its extension.
 */

// Every state moves to the next one on "0", and the last moves back to the first
const ring = (states) => states.map((from, i) => ({ from, to: states[(i + 1) % states.length], input: "0" }));

const KEYWORDS = ["node", "edge", "graph", "digraph", "subgraph", "strict", "Node", "EDGE"];
const QUOTED = ["q 1", "1a", 'a"b', "a\\b", "a\\", "a:b", "a-b", "<b>", '"', '\\"', " ", "1.2.3", "a.b", "-"];
const BARE = ["q0", "_x", "é", "状態", "🙂", "1", "-1.5", ".5", "7.", "Q_9", "ε"];

export const digraphCases = [
  {
    fixture: "colliding-names",
    about: "two pairs of states whose names joined together are both 'abc'",
    args: [
      ["a", "ab", "bc", "c"],
      ["x", "y"],
      [
        { from: "a", to: "bc", input: "x" },
        { from: "a", to: "a", input: "y" },
        { from: "ab", to: "c", input: "x" },
        { from: "ab", to: "ab", input: "y" },
        { from: "bc", to: "ab", input: "x" },
        { from: "bc", to: "bc", input: "y" },
        { from: "c", to: "c", input: "x" },
        { from: "c", to: "a", input: "y" },
      ],
      "a",
      ["c"],
    ],
  },
  {
    fixture: "keyword-names",
    about: "states named like DOT keywords, in any letter case",
    args: [KEYWORDS, ["0"], ring(KEYWORDS), "node", ["graph", "EDGE"]],
  },
  {
    fixture: "quoted-names",
    about: "names DOT cannot read bare: spaces, punctuation, quotes, backslashes",
    args: [QUOTED, ["0"], ring(QUOTED), "q 1", ['a"b', "a\\", " "]],
  },
  {
    fixture: "bare-names",
    about: "names DOT reads bare: identifiers, non-ASCII letters, numbers",
    args: [BARE, ["0"], ring(BARE), "q0", ["é", "-1.5"]],
  },
  {
    fixture: "comma-in-start-state-name",
    about: "a state name with a comma can only be an origin, so it is the start state here",
    args: [
      ["a,b", "z"],
      ["0"],
      [
        { from: "a,b", to: "z", input: "0" },
        { from: "z", to: "z", input: "0" },
      ],
      "a,b",
      ["z"],
    ],
  },
  {
    fixture: "start-marker",
    about: "states named like the start marker and like its first replacement",
    args: [["qi", "qi_", "b"], ["0"], ring(["qi", "qi_", "b"]), "qi", ["b"]],
  },
  {
    fixture: "symbols",
    about: 'symbols that need escaping in a label: ", \\, a comma, a literal ε next to an ε-transition',
    args: [
      ["p", "q", "r"],
      ['"', "\\", ",", "ε", "a,b", "up", "0"],
      [
        { from: "p", to: "q", input: '"' },
        { from: "p", to: "q", input: "\\" },
        { from: "p", to: "q", input: "," },
        { from: "p", to: "q", input: "ε" },
        { from: "p", to: "q", input: "" },
        { from: "p", to: "q", input: "a,b" },
        { from: "q", to: "r", input: "up" },
        { from: "q", to: "r,q", input: "0" },
        { from: "r", to: "p", input: "" },
        { from: "r", to: "r", input: "\\" },
        { from: "r", to: "r", input: "ε" },
      ],
      "p",
      ["r"],
    ],
  },
  {
    fixture: "unreachable-states",
    about: "states the start state cannot reach, one of them an accept state",
    args: [
      ["q1", "q2", "dead", "lost"],
      ["a", "b"],
      [
        { from: "q1", to: "q2", input: "a" },
        { from: "q1", to: "q1", input: "b" },
        { from: "q2", to: "q1", input: "a" },
        { from: "q2", to: "q2", input: "b" },
        { from: "dead", to: "q1", input: "a" },
        { from: "dead", to: "dead", input: "b" },
        { from: "lost", to: "dead", input: "a" },
        { from: "lost", to: "lost", input: "b" },
      ],
      "q1",
      ["q2", "dead"],
    ],
  },
  {
    fixture: "no-edges",
    about: "an NFA whose start state has no transition out",
    args: [["s", "t"], ["a"], [{ from: "t", to: "t,s", input: "a" }], "s", ["s"]],
  },
];
