import { FSA } from "./FSA";

/**
 * A formal language characterized by membership testing.
 * L(M) = { w | M accepts w } for automaton-backed implementations.
 */
export interface Language {
  contains(word: string): boolean;
  getAutomaton(): FSA;
  /** Alphabet symbols (ε excluded). */
  getAlphabetSymbols(): string[];
}