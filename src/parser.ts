export interface EulerSet {
  id: string;
  label: string;
  color: string;
}

export interface EulerItem {
  id: string;
  label: string;
  sets: string[];
}

export interface EulerDiagram {
  sets: EulerSet[];
  items: EulerItem[];
}

const colors = ['#2F80ED', '#27AE60', '#EB5757', '#F2C94C', '#9B51E0', '#56CCF2'];

function words(src: string): string[] {
  return [...src.matchAll(/"([^"]+)"|(\S+)/g)].map(m => m[1] ?? m[2]);
}

export function parse(src: string): EulerDiagram {
  const sets: EulerSet[] = [];
  const items: EulerItem[] = [];

  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;

    const w = words(line);
    if (w[0] === 'set') {
      const id = w[1];
      const color = w.find(x => x.startsWith('#'));
      const label = w[2]?.startsWith('#') ? id : (w[2] ?? id);
      sets.push({ id, label, color: color ?? colors[sets.length % colors.length] });
    }

    if (w[0] === 'category') {
      const color = w.find(x => x.startsWith('#'));
      const body = w.slice(1).filter(x => !x.startsWith('#'));
      const id = body[1] ?? body[0];
      sets.push({ id, label: body[0], color: color ?? colors[sets.length % colors.length] });
    }

    if (w[0] === 'node') {
      const at = w.indexOf('in');
      items.push({ id: w[1], label: w[1], sets: w.slice(at + 1) });
    }

    if (w[0] === 'item') {
      const at = w.indexOf('in');
      const hasId = at > 2;
      const id = hasId ? w[1] : w[1].toLowerCase().replace(/\W+/g, '-');
      const label = hasId ? w[2] : w[1];
      items.push({ id, label, sets: w.slice(at + 1) });
    }
  }

  return { sets, items };
}
