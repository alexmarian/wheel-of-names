<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true }, // {id, name, color}
});
const emit = defineEmits(['finished']);

const R_OUTER = 195;
const R_INNER = 74;
const R_LABEL = (R_INNER + R_OUTER) / 2;
const LABEL_ROOM = R_OUTER - R_INNER - 14; // radial length a name may occupy
const MAX_FONT = 15;
const MIN_FONT = 9;
const cx = 200;
const cy = 200;

const slices = ref([]);
const rotation = ref(0);
const settled = ref(false);
const transition = ref({ duration: 0, timing: 'linear' });

// Clean decelerations that differ in turns and length. The physical settle
// (a small overshoot and return) is a separate short phase after landing, so
// its size never depends on how many turns were taken.
const SPIN_PROFILES = [
  { timing: 'cubic-bezier(0.12, 0.73, 0.28, 1)', turns: [4, 5], duration: [4.2, 4.8] },
  { timing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', turns: [5, 6], duration: [5, 5.9] },
  { timing: 'cubic-bezier(0.3, 0.62, 0.16, 1)', turns: [7, 9], duration: [7, 8.4] },
];
const SETTLE = { duration: 0.55, timing: 'cubic-bezier(0.25, 0.9, 0.35, 1)', maxDeg: 8 };

const randIn = ([min, max]) => min + Math.random() * (max - min);

// deg is clockwise from 12 o'clock everywhere in this component.
function polar(deg, r) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function wedgePath(startDeg, endDeg) {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const [ox1, oy1] = polar(startDeg, R_OUTER);
  const [ox2, oy2] = polar(endDeg, R_OUTER);
  const [ix1, iy1] = polar(startDeg, R_INNER);
  const [ix2, iy2] = polar(endDeg, R_INNER);
  return [
    `M ${ix1} ${iy1}`,
    `L ${ox1} ${oy1}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

// Measures text in the same font the SVG labels inherit, so fitting is exact
// rather than a per-character guess (bold glyphs are much wider than average).
let ctx = null;
function textWidth(text, fontSize) {
  ctx ||= document.createElement('canvas').getContext('2d');
  ctx.font = `700 ${fontSize}px ${getComputedStyle(document.body).fontFamily}`;
  return ctx.measureText(text).width;
}

// Names run radially from hub to rim. Font shrinks for thin wedges (so text
// stays inside its own wedge) and for long names (so they fit the radius);
// only when it would drop below MIN_FONT is the name truncated instead.
function fitLabel(name, wedgeDeg) {
  const wedgeWidth = (R_LABEL * wedgeDeg * Math.PI) / 180;
  const byWedge = Math.max(MIN_FONT, Math.min(MAX_FONT, wedgeWidth * 0.75));
  const byLength = (MAX_FONT * LABEL_ROOM) / textWidth(name, MAX_FONT);
  let fontSize = Math.min(byWedge, byLength);
  let text = name;
  if (fontSize < MIN_FONT) {
    fontSize = MIN_FONT;
    while (text.length > 1 && textWidth(text + '…', fontSize) > LABEL_ROOM) text = text.slice(0, -1);
    text += '…';
  }
  return { text, fontSize: Math.round(fontSize * 10) / 10 };
}

let phase = 'spin';
let restAngle = 0;

onMounted(() => {
  const total = props.entries.reduce((s, e) => s + (e.weight || 1), 0) || 1;
  let cum = 0;
  const built = props.entries.map((e, i) => {
    const start = cum;
    const end = cum + ((e.weight || 1) / total) * 360;
    cum = end;
    const mid = (start + end) / 2;
    const [lx, ly] = polar(mid, R_LABEL);
    return { i, start, end, mid, lx, ly, path: wedgePath(start, end), label: fitLabel(e.name, end - start) };
  });
  slices.value = built;

  const winner = built.find((s) => props.entries[s.i].id === props.winnerId);
  const half = (winner.end - winner.start) / 2;
  // Land somewhere inside the winner's wedge (up to ±40% of its width), never
  // on a neighbour.
  const jitter = (Math.random() - 0.5) * half * 1.6;
  const profile = SPIN_PROFILES[Math.floor(Math.random() * SPIN_PROFILES.length)];
  const turns = Math.floor(randIn([profile.turns[0], profile.turns[1] + 1]));
  // A wedge at content angle θ sits under the top pointer once the wheel has
  // rotated by -θ. Positive rotation is clockwise.
  restAngle = 360 * turns - (winner.mid + jitter);
  // Overshooting clockwise drags the pointer toward the wedge's start edge, so
  // the settle is capped by the room left on that side.
  const settleDeg = Math.min(SETTLE.maxDeg, (half + jitter) * 0.9);

  transition.value = { duration: randIn(profile.duration), timing: profile.timing };
  // Two rAFs guarantee a committed frame at 0deg before the jump to target,
  // or the browser has nothing to transition from and just snaps.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rotation.value = restAngle + settleDeg;
    });
  });
});

function onTransitionEnd(e) {
  if (e.propertyName !== 'transform') return;
  if (phase === 'spin') {
    phase = 'settle';
    transition.value = { duration: SETTLE.duration, timing: SETTLE.timing };
    rotation.value = restAngle;
    return;
  }
  settled.value = true;
  emit('finished');
}
</script>

<template>
  <div class="stage">
    <div
      class="wheel"
      :class="{ settled }"
      :style="{
        transform: `rotate(${rotation}deg)`,
        transitionDuration: transition.duration + 's',
        transitionTimingFunction: transition.timing,
      }"
      @transitionend="onTransitionEnd"
    >
      <svg viewBox="0 0 400 400" width="100%" height="100%">
        <path
          v-for="(s, i) in slices"
          :key="i"
          :d="s.path"
          :fill="labels[i].color"
          stroke="var(--bg, #0e1116)"
          stroke-width="2"
          stroke-linejoin="round"
          :class="{ 'slice-winner': settled && entries[i]?.isWinner }"
          :style="{ color: labels[i].color }"
        />
        <circle :cx="cx" :cy="cy" r="64" class="hub" stroke-width="2" />
        <text
          v-for="(s, i) in slices"
          :key="'t' + i"
          :x="s.lx"
          :y="s.ly"
          :transform="`rotate(${s.mid - 90} ${s.lx} ${s.ly})`"
          :font-size="s.label.fontSize"
          fill="#fff"
          font-weight="700"
          text-anchor="middle"
          dominant-baseline="middle"
          style="pointer-events: none"
        >
          {{ s.label.text }}
        </text>
      </svg>
    </div>
    <div class="pointer" :class="{ settled }"></div>
  </div>
</template>

<style scoped>
.stage {
  isolation: isolate;
  position: relative;
  container-type: size;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stage > * {
  /* Container-query units (resolved against .stage) make the wheel the largest
     square that fits the box it's given, whatever shape that box is. */
  --size: calc(min(100cqw, 100cqh) - 28px);
}
.wheel {
  width: var(--size);
  height: var(--size);
  filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.45));
  transition-property: transform;
  will-change: transform;
}
.wheel.settled {
  /* A brief glow flash on landing, visible even when the winning wedge is a sliver. */
  animation: wheel-flash 0.7s ease-out;
}
@keyframes wheel-flash {
  0%,
  100% {
    filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.45));
  }
  35% {
    filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 34px var(--accent, #3b82f6));
  }
}
.wheel svg {
  display: block;
}
.hub {
  fill: var(--surface-inset);
  stroke: var(--border);
}
.slice-winner {
  filter: drop-shadow(0 0 10px currentColor);
  animation: winner-pulse 1.1s ease-in-out infinite;
}
@keyframes winner-pulse {
  0%,
  100% {
    stroke-opacity: 1;
  }
  50% {
    stroke-opacity: 0.75;
  }
}
.pointer {
  position: absolute;
  top: calc(50% - var(--size) / 2 - 10px);
  left: 50%;
  width: 0;
  height: 0;
  border-left: 22px solid transparent;
  border-right: 22px solid transparent;
  border-top: 42px solid #fff;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
  transform: translateX(-50%);
  transform-origin: 50% 0%;
}
.pointer.settled {
  animation: pointer-ding 0.5s cubic-bezier(0.3, 1.6, 0.4, 1);
}
@keyframes pointer-ding {
  0% {
    transform: translateX(-50%) rotate(0deg);
  }
  30% {
    transform: translateX(-50%) rotate(-14deg);
  }
  60% {
    transform: translateX(-50%) rotate(8deg);
  }
  100% {
    transform: translateX(-50%) rotate(0deg);
  }
}
</style>
