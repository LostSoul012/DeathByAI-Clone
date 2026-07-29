// Display metadata for the game modes / AI personalities the Stage 1
// backend already validates. The `id` values here must exactly match
// rooms.js's VALID_GAME_MODES / VALID_AI_PERSONALITIES on the backend.

export const GAME_MODES = [
  {
    id: "judgement_day",
    label: "Judgement Day",
    blurb: "The classic. 5 rounds, standard rules.",
  },
  {
    id: "blitz",
    label: "Blitz",
    blurb: "8 rounds, short timers. No time to overthink it.",
  },
  {
    id: "elimination",
    label: "Elimination",
    blurb: "Die once and you're out. Last one standing wins.",
  },
];

export const AI_PERSONALITIES = [
  {
    id: "grim_reaper",
    label: "Grim Reaper",
    blurb: "Dark, deadpan, theatrical about death. The default judge.",
  },
  {
    id: "wholesome",
    label: "Wholesome",
    blurb: "Gentle and encouraging, even when you don't make it.",
  },
  {
    id: "savage",
    label: "Savage",
    blurb: "Brutally sarcastic. Will roast your strategy on the way out.",
  },
];

export function getGameMode(id) {
  return GAME_MODES.find((m) => m.id === id) ?? GAME_MODES[0];
}

export function getAiPersonality(id) {
  return AI_PERSONALITIES.find((p) => p.id === id) ?? AI_PERSONALITIES[0];
}
