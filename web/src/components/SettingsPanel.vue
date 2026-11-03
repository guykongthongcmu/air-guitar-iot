<script setup>
import { S, settings, connectMqtt, trainTotal } from '../store.js';
import Toggle from './Toggle.vue';

const avg = a => (a.length ? a.reduce((x, y) => x + y.ms, 0) / a.length : null);
function rows() {
  const m = S.lat.filter(l => l.source === 'mqtt');
  return [
    ['Camera FPS', S.fps || '-'],
    ['Hand detection per frame', S.detMs ? S.detMs + ' ms' : '-'],
    ['Strums handled', S.strums],
    ['MQTT messages received', S.mqttMsgs + (S.badMsgs ? ' (' + S.badMsgs + ' unreadable)' : '')],
    ['Strum to sound, MQTT (browser side only)', m.length ? avg(m).toFixed(1) + ' ms avg of ' + m.length : '-'],
    ['Strum to sound, all sources (browser side only)', S.lat.length ? avg(S.lat).toFixed(1) + ' ms avg, last ' + S.lat[S.lat.length - 1].ms.toFixed(1) + ' ms' : '-'],
    ['Training samples', trainTotal()],
  ];
}
</script>

<template>
  <div class="settings">
    <h1 class="page-title">Settings</h1>

    <div class="sgrid">
      <div class="overline">Strum box connection</div>
      <label class="k">MQTT broker</label>
      <input type="text" v-model="settings.broker">
      <label class="k">Topic prefix</label>
      <div>
        <input type="text" v-model="settings.prefix">
        <div class="hint mono" style="margin-top: 6px">Listening on {{ settings.prefix }}/strum and {{ settings.prefix }}/button</div>
      </div>
      <span></span>
      <div class="toggle-row"><button class="btn" @click="connectMqtt">Save and connect</button><span class="mono">{{ S.mqtt }} {{ S.mqttInfo }}</span></div>
      <span></span>
      <div class="hint">A public broker is open to everyone, so use a prefix that is unique to your group and set the same one on the board.</div>
    </div>

    <div class="sgrid">
      <div class="overline">Hand tracking</div>
      <label class="k">Swap hands</label>
      <div class="toggle-row"><Toggle v-model="settings.swapHands" /><span>{{ settings.swapHands ? 'Using the other hand' : 'Normal' }}</span></div>
      <label class="k">KNN k</label>
      <input type="number" min="1" max="15" v-model.number="settings.k">
      <label class="k">Smoothing (frames)</label>
      <input type="number" min="1" max="21" v-model.number="settings.smooth">
    </div>

    <div class="sgrid">
      <div class="overline">Playing</div>
      <label class="k">Sound on strum</label>
      <div class="toggle-row"><Toggle v-model="settings.sound" /><span>{{ settings.sound ? 'On' : 'Muted' }}</span></div>
      <label class="k">Free play</label>
      <div class="toggle-row"><Toggle v-model="settings.freePlay" /><span>{{ settings.freePlay ? 'Sound any time' : 'Sound only while a song is playing' }}</span></div>
      <label class="k">Play target if none</label>
      <div class="toggle-row"><Toggle v-model="settings.fallbackTarget" /><span>Sound the target chord when no chord is recognised</span></div>
      <label class="k">Metronome click</label>
      <div class="toggle-row"><Toggle v-model="settings.metronome" /><span>{{ settings.metronome ? 'On' : 'Off' }}</span></div>
      <label class="k">Timing offset (ms)</label>
      <input type="number" min="-500" max="500" step="10" v-model.number="settings.offsetMs">
    </div>

    <div>
      <div class="overline" style="color: var(--accent-strong); margin-bottom: 8px">Metrics</div>
      <table class="kv"><tr v-for="r in rows()" :key="r[0]"><td>{{ r[0] }}</td><td>{{ r[1] }}</td></tr></table>
      <p class="hint" style="margin-top: 10px">Strum to sound is measured in the browser only: from the moment the message (or key press) arrives until the sound is scheduled, plus the audio output latency the browser reports. It does not include the sensor, the board, Wi-Fi or the broker.</p>
    </div>
  </div>
</template>
