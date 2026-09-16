<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NButton,
  NSpace,
  NAlert,
  NSpin,
  NText,
  NDivider,
  NPopconfirm,
  useMessage,
} from 'naive-ui';
import { api, pinStore } from '../api.js';
import { write, isCancelled, authErrorMessage } from '../pinGate.js';

const route = useRoute();
const teamId = route.params.id;
const message = useMessage();

const form = ref({ name: '', base_weight: 10, gain_mult: 1, floor_k: 0.1, theme: 'wheel' });
const loading = ref(true);
const loadError = ref('');
const settingsError = ref('');
const resetError = ref('');

const pin = ref({ current: '', next: '', repeat: '' });
const pinError = ref('');

const showForgot = ref(false);
const forgot = ref({ secret: '', next: '', repeat: '' });
const forgotError = ref('');

const themeOptions = [
  { label: 'Wheel', value: 'wheel' },
  { label: 'Horse race', value: 'horse' },
  { label: 'Hot air balloon', value: 'balloon' },
  { label: 'Mountaineer', value: 'mountain' },
];

async function load() {
  try {
    const { team } = await api.getTeam(teamId);
    form.value = {
      name: team.name,
      base_weight: team.base_weight,
      gain_mult: team.gain_mult,
      floor_k: team.floor_k,
      theme: team.theme,
    };
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

// Runs a PIN-gated write; a dismissed prompt is not an error.
async function guarded(errorRef, fn, onOk) {
  errorRef.value = '';
  try {
    const res = await fn();
    onOk(res);
  } catch (e) {
    if (!isCancelled(e)) errorRef.value = authErrorMessage(e);
  }
}

const save = () =>
  guarded(
    settingsError,
    () =>
      write(teamId, (p) => api.updateSettings(teamId, form.value, p), {
        title: 'Save settings',
        message: 'Enter the PIN to update wheel settings.',
      }),
    () => message.success('Settings saved')
  );

const resetAll = () =>
  guarded(
    resetError,
    () =>
      write(teamId, (p) => api.resetAll(teamId, p), {
        title: 'Reset',
        message: 'Enter the PIN to reset all weights to baseline.',
      }),
    () => message.success('Weights reset to baseline')
  );

const resetDay = () =>
  guarded(
    resetError,
    () =>
      write(teamId, (p) => api.resetDay(teamId, p), {
        title: 'Reset to previous day',
        message: 'Restore weights from the most recent previous-day snapshot.',
      }),
    (res) =>
      message.success(res.restored_from ? `Restored snapshot of ${res.restored_from}` : 'Weights restored')
  );

function changePin() {
  pinError.value = '';
  if (!pin.value.current) return (pinError.value = 'Enter the current PIN');
  if (pin.value.next !== pin.value.repeat) return (pinError.value = 'New PINs do not match');
  // Sent directly rather than through the session cache so it always checks
  // the PIN the user just typed.
  guarded(
    pinError,
    () => api.changePin(teamId, pin.value.next, pin.value.current),
    () => {
      pinStore.set(teamId, pin.value.next);
      pin.value = { current: '', next: '', repeat: '' };
      message.success('PIN changed');
    }
  );
}

function forgotPinReset() {
  forgotError.value = '';
  if (forgot.value.next !== forgot.value.repeat) return (forgotError.value = 'New PINs do not match');
  forgotError.value = '';
  api
    .resetPin(teamId, forgot.value.next, forgot.value.secret)
    .then(() => {
      pinStore.set(teamId, forgot.value.next);
      forgot.value = { secret: '', next: '', repeat: '' };
      showForgot.value = false;
      message.success('PIN reset');
    })
    .catch((e) => (forgotError.value = authErrorMessage(e, 'admin secret')));
}

onMounted(load);
</script>

<template>
  <div class="narrow">
    <h2>Settings</h2>
    <n-spin v-if="loading" size="large" class="loading" />
    <n-alert v-else-if="loadError" type="error" title="Could not load this team">{{ loadError }}</n-alert>

    <n-space v-else vertical size="large">
      <n-card title="Wheel behaviour">
        <n-form label-placement="top" @submit.prevent="save">
          <n-form-item label="Team name">
            <n-input v-model:value="form.name" />
          </n-form-item>
          <n-form-item label="Base weight" feedback="Baseline each member starts at. The picked penalty equals this value.">
            <n-input-number v-model:value="form.base_weight" :min="1" :step="1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Gain multiplier" feedback="How fast weights drift apart. 0 means uniform random.">
            <n-input-number v-model:value="form.gain_mult" :min="0" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Floor" feedback="Minimum chance anyone keeps, as a fraction of base weight.">
            <n-input-number v-model:value="form.floor_k" :min="0" :max="0.99" :step="0.01" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Animation theme">
            <n-select v-model:value="form.theme" :options="themeOptions" />
          </n-form-item>
          <n-space vertical>
            <n-button type="primary" attr-type="submit">Save settings</n-button>
            <n-alert v-if="settingsError" type="error" closable @close="settingsError = ''">{{ settingsError }}</n-alert>
          </n-space>
        </n-form>
      </n-card>

      <n-card title="Reset">
        <n-space vertical>
          <n-text depth="3">The pick history is never erased. Only weights change.</n-text>
          <n-space>
            <n-button @click="resetDay">Undo to previous day</n-button>
            <n-popconfirm @positive-click="resetAll">
              <template #trigger>
                <n-button type="error">Reset all to baseline</n-button>
              </template>
              Reset every weight to baseline? The pick history is kept.
            </n-popconfirm>
          </n-space>
          <n-alert v-if="resetError" type="error" closable @close="resetError = ''">{{ resetError }}</n-alert>
        </n-space>
      </n-card>

      <n-card title="Change PIN">
        <n-form label-placement="top" @submit.prevent="changePin">
          <n-form-item label="Current PIN">
            <n-input
              v-model:value="pin.current"
              type="password"
              show-password-on="click"
              :input-props="{ inputmode: 'numeric', autocomplete: 'current-password' }"
            />
          </n-form-item>
          <n-space :wrap="false" style="width: 100%">
            <n-form-item label="New PIN (4 to 8 digits)" style="flex: 1">
              <n-input
                v-model:value="pin.next"
                type="password"
                show-password-on="click"
                :input-props="{ inputmode: 'numeric', autocomplete: 'new-password' }"
              />
            </n-form-item>
            <n-form-item label="Repeat" style="flex: 1">
              <n-input
                v-model:value="pin.repeat"
                type="password"
                show-password-on="click"
                :input-props="{ inputmode: 'numeric', autocomplete: 'new-password' }"
              />
            </n-form-item>
          </n-space>
          <n-space vertical>
            <n-button attr-type="submit">Update PIN</n-button>
            <n-alert v-if="pinError" type="error" closable @close="pinError = ''">{{ pinError }}</n-alert>
          </n-space>
        </n-form>

        <n-divider />

        <n-button v-if="!showForgot" text type="primary" @click="showForgot = true">
          Forgot it? Reset the PIN with the admin secret.
        </n-button>
        <n-form v-else label-placement="top" @submit.prevent="forgotPinReset">
          <n-space vertical size="small" style="margin-bottom: 16px">
            <n-text strong>Reset PIN with the admin secret</n-text>
            <n-text depth="3">
              Ask whoever runs this server for the admin secret. If none is configured, reset is disabled.
            </n-text>
          </n-space>
          <n-form-item label="Admin secret">
            <n-input v-model:value="forgot.secret" type="password" show-password-on="click" />
          </n-form-item>
          <n-space :wrap="false" style="width: 100%">
            <n-form-item label="New PIN (4 to 8 digits)" style="flex: 1">
              <n-input
                v-model:value="forgot.next"
                type="password"
                show-password-on="click"
                :input-props="{ inputmode: 'numeric', autocomplete: 'new-password' }"
              />
            </n-form-item>
            <n-form-item label="Repeat" style="flex: 1">
              <n-input
                v-model:value="forgot.repeat"
                type="password"
                show-password-on="click"
                :input-props="{ inputmode: 'numeric', autocomplete: 'new-password' }"
              />
            </n-form-item>
          </n-space>
          <n-space vertical>
            <n-space>
              <n-button type="primary" attr-type="submit">Reset PIN</n-button>
              <n-button @click="showForgot = false">Cancel</n-button>
            </n-space>
            <n-alert v-if="forgotError" type="error" closable @close="forgotError = ''">{{ forgotError }}</n-alert>
          </n-space>
        </n-form>
      </n-card>
    </n-space>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}
</style>
