<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NButton, NSpace } from 'naive-ui';
import { api } from '../api.js';
import { write } from '../pinGate.js';
import SpinReveal from '../components/SpinReveal.vue';
import WinnerAnnouncement from '../components/WinnerAnnouncement.vue';

const route = useRoute();
const teamId = route.params.id;

const state = ref(null);
const loading = ref(true);
const error = ref('');
const busy = ref(false);
const show = ref(null); // { winner, mode }
const revealKey = ref(0);
const finished = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    state.value = await api.getTeam(teamId);
    document.title = `Wheel — ${state.value.team.name}`;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function doSpin(preview = false) {
  error.value = '';
  busy.value = true;
  finished.value = false;
  try {
    if (preview) {
      const res = await api.preview(teamId);
      show.value = { winner: res.winner, mode: 'preview' };
    } else {
      const res = await write(teamId, (pin) => api.spin(teamId, pin), {
        title: 'Record a pick',
        message: 'Enter the PIN — this pick will be recorded.',
      });
      state.value = { team: res.team, members: res.members, meta: res.meta };
      show.value = { winner: res.winner, mode: 'real' };
    }
    revealKey.value++;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function onFinished() {
  finished.value = true;
}

const activeMembers = computed(
  () => state.value?.members.filter((m) => !m.absent) || []
);

onMounted(load);
</script>

<template>
  <div>
    <div v-if="loading" class="empty">Loading…</div>
    <p v-else-if="error" class="error">{{ error }}</p>

    <n-space v-else-if="state" vertical size="large" style="width: 100%">
      <!-- Reveal area -->
      <n-card>
        <SpinReveal
          v-if="show?.winner"
          :key="revealKey"
          :entries="state.members"
          :winner-id="show.winner.id"
          :theme="state.team.theme"
          @finished="onFinished"
        />
        <div v-else class="idle-panel">
          <span class="idle-icon">🎡</span>
          <p>Press <b>Pick</b> to choose who's up today.</p>
        </div>
      </n-card>

      <WinnerAnnouncement v-if="show?.winner && finished" :key="revealKey" :winner="show.winner" :mode="show.mode" />

      <div>
        <n-space justify="center">
          <n-button type="primary" size="large" :loading="busy" :disabled="busy || activeMembers.length === 0" @click="doSpin(false)">
            Pick
          </n-button>
          <n-button size="large" tertiary :disabled="busy" @click="doSpin(true)">Preview (no record)</n-button>
        </n-space>
        <p v-if="activeMembers.length === 0" class="error center" style="margin-bottom: 0">
          No active members — add people on the Roster tab, or un-mark them absent.
        </p>
      </div>
    </n-space>
  </div>
</template>

<style scoped>
.center {
  text-align: center;
}
.idle-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 560px;
  padding: 20px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  text-align: center;
}
.idle-icon {
  font-size: 30px;
  opacity: 0.55;
}
.idle-panel p {
  margin: 0;
}
</style>
