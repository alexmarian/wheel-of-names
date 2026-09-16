<script setup>
import { onMounted, reactive, ref } from 'vue';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true },
});
const emit = defineEmits(['finished']);

const progress = reactive(props.entries.map(() => 0));
const done = ref(false);
const trackEl = ref(null);
// Per-horse gallop timing offset/speed so the bob cycles aren't in lockstep —
// a pack of horses bouncing in perfect unison reads as robotic, not alive.
const gallopDelay = props.entries.map(() => (Math.random() * 0.32).toFixed(2));
const gallopDur = props.entries.map(() => (0.26 + Math.random() * 0.14).toFixed(2));

// A few pacing shapes so the pack doesn't run the same race every time: a
// steady sprint, an early-burst-then-coast, a slow-starter that closes fast,
// and a stumble (brief mid-race pause) that recovers. All resolve to 1 at
// p=1 so every horse still lands exactly on its lane's finish mark.
const PACE_PROFILES = ['steady', 'burst', 'closer', 'stumble'];
function easeOut(p) {
  return 1 - Math.pow(1 - p, 2);
}
function applyPace(name, p) {
  switch (name) {
    case 'burst': // fast out of the gate, coasts in
      return 1 - Math.pow(1 - p, 3.2);
    case 'closer': // slow start, sprints at the end
      return Math.pow(p, 2.4);
    case 'stumble': // brief stutter around the midpoint, then catches up
      if (p < 0.45) return easeOut(p / 0.45) * 0.5;
      if (p < 0.58) return 0.5;
      return 0.5 + easeOut((p - 0.58) / 0.42) * 0.5;
    case 'steady':
    default:
      return easeOut(p);
  }
}

onMounted(() => {
  const winnerIdx = props.entries.findIndex((e) => e.id === props.winnerId);
  const winnerDur = 3200 * (0.85 + Math.random() * 0.3);
  const dur = props.entries.map((_, i) => (i === winnerIdx ? winnerDur : 4200 + Math.random() * 2500));
  const pace = props.entries.map(() => PACE_PROFILES[Math.floor(Math.random() * PACE_PROFILES.length)]);
  const t0 = performance.now();
  let raf;
  const tick = (now) => {
    const el = now - t0;
    const finishAt = dur[winnerIdx] + 500;
    props.entries.forEach((_, i) => {
      const p = Math.min(1, el / dur[i]);
      progress[i] = applyPace(pace[i], p) * 100;
    });
    done.value = el >= finishAt;
    if (done.value) emit('finished');
    else raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
});
</script>

<template>
  <div class="racetrack" ref="trackEl">
    <div class="finish"></div>
    <div v-for="(e, i) in entries" :key="e.id" class="lane" :class="{ win: e.isWinner && done }">
      <span class="lane-name" :style="{ color: labels[i].color }">{{ e.name }}</span>
      <div class="rail">
        <span v-if="!done" class="dust d1" :style="{ left: progress[i] + '%' }"></span>
        <span v-if="!done" class="dust d2" :style="{ left: progress[i] + '%' }"></span>
        <span
          class="runner"
          :class="{ galloping: !done, win: e.isWinner && done }"
          :style="{
            left: progress[i] + '%',
            backgroundColor: labels[i].color,
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
  position: relative;
  width: 100%;
  padding: 10px 8px 18px;
}
.finish {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 4px;
  width: 6px;
  background: repeating-linear-gradient(45deg, #fff, #fff 6px, #111 6px, #111 12px);
  border-radius: 3px;
}
.lane {
  display: grid;
  grid-template-columns: 130px 1fr;
  align-items: center;
  gap: 12px;
  height: 76px;
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
  height: 48px;
  border-bottom: 3px dashed #333b5c;
}
.runner {
  position: absolute;
  top: 0;
  width: 72px;
  height: 45px;
  /* Sprite art faces left; the race runs left-to-right, so flip it. */
  transform: translateY(-4px) scaleX(-1);
  transition: none;
  /* The sprite art is a solid black silhouette, so it's used as a mask
     over a per-lane background-color instead of drawn directly — that's
     what lets each horse be tinted to match its lane. Sheet is 12
     gallop-cycle frames side by side; scaling it to 1200% of the element
     width makes each frame exactly one element-width wide, so stepping
     the mask position by that amount flips frames. */
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
  /* steps(12) with the sheet already at frame 1 gives 12 evenly-spaced
     positions ending back at frame 1, i.e. a seamless looping cycle. */
  animation-name: gallop-frames, gallop-bob;
  animation-timing-function: steps(12), ease-in-out;
  animation-iteration-count: infinite;
}
.runner.win {
  /* Freeze on a fully-extended stride frame for the trophy pose. */
  -webkit-mask-position: -288px 0;
  mask-position: -288px 0;
  animation: trophy-bounce 0.6s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes gallop-frames {
  from {
    -webkit-mask-position-x: 0;
    mask-position-x: 0;
  }
  to {
    -webkit-mask-position-x: -864px;
    mask-position-x: -864px;
  }
}
/* Subtle bob layered on top of the frame stepping so the gait still reads
   as alive rather than a horse sliding along a flat line. */
@keyframes gallop-bob {
  0%,
  100% {
    transform: translateY(-4px) scaleX(-1);
  }
  50% {
    transform: translateY(-9px) scaleX(-1);
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
  transform: translateX(-100%);
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
    transform: translateY(-4px) scaleX(-1) scale(1);
  }
  40% {
    transform: translateY(-22px) scaleX(-1) scale(1.3);
  }
  100% {
    transform: translateY(-4px) scaleX(-1) scale(1);
  }
}
</style>
