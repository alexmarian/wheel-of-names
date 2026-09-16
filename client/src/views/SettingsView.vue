<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NFormItem, NInput, NInputNumber, NSelect, NButton, NSpace } from 'naive-ui';
import { api, pinStore } from '../api.js';
import { write } from '../pinGate.js';

const route = useRoute();
const teamId = route.params.id;

const form = ref({ name: '', base_weight: 10, gain_mult: 1, floor_k: 0.1, theme: 'wheel' });
const pin1 = ref('');
const pin2 = ref('');
const loading = ref(true);
const error = ref('');
const notice = ref('');

const themeOptions = [
  { label: 'Wheel', value: 'wheel' },
  { label: 'Horse race', value: 'horse' },
  { label: 'Hot air balloon', value: 'balloon' },
  { label: 'Mountaineer', value: 'mountain' },
];

async function load() {
  loading.value = true;
  try {
    const state = await api.getTeam(teamId);
    form.value = {
      name: state.team.name,
      base_weight: state.team.base_weight,
      gain_mult: state.team.gain_mult,
      floor_k: state.team.floor_k,
      theme: state.team.theme,
    };
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function save() {
  error.value = '';
  notice.value = '';
  try {
    await write(teamId, (pin) => api.updateSettings(teamId, form.value, pin), {
      title: 'Save settings',
      message: 'Enter the PIN to update wheel settings.',
    });
    notice.value = 'Settings saved.';
  } catch (e) {
    error.value = e.message;
  }
}

async function changePin() {
  error.value = '';
  notice.value = '';
  if (pin1.value !== pin2.value) {
    error.value = 'PINs do not match';
    return;
  }
  try {
    await write(teamId, (pin) => api.changePin(teamId, pin1.value, pin), {
      title: 'Change PIN',
      message: 'Enter the current PIN to set a new one.',
    });
    // request() cached the *old* PIN (it authenticated with that); the team now
    // expects the new one, so overwrite the cached value + restart the window.
    pinStore.set(teamId, pin1.value);
    notice.value = 'PIN changed.';
    pin1.value = '';
    pin2.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

async function resetAll() {
  if (!confirm('Reset all weights to baseline? This does NOT erase the pick history.')) return;
  error.value = '';
  notice.value = '';
  try {
    await write(teamId, (pin) => api.resetAll(teamId, pin), { title: 'Reset', message: 'Enter PIN to reset all weights to baseline.' });
    notice.value = 'Weights reset to baseline.';
  } catch (e) {
    error.value = e.message;
  }
}

async function resetDay() {
  error.value = '';
  notice.value = '';
  try {
    const res = await write(teamId, (pin) => api.resetDay(teamId, pin), {
      title: 'Reset to previous day',
      message: 'Restore weights from the most recent previous-day snapshot.',
    });
    notice.value = res.restored_from
      ? `Restored from snapshot of ${res.restored_from}.`
      : 'Weights restored.';
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2>Settings</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>
    <div v-if="loading" class="empty">Loading…</div>

    <n-space v-else vertical size="large" style="width: 100%">
      <n-card style="max-width: 520px">
        <h3>Wheel behaviour</h3>
        <n-form-item label="Team name">
          <n-input v-model:value="form.name" />
        </n-form-item>
        <n-form-item label="Base weight (W) — baseline each member starts at; the picked penalty = W">
          <n-input-number v-model:value="form.base_weight" :min="1" :step="1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Gain multiplier — speed weights drift apart (0 = uniform random)">
          <n-input-number v-model:value="form.gain_mult" :min="0" :step="0.1" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Floor (k × base) — minimum chance anyone keeps">
          <n-input-number v-model:value="form.floor_k" :min="0" :max="0.99" :step="0.01" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Animation theme">
          <n-select v-model:value="form.theme" :options="themeOptions" />
        </n-form-item>
        <n-button type="primary" @click="save">Save settings</n-button>
      </n-card>

      <n-card style="max-width: 520px">
        <h3>Reset</h3>
        <p class="muted" style="font-size: 13px">
          The pick history is never erased. Only weights change.
        </p>
        <n-space>
          <n-button @click="resetDay">Undo to previous day</n-button>
          <n-button type="error" ghost @click="resetAll">Reset all to baseline</n-button>
        </n-space>
      </n-card>

      <n-card style="max-width: 520px">
        <h3>Change PIN</h3>
        <n-space>
          <n-input
            v-model:value="pin1"
            type="password"
            show-password-on="click"
            placeholder="New PIN (4–8 digits)"
            :input-props="{ inputmode: 'numeric' }"
            style="flex: 1; min-width: 160px"
          />
          <n-input
            v-model:value="pin2"
            type="password"
            show-password-on="click"
            placeholder="Repeat"
            :input-props="{ inputmode: 'numeric' }"
            style="flex: 1; min-width: 160px"
          />
          <n-button @click="changePin">Update PIN</n-button>
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>
