// @flow
import { State } from "./State.js";

export class Transition {
  origin: State;
  dest: State;
  input: string;

  constructor(origin: State, dest: State, input: string) {
    this.origin = origin;
    this.dest = dest;
    this.input = input;
  }
}
