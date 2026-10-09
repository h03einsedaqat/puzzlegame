/** Motion system in milliseconds; tuned for brief, quiet game feedback. */
export const motion = {
  tap: 90,
  release: 120,
  selection: 110,
  correct: 190,
  error: 180,
  feedbackEnter: 170,
  feedbackExit: 150,
  feedbackVisible: 1850,
  reward: 380,
  levelComplete: 520,
} as const;
