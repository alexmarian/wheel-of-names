<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NButton, NSpace, NAlert, NSpin, NEmpty } from 'naive-ui';
import { api } from '../api.js';
import { write, isCancelled, authErrorMessage } from '../pinGate.js';
import SpinReveal from '../components/SpinReveal.vue';
import WinnerAnnouncement from '../components/WinnerAnnouncement.vue';

const route = useRoute();
const teamId = route.params.id;

const state = ref(null);
const loading = ref(true);
const loadError = ref('');
const error = ref('');
const busy = ref(false);
const show = ref(null); // { winner, mode }
const revealKey = ref(0);
const finished = ref(false);

async function load() {
  loading.value = true;
  try {
    state.value = await api.getTeam(teamId);
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function doSpin(preview = false) {
  error.value = '';
  busy.value = true;
  try {
    let res;
    if (preview) {
      res = await api.preview(teamId);
    } else {
      res = await write(teamId, (pin) => api.spin(teamId, pin), {
        title: 'Record a pick',
        message: 'Enter the PIN. This pick will be recorded.',
      });
      state.value = { team: res.team, members: res.members, meta: res.meta };
    }
    finished.value = false;
    show.value = { winner: res.winner, mode: preview ? 'preview' : 'real' };
    revealKey.value++;
  } catch (e) {
    if (!isCancelled(e)) error.value = authErrorMessage(e);
  } finally {
    busy.value = false;
  }
}

const activeMembers = computed(() => state.value?.members.filter((m) => !m.absent) || []);

onMounted(load);
</script>

<template>
  <div>
    <n-spin v-if="loading" size="large" class="loading" />
    <n-alert v-else-if="!state" type="error" title="Could not load this team">{{ loadError }}</n-alert>

    <div v-else class="wheel-page">
      <n-card class="reveal-card" content-style="padding: 12px; flex: 1; min-height: 0; display: flex">
        <div class="reveal">
          <SpinReveal
            v-if="show?.winner"
            :key="revealKey"
            :entries="state.members"
            :winner-id="show.winner.id"
            :theme="state.team.theme"
            @finished="finished = true"
          />
          <n-empty v-else size="large" description="Press Pick to choose who's up today." class="idle">
            <template #icon><span class="idle-icon">🎡</span></template>
          </n-empty>
          <WinnerAnnouncement
            v-if="show?.winner && finished"
            :key="revealKey"
            :winner="show.winner"
            :mode="show.mode"
          />
        </div>
      </n-card>

      <n-space justify="center">
        <n-button
          type="primary"
          size="large"
          :loading="busy"
          :disabled="busy || activeMembers.length === 0"
          @click="doSpin(false)"
        >
          Pick
        </n-button>
        <n-button size="large" :disabled="busy" @click="doSpin(true)">Preview (no record)</n-button>
      </n-space>

      <n-alert v-if="error" type="error" closable @close="error = ''">{{ error }}</n-alert>
      <n-alert v-if="activeMembers.length === 0" type="warning" title="No active members">
        Add people on the Roster tab, or un-mark them absent.
      </n-alert>
    </div>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}
/* Fill the viewport below the header exactly (no magic reveal height), so
   the page never scrolls on its own; the reveal takes whatever is left after
   the buttons. --chrome is header + page padding, set by the shell. */
.wheel-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - var(--chrome, 105px));
  height: calc(100dvh - var(--chrome, 105px));
}
.reveal-card {
  flex: 1;
  min-height: 0;
  max-height: 926px;
  display: flex;
  flex-direction: column;
}
.reveal {
  position: relative;
  flex: 1;
  min-height: 320px;
}
/* Higher specificity than the themes' own root rules, so the layer always
   fills the box regardless of stylesheet order. */
.wheel-page .reveal > * {
  position: absolute;
  inset: 0;
}
.idle {
  justify-content: center;
}
.idle-icon {
  font-size: 40px;
  opacity: 0.6;
}
</style>
