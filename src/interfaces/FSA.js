// @flow

export interface FSA {
  // FSA 5-tuple
  states: Set<State>; // Q
  alphabet: Alphabet; // Σ
  tfunc: Set<Transition>; // δ
  start: State; // q0
  accepts: Set<State>; // F

  // Other attributes
  digraph: string; // Will contain template literal for GraphViz
}
