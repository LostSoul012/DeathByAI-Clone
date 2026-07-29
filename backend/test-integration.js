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

async function run() {
  const host = io(URL, { transports: ["websocket"] });
  const p2 = io(URL, { transports: ["websocket"] });
  const p3 = io(URL, { transports: ["websocket"] });

  await waitForConnect(host);

  // --- create room ---
  const room = await new Promise((resolve) => {
    host.emit("create_room", { username: "hostie", avatarId: "a1" });
    host.once("room_created", resolve);
  });
  check("room created with a 4-char code", room.code && room.code.length === 4);
  check("creator is host", room.players[0].isHost === true);
  check("default game mode is judgement_day", room.gameMode === "judgement_day");
  check("default personality is grim_reaper", room.aiPersonality === "grim_reaper");

  // --- second player joins ---
  await waitForConnect(p2);
  const joined = await new Promise((resolve) => {
    p2.emit("join_room", { roomCode: room.code, username: "playerTwo", avatarId: "a2" });
    p2.once("room_joined", resolve);
  });
  check("second player joined, room now has 2 players", joined.players.length === 2);

  // --- duplicate username rejected ---
  await waitForConnect(p3);
  const dupError = await new Promise((resolve) => {
    p3.emit("join_room", { roomCode: room.code, username: "hostie", avatarId: "a3" });
    p3.once("error_event", resolve);
  });
  check("duplicate username rejected", dupError.type === "username_taken");

  // --- non-host cannot change game mode ---
  const notHostError = await new Promise((resolve) => {
    p2.emit("set_game_mode", { gameMode: "blitz" });
    p2.once("error_event", resolve);
  });
  check("non-host blocked from changing game mode", notHostError.type === "not_host");

  // --- host CAN change game mode ---
  const modeUpdate = await new Promise((resolve) => {
    p2.once("room_updated", resolve); // p2 should get the broadcast
    host.emit("set_game_mode", { gameMode: "blitz" });
  });
  check("host changed game mode to blitz, broadcast to other player", modeUpdate.gameMode === "blitz");

  // --- invalid game mode rejected ---
  const invalidMode = await new Promise((resolve) => {
    host.emit("set_game_mode", { gameMode: "not_a_real_mode" });
    host.once("error_event", resolve);
  });
  check("invalid game mode rejected", invalidMode.type === "invalid_game_mode");

  // --- host disconnect triggers migration ---
  const migrationUpdate = await new Promise((resolve) => {
    p2.once("room_updated", resolve);
    host.disconnect();
  });
  check("host disconnect migrates host to remaining player", migrationUpdate.players.find(p => p.username === "playerTwo").isHost === true);
  check("old host marked disconnected", migrationUpdate.players.find(p => p.username === "hostie").connected === false);

  // --- room full ---
  const fillers = [];
  for (let i = 0; i < 7; i++) {
    const c = io(URL, { transports: ["websocket"] });
    await waitForConnect(c);
    await new Promise((resolve) => {
      c.emit("join_room", { roomCode: room.code, username: `filler${i}`, avatarId: "a" });
      c.once("room_joined", resolve);
    });
    fillers.push(c);
  }
  const p4 = io(URL, { transports: ["websocket"] });
  await waitForConnect(p4);
  const fullError = await new Promise((resolve) => {
    p4.emit("join_room", { roomCode: room.code, username: "oneTooMany", avatarId: "a" });
    p4.once("error_event", resolve);
  });
  check("9th player rejected, room full", fullError.type === "room_full");

  // --- room not found ---
  const notFoundError = await new Promise((resolve) => {
    p4.emit("join_room", { roomCode: "ZZZZ", username: "ghost", avatarId: "a" });
    p4.once("error_event", resolve);
  });
  check("joining nonexistent room rejected", notFoundError.type === "room_not_found");

  console.log(`\n${pass} passed, ${fail} failed`);
  [host, p2, p3, p4, ...fillers].forEach((s) => s.disconnect());
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
