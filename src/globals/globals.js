// @flow
import { State } from "../components/State.js";

// Count number of instances for each string in an array - returns key/val pairs
export const count = (names: Array<string>): Object =>
  names.reduce((a, b) => Object.assign(a, { [b]: (a[b] || 0) + 1 }), {});

// Returns keys with value > 1
export const duplicates = (dict: Object): Array<string> => Object.keys(dict).filter(a => dict[a] > 1);

// Equality function for Arrays containing primitive typed values
export const compare = (a1: Array<string | number | boolean>, a2: Array<string | number | boolean>): boolean => {
  const s1 = new Set(a1);
  const s2 = new Set(a2);
  return s1.size === s2.size && [...s1].every(v => s2.has(v));
};

// Check for duplicate keys in a Set<State> input
export const checkStateDuplicates = (states: Set<State>) => {
  let check: Set<string> = new Set();
  for (const item of states) {
    if (check.has(item.name)) return true;
    check.add(item.name);
  }
  return false;
};

// Flow hack - gets around problems with Map#get having possible void type
export const getOrDefault = (map: Map<any, any>, key: any, defaultValue: any) => {
  const val = map.get(key);
  return val == null ? defaultValue : val;
};

export const instanceOf = (ctor: Function, obj: Object) => {
  return obj instanceof ctor || (ctor.name && ctor.name === obj.constructor.name);
};
