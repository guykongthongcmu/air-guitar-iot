<script setup>
import { S, sim, handleStrum } from '../store.js';

const ls = () => S.lastStrum;
const cls = () => (ls() && ls().ok === true ? 'good' : ls() && ls().ok === false ? 'bad' : '');
</script>

<template>
  <div class="fbox" :class="cls()">
    <div class="fbox-main">
      <div class="fb-icon">
        <svg viewBox="0 0 40 40" :style="{ transform: ls() && ls().dir === 'up' ? 'rotate(180deg)' : 'none' }">
          <line x1="20" y1="5" x2="20" y2="27" style="stroke: currentColor; stroke-width: 5; stroke-linecap: round" />
          <polygon points="8,23 20,37 32,23" style="fill: currentColor" />
        </svg>
      </div>
      <div class="fb-text">
        <div class="fb-timing">{{ ls() ? ls().timing || 'Strum' : 'No strum yet' }}</div>
        <div class="fb-sub">{{ ls() ? ls().msg || 'Source: ' + ls().source : 'Strum with Space or the board' }}</div>
      </div>
      <div class="fb-speed">
        <div class="n mono" id="liveStrum">{{ ls() ? ls().speed.toFixed(0) : '-' }}</div>
        <div class="u">{{ ls() ? (ls().dir === 'up' ? 'Up' : 'Down') + ' strum, cm/s' : 'cm/s' }}</div>
      </div>
    </div>
    <div class="fb-sim">
      <button class="btn small" @click="handleStrum('down', sim.speed, 'button')">Strum down</button>
      <button class="btn small" @click="handleStrum('up', sim.speed, 'button')">Strum up</button>
      <label>Speed <input type="range" min="5" max="150" v-model.number="sim.speed"> <span class="mono">{{ sim.speed }}</span></label>
    </div>
  </div>
</template>
