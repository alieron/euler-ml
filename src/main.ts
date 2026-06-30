import { renderGraph } from "./graph";
import { type EulerDiagram, getLayout } from "./layout";

const diagram: EulerDiagram = {
  sets: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ],
  nodes: [
    { id: "a-only", label: "a1", sets: ["a"] },
    { id: "b-only", label: "b", sets: ["b"] },
    { id: "c-only", label: "c", sets: ["c"] },
    { id: "a-b", label: "ab", sets: ["a", "b"] },
    { id: "b-c", label: "bc", sets: ["b", "c"] },
    { id: "a-c", label: "ac", sets: ["a", "c"] },
  ],
};

renderGraph(getLayout(diagram));
