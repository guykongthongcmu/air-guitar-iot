import { reactive, watch } from 'vue';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { normalize, FEATURE_LEN, Knn, Smoother, evaluate, resultsText } from './lib/classifier.js';
import { AudioEngine, CHORDS } from './lib/audio.js';
import { SONGS } from './lib/songs.js';
import { MqttLink } from './lib/mqtt.js';

export { SONGS, CHORDS };
export const LABELS = [...Object.keys(CHORDS), 'idle'];
export const TARGET_SAMPLES = 25;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

const DEFAULTS = {
  broker: 'wss://broker.hivemq.com:8884/mqtt',
  prefix: 'airguitar-gk',
  swapHands: false,
  k: 5,
  smooth: 7,
  sound: true,
  freePlay: false,
  fallbackTarget: true,
  metronome: true,
  offsetMs: 0,
  testN: 20,
};

function load(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
  if (key === 'ag.samples' || key === 'ag.test') syncDisk();
}

let syncTimer;
function syncDisk() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1, samples: knn.samples, test: testSet }),
    }).catch(() => {});
  }, 400);
}

const validSample = s => s && s.label && Array.isArray(s.f) && s.f.length === FEATURE_LEN;

async function restoreFromDisk() {
  try {
    const r = await fetch('/api/data');
    if (!r.ok) return;
    const d = await r.json();
    const ds = (d.samples || []).filter(validSample);
    const dt = (d.test || []).filter(validSample);
    if (ds.length + dt.length > knn.samples.length + testSet.length) {
      knn.samples = ds;
      testSet = dt;
      save('ag.samples', knn.samples);
      save('ag.test', testSet);
      S.ver++;
      notify('Loaded ' + ds.length + ' saved samples');
    } else if (knn.samples.length + testSet.length > 0) {
      syncDisk();
    }
  } catch {}
}

export const settings = reactive({ ...DEFAULTS, ...load('ag.settings', {}) });

const knn = new Knn(settings.k);
knn.samples = load('ag.samples', []).filter(s => s && Array.isArray(s.f) && s.f.length === FEATURE_LEN);
let testSet = load('ag.test', []).filter(s => s && Array.isArray(s.f) && s.f.length === FEATURE_LEN);
const smoother = new Smoother(settings.smooth);
const audio = new AudioEngine();

export const S = reactive({
  tab: 'tutor',
  cam: 'off',
  camMsg: 'Press Start to turn on the camera',
  handPresent: false,
  camChord: null,
  camConf: 0,
  manual: null,
  fps: 0, detMs: 0,
  lastStrum: null,
  strums: 0, mqttMsgs: 0, badMsgs: 0,
  lat: [],
  recKind: null, recLabel: null,
  trainLabel: 'C',
  testLabel: 'C',
  ver: 0,
  mqtt: 'disconnected',
  mqttInfo: '',
  board: false,
  dist: '',
  distAt: 0,
  audioOn: false,
  started: false,
  history: load('ag.history', []),
  evalRes: null,
  toast: '',
  songOpen: false,
  log: [],
  copyText: '',
});

export const T = reactive({
  songIdx: 0, bpb: 4, total: 0, slots: [],
  mode: 'along', tempo: 100,
  state: 'idle',
  beatPos: 0,
  sc: newScore(),
  fb: '', fbCls: '',
  summary: null,
});

function newScore() {
  return { pts: 0, max: 0, streak: 0, best: 0, chordOK: 0, done: 0, absSum: 0, timed: 0, bands: {} };
}

let landmarker = null;
let videoEl = null;
let canvasEl = null;
let g2d = null;
let lastVT = -1, frames = 0, fpsT = 0, lastDet = 0;
let lastTs = 0, lastBeat = -99;
let rec = null;

export const song = () => SONGS[T.songIdx];
export const liveChord = () => S.manual || S.camChord;
export const beatMs = () => 60000 / (song().bpm * (T.tempo / 100));

export function trainCount(l) {
  S.ver;
  return knn.count(l);
}
export function testCount(l) {
  S.ver;
  return testSet.filter(t => t.label === l).length;
}
export const trainTotal = () => (S.ver, knn.samples.length);

export function attachCamera(video, canvas) {
  videoEl = video;
  canvasEl = canvas;
  g2d = canvas.getContext('2d');
}

async function loadLandmarker() {
  const files = await FilesetResolver.forVisionTasks('/wasm');
  const make = delegate =>
    HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    });
  try {
    landmarker = await make('GPU');
  } catch {
    landmarker = await make('CPU');
  }
}

export function stopCamera() {
  const stream = videoEl && videoEl.srcObject;
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (videoEl) videoEl.srcObject = null;
  if (g2d && canvasEl) g2d.clearRect(0, 0, canvasEl.width, canvasEl.height);
  S.cam = 'off';
  S.camMsg = 'Camera stopped. Press Start camera to turn it back on.';
  S.handPresent = false;
  S.camChord = null;
  S.camConf = 0;
  S.fps = 0;
  S.detMs = 0;
  smoother.reset();
}

export async function startCamera() {
  if (S.cam === 'on' || S.cam === 'loading') return;
  S.cam = 'loading';
  S.camMsg = 'Starting camera...';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }, audio: false });
    videoEl.srcObject = stream;
    await videoEl.play();
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
    videoEl.parentElement.style.aspectRatio = canvasEl.width + ' / ' + canvasEl.height;
    S.camMsg = 'Loading hand model...';
    if (!landmarker) await loadLandmarker();
    S.camMsg = '';
    S.cam = 'on';
  } catch (e) {
    console.error(e);
    S.cam = 'error';
    S.camMsg = 'Camera or hand model failed: ' + (e.message || e);
  }
}

function vision() {
  if (S.cam !== 'on' || !landmarker || videoEl.readyState < 2) return;
  if (videoEl.currentTime === lastVT) return;
  lastVT = videoEl.currentTime;
  const t0 = performance.now();

  if (t0 - lastDet < 45) return;
  lastDet = t0;
  let res;
  try {
    res = landmarker.detectForVideo(videoEl, t0);
  } catch (e) {
    return;
  }
  const t1 = performance.now();
  const d = S.detMs ? S.detMs * 0.9 + (t1 - t0) * 0.1 : t1 - t0;
  S.detMs = Math.round(d * 10) / 10;
  frames++;
  if (t1 - fpsT >= 1000) {
    S.fps = Math.round((frames * 10000) / (t1 - fpsT)) / 10;
    frames = 0;
    fpsT = t1;
  }

  const wanted = settings.swapHands ? 'Left' : 'Right';
  const hands = res.landmarks || [];
  const sides = res.handedness || res.handednesses || [];
  let chosen = -1;
  hands.forEach((h, i) => {
    const name = sides[i] && sides[i][0] ? sides[i][0].categoryName : '';
    if (name === wanted && chosen < 0) chosen = i;
  });

  if (chosen < 0 && hands.length === 1) chosen = 0;

  if (chosen >= 0) {
    const f = normalize(hands[chosen], canvasEl.width / canvasEl.height);
    const p = knn.predict(f);
    const sm = smoother.push(p.label, p.confidence);
    S.camConf = sm.confidence;
    S.camChord = sm.label === 'idle' ? null : sm.label;
    recordSample(f, t1);
  } else {
    const sm = smoother.push(null, 0);
    S.camConf = 0;
    S.camChord = sm.label === 'idle' ? null : sm.label;
  }
  S.handPresent = chosen >= 0;
  drawHands(hands, chosen);
}

function drawHands(hands, chosen) {
  const w = canvasEl.width, h = canvasEl.height;
  g2d.clearRect(0, 0, w, h);
  hands.forEach((lm, i) => {
    const mine = i === chosen;
    g2d.strokeStyle = mine ? '#e8962a' : 'rgba(200,200,200,0.45)';
    g2d.fillStyle = mine ? '#f3efe6' : 'rgba(200,200,200,0.6)';
    g2d.lineWidth = mine ? 3 : 2;
    g2d.beginPath();
    for (const [a, b] of BONES) {
      g2d.moveTo(lm[a].x * w, lm[a].y * h);
      g2d.lineTo(lm[b].x * w, lm[b].y * h);
    }
    g2d.stroke();
    for (const p of lm) {
      g2d.beginPath();
      g2d.arc(p.x * w, p.y * h, mine ? 4 : 3, 0, 7);
      g2d.fill();
    }
  });
}

let toastTimer = null;
export function notify(msg) {
  S.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (S.toast = ''), 2500);
}

function round4(f) {
  return f.map(v => Math.round(v * 10000) / 10000);
}

function recordSample(f, now) {
  if (!rec || now - rec.last < 100) return;
  rec.last = now;
  if (rec.kind === 'train') {
    knn.add(rec.label, f);
  } else {
    if (testCount(rec.label) >= settings.testN) return stopRec();
    testSet.push({ label: rec.label, f: round4(f) });
  }
  S.ver++;
}

export function startRec(kind, label) {
  if (kind === 'train') S.trainLabel = label;
  else S.testLabel = label;
  rec = { kind, label, last: 0 };
  S.recKind = kind;
  S.recLabel = label;
}
export function stopRec() {
  if (!rec) return;
  rec = null;
  S.recKind = null;
  S.recLabel = null;
  save('ag.samples', knn.samples);
  save('ag.test', testSet);
}

export function deleteTrain(l) {
  knn.removeLabel(l);
  save('ag.samples', knn.samples);
  S.ver++;
}
export function deleteTest(l) {
  testSet = testSet.filter(t => t.label !== l);
  save('ag.test', testSet);
  S.ver++;
}
export function clearAllTraining() {
  if (!confirm('Delete all training samples?')) return;
  knn.clear();
  save('ag.samples', knn.samples);
  S.ver++;
}
export function clearTest() {
  testSet = [];
  save('ag.test', testSet);
  S.evalRes = null;
  S.ver++;
}

export function exportData() {
  const data = { version: 1, samples: knn.samples, test: testSet };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = 'airguitar-training.json';
  a.click();
  notify('Exported ' + knn.samples.length + ' samples');
}

export async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    const ok = s => s && s.label && Array.isArray(s.f) && s.f.length === FEATURE_LEN;
    const samples = (Array.isArray(data) ? data : data.samples || []).filter(ok);
    knn.samples = samples;
    if (data.test) testSet = data.test.filter(ok);
    save('ag.samples', knn.samples);
    save('ag.test', testSet);
    S.ver++;
    notify('Imported ' + samples.length + ' samples');
  } catch {
    notify('Could not read that file');
  }
}

let lastEval = null;
export function runEval() {
  if (testSet.length === 0) return notify('Record a test set first');
  if (knn.samples.length === 0) return notify('No training samples');
  knn.k = settings.k;
  lastEval = evaluate(knn, testSet);
  S.evalRes = lastEval;
}

export async function copyEval() {
  if (!lastEval) runEval();
  if (!lastEval) return;
  const text = resultsText(lastEval, settings.k);
  try {
    await navigator.clipboard.writeText(text);
    notify('Copied to clipboard');
  } catch {

    S.copyText = text;
    notify('Select and copy the text below');
  }
}

const link = new MqttLink({
  onStatus(state, info) {
    S.mqtt = state;
    S.mqttInfo = state === 'connected' ? 'client id ' + info : info || '';
  },
  onBoard(online) {
    S.board = online;
    if (!online) S.dist = '';
  },
  onDist(text) {
    S.dist = text;
    S.distAt = Date.now();
  },
  onStrum(s, recv) {
    S.mqttMsgs++;
    handleStrum(s.dir, s.speed, 'mqtt', recv);
  },
  onButton(name) {
    S.mqttMsgs++;
    if (name === 'song') nextSong();
    else if (name === 'reset') restartSong();
  },
  onBad() {
    S.badMsgs++;
  },
});

export function connectMqtt() {
  settings.broker = (settings.broker || '').trim() || DEFAULTS.broker;
  settings.prefix = (settings.prefix || '').trim().replace(/\/+$/, '') || DEFAULTS.prefix;
  link.connect(settings.broker, settings.prefix);
}

export const sim = reactive({ speed: 40 });

export function handleStrum(dir, speed, source, recv) {
  recv = recv || performance.now();
  audio.start();
  S.audioOn = true;
  S.strums++;
  const live = liveChord();
  const target = T.slots.find(s => !s.res);

  let toPlay = live;
  if (!toPlay && settings.fallbackTarget && target) toPlay = target.chord;

  if (!toPlay && lastChord && performance.now() - lastChordAt < 3000) toPlay = lastChord;

  if (!toPlay && (S.tab === 'train' || S.tab === 'test')) {
    const sel = S.tab === 'train' ? S.trainLabel : S.testLabel;
    if (sel && sel !== 'idle') toPlay = sel;
  }

  if (settings.sound && toPlay && (T.state === 'playing' || settings.freePlay)) {
    const lat = audio.strum(toPlay, dir, speed, recv);
    if (lat !== null) {
      S.lat.push({ ms: lat, source });
      if (S.lat.length > 50) S.lat.shift();
    }
  }

  const r = T.state === 'playing' && target ? scoreStrum(live, recv) : null;
  S.lastStrum = { dir, speed, source, n: S.strums, ok: r ? r.ok : null, timing: r ? r.timing : '', msg: r ? r.msg : '' };
  S.log.unshift({ ok: r ? r.ok : null, dir });
  if (S.log.length > 10) S.log.pop();
}

export function loadSong(i) {
  T.songIdx = i;
  const sg = SONGS[i];
  T.bpb = sg.time[0];
  let start = 0;
  T.slots = sg.bars.map(b => {
    const s = { chord: b.chord, beats: b.beats, start, winEnd: start + Math.min(b.beats, 2) - 0.5, res: null, attempts: 0 };
    start += b.beats;
    return s;
  });
  T.total = start;
  resetRun();
}

function resetRun() {
  T.state = 'idle';
  T.beatPos = T.mode === 'along' ? -T.bpb : 0;
  lastBeat = -99;
  T.sc = newScore();
  T.fb = '';
  T.slots.forEach(s => {
    s.res = null;
    s.attempts = 0;
  });
}

export function setMode(m) {
  T.mode = m;
  resetRun();
}
export function nextSong() {
  loadSong((T.songIdx + 1) % SONGS.length);
}
export function restartSong() {
  resetRun();
  T.state = 'playing';
  audio.start();
}
export function togglePlay() {
  audio.start();
  S.audioOn = true;
  if (T.state === 'idle') T.state = 'playing';
  else if (T.state === 'playing') T.state = 'paused';
  else if (T.state === 'paused') T.state = 'playing';
  else restartSong();
}

function currentBeat(now) {
  if (T.state !== 'playing' || T.mode !== 'along') return T.beatPos;
  return T.beatPos + Math.min(100, now - lastTs) / beatMs();
}

function tutorTick(ts) {
  const dt = Math.min(100, ts - lastTs);
  lastTs = ts;
  if (T.state !== 'playing' || T.mode !== 'along') return;
  T.beatPos += dt / beatMs();

  const b = Math.floor(T.beatPos);
  if (b !== lastBeat) {
    lastBeat = b;
    if (settings.metronome && settings.sound) audio.click(((b % T.bpb) + T.bpb) % T.bpb === 0);
  }

  for (const s of T.slots) {
    if (!s.res && T.beatPos > s.winEnd) {
      resolveSlot(s, { chordOK: false, band: 'miss', dMs: null, pts: 0, text: 'Missed ' + s.chord });
    }
  }
  if (T.slots.every(s => s.res)) endSong();
}

function band(absMs) {
  if (absMs <= 80) return ['perfect', 50];
  if (absMs <= 160) return ['good', 30];
  if (absMs <= 300) return ['off', 10];
  return ['off', 0];
}

function scoreStrum(live, recv) {
  if (T.mode === 'wait') {
    const s = T.slots.find(x => !x.res);
    if (live === s.chord) {
      const first = s.attempts === 0;
      resolveSlot(s, { chordOK: first, band: first ? 'first try' : 'retry', dMs: null, pts: first ? 100 : 50, text: 'Correct ' + s.chord });
      if (T.slots.every(x => x.res)) endSong();
      return { ok: true, timing: 'Correct', msg: 'Played ' + live };
    }
    s.attempts++;
    T.sc.streak = 0;
    setFb('Wrong chord' + (live ? ' (got ' + live + ')' : ' (none detected)') + ', try again', 'bad');
    return { ok: false, timing: 'Wrong chord', msg: 'Played ' + (live || 'none') + ', expected ' + s.chord };
  }

  const beat = currentBeat(recv) - settings.offsetMs / beatMs();
  const s = T.slots.find(x => !x.res && beat >= x.start - 0.5 && beat <= x.winEnd);
  if (!s) return { ok: null, timing: 'Extra strum', msg: 'No chord due yet' };
  const dMs = (beat - s.start) * beatMs();
  const [bnd, tp] = band(Math.abs(dMs));
  const chordOK = live === s.chord;
  const bandKey = bnd === 'off' ? (Math.abs(dMs) > 300 ? 'off beat' : dMs < 0 ? 'early' : 'late') : bnd;
  resolveSlot(s, {
    chordOK, band: bandKey, dMs, pts: (chordOK ? 50 : 0) + tp,
    text: (chordOK ? 'Chord OK' : 'Wrong chord' + (live ? ' (got ' + live + ')' : ' (none)')) + ', ' + bandKey + ' ' + (dMs >= 0 ? '+' : '') + Math.round(dMs) + ' ms',
  });
  const ms = (dMs >= 0 ? '+' : '') + Math.round(dMs) + ' ms';
  return {
    ok: chordOK,
    timing: chordOK ? bandKey[0].toUpperCase() + bandKey.slice(1) : 'Wrong chord',
    msg: 'Played ' + (live || 'none') + ', expected ' + s.chord + ', ' + ms,
  };
}

function resolveSlot(slot, res) {
  const sc = T.sc;
  slot.res = res;
  sc.done++;
  sc.max += 100;
  sc.pts += res.pts;
  if (res.chordOK) {
    sc.chordOK++;
    sc.streak++;
    sc.best = Math.max(sc.best, sc.streak);
  } else {
    sc.streak = 0;
  }
  if (res.dMs !== null) {
    sc.absSum += Math.abs(res.dMs);
    sc.timed++;
  }
  sc.bands[res.band] = (sc.bands[res.band] || 0) + 1;
  setFb(res.text, res.chordOK ? 'good' : 'bad');
}

let fbTimer = null;
function setFb(text, cls) {
  T.fb = text;
  T.fbCls = cls;
  clearTimeout(fbTimer);
  fbTimer = setTimeout(() => (T.fb = ''), 1800);
}

function endSong() {
  T.state = 'done';
  const sc = T.sc;
  const entry = {
    t: Date.now(),
    song: song().name,
    mode: T.mode,
    bpm: Math.round(song().bpm * (T.tempo / 100)),
    score: sc.pts,
    max: sc.max,
    chordAcc: sc.done ? Math.round((sc.chordOK / sc.done) * 100) : 0,
    avgMs: sc.timed ? Math.round(sc.absSum / sc.timed) : null,
    bestStreak: sc.best,
    bands: { ...sc.bands },
  };
  S.history.unshift(entry);
  S.history = S.history.slice(0, 100);
  save('ag.history', S.history);
  link.publishSession(entry);
  T.summary = entry;
}

export function clearHistory() {
  if (!confirm('Clear the session history?')) return;
  S.history = [];
  save('ag.history', []);
}

function setupKeys() {
  const typing = e => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
  document.addEventListener('keydown', e => {
    if (typing(e)) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      e.preventDefault();
      if (e.repeat) return;
      handleStrum(e.code === 'ArrowUp' ? 'up' : 'down', sim.speed, 'key');
    } else if (e.key === 'r' || e.key === 'R') {
      if (e.repeat || rec) return;
      if (S.tab === 'train') startRec('train', S.trainLabel);
      else if (S.tab === 'test') startRec('test', S.testLabel);
    } else if (/^[0-6]$/.test(e.key)) {
      const names = Object.keys(CHORDS);
      S.manual = e.key === '0' ? null : names[Number(e.key) - 1] || null;
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space' && !typing(e)) e.preventDefault();
    if (e.key === 'r' || e.key === 'R') stopRec();
  });
  document.addEventListener('pointerup', stopRec);
  document.addEventListener('pointercancel', stopRec);

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.tagName === 'SELECT' || el.type === 'range') el.blur();
  });
}

let lastChord = null, lastChordAt = 0;

function frame(ts) {
  requestAnimationFrame(frame);
  vision();
  const lc = liveChord();
  if (lc) {
    lastChord = lc;
    lastChordAt = performance.now();
  }
  tutorTick(ts);
}

export async function startAll() {
  audio.start();
  S.audioOn = true;
  S.started = true;
  startCamera();
}

let inited = false;
export function init() {
  if (inited) return;
  inited = true;
  setupKeys();
  loadSong(0);
  restoreFromDisk();

  watch(settings, () => {
    knn.k = Math.max(1, Number(settings.k) || 5);
    smoother.setSize(Math.max(1, Number(settings.smooth) || 7));
    save('ag.settings', settings);
  }, { deep: true });
  watch(() => settings.sound, on => audio.setMuted(!on), { immediate: true });

  watch(liveChord, c => link.publishChord(c), { immediate: true });
  connectMqtt();
  requestAnimationFrame(frame);

  window.__ag = { handleStrum, link, S, T, knn };
}

export const target = () => T.slots.find(s => !s.res) || null;
export function matchState() {
  const t = target();
  if (T.state !== 'playing' || !t) return '';
  return liveChord() === t.chord ? 'ok' : 'bad';
}
