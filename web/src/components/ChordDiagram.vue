<script setup>
import { computed } from 'vue';
import { diagram } from '../lib/diagram.js';

const props = defineProps({ chord: String, w: { type: Number, default: 150 }, h: { type: Number, default: 186 }, big: Boolean });
const d = computed(() => diagram(props.chord, props.w, props.h));
</script>

<template>
  <svg v-if="d" :viewBox="d.vb">
    <line v-for="(s, i) in d.strings" :key="'s' + i" :x1="s.x" :y1="s.y1" :x2="s.x" :y2="s.y2" style="stroke: var(--ink-2)" :style="{ strokeWidth: big ? 1.4 : 1 }" />
    <line v-for="(f, i) in d.frets" :key="'f' + i" :x1="f.x1" :y1="f.y" :x2="f.x2" :y2="f.y" style="stroke: var(--ink)" :style="{ strokeWidth: f.sw }" />
    <circle v-for="(c, i) in d.dots" :key="'d' + i" :cx="c.cx" :cy="c.cy" :r="c.r" :style="big ? { fill: 'var(--accent)', stroke: 'var(--ink)', strokeWidth: 1.5 } : { fill: 'var(--ink)' }" />
    <template v-if="big">
      <text v-for="(m, i) in d.marks" :key="'m' + i" :x="m.x" :y="m.y" style="font: 600 16px 'JetBrains Mono', monospace; fill: var(--ink-2); text-anchor: middle">{{ m.t }}</text>
    </template>
  </svg>
</template>
