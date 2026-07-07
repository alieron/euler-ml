import "./editor.css";
import "./syntax-highlight";
import { parse } from "./parser";
import { renderSVG } from "./renderer";

declare global {
  interface Window {
    CodeMirror: any;
  }
}

const initialCode = `def width 980
def height 760
def padding 96
def cornerRadius 30
def concaveRadius 18
def nodeFontSize 13
def setLabelFontSize 16

set algo "Algorithms & Theory" #f87171
set ai "Artificial Intelligence" #60a5fa
set graphics "Computer Graphics" #34d399
set security "Computer Security" #fbbf24
set networks "Networking & Distributed Systems" #c084fc
set parallel "Parallel Computing" #22d3ee

node CS2105 networks
node CS2107 security
node CS2109S ai
node CS3103 networks
node CS3210 parallel
node CS3211 parallel
node CS3218 graphics
node CS3221 security
node CS3230 algo
node CS3231 algo
node CS3233 algo
node CS3235 security
node CS3236 algo
node CS3237 networks
node CS3240 graphics
node CS3241 graphics
node CS3242 graphics
node CS3243 ai
node CS3244 ai
node CS3247 graphics
node CS3249 graphics
node CS3263 ai
node CS3264 ai
node CS3268 ai
node CS4220 ai
node CS4222 networks
node CS4223 parallel
node CS4226 networks
node CS4230 security
node CS4231 algo networks parallel
node CS4232 algo
node CS4234 algo
node CS4236 security
node CS4238 security
node CS4239 security
node CS4240 graphics
node CS4243 ai graphics
node CS4244 ai
node CS4246 ai
node CS4247 graphics
node CS4248 ai
node CS4249 graphics
node CS4257 algo security
node CS4261 algo ai
node CS4262 ai
node CS4263 ai
node CS4268 algo
node CS4269 algo ai
node CS4276 security
node CS4277 ai
node CS4278 ai
node CS4330 algo
node CS4344 networks
node CS4350 graphics
node CS4351 graphics
node CS4430 algo
node CS5215 ai
node CS5222 parallel
node CS5223 networks parallel
node CS5224 networks parallel
node CS5228 ai
node CS5229 networks
node CS5230 algo
node CS5231 security
node CS5234 algo
node CS5236 algo
node CS5237 algo graphics
node CS5238 algo
node CS5239 parallel
node CS5240 graphics
node CS5242 ai
node CS5248 networks
node CS5250 security parallel
node CS5260 ai
node CS5321 security networks
node CS5322 security
node CS5330 algo
node CS5331 security
node CS5332 security
node CS5339 ai
node CS5340 ai
node CS5343 graphics
node CS5346 graphics
node IFS4101 security
node IFS4102 security
node IFS4103 security`;

document.body.innerHTML = `
  <header>
    <h1>euler-ml</h1>
    <p class="subtitle">Interactive Euler Diagram Editor</p>
  </header>
  <main>
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Code Editor</span>
        <button class="copy-btn" id="copyCode" type="button">Copy Code</button>
      </div>
      <div class="panel-content"><div id="editor"></div></div>
    </div>
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">SVG Preview</span>
        <div>
          <button class="copy-btn" id="copyPNG" type="button">Copy PNG</button>
          <button class="copy-btn" id="copySVG" type="button">Copy SVG</button>
        </div>
      </div>
      <div class="panel-content"><div id="preview"></div></div>
    </div>
  </main>`;

const preview = getElement("preview");
const copyCodeButton = getElement("copyCode");
const copyPngButton = getElement("copyPNG");
const copySvgButton = getElement("copySVG");
const editor = window.CodeMirror(getElement("editor"), {
  value: initialCode,
  mode: "euler-ml",
  lineNumbers: true,
  autofocus: true,
  tabSize: 2,
  indentUnit: 2,
  viewportMargin: Infinity,
});

let currentSvg = "";

render();

let renderTimeout: number | undefined;
editor.on("change", () => {
  window.clearTimeout(renderTimeout);
  renderTimeout = window.setTimeout(render, 250);
});

copyCodeButton.addEventListener("click", () => copyText(copyCodeButton, editor.getValue(), "Copy Code"));
copySvgButton.addEventListener("click", () => copyText(copySvgButton, currentSvg, "Copy SVG"));
copyPngButton.addEventListener("click", copyPng);

function render() {
  try {
    currentSvg = renderSVG(parse(editor.getValue()));
    preview.innerHTML = `<div class="euler-ml-wrapper">${currentSvg}</div>`;
  } catch (error) {
    currentSvg = "";
    preview.innerHTML = `<div class="error">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
  }
}

async function copyText(button: HTMLElement, value: string, label: string) {
  if (!value) {
    return;
  }

  await navigator.clipboard.writeText(value);
  markCopied(button, label);
}

async function copyPng() {
  const svg = preview.querySelector("svg");

  if (!svg) {
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const image = new Image();
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" }));

  if (!context) {
    URL.revokeObjectURL(url);
    return;
  }

  canvas.width = svg.width.baseVal.value;
  canvas.height = svg.height.baseVal.value;

  image.onload = () => {
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        return;
      }

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      markCopied(copyPngButton, "Copy PNG");
    }, "image/png");
  };
  image.src = url;
}

function markCopied(button: HTMLElement, label: string) {
  button.textContent = "Copied!";
  button.classList.add("copied");
  window.setTimeout(() => {
    button.textContent = label;
    button.classList.remove("copied");
  }, 1500);
}

function getElement(id: string) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing #${id}`);
  }

  return element;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
