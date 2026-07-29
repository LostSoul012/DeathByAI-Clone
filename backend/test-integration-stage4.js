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

function waitForRoomUpdate(socket, predicate, timeoutMs = 20000) {
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

async function setUpStartedGame(sockets, usernames, gameModeEmit) {
  const [host, ...others] = sockets;
  await Promise.all(sockets.map(waitForConnect));

  const room = await new Promise((resolve) => {
    host.emit("create_room", { username: usernames[0], avatarId: "a" });
    host.once("room_created", resolve);
  });
  for (let i = 0; i < others.length; i++) {
    await new Promise((resolve) => {
      others[i].emit("join_room", { roomCode: room.code, username: usernames[i + 1], avatarId: "a" });
      others[i].once("room_joined", resolve);
    });
  }
  if (gameModeEmit) {
    await new Promise((resolve) => {
      host.once("room_updated", resolve);
      host.emit("set_game_mode", { gameMode: gameModeEmit });
    });
  }
  host.emit("start_game");
  const started = await waitForRoomUpdate(host, (r) => r.game?.started === true);
  return { roomCode: room.code, started };
}

async function run() {
  // --- Part 1: normal submission flow (judgement_day defaults) ---
  {
    const host = io(URL, { transports: ["websocket"] });
    const p2 = io(URL, { transports: ["websocket"] });
    const p3 = io(URL, { transports: ["websocket"] });
    const sockets = [host, p2, p3];

    const { started } = await setUpStartedGame(sockets, ["Alice", "Bob", "Carol"]);
    const writerId = started.game.scenarioWriterId;
    const writerSocket = sockets.find((s) => s.id === writerId);
    const nonWriterSockets = sockets.filter((s) => s.id !== writerId);

    // --- non-writer can't submit a scenario ---
    const notWriterErr = await new Promise((resolve) => {
      nonWriterSockets[0].emit("submit_scenario", { scenarioText: "Sneaky scenario" });
      nonWriterSockets[0].once("error_event", resolve);
    });
    check("non-writer blocked from submitting a scenario", notWriterErr.type === "not_scenario_writer");

    // --- writer submits, everyone moves to writing_prompts ---
    const scenarioPromise = waitForRoomUpdate(nonWriterSockets[1], (r) => r.game.phase === "writing_prompts");
    writerSocket.emit("submit_scenario", { scenarioText: "You are stuck in a broken elevator" });
    const afterScenario = await scenarioPromise;
    check("scenario submission broadcasts to all players", afterScenario.game.phase === "writing_prompts");
    check("scenario text stored correctly", afterScenario.game.currentScenario === "You are stuck in a broken elevator");
    check("strategy deadline is set", typeof afterScenario.game.strategyDeadline === "number");

    // --- strategies submit one at a time, room_updated tracks progress ---
    const p1 = waitForRoomUpdate(host, (r) => r.game.submittedPlayerIds.length === 1);
    sockets[0].emit("submit_strategy", { strategyText: "pry the doors open" });
    const after1 = await p1;
    check("1/3 submitted tracked", after1.game.submittedPlayerIds.length === 1);
    check("still in writing_prompts with 1/3 in", after1.game.phase === "writing_prompts");

    const p2wait = waitForRoomUpdate(host, (r) => r.game.submittedPlayerIds.length === 2);
    sockets[1].emit("submit_strategy", { strategyText: "call for help" });
    const after2 = await p2wait;
    check("2/3 submitted tracked", after2.game.submittedPlayerIds.length === 2);

    // --- can't submit twice ---
    const dupErr = await new Promise((resolve) => {
      sockets[0].emit("submit_strategy", { strategyText: "again" });
      sockets[0].once("error_event", resolve);
    });
    check("duplicate strategy submission rejected", dupErr.type === "cannot_submit_strategy");

    // --- last submission moves straight to judging, no waiting for timer ---
    const p3wait = waitForRoomUpdate(host, (r) => r.game.phase === "judging");
    sockets[2].emit("submit_strategy", { strategyText: "climb out the hatch" });
    const after3 = await p3wait;
    check("all 3 submitted moves to judging immediately", after3.game.phase === "judging");
    check("submissions all recorded", after3.game.submittedPlayerIds.length === 3);

    sockets.forEach((s) => s.disconnect());
  }

  // --- Part 2: disconnect during writing_prompts finalizes early ---
  {
    const host = io(URL, { transports: ["websocket"] });
    const p2 = io(URL, { transports: ["websocket"] });
    const p3 = io(URL, { transports: ["websocket"] });
    const sockets = [host, p2, p3];

    const { started } = await setUpStartedGame(sockets, ["Dee", "Eli", "Fay"]);
    const writerSocket = sockets.find((s) => s.id === started.game.scenarioWriterId);
    const others = sockets.filter((s) => s.id !== started.game.scenarioWriterId);

    const scenarioSubmittedPromise = waitForRoomUpdate(others[0], (r) => r.game.phase === "writing_prompts");
    writerSocket.emit("submit_scenario", { scenarioText: "A meteor is approaching" });
    await scenarioSubmittedPromise;

    // The writer also writes a strategy for their own scenario — everyone
    // active does, including the writer.
    const afterWriterStrategy = waitForRoomUpdate(host, (r) => r.game.submittedPlayerIds.length === 1);
    writerSocket.emit("submit_strategy", { strategyText: "pray" });
    await afterWriterStrategy;

    const afterOthersStrategy = waitForRoomUpdate(host, (r) => r.game.submittedPlayerIds.length === 2);
    others[0].emit("submit_strategy", { strategyText: "dig a bunker" });
    await afterOthersStrategy;

    // The one remaining non-submitter disconnects — the room now has 2
    // active players (writer + others[0]) and both have submitted, so this
    // should finalize immediately rather than waiting out the timer.
    const finalizedPromise = waitForRoomUpdate(host, (r) => r.game.phase === "judging");
    others[1].disconnect();
    const finalized = await finalizedPromise;
    check(
      "disconnect of the last non-submitter finalizes the round early",
      finalized.game.phase === "judging"
    );

    [host, p2].forEach((s) => s.connected && s.disconnect());
  }

  // --- Part 3: real (unmocked) timer fallback, using Blitz mode's 15s scenario timer ---
  {
    const host = io(URL, { transports: ["websocket"] });
    const p2 = io(URL, { transports: ["websocket"] });
    const sockets = [host, p2];

    console.log("(waiting out a real 15s Blitz-mode scenario timer — this part is slow on purpose)");
    const { started } = await setUpStartedGame(sockets, ["Gus", "Hana"], "blitz");
    check("blitz mode has an 18s-or-less scenario deadline", started.game.scenarioDeadline - Date.now() <= 15000);

    // Nobody submits a scenario — wait for the real fallback to fire.
    const fallenBack = await waitForRoomUpdate(host, (r) => r.game.phase === "writing_prompts", 20000);
    check("real scenario timer fallback fired and moved to writing_prompts", fallenBack.game.phase === "writing_prompts");
    check("a fallback scenario was filled in", fallenBack.game.currentScenario.length > 0);

    sockets.forEach((s) => s.disconnect());
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
