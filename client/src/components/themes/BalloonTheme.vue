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

// The sprite art is blue (hue ~213). Rotate it to each lane's label hue so a
// balloon matches its own name, the same way horses are tinted per lane.
const SPRITE_HUE = 213;
const tint = (color) => {
  const hue = Number(/hsl\((\d+(?:\.\d+)?)/.exec(color)?.[1] ?? SPRITE_HUE);
  return `hue-rotate(${Math.round(hue - SPRITE_HUE)}deg)`;
};
</script>

<template>
  <div class="sky">
    <span class="cloud c1">☁️</span>
    <span class="cloud c2">☁️</span>
    <span class="cloud c3">☁️</span>
    <div class="lane" v-for="(e, i) in entries" :key="e.id">
      <span
        class="balloon"
        :class="{ floating: !done, win: e.isWinner && done }"
        :style="{ bottom: lift(progress[i]), filter: tint(labels[i].color) }"
      ></span>
      <span class="lane-name" :class="{ win: e.isWinner && done }" :style="{ color: labels[i].color }">
        {{ e.name }}
      </span>
    </div>
    <div class="sun">☀️</div>
  </div>
</template>

<style scoped>
.sky {
  isolation: isolate;
  --lane-pad: 40px;
  --sprite-w: 75px;
  --sprite-h: 126px;
  position: relative;
  display: flex;
  justify-content: space-around;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 32px 10px 16px;
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
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.balloon {
  position: absolute;
  width: var(--sprite-w);
  height: var(--sprite-h);
  z-index: 2;
  background-image: url('../../assets/balloon/float-sprite.png');
  background-repeat: no-repeat;
  /* Sheet is 12 sway frames side by side; at 1200% width each frame is
     exactly one sprite width, so stepping background-position-x by that
     amount flips frames. The sway is drawn into the frames themselves. */
  background-size: 1200% 100%;
  background-position: 0 0;
}
.balloon.floating {
  animation: float-frames 1.4s steps(12) infinite;
}
.balloon.win {
  background-position: 0 0;
  animation: trophy-bounce 0.6s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes float-frames {
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
