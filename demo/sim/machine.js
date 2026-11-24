/**
 * Machine definitions for the simulator: reading one from JSON text, building it with the
 * library, and saying what is wrong in a plain sentence when it cannot be built.
 *
 * The library decides what is valid. This module only checks the shape of the JSON before
 * handing it over, and turns the library's error codes into sentences.
 */

/** Something the reader can fix. `message` is a plain sentence, with no error code. */
export class Problem extends Error {
  constructor(message) {
    super(message);
    this.name = "Problem";
  }
}

const isText = (value) => typeof value === "string";
// Names the reader chose go in curly quotes; the keys of the JSON keep the straight quotes they are typed with
const quoted = (value) => `“${value}”`;
const list = (values) => values.map(quoted).join(", ");

// One symbol per Unicode code point, the way the library reads a string alphabet
const symbolsOf = (alphabet) => (isText(alphabet) ? [...alphabet] : [...alphabet]);

/**
 * Reads a definition written as JSON in the shape createFSA takes:
 * { "states": [...], "alphabet": "01" or [...], "transitions": [{ "from", "to", "input" }], "start": "...", "accepts": [...] }
 * Returns it with the alphabet as an array of symbols and accepts as an array.
 */
export function readDefinition(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Problem("This is not valid JSON. Look for a missing comma, quote or bracket.");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Problem("The definition must be one JSON object, written between { and }.");
  }
  return checkDefinition(raw);
}

/** Checks the shape of a definition object and returns a clean copy. */
export function checkDefinition(raw) {
  for (const key of ["states", "alphabet", "transitions", "start", "accepts"]) {
    if (raw[key] === undefined || raw[key] === null) throw new Problem(`The definition has no "${key}".`);
  }

  const states = Array.isArray(raw.states) ? raw.states : [raw.states];
  if (states.length === 0 || !states.every((name) => isText(name) && name !== "")) {
    throw new Problem('"states" must be a list of state names, each a piece of text, with at least one state.');
  }

  const alphabetOk = isText(raw.alphabet)
    ? raw.alphabet !== ""
    : Array.isArray(raw.alphabet) && raw.alphabet.length > 0 && raw.alphabet.every((symbol) => isText(symbol) && symbol !== "");
  if (!alphabetOk) {
    throw new Problem('"alphabet" must be text such as "01", or a list of symbols such as ["up", "down"], with at least one symbol.');
  }

  const transitions = Array.isArray(raw.transitions) ? raw.transitions : [raw.transitions];
  for (const transition of transitions) {
    const ok =
      transition !== null &&
      typeof transition === "object" &&
      isText(transition.from) &&
      transition.from !== "" &&
      isText(transition.to) &&
      transition.to !== "" &&
      isText(transition.input);
    if (!ok) {
      throw new Problem('Every transition needs "from", "to" and "input", each as text. Use "" as the input for an ε-transition.');
    }
  }

  if (!isText(raw.start) || raw.start === "") throw new Problem('"start" must be the name of one state.');

  const accepts = isText(raw.accepts) ? [raw.accepts] : raw.accepts;
  if (!Array.isArray(accepts) || !accepts.every(isText)) {
    throw new Problem('"accepts" must be a list of state names. Use [] for a machine that accepts nothing.');
  }

  return {
    states: [...states],
    alphabet: symbolsOf(raw.alphabet),
    transitions: transitions.map(({ from, to, input }) => ({ from, to, input })),
    start: raw.start,
    accepts: [...accepts],
  };
}

/** Every transition as single edges: an NFA transition to "a,b" becomes two. */
export function edgesOf(definition, type) {
  return definition.transitions.flatMap(({ from, to, input }) =>
    (type === "NFA" ? to.split(",") : [to]).map((dest) => ({ from, to: dest, input }))
  );
}

/** The library's error code in an error it threw, or null. The message is read as text: the library may live in another frame, where `instanceof Error` is false. */
export const codeOf = (error) => (typeof error?.message === "string" && /^E-\d{3}$/.test(error.message) ? error.message : null);

// The first thing in the definition that explains each library error, in words
function explainBuild(code, definition) {
  const { states, alphabet, transitions, start, accepts } = definition;
  const isNfa = transitions.some((t) => t.to.includes(",") || t.input === "");
  const known = new Set(states);
  const dests = (t) => (isNfa ? t.to.split(",") : [t.to]);

  switch (code) {
    case "E-001": {
      const repeated = alphabet.find((symbol, i) => alphabet.indexOf(symbol) !== i);
      return `The alphabet lists the symbol ${quoted(repeated)} more than once. Each symbol may appear only once.`;
    }
    case "E-004":
      return `The start state ${quoted(start)} is not in the list of states.`;
    case "E-005": {
      const missing = accepts.find((name) => !known.has(name));
      return `The accept state ${quoted(missing)} is not in the list of states.`;
    }
    case "E-006": {
      const bad = transitions.find((t) => !known.has(t.from));
      return `A transition starts from ${quoted(bad?.from)}, which is not in the list of states.`;
    }
    case "E-007": {
      const bad = transitions.flatMap(dests).find((name) => !known.has(name));
      return `A transition goes to ${quoted(bad)}, which is not in the list of states.`;
    }
    case "E-008": {
      for (const state of states) {
        const missing = alphabet.filter((symbol) => !transitions.some((t) => t.from === state && t.input === symbol));
        if (missing.length > 0) {
          return `In a DFA every state needs one transition for every symbol. State ${quoted(state)} has none for ${list(missing)}.`;
        }
      }
      return "In a DFA every state needs one transition for every symbol, and at least one is missing.";
    }
    case "E-009": {
      const bad = transitions.find((t) => t.input !== "" && !alphabet.includes(t.input));
      return `A transition reads the symbol ${quoted(bad?.input)}, which is not in the alphabet (${list(alphabet)}).`;
    }
    case "E-012": {
      const seen = new Set();
      for (const t of transitions) {
        const key = JSON.stringify([t.from, t.input]);
        if (seen.has(key)) {
          return `State ${quoted(t.from)} has two transitions for the symbol ${quoted(t.input)}. A DFA allows one. To let a state go to several states, list them in one transition, such as "to": "q1,q2".`;
        }
        seen.add(key);
      }
      return "A state has two transitions for the same symbol. A DFA allows one.";
    }
    default:
      return "This machine could not be built. Check that every state, symbol and transition is spelled the same way everywhere.";
  }
}

/**
 * Builds the machine with the library. `fas` is the library's public API
 * ({ createFSA, simulateFSA, stepOnceFSA }). Throws a Problem with a plain sentence.
 */
export function buildMachine(fas, definition) {
  let fsa;
  try {
    fsa = fas.createFSA(definition.states, [...definition.alphabet], definition.transitions, definition.start, definition.accepts);
  } catch (error) {
    throw new Problem(explainBuild(codeOf(error), definition));
  }
  const type = fsa.getType();
  return { fsa, type, definition, edges: edgesOf(definition, type) };
}
