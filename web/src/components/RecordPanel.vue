<script setup>
import { S, TARGET_SAMPLES, trainCount, startRec } from '../store.js';

const rec = () => S.recKind === 'train';
const hint = () => (S.trainLabel === 'idle'
  ? 'Relaxed open hand, no chord shape. Hold the button and move a little.'
  : 'Make the ' + S.trainLabel + ' shape with your chord hand, then hold the button (or the R key) and move the hand slightly.');
</script>

<template>
  <div class="rec-panel">
    <div class="rec-top">
      <div>
        <div class="overline">Recording</div>
        <div class="rec-name">{{ S.trainLabel }}</div>
      </div>
      <div class="rec-count mono">{{ trainCount(S.trainLabel) }}<span> / {{ TARGET_SAMPLES }}</span></div>
    </div>
    <div class="rec-hint">{{ hint() }}</div>
    <button class="rec-btn" :class="{ active: rec() }" @pointerdown="startRec('train', S.trainLabel)"><i></i>{{ rec() ? 'Recording' : 'Hold to record' }}</button>
  </div>
</template>
