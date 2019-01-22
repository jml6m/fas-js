// @flow
const chalk = require("chalk");
import { FSA } from "../classes/FSA.js";
import { ErrorCode } from "../globals/errors.js";

export const simulateFSA = (w: string[], fsa: FSA, logging: boolean = false): boolean => {
  if (logging) console.log(chalk.cyan("Beginning FSA Simulation"));

  //Accept either string or string[] for w
  if (!Array.isArray(w)) {
    if (typeof w === "string") w = [...w];
    else {
      if (logging) console.error(chalk.redBright("Input w was invalid type: %O"), w);
      throw new TypeError();
    }
  }

  // Step through input
  if (logging) console.log(chalk.inverse("Input Processing Started"));
  let currentState = fsa.start;
  for (const char of w) {
    const prevState = currentState;
    try {
      currentState = fsa.receiveInput(char, prevState);
    } catch (e) {
      if(e.message === ErrorCode.INVALID_INPUT_CHAR) {
        if (logging) console.error(chalk.redBright("Invalid input symbol: '%s'"), char);
      } else {
        if (logging) console.error(chalk.redBright(e));
      }
      return false;
    }
    if (logging) console.log("%s x %s -> %s", prevState.name, char, currentState.name);
  }
  if (logging) console.log(chalk.inverse("Input Processing Ended"));

  if (fsa.accepts.has(currentState)) {
    if (logging) console.log(chalk.green("Input Accepted!"));
    return true;
  } else {
    if (logging) console.log(chalk.red("Input Rejected!"));
    return false;
  }
};
