// Unit tests for game.js's pure logic — no sockets, no server needed.
// Run with: node --test test-game-logic.js
const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("./game");

function makeRoom(usernames, gameMode = "judgement_day") {
  return {
    code: "TEST",
    gameMode,
    players: usernames.map((username, i) => ({
      id: `p${i}`,
      username,
      isHost: i === 0,
      connected: true,
      eliminated: false,
    })),
    game: null,
  };
}

test("startGame throws with fewer than 2 connected players", () => {
  const room = makeRoom(["Alice"]);
  assert.throws(() => game.startGame(room), /at least 2/);
});

test("startGame sets up a turn order covering every player exactly once", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  assert.equal(room.game.turnOrder.length, 3);
  assert.deepEqual([...room.game.turnOrder].sort(), ["p0", "p1", "p2"]);
});

test("round-robin: nobody gets a 2nd writer turn until everyone's had 1", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"], "blitz"); // 8 rounds
  game.startGame(room);

  const writerSequence = [room.game.scenarioWriterId];
  for (let round = 2; round <= 8; round++) {
    room.game.phase = "round_complete";
    game.advanceToNextRound(room);
    writerSequence.push(room.game.scenarioWriterId);
  }

  assert.equal(writerSequence.length, 8);
  // First 3 writers must be 3 distinct players (everyone's 1st turn)
  assert.equal(new Set(writerSequence.slice(0, 3)).size, 3);
  // The sequence should just be the turn order repeated
  const order = room.game.turnOrder;
  const expected = Array.from({ length: 8 }, (_, i) => order[i % order.length]);
  assert.deepEqual(writerSequence, expected);
});

test("disconnected players are skipped in the writer rotation", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"], "blitz");
  game.startGame(room);
  const order = room.game.turnOrder;

  // Disconnect whoever is 2nd in turn order (not currently writing).
  const secondPlayer = room.players.find((p) => p.id === order[1]);
  secondPlayer.connected = false;

  const writerSequence = [room.game.scenarioWriterId];
  for (let round = 2; round <= 6; round++) {
    room.game.phase = "round_complete";
    game.advanceToNextRound(room);
    writerSequence.push(room.game.scenarioWriterId);
  }

  assert.ok(!writerSequence.includes(secondPlayer.id), "disconnected player should never be assigned");
});

test("mid-round disconnect of the CURRENT writer reassigns to the next active player", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  const currentWriterId = room.game.scenarioWriterId;
  assert.equal(room.game.phase, "waiting_for_scenario");

  const writer = room.players.find((p) => p.id === currentWriterId);
  writer.connected = false;
  const changed = game.handleWriterDisconnect(room, currentWriterId);

  assert.equal(changed, true);
  assert.notEqual(room.game.scenarioWriterId, currentWriterId);
  assert.ok(game.getActivePlayers(room).some((p) => p.id === room.game.scenarioWriterId));
});

test("writer disconnect reassignment is a no-op once past waiting_for_scenario", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  const currentWriterId = room.game.scenarioWriterId;
  room.game.phase = "writing_prompts"; // writer already submitted, phase moved on

  const writer = room.players.find((p) => p.id === currentWriterId);
  writer.connected = false;
  const changed = game.handleWriterDisconnect(room, currentWriterId);

  assert.equal(changed, false);
  assert.equal(room.game.scenarioWriterId, currentWriterId);
});

test("judgement_day runs exactly 5 rounds then completes", () => {
  const room = makeRoom(["Alice", "Bob"], "judgement_day");
  game.startGame(room);
  for (let i = 0; i < 4; i++) {
    room.game.phase = "round_complete";
    game.advanceToNextRound(room);
  }
  assert.equal(room.game.currentRound, 5);
  assert.equal(room.game.gameComplete, false);

  room.game.phase = "round_complete";
  game.advanceToNextRound(room);
  assert.equal(room.game.gameComplete, true);
});

test("elimination mode ends early once only 1 active player remains", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"], "elimination");
  game.startGame(room);

  room.players.find((p) => p.id === "p0").eliminated = true;
  room.players.find((p) => p.id === "p1").eliminated = true;
  // p2 is the sole survivor

  room.game.phase = "round_complete";
  game.advanceToNextRound(room);

  assert.equal(room.game.gameComplete, true);
});

test("elimination mode is capped at 10 rounds even if 2+ players remain", () => {
  const room = makeRoom(["Alice", "Bob"], "elimination"); // nobody eliminated
  game.startGame(room);

  for (let i = 0; i < 9; i++) {
    room.game.phase = "round_complete";
    game.advanceToNextRound(room);
  }
  assert.equal(room.game.currentRound, 10);
  assert.equal(room.game.gameComplete, false);

  room.game.phase = "round_complete";
  game.advanceToNextRound(room);
  assert.equal(room.game.gameComplete, true);
});

test("recordJudgingResults appends to history and sets eliminated in Elimination mode", () => {
  const room = makeRoom(["Alice", "Bob"], "elimination");
  game.startGame(room);
  game.recordJudgingResults(room, [
    { username: "Alice", survived: true, story: "ok", score: 8 },
    { username: "Bob", survived: false, story: "ok", score: 3 },
  ]);

  assert.deepEqual(room.game.history.p0, [{ survived: true, score: 8 }]);
  assert.deepEqual(room.game.history.p1, [{ survived: false, score: 3 }]);
  assert.equal(room.players.find((p) => p.id === "p1").eliminated, true);
  assert.equal(room.players.find((p) => p.id === "p0").eliminated, false);
});

test("recordJudgingResults does NOT set eliminated outside Elimination mode", () => {
  const room = makeRoom(["Alice", "Bob"], "judgement_day");
  game.startGame(room);
  game.recordJudgingResults(room, [
    { username: "Alice", survived: true, story: "ok", score: 8 },
    { username: "Bob", survived: false, story: "ok", score: 3 },
  ]);

  assert.equal(room.players.find((p) => p.id === "p1").eliminated, false);
});

test("computeStandings ranks by survival count with standard competition ranking for ties", () => {
  const room = makeRoom(["Alice", "Bob", "Carol", "Dave"]);
  game.startGame(room);
  room.game.history = {
    p0: [{ survived: true, score: 5 }, { survived: true, score: 7 }], // 2 survivals
    p1: [{ survived: true, score: 5 }, { survived: true, score: 3 }], // 2 survivals (tied with Alice)
    p2: [{ survived: true, score: 5 }, { survived: false, score: 3 }], // 1 survival
    p3: [{ survived: false, score: 1 }, { survived: false, score: 1 }], // 0 survivals
  };

  const standings = game.computeStandings(room);
  const byUsername = Object.fromEntries(standings.map((s) => [s.username, s]));

  assert.equal(byUsername.Alice.rank, 1);
  assert.equal(byUsername.Bob.rank, 1); // tied for 1st with Alice
  assert.equal(byUsername.Carol.rank, 3); // not 2nd — standard competition ranking
  assert.equal(byUsername.Dave.rank, 4);
  assert.equal(byUsername.Alice.avgScore, 6); // (5+7)/2
});

test("computeStandings reflects roundHistory per player for the standings icon row", () => {
  const room = makeRoom(["Alice", "Bob"], "elimination");
  game.startGame(room);
  room.game.history = {
    p0: [{ survived: true, score: 5 }, { survived: true, score: 5 }],
    p1: [{ survived: false, score: 2 }], // eliminated after round 1, shorter history
  };
  const standings = game.computeStandings(room);
  const bob = standings.find((s) => s.username === "Bob");
  assert.deepEqual(bob.roundHistory, [false]);
});

test("Play Again (calling startGame again after gameComplete) resets eliminated status and history", () => {
  const room = makeRoom(["Alice", "Bob"], "elimination");
  game.startGame(room);
  room.players.find((p) => p.id === "p1").eliminated = true;
  room.game.history = { p0: [{ survived: true, score: 5 }], p1: [{ survived: false, score: 1 }] };
  room.game.gameComplete = true;

  game.startGame(room); // Play Again

  assert.equal(room.players.find((p) => p.id === "p1").eliminated, false);
  assert.deepEqual(room.game.history, {});
  assert.equal(room.game.currentRound, 1);
  assert.equal(room.game.gameComplete, false);
});

test("startGame refuses to run again while a game is genuinely still in progress", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  assert.throws(() => game.startGame(room), /already started/);
});


test("debugAdvancePhase steps through the phase machine in order", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  const expectedOrder = ["writing_prompts", "judging", "revealing_results", "round_complete"];
  for (const expected of expectedOrder) {
    game.debugAdvancePhase(room);
    assert.equal(room.game.phase, expected);
  }
});

test("debugAdvancePhase past round_complete starts the next round with the next writer", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  const firstWriter = room.game.scenarioWriterId;
  for (let i = 0; i < 4; i++) game.debugAdvancePhase(room); // -> round_complete
  game.debugAdvancePhase(room); // -> should roll into round 2

  assert.equal(room.game.currentRound, 2);
  assert.equal(room.game.phase, "waiting_for_scenario");
  // Round-robin: round 2 must use the OTHER player, not repeat round 1's
  // writer — round 1's writer shouldn't get a 2nd turn until round 3.
  assert.notEqual(room.game.scenarioWriterId, firstWriter);
});

test("submitScenario moves phase to writing_prompts and stores truncated text", () => {
  const room = makeRoom(["Alice", "Bob"], "blitz"); // blitz char limit is 100
  game.startGame(room);
  const longText = "x".repeat(500);

  game.submitScenario(room, longText);

  assert.equal(room.game.phase, "writing_prompts");
  assert.equal(room.game.currentScenario.length, 100);
});

test("submitScenario rejects when not in waiting_for_scenario", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  assert.throws(() => game.submitScenario(room, "Another one"), /Not currently accepting/);
});

test("submitStrategy records text and reports when everyone's in", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");

  const afterFirst = game.submitStrategy(room, "p0", "hide");
  assert.equal(afterFirst, false);
  const afterSecond = game.submitStrategy(room, "p1", "run");
  assert.equal(afterSecond, false);
  const afterThird = game.submitStrategy(room, "p2", "fight");
  assert.equal(afterThird, true);

  assert.deepEqual(room.game.submissions, { p0: "hide", p1: "run", p2: "fight" });
});

test("submitStrategy rejects a second submission from the same player", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  game.submitStrategy(room, "p0", "hide");
  assert.throws(() => game.submitStrategy(room, "p0", "hide again"), /already submitted/);
});

test("submitStrategy rejects a disconnected/inactive player", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  room.players.find((p) => p.id === "p1").connected = false;
  assert.throws(() => game.submitStrategy(room, "p1", "hide"), /not an active player/);
});

test("finalizeStrategyPhase fills in empty strings for anyone who never submitted", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  game.submitStrategy(room, "p0", "hide");
  // p1, p2 never submit — timer (or a disconnect check) runs out.
  game.finalizeStrategyPhase(room);

  assert.equal(room.game.phase, "judging");
  assert.deepEqual(room.game.submissions, { p0: "hide", p1: "", p2: "" });
});

test("handleStrategyPhaseDisconnect finalizes early once everyone remaining has submitted", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  game.submitStrategy(room, "p0", "hide");
  game.submitStrategy(room, "p1", "run");
  // p2 never submits, but disconnects — p0 and p1 (the only ones still
  // active) have both already submitted, so this should finalize now
  // rather than waiting out the timer.
  room.players.find((p) => p.id === "p2").connected = false;

  const changed = game.handleStrategyPhaseDisconnect(room);
  assert.equal(changed, true);
  assert.equal(room.game.phase, "judging");
});

test("handleStrategyPhaseDisconnect is a no-op if someone active still hasn't submitted", () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  game.submitStrategy(room, "p0", "hide");
  // p1 disconnects, but p2 (still active) hasn't submitted yet.
  room.players.find((p) => p.id === "p1").connected = false;

  const changed = game.handleStrategyPhaseDisconnect(room);
  assert.equal(changed, false);
  assert.equal(room.game.phase, "writing_prompts");
});

test("armScenarioTimer falls back to a preset scenario if nobody submits in time", async () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  let broadcastCount = 0;

  game.armScenarioTimer(room, () => broadcastCount++, 100);
  assert.equal(room.game.phase, "waiting_for_scenario"); // not yet — timer hasn't fired

  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.equal(room.game.phase, "writing_prompts");
  assert.ok(room.game.currentScenario.length > 0);
  assert.equal(broadcastCount, 1);
  // The fallback path should also have armed the strategy timer.
  assert.ok(room.game.strategyDeadline > Date.now());
  game.clearStrategyTimer(room); // it's a real (unmocked) 45s timer — don't leak it
});

test("armScenarioTimer does nothing if a real scenario was submitted before it fires", async () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  let broadcastCount = 0;

  game.armScenarioTimer(room, () => broadcastCount++, 100);
  game.submitScenario(room, "A real scenario, not a fallback");

  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.equal(room.game.currentScenario, "A real scenario, not a fallback");
  assert.equal(broadcastCount, 0); // timer should have been cleared, never fired
});

test("submission text is hidden during writing_prompts but revealed once judging starts", () => {
  const room = makeRoom(["Alice", "Bob"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  game.submitStrategy(room, "p0", "hide under the table");

  let serialized = game.serializeGame(room);
  assert.equal(serialized.submissions, null);
  assert.deepEqual(serialized.submittedPlayerIds, ["p0"]);

  const allSubmitted = game.submitStrategy(room, "p1", "run away");
  if (allSubmitted) game.finalizeStrategyPhase(room);
  serialized = game.serializeGame(room);
  assert.equal(serialized.phase, "judging");
  assert.deepEqual(serialized.submissions, { p0: "hide under the table", p1: "run away" });
});
test("armStrategyTimer finalizes with empty strings for stragglers if time runs out", async () => {
  const room = makeRoom(["Alice", "Bob", "Carol"]);
  game.startGame(room);
  game.submitScenario(room, "A scenario");
  game.submitStrategy(room, "p0", "hide");
  let broadcastCount = 0;

  game.armStrategyTimer(room, () => broadcastCount++, 100);
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.equal(room.game.phase, "judging");
  assert.deepEqual(room.game.submissions, { p0: "hide", p1: "", p2: "" });
  assert.equal(broadcastCount, 1);
});
