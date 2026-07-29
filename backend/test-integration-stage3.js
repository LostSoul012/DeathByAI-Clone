const { io } = require("socket.io-client");

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

// Waits for a room_updated broadcast matching `predicate`, ignoring any
// unrelated ones that arrive first — more robust than a bare .once() when
// several broadcasts could plausibly land close together.
function waitForRoomUpdate(socket, predicate, timeoutMs = 5000) {
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

function createAndJoin(host, others, usernames) {
  return new Promise(async (resolve) => {
    host.emit("create_room", { username: usernames[0], avatarId: "a" });
    host.once("room_created", async (room) => {
      for (let i = 0; i < others.length; i++) {
        await new Promise((res) => {
          others[i].emit("join_room", {
            roomCode: room.code,
            username: usernames[i + 1],
            avatarId: "a",
          });
          others[i].once("room_joined", res);
        });
      }
      resolve(room.code);
    });
  });
}

async function run() {
  const host = io(URL, { transports: ["websocket"] });
  const p2 = io(URL, { transports: ["websocket"] });
  const p3 = io(URL, { transports: ["websocket"] });
  await Promise.all([waitForConnect(host), waitForConnect(p2), waitForConnect(p3)]);

  const roomCode = await createAndJoin(host, [p2, p3], ["Alice", "Bob", "Carol"]);

  // --- non-host cannot start ---
  const notHostErr = await new Promise((resolve) => {
    p2.emit("start_game");
    p2.once("error_event", resolve);
  });
  check("non-host blocked from starting the game", notHostErr.type === "not_host");

  // --- host starts the game ---
  host.emit("start_game");
  const started = await waitForRoomUpdate(host, (r) => r.game?.started === true);
  check("game started", started.game?.started === true);
  check("round 1", started.game?.currentRound === 1);
  check("phase is waiting_for_scenario", started.game?.phase === "waiting_for_scenario");
  check(
    "a scenario writer was assigned from among the 3 players",
    ["Alice", "Bob", "Carol"].some((name) => {
      const p = started.players.find((pl) => pl.username === name);
      return p && p.id === started.game.scenarioWriterId;
    })
  );
  check("judgement_day mode -> 5 total rounds", started.game?.totalRounds === 5);

  // --- can't start twice ---
  const alreadyStartedErr = await new Promise((resolve) => {
    host.emit("start_game");
    host.once("error_event", resolve);
  });
  check("starting an already-started game is rejected", alreadyStartedErr.type === "cannot_start");

  // --- debug_advance_phase steps the machine, broadcasts to everyone ---
  // p3 should get the broadcast even though host is the one triggering it.
  const p3AdvancedPromise = waitForRoomUpdate(p3, (r) => r.game?.phase === "writing_prompts");
  host.emit("debug_advance_phase");
  const advanced = await p3AdvancedPromise;
  check("phase advanced to writing_prompts and broadcast to all players", advanced.game?.phase === "writing_prompts");

  // --- disconnecting the CURRENT scenario writer reassigns it live ---
  // Walk phases forward to round 2's waiting_for_scenario. Since Stage 5,
  // landing on "judging" triggers a REAL judgeRound() call — with no
  // GROQ_API_KEY set in this test environment, that fails fast and falls
  // back automatically, so revealing_results arrives on its own rather
  // than needing another debug_advance_phase to force it. Register BOTH
  // waiters before emitting/awaiting either — the fallback can be fast
  // enough that judging and revealing_results land back-to-back, and
  // setting up revealingPromise only after judgingPromise resolves left a
  // real gap where that second broadcast could be missed entirely.
  const judgingPromise = waitForRoomUpdate(host, (r) => r.game?.phase === "judging");
  const revealingPromise = waitForRoomUpdate(host, (r) => r.game?.phase === "revealing_results", 8000);
  host.emit("debug_advance_phase"); // writing_prompts -> judging
  await judgingPromise;
  const revealed = await revealingPromise; // fires on its own via the fallback path
  check("judging automatically falls back to revealing_results (no API key in tests)", revealed.game.results?.length > 0);
  check("fallback results give everyone the benefit of the doubt", revealed.game.results.every((r) => r.survived === true));

  const roundCompletePromise = waitForRoomUpdate(host, (r) => r.game?.phase === "round_complete");
  host.emit("debug_advance_phase"); // revealing_results -> round_complete
  let freshRoundState = await roundCompletePromise;

  const round2Promise = waitForRoomUpdate(host, (r) => r.game?.currentRound === 2);
  host.emit("debug_advance_phase");
  freshRoundState = await round2Promise;

  check("rolled into round 2", freshRoundState.game?.currentRound === 2);
  check("round 2 starts at waiting_for_scenario", freshRoundState.game?.phase === "waiting_for_scenario");

  const writerId = freshRoundState.game.scenarioWriterId;
  const writerSocket = [host, p2, p3].find((s) => s.id === writerId);

  if (writerSocket && writerSocket !== host) {
    const reassignedPromise = waitForRoomUpdate(host, (r) => r.game.scenarioWriterId !== writerId);
    writerSocket.disconnect();
    const reassigned = await reassignedPromise;
    check(
      "disconnecting the current writer reassigns to someone else, live",
      reassigned.game.scenarioWriterId !== writerId
    );
    check(
      "the newly assigned writer is still connected",
      reassigned.players.find((p) => p.id === reassigned.game.scenarioWriterId)?.connected === true
    );
  } else {
    console.log("SKIP: writer-disconnect-reassignment check (host happened to be the writer this run)");
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  [host, p2, p3].forEach((s) => s.connected && s.disconnect());
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
