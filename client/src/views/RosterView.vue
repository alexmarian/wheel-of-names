<script setup>
import { h, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  NCard,
  NInput,
  NInputGroup,
  NButton,
  NDataTable,
  NTag,
  NSpace,
  NProgress,
  NAlert,
  NSpin,
  NEmpty,
  NText,
  NPopconfirm,
  NIcon,
} from 'naive-ui';
import { api } from '../api.js';
import { write, isCancelled, authErrorMessage } from '../pinGate.js';

const route = useRoute();
const teamId = route.params.id;

const state = ref(null);
const loading = ref(true);
const loadError = ref('');
const error = ref('');
const newName = ref('');

async function load() {
  try {
    state.value = await api.getTeam(teamId);
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function act(fn) {
  error.value = '';
  try {
    const { members, meta } = await write(teamId, (pin) => fn(pin), {
      title: 'Edit roster',
      message: 'Enter the PIN to modify the roster.',
    });
    state.value = { team: state.value.team, members, meta };
  } catch (e) {
    if (!isCancelled(e)) error.value = authErrorMessage(e);
  }
}

function addMember() {
  const name = newName.value.trim();
  if (!name) return;
  act((pin) => api.addMember(teamId, name, pin));
  newName.value = '';
}

const toggleAbsent = (m) => act((pin) => api.updateMember(teamId, m.id, { absent: !m.absent }, pin));
const removeMember = (m) => act((pin) => api.deleteMember(teamId, m.id, pin));

onMounted(load);

const trashIcon = () =>
  h(NIcon, null, () =>
    h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      [h('path', { d: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6' })]
    )
  );

const pct = (p) => `${(p * 100).toFixed(1)}%`;

const columns = [
  { title: 'Name', key: 'name' },
  { title: 'Weight', key: 'weight', width: 90, render: (row) => row.weight.toFixed(1) },
  { title: 'Chance', key: 'probability', width: 90, render: (row) => pct(row.probability) },
  {
    title: 'Status',
    key: 'absent',
    width: 90,
    render: (row) =>
      h(NTag, { type: row.absent ? 'warning' : 'success', size: 'small', bordered: false }, () =>
        row.absent ? 'absent' : 'active'
      ),
  },
  {
    title: '',
    key: 'actions',
    width: 170,
    render: (row) =>
      h(NSpace, { justify: 'end', wrapItem: false }, () => [
        h(NButton, { size: 'small', quaternary: true, onClick: () => toggleAbsent(row) }, () =>
          row.absent ? 'Mark present' : 'Mark absent'
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => removeMember(row) },
          {
            trigger: () =>
              h(NButton, { size: 'small', quaternary: true, circle: true, type: 'error', 'aria-label': `Remove ${row.name}` }, {
                icon: trashIcon,
              }),
            default: () => `Remove ${row.name} from the team?`,
          }
        ),
      ]),
  },
];
</script>

<template>
  <div>
    <h2>Roster</h2>
    <n-spin v-if="loading" size="large" class="loading" />
    <n-alert v-else-if="loadError" type="error" title="Could not load this team">{{ loadError }}</n-alert>

    <n-space v-else vertical size="large">
      <n-card title="Members">
        <n-space vertical size="large">
          <n-input-group>
            <n-input v-model:value="newName" placeholder="Add a teammate" @keyup.enter="addMember" />
            <n-button type="primary" @click="addMember">Add</n-button>
          </n-input-group>
          <n-alert v-if="error" type="error" closable @close="error = ''">{{ error }}</n-alert>
          <n-data-table
            v-if="state.members.length"
            :columns="columns"
            :data="state.members"
            :row-key="(row) => row.id"
            :bordered="false"
          />
          <n-empty v-else description="No members yet." />
        </n-space>
      </n-card>

      <n-card title="Current odds">
        <n-space v-if="state.members.length" vertical size="large">
          <div v-for="m in state.members" :key="m.id">
            <div class="odds-head">
              <n-text :depth="m.absent ? 3 : 1" strong>{{ m.name }}</n-text>
              <n-tag v-if="m.absent" type="warning" size="small" :bordered="false">absent</n-tag>
              <n-text depth="3" class="odds-pct">{{ pct(m.probability) }}</n-text>
            </div>
            <n-progress
              type="line"
              :percentage="m.probability * 100"
              :show-indicator="false"
              :height="8"
              :status="m.absent ? 'default' : 'info'"
            />
          </div>
        </n-space>
        <n-empty v-else description="No members yet." />
        <template #footer>
          <n-text depth="3" style="font-size: 12px">
            g = gain_mult × base / roster = {{ state.meta.g.toFixed(3) }} · floor = {{ state.meta.floor }} ·
            roster {{ state.meta.roster_count }} · active {{ state.meta.active_count }}
          </n-text>
        </template>
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
.odds-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.odds-pct {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
</style>
