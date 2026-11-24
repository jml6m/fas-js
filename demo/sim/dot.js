/**
 * Reading a machine back from the DOT text generateDigraph() returns. Graphviz does the parsing:
 * this module works on the JSON it produces for the text (graphviz.dot(text, "json")).
 *
 * In that text a backslash in a name or a label is written twice. In a label the symbols are
 * separated by commas, a comma or backslash inside a symbol has a backslash before it, ε alone
 * is the empty string, and `\ε` is the symbol "ε".
 */
import { Problem } from "./machine.js";

const unescape = (text) => text.replace(/\\\\/g, "\\");

/** The symbols of one edge label. */
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
    if (text[i] === "\\" && i + 1 < text.length) {
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
 * The drawing's nodes and edges by name, with the ids Graphviz gives their elements in the SVG
 * it draws from the same text: "node{n}" counts nodes and "edge{n}" counts edges, both from 1,
 * in the order the JSON lists them.
 */
export function readGraph(graph) {
  const objects = graph.objects ?? [];
  const points = objects.filter((node) => node.shape === "point");
  const marker = points.length === 1 ? points[0]._gvid : null;
  const nodes = objects.filter((node) => node._gvid !== marker).map((node) => ({ name: unescape(node.name), id: `node${node._gvid + 1}`, accept: node.shape === "doublecircle" }));
  const edges = (graph.edges ?? []).map((edge, index) => ({
    from: edge.tail === marker ? null : unescape(objects[edge.tail].name),
    to: unescape(objects[edge.head].name),
    label: edge.label ?? "",
    id: `edge${index + 1}`,
  }));
  return { nodes, edges, markers: points.length };
}

/**
 * A definition for createFSA from the drawing, or a Problem saying why it cannot be rebuilt
 * without guessing. Only what the drawing shows is used: the states it draws and the symbols
 * on its edges.
 */
export function definitionFromGraph(graph) {
  const { nodes, edges, markers } = readGraph(graph);
  if (markers !== 1) {
    throw new Problem("This drawing has no single start marker, so its start state is not known. A start marker is a node drawn as a point with one arrow to the start state.");
  }
  const fromMarker = edges.filter((edge) => edge.from === null);
  if (fromMarker.length !== 1) {
    throw new Problem("The start marker must have exactly one arrow, to the start state.");
  }

  const single = [];
  for (const edge of edges) {
    if (edge.from === null) continue;
    if (edge.label === "") throw new Problem(`The arrow from "${edge.from}" to "${edge.to}" has no label, so the symbols it reads are not known.`);
    for (const input of readLabel(edge.label)) single.push({ from: edge.from, to: edge.to, input });
  }

  // createFSA reads a comma in "to" as a list of states, so a state with a comma in its name
  // cannot be a destination
  const withComma = single.find((edge) => edge.to.includes(","));
  if (withComma) {
    throw new Problem(`The state "${withComma.to}" has a comma in its name and an arrow leads to it. A comma separates the next states of a transition, so this machine cannot be rebuilt from the drawing.`);
  }

  const states = nodes.map((node) => node.name);
  const start = fromMarker[0].to;
  const alphabet = [...new Set(single.map((edge) => edge.input).filter((input) => input !== ""))].sort();

  // One destination for every state and symbol, and no ε, is a DFA. Anything else is an NFA.
  const byOriginAndInput = new Map();
  for (const edge of single) {
    const key = JSON.stringify([edge.from, edge.input]);
    byOriginAndInput.set(key, [...(byOriginAndInput.get(key) ?? []), edge.to]);
  }
  const deterministic =
    single.length > 0 &&
    single.every((edge) => edge.input !== "") &&
    [...byOriginAndInput.values()].every((dests) => dests.length === 1) &&
    byOriginAndInput.size === states.length * alphabet.length;

  let transitions;
  if (deterministic) {
    transitions = single;
  } else {
    transitions = [...byOriginAndInput].map(([key, dests]) => {
      const [from, input] = JSON.parse(key);
      return { from, to: dests.join(","), input };
    });
    // A drawing that leaves a state without a transition for some symbol can only be an NFA.
    // createFSA makes an NFA when a transition shows it, so when none does, an ε-transition
    // from the start state to itself says so without changing what the machine accepts.
    if (!transitions.some((t) => t.input === "" || t.to.includes(","))) {
      transitions.push({ from: start, to: start, input: "" });
    }
  }

  return {
    states,
    alphabet,
    transitions,
    start,
    accepts: nodes.filter((node) => node.accept).map((node) => node.name),
  };
}
