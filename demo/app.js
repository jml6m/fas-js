/**
 * The simulator page: it wires the controls and the drawing to the rules in sim/. Every verdict
 * and every set of states on screen comes from the library through those rules; nothing here
 * works one out.
 */
import { draw, mark } from "./drawing.js";
import { PRESETS } from "./presets.js";
import { definitionFromGraph } from "./sim/dot.js";
import { Problem, buildMachine, readDefinition } from "./sim/machine.js";
import { readInput, singleCodePointAlphabet, trace, verdict } from "./sim/run.js";

const OWN = "own";
const DOT_TEXT = /^(?:strict\s+)?(?:di)?graph\b/i;

const quoted = (value) => `“${value}”`;

// "q1", "q1 and q2", "q1, q2 and q3"
function inWords(names) {
  if (names.length === 0) return "no state";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const statesInWords = (names) => (names.length === 1 ? `state ${names[0]}` : `states ${inWords(names)}`);

/** A definition as JSON text with one transition per line, so a whole machine fits in view. */
export function formatDefinition({ states, alphabet, transitions, start, accepts }) {
  const line = (value) => (Array.isArray(value) ? `[${value.map((item) => JSON.stringify(item)).join(", ")}]` : JSON.stringify(value));
  const rows = transitions.map(({ from, to, input }) => `    { "from": ${JSON.stringify(from)}, "to": ${JSON.stringify(to)}, "input": ${JSON.stringify(input)} }`);
  return [
    "{",
    `  "states": ${line(states)},`,
    `  "alphabet": ${line(alphabet)},`,
    '  "transitions": [',
    rows.join(",\n"),
    "  ],",
    `  "start": ${JSON.stringify(start)},`,
    `  "accepts": ${line(accepts)}`,
    "}",
  ].join("\n");
}

function describeMachine(definition) {
  const accepts = definition.accepts.length === 0 ? "none" : definition.accepts.join(", ");
  return `State diagram. States: ${definition.states.join(", ")}. Start state: ${definition.start}. Accept states: ${accepts}.`;
}

// A symbol that holds a comma or a space is put in quotes, so the list still reads one way
function listSymbols(alphabet) {
  const plain = alphabet.every((symbol) => !/[\s,]/.test(symbol));
  return alphabet.map((symbol) => (plain ? symbol : `“${symbol}”`)).join(", ");
}

function summarize(machine) {
  const { states, alphabet } = machine.definition;
  const count = states.length === 1 ? "1 state" : `${states.length} states`;
  const symbols = alphabet.length === 0 ? "no symbols" : listSymbols(alphabet);
  return `${machine.type === "NFA" ? "An NFA" : "A DFA"} with ${count}. Alphabet: ${symbols}.`;
}

// How typed input is split into symbols for this alphabet: the rule in a few words, shown beside
// the field on every screen, and a sentence with an example for screens that have room for it
function inputRule(alphabet) {
  if (alphabet.length === 0) return "this machine reads no symbols";
  return singleCodePointAlphabet(alphabet) ? "one character per symbol" : "symbols separated by spaces";
}

function inputHint(alphabet) {
  if (alphabet.length === 0) return "The only input this machine can take is the empty one.";
  if (singleCodePointAlphabet(alphabet)) {
    return `Type the symbols one after another, for example ${alphabet.slice(0, 3).join("")}. Leave it empty for the empty input.`;
  }
  return `Separate the symbols with spaces, for example ${alphabet.slice(0, 3).join(" ")}. Leave it empty for the empty input.`;
}

/**
 * Starts the page.
 * @param {{ window: Window, fas: object, build?: { version: string }, loadGraphviz: () => Promise<object> }} env
 *   `fas` is the library's public API, `loadGraphviz` resolves to a loaded Graphviz.
 * @returns {{ settled: () => Promise<void> }} `settled` resolves when the drawing in progress is done.
 */
export function start({ window, fas, build, loadGraphviz }) {
  const { document } = window;
  const byId = (id) => document.getElementById(id);
  const el = {
    app: byId("app"),
    version: byId("lib-version"),
    viewMachine: byId("view-machine"),
    viewRun: byId("view-run"),
    preset: byId("preset"),
    about: byId("about"),
    definition: byId("definition"),
    load: byId("load"),
    copyDot: byId("copy-dot"),
    loadStatus: byId("load-status"),
    loadError: byId("load-error"),
    graph: byId("graph"),
    summary: byId("summary"),
    stepMessage: byId("step-message"),
    result: byId("result"),
    resultWords: byId("result-words"),
    input: byId("input"),
    inputRule: byId("input-rule"),
    inputHint: byId("input-hint"),
    inputError: byId("input-error"),
    tape: byId("tape"),
    simulate: byId("simulate"),
    step: byId("step"),
    reset: byId("reset"),
    showSteps: byId("show-steps"),
    steps: byId("steps"),
  };

  const state = {
    machine: null, // what buildMachine returned, or null when nothing can be run
    dot: null, // the text of the drawing on screen
    drawing: null,
    run: null, // the trace of the current input
    cursor: 0, // which step of the run is on screen
    done: false, // the verdict, or the reason there is none, is on screen
  };
  let graphviz = null;
  let loadToken = 0;
  let pending = Promise.resolve();

  /* ---- small helpers ---- */

  function showText(element, message) {
    element.textContent = message;
    element.hidden = message === "";
  }

  function showGraphMessage(message) {
    const text = document.createElement("p");
    text.className = "placeholder";
    text.textContent = message;
    el.graph.replaceChildren(text);
  }

  // Scrolls a list, and only that list, until one of its items is in view
  function reveal(list, item) {
    if (!item) return;
    const box = list.getBoundingClientRect();
    const at = item.getBoundingClientRect();
    if (at.top < box.top) list.scrollTop -= box.top - at.top;
    else if (at.bottom > box.bottom) list.scrollTop += at.bottom - box.bottom;
    if (at.left < box.left) list.scrollLeft -= box.left - at.left;
    else if (at.right > box.right) list.scrollLeft += at.right - box.right;
  }

  function setView(view) {
    el.app.dataset.view = view;
    el.viewMachine.setAttribute("aria-pressed", String(view === "machine"));
    el.viewRun.setAttribute("aria-pressed", String(view === "run"));
  }

  function getGraphviz() {
    if (!graphviz) {
      graphviz = Promise.resolve()
        .then(loadGraphviz)
        .catch((error) => {
          graphviz = null;
          throw error;
        });
    }
    return graphviz;
  }

  /* ---- loading a machine ---- */

  // Nothing can be run: `message` says why, or is empty while a pasted drawing is being read
  function noMachine(message) {
    state.machine = null;
    state.run = null;
    showText(el.loadError, message);
    showText(el.loadStatus, "");
    showText(el.summary, "");
    el.inputRule.textContent = "";
    el.inputHint.textContent = "";
    render();
  }

  function useMachine(machine, input) {
    state.machine = machine;
    showText(el.loadError, "");
    showText(el.loadStatus, `Loaded. ${summarize(machine)}`);
    showText(el.summary, summarize(machine));
    el.inputRule.textContent = `(${inputRule(machine.definition.alphabet)})`;
    el.inputHint.textContent = inputHint(machine.definition.alphabet);
    el.input.value = input;
    setView("run");
    restart();
  }

  async function drawMachine(token) {
    state.drawing = null;
    showGraphMessage("Drawing the graph…");

    let engine;
    try {
      engine = await getGraphviz();
    } catch {
      if (token === loadToken) showGraphMessage("The drawing tool did not load, so there is no graph. Running the machine still works.");
      return;
    }
    if (token !== loadToken) return;

    try {
      state.drawing = draw(engine, window, state.dot, describeMachine(state.machine.definition));
    } catch {
      showGraphMessage("This machine could not be drawn. Running it still works.");
      return;
    }
    el.graph.replaceChildren(state.drawing.svg);
    highlight();
  }

  // A pasted drawing is always shown. It is also run when the machine can be rebuilt from it.
  async function loadDrawing(text, token) {
    state.drawing = null;
    state.dot = null;
    showGraphMessage("Drawing the graph…");
    noMachine("");

    let engine;
    try {
      engine = await getGraphviz();
    } catch {
      if (token === loadToken) {
        showGraphMessage("The drawing tool did not load, so there is no graph.");
        noMachine("The drawing tool did not load, so a pasted drawing cannot be read. A JSON definition still works.");
      }
      return;
    }
    if (token !== loadToken) return;

    let drawing;
    try {
      drawing = draw(engine, window, text, "State diagram drawn from the pasted DOT text.");
    } catch {
      showGraphMessage("Nothing to draw yet.");
      noMachine("Graphviz could not read this text as a drawing. Check that it is the whole text generateDigraph() returned, from “digraph” to the last “}”.");
      return;
    }
    state.dot = text;
    state.drawing = drawing;
    el.graph.replaceChildren(drawing.svg);

    let machine;
    try {
      machine = buildMachine(fas, definitionFromGraph(drawing.graph));
    } catch (error) {
      const reason = error instanceof Problem ? error.message : "The machine could not be rebuilt from it.";
      noMachine(`The drawing is shown, but it cannot be run. ${reason}`);
      return;
    }
    drawing.svg.setAttribute("aria-label", describeMachine(machine.definition));
    useMachine(machine, "");
  }

  function loadText(text, input) {
    const token = ++loadToken;
    const trimmed = text.trim();
    if (DOT_TEXT.test(trimmed)) {
      pending = loadDrawing(trimmed, token);
      return;
    }

    let machine;
    try {
      machine = buildMachine(fas, readDefinition(trimmed));
    } catch (error) {
      state.drawing = null;
      state.dot = null;
      showGraphMessage("Nothing to draw yet.");
      noMachine(error instanceof Problem ? error.message : "This machine could not be built.");
      return;
    }
    state.dot = machine.fsa.generateDigraph();
    useMachine(machine, input);
    pending = drawMachine(token);
  }

  function loadPreset(id) {
    const preset = PRESETS.find((candidate) => candidate.id === id);
    if (!preset) return;
    el.about.textContent = preset.about;
    el.definition.value = formatDefinition(preset.definition);
    loadText(el.definition.value, preset.input);
  }

  function loadOwn() {
    el.preset.value = OWN;
    el.about.textContent = "Your own machine, from the text in Definition.";
    loadText(el.definition.value, "");
  }

  async function copyDot() {
    if (state.dot === null) {
      showText(el.loadStatus, "There is no drawing to copy yet.");
      return;
    }
    try {
      await window.navigator.clipboard.writeText(state.dot);
      showText(el.loadStatus, "The DOT text of this graph is copied. Paste it here, or into any Graphviz tool.");
    } catch {
      showText(el.loadStatus, "Copying is not available in this browser.");
    }
  }

  /* ---- running ---- */

  function restart() {
    const { machine } = state;
    state.run = machine ? trace(fas, machine, readInput(el.input.value, machine.definition.alphabet)) : null;
    state.cursor = 0;
    state.done = false;
    render();
  }

  const lastStep = () => state.run.steps.length - 1;

  function step() {
    if (!state.run || state.done) return;
    if (state.cursor < lastStep()) state.cursor += 1;
    if (state.cursor === lastStep()) state.done = true;
    render();
  }

  function simulate() {
    if (!state.run) return;
    state.cursor = lastStep();
    state.done = true;
    render();
  }

  function reset() {
    if (!state.run) return;
    state.cursor = 0;
    state.done = false;
    render();
  }

  function highlight() {
    if (!state.drawing) return;
    const current = state.run ? state.run.steps[state.cursor] : null;
    mark(state.drawing, current ? current.after : [], current ? current.edges : []);
  }

  function stepSentence(step, index, total) {
    if (step.symbol === null) {
      const without = step.after.length > 1 ? ", reached without reading anything" : "";
      return `Start: in ${statesInWords(step.after)}${without}.`;
    }
    const where = step.after.length === 0 ? "no state is left, so nothing can be accepted from here" : `now in ${statesInWords(step.after)}`;
    return `Read ${quoted(step.symbol)}, symbol ${index} of ${total}: ${where}.`;
  }

  function stepLine(step) {
    const to = step.after.length === 0 ? "no state" : step.after.join(", ");
    if (step.symbol === null) return `Start: ${to}`;
    const from = step.before.length === 0 ? "no state" : step.before.join(", ");
    return `Read ${quoted(step.symbol)}: ${from} → ${to}`;
  }

  function renderTape(symbols) {
    if (symbols.length === 0) {
      const empty = document.createElement("li");
      empty.className = "tape__empty";
      empty.textContent = "empty input";
      el.tape.replaceChildren(empty);
      return;
    }
    el.tape.replaceChildren(
      ...symbols.map((symbol, index) => {
        const item = document.createElement("li");
        item.textContent = symbol;
        if (index < state.cursor) item.className = "is-read";
        if (index === state.cursor - 1) item.setAttribute("aria-current", "step");
        if (state.done && state.run.problem !== null && index === state.run.at) item.className = "is-unknown";
        return item;
      })
    );
    reveal(el.tape, el.tape.querySelector('[aria-current="step"]'));
  }

  function renderSteps() {
    el.steps.hidden = !el.showSteps.checked || !state.run;
    if (el.steps.hidden) {
      el.steps.replaceChildren();
      return;
    }
    const rows = state.run.steps.map((step, index) => {
      const row = document.createElement("li");
      row.textContent = stepLine(step);
      if (index === state.cursor) row.setAttribute("aria-current", "step");
      return row;
    });
    if (state.run.problem !== null) {
      const row = document.createElement("li");
      row.className = "steps__problem";
      row.textContent = state.run.problem;
      rows.push(row);
    }
    el.steps.replaceChildren(...rows);
    reveal(el.steps, el.steps.querySelector('[aria-current="step"]'));
  }

  function render() {
    const { run } = state;
    const ready = run !== null;
    el.input.disabled = !ready;
    el.simulate.disabled = !ready;
    el.step.disabled = !ready || state.done;
    el.reset.disabled = !ready || (state.cursor === 0 && !state.done);
    el.showSteps.disabled = !ready;

    if (!ready) {
      el.stepMessage.textContent = "";
      el.result.textContent = "";
      el.resultWords.textContent = "";
      delete el.result.dataset.verdict;
      showText(el.inputError, "");
      el.tape.replaceChildren();
      renderSteps();
      highlight();
      return;
    }

    const symbols = readInput(el.input.value, state.machine.definition.alphabet);
    el.stepMessage.textContent = stepSentence(run.steps[state.cursor], state.cursor, symbols.length);

    const judged = state.done && run.problem === null;
    el.result.textContent = judged ? (run.accepted ? "Accepted ✓" : "Rejected ✗") : "";
    el.resultWords.textContent = judged ? verdict(run.accepted, symbols) : "";
    if (judged) el.result.dataset.verdict = run.accepted ? "accepted" : "rejected";
    else delete el.result.dataset.verdict;
    showText(el.inputError, state.done && run.problem !== null ? run.problem : "");

    renderTape(symbols);
    renderSteps();
    highlight();
  }

  /* ---- wiring ---- */

  el.version.textContent = build && build.version ? `fas-js ${build.version}` : "fas-js";

  for (const preset of PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    el.preset.append(option);
  }
  const own = document.createElement("option");
  own.value = OWN;
  own.textContent = "Your own machine";
  el.preset.append(own);

  el.preset.addEventListener("change", () => {
    if (el.preset.value === OWN) {
      el.about.textContent = "Your own machine: edit or paste the text in Definition, then choose Load.";
      setView("machine");
      el.definition.focus();
    } else {
      loadPreset(el.preset.value);
    }
  });
  el.load.addEventListener("click", loadOwn);
  el.copyDot.addEventListener("click", copyDot);
  el.viewMachine.addEventListener("click", () => setView("machine"));
  el.viewRun.addEventListener("click", () => setView("run"));
  el.input.addEventListener("input", restart);
  el.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") simulate();
  });
  el.simulate.addEventListener("click", simulate);
  el.step.addEventListener("click", step);
  el.reset.addEventListener("click", reset);
  el.showSteps.addEventListener("change", renderSteps);

  if (!fas || typeof fas.createFSA !== "function") {
    showGraphMessage("The library did not load, so there is nothing to run. Reload the page.");
    noMachine("The library did not load. Reload the page.");
  } else {
    el.preset.value = PRESETS[0].id;
    loadPreset(PRESETS[0].id);
  }

  return { settled: () => pending };
}
