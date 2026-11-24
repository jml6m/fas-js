import { type FSA } from "../interfaces/FSA";
import { type State, type Alphabet, type Transition } from "../components";
import { ErrorCode } from "../globals/errors";
import { checkStateDuplicates, isSubsetOf } from "../globals/globals";
import { DFAUtils } from "../utils/DFAUtils";
import { NFAUtils } from "../utils/NFAUtils";
import { toDot } from "./Digraph";

export class DFA implements FSA {
  // Primary FSA attributes
  #states: Set<State>;
  #alphabet: Alphabet;
  #tfunc: Set<Transition>;
  #start: State;
  #accepts: Set<State>;

  // Intermediary attributes used in constructor
  #paths: Map<State, Set<string>>; // States mapped to each member of Σ, will be empty after constructor returns
  #utils: typeof DFAUtils;

  constructor(
    states: Set<State>,
    alphabet: Alphabet,
    tfunc: Set<Transition>,
    start: State,
    accepts: Set<State> | Record<string, never>
  ) {
    // initialize utils
    this.#utils = this.getType() === "NFA" ? NFAUtils : DFAUtils;

    // states validations
    if (checkStateDuplicates(states)) throw new Error(ErrorCode.DUPLICATE_STATE_NAMES);
    this.#states = states;

    this.#alphabet = alphabet;

    // Create paths map
    this.#paths = this.#utils.createPaths(this.#states, this.#alphabet);

    // Start/Accept validations
    if (!states.has(start)) throw new Error(ErrorCode.START_STATE_NOT_FOUND);
    this.#start = start;
    if (Object.keys(accepts).length === 0 && accepts.constructor === Object) accepts = new Set([]); // Allow for {}
    if (!isSubsetOf(accepts as Set<State>, states)) throw new Error(ErrorCode.ACCEPTS_NOT_SUBSET);
    this.#accepts = accepts as Set<State>;

    // TFunc validations
    this.#tfunc = this.#utils.validateTFunc(this.#states, this.#paths, tfunc, this.#alphabet);
  }

  /*
   * Getters
   */
  getStates(): Set<State> {
    return this.#states;
  }
  getAlphabet(): Alphabet {
    return this.#alphabet;
  }
  getTFunc(): Set<Transition> {
    return this.#tfunc;
  }
  getStartState(): State {
    return this.#start;
  }
  getAcceptStates(): Set<State> {
    return this.#accepts;
  }
  getType(): string {
    return "DFA";
  }

  generateDigraph(): string {
    return toDot(this.#states, this.#tfunc, this.#start, this.#accepts);
  }
}