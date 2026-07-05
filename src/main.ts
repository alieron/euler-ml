import { renderGraph } from "./graph";
import { type EulerDiagram, type EulerNode, getLayout } from "./layout";

const diagrams: EulerDiagram[] = [
  {
    sets: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ],
    nodes: [
      node("a-only", "a1", ["a"]),
      node("b-only", "b", ["b"]),
      node("c-only", "c", ["c"]),
      node("a-b", "ab", ["a", "b"]),
      node("b-c", "bc", ["b", "c"]),
      node("a-c", "ac", ["a", "c"]),
      node("a-b-c", "abc", ["a", "b", "c"]),
    ],
  },
  {
    sets: [{ id: "a", label: "A" }],
    nodes: [
      node("a1", "a1", ["a"]),
      node("a2", "a2", ["a"]),
      node("a3", "a3", ["a"]),
      node("a4", "a4", ["a"]),
      node("a5", "a5", ["a"]),
      node("a6", "a6", ["a"]),
    ],
  },
  {
    sets: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
      { id: "e", label: "E" },
      { id: "f", label: "F" },
    ],
    nodes: [
      node("a", "A", ["a"]),
      node("b", "B", ["b"]),
      node("c", "C", ["c"]),
      node("d", "D", ["d"]),
      node("e", "E", ["e"]),
      node("f", "F", ["f"]),
    ],
  },
  {
    sets: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    nodes: [
      node("a", "A", ["a"]),
      node("ab", "AB", ["a", "b"]),
      node("abc", "ABC", ["a", "b", "c"]),
      node("abcd", "ABCD", ["a", "b", "c", "d"]),
      node("bcd", "BCD", ["b", "c", "d"]),
      node("cd", "CD", ["c", "d"]),
      node("d", "D", ["d"]),
    ],
  },
  {
    sets: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    nodes: [
      node("a", "A", ["a"]),
      node("b", "B", ["b"]),
      node("c", "C", ["c"]),
      node("d", "D", ["d"]),
      node("ab", "AB", ["a", "b"]),
      node("ac", "AC", ["a", "c"]),
      node("ad", "AD", ["a", "d"]),
      node("bc", "BC", ["b", "c"]),
      node("bd", "BD", ["b", "d"]),
      node("cd", "CD", ["c", "d"]),
      node("abc", "ABC", ["a", "b", "c"]),
      node("abd", "ABD", ["a", "b", "d"]),
      node("acd", "ACD", ["a", "c", "d"]),
      node("bcd", "BCD", ["b", "c", "d"]),
      node("abcd", "ABCD", ["a", "b", "c", "d"]),
    ],
  },
  {
    sets: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ],
    nodes: [
      node("outside1", "out1", []),
      node("outside2", "out2", []),
      node("a", "A", ["a"]),
      node("b", "B", ["b"]),
      node("c", "C", ["c"]),
      node("ab", "AB", ["a", "b"]),
      node("abc", "ABC", ["a", "b", "c"]),
    ],
  },
  {
    sets: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    nodes: [
      node("a1", "a1", ["a"]),
      node("a2", "a2", ["a"]),
      node("ab", "AB", ["a", "b"]),
      node("bridge", "BC", ["b", "c"]),
      node("cd", "CD", ["c", "d"]),
      node("d1", "d1", ["d"]),
      node("d2", "d2", ["d"]),
    ],
  },
];

let diagramIndex = 0;

renderCurrentDiagram();

function node(id: string, label: string, sets: string[]): EulerNode {
  return { id, label, sets };
}

function renderCurrentDiagram() {
  renderGraph(getLayout(diagrams[diagramIndex]));
  addControls();
}

function addControls() {
  const previous = createButton("<", "left", () => {
    diagramIndex = (diagramIndex - 1 + diagrams.length) % diagrams.length;
    renderCurrentDiagram();
  });
  const next = createButton(">", "right", () => {
    diagramIndex = (diagramIndex + 1) % diagrams.length;
    renderCurrentDiagram();
  });

  document.body.append(previous, next);
}

function createButton(label: string, side: "left" | "right", onClick: () => void) {
  const button = document.createElement("button");
  button.textContent = label;
  button.type = "button";
  button.style.position = "fixed";
  button.style.top = "50%";
  button.style[side] = "20px";
  button.style.transform = "translateY(-50%)";
  button.style.width = "40px";
  button.style.height = "40px";
  button.style.border = "1px solid #666";
  button.style.background = "#111";
  button.style.color = "#fff";
  button.style.font = "24px system-ui, sans-serif";
  button.style.cursor = "pointer";
  button.addEventListener("click", onClick);

  return button;
}
