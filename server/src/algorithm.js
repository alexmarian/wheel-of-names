// Weighted-decay algorithm (shared understanding):
//   N = full roster count (absent members still count toward N).
//   g = gain_mult * base_weight / N
//   Each spin: every ACTIVE member gains +g; the picked member loses g*N
//     (net picked change = +g - g*N = -g(N-1)).
//   Weights floor at floor_k * base_weight.
//   Absent members are pinned at base_weight and excluded from the draw.
//   There is no manual favor — "favor" is purely the emergent accumulation.

export function rosterCount(members) {
  return members.length;
}

export function activeMembers(members) {
  return members.filter((m) => !m.absent);
}

export function dailyGain(members, baseWeight, gainMult) {
  const n = rosterCount(members);
  if (n === 0) return 0;
  return (gainMult * baseWeight) / n;
}

export function floorValue(baseWeight, floorK) {
  return floorK * baseWeight;
}

// Apply the per-spin weight step, mutating members in place.
// Returns the list of changes for logging/persistence.
export function applyStep(members, g, pickedId, baseWeight, floorK) {
  for (const m of members) {
    if (!m.absent) m.weight += g;
  }
  const picked = members.find((m) => m.id === pickedId);
  if (picked) picked.weight -= g * members.length; // N = full roster
  // clamp all (active and pinned absent) to the floor
  const floor = floorValue(baseWeight, floorK);
  for (const m of members) {
    if (m.weight < floor) m.weight = floor;
  }
}

export function weightedPick(members, rng = Math.random) {
  const active = activeMembers(members);
  if (active.length === 0) return null;
  const total = active.reduce((s, m) => s + m.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const m of active) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return active[active.length - 1];
}

export function odds(members) {
  const active = activeMembers(members);
  const total = active.reduce((s, m) => s + m.weight, 0) || 1;
  return members.map((m) => ({
    ...m,
    probability: m.absent ? 0 : m.weight / total,
  }));
}
