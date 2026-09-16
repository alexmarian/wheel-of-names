<script setup>
// Elimination reveal: a fleet of invaders, one per member. A cannon picks the
// others off in random order; the last alien standing is the winner.
import { onMounted, onUnmounted, reactive, ref } from 'vue';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true }, // {id, name, color}
});
const emit = defineEmits(['finished']);

// Pixel maps -> SVG paths (one unit per pixel, drawn with crispEdges).
const toPath = (rows) =>
  rows
    .flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
const ALIEN_A = toPath([
  '..X.....X..',
  '...X...X...',
  '..XXXXXXX..',
  '.XX.XXX.XX.',
  'XXXXXXXXXXX',
  'X.XXXXXXX.X',
  'X.X.....X.X',
  '...XX.XX...',
]);
const ALIEN_B = toPath([
  '..X.....X..',
  'X..X...X..X',
  'X.XXXXXXX.X',
  'XXX.XXX.XXX',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..X.....X..',
  '.X.......X.',
]);
const CANNON = toPath([
  '......X......',
  '.....XXX.....',
  '.....XXX.....',
  '.XXXXXXXXXXX.',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
]);

const stage = ref(null);
const alienEls = [];
const alive = reactive(props.entries.map(() => true));
const bursting = reactive(props.entries.map(() => false));
const cannonX = ref(null); // px from the stage's left edge; null = centred
const beam = ref(null); // { x, top, height }
const done = ref(false);

const SPARKS = 14;
const sparks = Array.from({ length: SPARKS }, (_, i) => {
  const a = (i / SPARKS) * Math.PI * 2;
  const d = 26 + Math.random() * 30;
  return { id: i, dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d), delay: (Math.random() * 0.1).toFixed(2) };
});

// Cancellable sleep so an unmounted reveal stops mid-sequence.
let cancelled = false;
const timers = new Set();
const wait = (ms) =>
  new Promise((resolve) => {
    const t = setTimeout(() => {
      timers.delete(t);
      resolve();
    }, ms);
    timers.add(t);
  });
onUnmounted(() => {
  cancelled = true;
  timers.forEach(clearTimeout);
});

function alienRect(i) {
  const s = stage.value.getBoundingClientRect();
  const a = alienEls[i].getBoundingClientRect();
  return { x: a.left + a.width / 2 - s.left, bottom: a.bottom - s.top, stageH: s.height };
}

function aim(i) {
  cannonX.value = alienRect(i).x;
}

async function fire(i) {
  const r = alienRect(i);
  const cannonTop = r.stageH - CANNON_BOTTOM - CANNON_H;
  beam.value = { x: r.x, top: r.bottom, height: Math.max(0, cannonTop - r.bottom) };
  await wait(130);
  beam.value = null;
  alive[i] = false;
  bursting[i] = true;
  wait(650).then(() => (bursting[i] = false));
}

const CANNON_BOTTOM = 18;
const CANNON_H = 32;

onMounted(async () => {
  const winnerIdx = props.entries.findIndex((e) => e.id === props.winnerId);
  const order = props.entries.map((_, i) => i).filter((i) => i !== winnerIdx);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Whole sequence lands around four to five seconds regardless of roster size.
  const step = Math.min(1300, Math.max(420, 4200 / Math.max(order.length, 1)));

  await wait(600);
  for (const i of order) {
    if (cancelled) return;
    aim(i);
    await wait(step * 0.45);
    await fire(i);
    await wait(step * 0.4);
  }
  if (cancelled) return;
  // The cannon turns on the survivor, hesitates... and stands down.
  aim(winnerIdx);
  await wait(900);
  done.value = true;
  emit('finished');
});
</script>

<template>
  <div ref="stage" class="space" :class="{ done }">
    <div class="fleet" :class="{ marching: !done }">
      <div
        v-for="(e, i) in entries"
        :key="e.id"
        class="slot"
        :class="{ dead: !alive[i], win: e.isWinner && done }"
      >
        <div class="alien-box">
          <svg
            v-show="alive[i]"
            :ref="(el) => (alienEls[i] = el)"
            class="alien"
            :class="{ alive: alive[i] && !done }"
            :style="{ color: labels[i].color }"
            viewBox="0 0 11 8"
            shape-rendering="crispEdges"
            aria-hidden="true"
          >
            <path class="f1" :d="ALIEN_A" :fill="labels[i].color" />
            <path class="f2" :d="ALIEN_B" :fill="labels[i].color" />
          </svg>
          <div v-if="bursting[i]" class="burst" aria-hidden="true">
            <span
              v-for="p in sparks"
              :key="p.id"
              class="spark"
              :style="{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', animationDelay: p.delay + 's', background: labels[i].color }"
            />
          </div>
        </div>
        <span class="name" :style="{ color: labels[i].color }">{{ e.name }}</span>
      </div>
    </div>

    <div v-if="beam" class="beam" :style="{ left: beam.x + 'px', top: beam.top + 'px', height: beam.height + 'px' }"></div>

    <svg
      class="cannon"
      :class="{ centred: cannonX === null }"
      :style="cannonX !== null ? { left: cannonX + 'px' } : undefined"
      viewBox="0 0 13 8"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <path :d="CANNON" fill="var(--ok, #4ade80)" />
    </svg>
    <div class="ground"></div>
  </div>
</template>

<style scoped>
.space {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #262c3a;
  background-color: #070a12;
  background-image:
    radial-gradient(1px 1px at 20px 30px, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 90px 120px, #cbd5e1 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 160px 60px, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 210px 170px, #94a3b8 50%, transparent 51%),
    radial-gradient(1px 1px at 60px 190px, #fff 50%, transparent 51%);
  background-size: 240px 220px;
}
.fleet {
  position: absolute;
  top: 12%;
  left: 8%;
  right: 8%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 28px 18px;
}
.fleet.marching {
  animation: march 2.4s steps(4) infinite alternate;
}
@keyframes march {
  from {
    transform: translateX(-14px);
  }
  to {
    transform: translateX(14px);
  }
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 96px;
}
.alien-box {
  position: relative;
  width: 44px;
  height: 32px;
}
.alien {
  display: block;
  width: 44px;
  height: 32px;
  filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 40%, transparent));
}
.alien .f2 {
  opacity: 0;
}
.alien.alive .f1 {
  animation: blink 0.7s linear infinite;
}
.alien.alive .f2 {
  animation: blink 0.7s linear infinite;
  animation-delay: -0.35s;
}
@keyframes blink {
  0%,
  49.99% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}
.slot.win .alien {
  animation: victory 0.8s cubic-bezier(0.3, 1.6, 0.4, 1) infinite alternate;
  filter: drop-shadow(0 0 12px currentColor);
}
@keyframes victory {
  from {
    transform: translateY(0) scale(1.15);
  }
  to {
    transform: translateY(-8px) scale(1.25);
  }
}
.name {
  font-size: 14px;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}
.slot.dead .name {
  opacity: 0.3;
  text-decoration: line-through;
}
.slot.win .name {
  color: var(--ok, #4ade80) !important;
}
.burst {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.spark {
  position: absolute;
  width: 5px;
  height: 5px;
  animation: spark 0.6s ease-out forwards;
}
@keyframes spark {
  0% {
    transform: translate(0, 0);
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy));
    opacity: 0;
  }
}
.beam {
  position: absolute;
  width: 4px;
  transform: translateX(-50%);
  background: #fff;
  box-shadow: 0 0 10px 2px var(--ok, #4ade80);
  border-radius: 2px;
}
.cannon {
  position: absolute;
  bottom: 18px;
  left: 50%;
  width: 52px;
  height: 32px;
  transform: translateX(-50%);
  transition: left 0.35s cubic-bezier(0.2, 0.7, 0.3, 1);
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ok, #4ade80) 50%, transparent));
}
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  height: 2px;
  background: var(--ok, #4ade80);
  opacity: 0.6;
}
@media (prefers-reduced-motion: reduce) {
  .fleet.marching,
  .alien.alive .f1,
  .alien.alive .f2 {
    animation: none;
  }
}
</style>
