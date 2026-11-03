import assert from 'node:assert/strict';
import { normalize, FEATURE_LEN, Knn, Smoother, evaluate, resultsText } from '../src/lib/classifier.js';
import { parseStrum, parseButton, MqttLink } from '../src/lib/mqtt.js';

function rnd(a) { return (Math.random() - 0.5) * a; }
const bases = {};
for (const c of ['C', 'G', 'Am', 'F', 'idle']) {
  bases[c] = Array.from({ length: 21 }, () => ({ x: Math.random(), y: Math.random(), z: rnd(0.2) }));
  bases[c][0] = { x: 0.5, y: 0.5, z: 0 };
  bases[c][9] = { x: 0.5, y: 0.3, z: 0 };
}
function hand(c) {
  const s = 0.5 + Math.random() * 1.5, ox = Math.random(), oy = Math.random();
  return bases[c].map(p => ({ x: (p.x - 0.5) * s + ox + rnd(0.02), y: (p.y - 0.5) * s + oy + rnd(0.02), z: p.z * s + rnd(0.02) }));
}

const h = hand('C');
const a = normalize(h);
const b = normalize(h.map(p => ({ x: p.x * 3 + 5, y: p.y * 3 - 2, z: p.z * 3 })));
a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9));
assert.equal(a.length, FEATURE_LEN);

const ang = 0.7, cs = Math.cos(ang), sn = Math.sin(ang);
const r = normalize(h.map(p => ({ x: p.x * cs - p.y * sn, y: p.x * sn + p.y * cs, z: p.z })));
a.forEach((v, i) => assert.ok(Math.abs(v - r[i]) < 1e-9));

const knn = new Knn(5);
const labels = Object.keys(bases);
for (const c of labels) for (let i = 0; i < 30; i++) knn.add(c, normalize(hand(c)));
const test = [];
for (const c of labels) for (let i = 0; i < 20; i++) test.push({ label: c, f: normalize(hand(c)) });
const res = evaluate(knn, test);
console.log('synthetic accuracy', (res.acc * 100).toFixed(1) + '%');
assert.ok(res.acc > 0.95);
assert.equal(res.total, 100);
assert.ok(resultsText(res, 5).includes('confusion matrix'));
assert.deepEqual(new Knn().predict(a), { label: null, confidence: 0 });

const sm = new Smoother(5);
for (let i = 0; i < 5; i++) sm.push('C', 1);
assert.equal(sm.push('G', 1).label, 'C');
assert.equal(sm.push('G', 1).label, 'C');
assert.equal(sm.push('G', 1).label, 'G');

assert.deepEqual(parseStrum('{"dir":"down","speed":42.5,"t":123456}'), { dir: 'down', speed: 42.5, t: 123456 });
assert.equal(parseStrum('{"dir":"up"}').speed, 40);
assert.equal(parseStrum('up').dir, 'up');
assert.equal(parseStrum('{"dir":"sideways"}'), null);
assert.equal(parseStrum('garbage'), null);
assert.equal(parseButton('song'), 'song');
assert.equal(parseButton(' RESET\n'), 'reset');
assert.equal(parseButton('x'), null);

const got = [];
const link = new MqttLink({ onStatus() {}, onStrum: (s, r) => got.push(['strum', s.dir, s.speed, typeof r]), onButton: n => got.push(['btn', n]), onBad: () => got.push(['bad']) });
link.prefix = 'airguitar';
link.handleMessage('airguitar/strum', '{"dir":"down","speed":50}', 1);
link.handleMessage('airguitar/button', 'song', 2);
link.handleMessage('airguitar/strum', 'nope', 3);
assert.deepEqual(got, [['strum', 'down', 50, 'number'], ['btn', 'song'], ['bad']]);
console.log('all tests passed');
