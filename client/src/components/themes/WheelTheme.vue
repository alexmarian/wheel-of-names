<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
  entries: { type: Array, required: true },
  winnerId: { type: String, required: true },
  labels: { type: Array, required: true }, // {id, name, color}
});
const emit = defineEmits(['finished']);

const R_OUTER = 195;
const R_INNER = 85;
const R_LABEL = 140;
const slices = ref(props.entries.map(() => []));
const rotation = ref(0);
const settled = ref(false);
const spinDuration = ref(5.4);
const spinTiming = ref('cubic-bezier(0.14, 0.85, 0.22, 1.12)');
const cx = 200;
const cy = 200;

// A few distinct "feels" so the spin isn't the same curve every time: one
// overshoots the target and wobbles back (y2 > 1), the others decelerate
// cleanly but differ in how many turns / how long they take.
const SPIN_PROFILES = [
  { timing: 'cubic-bezier(0.14, 0.85, 0.22, 1.12)', turns: [5, 6], duration: [5, 5.9] },
  { timing: 'cubic-bezier(0.12, 0.73, 0.28, 1)', turns: [4, 5], duration: [4.2, 4.8] },
  { timing: 'cubic-bezier(0.3, 0.62, 0.16, 1)', turns: [7, 9], duration: [7, 8.4] },
];
function randIn([min, max]) {
  return min + Math.random() * (max - min);
}

// deg is clockwise from 12 o'clock — the one and only angle convention used
// anywhere in this component (wedges *and* labels), so there's no separate
// "where does the wedge start" formula that can drift out of sync with
// "where does the label go".
function polar(deg, r) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// A filled donut-wedge path between two clockwise-from-top angles, built
// from the exact same polar() the labels use — so a wedge and its label
// can't end up referencing different zero points.
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

onMounted(() => {
  const total = props.entries.reduce((s, e) => s + (e.weight || 1), 0) || 1;
  let cum = 0; // clockwise from top (deg)
  const segs = props.entries.map((e, i) => {
    const frac = (e.weight || 1) / total;
    const start = cum;
    const end = cum + frac * 360;
    cum = end;
    return { i, start, end, frac };
  });

  const winner = segs.find((s) => props.entries[s.i].id === props.winnerId);
  const winnerCenterCw = (winner.start + winner.end) / 2; // degrees clockwise from top

  // Build wedge paths + label positions from the same angles.
  const built = segs.map((s) => {
    const [lx, ly] = polar((s.start + s.end) / 2, R_LABEL);
    return { ...s, lx, ly, path: wedgePath(s.start, s.end) };
  });
  slices.value = built;

  // Rotate so the winner's slice center lands at the top pointer. A wedge
  // sitting at content-angle θ (clockwise-from-top) needs the wheel rotated
  // by -θ to bring it under the pointer (fixed at 0°/top) — e.g. a wedge at
  // 3 o'clock (θ=90) needs a -90° turn to reach 12 o'clock, not +90°.
  const profile = SPIN_PROFILES[Math.floor(Math.random() * SPIN_PROFILES.length)];
  const turnCount = Math.floor(randIn([profile.turns[0], profile.turns[1] + 1]));
  const turn = 360 * turnCount;
  // Centered jitter (±40% of the slice width) so the stop point is always
  // somewhere inside the winner's own wedge, never spilling into a neighbor.
  const jitter = (Math.random() - 0.5) * (winner.end - winner.start) * 0.8;
  const target = turn - (winnerCenterCw + jitter);
  spinTiming.value = profile.timing;
  spinDuration.value = randIn(profile.duration);

  // The wheel must actually paint at rotation=0 before we change it, or the
  // browser has nothing to transition *from* and just snaps to the target.
  // Two rAFs guarantee a committed frame at 0deg before the jump to target.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rotation.value = target;
    });
  });
});

function onSpinEnd(e) {
  if (e.propertyName !== 'transform') return;
  settled.value = true;
  emit('finished');
}
</script>

<template>
  <div
    class="wheel-wrap"
    :class="{ settled }"
    :style="{
      transform: `rotate(${rotation}deg)`,
      transitionDuration: spinDuration + 's',
      transitionTimingFunction: spinTiming,
    }"
    @transitionend="onSpinEnd"
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
      <circle cx="200" cy="200" r="64" class="hub" stroke-width="2" />
      <text
        v-for="(s, i) in slices"
        :key="'t' + i"
        :x="s.lx"
        :y="s.ly"
        fill="#fff"
        font-size="15"
        font-weight="700"
        text-anchor="middle"
        dominant-baseline="middle"
        style="pointer-events: none"
      >
        {{ entries[i].name }}
      </text>
    </svg>
  </div>
  <div class="pointer" :class="{ settled }"></div>
</template>

<style scoped>
.wheel-wrap {
  position: relative;
  width: 620px;
  height: 620px;
  max-width: 100%;
  margin: 10px auto;
  filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.45));
  /* Duration and easing (overshoot-and-settle vs. clean glide) are both
     picked per-spin and applied inline, so the transition-property is all
     that's fixed here. */
  transition-property: transform;
  will-change: transform;
}
.wheel-wrap.settled {
  /* A brief glow flash on landing — visible confirmation even when the
     winning wedge itself is a thin sliver. */
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
.wheel-wrap svg {
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
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 24px solid transparent;
  border-right: 24px solid transparent;
  border-top: 46px solid #fff;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
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
