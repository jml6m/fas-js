# Finite Automaton Simulator

[![npm version](https://badge.fury.io/js/fas-js.svg)](https://badge.fury.io/js/fas-js)
[![devDependencies Status](https://david-dm.org/jml6m/fas-js/dev-status.svg)](https://david-dm.org/jml6m/fas-js?type=dev)
[![Known Vulnerabilities](https://snyk.io/test/github/jml6m/fas-js/badge.svg)](https://snyk.io/test/github/jml6m/fas-js)
[![codecov](https://codecov.io/gh/jml6m/fas-js/branch/master/graph/badge.svg)](https://codecov.io/gh/jml6m/fas-js)
[![downloads](https://img.shields.io/npm/dm/fas-js.svg)](https://npmjs.org/package/fas-js)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/fas-js/badge)](https://www.jsdelivr.com/package/npm/fas-js)

Easily create and simulate state machines using this JS library. Import into your own server side or browser based JS application.

![FSA Example](img/fsa_example.png)
###### Visualization of an FSA

## Installation
Add the latest version of `fas-js` to your package.json:
```
npm install fas-js --save-dev
```

Import the ES6 module:
```
var fas_js = require('fas-js');
```

Import into HTML file
```
<script src="https://cdn.jsdelivr.net/npm/fas-js/lib/bundle.js"></script>
```

## Background
A finite automaton is a formally defined state machine, a concept that can then be expanded on to build more complex and powerful computational machines. I highly recommend the book "Introduction to the Theory of Computation" by Michael Sipser if you want to learn more about FSAs and related concepts.

A **Finite State Automaton (FSA)** is defined as a 5-tuple (Q, Σ, δ, q0, F) where:

1. Q is a finite set called **states**
2. Σ is a finite set called **alphabet**
3. δ: Q x Σ → Q is the **transition function**
4. q0 ∈ Q is the **start state**
5. F ⊆ Q is the set of **accept states**

An FSA can be conceptualized as a [Directed Graph](https://en.wikipedia.org/wiki/Directed_graph), or more specifically, an [Oriented Graph](https://en.wikipedia.org/wiki/Orientation_(graph_theory)). It's often visualized in this way for teaching and demonstration purposes. It is also important to understand [Sets](https://en.wikipedia.org/wiki/Set_(mathematics)) and their logical operators when working with FSAs.

A **Deterministic Finite Automaton (DFA)** has exactly one transition for each symbol on every state. A **Nondeterministic Finite Automaton (NFA)** may have any number of transitions (including no transition) for an input symbol on any given state. NFAs may also include an ε-transition, a transition that occurs without consuming an input symbol. By definition, all DFAs are also NFAs. It also follows that all NFAs can be represented as a DFA.

## Creation
This library offers one method for creating an FSA. The parameters correspond to the definition above:

<span style="font-size:20px"><a name="createFSA" href="#createFSA">#</a> <b>createFSA</b>(<i>Q</i>: string[], <i>Σ</i>: string | string[], <i>δ</i>: Object[], <i>q0</i>: string, <i>F</i>: string[]): FSA [<>](https://github.com/jml6m/fas-js/blob/master/src/utils/FSAUtils.js#L125 "Source")</span>

### Inputs
<b>Q</b> cannot be empty, and each state name must be unique
```javascript
const states = ["q1", "q2"];
const states2 = ["q1", "q2", "q3", "q4"];
```
<b>Σ</b> cannot be empty, and can be passed in as one string (each character will be interpreted as a separate symbol) or a string array. Cannot contain duplicate symbols. For NFAs, you do not need to specify the empty string, it is implicitly added.
```javascript
const alphabet = "01"; // ["0", "1"]
const alph_array = ["0", "1", "up", "down", "*"];
```
<b>δ</b> is an array of objects that define the transitions between states. This object differs for DFAs and NFAs, and createFSA() will determine which to create based on the structure of this input.
* For DFA: `{from: "origin_state", to: "dest_state", input: "symbol"}`
* For NFA: `{from: "origin_state", to: "dest_state1,dest_state2,...", input: "symbol"}`

Input array for DFAs must contain a transition for each alphabet symbol on each origin state. Thus, the size of δ = size of Σ x size of Q. Σ cannot contain an empty string as a symbol for DFAs.

For NFAs, the `to` field can contain one or more destination states, comma separated, no spaces between state names. The `input` field can be `""`, indicating an ε (empty) transition.
```javascript
const dfa_tfunc = [
    { from: "q1", to: "q2", input: "1" },
    { from: "q2", to: "q1", input: "0" },
    { from: "q2", to: "q2", input: "1" },
    { from: "q1", to: "q1", input: "0" }
];

const nfa_tfunc = = [
    { from: "q1", to: "q1", input: "0" },
    { from: "q1", to: "q1,q2", input: "1" },
    { from: "q2", to: "q3", input: "0" },
    { from: "q2", to: "q3", input: "" },
    { from: "q3", to: "q4", input: "1" },
    { from: "q4", to: "q4", input: "0" },
    { from: "q4", to: "q4", input: "1" }
];
```
<b>q0</b> is the start state of the FSA. The first symbol of the input string is processed on this state. It must be a member of Q.
```javascript
const start = "q1";
```
<b>F</b> is the set of accept states, which determine whether a given input string is "accepted" by the FSA or "rejected". This determination is made after the last symbol of the input has been read. If any of the final states are in the accepting set, that string is accepted.

The set of accept states must be a subset of Q - it can also be an empty set (an FSA that always rejects). For simulation purposes, F is passed in as a string array that cannot contain duplicate states
```javascript
const accepts = ["q1"]; // Start state can also be an accept state
const accepts2 = ["q3", "q4"];
```
### Examples
```javascript
const dfa = createFSA(states, alphabet, dfa_tfunc, start, accepts);
const nfa = createFSA(states2, alphabet, nfa_tfunc, start, accepts2);
```
<span style="font-size:24px"><a name="FSA" href="#FSA">#</a> <b>FSA</b></span><br />
`createFSA()` returns an object with custom type. This object has no public properties, but does include helper methods available to the user.

<span style="font-size:18px"><b>getType</b>(): string</span> - returns either `"DFA"` or `"NFA"`

<span style="font-size:18px"><b>generateDigraph</b>(): string</span> - returns digraph according to [DOT](https://www.graphviz.org/doc/info/lang.html) language to be used for visualization.

## Simulation
There are two simulation options available:<br />

<span style="font-size:18px"><a name="simulateFSA" href="#simulateFSA">#</a> <b>simulateFSA</b>(<i>w</i>: string | string[], <i>fsa</i>: FSA, <i>logging</i>: boolean = false, <i>returnEndState</i>: boolean = false) [<>](https://github.com/jml6m/fas-js/blob/master/src/engine/Simulators.js#L10 "Source")</span>

Runs the entire input `w` through the `fsa`. `w` must only contain symbols from the alphabet defined in `fsa`. By default, the function returns a boolean signifying whether `w` was accepted by the `fsa`. If `returnEndState` is set to true, the function will instead return the final state (string) or the final array of states (string[]), depending on whether `fsa` is a DFA or NFA.

<span style="font-size:18px"><a name="stepOnceFSA" href="#stepOnceFSA">#</a> <b>stepOnceFSA</b>(w: string, qin: string | string[], fsa: FSA, logging: boolean = false) [<>](https://github.com/jml6m/fas-js/blob/master/src/engine/Simulators.js#L23 "Source")</span>

Returns the destination state(s), based on input symbol `w` and input state `qin`, as defined by δ of `fsa`. `w` must match a symbol from the alphabet defined in `fsa` (can also be the empty string). `qin` must be a state in Q. Use this function if you'd like to iterate through an input string step-by-step.

<sub>Note: In both functions above, a third `logging` parameter is available (defaults to false) which will print useful messages to the console as the simulator processes the input string. This can be used for debugging purposes or server-side logs. It is recommended to leave it defaulted to false for browser applications.

### Examples
Both simulators require an FSA object created with createFSA(). Here we will use the FSAs created in the [Examples](#Examples) above.
```javascript
// DFA Simulations
simulateFSA("0", dfa); // returns true
simulateFSA("01", dfa); // returns false
simulateFSA("", dfa); // returns true
simulateFSA("011", dfa, false, true); // returnEndState enabled, returns "q2"

stepOnceFSA("0", "q1", dfa); // returns "q1"
stepOnceFSA("1", "q1", dfa); // returns "q2"

// NFA Simulations
simulateFSA("0", nfa); // returns false
simulateFSA("01", nfa); // returns true
simulateFSA("0100", nfa); // returns false
simulateFSA("011", nfa, false, true); // returnEndState enabled, returns ["q1", "q2", "q3", "q4"]

stepOnceFSA("1", "q1", nfa); // returns ["q1", "q2", "q3"]
stepOnceFSA("0", ["q1","q2","q3"], nfa); // returns ["q1", "q3"]

// Step through an input string w on DFA
const w = "01101";
let inputState = start;
for (const symbol of w) {
    inputState = stepOnceFSA(symbol, inputState, dfa);
}
// Now, check for acceptance
if(accepts.indexOf(inputState) !== -1)
    console.log("Accepted!");
else
    console.log("Rejected!");

```

## Demo
This library provides an engine that creates and simulates an FSA. The demo below provides a UI that utilizes this engine and visualizes the FSA as it's being processed. It's a great way to learn about FSAs and experiment with your own FSA creations! The UI and graph visualizations were built using [preact](https://github.com/developit/preact), [d3.js](https://github.com/d3/d3), and [d3-graphviz](https://github.com/magjac/d3-graphviz).

[Demo on ObservableHQ](https://beta.observablehq.com/@jml6m/state-machine-simulator) (Learn more about ObservableHQ [here](https://beta.observablehq.com/collection/@observablehq/introduction))

## License
This library is distributed under the GPL 3.0 license found in the [LICENSE](https://github.com/jml6m/fas-js/blob/master/LICENSE) file.
