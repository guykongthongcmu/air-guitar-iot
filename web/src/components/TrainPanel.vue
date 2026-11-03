<script setup>
import { S, LABELS, TARGET_SAMPLES, trainCount, trainTotal, deleteTrain, clearAllTraining, exportData, importData } from '../store.js';
import ChordDiagram from './ChordDiagram.vue';

function onFile(e) {
  const f = e.target.files[0];
  if (f) importData(f);
  e.target.value = '';
}
const pct = l => Math.min(100, (trainCount(l) / TARGET_SAMPLES) * 100);
</script>

<template>
  <div>
    <div class="head-row">
      <div class="grow">
        <h1 class="page-title">Training samples</h1>
        <div class="page-sub">{{ trainTotal() }} samples. Pick a chord, then hold Record (or R) while showing the shape. Aim for {{ TARGET_SAMPLES }}+ each, and record idle too.</div>
      </div>
      <label class="btn" style="display: inline-flex; align-items: center">Import <input type="file" accept=".json,application/json" @change="onFile" hidden></label>
      <button class="btn" @click="exportData">Export</button>
      <button class="btn danger" @click="clearAllTraining">Clear all</button>
    </div>
    <div class="rows">
      <div v-for="l in LABELS" :key="l" class="srow" :class="{ sel: S.trainLabel === l }" @click="S.trainLabel = l">
        <div class="dg">
          <ChordDiagram v-if="l !== 'idle'" :chord="l" :w="40" :h="50" />
          <small class="mono" v-else>no<br>chord</small>
        </div>
        <div class="nm">{{ l }}</div>
        <div class="track" :class="{ full: trainCount(l) >= TARGET_SAMPLES }"><div :style="{ width: pct(l) + '%' }"></div></div>
        <div class="ct mono">{{ trainCount(l) }}<span> / {{ TARGET_SAMPLES }}</span></div>
        <div class="btns"><button class="btn small ghost" @click.stop="deleteTrain(l)">Delete</button></div>
      </div>
    </div>
  </div>
</template>
