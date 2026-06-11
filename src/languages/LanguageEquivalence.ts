import { type RegularLanguage } from "./RegularLanguage";

function enumerateWords(alphabet: string[], maxLength: number): string[] {
  if (alphabet.length === 0) {
    return [""];
  }

  const words = new Set<string>([""]);

  for (let length = 1; length <= maxLength; length += 1) {
    const previous = [...words].filter(word => word.length === length - 1);
    for (const base of previous) {
      for (const symbol of alphabet) {
        words.add(base + symbol);
      }
    }
  }

  return [...words].sort((left, right) => {
    if (left.length !== right.length) return left.length - right.length;
    return left.localeCompare(right);
  });
}

/**
 * Bounded equivalence check for tests — not part of the public npm API.
 */
export function languagesEquivalent(
  left: RegularLanguage,
  right: RegularLanguage,
  maxWordLength = 6
): boolean {
  const alphabet = [...new Set([...left.getAlphabetSymbols(), ...right.getAlphabetSymbols()])].sort();

  for (const word of enumerateWords(alphabet, maxWordLength)) {
    if (left.contains(word) !== right.contains(word)) {
      return false;
    }
  }

  return true;
}

export function membershipMatchesOperationalUnion(
  left: RegularLanguage,
  right: RegularLanguage,
  union: RegularLanguage,
  maxWordLength = 6
): boolean {
  const alphabet = [...new Set([...left.getAlphabetSymbols(), ...right.getAlphabetSymbols()])].sort();

  for (const word of enumerateWords(alphabet, maxWordLength)) {
    const expected = left.contains(word) || right.contains(word);
    if (union.contains(word) !== expected) {
      return false;
    }
  }

  return true;
}

export function membershipMatchesOperationalConcat(
  left: RegularLanguage,
  right: RegularLanguage,
  concat: RegularLanguage,
  maxWordLength = 5
): boolean {
  const alphabet = [...new Set([...left.getAlphabetSymbols(), ...right.getAlphabetSymbols()])].sort();

  for (const combined of enumerateWords(alphabet, maxWordLength * 2)) {
    let expected = false;

    for (let split = 0; split <= combined.length; split += 1) {
      const leftWord = combined.slice(0, split);
      const rightWord = combined.slice(split);
      if (left.contains(leftWord) && right.contains(rightWord)) {
        expected = true;
        break;
      }
    }

    if (concat.contains(combined) !== expected) {
      return false;
    }
  }

  return true;
}

export function membershipMatchesOperationalStar(
  source: RegularLanguage,
  star: RegularLanguage,
  maxWordLength = 5
): boolean {
  const alphabet = source.getAlphabetSymbols();

  for (const word of enumerateWords(alphabet, maxWordLength)) {
    if (matchesStarDefinition(word, source)) {
      if (!star.contains(word)) {
        return false;
      }
    } else if (star.contains(word)) {
      return false;
    }
  }

  return true;
}

function matchesStarDefinition(word: string, source: RegularLanguage): boolean {
  if (word === "") {
    return true;
  }

  const alphabet = source.getAlphabetSymbols();
  const lengths = enumerateWordSplitLengths(word.length);

  for (const chunkCount of lengths) {
    if (wordMatchesChunkedLanguage(word, source, chunkCount, alphabet)) {
      return true;
    }
  }

  return false;
}

function enumerateWordSplitLengths(wordLength: number): number[] {
  const counts: number[] = [];
  for (let count = 1; count <= wordLength; count += 1) {
    counts.push(count);
  }
  return counts;
}

function wordMatchesChunkedLanguage(
  word: string,
  source: RegularLanguage,
  chunkCount: number,
  alphabet: string[]
): boolean {
  const boundaries = buildBoundaries(word.length, chunkCount);
  if (boundaries.length === 0) {
    return false;
  }

  for (const boundarySet of boundaries) {
    let valid = true;
    let start = 0;

    for (const end of boundarySet) {
      const chunk = word.slice(start, end);
      if (!isChunkInAlphabet(chunk, alphabet) || !source.contains(chunk)) {
        valid = false;
        break;
      }
      start = end;
    }

    if (valid) {
      return true;
    }
  }

  return false;
}

function isChunkInAlphabet(chunk: string, alphabet: string[]): boolean {
  if (chunk === "") {
    return true;
  }
  for (const symbol of chunk) {
    if (!alphabet.includes(symbol)) {
      return false;
    }
  }
  return true;
}

function buildBoundaries(wordLength: number, chunkCount: number): number[][] {
  if (chunkCount === 1) {
    return [[wordLength]];
  }

  const results: number[][] = [];

  function walk(position: number, remainingChunks: number, current: number[]) {
    if (remainingChunks === 1) {
      if (position < wordLength) {
        results.push([...current, wordLength]);
      }
      return;
    }

    for (let next = position + 1; next <= wordLength - (remainingChunks - 1); next += 1) {
      walk(next, remainingChunks - 1, [...current, next]);
    }
  }

  walk(0, chunkCount, []);
  return results;
}