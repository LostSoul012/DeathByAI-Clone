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
    blurb: "One player eliminated every round, worst strategy goes. Last one standing wins.",
  },
  {
    id: "shared_world",
    label: "Shared World",
    blurb: "Everyone faces the scenario together in one scene, not isolated realities.",
  },
  {
    id: "all_or_nothing",
    label: "All-or-Nothing",
    blurb: "One shared scenario, one round. Everyone survives together, or nobody does.",
  },
];

export const AI_PERSONALITIES = [
  {
    id: "grim_reaper",
    label: "Grim Reaper",
    blurb: "Dark, deadpan, treats every death as overdue paperwork. The default judge.",
  },
  {
    id: "tv_host",
    label: "TV Host",
    blurb: "Manufactures drama out of nothing. Every round is a season finale twist.",
  },
  {
    id: "idiot_savant",
    label: "Idiot Savant",
    blurb: "Somehow always gets the right verdict, for the dumbest possible reason.",
  },
];

export function getGameMode(id) {
  return GAME_MODES.find((m) => m.id === id) ?? GAME_MODES[0];
}

export function getAiPersonality(id) {
  return AI_PERSONALITIES.find((p) => p.id === id) ?? AI_PERSONALITIES[0];
}
