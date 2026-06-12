import { type State, type Alphabet, type Transition } from "../components";

export interface FSA {
  // Getters
  getStates(): Set<State>; // Q
  getAlphabet(): Alphabet; // Σ
  getTFunc(): Set<Transition>; // δ
  getStartState(): State; // q0
  getAcceptStates(): Set<State>; // F

  getType(): string; // type of FSA
  generateDigraph(): string;
}