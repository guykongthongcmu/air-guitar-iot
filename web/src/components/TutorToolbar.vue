<script setup>
import { T, song, setMode, togglePlay, restartSong } from '../store.js';
import SongPicker from './SongPicker.vue';

const playLabel = () => ({ playing: 'Pause', paused: 'Resume', done: 'Play again' }[T.state] || 'Play');
const playIcon = () => (T.state === 'playing' ? '❚❚' : '▶');
</script>

<template>
  <div class="toolbar">
    <SongPicker />
    <div class="tempo">
      <span class="overline">Tempo</span>
      <input type="range" min="50" max="150" v-model.number="T.tempo">
      <span class="val mono">{{ Math.round(song().bpm * (T.tempo / 100)) }} bpm</span>
    </div>
    <div class="seg">
      <button :class="{ on: T.mode === 'along' }" @click="setMode('along')">Play along</button>
      <button :class="{ on: T.mode === 'wait' }" @click="setMode('wait')">Wait mode</button>
    </div>
    <div class="grow"></div>
    <button class="btn" @click="restartSong">Restart</button>
    <button class="play-btn" @click="togglePlay"><span style="font-size: 12px; margin-right: 10px">{{ playIcon() }}</span>{{ playLabel() }}</button>
  </div>
</template>
