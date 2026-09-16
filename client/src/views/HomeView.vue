<script setup>
import { NButton } from 'naive-ui';
</script>

<template>
  <div class="landing">
    <div class="sprite" aria-hidden="true">
      <div class="wheel-spin"></div>
      <div class="wheel-hub"></div>
      <div class="wheel-pointer"></div>
    </div>
    <h1>Wheel of Names</h1>
    <p class="muted">
      A weighted, self-hosted name picker — pick to choose who's up today. People who haven't
      been picked in a while get a better chance; the last pick won't come up twice in a row.
    </p>
    <router-link to="/register">
      <n-button type="primary" size="large">Create a new team</n-button>
    </router-link>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 60px 16px;
}
/* A plain radially-symmetric wheel (unlike the 🎡 ferris-wheel emoji, whose
   support struts aren't symmetric and look broken mid-spin) — safe to
   rotate continuously. Mirrors the in-app wheel: wedges + hub + a fixed
   pointer that does NOT spin with the wheel. */
.sprite {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid var(--border);
  filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.4));
}
.wheel-spin {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #3b82f6 0deg 45deg,
    #22d3ee 45deg 90deg,
    #4ade80 90deg 135deg,
    #fbbf24 135deg 180deg,
    #f87171 180deg 225deg,
    #a78bfa 225deg 270deg,
    #f472b6 270deg 315deg,
    #38bdf8 315deg 360deg
  );
  animation: sprite-spin 7s linear infinite;
}
.wheel-hub {
  position: absolute;
  inset: 38%;
  border-radius: 50%;
  background: var(--panel);
  border: 2px solid var(--border);
}
.wheel-pointer {
  position: absolute;
  top: -7px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-top: 16px solid var(--text);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}
@keyframes sprite-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
h1 {
  margin: 0;
}
.landing p {
  max-width: 480px;
}
@media (prefers-reduced-motion: reduce) {
  .wheel-spin {
    animation: none;
  }
}
</style>
