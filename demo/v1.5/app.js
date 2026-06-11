/* global fasJs, d3 */

(function () {
  "use strict";

  const LANGUAGE_PRESETS = {
    singletonA: {
      label: "{a}",
      states: ["q0", "q1", "dead"],
      alphabet: "a",
      transitions: [
        { from: "q0", to: "q1", input: "a" },
        { from: "q1", to: "dead", input: "a" },
        { from: "dead", to: "dead", input: "a" },
      ],
      start: "q0",
      accepts: ["q1"],
      defaultInput: "a",
    },
    singletonB: {
      label: "{b}",
      states: ["q0", "q1", "dead"],
      alphabet: "b",
      transitions: [
        { from: "q0", to: "q1", input: "b" },
        { from: "q1", to: "dead", input: "b" },
        { from: "dead", to: "dead", input: "b" },
      ],
      start: "q0",
      accepts: ["q1"],
      defaultInput: "b",
    },
    endsIn1: {
      label: "ends in 1",
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
    nfa01or1: {
      label: "01 or 1 (NFA)",
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
  };

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
  let RegularLanguage;
  let currentMode = "fsa";
  let fsa = null;
  let fsaDef = null;
  let graphviz = null;
  let graphvizReady = false;
  let graphRenderGeneration = 0;
  let graphRenderInFlight = null;
  let resizeObserver = null;
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

  function populateLanguageSelect(selectEl, includeNfaOnly) {
    selectEl.innerHTML = "";
    Object.keys(LANGUAGE_PRESETS).forEach(function (key) {
      const preset = LANGUAGE_PRESETS[key];
      if (includeNfaOnly === true && key.indexOf("nfa") !== 0 && preset.label.indexOf("NFA") === -1) {
        return;
      }
      const option = document.createElement("option");
      option.value = key;
      option.textContent = preset.label;
      selectEl.appendChild(option);
    });
  }

  function languageFromPreset(key) {
    const preset = LANGUAGE_PRESETS[key];
    if (!preset || !RegularLanguage) {
      throw new Error("Unknown language preset.");
    }
    const automaton = createFSA(
      preset.states,
      preset.alphabet,
      preset.transitions,
      preset.start,
      preset.accepts
    );
    return RegularLanguage.fromAutomaton(automaton);
  }

  function editorPayloadFromLanguage(language, defaultInput) {
    const definition = language.toDefinition();
    return {
      states: definition.states,
      alphabet: definition.alphabet.join(""),
      transitions: definition.transitions,
      start: definition.start,
      accepts: definition.accepts,
      defaultInput: defaultInput || "",
    };
  }

  function activateAutomaton(automaton, editorPayload, statusMessage) {
    fsa = automaton;
    fsaDef = editorPayload;
    fsaTypeEl.textContent = fsa.getType();
    definitionEl.value = formatDefinition(editorPayload);
    if (editorPayload.defaultInput) {
      inputEl.value = editorPayload.defaultInput;
    }
    stepSession = createStepSession(readInput());
    setBuildStatus(statusMessage, "ok");
    setResult("Machine ready — simulate or step.", "idle");
    updateStepDisplay(stepSession);
    renderGraph(formatState(stepSession.currentState));
  }

  function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll(".mode-tab").forEach(function (tab) {
      const active = tab.getAttribute("data-mode") === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll(".mode-panel").forEach(function (panel) {
      panel.classList.add("is-hidden");
    });

    const panel = document.getElementById(mode + "-mode");
    if (panel) {
      panel.classList.remove("is-hidden");
    }

    const fsaActions = document.getElementById("fsa-actions");
    if (fsaActions) {
      fsaActions.classList.toggle("is-hidden", mode !== "fsa");
    }

    const heading = document.getElementById("editor-heading");
    if (heading) {
      const titles = {
        fsa: "FSA definition",
        union: "Union (L₁ ∪ L₂)",
        concat: "Concatenation (L₁L₂)",
        star: "Kleene star (L*)",
        nfa2dfa: "NFA → DFA",
      };
      heading.textContent = titles[mode] || "Definition";
    }
  }

  function handleUnionBuild() {
    if (!RegularLanguage) {
      setBuildStatus("Language module unavailable. Run npm run build.", "error");
      return;
    }
    try {
      const left = languageFromPreset(document.getElementById("union-left").value);
      const right = languageFromPreset(document.getElementById("union-right").value);
      const result = left.union(right);
      const payload = editorPayloadFromLanguage(result, "a");
      activateAutomaton(
        result.getAutomaton(),
        payload,
        "Built L₁ ∪ L₂ as " + result.getAutomaton().getType() + "."
      );
    } catch (error) {
      setBuildStatus("Union failed: " + error.message, "error");
    }
  }

  function handleConcatBuild() {
    if (!RegularLanguage) {
      setBuildStatus("Language module unavailable. Run npm run build.", "error");
      return;
    }
    try {
      const left = languageFromPreset(document.getElementById("concat-left").value);
      const right = languageFromPreset(document.getElementById("concat-right").value);
      const result = left.concat(right);
      const payload = editorPayloadFromLanguage(result, "ab");
      activateAutomaton(
        result.getAutomaton(),
        payload,
        "Built L₁L₂ as " + result.getAutomaton().getType() + "."
      );
    } catch (error) {
      setBuildStatus("Concat failed: " + error.message, "error");
    }
  }

  function handleStarBuild() {
    if (!RegularLanguage) {
      setBuildStatus("Language module unavailable. Run npm run build.", "error");
      return;
    }
    try {
      const source = languageFromPreset(document.getElementById("star-source").value);
      const result = source.kleeneStar();
      const payload = editorPayloadFromLanguage(result, "aaa");
      activateAutomaton(
        result.getAutomaton(),
        payload,
        "Built L* as " + result.getAutomaton().getType() + "."
      );
    } catch (error) {
      setBuildStatus("Star failed: " + error.message, "error");
    }
  }

  function handleNfa2DfaBuild() {
    if (!RegularLanguage) {
      setBuildStatus("Language module unavailable. Run npm run build.", "error");
      return;
    }
    try {
      const source = languageFromPreset(document.getElementById("nfa2dfa-source").value);
      if (source.getAutomaton().getType() !== "NFA") {
        setBuildStatus("Pick an NFA preset for conversion.", "error");
        return;
      }
      const result = source.toDFA();
      const preset = LANGUAGE_PRESETS[document.getElementById("nfa2dfa-source").value];
      const payload = editorPayloadFromLanguage(result, preset.defaultInput || "");
      activateAutomaton(
        result.getAutomaton(),
        payload,
        "Converted NFA to equivalent DFA."
      );
    } catch (error) {
      setBuildStatus("Conversion failed: " + error.message, "error");
    }
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
    graphviz = d3
      .select(graphEl)
      .graphviz({ zoom: false, growEnteringEdges: false, fit: true });
    configureGraphvizDimensions();
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

  function getGraphViewportSize() {
    const viewport = document.getElementById("graph-viewport");
    if (!viewport) {
      return { width: graphEl.clientWidth || 400, height: graphEl.clientHeight || 300 };
    }
    return {
      width: Math.max(viewport.clientWidth, 1),
      height: Math.max(viewport.clientHeight, 1),
    };
  }

  function configureGraphvizDimensions() {
    if (!graphviz) {
      return;
    }
    const size = getGraphViewportSize();
    graphviz.width(size.width).height(size.height).fit(true);
  }

  function fitGraphToViewport(attempt) {
    const svg = graphEl.querySelector("svg");
    if (!svg) {
      return;
    }

    const graphRoot = svg.querySelector("g");
    if (!graphRoot && attempt < 4) {
      requestAnimationFrame(function () {
        fitGraphToViewport(attempt + 1);
      });
      return;
    }

    const pad = 10;
    let bbox;
    try {
      bbox = graphRoot ? graphRoot.getBBox() : svg.getBBox();
    } catch (error) {
      return;
    }

    if (!bbox.width || !bbox.height) {
      if (attempt < 4) {
        requestAnimationFrame(function () {
          fitGraphToViewport(attempt + 1);
        });
      }
      return;
    }

    const viewBox = [
      bbox.x - pad,
      bbox.y - pad,
      bbox.width + pad * 2,
      bbox.height + pad * 2,
    ].join(" ");

    svg.setAttribute("viewBox", viewBox);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  function scheduleGraphFit() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fitGraphToViewport(0);
      });
    });
  }

  async function renderGraph(highlightState) {
    if (!fsa) {
      return;
    }

    const generation = ++graphRenderGeneration;

    if (graphRenderInFlight) {
      try {
        await graphRenderInFlight;
      } catch (error) {
        /* superseded render failed; continue */
      }
      if (generation !== graphRenderGeneration) {
        return;
      }
    }

    const renderTask = (async function () {
      await ensureGraphviz();
      if (generation !== graphRenderGeneration) {
        return;
      }

      configureGraphvizDimensions();
      const dot = highlightStateInDot(fsa.generateDigraph(), highlightState);
      await graphviz.renderDot(dot);

      if (generation !== graphRenderGeneration) {
        return;
      }

      const placeholder = graphEl.querySelector(".graph-placeholder");
      if (placeholder) {
        placeholder.remove();
      }

      scheduleGraphFit();
    })();

    graphRenderInFlight = renderTask;

    try {
      await renderTask;
    } catch (error) {
      if (generation !== graphRenderGeneration) {
        return;
      }
      graphvizReady = false;
      graphviz = null;
      graphEl.textContent = "";
      const errorEl = document.createElement("p");
      errorEl.className = "graph-error";
      errorEl.textContent = "Graph render failed: " + error.message;
      graphEl.appendChild(errorEl);
    } finally {
      if (graphRenderInFlight === renderTask) {
        graphRenderInFlight = null;
      }
    }
  }

  function scheduleGraphReflow() {
    if (!fsa || !graphvizReady) {
      return;
    }
    configureGraphvizDimensions();
    scheduleGraphFit();
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
    if (currentMode === "fsa") {
      loadExample(exampleSelectEl.value);
      buildFSA();
      return;
    }
    if (currentMode === "union") {
      handleUnionBuild();
    } else if (currentMode === "concat") {
      handleConcatBuild();
    } else if (currentMode === "star") {
      handleStarBuild();
    } else if (currentMode === "nfa2dfa") {
      handleNfa2DfaBuild();
    }
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

    document.querySelectorAll(".mode-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        switchMode(tab.getAttribute("data-mode"));
      });
    });

    document.getElementById("union-build-btn").addEventListener("click", handleUnionBuild);
    document.getElementById("concat-build-btn").addEventListener("click", handleConcatBuild);
    document.getElementById("star-build-btn").addEventListener("click", handleStarBuild);
    document.getElementById("nfa2dfa-build-btn").addEventListener("click", handleNfa2DfaBuild);

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
    RegularLanguage = fasJs.RegularLanguage;

    populateLanguageSelect(document.getElementById("union-left"));
    populateLanguageSelect(document.getElementById("union-right"));
    populateLanguageSelect(document.getElementById("concat-left"));
    populateLanguageSelect(document.getElementById("concat-right"));
    populateLanguageSelect(document.getElementById("star-source"));
    populateLanguageSelect(document.getElementById("nfa2dfa-source"), true);
    if (document.getElementById("union-right").options.length > 1) {
      document.getElementById("union-right").selectedIndex = 1;
      document.getElementById("concat-right").selectedIndex = 1;
    }

    bindEvents();
    switchMode("fsa");
    loadExample(exampleSelectEl.value);
    buildFSA();

    const viewport = document.getElementById("graph-viewport");
    if (window.ResizeObserver && viewport) {
      resizeObserver = new ResizeObserver(function () {
        scheduleGraphReflow();
      });
      resizeObserver.observe(viewport);
    }

    window.addEventListener("resize", scheduleGraphReflow);
  }

  init();
})();