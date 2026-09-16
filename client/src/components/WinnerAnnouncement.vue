<script setup>
// Sits between the reveal animation and the action buttons. Any theme that
// emits 'finished' ends up here via WheelView.
import { computed } from 'vue';

const props = defineProps({
  winner: { type: Object, required: true }, // {id, name}
  mode: { type: String, default: 'real' }, // 'real' | 'preview'
});

const PARTICLES = 26;

const particles = computed(() =>
  Array.from({ length: PARTICLES }, (_, i) => {
    const angle = (i / PARTICLES) * 360 + (Math.random() * 10 - 5);
    const dist = 60 + Math.random() * 70;
    const rad = (angle * Math.PI) / 180;
    return {
      id: i,
      dx: Math.round(Math.cos(rad) * dist),
      dy: Math.round(Math.sin(rad) * dist * 0.85 - 20), // bias upward, fireworks-style
      delay: (Math.random() * 0.18).toFixed(2),
      hue: Math.floor(Math.random() * 360),
      size: 4 + Math.round(Math.random() * 4),
    };
  })
);
</script>

<template>
  <div class="announce">
    <div class="burst" aria-hidden="true">
      <span
        v-for="p in particles"
        :key="p.id"
        class="spark"
        :style="{
          '--dx': p.dx + 'px',
          '--dy': p.dy + 'px',
          'animation-delay': p.delay + 's',
          background: `hsl(${p.hue} 85% 65%)`,
          width: p.size + 'px',
          height: p.size + 'px',
        }"
      />
    </div>
    <p class="winner-line">
      🎉 <b>{{ winner.name }}</b> is up today
    </p>
    <p v-if="mode === 'preview'" class="muted preview-tag">(preview — not recorded)</p>
  </div>
</template>

<style scoped>
.announce {
  position: relative;
  text-align: center;
  padding: 6px 0 2px;
}
.winner-line {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 19px;
  animation: pop 0.45s cubic-bezier(0.22, 1.4, 0.4, 1);
}
.preview-tag {
  margin: 2px 0 0;
  font-size: 13px;
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
  border-radius: 50%;
  opacity: 0;
  animation: spark 0.9s ease-out forwards;
}
@keyframes spark {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 1;
  }
  65% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) scale(0.15);
    opacity: 0;
  }
}
@keyframes pop {
  0% {
    transform: scale(0.7);
    opacity: 0;
  }
  60% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
</style>
