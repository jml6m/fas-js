import { type State, type Transition } from "../components";

/*
 * Lookup from an origin state and an input symbol to the transitions that leave it. It is built
 * once per transition set and reused, so a step looks its transitions up instead of searching
 * the whole set.
 */
export interface IndexedTransition {
  dest: State;
  // Position in the transition set. Results that combine several origins are put back in this
  // order, so they come out as a scan of the set would give them.
  order: number;
}

type TransitionIndex = Map<State, Map<string, IndexedTransition[]>>;

interface CacheEntry {
  size: number;
  index: TransitionIndex;
}

const cache = new WeakMap<Set<Transition>, CacheEntry>();

const build = (tfunc: Set<Transition>): TransitionIndex => {
  const index: TransitionIndex = new Map();
  let order = 0;
  for (const transition of tfunc) {
    let bySymbol = index.get(transition.origin);
    if (!bySymbol) {
      bySymbol = new Map();
      index.set(transition.origin, bySymbol);
    }
    const entry: IndexedTransition = { dest: transition.dest, order: order++ };
    const list = bySymbol.get(transition.input);
    if (list) list.push(entry);
    else bySymbol.set(transition.input, [entry]);
  }
  return index;
};

/*
 * The index for a transition set. It is rebuilt when the set has grown or shrunk since it was
 * built, so a transition added to or deleted from the set is seen by the next step. A set that
 * is changed without changing its size (one transition swapped for another, or a transition's
 * fields reassigned) is not noticed, and steps keep using the transitions as they were.
 */
export const transitionIndex = (tfunc: Set<Transition>): TransitionIndex => {
  const cached = cache.get(tfunc);
  if (cached && cached.size === tfunc.size) return cached.index;

  const index = build(tfunc);
  cache.set(tfunc, { size: tfunc.size, index });
  return index;
};

const NONE: readonly IndexedTransition[] = [];

// Transitions leaving `origin` on `input`, in transition-set order
export const transitionsFrom = (
  index: TransitionIndex,
  origin: State,
  input: string
): readonly IndexedTransition[] => index.get(origin)?.get(input) ?? NONE;
