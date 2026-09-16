import { reactive, ref, onMounted } from 'vue';

// A few distinct pacing "shapes", picked per-climber so the race doesn't
// move the same way every time — but always moving forward. No profile ever
// overshoots and settles back down: for a balloon or a climber (unlike the
// wheel, where a wobble-back is a natural physical touch) any backward dip
// near the finish reads as "it got there, then lost", not suspense. A pause
// mid-climb (tired legs / a downdraft) is fine — a reversal isn't. Every
// shape must resolve to exactly 1 at p=1 so the climber rests at the right
// final height.
const PROFILES = ['steady', 'earlyPause', 'latePause', 'linear'];

function easeOut(p) {
  return 1 - Math.pow(1 - p, 2);
}
function easeInOut(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}
function applyProfile(name, p) {
  switch (name) {
    case 'linear':
      return p;
    case 'earlyPause': // quick rise, stalls (tired / downdraft), then finishes
      if (p < 0.4) return easeOut(p / 0.4) * 0.55;
      if (p < 0.62) return 0.55;
      return 0.55 + easeOut((p - 0.62) / 0.38) * 0.45;
    case 'latePause': // steady climb, catches a downdraft near the top, recovers
      if (p < 0.55) return easeOut(p / 0.55) * 0.8;
      if (p < 0.75) return 0.8;
      return 0.8 + easeOut((p - 0.75) / 0.25) * 0.2;
    case 'steady':
    default:
      return easeInOut(p);
  }
}

// Shared timer/pacing for the vertical "climb to the top" reveal themes
// (balloon, mountain) — only the visuals differ between them.
// bottom:100% would put the climber's anchor at the very top of the track;
// the sprite itself still extends a bit further up past that point into the
// track's overflow:hidden box, so cap it short of 100%.
export function useClimb(
  entries,
  winnerId,
  emit,
  { maxClimb = 86, winnerDuration = 3400, otherDuration = [4400, 7000] } = {}
) {
  const progress = reactive(entries.map(() => 0));
  const done = ref(false);

  onMounted(() => {
    const winnerIdx = entries.findIndex((e) => e.id === winnerId);
    const winnerDur = winnerDuration * (0.85 + Math.random() * 0.3);
    const dur = entries.map((_, i) =>
      i === winnerIdx ? winnerDur : otherDuration[0] + Math.random() * (otherDuration[1] - otherDuration[0])
    );
    const profiles = entries.map(() => PROFILES[Math.floor(Math.random() * PROFILES.length)]);
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const el = now - t0;
      const finishAt = dur[winnerIdx] + 500;
      entries.forEach((_, i) => {
        const p = Math.min(1, el / dur[i]);
        progress[i] = applyProfile(profiles[i], p) * maxClimb;
      });
      done.value = el >= finishAt;
      if (done.value) {
        // Non-winners freeze mid-flight (cut off at the winner's finish
        // time, not their own) rather than completing their own curve.
        // Belt-and-suspenders: pin the winner at the top and clamp everyone
        // else just under it, so the frozen reveal frame is unambiguous
        // even if a future profile isn't perfectly bounded.
        progress[winnerIdx] = maxClimb;
        entries.forEach((_, i) => {
          if (i !== winnerIdx) progress[i] = Math.min(progress[i], maxClimb - 3);
        });
        emit('finished');
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });

  return { progress, done };
}
