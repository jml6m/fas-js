import { type FSA } from "../interfaces/FSA";
import {
  Language,
  type AlphabetSymbol,
  type LanguageClassification,
  type Word,
} from "./Language";
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

  getClassification(): LanguageClassification {
    return "regular";
  }

  static fromAutomaton(automaton: FSA): RegularLanguage {
    return new RegularLanguage(automaton);
  }

  contains(word: Word): boolean {
    try {
      // simulateFSA accepts string | string[]; readonly string[] is structurally fine
      return Boolean(simulateFSA(word as string | string[], this.#automaton));
    } catch (error) {
      if (instanceOf(Error, error) && error.message === ErrorCode.INVALID_INPUT_CHAR) {
        return false;
      }
      throw error;
    }
  }

  getAutomaton(): FSA {
    return this.#automaton;
  }

  getAlphabetSymbols(): readonly AlphabetSymbol[] {
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

  toDFA(): RegularLanguage {
    if (!instanceOf(NFA, this.#automaton)) {
      return this;
    }

    const { definition } = subsetConstruction(this.#automaton);
    return RegularLanguage.fromAutomaton(buildFromDefinition(definition));
  }
}