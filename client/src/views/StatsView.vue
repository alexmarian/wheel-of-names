<script setup>
import { h, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NDataTable, NTag, NSpace } from 'naive-ui';
import { api } from '../api.js';

const route = useRoute();
const teamId = route.params.id;
const data = ref(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    data.value = await api.stats(teamId);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

const fmtDays = (d) => (d === null ? 'never picked' : `${d}d`);

const droughtColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Last picked', key: 'last_pick', render: (row) => row.last_pick || '—' },
  { title: 'Days since', key: 'days', render: (row) => fmtDays(row.days) },
];

const lifetimeColumns = [
  { title: '#', key: 'rank', width: 48 },
  {
    title: 'Name',
    key: 'name',
    render: (row, i) =>
      i === 0
        ? h('span', [row.name, ' ', h(NTag, { type: 'success', size: 'small', round: true, bordered: false }, { default: () => 'top' })])
        : row.name,
  },
  { title: 'Picks', key: 'count' },
];

const monthlyColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Picks', key: 'count' },
];
</script>

<template>
  <div>
    <h2>Statistics</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="empty">Loading…</div>

    <n-space v-else-if="data" vertical size="large" style="width: 100%">
      <n-card v-if="data.due">
        <h3>Currently due for a pick</h3>
        <p>
          <b>{{ data.due.name }}</b> — last picked
          {{ data.due.last_pick ? data.due.last_pick + ' (' + fmtDays(data.due.days) + ' ago)' : 'never' }}
        </p>
      </n-card>

      <n-card>
        <h3>Longest drought</h3>
        <n-data-table :columns="droughtColumns" :data="data.droughts" :row-key="(row) => row.id" :bordered="false" />
      </n-card>

      <n-card>
        <h3>Lifetime leaders</h3>
        <n-data-table :columns="lifetimeColumns" :data="data.lifetime" :row-key="(row) => row.id" :bordered="false" />
      </n-card>

      <n-card>
        <h3>Monthly leaders (this month)</h3>
        <n-data-table
          v-if="data.monthly.length"
          :columns="monthlyColumns"
          :data="data.monthly"
          :row-key="(row) => row.id"
          :bordered="false"
        />
        <div v-else class="empty">No picks recorded this month yet.</div>
      </n-card>
    </n-space>
  </div>
</template>
