<script setup>
import { computed } from 'vue';
import { S, T, target } from '../store.js';
import { diagram, splitChord } from '../lib/diagram.js';
import ChordDiagram from './ChordDiagram.vue';

const along = computed(() => T.mode === 'along');
const idx = computed(() => {
  const t = target();
  return t ? T.slots.indexOf(t) : T.slots.length;
});
const cur = computed(() => {
  const t = target();
  return t ? splitChord(t.chord) : { root: T.state === 'done' ? 'Done' : '-', qual: '' };
});
const shape = computed(() => {
  const t = target();
  const d = t && diagram(t.chord, 10, 10);
  return d ? d.shape : '';
});
const posLabel = computed(() => (T.state === 'done' ? 'finished' : 'chord ' + Math.min(idx.value + 1, T.slots.length) + ' of ' + T.slots.length));

const cells = computed(() => {
  const beat = Math.floor(T.beatPos);
  const inBar = ((beat % T.bpb) + T.bpb) % T.bpb;
  const out = [];
  for (let i = 0; i < T.bpb; i++) out.push({ n: i + 1, on: along.value && T.state === 'playing' && i === inBar });
  return out;
});

const left = computed(() => {
  const t = target();
  return t ? Math.max(0, Math.ceil(t.start + t.beats - T.beatPos)) : 0;
});
const next = computed(() => T.slots[idx.value + 1] || null);
const changeText = computed(() => {
  const t = target();
  if (!t) return T.state === 'done' ? 'Song finished' : 'Press Play';
  if (T.state === 'idle') return along.value ? 'One bar count-in first' : 'Show the chord, then strum';
  if (!along.value) return 'Hold ' + t.chord + ', then strum';
  if (T.beatPos < t.start) return 'Play ' + t.chord + ' in ' + Math.max(1, Math.ceil(t.start - T.beatPos)) + (Math.ceil(t.start - T.beatPos) === 1 ? ' beat' : ' beats');
  if (!next.value) return 'Last chord, ' + left.value + (left.value === 1 ? ' beat' : ' beats') + ' to go';
  return 'Change to ' + next.value.chord + ' in ' + left.value + (left.value === 1 ? ' beat' : ' beats');
});
const segs = computed(() => {
  const t = target();
  if (!t) return [];
  const done = along.value && T.beatPos >= t.start ? Math.min(t.beats, Math.floor(T.beatPos - t.start) + 1) : 0;
  return Array.from({ length: t.beats }, (_, i) => i < done);
});

const then = computed(() => {
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const s = T.slots[idx.value + i];
    if (s) out.push({ ...splitChord(s.chord), chord: s.chord, beats: s.beats + ' beats' });
    else if (idx.value + i === T.slots.length) out.push({ root: 'End', qual: '', chord: null, beats: '' });
  }
  return out;
});

const acc = computed(() => (T.sc.done ? Math.round((T.sc.chordOK / T.sc.done) * 100) + '%' : '-'));
const timing = computed(() => (T.sc.timed ? Math.round(T.sc.absSum / T.sc.timed) + ' ms' : '-'));
const ticks = computed(() => Array.from({ length: 10 }, (_, i) => S.log[i] || null));
</script>

<template>
  <div class="tutor">
    <div class="tutor-main">
    <div class="hero-top">
      <div>
        <div class="hero-label"><span class="l">Play next</span><span class="p mono">{{ posLabel }}</span></div>
        <div class="hero"><span class="root">{{ cur.root }}</span><span class="qual">{{ cur.qual }}</span></div>
      </div>
      <div class="diag" v-if="target()">
        <ChordDiagram :chord="target().chord" :w="150" :h="186" big style="width: 150px; height: 186px" />
        <span class="shape mono">{{ shape }}</span>
      </div>
    </div>

    <div class="beatrow">
      <div class="cells">
        <div class="cell" v-for="c in cells" :key="c.n" :class="{ on: c.on }">{{ c.n }}</div>
      </div>
      <div>
        <div class="change-text">{{ changeText }}</div>
        <div class="changebar">
          <div class="seg1" v-for="(on, i) in segs" :key="i" :class="{ on }"></div>
          <template v-if="segs.length">
            <div class="tick"></div>
            <span class="nx">{{ next ? next.chord : 'End' }}</span>
          </template>
        </div>
      </div>
    </div>

    <div class="then">
      <div class="overline">Then</div>
      <div class="then-grid">
        <div class="then-card" v-for="(n, i) in then" :key="i">
          <ChordDiagram v-if="n.chord" :chord="n.chord" :w="44" :h="56" />
          <div>
            <div class="nm">{{ n.root }}<span>{{ n.qual }}</span></div>
            <div class="bt mono">{{ n.beats }}</div>
          </div>
        </div>
      </div>
    </div>

    </div>

    <div class="stats">
      <div class="stat"><div class="overline">Score</div><div class="v mono" id="scScore">{{ T.sc.pts.toLocaleString('en-GB') }}</div></div>
      <div class="stat"><div class="overline">Streak</div><div class="v mono">{{ T.sc.streak }}</div></div>
      <div class="stat"><div class="overline">Accuracy</div><div class="v mono">{{ acc }}</div></div>
      <div class="stat"><div class="overline">Timing</div><div class="v mono">{{ timing }}</div></div>
      <div class="logcol">
        <div class="overline">Last strums</div>
        <div class="log">
          <div class="tick-cell mono" v-for="(l, i) in ticks" :key="i" :class="l ? (l.ok === true ? 'good' : l.ok === false ? 'bad' : '') : ''">{{ l ? (l.dir === 'up' ? 'U' : 'D') : '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
