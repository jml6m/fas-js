// @flow

export class State {
  name: string;

  constructor(name: string) {
    this.name = name;
    if(!this.name)
      throw new Error("Invalid state name");
  }
}
