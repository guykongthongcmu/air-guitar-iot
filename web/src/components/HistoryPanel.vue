<script setup>
import { S, clearHistory } from '../store.js';

const color = a => (a >= 85 ? 'var(--good)' : a >= 70 ? 'var(--accent)' : 'var(--bad)');
</script>

<template>
  <div>
    <div class="head-row">
      <h1 class="page-title">History</h1>
      <div class="page-sub grow">{{ S.history.length }} sessions</div>
      <button class="btn danger" @click="clearHistory">Clear history</button>
    </div>
    <div class="hist">
      <div class="th">Song</div><div class="th">Date</div><div class="th">Mode</div><div class="th r">Tempo</div><div class="th r">Score</div><div class="th">Accuracy</div><div class="th r">Best streak</div>
      <template v-for="e in S.history" :key="e.t">
        <div style="font-weight: 800">{{ e.song }}</div>
        <div style="color: var(--ink-2)">{{ new Date(e.t).toLocaleString('en-GB') }}</div>
        <div>{{ e.mode === 'along' ? 'Play along' : 'Wait mode' }}</div>
        <div class="r mono">{{ e.bpm }}</div>
        <div class="r mono" style="font-weight: 700">{{ e.score }}/{{ e.max }}</div>
        <div class="acc"><span class="mono" style="font-weight: 700; width: 46px">{{ e.chordAcc }}%</span><div class="track"><div :style="{ width: e.chordAcc + '%', background: color(e.chordAcc) }"></div></div></div>
        <div class="r mono">{{ e.bestStreak }}</div>
      </template>
    </div>
    <p class="page-sub" v-if="!S.history.length">No sessions yet.</p>
  </div>
</template>
