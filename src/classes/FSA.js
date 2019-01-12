// @flow
import { State, Alphabet, TFunc } from '../modules.js';

export class FSA {
  states: State[];
  alphabet: Alphabet;
  tfunc: TFunc;
  start: State;
  accepts: State[];

  constructor(states: State[], alphabet: Alphabet, tfunc: TFunc, start: State, accepts: State[]) {
      this.states = states;
      this.alphabet = alphabet;
      this.tfunc = tfunc;
      this.start = start;
      this.accepts = accepts;
  }
}