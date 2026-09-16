<script setup>
// Overlays the settled animation once a theme emits 'finished'.
import { computed } from 'vue';
import { NText } from 'naive-ui';

const props = defineProps({
  winner: { type: Object, required: true }, // {id, name}
  mode: { type: String, default: 'real' }, // 'real' | 'preview'
});

const PARTICLES = 26;

const particles = computed(() =>
  Array.from({ length: PARTICLES }, (_, i) => {
    const angle = (i / PARTICLES) * 360 + (Math.random() * 10 - 5);
    const dist = 90 + Math.random() * 90;
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
  <div class="announce" role="status">
    <div class="panel">
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
      <div class="name">{{ winner.name }}</div>
      <n-text depth="3">{{ mode === 'preview' ? 'Preview only, not recorded' : 'is up today' }}</n-text>
    </div>
  </div>
</template>

<style scoped>
.announce {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  backdrop-filter: blur(10px);
  animation: pop 0.45s cubic-bezier(0.22, 1.4, 0.4, 1);
}
.name {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  max-width: 70vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.burst {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
    transform: scale(1.06);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }
  .spark {
    display: none;
  }
}
</style>
