// One clock for the idle loops on Play. The glass folder and the record stack
// each play once per cycle at their own point in it, so they take turns and
// stay in step however often either is hovered or scrolled away.
export const CYCLE = 18000;

/** Milliseconds until the shared loop next reaches `at` (ms into the cycle). */
export const untilPhase = (at: number): number => {
  const into = performance.now() % CYCLE;
  return into < at ? at - into : CYCLE - into + at;
};
