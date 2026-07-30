// socketHandlers.js
// All Socket.io event listeners for the room/lobby layer (Stage 1).

const {
  MAX_PLAYERS_PER_ROOM,
  createRoom,
  getRoom,
  isUsernameTaken,
  addPlayerToRoom,
  getPlayer,
  findRoomBySocketId,
  handleDisconnect,
  setGameMode,
  setAiPersonality,
  serializeRoom,
} = require("./rooms");

const {
  startGame,
  handleWriterDisconnect,
  debugAdvancePhase,
  armScenarioTimer,
  submitScenario,
  armStrategyTimer,
  submitStrategy,
  updateStrategyDraft,
  finalizeStrategyPhase,
  handleStrategyPhaseDisconnect,
  recordJudgingResults,
  advanceRevealCursor,
  advanceToNextRound,
} = require("./game");

const { judgeRound } = require("./groqJudge");

function isValidUsername(username) {
  return (
    typeof username === "string" &&
    username.trim().length > 0 &&
    username.trim().length <= 20
  );
}

function broadcastRoomUpdate(io, room) {
  io.to(room.code).emit("room_updated", serializeRoom(room));
}

// Use this instead of broadcastRoomUpdate anywhere a room's phase could
// have just become "judging" (submitting the last strategy, the strategy
// timer firing, a disconnect finalizing the round). Broadcasts immediately
// so clients see the judging spinner, then kicks off the real Groq call in
// the background and broadcasts again once results are ready. The
// judgingInProgress guard stops it from double-firing if this gets called
// more than once while a call is already in flight (harmless either way,
// just wasteful).
function broadcastAndMaybeJudge(io, room) {
  broadcastRoomUpdate(io, room);

  if (room.game?.phase === "judging" && !room.game.judgingInProgress) {
    room.game.judgingInProgress = true;
    judgeRound(room)
      .then((results) => {
        recordJudgingResults(room, results);
        broadcastRoomUpdate(io, room);
      })
      .catch((err) => {
        // judgeRound is designed not to throw — this is a last-resort
        // safety net so a bug in it can't wedge the room forever.
        console.error(`[${room.code}] judgeRound rejected unexpectedly:`, err);
        room.game.judgingInProgress = false;
      });
  }
}

function registerSocketHandlers(io, socket) {
  socket.on("create_room", ({ username, avatarId } = {}) => {
    if (!isValidUsername(username)) {
      socket.emit("error_event", {
        type: "invalid_username",
        message: "Username must be between 1 and 20 characters.",
      });
      return;
    }

    const room = createRoom(socket.id, { username: username.trim(), avatarId });
    socket.join(room.code);
    socket.emit("room_created", serializeRoom(room));
  });

  socket.on("join_room", ({ roomCode, username, avatarId } = {}) => {
    if (!isValidUsername(username)) {
      socket.emit("error_event", {
        type: "invalid_username",
        message: "Username must be between 1 and 20 characters.",
      });
      return;
    }

    const room = getRoom(roomCode);
    if (!room) {
      socket.emit("error_event", {
        type: "room_not_found",
        message: `No room found with code ${roomCode}.`,
      });
      return;
    }

    const connectedCount = room.players.filter((p) => p.connected).length;
    if (connectedCount >= MAX_PLAYERS_PER_ROOM) {
      socket.emit("error_event", {
        type: "room_full",
        message: "This room is already full.",
      });
      return;
    }

    if (isUsernameTaken(room, username.trim())) {
      socket.emit("error_event", {
        type: "username_taken",
        message: "That username is already taken in this room.",
      });
      return;
    }

    addPlayerToRoom(room, socket.id, { username: username.trim(), avatarId });
    socket.join(room.code);

    socket.emit("room_joined", serializeRoom(room));
    broadcastRoomUpdate(io, room);
  });

  socket.on("set_game_mode", ({ gameMode } = {}) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) return;

    const player = getPlayer(room, socket.id);
    if (!player?.isHost) {
      socket.emit("error_event", {
        type: "not_host",
        message: "Only the host can change the game mode.",
      });
      return;
    }

    try {
      setGameMode(room, gameMode);
      broadcastRoomUpdate(io, room);
    } catch (err) {
      socket.emit("error_event", { type: "invalid_game_mode", message: err.message });
    }
  });

  socket.on("set_ai_personality", ({ aiPersonality } = {}) => {
    const room = findRoomBySocketId(socket.id);
    if (!room) return;

    const player = getPlayer(room, socket.id);
    if (!player?.isHost) {
      socket.emit("error_event", {
        type: "not_host",
        message: "Only the host can change the AI personality.",
      });
      return;
    }

    try {
      setAiPersonality(room, aiPersonality);
      broadcastRoomUpdate(io, room);
    } catch (err) {
      socket.emit("error_event", { type: "invalid_ai_personality", message: err.message });
    }
  });

  socket.on("start_game", () => {
    const room = findRoomBySocketId(socket.id);
    if (!room) return;

    const player = getPlayer(room, socket.id);
    if (!player?.isHost) {
      socket.emit("error_event", {
        type: "not_host",
        message: "Only the host can start the game.",
      });
      return;
    }

    try {
      startGame(room);
      armScenarioTimer(room, () => broadcastRoomUpdate(io, room));
      broadcastRoomUpdate(io, room);
    } catch (err) {
      socket.emit("error_event", { type: "cannot_start", message: err.message });
    }
  });

  socket.on("submit_scenario", ({ scenarioText } = {}) => {
    const room = findRoomBySocketId(socket.id);
    if (!room?.game) return;

    if (room.game.scenarioWriterId !== socket.id) {
      socket.emit("error_event", {
        type: "not_scenario_writer",
        message: "It's not your turn to write a scenario.",
      });
      return;
    }

    try {
      submitScenario(room, scenarioText);
      armStrategyTimer(room, () => broadcastAndMaybeJudge(io, room));
      broadcastRoomUpdate(io, room);
    } catch (err) {
      socket.emit("error_event", { type: "cannot_submit_scenario", message: err.message });
    }
  });

  socket.on("submit_strategy", ({ strategyText } = {}) => {
    const room = findRoomBySocketId(socket.id);
    if (!room?.game) return;

    try {
      const allSubmitted = submitStrategy(room, socket.id, strategyText);
      if (allSubmitted) {
        // Nobody left to wait on — move to judging right away rather than
        // sitting out the rest of the strategy timer.
        finalizeStrategyPhase(room);
      }
      broadcastAndMaybeJudge(io, room);
    } catch (err) {
      socket.emit("error_event", { type: "cannot_submit_strategy", message: err.message });
    }
  });

  // Streamed in (debounced) from StrategyWritingScreen as the player
  // types — no broadcast, no client-visible error. This is what
  // finalizeStrategyPhase falls back to for anyone who runs the clock out
  // instead of clicking Confirm, so their actual typed text survives even
  // though they never formally submitted. Deliberately silent/no-op on
  // any failure: a draft update racing the phase already having moved on
  // is expected and harmless, not something the player needs to see an
  // error toast about.
  socket.on("update_strategy_draft", ({ strategyText } = {}) => {
    const room = findRoomBySocketId(socket.id);
    if (!room?.game) return;
    updateStrategyDraft(room, socket.id, strategyText);
  });

  // The real "Continue" trigger from the Standings screen — host-only.
  // Moves to the next round, or (if the mode's round count is reached, or
  // Elimination's early-end condition is met) marks the game complete so
  // clients show the Winner Screen instead.
  socket.on("continue_after_round", () => {
    const room = findRoomBySocketId(socket.id);
    if (!room?.game) return;

    const player = getPlayer(room, socket.id);
    if (!player?.isHost) {
      socket.emit("error_event", {
        type: "not_host",
        message: "Only the host can continue to the next round.",
      });
      return;
    }

    if (room.game.phase !== "revealing_results" || room.game.gameComplete) {
      socket.emit("error_event", {
        type: "cannot_continue",
        message: "Not ready to continue yet.",
      });
      return;
    }

    advanceToNextRound(room);
    if (room.game.phase === "waiting_for_scenario") {
      armScenarioTimer(room, () => broadcastAndMaybeJudge(io, room));
    }
    broadcastAndMaybeJudge(io, room);
  });

  // Host steps the verdict reader forward one beat: either the next
  // sentence of the current player's story, or (once all of that
  // player's sentences are shown) on to the next player / standings.
  // Purely a counter bump — see RevealSequence/StoryCard on the frontend
  // for how playerIndex/sentence is derived from it. Keeping the reveal
  // paced by this single broadcast (instead of independent per-client
  // timers) is also what keeps everyone's screen in sync.
  socket.on("reveal_continue", () => {
    const room = findRoomBySocketId(socket.id);
    if (!room?.game) return;

    const player = getPlayer(room, socket.id);
    if (!player?.isHost) {
      socket.emit("error_event", {
        type: "not_host",
        message: "Only the host can continue the verdict reveal.",
      });
      return;
    }

    if (room.game.phase !== "revealing_results") {
      socket.emit("error_event", {
        type: "cannot_continue",
        message: "Not ready to continue yet.",
      });
      return;
    }

    advanceRevealCursor(room);
    broadcastRoomUpdate(io, room);
  });

  // Dev/test hook only — steps the round phase machine forward one step
  // (or into the next round, once past round_complete). Stages 4-6 replace
  // calls to this with real triggers (submissions received, judging
  // finished, narration finished). Intentionally not host-gated: it's a
  // stand-in for automatic transitions, not a player action.
  socket.on("debug_advance_phase", () => {
    const room = findRoomBySocketId(socket.id);
    if (!room?.game) return;

    debugAdvancePhase(room);
    // If that rolled us into a fresh round, arm its scenario timer too —
    // otherwise round 2+ reached this way would have no deadline at all.
    if (room.game.phase === "waiting_for_scenario") {
      armScenarioTimer(room, () => broadcastAndMaybeJudge(io, room));
    }
    broadcastAndMaybeJudge(io, room);
  });

  socket.on("disconnect", () => {
    const result = handleDisconnect(socket.id);
    if (!result) return;

    const { room } = result;
    handleWriterDisconnect(room, socket.id);
    handleStrategyPhaseDisconnect(room);
    broadcastAndMaybeJudge(io, room);
  });
}

module.exports = { registerSocketHandlers };
