<script setup>
import { h, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NInput, NButton, NDataTable, NTag, NSpace, NProgress } from 'naive-ui';
import { api } from '../api.js';
import { write } from '../pinGate.js';
import { palette } from '../theme.js';

const route = useRoute();
const teamId = route.params.id;

const state = ref(null);
const loading = ref(true);
const error = ref('');
const newName = ref('');

async function load() {
  loading.value = true;
  try {
    state.value = await api.getTeam(teamId);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function act(fn, patch) {
  error.value = '';
  try {
    const { members, meta } = await write(teamId, (pin) => fn(teamId, patch, pin), {
      title: 'Edit roster',
      message: 'Enter the PIN to modify the roster.',
    });
    state.value = { team: state.value.team, members, meta };
  } catch (e) {
    error.value = e.message;
  }
}

function addMember() {
  const name = newName.value.trim();
  if (!name) return;
  act((tid, _p, pin) => api.addMember(tid, name, pin));
  newName.value = '';
}

function toggleAbsent(m) {
  act((tid, p, pin) => api.updateMember(tid, p.id, { absent: !p.absent }, pin), m);
}

function removeMember(m) {
  if (confirm(`Remove ${m.name} from the team?`)) {
    act((tid, p, pin) => api.deleteMember(tid, p.id, pin), m);
  }
}

onMounted(load);

const columns = [
  { title: 'Name', key: 'name' },
  { title: 'Weight', key: 'weight', render: (row) => row.weight.toFixed(1) },
  {
    title: 'Chance',
    key: 'probability',
    render: (row) => `${(row.probability * 100).toFixed(1)}%`,
  },
  {
    title: 'Status',
    key: 'absent',
    render: (row) =>
      row.absent
        ? h(NTag, { type: 'error', size: 'small', round: true, bordered: false }, { default: () => 'absent' })
        : h('span', { class: 'muted' }, 'active'),
  },
  {
    title: '',
    key: 'actions',
    width: 210,
    render: (row) =>
      h(NSpace, { justify: 'end', wrapItem: false }, {
        default: () => [
          h(
            NButton,
            { size: 'small', quaternary: true, onClick: () => toggleAbsent(row) },
            { default: () => (row.absent ? 'Mark present' : 'Mark absent') }
          ),
          h(
            NButton,
            { size: 'small', quaternary: true, type: 'error', onClick: () => removeMember(row) },
            { default: () => '✕' }
          ),
        ],
      }),
  },
];
</script>

<template>
  <div>
    <h2>Roster</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="empty">Loading…</div>

    <n-space v-else-if="state" vertical size="large" style="width: 100%">
      <n-card>
        <n-space style="margin-bottom: 16px">
          <n-input
            v-model:value="newName"
            placeholder="Add a teammate"
            style="min-width: 200px"
            @keyup.enter="addMember"
          />
          <n-button type="primary" @click="addMember">Add</n-button>
        </n-space>

        <n-data-table
          v-if="state.members.length"
          :columns="columns"
          :data="state.members"
          :row-key="(row) => row.id"
          :bordered="false"
          :single-line="false"
        />
        <div v-else class="empty">No members yet.</div>
      </n-card>

      <n-card>
        <h3>Current odds</h3>
        <n-space v-if="state.members.length" vertical size="large">
          <div v-for="m in state.members" :key="m.id" class="odds-row">
            <div class="odds-head">
              <span class="odds-name" :style="m.absent ? { opacity: 0.5 } : {}">{{ m.name }}</span>
              <n-tag v-if="m.absent" type="error" size="small" round :bordered="false">absent</n-tag>
              <span class="odds-pct">{{ (m.probability * 100).toFixed(1) }}%</span>
            </div>
            <n-progress
              type="line"
              :percentage="m.probability * 100"
              :show-indicator="false"
              :height="8"
              :border-radius="999"
              :color="m.absent ? palette.muted : undefined"
            />
          </div>
        </n-space>
        <div v-else class="empty">No members yet.</div>
        <p v-if="state.meta" class="muted" style="font-size: 12px; margin-bottom: 0; margin-top: 16px">
          g = gain_mult × base / roster = {{ state.meta.g.toFixed(3) }} · floor = {{ state.meta.floor }} ·
          roster {{ state.meta.roster_count }} · active {{ state.meta.active_count }}
        </p>
      </n-card>
    </n-space>
  </div>
</template>

<style scoped>
.odds-row {
  width: 100%;
}
.odds-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 14px;
}
.odds-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.odds-pct {
  margin-left: auto;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
</style>
