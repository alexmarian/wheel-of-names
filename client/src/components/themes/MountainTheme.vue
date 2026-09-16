<script setup>
import { useClimb } from '../../composables/useClimb.js';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true },
});
const emit = defineEmits(['finished']);

const { progress, done } = useClimb(props.entries, props.winnerId, emit);
</script>

<template>
  <div class="slope">
    <div class="peak">🏔️</div>
    <div class="lane" v-for="(e, i) in entries" :key="e.id">
      <span
        class="climber"
        :class="{ climbing: !done, win: e.isWinner && done }"
        :style="{ bottom: progress[i] + '%' }"
      ></span>
      <span class="lane-name" :class="{ win: e.isWinner && done }" :style="{ color: labels[i].color }">{{
        e.name
      }}</span>
    </div>
    <div class="flag">🚩</div>
  </div>
</template>

<style scoped>
.slope {
  position: relative;
  display: flex;
  justify-content: space-around;
  gap: 8px;
  height: 560px;
  padding: 32px 10px;
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
  width: 16%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.lane::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 26px;
  width: 4px;
  background: repeating-linear-gradient(#5a6784, #5a6784 5px, transparent 5px, transparent 9px);
  border-radius: 2px;
}
.climber {
  position: absolute;
  width: 55px;
  height: 88px;
  z-index: 2;
  background-image: url('../../assets/mountain/climb-sprite.png');
  background-repeat: no-repeat;
  /* Sprite sheet is 12 climb-cycle frames side by side; scaling it to
     1200% of the element width makes each frame exactly one element-width
     wide, so stepping background-position-x by that amount flips frames. */
  background-size: 1200% 100%;
  background-position: 0 0;
}
.climber.climbing {
  animation: climb-frames 1s steps(12) infinite;
}
.climber.win {
  background-position: -220px 0;
  animation: trophy-bounce 0.6s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes climb-frames {
  from {
    background-position-x: 0;
  }
  to {
    background-position-x: -660px;
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
  margin-top: 10px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lane-name.win {
  color: var(--ok, #4ade80) !important;
}
</style>
