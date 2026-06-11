/**
 * Regression for demo graph highlighting — node lines only, not edge lines.
 */
import { createFSA } from "../src/modules";
import { assert } from "chai";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightStateInDot(dot, state) {
  const states = Array.isArray(state)
    ? state.slice().sort()
    : String(state)
        .split(",")
        .map(part => part.trim())
        .filter(Boolean)
        .sort();

  if (!states.length) {
    return dot;
  }

  let highlighted = dot;
  states.forEach(function (stateName) {
    const escaped = escapeRegExp(stateName);
    const pattern = new RegExp(
      "^(\\s*)(" + escaped + ")((?:\\s*\\[shape = doublecircle\\])?)\\s*;?\\s*$",
      "gm"
    );
    highlighted = highlighted.replace(pattern, function (
      _match,
      indent,
      name,
      acceptShape
    ) {
      if (acceptShape) {
        return (
          indent +
          name +
          ' [shape = doublecircle, style=filled, fillcolor="#fef08a"];'
        );
      }
      return indent + name + ' [style=filled, fillcolor="#fef08a"];';
    });
  });

  return highlighted;
}

describe("demo graph highlighting", function () {
  it("highlights node declarations without corrupting edge lines", function () {
    const fsa = createFSA(
      ["q1", "q2", "q3", "q4"],
      "01",
      [
        { from: "q1", to: "q1", input: "0" },
        { from: "q1", to: "q1,q2", input: "1" },
        { from: "q2", to: "q3", input: "0" },
        { from: "q2", to: "q3", input: "" },
        { from: "q3", to: "q4", input: "0" },
      ],
      "q1",
      ["q4"]
    );

    const dot = fsa.generateDigraph();
    const highlighted = highlightStateInDot(dot, ["q1", "q3", "q4"]);

    assert.include(highlighted, 'q1 [style=filled, fillcolor="#fef08a"];');
    assert.include(
      highlighted,
      'q4 [shape = doublecircle, style=filled, fillcolor="#fef08a"];'
    );
    assert.match(highlighted, /q1 -> q1 \[ label = "0/);
    assert.match(highlighted, /q3 -> q4 \[ label = "0/);
    assert.notMatch(highlighted, /q1 \[style=filled.*\] ->/);
  });
});