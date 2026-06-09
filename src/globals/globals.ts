import { State } from "../components/State";

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

export const instanceOf = (ctor: Function, obj: object): boolean => {
  return obj instanceof ctor || (Boolean(ctor.name) && ctor.name === obj.constructor.name);
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