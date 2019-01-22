// @flow
import { ErrorCode } from "../globals/errors.js";

export class State {
  name: string;

  constructor(name: string) {
    this.name = name;
    if(!this.name)
      throw new Error(ErrorCode.INVALID_STATE_NAME);
  }
}
