/* global fasJs, d3 */

(function () {
  "use strict";

  const EXAMPLES = {
    dfaEndsIn1: {
      states: ["q1", "q2"],
      alphabet: "01",
      transitions: [
        { from: "q1", to: "q2", input: "1" },
        { from: "q2", to: "q1", input: "0" },
        { from: "q2", to: "q2", input: "1" },
        { from: "q1", to: "q1", input: "0" },
      ],
      start: "q1",
      accepts: ["q2"],
      defaultInput: "101",
    },
    dfaSameSymbolEnds: {
      states: ["s", "q1", "q2", "r1", "r2"],
      alphabet: "ab",
      transitions: [
        { from: "s", to: "q1", input: "a" },
        { from: "s", to: "r1", input: "b" },
        { from: "q1", to: "q1", input: "a" },
        { from: "q1", to: "q2", input: "b" },
        { from: "q2", to: "q1", input: "a" },
        { from: "q2", to: "q2", input: "b" },
        { from: "r1", to: "r2", input: "a" },
        { from: "r1", to: "r1", input: "b" },
        { from: "r2", to: "r2", input: "a" },
        { from: "r2", to: "r1", input: "b" },
      ],
      start: "s",
      accepts: ["q1", "r1"],
      defaultInput: "bab",
    },
    nfaAccepts01or1: {
      states: ["q1", "q2", "q3", "q4"],
      alphabet: "01",
      transitions: [
        { from: "q1", to: "q2", input: "0" },
        { from: "q2", to: "q3", input: "1" },
        { from: "q1", to: "q4", input: "1" },
        { from: "q3", to: "q3", input: "" },
        { from: "q4", to: "q4", input: "" },
      ],
      start: "q1",
      accepts: ["q3", "q4"],
      defaultInput: "01",
    },
    nfaOneNearEnd: {
      states: ["q1", "q2", "q3", "q4"],
      alphabet: "01",
      transitions: [
        { from: "q1", to: "q1", input: "0" },
        { from: "q1", to: "q1,q2", input: "1" },
        { from: "q2", to: "q3", input: "0" },
        { from: "q2", to: "q3", input: "1" },
        { from: "q2", to: "q3", input: "" },
        { from: "q3", to: "q4", input: "0" },
        { from: "q3", to: "q4", input: "1" },
      ],
      start: "q1",
      accepts: ["q4"],
      defaultInput: "100",
    },
  };

  const exampleSelectEl = document.getElementById("example-select");
  const definitionEl = document.getElementById("fsa-definition");
  const buildBtn = document.getElementById("build-btn");
  const copyBtn = document.getElementById("copy-btn");
  const buildStatusEl = document.getElementById("build-status");

  const inputEl = document.getElementById("input-string");
  const simulateBtn = document.getElementById("simulate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const stepBtn = document.getElementById("step-btn");
  const stepResetBtn = document.getElementById("step-reset-btn");
  const currentStateEl = document.getElementById("current-state");
  const nextSymbolEl = document.getElementById("next-symbol");
  const positionEl = document.getElementById("position");
  const resultEl = document.getElementById("result");
  const fsaTypeEl = document.getElementById("fsa-type");
  const graphEl = document.getElementById("graph");

  let createFSA;
  let simulateFSA;
  let stepOnceFSA;
  let fsa = null;
  let fsaDef = null;
  let graphviz = null;
  let graphvizReady = false;
  let stepSession = null;

  function normalizeAccepts(accepts) {
    if (typeof accepts === "string") {
      return [accepts];
    }
    if (!Array.isArray(accepts)) {
      throw new Error("accepts must be a string or string array.");
    }
    return accepts;
  }

  function parseDefinition(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      throw new Error("Definition must be valid JSON.");
    }

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Definition must be a JSON object.");
    }

    const required = ["states", "alphabet", "transitions", "start", "accepts"];
    for (const key of required) {
      if (raw[key] === undefined || raw[key] === null) {
        throw new Error('Missing required field "' + key + '".');
      }
    }

    if (!Array.isArray(raw.states) || !raw.states.length) {
      throw new Error("states must be a non-empty array.");
    }

    if (
      typeof raw.alphabet !== "string" &&
      !(Array.isArray(raw.alphabet) && raw.alphabet.length)
    ) {
      throw new Error("alphabet must be a string or non-empty string array.");
    }

    if (!Array.isArray(raw.transitions) || !raw.transitions.length) {
      throw new Error("transitions must be a non-empty array.");
    }

    if (typeof raw.start !== "string" || !raw.start) {
      throw new Error("start must be a non-empty string.");
    }

    return {
      states: raw.states,
      alphabet: raw.alphabet,
      transitions: raw.transitions,
      start: raw.start,
      accepts: normalizeAccepts(raw.accepts),
      defaultInput:
        typeof raw.defaultInput === "string" ? raw.defaultInput : "",
    };
  }

  function formatDefinition(definition) {
    return JSON.stringify(definition, null, 2);
  }

  function setBuildStatus(message, tone) {
    buildStatusEl.textContent = message;
    buildStatusEl.className = "build-status";
    if (tone) {
      buildStatusEl.classList.add("build-status--" + tone);
    }
  }

  function setResult(message, tone) {
    resultEl.textContent = message;
    resultEl.className = "result";
    if (tone) {
      resultEl.classList.add("result--" + tone);
    }
  }

  function loadExample(key) {
    const example = EXAMPLES[key];
    if (!example) {
      return;
    }

    definitionEl.value = formatDefinition(example);
    inputEl.value = example.defaultInput || "";
  }

  function buildFSA() {
    if (!createFSA) {
      setBuildStatus(
        "fas-js bundle not loaded. Rebuild lib/bundle.js and refresh.",
        "error"
      );
      return false;
    }

    try {
      const definition = parseDefinition(definitionEl.value);
      fsa = createFSA(
        definition.states,
        definition.alphabet,
        definition.transitions,
        definition.start,
        definition.accepts
      );
      fsaDef = definition;
      fsaTypeEl.textContent = fsa.getType();
      if (definition.defaultInput) {
        inputEl.value = definition.defaultInput;
      }
      stepSession = createStepSession(readInput());
      setBuildStatus(
        fsa.getType() + " built — " + definition.states.length + " states.",
        "ok"
      );
      setResult("FSA ready. Enter an input string and press Simulate or Step.", "idle");
      updateStepDisplay(stepSession);
      renderGraph(formatState(stepSession.currentState));
      return true;
    } catch (error) {
      fsa = null;
      fsaDef = null;
      fsaTypeEl.textContent = "—";
      setBuildStatus("Build failed: " + error.message, "error");
      setResult("Fix the JSON definition and press Build FSA again.", "error");
      graphEl.innerHTML =
        '<p class="graph-placeholder">Build an FSA to render its graph.</p>';
      return false;
    }
  }

  async function copyDefinition() {
    const text = definitionEl.value;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        definitionEl.select();
        document.execCommand("copy");
      }
      setBuildStatus("Definition copied to clipboard.", "ok");
    } catch (error) {
      setBuildStatus("Copy failed: " + error.message, "error");
    }
  }

  async function ensureGraphviz() {
    if (graphvizReady) {
      return;
    }

    if (typeof d3 === "undefined" || typeof d3.select !== "function") {
      throw new Error("D3 failed to load.");
    }

    const wasm = globalThis["@hpcc-js/wasm"];
    if (!wasm || !wasm.Graphviz || typeof wasm.Graphviz.load !== "function") {
      throw new Error("Graphviz WASM failed to load.");
    }

    await wasm.Graphviz.load();
    graphviz = d3.select(graphEl).graphviz().zoom(false);
    graphvizReady = true;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightStateInDot(dot, stateName) {
    if (!stateName) {
      return dot;
    }

    const states = String(stateName)
      .split(",")
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean);

    let highlighted = dot;
    states.forEach(function (state) {
      const escaped = escapeRegExp(state);
      const pattern = new RegExp(
        "(^|\\n)(\\s*)(" + escaped + ")(\\s*\\[shape = doublecircle\\])?(;)?",
        "m"
      );
      highlighted = highlighted.replace(
        pattern,
        '$1$2$3 [style=filled, fillcolor="#fef08a"$4];'
      );
    });

    return highlighted;
  }

  async function renderGraph(highlightState) {
    if (!fsa) {
      return;
    }

    try {
      await ensureGraphviz();
      const dot = highlightStateInDot(fsa.generateDigraph(), highlightState);
      graphEl.innerHTML = "";
      await graphviz.renderDot(dot);
    } catch (error) {
      graphvizReady = false;
      graphviz = null;
      graphEl.innerHTML =
        '<p class="graph-error">Graph render failed: ' + error.message + "</p>";
    }
  }

  function formatState(state) {
    return Array.isArray(state) ? state.join(", ") : String(state);
  }

  function isAccepted(endState) {
    if (!fsaDef) {
      return false;
    }

    if (Array.isArray(endState)) {
      return endState.some(function (state) {
        return fsaDef.accepts.includes(state);
      });
    }

    return fsaDef.accepts.includes(endState);
  }

  function updateStepDisplay(session) {
    const input = session.input;
    const position = session.position;

    currentStateEl.textContent = formatState(session.currentState);
    nextSymbolEl.textContent =
      position < input.length ? input.charAt(position) : "(none)";
    positionEl.textContent = position + " / " + input.length;
    renderGraph(formatState(session.currentState));
  }

  function createStepSession(input) {
    return {
      input: input,
      currentState: fsaDef ? fsaDef.start : "—",
      position: 0,
    };
  }

  function readInput() {
    return inputEl.value;
  }

  function requireFSA() {
    if (!fsa || !fsaDef) {
      setResult("Build an FSA before simulating.", "error");
      return false;
    }
    return true;
  }

  function handleSimulate() {
    if (!requireFSA()) {
      return;
    }

    const input = readInput();

    try {
      const accepted = simulateFSA(input, fsa);
      const endState = simulateFSA(input, fsa, false, true);
      const tone = accepted ? "accept" : "reject";

      setResult(
        (accepted ? "Accepted" : "Rejected") +
          " — final state: " +
          formatState(endState),
        tone
      );

      stepSession = createStepSession(input);
      stepSession.currentState = endState;
      stepSession.position = input.length;
      updateStepDisplay(stepSession);
    } catch (error) {
      setResult("Simulation error: " + error.message, "error");
    }
  }

  function handleStep() {
    if (!requireFSA()) {
      return;
    }

    const input = readInput();

    if (!stepSession || stepSession.input !== input) {
      stepSession = createStepSession(input);
      setResult("Step mode started. Press Step to consume the next symbol.", "idle");
    }

    if (stepSession.position >= stepSession.input.length) {
      const accepted = isAccepted(stepSession.currentState);
      setResult(
        (accepted ? "Accepted" : "Rejected") +
          " — finished at state " +
          formatState(stepSession.currentState),
        accepted ? "accept" : "reject"
      );
      return;
    }

    const symbol = stepSession.input.charAt(stepSession.position);

    try {
      stepSession.currentState = stepOnceFSA(
        symbol,
        stepSession.currentState,
        fsa
      );
      stepSession.position += 1;
      updateStepDisplay(stepSession);

      if (stepSession.position >= stepSession.input.length) {
        const accepted = isAccepted(stepSession.currentState);
        setResult(
          "Last symbol processed. " +
            (accepted ? "Accepted" : "Rejected") +
            " at state " +
            formatState(stepSession.currentState),
          accepted ? "accept" : "reject"
        );
      } else {
        setResult(
          'Processed "' +
            symbol +
            '". Now at state ' +
            formatState(stepSession.currentState) +
            ".",
          "idle"
        );
      }
    } catch (error) {
      setResult("Step error: " + error.message, "error");
    }
  }

  function handleReset() {
    loadExample(exampleSelectEl.value);
    buildFSA();
  }

  function handleStepReset() {
    if (!requireFSA()) {
      return;
    }
    stepSession = createStepSession(readInput());
    setResult("Step mode restarted from the start state.", "idle");
    updateStepDisplay(stepSession);
  }

  function bindEvents() {
    exampleSelectEl.addEventListener("change", function () {
      loadExample(exampleSelectEl.value);
      buildFSA();
    });

    buildBtn.addEventListener("click", buildFSA);
    copyBtn.addEventListener("click", copyDefinition);
    simulateBtn.addEventListener("click", handleSimulate);
    resetBtn.addEventListener("click", handleReset);
    stepBtn.addEventListener("click", handleStep);
    stepResetBtn.addEventListener("click", handleStepReset);

    inputEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        handleSimulate();
      }
    });
  }

  function init() {
    if (typeof fasJs === "undefined") {
      setBuildStatus(
        "fas-js bundle missing. Run npm run build to copy vendor/fas-js.bundle.js.",
        "error"
      );
      setResult("Library bundle not loaded.", "error");
      bindEvents();
      return;
    }

    createFSA = fasJs.createFSA;
    simulateFSA = fasJs.simulateFSA;
    stepOnceFSA = fasJs.stepOnceFSA;

    bindEvents();
    loadExample(exampleSelectEl.value);
    buildFSA();
  }

  init();
})();