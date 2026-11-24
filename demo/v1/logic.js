/*
 * The rules of the original 2019 simulator, ported from its notebook component and kept free
 * of the page so they can be tested on their own. Everything a machine computes comes from
 * fas-js; this file only reads the form, words the messages and picks what to highlight.
 */
(function (root) {
  "use strict";

  const EPSILON = "ε";

  /** A comma-separated field as typed: no trimming (a space can be a symbol), duplicates dropped. */
  function splitList(text) {
    return [...new Set(String(text).split(","))];
  }

  function readStates(text) {
    const states = splitList(text);
    if (states.length === 1 && states[0] === "") {
      return { states, error: "Enter at least one state name." };
    }
    if (states.includes("")) {
      return { states, error: "A state name is missing between two commas." };
    }
    return { states, error: "" };
  }

  function readAlphabet(text, deterministic) {
    const alphabet = splitList(text);
    if (alphabet.length === 1 && alphabet[0] === "") {
      return { alphabet, error: "Enter at least one symbol." };
    }
    if (deterministic && alphabet.includes("")) {
      return {
        alphabet,
        error: "A symbol is missing between two commas. A deterministic machine can't use the empty string as a symbol.",
      };
    }
    if (alphabet.some(symbol => symbol.length > 1)) {
      return { alphabet, error: "Each symbol must be exactly one character." };
    }
    return { alphabet, error: "" };
  }

  /** A deterministic machine needs every state and symbol pair, so those lines are written out. */
  function prefillTransitions(states, alphabet, deterministic) {
    if (!deterministic) return "";
    let text = "";
    for (const state of states) {
      for (const symbol of alphabet) {
        text += state + "," + symbol + ",\n";
      }
    }
    return text;
  }

  /**
   * Lines of `origin,symbol,destination`. For a non-deterministic machine the destination may be
   * a list such as `[q1|q2]`, and a blank symbol is an ε-move.
   */
  function parseTransitions(text, deterministic) {
    const transitions = [];
    const lines = String(text).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) continue;
      const parts = line.split(",");
      if (parts.length < 3) {
        throw new Error(
          "Line " + (index + 1) + " needs three parts separated by commas: origin state, input symbol, destination."
        );
      }
      let to = parts[2];
      if (!deterministic) {
        to = to.split("|").join(",").split("[").join("").split("]").join("");
      }
      transitions.push({ from: parts[0], to, input: parts[1] });
    }
    return transitions;
  }

  /** One press on a state's button: nothing → start (or accept, if a start exists) → both → accept → nothing. */
  function nextRoles(name, start, accepts) {
    const isStart = start === name;
    const isAccept = accepts.includes(name);
    if (!isStart && !isAccept) {
      return start === "" ? { start: name, accepts } : { start, accepts: accepts.concat(name) };
    }
    if (isStart && !isAccept) return { start, accepts: accepts.concat(name) };
    if (isStart && isAccept) return { start: "", accepts };
    return { start, accepts: accepts.filter(accept => accept !== name) };
  }

  function roleOf(name, start, accepts) {
    const isStart = start === name;
    const isAccept = accepts.includes(name);
    if (isStart && isAccept) return "both";
    if (isStart) return "start";
    if (isAccept) return "accept";
    return "none";
  }

  function listNames(names) {
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }

  function describeStates(states) {
    if (states.length === 0) return "no state";
    return (states.length === 1 ? "state " : "states ") + listNames(states);
  }

  /** fas-js reports a problem as a code. The page shows a sentence instead. */
  function explainCreateError(error, definition) {
    const stateList = definition.states.join(", ");
    const symbolList = definition.alphabet.filter(symbol => symbol !== "").join(", ");
    switch (error && error.message) {
      case "E-001":
        return "The alphabet lists a symbol twice.";
      case "E-002":
        return "Two states have the same name.";
      case "E-004":
        return "Choose a start state first.";
      case "E-005":
        return "An accept state isn't in the list of states.";
      case "E-006":
      case "E-007":
        return "A transition names a state that isn't in the list. The states are: " + stateList + ".";
      case "E-008":
        return definition.deterministic
          ? "Some transitions are missing. Every state needs one line for each symbol."
          : "Some transitions are missing. Unless a line has a blank symbol or several destinations, the machine is deterministic and every state needs one line for each symbol.";
      case "E-009":
        return "A transition uses a symbol that isn't in the alphabet. The symbols are: " + symbolList + ".";
      case "E-011":
        return "A transition is incomplete. Each line needs an origin state, an input symbol and a destination.";
      case "E-012":
        return "The same transition is listed twice.";
      default:
        if (error && /^Line \d+ needs/.test(error.message)) return error.message;
        return "The machine could not be created. Check the transition list.";
    }
  }

  function explainRunError(error) {
    if (error && error.message === "E-009") return "The input uses a symbol that isn't in the alphabet.";
    return "The machine could not read this input.";
  }

  /** The first character of the input that is not a symbol, or null. */
  function findInvalidSymbol(input, alphabet) {
    for (const symbol of String(input).split("")) {
      if (!alphabet.includes(symbol)) return symbol;
    }
    return null;
  }

  function asList(states) {
    return Array.isArray(states) ? states : [states];
  }

  /**
   * Where a run begins. A non-deterministic machine is also in every state it can reach from the
   * start state without reading anything; fas-js gives that set for an empty step.
   */
  function startStates(fas, fsa, start) {
    if (fsa.getType() === "NFA") return asList(fas.stepOnceFSA("", start, fsa));
    return [start];
  }

  function stepStates(fas, fsa, symbol, current) {
    const from = fsa.getType() === "NFA" ? current : current[0];
    return asList(fas.stepOnceFSA(symbol, from, fsa));
  }

  /**
   * The states a whole run ends in. The input goes in as one string, which fas-js reads one
   * character at a time; for a non-deterministic machine that includes the empty input.
   */
  function runMachine(fas, fsa, input) {
    return asList(fas.simulateFSA(String(input), fsa, false, true));
  }

  function isAccepted(states, accepts) {
    return states.some(state => accepts.includes(state));
  }

  /**
   * The edges just followed: those leaving a previous state on the symbol read and, for a
   * non-deterministic machine, the ε-edges between states it is in now. With no symbol (the
   * start of a run) only the latter.
   * @param {{from: string, to: string, symbols: string[]}[]} edges
   * @param {{previous: string[], current: string[], symbol: string | null, nondeterministic: boolean}} step
   */
  function edgesTaken(edges, step) {
    return edges.filter(edge => {
      if (!step.current.includes(edge.to)) return false;
      const onSymbol =
        step.symbol !== null && step.previous.includes(edge.from) && edge.symbols.includes(step.symbol);
      const onEpsilon =
        step.nondeterministic && step.current.includes(edge.from) && edge.symbols.includes(EPSILON);
      return onSymbol || onEpsilon;
    });
  }

  /** An edge of the drawing, from its tooltip (`origin->destination`) and its label. */
  function readEdge(title, label) {
    const arrow = String(title).indexOf("->");
    if (arrow === -1) return null;
    return {
      from: title.slice(0, arrow),
      to: title.slice(arrow + 2),
      symbols: label === "" ? [] : String(label).split(","),
    };
  }

  root.fasV1 = Object.freeze({
    readStates,
    readAlphabet,
    prefillTransitions,
    parseTransitions,
    nextRoles,
    roleOf,
    describeStates,
    explainCreateError,
    explainRunError,
    findInvalidSymbol,
    startStates,
    stepStates,
    runMachine,
    isAccepted,
    edgesTaken,
    readEdge,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
