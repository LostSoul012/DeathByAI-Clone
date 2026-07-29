const { io } = require("socket.io-client");
const { createMockGroqServer } = require("./test-mock-groq-server");

const URL = "http://localhost:3001";
let pass = 0;
let fail = 0;

function check(label, condition) {
  if (condition) {
    console.log(`PASS: ${label}`);
    pass++;
  } else {
    console.log(`FAIL: ${label}`);
    fail++;
  }
}

function waitForConnect(socket) {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve) => socket.once("connect", resolve));
}

function waitForRoomUpdate(socket, predicate, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room_updated", handler);
      reject(new Error("waitForRoomUpdate timed out"));
    }, timeoutMs);
    function handler(room) {
      if (predicate(room)) {
        clearTimeout(timer);
        socket.off("room_updated", handler);
        resolve(room);
      }
    }
    socket.on("room_updated", handler);
  });
}

const mkResponse = (usernames, survivorUsername) =>
  JSON.stringify(
    usernames.map((username) => ({
      username,
      survived: username === survivorUsername,
      story: `${username}'s round played out dramatically.`,
      score: 5,
    }))
  );

async function run() {
  const MOCK_PORT = process.env.MOCK_GROQ_PORT || 4572;
  const mock = createMockGroqServer();
  await mock.listen(MOCK_PORT);

  const host = io(URL, { transports: ["websocket"] });
  const p2 = io(URL, { transports: ["websocket"] });
  const sockets = [host, p2];
  await Promise.all(sockets.map(waitForConnect));

  const room = await new Promise((resolve) => {
    host.emit("create_room", { username: "Alice", avatarId: "a" });
    host.once("room_created", resolve);
  });
  await new Promise((resolve) => {
    p2.emit("join_room", { roomCode: room.code, username: "Bob", avatarId: "a" });
    p2.once("room_joined", resolve);
  });

  host.emit("start_game");
  let state = await waitForRoomUpdate(host, (r) => r.game?.started === true);
  check(
    "game started with standings all zero",
    state.game.standings.every((s) => s.survivalCount === 0)
  );

  // --- helper to play exactly one round through to revealing_results ---
  async function playRound(survivorUsername) {
    const writerId = state.game.scenarioWriterId;
    const writerSocket = sockets.find((s) => s.id === writerId);
    const others = sockets.filter((s) => s.id !== writerId);

    const toWriting = waitForRoomUpdate(others[0], (r) => r.game.phase === "writing_prompts");
    writerSocket.emit("submit_scenario", { scenarioText: "A generic peril" });
    await toWriting;

    mock.queueSuccess(mkResponse(["Alice", "Bob"], survivorUsername));

    const toRevealing = waitForRoomUpdate(host, (r) => r.game.phase === "revealing_results");
    sockets.forEach((s) => s.emit("submit_strategy", { strategyText: "do something" }));
    state = await toRevealing;
  }

  await playRound("Alice");
  check(
    "round 1 history recorded for both players",
    state.game.standings.every((s) => s.roundHistory.length === 1)
  );
  check(
    "Alice has 1 survival after round 1",
    state.game.standings.find((s) => s.username === "Alice").survivalCount === 1
  );
  check(
    "Bob has 0 survivals after round 1",
    state.game.standings.find((s) => s.username === "Bob").survivalCount === 0
  );

  // --- non-host cannot continue ---
  const notHostErr = await new Promise((resolve) => {
    p2.emit("continue_after_round");
    p2.once("error_event", resolve);
  });
  check("non-host blocked from continuing", notHostErr.type === "not_host");

  // --- host continues to round 2 ---
  const round2Promise = waitForRoomUpdate(host, (r) => r.game.currentRound === 2);
  host.emit("continue_after_round");
  state = await round2Promise;
  check("continue_after_round advances to round 2", state.game.currentRound === 2);
  check("phase resets to waiting_for_scenario", state.game.phase === "waiting_for_scenario");
  check(
    "standings persist across the round transition",
    state.game.standings.find((s) => s.username === "Alice").survivalCount === 1
  );

  // --- can't continue again immediately (not in revealing_results) ---
  const tooSoonErr = await new Promise((resolve) => {
    host.emit("continue_after_round");
    host.once("error_event", resolve);
  });
  check("continue rejected when not in revealing_results", tooSoonErr.type === "cannot_continue");

  await playRound("Bob");
  check(
    "round 2 history recorded (2 rounds each now)",
    state.game.standings.every((s) => s.roundHistory.length === 2)
  );
  check(
    "Alice and Bob tied 1-1 after 2 rounds, both rank 1",
    state.game.standings.every((s) => s.rank === 1)
  );

  // --- play through the remaining rounds (judgement_day = 5 total) ---
  const r3 = waitForRoomUpdate(host, (r) => r.game.currentRound === 3);
  host.emit("continue_after_round");
  state = await r3;
  await playRound("Alice");

  const r4 = waitForRoomUpdate(host, (r) => r.game.currentRound === 4);
  host.emit("continue_after_round");
  state = await r4;
  await playRound("Alice");

  const r5 = waitForRoomUpdate(host, (r) => r.game.currentRound === 5);
  host.emit("continue_after_round");
  state = await r5;
  await playRound("Alice");

  // --- final continue should mark the game complete, not start round 6 ---
  const completePromise = waitForRoomUpdate(host, (r) => r.game.gameComplete === true);
  host.emit("continue_after_round");
  state = await completePromise;
  check("game marked complete after the 5th round's continue", state.game.gameComplete === true);
  check(
    "Alice wins outright with 4 survivals to Bob's 1",
    state.game.standings.find((s) => s.username === "Alice").survivalCount === 4 &&
      state.game.standings.find((s) => s.username === "Bob").survivalCount === 1
  );
  check(
    "Alice ranked 1, Bob ranked 2 (no tie this time)",
    state.game.standings.find((s) => s.username === "Alice").rank === 1 &&
      state.game.standings.find((s) => s.username === "Bob").rank === 2
  );

  // --- Play Again (reuses start_game) resets everything but keeps players ---
  const playAgainPromise = waitForRoomUpdate(host, (r) => r.game.currentRound === 1 && !r.game.gameComplete);
  host.emit("start_game");
  state = await playAgainPromise;
  check("Play Again resets to round 1", state.game.currentRound === 1);
  check("Play Again clears gameComplete", state.game.gameComplete === false);
  check("Play Again clears standings", state.game.standings.every((s) => s.survivalCount === 0));
  check("Play Again keeps both players in the room", state.players.length === 2);

  await mock.close();
  sockets.forEach((s) => s.disconnect());
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
