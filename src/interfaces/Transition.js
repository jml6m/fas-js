// @flow
export interface Transition<A, B, C> {
  origin: A;
  dest: B;
  input: C;
}