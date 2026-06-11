/**
 * Base class for formal languages characterized by membership testing.
 *
 * L(M) = { w | M accepts w } for automaton-backed subclasses such as
 * {@link RegularLanguage}. Future non-regular language types (e.g. context-free)
 * should extend this class directly, not {@link RegularLanguage}.
 */
export abstract class Language {
  abstract contains(word: string): boolean;

  /** Alphabet symbols (ε excluded). */
  abstract getAlphabetSymbols(): string[];

  /** Discriminator, e.g. `regular` — used before v2 adds further classes. */
  abstract getClassification(): string;
}