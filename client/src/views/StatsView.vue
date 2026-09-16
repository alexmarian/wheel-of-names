<script setup>
import { h, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NDataTable, NTag, NSpace, NAlert, NSpin, NEmpty, NStatistic } from 'naive-ui';
import { api } from '../api.js';

const route = useRoute();
const teamId = route.params.id;
const data = ref(null);
const loading = ref(true);
const loadError = ref('');

onMounted(async () => {
  try {
    data.value = await api.stats(teamId);
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
});

const fmtDays = (d) => (d === null ? 'never picked' : `${d} days`);

const droughtColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Last picked', key: 'last_pick', render: (row) => row.last_pick || 'never' },
  { title: 'Days since', key: 'days', render: (row) => fmtDays(row.days) },
];

const lifetimeColumns = [
  {
    title: 'Name',
    key: 'name',
    render: (row, i) =>
      i === 0
        ? h(NSpace, { align: 'center', size: 'small' }, () => [
            row.name,
            h(NTag, { type: 'success', size: 'small', bordered: false }, () => 'top'),
          ])
        : row.name,
  },
  { title: 'Picks', key: 'count', width: 90 },
];

const monthlyColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Picks', key: 'count', width: 90 },
];
</script>

<template>
  <div>
    <h2>Statistics</h2>
    <n-spin v-if="loading" size="large" class="loading" />
    <n-alert v-else-if="loadError" type="error" title="Could not load statistics">{{ loadError }}</n-alert>

    <n-space v-else vertical size="large">
      <n-card v-if="data.due" title="Currently due for a pick">
        <n-statistic :value="data.due.name">
          <template #suffix>
            <span style="font-size: 14px">
              {{ data.due.last_pick ? `last picked ${data.due.last_pick}, ${fmtDays(data.due.days)} ago` : 'never picked' }}
            </span>
          </template>
        </n-statistic>
      </n-card>

      <n-card title="Longest drought">
        <n-data-table
          v-if="data.droughts.length"
          :columns="droughtColumns"
          :data="data.droughts"
          :row-key="(row) => row.id"
          :bordered="false"
        />
        <n-empty v-else description="No active members." />
      </n-card>

      <n-card title="Lifetime leaders">
        <n-data-table
          v-if="data.lifetime.length"
          :columns="lifetimeColumns"
          :data="data.lifetime"
          :row-key="(row) => row.id"
          :bordered="false"
        />
        <n-empty v-else description="No picks recorded yet." />
      </n-card>

      <n-card title="Monthly leaders">
        <n-data-table
          v-if="data.monthly.length"
          :columns="monthlyColumns"
          :data="data.monthly"
          :row-key="(row) => row.id"
          :bordered="false"
        />
        <n-empty v-else description="No picks recorded this month yet." />
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
