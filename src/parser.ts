import { type EulerDiagram } from "./layout";

export const DEFAULT_SETTINGS = {
  width: 760,
  height: 640,
  padding: 72,
  cornerRadius: 28,
  concaveRadius: 18,
  strokeWidth: 2,
  nodeFontSize: 16,
  setLabelFontSize: 18,
  fillOpacity: 0.14,
};

export type Settings = typeof DEFAULT_SETTINGS;

export type ParsedDiagram = {
  settings: Settings;
  diagram: EulerDiagram;
};

type Token = { value: string; quoted: boolean };

export function parse(source: string): ParsedDiagram {
  const settings = { ...DEFAULT_SETTINGS };
  const diagram: EulerDiagram = { sets: [], nodes: [] };

  source.split("\n").forEach((rawLine, index) => {
    const line = stripComment(rawLine).trim();

    if (!line) {
      return;
    }

    const tokens = tokenize(line);
    const keyword = tokens[0]?.value;

    if (keyword === "def") {
      parseDef(tokens, settings, index + 1);
      return;
    }

    if (keyword === "set") {
      parseSet(tokens, diagram, index + 1);
      return;
    }

    if (keyword === "node") {
      parseNode(tokens, diagram, index + 1);
      return;
    }

    throw new Error(`Line ${index + 1}: expected def, set, or node`);
  });

  return { settings, diagram };
}

function parseDef(tokens: Token[], settings: Settings, line: number) {
  if (tokens.length < 3) {
    throw new Error(`Line ${line}: def requires a name and value`);
  }

  const name = tokens[1].value;
  const value = Number.parseFloat(tokens[2].value);

  if (!(name in settings)) {
    throw new Error(`Line ${line}: unknown setting "${name}"`);
  }

  if (!Number.isFinite(value)) {
    throw new Error(`Line ${line}: setting "${name}" must be a number`);
  }

  settings[name as keyof Settings] = value;
}

function parseSet(tokens: Token[], diagram: EulerDiagram, line: number) {
  if (tokens.length < 2) {
    throw new Error(`Line ${line}: set requires an id`);
  }

  const id = tokens[1].value;
  let label = id;
  let color: string | undefined;

  for (const token of tokens.slice(2)) {
    if (token.value.startsWith("#")) {
      color = token.value;
    } else {
      label = token.value;
    }
  }

  diagram.sets.push({ id, label, color });
}

function parseNode(tokens: Token[], diagram: EulerDiagram, line: number) {
  if (tokens.length < 2) {
    throw new Error(`Line ${line}: node requires an id`);
  }

  const id = tokens[1].value;
  let label = id;
  let color: string | undefined;
  let setTokens = tokens.slice(2);

  if (setTokens[0]?.quoted) {
    label = setTokens[0].value;
    setTokens = setTokens.slice(1);
  }

  const sets = setTokens.flatMap((token) => {
    if (token.value.startsWith("#")) {
      color = token.value;
      return [];
    }

    return [token.value];
  });

  diagram.nodes.push({ id, label, color, sets });
}

function stripComment(line: string) {
  let inString = false;

  for (let index = 0; index < line.length - 1; index++) {
    if (line[index] === '"') {
      inString = !inString;
    }

    if (!inString && line[index] === "/" && line[index + 1] === "/") {
      return line.slice(0, index);
    }
  }

  return line;
}

function tokenize(line: string) {
  const tokens: Token[] = [];
  let index = 0;

  while (index < line.length) {
    while (line[index] === " " || line[index] === "\t") {
      index += 1;
    }

    if (index >= line.length) {
      break;
    }

    if (line[index] === '"') {
      const start = ++index;

      while (index < line.length && line[index] !== '"') {
        index += 1;
      }

      tokens.push({ value: line.slice(start, index), quoted: true });
      index += 1;
      continue;
    }

    const start = index;

    while (index < line.length && line[index] !== " " && line[index] !== "\t") {
      index += 1;
    }

    tokens.push({ value: line.slice(start, index), quoted: false });
  }

  return tokens;
}
