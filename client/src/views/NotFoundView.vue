<script setup>
import { useRouter } from 'vue-router';
import { NResult, NButton } from 'naive-ui';

const router = useRouter();
</script>

<template>
  <n-result status="404" title="Not found" description="That wheel (or page) doesn't exist.">
    <template #footer>
      <n-button type="primary" @click="router.push('/register')">Create a new wheel</n-button>
    </template>
  </n-result>
</template>
