// @flow
import chalk from "chalk";

import { FSA } from "../interfaces/FSA.js";
import { ErrorCode } from "../globals/errors.js";
import { State, Alphabet, Transition } from "../components";
import { getOrDefault } from "../globals/globals.js";

export class DFAUtils {
  /*
   * Transition function should only contain states in Q, and one transition should exist
   * for each combination of Q x Σ
   */
  static validateTFunc(
    _states: Set<State>,
    _paths: Map<State, Set<string>>,
    _tfunc: Set<Transition>,
    _alph: Alphabet
  ): Set<Transition> {
    let newTFunc: Set<Transition> = new Set(); // Will contain only necessary transitions

    for (const _t of _tfunc) {
      // Check for valid states
      if (!_states.has(_t.origin)) throw new Error(ErrorCode.ORIGIN_STATE_NOT_FOUND);
      if (!_states.has(_t.dest)) throw new Error(ErrorCode.DEST_STATE_NOT_FOUND);

      const pathStateVals: Set<string> = getOrDefault(_paths, _t.origin, new Set());

      // Map transition to a path and remove on match
      if (this.isValidInputChar(_t.input, _alph)) {
        if (_paths.has(_t.origin) && pathStateVals.has(_t.input)) {
          newTFunc.add(_t);
          pathStateVals.delete(_t.input);
          if (pathStateVals.size === 0) {
            _paths.delete(_t.origin);
          }
        } else {
          throw new Error(ErrorCode.DUPLICATE_TRANSITION_OBJECT);
        }
      } else {
        throw new Error(ErrorCode.INVALID_INPUT_CHAR);
      }
    }

    if (_paths.size > 0) {
      console.error(chalk.redBright("Not all FSA paths have a transition specified:"));
      for (const [key, val] of _paths) {
        console.error(chalk.redBright("State %s on input(s): %s"), key.name, [...val].join(" "));
      }
      throw new Error(ErrorCode.MISSING_REQUIRED_TRANSITION);
    }

    return newTFunc;
  }

  static createPaths(_states: Set<State>, _alph: Alphabet): Map<State, Set<string>> {
    const _paths: Map<State, Set<string>> = new Map<State, Set<string>>();
    for (const state of _states) {
      for (const char of _alph.sigma) {
        const pathStateVals: Set<string> = getOrDefault(_paths, state, new Set());
        if (_paths.has(state)) pathStateVals.add(char);
        else _paths.set(state, new Set([char]));
      }
    }

    return _paths;
  }

  // Determine digraph order based on start state, then following the chain
  static determineStateOrder(
    _links: Map<string, Set<string>>,
    _tfunc: Set<Transition>,
    _states: Set<State>,
    _start: State,
    _accepts: Set<State>
  ): Array<string> {
    let statesOrder: Array<string> = []; // Ordered state names for digraph

    // Map origin state names to dest state names
    _links = new Map();
    for (const tr of _tfunc) {
      const linkStateVals: Set<string> = getOrDefault(_links, tr.origin.name, new Set());
      if (_links.has(tr.origin.name)) linkStateVals.add(tr.dest.name);
      else _links.set(tr.origin.name, new Set([tr.dest.name]));
    }

    // Populate state order
    this.parseLinks(statesOrder, _start.name, _links);

    // Check for dead states and reduce FSA if necessary
    let stateArr: Array<string> = [];
    (Object.values([..._states]): any).map((state: State) => stateArr.push(state.name));
    const deadStates = stateArr.filter(x => !statesOrder.includes(x));
    if (deadStates.length > 0) {
      console.warn(
        chalk.yellowBright("Dead states detected, removing them and associated transitions: %O"),
        deadStates
      );
      this.removeDeadStates(deadStates, _states, _accepts, _tfunc);
    }

    return statesOrder;
  }

  // Reduce FSA by removing dead states and associated transitions
  static removeDeadStates(
    deadStates: Array<string>,
    _states: Set<State>,
    _accepts: Set<State>,
    _tfunc: Set<Transition>
  ) {
    // Q
    for (const state of _states) {
      if (deadStates.indexOf(state.name) !== -1) _states.delete(state);
    }
    // F
    for (const state of _accepts) {
      if (deadStates.indexOf(state.name) !== -1) _accepts.delete(state);
    }
    // δ
    for (const tr of _tfunc) {
      if (deadStates.indexOf(tr.origin.name) !== -1 || deadStates.indexOf(tr.dest.name) !== -1) _tfunc.delete(tr);
    }
  }

  // Recursively parse graph while adding to an array in order, beginning with q0
  static parseLinks(arr: Array<string>, name: string, _links: Map<string, Set<string>>) {
    arr.push(name);
    const nameVal: string = getOrDefault(_links, name, "");
    for (const st of nameVal) {
      if (arr.indexOf(st) === -1) this.parseLinks(arr, st, _links);
    }
  }

  static isValidInputChar(input: string, _alph: Alphabet): boolean {
    return _alph.sigma.indexOf(input) !== -1;
  }
}
