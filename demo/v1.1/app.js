/* global fasJs, d3 */

(function () {
  "use strict";

  const { createFSA, simulateFSA, stepOnceFSA } = fasJs;

  const EXAMPLE = {
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
  };

  const fsa = createFSA(
    EXAMPLE.states,
    EXAMPLE.alphabet,
    EXAMPLE.transitions,
    EXAMPLE.start,
    EXAMPLE.accepts
  );

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

  let graphviz = null;
  let stepSession = null;

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightStateInDot(dot, stateName) {
    if (!stateName) {
      return dot;
    }

    const escaped = escapeRegExp(stateName);
    const pattern = new RegExp(
      `(^|\\n)(\\s*)(${escaped})(\\s*\\[shape = doublecircle\\])?(;)?`,
      "m"
    );

    return dot.replace(
      pattern,
      '$1$2$3 [style=filled, fillcolor="#fef08a"$4];'
    );
  }

  function renderGraph(highlightState) {
    const dot = highlightStateInDot(fsa.generateDigraph(), highlightState);

    if (!graphviz) {
      graphviz = d3.select(graphEl).graphviz().zoom(false);
    }

    graphviz.renderDot(dot);
  }

  function formatState(state) {
    return Array.isArray(state) ? state.join(", ") : state;
  }

  function isAccepted(endState) {
    if (Array.isArray(endState)) {
      return endState.some((state) => EXAMPLE.accepts.includes(state));
    }
    return EXAMPLE.accepts.includes(endState);
  }

  function setResult(message, tone) {
    resultEl.textContent = message;
    resultEl.className = "result";
    if (tone) {
      resultEl.classList.add("result--" + tone);
    }
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
      currentState: EXAMPLE.start,
      position: 0,
    };
  }

  function readInput() {
    return inputEl.value.trim();
  }

  function handleSimulate() {
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
    inputEl.value = "101";
    stepSession = createStepSession(inputEl.value);
    setResult("Enter an input string and press Simulate or Step.", "idle");
    updateStepDisplay(stepSession);
  }

  function handleStepReset() {
    stepSession = createStepSession(readInput());
    setResult("Step mode restarted from the start state.", "idle");
    updateStepDisplay(stepSession);
  }

  function init() {
    fsaTypeEl.textContent = fsa.getType();
    stepSession = createStepSession(inputEl.value);

    simulateBtn.addEventListener("click", handleSimulate);
    resetBtn.addEventListener("click", handleReset);
    stepBtn.addEventListener("click", handleStep);
    stepResetBtn.addEventListener("click", handleStepReset);

    inputEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        handleSimulate();
      }
    });

    updateStepDisplay(stepSession);
    setResult("Enter an input string and press Simulate or Step.", "idle");
  }

  init();
})();