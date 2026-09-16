<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NForm, NFormItem, NInput, NButton, NAlert, NSpace } from 'naive-ui';
import { api, pinStore } from '../api.js';
import { authErrorMessage } from '../pinGate.js';

const router = useRouter();
const form = ref({ name: '', pin: '', repeat: '', secret: '' });
const error = ref('');
const creating = ref(false);

async function create() {
  error.value = '';
  if (form.value.pin !== form.value.repeat) {
    error.value = 'PINs do not match';
    return;
  }
  creating.value = true;
  try {
    const { id } = await api.createTeam(form.value.name || 'Team', form.value.pin, form.value.secret);
    pinStore.set(id, form.value.pin);
    router.push(`/team/${id}`);
  } catch (e) {
    error.value = authErrorMessage(e, 'registration secret');
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="narrow">
    <h2>Create a new team</h2>
    <n-card>
      <n-form label-placement="top" @submit.prevent="create">
        <n-form-item label="Team name">
          <n-input v-model:value="form.name" placeholder="e.g. Squad A" />
        </n-form-item>
        <n-form-item label="PIN (4 to 8 digits)" feedback="Required for every action that changes the picker.">
          <n-input
            v-model:value="form.pin"
            type="password"
            show-password-on="click"
            :input-props="{ inputmode: 'numeric', autocomplete: 'new-password' }"
          />
        </n-form-item>
        <n-form-item label="Repeat PIN">
          <n-input
            v-model:value="form.repeat"
            type="password"
            show-password-on="click"
            :input-props="{ inputmode: 'numeric', autocomplete: 'new-password' }"
          />
        </n-form-item>
        <n-form-item label="Registration secret" feedback="Ask your admin. Leave empty if this server allows open registration.">
          <n-input v-model:value="form.secret" type="password" show-password-on="click" />
        </n-form-item>
        <n-space vertical>
          <n-alert v-if="error" type="error" closable @close="error = ''">{{ error }}</n-alert>
          <n-button type="primary" block attr-type="submit" :loading="creating" :disabled="creating">
            Create team
          </n-button>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>
