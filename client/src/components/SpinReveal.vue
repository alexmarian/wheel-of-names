<script setup>
import { computed, defineComponent } from 'vue';
import WheelTheme from './themes/WheelTheme.vue';
import HorseTheme from './themes/HorseTheme.vue';
import BalloonTheme from './themes/BalloonTheme.vue';
import MountainTheme from './themes/MountainTheme.vue';
import AlienTheme from './themes/AlienTheme.vue';

const props = defineProps({
  entries: { type: Array, required: true }, // {id,name,weight,probability}
  winnerId: { type: String, required: true },
  theme: { type: String, default: 'wheel' },
});
const emit = defineEmits(['finished']);

// Absent members can never be picked (server excludes them from the draw),
// so they shouldn't appear in the wheel/race/climb at all — showing them
// there makes it look like they're still in the running.
const inPlay = computed(() => props.entries.filter((e) => !e.absent));

const labels = computed(() =>
  inPlay.value.map((e, i) => ({
    id: e.id,
    name: e.name,
    color: `hsl(${(i * 360) / Math.max(inPlay.value.length, 1)}, 70%, 62%)`,
  }))
);

// Teams that still have the old 'monkey' theme stored fall through to the
// default (Wheel) below rather than needing a DB migration.
const themes = {
  wheel: { is: WheelTheme },
  horse: { is: HorseTheme },
  derby: { is: HorseTheme, props: { variant: 'colour' } },
  balloon: { is: BalloonTheme },
  mountain: { is: MountainTheme },
  alien: { is: AlienTheme },
};
const active = computed(() => themes[props.theme] || themes.wheel);
const resolved = computed(() =>
  inPlay.value.map((e, i) => ({
    ...e,
    color: labels.value[i].color,
    isWinner: e.id === props.winnerId,
  }))
);
</script>

<template>
  <component
    :is="active.is"
    v-bind="active.props"
    :labels="labels"
    :entries="resolved"
    :winner-id="winnerId"
    @finished="emit('finished')"
  />
</template>
