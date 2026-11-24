/**
 * Reads the DOT text generateDigraph() returns back into a machine definition, using Graphviz
 * itself as the parser. Tests use it to check that the text is valid DOT and describes exactly
 * the machine it was generated from.
 */

// In a quoted name or a label, a backslash is written twice
const unescape = (text) => text.replace(/\\\\/g, "\\");

/** The symbols of an edge label: comma separated, with `\` before a literal comma, backslash or ε. */
export function readLabel(label) {
  const text = unescape(label);
  const symbols = [];
  let symbol = "";
  let escaped = false;
  const end = () => {
    symbols.push(symbol === "ε" && !escaped ? "" : symbol);
    symbol = "";
    escaped = false;
  };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      symbol += text[++i];
      escaped = true;
    } else if (text[i] === ",") {
      end();
    } else {
      symbol += text[i];
    }
  }
  end();
  return symbols;
}

/**
 * @param graphviz a loaded Graphviz from @hpcc-js/wasm-graphviz
 * @returns {{ states: string[], start: string, accepts: string[], transitions: { from: string, to: string, input: string }[] }}
 * Throws when Graphviz rejects the text.
 */
export function readDot(graphviz, dot) {
  const graph = JSON.parse(graphviz.dot(dot, "json"));
  const nodes = graph.objects ?? [];
  const edges = graph.edges ?? [];
  const name = (index) => unescape(nodes[index].name);

  const markers = nodes.filter((node) => node.shape === "point");
  if (markers.length !== 1) throw new Error(`expected one start marker, found ${markers.length}`);
  const marker = markers[0]._gvid;

  const fromMarker = edges.filter((edge) => edge.tail === marker);
  if (fromMarker.length !== 1) throw new Error(`expected one edge from the start marker, found ${fromMarker.length}`);

  const transitions = [];
  for (const edge of edges) {
    if (edge.tail === marker) continue;
    for (const input of readLabel(edge.label)) {
      transitions.push({ from: name(edge.tail), to: name(edge.head), input });
    }
  }

  return {
    states: nodes.filter((node) => node._gvid !== marker).map((node) => unescape(node.name)),
    start: name(fromMarker[0].head),
    accepts: nodes.filter((node) => node.shape === "doublecircle").map((node) => unescape(node.name)),
    transitions,
  };
}
