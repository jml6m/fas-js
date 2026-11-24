/**
 * The simulator's drawing. Graphviz turns DOT text into SVG; this module puts that SVG on the
 * page in the page's own colours and finds its states and edges again, so that stepping can mark
 * them with CSS classes instead of drawing the graph anew.
 */
import { readGraph } from "./sim/dot.js";

// Graphviz sizes its drawing in points. The drawing may grow to fill its panel, up to this factor.
const PX_PER_POINT = 4 / 3;
const MAX_SCALE = 1.6;

// The drawing is built from names the reader typed, so only what a state diagram needs is kept
const SVG_ELEMENTS = new Set(["svg", "g", "title", "ellipse", "path", "polygon", "polyline", "text"]);
const SVG_ATTRIBUTES = new Set([
  "class",
  "cx",
  "cy",
  "d",
  "fill",
  "font-family",
  "font-size",
  "height",
  "id",
  "points",
  "rx",
  "ry",
  "stroke",
  "stroke-dasharray",
  "stroke-width",
  "text-anchor",
  "transform",
  "viewBox",
  "width",
  "x",
  "xml:space",
  "xmlns",
  "y",
]);

// A typeface Graphviz knows the letter widths of, so every label fits its state. The page's own
// typeface is put on the finished drawing by CSS. Nothing else in the text is changed.
const FONT_LINE = 'node [fontname="Helvetica"]; edge [fontname="Helvetica"];';
const OPENING = /^\s*(?:strict\s+)?(?:di)?graph\b[^{]*\{/i;

/** The DOT text with the font line after its opening brace. */
export const withFont = (dot) => dot.replace(OPENING, (opening) => `${opening}\n${FONT_LINE}`);

function keepDrawingParts(node) {
  for (const child of [...node.children]) {
    if (SVG_ELEMENTS.has(child.localName)) keepDrawingParts(child);
    else child.remove();
  }
  for (const attribute of [...node.attributes]) {
    if (!SVG_ATTRIBUTES.has(attribute.name) || /url\s*\(/i.test(attribute.value)) {
      node.removeAttribute(attribute.name);
    }
  }
}

function parseSvg(window, svgText, label) {
  const start = svgText.indexOf("<svg");
  if (start === -1) return null;
  const parsed = new window.DOMParser().parseFromString(svgText.slice(start), "image/svg+xml");
  const svg = parsed.documentElement;
  if (!svg || svg.localName !== "svg") return null;
  keepDrawingParts(svg);

  const box = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  if (box.length === 4 && box.every(Number.isFinite)) {
    svg.style.maxWidth = `${Math.round(box[2] * PX_PER_POINT * MAX_SCALE)}px`;
    svg.style.maxHeight = `${Math.round(box[3] * PX_PER_POINT * MAX_SCALE)}px`;
  }
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  return window.document.importNode(svg, true);
}

/**
 * Draws `dot` with a loaded Graphviz. Returns the SVG element, Graphviz's own reading of the
 * text (`graph`, for rebuilding a pasted machine), and the drawn states and edges by name.
 * Throws when Graphviz cannot read the text or returns no drawing.
 */
export function draw(graphviz, window, dot, label) {
  const text = withFont(dot);
  const graph = JSON.parse(graphviz.dot(text, "json"));
  const svg = parseSvg(window, graphviz.dot(text, "svg"), label);
  if (!svg) throw new Error("Graphviz returned no drawing");

  const { nodes, edges, markerId } = readGraph(graph);
  const find = (id) => svg.querySelector(`[id="${id}"]`);

  const states = new Map();
  for (const node of nodes) {
    const element = find(node.id);
    if (element) states.set(node.name, element);
  }
  if (markerId !== null) find(markerId)?.classList.add("start-marker");

  const drawnEdges = [];
  for (const edge of edges) {
    const element = find(edge.id);
    if (element && edge.from !== null) drawnEdges.push({ from: edge.from, to: edge.to, element });
  }
  return { svg, graph, states, edges: drawnEdges };
}

/**
 * Marks the states the machine is in and the edges it has just taken. An edge the drawing does
 * not show is ignored.
 */
export function mark(drawing, activeStates, takenEdges) {
  const active = new Set(activeStates);
  for (const [name, element] of drawing.states) {
    element.classList.toggle("is-current", active.has(name));
  }
  for (const edge of drawing.edges) {
    const taken = takenEdges.some((other) => other.from === edge.from && other.to === edge.to);
    edge.element.classList.toggle("is-taken", taken);
  }
}
