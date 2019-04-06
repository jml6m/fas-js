// @flow
import { Transition } from "../interfaces/Transition.js";
import { State } from "./State.js";

export class DFATransition implements Transition<State, State, string> {
  constructor(origin: State, dest: State, input: string) {
    this.origin = origin;
    this.dest = dest;
    this.input = input;
  }
}
