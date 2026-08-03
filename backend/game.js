// game.js
// Round state machine + round-robin scenario-writer assignment.
// Extends the room object from Stage 1 with a `game` sub-object — no
// separate system. Actual round/prompt content (Stage 4), judging
// (Stage 5), and scoring/elimination-setting (Stage 7) are NOT this
// file's job; this only owns turn order and phase transitions.

const ROUND_COUNTS = {
  judgement_day: 5,
  blitz: 8,
  elimination: null, // no fixed count — see ELIMINATION_ROUND_CAP
  shared_world: 5,
  all_or_nothing: 1,
};

const ELIMINATION_ROUND_CAP = 10;

// Per-mode timing + char limits for the scenario and strategy phases.
const TIMER_CONFIG = {
  judgement_day: { scenarioMs: 45_000, strategyMs: 60_000, scenarioCharLimit: 200, strategyCharLimit: 150 },
  blitz: { scenarioMs: 30_000, strategyMs: 40_000, scenarioCharLimit: 100, strategyCharLimit: 100 },
  elimination: { scenarioMs: 45_000, strategyMs: 60_000, scenarioCharLimit: 200, strategyCharLimit: 150 },
  shared_world: { scenarioMs: 45_000, strategyMs: 60_000, scenarioCharLimit: 200, strategyCharLimit: 150 },
  all_or_nothing: { scenarioMs: 45_000, strategyMs: 60_000, scenarioCharLimit: 200, strategyCharLimit: 150 },
};

function getTimerConfig(gameMode) {
  return TIMER_CONFIG[gameMode] ?? TIMER_CONFIG.judgement_day;
}

const PHASES = [
  "waiting_for_scenario",
  "writing_prompts",
  "judging",
  "revealing_results",
  "round_complete",
];

const FALLBACK_SCENARIOS = [
  "You are stranded on a sinking ship",
  "A dragon has cornered you in a cave",
  "The vending machine at work has gained sentience and is furious with you",
  "You're the last human during a robot uprising",
  "Your parachute won't open",
  "You've been challenged to a duel by a very angry goose",
  "The elevator you're in is in freefall",
  "You accidentally insulted a wizard at a dinner party",
];

function getTotalRounds(gameMode) {
  return ROUND_COUNTS[gameMode] ?? ROUND_COUNTS.judgement_day;
}

function getRandomFallbackScenario() {
  return FALLBACK_SCENARIOS[Math.floor(Math.random() * FALLBACK_SCENARIOS.length)];
}

// Fisher-Yates. Returns a new array, doesn't mutate the input.
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// A player can take scenario-writer turns if connected, and (in
// Elimination mode only) not yet eliminated. Other modes ignore
// `eliminated` entirely since only Elimination ever sets it.
function isPlayerActive(room, player) {
  if (!player.connected) return false;
  if (room.gameMode === "elimination" && player.eliminated) return false;
  return true;
}

function getActivePlayers(room) {
  return room.players.filter((p) => isPlayerActive(room, p));
}

// Walks turnOrder starting at startIndex (wrapping around) and returns the
// first active player found, or null if nobody active remains at all.
function findNextActiveWriter(room, startIndex) {
  const order = room.game.turnOrder;
  for (let i = 0; i < order.length; i++) {
    const idx = (startIndex + i) % order.length;
    const playerId = order[idx];
    const player = room.players.find((p) => p.id === playerId);
    if (player && isPlayerActive(room, player)) {
      return { playerId, index: idx };
    }
  }
  return null;
}

// Assigns the current round's writer using game.nextWriterSearchIndex as
// the starting point, and advances that pointer for next time. This one
// function is both "give me a fresh round's writer" AND (when called
// again with the search restarted at the outgoing writer's own slot,
// see handleWriterDisconnect) "the writer I picked just went inactive,
// give me the next one" — same cycling logic either way.
function assignRoundWriter(room, searchStartIndex) {
  const g = room.game;
  const result = findNextActiveWriter(room, searchStartIndex);
  if (!result) {
    // Nobody active left at all — shouldn't happen in normal play, but
    // don't leave the room stuck.
    g.scenarioWriterId = null;
    g.gameComplete = true;
    return;
  }
  g.scenarioWriterId = result.playerId;
  g.nextWriterSearchIndex = (result.index + 1) % g.turnOrder.length;
  g.writerAssignmentLog.push({ round: g.currentRound, writerId: result.playerId });
}

function logWriterAssignments(room) {
  const names = room.game.writerAssignmentLog.map(({ round, writerId }) => {
    const player = room.players.find((p) => p.id === writerId);
    return `Round ${round}: ${player?.username ?? "?"}`;
  });
  console.log(`[${room.code}] Scenario-writer assignment so far — ${names.join(", ")}`);
}

// Host starts the game. Throws on invalid state so the caller (socket
// handler) can turn that into a clear error_event.
function startGame(room) {
  const connectedCount = room.players.filter((p) => p.connected).length;
  if (connectedCount < 2) {
    throw new Error("Need at least 2 connected players to start.");
  }
  // Allow starting again once a previous game finished (Play Again) —
  // only block if a game is genuinely still in progress.
  if (room.game?.started && !room.game.gameComplete) {
    throw new Error("This game has already started.");
  }

  // Play Again: clear elimination status from any previous game. Harmless
  // no-op on a genuinely fresh room, since it's already false for everyone.
  for (const player of room.players) {
    player.eliminated = false;
  }

  const activePlayerIds = getActivePlayers(room).map((p) => p.id);
  const turnOrder = shuffle(activePlayerIds);

  room.game = {
    started: true,
    totalRounds: getTotalRounds(room.gameMode),
    roundCap: room.gameMode === "elimination" ? ELIMINATION_ROUND_CAP : null,
    turnOrder,
    nextWriterSearchIndex: 0,
    currentRound: 1,
    phase: "waiting_for_scenario",
    scenarioWriterId: null,
    gameComplete: false,
    writerAssignmentLog: [],
    currentScenario: null,
    scenarioDeadline: null,
    strategyDeadline: null,
    submissions: {}, // playerId -> strategy text, reset each round
    // playerId -> latest in-progress (unsubmitted) strategy text, streamed
    // in from the client as they type. Server-only — deliberately left out
    // of serializeGame so nobody else can see a live draft before it's
    // submitted. Used as the fallback in finalizeStrategyPhase instead of
    // "" when someone runs out the clock without clicking Confirm — see
    // updateStrategyDraft for why this replaced a client-side timer race.
    drafts: {},
    scenarioTimeoutHandle: null,
    strategyTimeoutHandle: null,
    results: null, // [{ username, survived, story, score }], set once judging finishes
    judgingInProgress: false,
    history: {}, // playerId -> [{ survived, score }, ...] across the whole game, oldest first
    // Host-paced verdict reveal counter — see recordJudgingResults and
    // socketHandlers.js's reveal_continue handler for how it advances.
    revealCursor: 0,
  };

  assignRoundWriter(room, 0);
  logWriterAssignments(room);
}

// Called from the disconnect handler. Returns true if it changed
// something (so the caller knows to broadcast an update).
function handleWriterDisconnect(room, disconnectedPlayerId) {
  const g = room.game;
  if (!g || !g.started || g.gameComplete) return false;
  if (g.phase !== "waiting_for_scenario") return false;
  if (g.scenarioWriterId !== disconnectedPlayerId) return false;

  // Search starting at the outgoing writer's own slot — isPlayerActive
  // will correctly skip them now that they're disconnected, and land on
  // the next active player in the fixed turn order.
  const outgoingIndex = g.turnOrder.indexOf(disconnectedPlayerId);
  assignRoundWriter(room, outgoingIndex === -1 ? g.nextWriterSearchIndex : outgoingIndex);
  return true;
}

function setPhase(room, phase) {
  if (!PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }
  room.game.phase = phase;
}

function clearScenarioTimer(room) {
  if (room.game.scenarioTimeoutHandle) {
    clearTimeout(room.game.scenarioTimeoutHandle);
    room.game.scenarioTimeoutHandle = null;
  }
}

function clearStrategyTimer(room) {
  if (room.game.strategyTimeoutHandle) {
    clearTimeout(room.game.strategyTimeoutHandle);
    room.game.strategyTimeoutHandle = null;
  }
}

// Call this right after entering waiting_for_scenario (game start, a new
// round, or a live writer reassignment doesn't need to re-arm — see note
// on handleWriterDisconnect). broadcastFn is called with no arguments
// whenever the timer fires and changes state, so the caller can push a
// room_updated. msOverride is test-only, to avoid waiting out a real 30s
// timer in integration tests.
function armScenarioTimer(room, broadcastFn, msOverride) {
  clearScenarioTimer(room);
  const ms = msOverride ?? getTimerConfig(room.gameMode).scenarioMs;
  room.game.scenarioDeadline = Date.now() + ms;
  room.game.scenarioTimeoutHandle = setTimeout(() => {
    if (room.game.phase !== "waiting_for_scenario") return; // already submitted
    submitScenario(room, getRandomFallbackScenario());
    // submitScenario only sets state — this path bypasses the normal
    // submit_scenario handler, so it's on us to arm the next timer too.
    armStrategyTimer(room, broadcastFn);
    broadcastFn(room);
  }, ms);
}

// Pure state mutation — no timer/broadcast side effects, so both the real
// submit_scenario handler and the timeout fallback above can share it.
function submitScenario(room, scenarioText) {
  const g = room.game;
  if (g.phase !== "waiting_for_scenario") {
    throw new Error("Not currently accepting a scenario.");
  }
  clearScenarioTimer(room);
  const limit = getTimerConfig(room.gameMode).scenarioCharLimit;
  g.currentScenario = (scenarioText || "").slice(0, limit);
  g.phase = "writing_prompts";
  g.submissions = {};
  g.drafts = {};
}

// Call this right after entering writing_prompts.
function armStrategyTimer(room, broadcastFn, msOverride) {
  clearStrategyTimer(room);
  const ms = msOverride ?? getTimerConfig(room.gameMode).strategyMs;
  room.game.strategyDeadline = Date.now() + ms;
  room.game.strategyTimeoutHandle = setTimeout(() => {
    if (room.game.phase !== "writing_prompts") return; // already finalized
    finalizeStrategyPhase(room);
    broadcastFn(room);
  }, ms);
}

// Records a player's current in-progress strategy text as they type, so
// finalizeStrategyPhase has something real to fall back to instead of ""
// if they run out the clock without clicking Confirm. Best-effort by
// design: silently no-ops outside writing_prompts or once a player has
// already submitted, rather than throwing — this is called on a debounce
// from every keystroke, not a deliberate user action, so it shouldn't be
// surfaced as an error the way a real submit failure would be.
function updateStrategyDraft(room, playerId, draftText) {
  const g = room.game;
  if (g.phase !== "writing_prompts") return;
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !isPlayerActive(room, player)) return;
  if (playerId in g.submissions) return;

  const limit = getTimerConfig(room.gameMode).strategyCharLimit;
  g.drafts[playerId] = (draftText || "").slice(0, limit);
}

// Records one player's strategy. Returns true if every active player has
// now submitted (caller should finalize + broadcast immediately rather
// than waiting for the timer).
function submitStrategy(room, playerId, strategyText) {
  const g = room.game;
  if (g.phase !== "writing_prompts") {
    throw new Error("Not currently accepting strategies.");
  }
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !isPlayerActive(room, player)) {
    throw new Error("You're not an active player in this round.");
  }
  if (playerId in g.submissions) {
    throw new Error("You've already submitted a strategy this round.");
  }
  const limit = getTimerConfig(room.gameMode).strategyCharLimit;
  g.submissions[playerId] = (strategyText || "").slice(0, limit);
  return allActivePlayersSubmitted(room);
}

function allActivePlayersSubmitted(room) {
  const activeIds = getActivePlayers(room).map((p) => p.id);
  return activeIds.length > 0 && activeIds.every((id) => id in room.game.submissions);
}

// Fills in each active player who never formally submitted with their
// last-known draft (falling back to "" only if they never typed anything
// at all), and moves to judging. Called either when everyone's submitted
// early, when the server's own strategy timer runs out (the only clock
// that decides this — see updateStrategyDraft's comment for why the
// client no longer runs a competing one), or when a disconnect means
// everyone remaining HAS submitted (see handleStrategyPhaseDisconnect).
function finalizeStrategyPhase(room) {
  const g = room.game;
  clearStrategyTimer(room);
  for (const player of getActivePlayers(room)) {
    if (!(player.id in g.submissions)) {
      g.submissions[player.id] = g.drafts[player.id] || "";
    }
  }
  g.phase = "judging";
}

// Called from the disconnect handler. If we're mid writing_prompts and
// the player who just left was the only one left who hadn't submitted,
// there's no reason to keep waiting on their timer — finalize right away.
// Returns true if it changed something (caller should broadcast).
function handleStrategyPhaseDisconnect(room) {
  const g = room.game;
  if (!g || !g.started || g.gameComplete) return false;
  if (g.phase !== "writing_prompts") return false;
  if (!allActivePlayersSubmitted(room)) return false;

  finalizeStrategyPhase(room);
  return true;
}

// Called once groqJudge.js's judgeRound() resolves. Stores the results,
// records each active player's outcome into their running history
// (survived + score, oldest first), sets `eliminated` in Elimination mode,
// and moves to revealing_results — Stage 6/7 own pacing the actual reveal
// and standings display on the frontend; this just makes the data ready.
function recordJudgingResults(room, results) {
  room.game.results = results;
  room.game.judgingInProgress = false;
  room.game.phase = "revealing_results";
  // Fresh reveal for this round — the host steps through each player's
  // verdict one sentence at a time from the start.
  room.game.revealCursor = 0;

  for (const result of results) {
    const player = room.players.find((p) => p.username === result.username);
    if (!player) continue; // shouldn't happen — defensive only

    if (!room.game.history[player.id]) room.game.history[player.id] = [];
    room.game.history[player.id].push({ survived: result.survived, score: result.score });

    if (room.gameMode === "elimination" && !result.survived) {
      player.eliminated = true;
    }
  }
}

// Ranked standings derived from history — used for both the between-round
// Standings screen and the final Winner Screen. Ties share the same rank
// (standard competition ranking: 1, 1, 3, 4), which is what makes
// "co-winners" work — anyone ranked 1 is a winner.
function computeStandings(room) {
  const entries = room.players.map((player) => {
    const rounds = room.game.history[player.id] ?? [];
    const survivalCount = rounds.filter((r) => r.survived).length;
    const avgScore = rounds.length ? rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length : 0;

    return {
      playerId: player.id,
      username: player.username,
      avatarId: player.avatarId,
      connected: player.connected,
      eliminated: player.eliminated,
      survivalCount,
      avgScore: Math.round(avgScore * 10) / 10,
      roundHistory: rounds.map((r) => r.survived),
    };
  });

  entries.sort((a, b) => b.survivalCount - a.survivalCount);

  let rank = 0;
  let previousCount = null;
  entries.forEach((entry, i) => {
    if (entry.survivalCount !== previousCount) {
      rank = i + 1;
      previousCount = entry.survivalCount;
    }
    entry.rank = rank;
  });

  return entries;
}

// Checks whether the game should end after the round that just finished.
// Elimination mode ends early on <=1 active player or the round cap;
// other modes just run their fixed round count.
function checkGameComplete(room) {
  const g = room.game;
  if (room.gameMode === "elimination") {
    const activeCount = getActivePlayers(room).length;
    return activeCount <= 1 || g.currentRound >= g.roundCap;
  }
  return g.currentRound >= g.totalRounds;
}

// Moves from round_complete to either the next round (new writer,
// waiting_for_scenario) or flags the game as complete.
function advanceToNextRound(room) {
  const g = room.game;
  if (checkGameComplete(room)) {
    g.gameComplete = true;
    return;
  }
  g.currentRound += 1;
  assignRoundWriter(room, g.nextWriterSearchIndex);
  g.phase = "waiting_for_scenario";
  g.currentScenario = null;
  g.scenarioDeadline = null;
  g.strategyDeadline = null;
  g.submissions = {};
  g.results = null;
  g.judgingInProgress = false;
  g.revealCursor = 0;
}

// Host-only step through the verdict reveal (see socketHandlers.js's
// reveal_continue). Each call is one "Continue" / "Next Player" click —
// the frontend derives which player/sentence that lands on from this
// counter plus the (already-synced) results/story text, so every client
// advances in lockstep off the same broadcast instead of independent
// local timers.
function advanceRevealCursor(room) {
  room.game.revealCursor = (room.game.revealCursor || 0) + 1;
}

// Advances the phase machine by one step. Round/game-boundary logic
// (advanceToNextRound) only fires when stepping past round_complete.
// This is the "test button / dummy timeout" hook the brief calls for —
// Stages 4/5/6 replace these calls with real triggers (submission
// received, judging finished, narration finished, etc).
function debugAdvancePhase(room) {
  const g = room.game;
  if (!g || !g.started || g.gameComplete) return;

  const currentIndex = PHASES.indexOf(g.phase);
  if (currentIndex < PHASES.length - 1) {
    g.phase = PHASES[currentIndex + 1];
  } else {
    advanceToNextRound(room);
  }
}

const PHASES_WHERE_SUBMISSIONS_ARE_REVEALED = ["judging", "revealing_results", "round_complete"];

function serializeGame(room) {
  if (!room.game) return null;
  const {
    started,
    totalRounds,
    roundCap,
    currentRound,
    phase,
    scenarioWriterId,
    gameComplete,
    currentScenario,
    scenarioDeadline,
    strategyDeadline,
    submissions,
    results,
    revealCursor,
  } = room.game;
  return {
    started,
    totalRounds,
    roundCap,
    currentRound,
    phase,
    scenarioWriterId,
    gameComplete,
    currentScenario,
    scenarioDeadline,
    strategyDeadline,
    // Who has submitted, not what they wrote — don't spoil strategies
    // before judging.
    submittedPlayerIds: Object.keys(submissions),
    // The actual text becomes visible once judging has started — nothing
    // left to spoil once everyone's already submitted, and Stage 6's
    // reveal needs it for the board-flip card.
    submissions: PHASES_WHERE_SUBMISSIONS_ARE_REVEALED.includes(phase) ? submissions : null,
    results,
    // How many "Continue"/"Next Player" clicks the host has made this
    // round's reveal — see PlayerRevealCard/StoryCard on the frontend.
    revealCursor: revealCursor ?? 0,
    // Ranked standings, recomputed fresh each time — cheap over a handful
    // of players, and there's no spoiler concern (aggregate counts only).
    standings: computeStandings(room),
  };
}

module.exports = {
  PHASES,
  ELIMINATION_ROUND_CAP,
  getTotalRounds,
  getTimerConfig,
  getRandomFallbackScenario,
  shuffle,
  isPlayerActive,
  getActivePlayers,
  findNextActiveWriter,
  assignRoundWriter,
  startGame,
  handleWriterDisconnect,
  setPhase,
  checkGameComplete,
  advanceToNextRound,
  debugAdvancePhase,
  armScenarioTimer,
  submitScenario,
  armStrategyTimer,
  submitStrategy,
  updateStrategyDraft,
  finalizeStrategyPhase,
  allActivePlayersSubmitted,
  handleStrategyPhaseDisconnect,
  recordJudgingResults,
  advanceRevealCursor,
  computeStandings,
  clearScenarioTimer,
  clearStrategyTimer,
  serializeGame,
};
