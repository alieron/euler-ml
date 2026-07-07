declare const CodeMirror: {
  defineMode: (name: string, mode: () => unknown) => void;
};

CodeMirror.defineMode("euler-ml", () => ({
  startState: () => ({ inString: false }),
  token: (stream: any, state: { inString: boolean }) => {
    if (state.inString) {
      if (stream.skipTo('"')) {
        stream.next();
        state.inString = false;
      } else {
        stream.skipToEnd();
      }

      return "eml-label";
    }

    if (stream.peek() === '"') {
      stream.next();
      state.inString = true;
      return "eml-label";
    }

    if (stream.eatSpace()) return null;

    if (stream.match("//")) {
      stream.skipToEnd();
      return "eml-comment";
    }

    if (stream.match(/#[0-9a-fA-F]{3,8}\b/)) return "eml-color";
    if (stream.match(/\b(def|set|node)\b/)) return "eml-keyword";
    if (stream.match(/\b(width|height|padding|cornerRadius|concaveRadius|strokeWidth|nodeFontSize|setLabelFontSize|fillOpacity)\b/)) return "eml-setting";
    if (stream.match(/-?\d+(\.\d+)?(px)?\b/)) return "eml-value";
    if (stream.match(/[A-Za-z_][\w-]*/)) return "eml-id";

    stream.next();
    return null;
  },
}));
