<script setup>
import { nextTick, ref, watch } from 'vue';
import { NModal, NCard, NInput, NButton, NSpace } from 'naive-ui';
import { gate, submitPin, cancelPin } from '../pinGate.js';

const pin = ref('');
const input = ref(null);

watch(
  () => gate.open,
  async (open) => {
    if (!open) return;
    pin.value = '';
    await nextTick();
    input.value?.focus();
  }
);
</script>

<template>
  <n-modal :show="gate.open" @update:show="(v) => !v && cancelPin()">
    <n-card :title="gate.title" style="width: 340px" :bordered="true" role="dialog" aria-modal="true">
      <p v-if="gate.message" class="muted" style="margin-top: 0">{{ gate.message }}</p>
      <n-input
        ref="input"
        v-model:value="pin"
        type="password"
        show-password-on="click"
        placeholder="Enter PIN"
        :input-props="{ inputmode: 'numeric' }"
        @keyup.enter="submitPin(pin)"
      />
      <p v-if="gate.error" class="error" style="margin-bottom: 0">{{ gate.error }}</p>
      <template #footer>
        <n-space justify="end">
          <n-button quaternary :disabled="gate.busy" @click="cancelPin">Cancel</n-button>
          <n-button type="primary" :loading="gate.busy" :disabled="gate.busy" @click="submitPin(pin)">
            Unlock
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
