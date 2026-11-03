<script setup>
import { S, T, SONGS, loadSong, song } from '../store.js';

const bpmOf = s => Math.round(s.bpm * (T.tempo / 100));
const chips = s => [...new Set(s.bars.map(b => b.chord))];
function pick(i) {
  loadSong(i);
  S.songOpen = false;
}
</script>

<template>
  <button class="song-btn" @click="S.songOpen = !S.songOpen">
    <div class="grow" style="min-width: 0">
      <div class="name">{{ song().name }}</div>
      <div class="meta mono">{{ bpmOf(song()) }} bpm · {{ song().time.join('/') }} · {{ chips(song()).join(' ') }}</div>
    </div>
    <span class="hint">▼</span>
  </button>
  <div class="song-menu" v-if="S.songOpen">
    <button v-for="(s, i) in SONGS" :key="i" class="song-opt" :class="{ on: i === T.songIdx }" @click="pick(i)">
      <span class="name">{{ s.name }}</span>
      <span class="bpm mono">{{ s.bpm }} bpm</span>
      <span class="chips"><span class="chip mono" v-for="c in chips(s)" :key="c">{{ c }}</span></span>
    </button>
  </div>
</template>
