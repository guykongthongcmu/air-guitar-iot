<script setup>
import { S, LABELS, settings, testCount, startRec, deleteTest, clearTest, runEval, copyEval } from '../store.js';

const pct = l => Math.min(100, (testCount(l) / settings.testN) * 100);
const cellCls = (a, b, v) => (a === b ? 'diag' : v > 0 ? 'off' : '');
const accColor = a => (a >= 0.85 ? 'var(--good)' : a >= 0.7 ? 'var(--accent)' : 'var(--bad)');
</script>

<template>
  <div>
    <div class="head-row">
      <div class="grow">
        <h1 class="page-title">Labelled test</h1>
        <div class="page-sub">Hold each chord with Record (or R) to collect its trials. Use a separate take from the training samples. Each frame is classified on its own, without smoothing.</div>
      </div>
      <label class="overline" style="display: flex; align-items: center; gap: 8px">Trials per chord <input class="field" type="number" min="5" max="200" v-model.number="settings.testN" style="width: 80px"></label>
    </div>
    <div class="rows">
      <div v-for="l in LABELS" :key="l" class="rrow" :class="{ sel: S.testLabel === l }" @click="S.testLabel = l">
        <div class="nm">{{ l }}</div>
        <div class="mono">{{ testCount(l) }} / {{ settings.testN }}</div>
        <div class="track" :class="{ full: testCount(l) >= settings.testN }"><div :style="{ width: pct(l) + '%' }"></div></div>
        <button class="btn small" :class="{ primary: S.recKind === 'test' && S.recLabel === l }" style="touch-action: none" @pointerdown="startRec('test', l)">{{ S.recKind === 'test' && S.recLabel === l ? 'Recording' : 'Hold to record' }}</button>
        <button class="btn small ghost" @click.stop="deleteTest(l)">Clear</button>
      </div>
    </div>
    <div class="head-row" style="margin-top: 16px">
      <button class="btn primary" @click="runEval">Evaluate</button>
      <button class="btn" @click="copyEval">Copy as CSV</button>
      <button class="btn danger" @click="clearTest">Clear test set</button>
    </div>
    <textarea class="csv" v-if="S.copyText" rows="8" readonly :value="S.copyText"></textarea>

    <div class="results" v-if="S.evalRes">
      <div>
        <div class="overline">Overall accuracy</div>
        <div class="overall mono">{{ (S.evalRes.acc * 100).toFixed(1) }}%</div>
        <div class="hint mono">{{ S.evalRes.correct }} of {{ S.evalRes.total }} frames</div>
        <div class="pc" v-for="c in S.evalRes.perClass" :key="c.label">
          <span class="n">{{ c.label }}</span>
          <div class="track"><div :style="{ width: c.acc * 100 + '%', background: accColor(c.acc) }"></div></div>
          <span class="a mono">{{ Math.round(c.acc * 100) }}%</span>
        </div>
      </div>
      <div>
        <div style="font-size: 20px; font-weight: 800">Confusion matrix</div>
        <div class="hint">Rows: chord held. Columns: chord predicted.</div>
        <div class="matrix" :style="{ gridTemplateColumns: '70px repeat(' + S.evalRes.labels.length + ', minmax(0, 1fr))' }">
          <div></div>
          <div class="h" v-for="l in S.evalRes.labels" :key="'h' + l">{{ l }}</div>
          <template v-for="a in S.evalRes.labels" :key="a">
            <div class="rl">{{ a }}</div>
            <div class="c mono" v-for="b in S.evalRes.labels" :key="a + b" :class="cellCls(a, b, S.evalRes.matrix[a][b])">{{ S.evalRes.matrix[a][b] }}</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
