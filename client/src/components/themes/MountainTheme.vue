<script setup>
import { useRace, CLIMB_PACES } from '../../composables/useRace.js';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true },
});
const emit = defineEmits(['finished']);

const { progress, done } = useRace(props.entries, props.winnerId, emit, { paces: CLIMB_PACES });

// 0% rests just above the name label, 100% puts the sprite's top at the lane top.
const lift = (p) => `calc(var(--lane-pad) + (100% - var(--lane-pad) - var(--sprite-h)) * ${p / 100})`;
</script>

<template>
  <div class="slope">
    <div class="peak">🏔️</div>
    <div class="lane" v-for="(e, i) in entries" :key="e.id">
      <span class="climber" :class="{ climbing: !done, win: e.isWinner && done }" :style="{ bottom: lift(progress[i]) }"></span>
      <span class="lane-name" :class="{ win: e.isWinner && done }" :style="{ color: labels[i].color }">
        {{ e.name }}
      </span>
    </div>
    <div class="flag">🚩</div>
  </div>
</template>

<style scoped>
.slope {
  isolation: isolate;
  --lane-pad: 30px;
  --sprite-w: 55px;
  --sprite-h: 88px;
  position: relative;
  display: flex;
  justify-content: space-around;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 48px 10px 16px;
  background: linear-gradient(180deg, #2b3548 0%, #10151f 75%);
  border-radius: 14px;
  border: 1px solid #3a4358;
  overflow: hidden;
}
.peak {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 52px;
  opacity: 0.55;
}
.flag {
  position: absolute;
  top: 34px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 30px;
  opacity: 0.85;
}
.lane {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.lane::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: var(--lane-pad);
  width: 4px;
  background: repeating-linear-gradient(#5a6784, #5a6784 5px, transparent 5px, transparent 9px);
  border-radius: 2px;
}
.climber {
  position: absolute;
  width: var(--sprite-w);
  height: var(--sprite-h);
  z-index: 2;
  background-image: url('../../assets/mountain/climb-sprite.png');
  background-repeat: no-repeat;
  /* Sheet is 12 climb frames side by side; at 1200% width each frame is
     exactly one sprite width, so stepping background-position-x by that
     amount flips frames. */
  background-size: 1200% 100%;
  background-position: 0 0;
}
.climber.climbing {
  animation: climb-frames 1s steps(12) infinite;
}
.climber.win {
  background-position: calc(var(--sprite-w) * -4) 0;
  animation: trophy-bounce 0.6s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes climb-frames {
  from {
    background-position-x: 0;
  }
  to {
    background-position-x: calc(var(--sprite-w) * -12);
  }
}
@keyframes trophy-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}
.lane-name {
  position: relative;
  font-size: 15px;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lane-name.win {
  color: var(--ok, #4ade80) !important;
}
</style>
