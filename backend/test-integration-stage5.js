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

const VALID_JUDGE_RESPONSE = (usernames) =>
  JSON.stringify(
    usernames.map((username, i) => ({
      username,
      survived: i % 2 === 0,
      story: `${username}'s fate was sealed in dramatic fashion.`,
      score: 5 + i,
    }))
  );

async function run() {
  // NOTE: this test assumes the server (server.js) was started with
  // GROQ_API_KEY and GROQ_API_BASE_URL pointed at the mock server on
  // MOCK_PORT — see the shell commands in the README / package.json.
  const MOCK_PORT = process.env.MOCK_GROQ_PORT || 4570;
  const mock = createMockGroqServer();
  await mock.listen(MOCK_PORT);

  const host = io(URL, { transports: ["websocket"] });
  const p2 = io(URL, { transports: ["websocket"] });
  const p3 = io(URL, { transports: ["websocket"] });
  const sockets = [host, p2, p3];
  await Promise.all(sockets.map(waitForConnect));

  const room = await new Promise((resolve) => {
    host.emit("create_room", { username: "Alice", avatarId: "a" });
    host.once("room_created", resolve);
  });
  for (const [i, s] of [p2, p3].entries()) {
    await new Promise((resolve) => {
      s.emit("join_room", { roomCode: room.code, username: ["Bob", "Carol"][i], avatarId: "a" });
      s.once("room_joined", resolve);
    });
  }

  host.emit("start_game");
  const started = await waitForRoomUpdate(host, (r) => r.game?.started === true);

  const writerSocket = sockets.find((s) => s.id === started.game.scenarioWriterId);
  const nonWriters = sockets.filter((s) => s.id !== started.game.scenarioWriterId);

  const scenarioPromise = waitForRoomUpdate(nonWriters[0], (r) => r.game.phase === "writing_prompts");
  writerSocket.emit("submit_scenario", { scenarioText: "A meteor is approaching fast" });
  await scenarioPromise;

  // --- queue a valid mock Groq response, then have everyone submit ---
  mock.queueSuccess(VALID_JUDGE_RESPONSE(["Alice", "Bob", "Carol"]));

  const judgingPromise = waitForRoomUpdate(host, (r) => r.game.phase === "judging");
  const revealingPromise = waitForRoomUpdate(host, (r) => r.game.phase === "revealing_results");

  sockets[0].emit("submit_strategy", { strategyText: "run" });
  sockets[1].emit("submit_strategy", { strategyText: "hide" });
  sockets[2].emit("submit_strategy", { strategyText: "pray" });

  const judgingState = await judgingPromise;
  check("all submitted -> phase becomes judging", judgingState.game.phase === "judging");

  const revealed = await revealingPromise;
  check("judging resolves to revealing_results", revealed.game.phase === "revealing_results");
  check("results has one entry per player", revealed.game.results.length === 3);
  check(
    "results include the real mock Groq content, not the fallback",
    revealed.game.results.every((r) => r.story.includes("dramatic fashion"))
  );
  check(
    "survived pattern matches what the mock returned",
    revealed.game.results.find((r) => r.username === "Alice").survived === true &&
      revealed.game.results.find((r) => r.username === "Bob").survived === false
  );
  check("mock server received exactly one request (no retry needed)", mock.getRequestLog().length === 1);

  const req = mock.getRequestLog()[0];
  check("request included the AI personality's judge system prompt", req.messages[0].role === "system");
  check(
    "request's user prompt includes all three players' strategies",
    ["run", "hide", "pray"].every((s) => req.messages[1].content.includes(s))
  );

  await mock.close();
  sockets.forEach((s) => s.disconnect());
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
