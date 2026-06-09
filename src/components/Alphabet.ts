import { ErrorCode } from "../globals/errors";
import { count, duplicates } from "../globals/globals";

export class Alphabet {
  sigma: string[];

  constructor(sigma: string | string[]) {
    if (!Array.isArray(sigma)) {
      if (typeof sigma === "string") sigma = [...sigma];
      else throw new TypeError();
    }
    this.sigma = sigma;
    if (duplicates(count(this.sigma)).length > 0) throw new Error(ErrorCode.DUPLICATE_ALPHABET_VALS);
  }
}