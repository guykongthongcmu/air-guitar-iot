<script setup>
import { S, T, restartSong } from '../store.js';

const e = () => T.summary;
const third = () => (e().mode === 'along' ? ['Perfect', e().bands.perfect || 0] : ['First try', e().bands['first try'] || 0]);
function again() {
  T.summary = null;
  restartSong();
}
function choose() {
  T.summary = null;
  S.songOpen = true;
}
</script>

<template>
  <div class="modal" v-if="e()" @click.self="T.summary = null">
    <div class="modal-box">
      <div>
        <div class="overline" style="color: var(--accent-strong)">Song complete</div>
        <div class="ttl">{{ e().song }}</div>
        <div class="hint mono" style="margin-top: 4px">{{ e().mode === 'along' ? 'Play along' : 'Wait mode' }} · {{ e().bpm }} bpm</div>
      </div>
      <div class="big mono">{{ e().score.toLocaleString('en-GB') }}</div>
      <div class="sum3">
        <div><div class="overline">Accuracy</div><div class="v mono">{{ e().chordAcc }}%</div></div>
        <div><div class="overline">Best streak</div><div class="v mono">{{ e().bestStreak }}</div></div>
        <div><div class="overline">{{ third()[0] }}</div><div class="v mono">{{ third()[1] }}</div></div>
      </div>
      <div class="hint mono" v-if="e().avgMs !== null">Average timing error {{ e().avgMs }} ms</div>
      <div class="modal-btns">
        <button class="btn primary" @click="again">Play again</button>
        <button class="btn" @click="choose">Choose another song</button>
      </div>
    </div>
  </div>
</template>
