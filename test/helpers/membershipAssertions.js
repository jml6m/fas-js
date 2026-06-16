/** Test-only: apply textbook set definitions to explicit witness word lists. */
import { assert } from "chai";

export function assertSameMembership(left, right, words) {
  for (const word of words) {
    assert.equal(
      left.contains(word),
      right.contains(word),
      `membership for "${word}"`
    );
  }
}

export function assertUnionMembership(left, right, union, words) {
  for (const word of words) {
    const expected = left.contains(word) || right.contains(word);
    assert.equal(union.contains(word), expected, `union membership for "${word}"`);
  }
}

export function assertConcatMembership(left, right, concat, words) {
  for (const word of words) {
    let expected = false;
    for (let split = 0; split <= word.length; split += 1) {
      const leftWord = word.slice(0, split);
      const rightWord = word.slice(split);
      if (left.contains(leftWord) && right.contains(rightWord)) {
        expected = true;
        break;
      }
    }
    assert.equal(concat.contains(word), expected, `concat membership for "${word}"`);
  }
}

export function assertStarMembership(source, star, words) {
  for (const word of words) {
    const expected = matchesStarDefinition(word, source);
    assert.equal(star.contains(word), expected, `star membership for "${word}"`);
  }
}

function matchesStarDefinition(word, source) {
  if (word === "") return true;

  const alphabet = source.getAlphabetSymbols();

  for (let chunkCount = 1; chunkCount <= word.length; chunkCount += 1) {
    if (wordMatchesChunkedLanguage(word, source, chunkCount, alphabet)) {
      return true;
    }
  }

  return false;
}

function wordMatchesChunkedLanguage(word, source, chunkCount, alphabet) {
  const boundaries = buildBoundaries(word.length, chunkCount);
  if (boundaries.length === 0) return false;

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

    if (valid) return true;
  }

  return false;
}

function isChunkInAlphabet(chunk, alphabet) {
  if (chunk === "") return true;
  for (const symbol of chunk) {
    if (!alphabet.includes(symbol)) return false;
  }
  return true;
}

function buildBoundaries(wordLength, chunkCount) {
  if (chunkCount === 1) return [[wordLength]];

  const results = [];

  function walk(position, remainingChunks, current) {
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