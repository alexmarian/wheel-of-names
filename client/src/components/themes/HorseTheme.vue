<script setup>
import { useRace, HORSE_PACES } from '../../composables/useRace.js';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true },
  // 'silhouette': black sprite used as a mask and filled with the lane colour.
  // 'colour': painted horse + rider sprite, shown as drawn.
  variant: { type: String, default: 'silhouette' },
});
const emit = defineEmits(['finished']);

const { progress, done } = useRace(props.entries, props.winnerId, emit, {
  paces: HORSE_PACES,
  winnerDuration: 3200,
  otherDuration: [4200, 6700],
});

// Per-horse gallop timing offset/speed so the bob cycles aren't in lockstep.
const gallopDelay = props.entries.map(() => (Math.random() * 0.32).toFixed(2));
const gallopDur = props.entries.map(() => (0.26 + Math.random() * 0.14).toFixed(2));

// progress is the nose position along the rail, so the sprite is pulled back
// by its own width as it advances and stops flush with the finish line.
const runnerLeft = (p) => `calc(${p}% - ${p / 100} * var(--runner-w))`;

// The silhouette is filled with the lane colour; the painted sprite is left
// as drawn and the name label alone carries the lane colour.
const runnerStyle = (i) => (props.variant === 'colour' ? {} : { backgroundColor: props.labels[i].color });
</script>

<template>
  <div class="racetrack" :class="`variant-${variant}`">
    <div class="finish"></div>
    <div v-for="(e, i) in entries" :key="e.id" class="lane" :class="{ win: e.isWinner && done }">
      <span class="lane-name" :style="{ color: labels[i].color }">{{ e.name }}</span>
      <div class="rail">
        <template v-if="!done">
          <span class="dust d1" :style="{ left: runnerLeft(progress[i]) }"></span>
          <span class="dust d2" :style="{ left: runnerLeft(progress[i]) }"></span>
        </template>
        <span
          class="runner"
          :class="{ galloping: !done, win: e.isWinner && done }"
          :style="{
            left: runnerLeft(progress[i]),
            ...runnerStyle(i),
            animationDelay: !done ? gallopDelay[i] + 's' : undefined,
            animationDuration: !done ? gallopDur[i] + 's' : undefined,
          }"
        ></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.racetrack {
  isolation: isolate;
  --runner-w: 72px;
  --runner-h: 45px;
  --flip: -1; /* silhouette art faces left; the race runs left-to-right */
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  padding: 10px 12px 18px;
}
.finish {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 12px;
  width: 6px;
  background: repeating-linear-gradient(45deg, #fff, #fff 6px, #111 6px, #111 12px);
  border-radius: 3px;
}
.lane {
  display: grid;
  grid-template-columns: clamp(72px, 16%, 130px) 1fr;
  align-items: center;
  gap: 12px;
  flex: 1 1 0;
  min-height: 60px;
  max-height: 96px;
  border-radius: 8px;
  transition: background 0.3s ease;
}
.lane.win {
  background: color-mix(in srgb, var(--ok, #4ade80) 14%, transparent);
}
.lane-name {
  font-size: 17px;
  font-weight: 700;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lane.win .lane-name {
  color: var(--ok, #4ade80) !important;
}
.rail {
  position: relative;
  height: calc(var(--runner-h) + 3px);
  border-bottom: 3px dashed #333b5c;
}
.runner {
  position: absolute;
  top: 0;
  width: var(--runner-w);
  height: var(--runner-h);
  transform: translateY(-4px) scaleX(var(--flip));
  /* The sprite art is a solid silhouette, so it's used as a mask over a
     per-lane background-color to tint each horse. Sheet is 12 gallop frames
     side by side; at 1200% width each frame is exactly one runner width, so
     stepping the mask position by that amount flips frames. */
  -webkit-mask-image: url('../../assets/horse/gallop-sprite.png');
  mask-image: url('../../assets/horse/gallop-sprite.png');
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 1200% 100%;
  mask-size: 1200% 100%;
  -webkit-mask-position: 0 0;
  mask-position: 0 0;
}
.runner.galloping {
  animation-name: gallop-frames, gallop-bob;
  animation-timing-function: steps(12), ease-in-out;
  animation-iteration-count: infinite;
}
.runner.win {
  /* Freeze on a fully-extended stride frame for the trophy pose. */
  -webkit-mask-position: calc(var(--runner-w) * -4) 0;
  mask-position: calc(var(--runner-w) * -4) 0;
  animation: trophy-bounce 0.6s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes gallop-frames {
  from {
    -webkit-mask-position-x: 0;
    mask-position-x: 0;
  }
  to {
    -webkit-mask-position-x: calc(var(--runner-w) * -12);
    mask-position-x: calc(var(--runner-w) * -12);
  }
}
@keyframes gallop-bob {
  0%,
  100% {
    transform: translateY(-4px) scaleX(var(--flip));
  }
  50% {
    transform: translateY(-9px) scaleX(var(--flip));
  }
}
.dust {
  position: absolute;
  bottom: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8a94ad;
  opacity: 0;
  animation: dust-puff 0.5s ease-out infinite;
  pointer-events: none;
}
.dust.d2 {
  animation-delay: 0.22s;
}
@keyframes dust-puff {
  0% {
    opacity: 0.5;
    transform: translate(-90%, 0) scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(-170%, 6px) scale(1.1);
  }
}
@keyframes trophy-bounce {
  0% {
    transform: translateY(-4px) scaleX(var(--flip)) scale(1);
  }
  40% {
    transform: translateY(-22px) scaleX(var(--flip)) scale(1.3);
  }
  100% {
    transform: translateY(-4px) scaleX(var(--flip)) scale(1);
  }
}

/* ── colour variant: painted sprite instead of a tinted mask ─────────────── */
.variant-colour {
  --runner-w: 96px;
  --runner-h: 84px;
  --flip: 1; /* painted art already faces right */
}
.variant-colour .lane {
  min-height: 92px;
  max-height: 124px;
}
.variant-colour .runner {
  -webkit-mask-image: none;
  mask-image: none;
  background-image: url('../../assets/derby/gallop-sprite.png');
  background-repeat: no-repeat;
  background-size: 1100% 100%; /* 11 frames */
  background-position: 0 0;
}
.variant-colour .runner.galloping {
  animation-name: gallop-frames-bg, gallop-bob;
  animation-timing-function: steps(11), ease-in-out;
}
.variant-colour .runner.win {
  background-position: calc(var(--runner-w) * -2) 0;
}
@keyframes gallop-frames-bg {
  from {
    background-position-x: 0;
  }
  to {
    background-position-x: calc(var(--runner-w) * -11);
  }
}
</style>
