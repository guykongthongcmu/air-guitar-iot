export const FEATURE_LEN = (21 * 20) / 2;

export function normalize(lm, aspect = 1) {
  const pts = lm.map(p => ({ x: p.x * aspect, y: p.y, z: p.z * aspect }));
  const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const size = d3(pts[0], pts[9]) || 1e-6;
  const out = [];
  for (let i = 0; i < 21; i++) {
    for (let j = i + 1; j < 21; j++) out.push(d3(pts[i], pts[j]) / size);
  }
  return out;
}

function dist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export class Knn {
  constructor(k = 5) {
    this.k = k;
    this.samples = [];
  }

  add(label, f) {
    this.samples.push({ label, f: f.map(v => Math.round(v * 10000) / 10000) });
  }

  count(label) {
    return this.samples.filter(s => s.label === label).length;
  }

  removeLabel(label) {
    this.samples = this.samples.filter(s => s.label !== label);
  }

  clear() {
    this.samples = [];
  }

  predict(f) {
    if (this.samples.length === 0) return { label: null, confidence: 0 };
    const near = this.samples
      .map(s => ({ label: s.label, d: dist(f, s.f) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, this.k);
    const votes = {};
    for (const n of near) {
      votes[n.label] = votes[n.label] || { n: 0, d: 0 };
      votes[n.label].n++;
      votes[n.label].d += n.d;
    }
    let best = null;
    for (const label of Object.keys(votes)) {
      const v = votes[label];

      if (!best || v.n > votes[best].n || (v.n === votes[best].n && v.d < votes[best].d)) best = label;
    }
    return { label: best, confidence: votes[best].n / near.length };
  }
}

export class Smoother {
  constructor(size = 7) {
    this.size = size;
    this.buf = [];
    this.last = { label: null, confidence: 0 };
  }

  setSize(n) {
    this.size = n;
    while (this.buf.length > n) this.buf.shift();
  }

  push(label, confidence = 0) {
    this.buf.push({ label, confidence });
    if (this.buf.length > this.size) this.buf.shift();
    const counts = new Map();
    for (const b of this.buf) counts.set(b.label, (counts.get(b.label) || 0) + 1);
    let top = this.last.label;
    let topN = counts.get(top) || 0;
    for (const [l, n] of counts) {
      if (n > topN) {
        top = l;
        topN = n;
      }
    }
    const mine = this.buf.filter(b => b.label === top);
    const conf = mine.reduce((a, b) => a + b.confidence, 0) / mine.length;

    this.last = { label: top, confidence: conf * (topN / this.buf.length) };
    return this.last;
  }

  reset() {
    this.buf = [];
    this.last = { label: null, confidence: 0 };
  }
}

export function evaluate(knn, test) {
  const labels = [];
  const add = l => {
    if (l && !labels.includes(l)) labels.push(l);
  };
  const matrix = {};
  for (const t of test) add(t.label);
  const preds = test.map(t => knn.predict(t.f).label);
  preds.forEach(add);
  for (const a of labels) {
    matrix[a] = {};
    for (const b of labels) matrix[a][b] = 0;
  }
  let correct = 0;
  test.forEach((t, i) => {
    const p = preds[i];
    if (p) matrix[t.label][p]++;
    if (p === t.label) correct++;
  });
  const perClass = labels
    .map(l => {
      const row = matrix[l];
      const n = Object.values(row).reduce((a, b) => a + b, 0);
      return { label: l, n, correct: row[l], acc: n ? row[l] / n : 0 };
    })
    .filter(c => c.n > 0);
  return { labels, matrix, perClass, total: test.length, correct, acc: test.length ? correct / test.length : 0 };
}

export function resultsText(res, k) {
  const lines = [];
  lines.push(`KNN k=${k}, test samples=${res.total}`);
  lines.push('chord,n,correct,accuracy');
  for (const c of res.perClass) lines.push(`${c.label},${c.n},${c.correct},${(c.acc * 100).toFixed(1)}%`);
  lines.push(`overall,${res.total},${res.correct},${(res.acc * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('confusion matrix (rows = true, columns = predicted)');
  lines.push(['true/pred', ...res.labels].join(','));
  for (const a of res.labels) lines.push([a, ...res.labels.map(b => res.matrix[a][b])].join(','));
  return lines.join('\n');
}
