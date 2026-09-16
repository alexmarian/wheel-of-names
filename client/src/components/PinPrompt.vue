<script setup>
import { nextTick, ref, watch } from 'vue';
import { NModal, NCard, NInput, NButton, NSpace, NText } from 'naive-ui';
import { gate, submitPin, cancelPin } from '../pinGate.js';

const pin = ref('');
const input = ref(null);

async function resetInput() {
  pin.value = '';
  await nextTick();
  input.value?.focus();
}

watch(() => gate.open, (open) => open && resetInput());
watch(() => gate.attempt, resetInput);
</script>

<template>
  <n-modal :show="gate.open" @update:show="(v) => !v && cancelPin()">
    <n-card :title="gate.title" style="width: 360px" role="dialog" aria-modal="true">
      <n-space vertical>
        <n-text v-if="gate.message" depth="3">{{ gate.message }}</n-text>
        <n-input
          ref="input"
          v-model:value="pin"
          type="password"
          show-password-on="click"
          placeholder="Enter PIN"
          :status="gate.error ? 'error' : undefined"
          :input-props="{ inputmode: 'numeric' }"
          @keyup.enter="submitPin(pin)"
        />
        <n-text v-if="gate.error" type="error">{{ gate.error }}</n-text>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button :disabled="gate.busy" @click="cancelPin">Cancel</n-button>
          <n-button type="primary" :loading="gate.busy" :disabled="gate.busy" @click="submitPin(pin)">
            Unlock
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
