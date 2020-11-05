// @flow
import Set from "core-js/features/set";
import { NFA } from "./NFA.js";
import { State, Alphabet, NFATransition } from "../components";

// $FlowFixMe[incompatible-call]
// $FlowFixMe[signature-verification-failure]
export const RegEx = ((regex: string, sigma: Array<string>) => {
  /*
   * Currently supported RegEx tokens
   * %s: * (0 or more)
   * %p: + (1 or more)
   * %u: ∪ (union operator)
   */
  class RegEx extends NFA {
    constructor(regex: Array<string>, alphabet: Alphabet) {
      let reg_spread: Array<string> = []; // Create Array<string> of RegEx tokens
      let reg_spread_next: Array<Array<string>> = []; // Create Array<Array<string>>, splitting the RegEx on the union operator

      // Combine RegEx tokens into one array value
      for (let i = 0; i < regex.length; i++) {
        if (regex[i] === "%" && i !== regex.length - 1) {
          reg_spread.push(regex[i] + regex[i + 1]);
          i++;
        } else reg_spread.push(regex[i]);
      }
      if (reg_spread.length === 0) reg_spread[0] = ""; // Handle empty regex case

      // Split on union operator
      for (let i = 0; i < reg_spread.length; i++) {
        if (reg_spread[i] === "%u") {
          reg_spread_next.push(reg_spread.slice(0, i));
          reg_spread = reg_spread.slice(i + 1, reg_spread.length);
          i = 0;
        } else if (i === reg_spread.length - 1) {
          reg_spread_next.push(reg_spread);
        } else {
        }
      }
      if (reg_spread_next.length === 0) reg_spread_next[0] = reg_spread;

      // Convert RegEx to NFA
      let _states: Array<State> = [];
      let _tfunc: Array<NFATransition> = [];
      let _accepts: Array<State> = [];
      let stateNum: number = 0; // Track how many states and used for state names
      let indexOfEntryStates: Array<number> = []; // Initial states for subcomponents

      for (let i = 0; i < reg_spread_next.length; i++) {
        indexOfEntryStates.push(stateNum);
        for (let j = 0; j < reg_spread_next[i].length; j++) {
          if (j !== reg_spread_next[i].length - 1 && reg_spread_next[i][j + 1].includes("%")) {
            j++;
            stateNum = processNextToken(_states, _tfunc, reg_spread_next[i], _accepts, stateNum, j);
          } else {
            stateNum = processNext(_states, _tfunc, reg_spread_next[i], _accepts, stateNum, j, reg_spread_next.length);
          }
        }
      }

      // Link subcomponents together with one entry state (unions)
      if (reg_spread_next.length > 1) {
        _states.push(new State("q" + ++stateNum));

        indexOfEntryStates.forEach((el) =>
          _tfunc.push(new NFATransition(_states[_states.length - 1], [_states[el]], ""))
        );

        // Add start state w/ empty transition
        _states.push(new State("q0"));
        _tfunc.push(new NFATransition(_states[_states.length - 1], [_states[_states.length - 2]], ""));
      } else {
        // Add start state w/ empty transition
        _states.push(new State("q0"));
        _tfunc.push(new NFATransition(_states[_states.length - 1], [_states[0]], ""));
      }

      super(new Set(_states), alphabet, new Set(_tfunc), _states[_states.length - 1], new Set(_accepts));
    }
  }

  return RegEx;
})();

// Process next char in a RegEx
export const processNext = (
  states: Array<State>,
  tfunc: Array<NFATransition>,
  regex: Array<string>,
  accepts: Array<State>,
  stateNum: number,
  index: number,
  countSubRegEx: number // count of RegEx subcomponents
): number => {
  states.push(new State("q" + ++stateNum));
  states.push(new State("q" + ++stateNum));
  tfunc.push(new NFATransition(states[states.length - 2], [states[states.length - 1]], regex[index]));

  // connect to previous transition but no connections btwn subcomponents
  if (tfunc.length > 1 && (countSubRegEx < 2 || index > 0))
    tfunc.push(new NFATransition(states[states.length - 3], [states[states.length - 2]], ""));

  // if no more inputs
  if (index === regex.length - 1) accepts.push(states[states.length - 1]);

  return stateNum;
};

// Process next token in a RegEx
export const processNextToken = (
  states: Array<State>,
  tfunc: Array<NFATransition>,
  regex: Array<string>,
  accepts: Array<State>,
  stateNum: number,
  index: number
): number => {
  if (regex[index] === "%p") states.push(new State("q" + ++stateNum));
  states.push(new State("q" + ++stateNum));
  states.push(new State("q" + ++stateNum));

  if (regex[index] === "%s" || regex[index] === "%p") {
    tfunc.push(new NFATransition(states[states.length - 2], [states[states.length - 1]], regex[index - 1]));
    tfunc.push(new NFATransition(states[states.length - 2], [states[states.length - 1]], ""));
    tfunc.push(new NFATransition(states[states.length - 1], [states[states.length - 2]], ""));

    if (regex[index] === "%p")
      tfunc.push(new NFATransition(states[states.length - 3], [states[states.length - 2]], regex[index - 1]));

    // connect to previous transition
    if (regex[index] === "%s" && index > 1 && tfunc.length > 3)
      // TODO: Test this more
      tfunc.push(new NFATransition(states[states.length - 3], [states[states.length - 2]], ""));
    else if (regex[index] === "%p" && index > 1 && tfunc.length > 4)
      tfunc.push(new NFATransition(states[states.length - 4], [states[states.length - 3]], ""));
    else {
    }
  }

  // if no more inputs
  if (index === regex.length - 1) accepts.push(states[states.length - 1]);

  return stateNum;
};
