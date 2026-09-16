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
  <div class="sky">
    <span class="cloud c1">☁️</span>
    <span class="cloud c2">☁️</span>
    <span class="cloud c3">☁️</span>
    <div class="lane" v-for="(e, i) in entries" :key="e.id">
      <span
        class="balloon"
        :class="{ drifting: !done, win: e.isWinner && done }"
        :style="{ bottom: progress[i] + '%' }"
        >🎈</span
      >
      <span class="lane-name" :class="{ win: e.isWinner && done }" :style="{ color: labels[i].color }">{{
        e.name
      }}</span>
    </div>
    <div class="sun">☀️</div>
  </div>
</template>

<style scoped>
.sky {
  position: relative;
  display: flex;
  justify-content: space-around;
  gap: 8px;
  height: 560px;
  padding: 32px 10px;
  background: radial-gradient(120% 100% at 50% 0%, #1e3a5f 0%, #0e2038 70%);
  border-radius: 14px;
  border: 1px solid #2a4a6b;
  overflow: hidden;
}
.sun {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 44px;
  opacity: 0.75;
}
.cloud {
  position: absolute;
  font-size: 34px;
  opacity: 0.35;
  filter: grayscale(0.2);
}
.c1 {
  top: 30%;
  left: 8%;
}
.c2 {
  top: 55%;
  right: 10%;
}
.c3 {
  top: 75%;
  left: 40%;
}
.lane {
  position: relative;
  width: 16%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.balloon {
  position: absolute;
  font-size: 50px;
  z-index: 2;
}
.balloon.drifting {
  animation: drift 1.6s ease-in-out infinite;
}
.balloon.win {
  animation: trophy-bounce 0.6s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes drift {
  0%,
  100% {
    transform: translateX(-4px) rotate(-3deg);
  }
  50% {
    transform: translateX(4px) rotate(3deg);
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
