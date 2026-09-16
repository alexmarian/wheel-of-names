import { reactive, ref, onMounted, onUnmounted } from 'vue';

// Shared timer for the "first to the finish" reveal themes (horse race,
// balloon, mountain). Only the visuals and the pace shapes differ.
//
// Every pace shape resolves to exactly 1 at p=1 and never moves backwards:
// a reversal near the finish reads as "got there, then lost", not suspense.

function easeOut(p) {
  return 1 - Math.pow(1 - p, 2);
}

// Each pace is a factory: called once per runner, returns p (0..1) -> 0..1.
// Randomness lives inside the factory so two runners drawing the same pace
// still move a little differently.
export const HORSE_PACES = [
  () => easeOut, // steady
  () => (p) => 1 - Math.pow(1 - p, 3.2), // burst: fast out of the gate, coasts in
  () => (p) => Math.pow(p, 2.4), // closer: slow start, sprints at the end
  // stumble: a visible mid-race slowdown, never a full stop. The dip is small
  // enough that the curve stays monotonic against easeOut's slope there.
  () => (p) => easeOut(p) - 0.09 * Math.pow(Math.sin(Math.PI * p), 8),
];

// One continuous family: a smooth ease-out of random strength with a faint
// breathing rhythm layered on top (one or two slow speed cycles). Amplitude
// is bounded so the derivative stays positive everywhere, and the rhythm
// returns to zero at p=1 so the finish is exact.
export const CLIMB_PACES = [
  () => {
    const k = 1.4 + Math.random() * 0.6;
    const cycles = 1 + Math.floor(Math.random() * 2);
    const amp = 0.015 + Math.random() * 0.015;
    return (p) => 1 - Math.pow(1 - p, k) + amp * Math.sin(2 * Math.PI * cycles * p);
  },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// progress[i] is 0..100. The winner alone reaches 100; everyone else runs
// their own pace toward a personal ceiling just short of the line, so the
// finish is never a visual tie yet still looks close.
export function useRace(
  entries,
  winnerId,
  emit,
  { paces, winnerDuration = 3400, otherDuration = [4400, 7000], ceiling = [0.92, 0.97] } = {}
) {
  const progress = reactive(entries.map(() => 0));
  const done = ref(false);
  let raf = 0;

  onMounted(() => {
    const winnerIdx = entries.findIndex((e) => e.id === winnerId);
    const runners = entries.map((_, i) => {
      const isWinner = i === winnerIdx;
      return {
        pace: pick(paces)(),
        dur: isWinner
          ? winnerDuration * (0.85 + Math.random() * 0.3)
          : otherDuration[0] + Math.random() * (otherDuration[1] - otherDuration[0]),
        cap: isWinner ? 1 : ceiling[0] + Math.random() * (ceiling[1] - ceiling[0]),
      };
    });
    const finishAt = runners[winnerIdx].dur + 500;
    const t0 = performance.now();

    const tick = (now) => {
      const el = now - t0;
      runners.forEach((r, i) => {
        progress[i] = r.pace(Math.min(1, el / r.dur)) * r.cap * 100;
      });
      if (el >= finishAt) {
        progress[winnerIdx] = 100;
        done.value = true;
        emit('finished');
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
  });

  onUnmounted(() => cancelAnimationFrame(raf));

  return { progress, done };
}
