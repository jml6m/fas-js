// @flow
import { State } from "../classes/State.js";

// Count number of instances for each string in an array - returns key/val pairs
export const count = (names: Array<string>): Object =>
  names.reduce((a, b) => Object.assign(a, { [b]: (a[b] || 0) + 1 }), {});

// Returns keys with value > 1
export const duplicates = (dict: Object): Array<string> => Object.keys(dict).filter(a => dict[a] > 1);

// Check for duplicate keys in a Set<State> input
export const checkStateDuplicates = (states: Set<State>) => {
  let check: Set<string> = new Set();
  for (const item of states) {
    if (check.has(item.name)) return true;
    check.add(item.name);
  }
  return false;
};

// Check whether inputSet is a subset of otherSet
export const isSubSet = (inputSet: Set<any>, otherSet: Set<any>): boolean => {
  if (inputSet.size > otherSet.size) return false;
  else {
    for (var elem of inputSet) {
      if (!otherSet.has(elem)) return false;
    }
    return true;
  }
};

// Flow hack - gets around problems with Map#get having possible void type
export const getOrDefault = (map: Map<any, any>, key: any, defaultValue: any) => {
  const val = map.get(key)
  return val == null ? defaultValue : val
}

export const instanceOf = (ctor: Function, obj: Object) => {
  return (obj instanceof ctor) ||
   (ctor.name && ctor.name === obj.constructor.name);
};
