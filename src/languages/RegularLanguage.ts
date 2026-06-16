import { type FSA } from "../interfaces/FSA";
import { Language } from "./Language";
import { simulateFSA } from "../engine/Simulators";
import { ErrorCode } from "../globals/errors";
import { NFA } from "../automata";
import { instanceOf } from "../globals/globals";
import {
  buildFromDefinition,
  exportFSADefinition,
  languageAlphabetSymbols,
} from "./fsaHelpers";
import { LanguageOperations } from "./LanguageOperations";
import { subsetConstruction } from "./NFAtoDFA";

export class RegularLanguage extends Language {
  #automaton: FSA;

  constructor(automaton: FSA) {
    super();
    this.#automaton = automaton;
  }

  getClassification(): string {
    return "regular";
  }

  static fromAutomaton(automaton: FSA): RegularLanguage {
    return new RegularLanguage(automaton);
  }

  /**
   * @fas-correctness DEFINITIONAL
   * @fas-spec L(M) = { w | M accepts w }
   */
  contains(word: string): boolean {
    try {
      return Boolean(simulateFSA(word, this.#automaton));
    } catch (error) {
      if (error instanceof Error && error.message === ErrorCode.INVALID_INPUT_CHAR) {
        return false;
      }
      throw error;
    }
  }

  getAutomaton(): FSA {
    return this.#automaton;
  }

  getAlphabetSymbols(): string[] {
    return languageAlphabetSymbols(this.#automaton);
  }

  toDefinition() {
    return exportFSADefinition(this.#automaton);
  }

  union(other: RegularLanguage): RegularLanguage {
    const definition = LanguageOperations.unionDefinitions(this.toDefinition(), other.toDefinition());
    return RegularLanguage.fromAutomaton(buildFromDefinition(definition));
  }

  concat(other: RegularLanguage): RegularLanguage {
    const definition = LanguageOperations.concatDefinitions(this.toDefinition(), other.toDefinition());
    return RegularLanguage.fromAutomaton(buildFromDefinition(definition));
  }

  kleeneStar(): RegularLanguage {
    const definition = LanguageOperations.kleeneStarDefinition(this.toDefinition());
    return RegularLanguage.fromAutomaton(buildFromDefinition(definition));
  }

  /**
   * @fas-correctness THEOREM-IMPLEMENTED
   * @fas-spec Powerset construction — delegates to subsetConstruction (NFA only).
   */
  /* @coverage-caveat: c8 line hits here mean fixture NFA instances were exercised — not Σ* verification */
  toDFA(): RegularLanguage {
    if (!instanceOf(NFA, this.#automaton)) {
      return this;
    }

    const { definition } = subsetConstruction(this.#automaton);
    return RegularLanguage.fromAutomaton(buildFromDefinition(definition));
  }
}