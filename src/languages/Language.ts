/**
 * Base class for formal languages characterized by membership testing.
 *
 * L(M) = { w | M accepts w } for automaton-backed subclasses such as
 * {@link RegularLanguage}. Future non-regular language types (e.g. context-free)
 * should extend this class directly, not {@link RegularLanguage}.
 */

/** Atomic alphabet symbol. ε is never included in {@link Language.getAlphabetSymbols}. */
export type AlphabetSymbol = string;

/**
 * Word over an alphabet — mirrors `simulateFSA`'s `w` parameter:
 * - `string`: each JS string element (code unit / BMP char) is one symbol
 * - `readonly string[]`: explicit symbol sequence (required for multi-char symbols)
 */
export type Word = string | readonly string[];

/**
 * Language-class discriminator. Extend this union when a new {@link Language}
 * subclass is introduced — free `string` would accept nonsense like `"absweb"`.
 */
export type LanguageClassification = "regular";

export abstract class Language {
  abstract contains(word: Word): boolean;

  /** Alphabet symbols (ε excluded). */
  abstract getAlphabetSymbols(): readonly AlphabetSymbol[];

  abstract getClassification(): LanguageClassification;
}
