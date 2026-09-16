<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NConfigProvider } from 'naive-ui';
import PinPrompt from './components/PinPrompt.vue';
import { darkTheme, themeOverrides } from './theme.js';

const route = useRoute();
const teamName = ref('');

watch(
  () => route.params.id,
  () => {
    teamName.value = document.title.includes('—')
      ? document.title.split('—')[1].trim()
      : '';
  },
  { immediate: true }
);
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <header class="topbar">
      <router-link to="/" class="brand">🎡 Wheel of Names</router-link>
      <span v-if="route.params.id" class="team-name">{{ teamName || route.params.id }}</span>
      <nav v-if="route.params.id">
        <router-link :to="`/team/${route.params.id}`">Wheel</router-link>
        <router-link :to="`/team/${route.params.id}/roster`">Roster</router-link>
        <router-link :to="`/team/${route.params.id}/stats`">Stats</router-link>
        <router-link :to="`/team/${route.params.id}/settings`">Settings</router-link>
      </nav>
    </header>
    <router-view :key="route.fullPath" />
    <PinPrompt />
  </n-config-provider>
</template>
