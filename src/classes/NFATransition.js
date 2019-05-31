// @flow
import { State } from "./State.js";

export class NFATransition {
  origin: State;
  dest: Array<State>;
  input: string;

  constructor(origin: State, dest: Array<State>, input: string) {
    this.origin = origin;
    this.dest = dest;
    this.input = input;
  }
}
