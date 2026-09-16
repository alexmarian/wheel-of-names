<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NFormItem, NInput, NButton } from 'naive-ui';
import { api, pinStore } from '../api.js';

const router = useRouter();
const name = ref('');
const pin = ref('');
const pin2 = ref('');
const secret = ref('');
const error = ref('');
const creating = ref(false);

async function create() {
  error.value = '';
  if (pin.value !== pin2.value) {
    error.value = 'PINs do not match';
    return;
  }
  creating.value = true;
  try {
    const { id } = await api.createTeam(name.value || 'Team', pin.value, secret.value);
    pinStore.set(id, pin.value);
    router.push(`/team/${id}`);
  } catch (e) {
    error.value = e.message;
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div>
    <h1>Create a new name picker</h1>
    <p class="muted">
      Each team gets its own link (<code>/team/:id</code>) and PIN. The picker favors people who
      haven't been picked for a long time, and avoids picking the same person twice in a row.
    </p>
    <n-card style="max-width: 420px">
      <n-form-item label="Team name">
        <n-input v-model:value="name" placeholder="e.g. Squad A" @keyup.enter="create" />
      </n-form-item>
      <n-form-item label="PIN (4–8 digits) — required for every action that changes the picker">
        <n-input
          v-model:value="pin"
          type="password"
          show-password-on="click"
          placeholder="1234"
          :input-props="{ inputmode: 'numeric' }"
          @keyup.enter="create"
        />
      </n-form-item>
      <n-form-item label="Repeat PIN">
        <n-input
          v-model:value="pin2"
          type="password"
          show-password-on="click"
          placeholder="1234"
          :input-props="{ inputmode: 'numeric' }"
          @keyup.enter="create"
        />
      </n-form-item>
      <n-form-item label="Registration secret (ask your admin, if one is configured)">
        <n-input
          v-model:value="secret"
          type="password"
          show-password-on="click"
          placeholder="optional"
          @keyup.enter="create"
        />
      </n-form-item>
      <p v-if="error" class="error">{{ error }}</p>
      <n-button type="primary" block :loading="creating" :disabled="creating" @click="create">
        {{ creating ? 'Creating…' : 'Create team' }}
      </n-button>
    </n-card>
  </div>
</template>
