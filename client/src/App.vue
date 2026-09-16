<script setup>
import { computed, h, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
  NConfigProvider,
  NGlobalStyle,
  NMessageProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NText,
} from 'naive-ui';
import PinPrompt from './components/PinPrompt.vue';
import { api } from './api.js';
import { darkTheme, themeOverrides } from './theme.js';

const route = useRoute();
const teamId = computed(() => route.params.id);
const teamName = ref('');

watch(
  teamId,
  async (id) => {
    teamName.value = '';
    if (!id) return;
    try {
      const state = await api.getTeam(id);
      teamName.value = state.team.name;
      document.title = `${state.team.name} — Wheel of Names`;
    } catch {
      document.title = 'Wheel of Names';
    }
  },
  { immediate: true }
);

const tabs = [
  ['wheel', 'Wheel'],
  ['roster', 'Roster'],
  ['stats', 'Stats'],
  ['settings', 'Settings'],
];
const menuOptions = computed(() =>
  tabs.map(([name, label]) => ({
    key: name,
    label: () => h(RouterLink, { to: { name, params: { id: teamId.value } } }, () => label),
  }))
);
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-global-style />
    <n-message-provider>
      <n-layout class="shell">
        <n-layout-header bordered class="topbar">
          <router-link to="/" class="brand">🎡 Wheel of Names</router-link>
          <n-text v-if="teamName" depth="3" class="team-name">{{ teamName }}</n-text>
          <n-menu
            v-if="teamId"
            mode="horizontal"
            :value="route.name"
            :options="menuOptions"
            class="nav"
          />
        </n-layout-header>
        <n-layout-content>
          <div class="page" :class="{ wide: route.name === 'wheel' }">
            <router-view :key="route.fullPath" />
          </div>
        </n-layout-content>
      </n-layout>
      <PinPrompt />
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
/* n-layout sets overflow:hidden, which stops the sticky header from sticking
   to the document scroll. The layout is in normal flow here, so let it overflow. */
.shell {
  overflow: visible;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  min-height: 56px;
  flex-wrap: wrap;
}
.brand {
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.team-name {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav {
  margin-left: auto;
}
.page.wide {
  --chrome: 105px; /* header 57px + page padding 24px top + 24px bottom */
  max-width: 1200px;
  padding-bottom: 24px;
}
</style>
