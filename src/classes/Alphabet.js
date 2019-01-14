// @flow
import { count, duplicates, ErrorCode } from "../modules.js";

export class Alphabet {
  sigma: string[];

  constructor(sigma: string) {
    this.sigma = [...sigma];
    if(duplicates(count(this.sigma)).length > 0)
      throw new Error(ErrorCode.DUPLICATE_ALPHABET_VALS);
  }
}
