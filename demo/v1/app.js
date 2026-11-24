/* global fasJs, fasV1 */

/*
 * The page of the original 2019 simulator: it wires the form, the drawing and the run controls
 * to the rules in logic.js. The machine itself is fas-js, in the release this simulator was
 * written for (fas-js-1.3.1.bundle.js).
 */
(function () {
  "use strict";

  const STEP_ALL_DELAY_MS = 1500;
  // Graphviz sizes its drawing in points. The drawing may grow to fill the panel, up to this factor.
  const PX_PER_POINT = 4 / 3;
  const MAX_DRAWING_SCALE = 1.6;

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

  const ROLE_TAGS = { none: "", start: "start", accept: "accept", both: "start + accept" };

  const byId = id => document.getElementById(id);
  const el = {
    app: byId("app"),
    version: byId("lib-version"),
    viewDefine: byId("view-define"),
    viewRun: byId("view-run"),
    pageError: byId("page-error"),
    states: byId("states"),
    statesError: byId("states-error"),
    alphabet: byId("alphabet"),
    alphabetError: byId("alphabet-error"),
    typeDfa: byId("type-dfa"),
    typeNfa: byId("type-nfa"),
    apply: byId("apply"),
    clear: byId("clear"),
    details: byId("details"),
    hintDfa: byId("hint-dfa"),
    hintNfa: byId("hint-nfa"),
    transitions: byId("transitions"),
    roles: byId("roles"),
    generate: byId("generate"),
    generateError: byId("generate-error"),
    graph: byId("graph"),
    runControls: byId("run-controls"),
    stepMessage: byId("step-message"),
    result: byId("result"),
    input: byId("input"),
    inputError: byId("input-error"),
    run: byId("run"),
    stepOnce: byId("step-once"),
    stepAll: byId("step-all"),
    reset: byId("reset"),
  };

  const placeholder = el.graph.firstElementChild;

  function idleRun() {
    return { phase: "idle", symbols: [], position: 0, current: [], step: null };
  }

  const state = {
    states: [],
    alphabet: [],
    applied: false,
    start: "",
    accepts: [],
    fsa: null,
    drawing: null,
    run: idleRun(),
  };

  let graphviz = null;
  let drawToken = 0;
  let autoToken = 0;

  function isDeterministic() {
    return el.typeDfa.checked;
  }

  function showError(target, message) {
    target.textContent = message;
    target.hidden = message === "";
  }

  function setView(view) {
    el.app.dataset.view = view;
    el.viewDefine.setAttribute("aria-pressed", String(view === "define"));
    el.viewRun.setAttribute("aria-pressed", String(view === "run"));
  }

  /* ---- the definition form ---- */

  function applyDefinition() {
    const deterministic = isDeterministic();
    const states = fasV1.readStates(el.states.value);
    const alphabet = fasV1.readAlphabet(el.alphabet.value, deterministic);
    showError(el.statesError, states.error);
    showError(el.alphabetError, states.error ? "" : alphabet.error);
    if (states.error) {
      el.states.focus();
      return;
    }
    if (alphabet.error) {
      el.alphabet.focus();
      return;
    }

    state.states = states.states;
    state.alphabet = alphabet.alphabet;
    state.applied = true;
    state.start = "";
    state.accepts = [];
    el.transitions.value = fasV1.prefillTransitions(state.states, state.alphabet, deterministic);
    buildRoleButtons();
    render();
    el.transitions.focus();
  }

  function clearEverything() {
    autoToken += 1;
    drawToken += 1;
    state.states = [];
    state.alphabet = [];
    state.applied = false;
    state.start = "";
    state.accepts = [];
    state.fsa = null;
    state.drawing = null;
    state.run = idleRun();

    el.states.value = "";
    el.alphabet.value = "";
    el.typeDfa.checked = true;
    el.transitions.value = "";
    el.input.value = "";
    for (const target of [el.statesError, el.alphabetError, el.generateError, el.inputError]) {
      showError(target, "");
    }
    el.stepMessage.textContent = "";
    showVerdict(null);
    el.roles.replaceChildren();
    el.graph.replaceChildren(placeholder);
    setView("define");
    render();
    el.states.focus();
  }

  function buildRoleButtons() {
    el.roles.replaceChildren(
      ...state.states.map(name => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "role";
        button.dataset.state = name;
        const label = document.createElement("span");
        label.textContent = name;
        const tag = document.createElement("span");
        tag.className = "role__tag";
        button.append(label, tag);
        button.addEventListener("click", () => {
          const next = fasV1.nextRoles(name, state.start, state.accepts);
          state.start = next.start;
          state.accepts = next.accepts;
          render();
        });
        return button;
      })
    );
  }

  /* ---- the machine and its drawing ---- */

  // The page imports the copy in its vendor folder. The tests have no browser to import it
  // into, so they hand over a loader of their own.
  function loadGraphviz() {
    if (typeof window.fasV1LoadGraphviz === "function") return window.fasV1LoadGraphviz();
    return import("./vendor/graphviz.js").then(module => module.Graphviz.load());
  }

  function getGraphviz() {
    if (!graphviz) {
      graphviz = Promise.resolve()
        .then(loadGraphviz)
        .catch(error => {
          graphviz = null;
          throw error;
        });
    }
    return graphviz;
  }

  function showGraphMessage(message) {
    const text = document.createElement("p");
    text.className = "placeholder";
    text.textContent = message;
    el.graph.replaceChildren(text);
  }

  // The drawing is built from names the reader typed, so keep only what a state diagram needs.
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

  function parseDrawing(svgText) {
    const start = svgText.indexOf("<svg");
    if (start === -1) return null;
    const parsed = new DOMParser().parseFromString(svgText.slice(start), "image/svg+xml");
    const svg = parsed.documentElement;
    if (!svg || svg.localName !== "svg") return null;
    keepDrawingParts(svg);

    const box = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    if (box.length === 4 && box.every(Number.isFinite)) {
      svg.style.maxWidth = Math.round(box[2] * PX_PER_POINT * MAX_DRAWING_SCALE) + "px";
      svg.style.maxHeight = Math.round(box[3] * PX_PER_POINT * MAX_DRAWING_SCALE) + "px";
    }
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", describeMachine());
    return document.importNode(svg, true);
  }

  function describeMachine() {
    return (
      "State diagram. States: " +
      state.states.join(", ") +
      ". Start state: " +
      state.start +
      ". Accept states: " +
      (state.accepts.length === 0 ? "none" : state.accepts.join(", ")) +
      "."
    );
  }

  // On a touch screen a focused text field opens the keyboard over the graph, so focus the graph.
  function focusInputOrGraph() {
    const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    (touch ? el.graph : el.input).focus();
  }

  function titleOf(group) {
    const title = [...group.children].find(child => child.localName === "title");
    return title ? title.textContent : "";
  }

  function readDrawing(svg) {
    const nodes = new Map();
    const edges = [];
    for (const group of svg.querySelectorAll("g.node")) {
      // The dot that marks the start state is a node too, but it has no label.
      if (group.querySelector("text")) nodes.set(titleOf(group), group);
      else group.classList.add("start-marker");
    }
    for (const group of svg.querySelectorAll("g.edge")) {
      const label = [...group.querySelectorAll("text")].map(text => text.textContent).join("");
      const edge = fasV1.readEdge(titleOf(group), label);
      if (edge) edges.push({ ...edge, element: group });
    }
    return { nodes, edges };
  }

  async function drawMachine() {
    const token = ++drawToken;
    state.drawing = null;
    showGraphMessage("Drawing the graph…");

    let engine;
    try {
      engine = await getGraphviz();
    } catch {
      if (token === drawToken) {
        showGraphMessage("The drawing tool did not load, so there is no graph. Running the machine still works.");
      }
      return;
    }
    if (token !== drawToken) return;

    let svg = null;
    try {
      svg = parseDrawing(engine.dot(state.fsa.generateDigraph()));
    } catch {
      svg = null;
    }
    if (!svg) {
      showGraphMessage(
        "This machine can't be drawn. State names made of letters, digits and underscores always work. Running the machine still works."
      );
      return;
    }
    el.graph.replaceChildren(svg);
    state.drawing = readDrawing(svg);
    highlight();
  }

  async function generateMachine() {
    const deterministic = isDeterministic();
    showError(el.generateError, "");
    try {
      const transitions = fasV1.parseTransitions(el.transitions.value, deterministic);
      state.fsa = fasJs.createFSA([...state.states], [...state.alphabet], transitions, state.start, [...state.accepts]);
    } catch (error) {
      state.fsa = null;
      showError(
        el.generateError,
        fasV1.explainCreateError(error, { states: state.states, alphabet: state.alphabet, deterministic })
      );
      return;
    }
    state.run = idleRun();
    el.stepMessage.textContent = state.fsa.getType() + " ready. Type an input, then run it or step through it.";
    setView("run");
    render();
    focusInputOrGraph();
    await drawMachine();
  }

  /* ---- running ---- */

  function highlight() {
    if (!state.drawing) return;
    const run = state.run;
    const current = run.phase === "idle" ? [] : run.current;
    for (const [name, group] of state.drawing.nodes) {
      group.classList.toggle("is-current", current.includes(name));
    }
    const taken =
      run.phase === "idle" || run.step === null
        ? []
        : fasV1.edgesTaken(state.drawing.edges, {
            previous: run.step.previous,
            current,
            symbol: run.step.symbol,
            nondeterministic: state.fsa.getType() === "NFA",
          });
    for (const edge of state.drawing.edges) {
      edge.element.classList.toggle("is-taken", taken.includes(edge));
    }
  }

  function showVerdict(accepted) {
    if (accepted === null) {
      el.result.textContent = "";
      delete el.result.dataset.verdict;
      return;
    }
    el.result.textContent = accepted ? "Accepted ✓" : "Rejected ✘";
    el.result.dataset.verdict = accepted ? "accepted" : "rejected";
  }

  /** States in words, in the order they were defined rather than the order fas-js found them. */
  function inWords(names) {
    return fasV1.describeStates(state.states.filter(name => names.includes(name)));
  }

  function whereNow(states) {
    return states.length === 0 ? "no state is active" : "now in " + inWords(states);
  }

  function inputIsValid() {
    const invalid = fasV1.findInvalidSymbol(el.input.value, state.alphabet);
    showError(el.inputError, invalid === null ? "" : "“" + invalid + "” is not in the alphabet.");
    return invalid === null;
  }

  /** Puts the machine at the start of a run. Returns false when fas-js refused. */
  function begin(phase) {
    autoToken += 1;
    let current;
    try {
      current = fasV1.startStates(fasJs, state.fsa, state.start);
    } catch (error) {
      stopWithError(error);
      return false;
    }
    state.run = {
      phase,
      symbols: el.input.value.split(""),
      position: 0,
      current,
      step: { previous: [], symbol: null },
    };
    showVerdict(null);
    el.stepMessage.textContent = "Started in " + inWords(current) + ".";
    return true;
  }

  function stopWithError(error) {
    autoToken += 1;
    state.run = idleRun();
    el.stepMessage.textContent = "";
    showVerdict(null);
    showError(el.inputError, fasV1.explainRunError(error));
    render();
    highlight();
  }

  /** Reads the next symbol. Returns false when fas-js refused it. */
  function advance() {
    const run = state.run;
    const symbol = run.symbols[run.position];
    const previous = run.current;
    let next;
    try {
      next = fasV1.stepStates(fasJs, state.fsa, symbol, previous);
    } catch (error) {
      stopWithError(error);
      return false;
    }
    run.position += 1;
    run.current = next;
    run.step = { previous, symbol };
    el.stepMessage.textContent =
      "Read symbol " + run.position + " of " + run.symbols.length + " (“" + symbol + "”): " + whereNow(next) + ".";
    return true;
  }

  function finish() {
    state.run.phase = "done";
    showVerdict(fasV1.isAccepted(state.run.current, state.accepts));
  }

  function runWholeInput() {
    if (!inputIsValid() || !begin("done")) return;
    let end;
    try {
      end = fasV1.runMachine(fasJs, state.fsa, el.input.value);
    } catch (error) {
      stopWithError(error);
      return;
    }
    state.run.position = state.run.symbols.length;
    state.run.current = end;
    state.run.step = null;
    el.stepMessage.textContent = end.length === 0 ? "No state is active at the end." : "Ended in " + inWords(end) + ".";
    finish();
    render();
    highlight();
  }

  // The first press shows where the run starts; each later press reads one symbol.
  function stepOnce() {
    if (!inputIsValid()) return;
    const run = state.run;
    if (run.phase !== "stepping") {
      if (!begin("stepping")) return;
    } else {
      if (run.symbols.length !== 0 && !advance()) return;
      if (run.position === run.symbols.length) finish();
    }
    render();
    highlight();
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function stepThroughAll() {
    if (!inputIsValid() || !begin("auto")) return;
    const token = autoToken;
    render();
    highlight();
    while (state.run.position < state.run.symbols.length) {
      await wait(STEP_ALL_DELAY_MS);
      if (token !== autoToken) return;
      if (!advance()) return;
      render();
      highlight();
    }
    finish();
    render();
    highlight();
  }

  function resetRun() {
    autoToken += 1;
    state.run = idleRun();
    el.input.value = "";
    el.stepMessage.textContent = "";
    showVerdict(null);
    showError(el.inputError, "");
    render();
    highlight();
    focusInputOrGraph();
  }

  /* ---- keeping the page in step with the state ---- */

  function render() {
    const generated = state.fsa !== null;
    const phase = state.run.phase;
    const running = phase === "stepping" || phase === "auto";
    const deterministic = isDeterministic();

    el.states.disabled = state.applied;
    el.alphabet.disabled = state.applied;
    el.apply.disabled = state.applied;
    el.clear.disabled = !state.applied;
    el.typeDfa.disabled = generated;
    el.typeNfa.disabled = generated;

    el.app.dataset.applied = String(state.applied);
    el.details.hidden = !state.applied;
    el.hintDfa.hidden = !deterministic;
    el.hintNfa.hidden = deterministic;
    el.transitions.setAttribute("aria-describedby", deterministic ? "hint-dfa" : "hint-nfa");
    el.transitions.placeholder = deterministic ? "q1,0,q2" : "q1,0,[q1|q2]";
    el.transitions.disabled = generated;
    el.generate.disabled = generated;

    for (const button of el.roles.children) {
      const role = fasV1.roleOf(button.dataset.state, state.start, state.accepts);
      button.dataset.role = role;
      button.lastElementChild.textContent = ROLE_TAGS[role];
      button.disabled = generated;
    }

    el.runControls.hidden = !generated;
    el.input.disabled = running;
    el.run.disabled = running;
    el.stepOnce.disabled = phase === "auto";
    el.stepAll.disabled = running;
    el.reset.disabled = phase === "idle";
  }

  function start() {
    const build = window.fasJsDemoBuild;
    if (build && build.version) el.version.textContent = "fas-js " + build.version;

    el.viewDefine.addEventListener("click", () => setView("define"));
    el.viewRun.addEventListener("click", () => setView("run"));
    el.typeDfa.addEventListener("change", render);
    el.typeNfa.addEventListener("change", render);
    el.clear.addEventListener("click", clearEverything);
    el.reset.addEventListener("click", resetRun);

    if (typeof fasJs === "undefined" || typeof fasV1 === "undefined") {
      showError(el.pageError, "The simulator's files did not load. Build the site again, then reload this page.");
      el.apply.disabled = true;
      return;
    }

    el.apply.addEventListener("click", applyDefinition);
    for (const field of [el.states, el.alphabet]) {
      field.addEventListener("keydown", event => {
        if (event.key === "Enter") applyDefinition();
      });
    }
    el.generate.addEventListener("click", generateMachine);
    el.run.addEventListener("click", runWholeInput);
    el.stepOnce.addEventListener("click", stepOnce);
    el.stepAll.addEventListener("click", stepThroughAll);
    el.input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !el.run.disabled) runWholeInput();
    });

    render();
    // Start fetching the drawing tool now, so the first graph appears without a wait.
    getGraphviz().catch(() => {});
  }

  start();
})();
