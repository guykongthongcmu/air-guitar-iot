<script setup>
import { computed, onMounted } from 'vue';
import { S, init } from './store.js';
import AppHeader from './components/AppHeader.vue';
import TutorToolbar from './components/TutorToolbar.vue';
import CameraPanel from './components/CameraPanel.vue';
import StrumFeedback from './components/StrumFeedback.vue';
import RecordPanel from './components/RecordPanel.vue';
import TutorPanel from './components/TutorPanel.vue';
import TrainPanel from './components/TrainPanel.vue';
import TestPanel from './components/TestPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import StatusBar from './components/StatusBar.vue';
import SummaryModal from './components/SummaryModal.vue';

onMounted(init);

const showSide = computed(() => ['tutor', 'train', 'test'].includes(S.tab));
</script>

<template>
  <div class="app">
    <AppHeader />
    <TutorToolbar v-show="S.tab === 'tutor'" />
    <main class="main" :class="{ single: !showSide }">
      <aside class="side" v-show="showSide">
        <CameraPanel />
        <StrumFeedback v-if="S.tab === 'tutor'" />
        <RecordPanel v-if="S.tab === 'train'" />
      </aside>
      <section class="content">
        <TutorPanel v-show="S.tab === 'tutor'" />
        <TrainPanel v-show="S.tab === 'train'" />
        <TestPanel v-show="S.tab === 'test'" />
        <HistoryPanel v-show="S.tab === 'history'" />
        <SettingsPanel v-show="S.tab === 'settings'" />
      </section>
    </main>
    <StatusBar />
    <SummaryModal />
    <div class="toast" v-if="S.toast">{{ S.toast }}</div>
  </div>
</template>
