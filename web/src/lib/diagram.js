const SHAPES = { C: 'x32010', G: '320003', Am: 'x02210', F: 'xx3211', Em: '022000', Dm: 'xx0231' };

export function diagram(name, w, h) {
  const shape = SHAPES[name];
  if (!shape) return null;
  const px = w * 0.1, top = h * 0.17, bot = h - 2;
  const sw = (w - 2 * px) / 5, fh = (bot - top) / 4;
  const strings = [], frets = [], dots = [], marks = [];
  for (let i = 0; i < 6; i++) strings.push({ x: px + i * sw, y1: top, y2: bot });
  for (let j = 0; j <= 4; j++) frets.push({ y: top + j * fh, x1: px, x2: w - px, sw: j === 0 ? 4 : 1.3 });
  shape.split('').forEach((c, i) => {
    const x = px + i * sw;
    if (c === 'x') marks.push({ x, y: top - 8, t: 'x' });
    else if (c === '0') marks.push({ x, y: top - 8, t: 'o' });
    else dots.push({ cx: x, cy: top + (+c - 0.5) * fh, r: Math.min(sw, fh) * 0.36 });
  });
  return { vb: `0 0 ${w} ${h}`, strings, frets, dots, marks, shape };
}

export function splitChord(n) {
  return { root: n ? n[0] : '', qual: n ? n.slice(1) : '' };
}
