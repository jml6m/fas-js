import { type State } from "../components/State";

// Count number of instances for each string in an array - returns key/val pairs
export const count = (names: string[]): Record<string, number> =>
  names.reduce((a, b) => Object.assign(a, { [b]: (a[b] || 0) + 1 }), {} as Record<string, number>);

// Returns keys with value > 1
export const duplicates = (dict: Record<string, number>): string[] =>
  Object.keys(dict).filter(a => dict[a] > 1);

// Equality function for Arrays containing primitive typed values
export const compare = (
  a1: Array<string | number | boolean>,
  a2: Array<string | number | boolean>
): boolean => {
  const s1 = new Set(a1);
  const s2 = new Set(a2);
  return s1.size === s2.size && [...s1].every(v => s2.has(v));
};

// Check for duplicate keys in a Set<State> input
export const checkStateDuplicates = (states: Set<State>): boolean => {
  const check: Set<string> = new Set();
  for (const item of states) {
    if (check.has(item.name)) return true;
    check.add(item.name);
  }
  return false;
};

export const getOrDefault = <K, V>(map: Map<K, V>, key: K, defaultValue: V): V => {
  const val = map.get(key);
  return val == null ? defaultValue : val;
};

const getConstructorName = (obj: object): string | undefined => {
  try {
    const prototype = Object.getPrototypeOf(obj) as { constructor?: unknown } | null;
    const ctor = prototype?.constructor;
    return typeof ctor === "function" && typeof ctor.name === "string" && ctor.name.length > 0
      ? ctor.name
      : undefined;
  } catch {
    return undefined;
  }
};

export const instanceOf = <T extends object, A extends unknown[]>(
  ctor: abstract new (...args: A) => T,
  obj: unknown
): obj is T => {
  if (obj == null || (typeof obj !== "object" && typeof obj !== "function")) return false;

  try {
    if (obj instanceof ctor) return true;
  } catch {
    return false;
  }

  let ctorName: string | undefined;
  try {
    ctorName = typeof ctor.name === "string" && ctor.name.length > 0 ? ctor.name : undefined;
  } catch {
    return false;
  }

  return Boolean(ctorName) && ctorName === getConstructorName(obj);
};

export const isSubsetOf = <T>(subset: Set<T>, superset: Set<T>): boolean => {
  for (const item of subset) {
    if (!superset.has(item)) return false;
  }
  return true;
};

export const isSupersetOf = <T>(superset: Set<T>, subset: Set<T>): boolean => {
  return isSubsetOf(subset, superset);
};