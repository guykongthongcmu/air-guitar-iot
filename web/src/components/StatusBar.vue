<script setup>
import { computed } from 'vue';
import { S, settings } from '../store.js';

const mqttCls = () => (S.mqtt === 'connected' ? 'ok' : S.mqtt === 'error' ? 'err' : S.mqtt === 'connecting' ? 'wait' : '');
const camCls = () => (S.cam === 'on' ? 'ok' : S.cam === 'error' ? 'err' : S.cam === 'loading' ? 'wait' : '');
const boardCls = () => (S.board ? 'ok' : S.mqtt === 'connected' ? 'err' : '');
const sensorTxt = computed(() => {
  if (!S.board) return 'No data';
  if (!S.dist) return 'Waiting';
  const n = parseFloat(S.dist);
  return isNaN(n) ? 'No echo' : n.toFixed(0) + ' cm';
});
const sensorCls = () => (S.board && S.dist && !isNaN(parseFloat(S.dist)) ? 'ok' : S.board ? 'wait' : '');
const cap = s => s[0].toUpperCase() + s.slice(1);
</script>

<template>
  <footer class="statusbar">
    <span class="sitem" :class="mqttCls()"><i></i><span class="k">MQTT</span><span class="v">{{ cap(S.mqtt) }}</span></span>
    <span class="sitem" :class="boardCls()"><i></i><span class="k">Board</span><span class="v">{{ S.board ? 'Online' : 'Offline' }}</span></span>
    <span class="sitem" :class="sensorCls()"><i></i><span class="k">Sensor</span><span class="v">{{ sensorTxt }}</span></span>
    <span class="sitem" :class="camCls()"><i></i><span class="k">Camera</span><span class="v">{{ S.cam === 'on' ? 'On' : cap(S.cam) }}</span></span>
    <span class="sitem" :class="{ ok: S.audioOn && settings.sound }"><i></i><span class="k">Audio</span><span class="v">{{ S.audioOn ? (settings.sound ? 'On' : 'Muted') : 'Off' }}</span></span>
    <div class="grow"></div>
    <span class="keys mono">Space strum down · Arrow Up strum up · R hold to record · 1-6 chord · 0 camera</span>
  </footer>
</template>
