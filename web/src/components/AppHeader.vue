<script setup>
import { S, settings, startAll, startCamera, stopCamera } from '../store.js';
import { theme, toggleTheme } from '../theme.js';

const tabs = [['tutor', 'Tutor'], ['train', 'Train'], ['test', 'Test'], ['history', 'History'], ['settings', 'Settings']];
</script>

<template>
  <header class="header">
    <div class="brand">
      <div class="logo"><i></i><i></i><i></i><i></i><b></b></div>
      <div class="brand-name">Air Guitar</div>
    </div>
    <nav class="nav">
      <button v-for="t in tabs" :key="t[0]" :class="{ on: S.tab === t[0] }" @click="S.tab = t[0]">{{ t[1] }}</button>
    </nav>
    <div class="grow"></div>
    <div class="header-right">
      <button class="theme-btn" @click="toggleTheme"><span></span>{{ theme === 'dark' ? 'Light theme' : 'Dark theme' }}</button>
      <button class="btn" :class="{ muted: !settings.sound }" @click="settings.sound = !settings.sound">{{ settings.sound ? 'Sound on' : 'Muted' }}</button>
      <button class="btn" v-if="S.cam === 'on' || S.cam === 'loading'" @click="stopCamera">Stop camera</button>
      <button class="btn" v-else-if="S.started" @click="startCamera">Start camera</button>
      <button class="btn primary" @click="startAll">{{ S.started ? 'Running' : 'Start' }}</button>
    </div>
  </header>
</template>
