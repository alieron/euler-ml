import { parse } from './parser';
import { renderCanvas } from './renderer';

export function renderAll(root: Document | Element = document): void {
  root.querySelectorAll('pre.euler-ml').forEach(block => {
    try {
      const wrapper = document.createElement('div');
      wrapper.className = 'euler-ml-wrapper';
      renderCanvas(wrapper, parse(block.textContent ?? ''));
      block.replaceWith(wrapper);
    } catch (err) {
      console.error('[euler-ml] Failed to render diagram:', err);
    }
  });
}

if (typeof document !== 'undefined') {
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', () => renderAll())
    : renderAll();
}
