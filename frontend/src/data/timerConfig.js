// Mirrors backend/game.js's TIMER_CONFIG — char limits only (actual
// deadlines are server-authoritative and arrive via room.game.
// scenarioDeadline/strategyDeadline). Keep these numbers in sync with the
// backend; they're only used here for accurate character counters.
const TIMER_CONFIG = {
  judgement_day: { scenarioCharLimit: 200, strategyCharLimit: 150 },
  blitz: { scenarioCharLimit: 100, strategyCharLimit: 100 },
  elimination: { scenarioCharLimit: 200, strategyCharLimit: 150 },
};

export function getTimerConfig(gameMode) {
  return TIMER_CONFIG[gameMode] ?? TIMER_CONFIG.judgement_day;
}
