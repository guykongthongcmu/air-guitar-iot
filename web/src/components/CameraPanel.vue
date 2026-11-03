<script setup>
import { ref, onMounted } from 'vue';
import { S, CHORDS, liveChord, attachCamera } from '../store.js';

const video = ref(null);
const canvas = ref(null);
onMounted(() => attachCamera(video.value, canvas.value));

const showBadge = () => S.manual || (S.cam === 'on' && S.handPresent);
const badgeChord = () => S.manual || liveChord() || 'idle';
const pct = () => (S.manual ? 100 : Math.round(S.camConf * 100));
const handText = () => (S.cam !== 'on' ? 'camera off' : S.handPresent ? 'hand tracked' : 'no hand detected');
</script>

<template>
  <div>
    <div class="feed">
      <video ref="video" playsinline muted></video>
      <canvas ref="canvas"></canvas>
      <div class="feed-cap mono">webcam feed · mirrored</div>

      <div class="badge" v-if="showBadge()">
        <div class="tiny mono">{{ S.manual ? 'MANUAL' : 'DETECTED' }}</div>
        <div class="row">
          <span class="chord">{{ badgeChord() }}</span>
          <span class="pct mono">{{ pct() }}%</span>
        </div>
        <div class="track"><div :style="{ width: pct() + '%', background: pct() >= 70 ? 'var(--accent)' : 'var(--bad)' }"></div></div>
      </div>

      <template v-if="S.cam === 'on' && !S.handPresent && !S.manual">
        <div class="nohand-pill"><i></i>No hand detected</div>
        <div class="nohand">
          <div class="frame"></div>
          <div class="t">Show your chord hand</div>
          <div class="s">Hold the chord shape inside the frame, palm towards the camera.</div>
        </div>
      </template>

      <div class="camoff" v-if="S.cam !== 'on'">
        <div class="t">Camera off</div>
        <div class="s">{{ S.camMsg }}</div>
      </div>
    </div>
    <div class="feed-meta mono">
      <span>FPS {{ S.fps || '-' }}</span>
      <span>detect {{ S.detMs || '-' }} ms</span>
      <span>{{ handText() }}</span>
      <label>Chord source
        <select class="field" :value="S.manual || ''" @change="S.manual = $event.target.value || null">
          <option value="">Camera</option>
          <option v-for="(f, c) in CHORDS" :key="c" :value="c">Manual: {{ c }}</option>
        </select>
      </label>
    </div>
  </div>
</template>
