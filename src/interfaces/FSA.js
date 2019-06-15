// @flow
import { State, Alphabet, Transition } from "../components";

export interface FSA {
  // FSA 5-tuple
  states: Set<State>; // Q
  alphabet: Alphabet; // Σ
  tfunc: Set<Transition>; // δ
  start: State; // q0
  accepts: Set<State>; // F

  //Getters
  //getStates(): Set<State>;
  //getAlphabet(): Alphabet;
  //getTFunc(): Set<Transition>;
  //getStartState(): State;
  //getAcceptStates(): Set<State>;

  //generateDigraph(): string;
}
