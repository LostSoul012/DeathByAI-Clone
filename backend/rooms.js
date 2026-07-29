// rooms.js
// In-memory room state management for the Death by AI.
// Stage 1 scope: rooms + players only. No round/game logic yet.

const ROOM_CODE_LENGTH = 4;
// Uppercase alphanumeric, minus visually-ambiguous characters (0/O, 1/I).
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const MAX_PLAYERS_PER_ROOM = 8;
const EMPTY_ROOM_CLEANUP_MS = 5 * 60 * 1000; // 5 minutes

const VALID_GAME_MODES = ["judgement_day", "blitz", "elimination"];
const VALID_AI_PERSONALITIES = ["grim_reaper", "wholesome", "savage"];
const DEFAULT_GAME_MODE = "judgement_day";
const DEFAULT_AI_PERSONALITY = "grim_reaper";

// roomCode -> room object
const rooms = new Map();

function generateRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function generateUniqueRoomCode() {
  let code = generateRoomCode();
  // Regenerate on collision until we find a code that isn't in use.
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
}

function createRoom(hostSocketId, { username, avatarId }) {
  const code = generateUniqueRoomCode();

  const hostPlayer = {
    id: hostSocketId,
    username,
    avatarId,
    isHost: true,
    connected: true,
    eliminated: false,
  };

  const room = {
    code,
    players: [hostPlayer],
    gameMode: DEFAULT_GAME_MODE,
    aiPersonality: DEFAULT_AI_PERSONALITY,
    game: null,
    createdAt: Date.now(),
    emptyTimeout: null,
  };

  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code?.toUpperCase());
}

function isUsernameTaken(room, username) {
  return room.players.some(
    (p) => p.connected && p.username.toLowerCase() === username.toLowerCase()
  );
}

function addPlayerToRoom(room, socketId, { username, avatarId }) {
  const player = {
    id: socketId,
    username,
    avatarId,
    isHost: false,
    connected: true,
    eliminated: false,
  };
  room.players.push(player);
  clearEmptyRoomTimeout(room);
  return player;
}

function getPlayer(room, socketId) {
  return room.players.find((p) => p.id === socketId);
}

function getConnectedPlayers(room) {
  return room.players.filter((p) => p.connected);
}

// Finds the room a given socket currently belongs to (connected players only).
function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId && p.connected)) {
      return room;
    }
  }
  return null;
}

// Marks a player disconnected. If they were host, transfers host to the
// next connected player (by join/array order). Schedules room cleanup if
// the room is now empty. Returns { room, newHostId } so the caller can
// broadcast appropriately.
function handleDisconnect(socketId) {
  const room = findRoomBySocketId(socketId);
  if (!room) return null;

  const player = getPlayer(room, socketId);
  if (!player) return null;

  player.connected = false;
  let newHostId = null;

  if (player.isHost) {
    player.isHost = false;
    const nextHost = room.players.find((p) => p.connected);
    if (nextHost) {
      nextHost.isHost = true;
      newHostId = nextHost.id;
    }
  }

  const stillConnected = getConnectedPlayers(room);
  if (stillConnected.length === 0) {
    scheduleEmptyRoomCleanup(room);
  }

  return { room, newHostId };
}

function scheduleEmptyRoomCleanup(room) {
  clearEmptyRoomTimeout(room);
  room.emptyTimeout = setTimeout(() => {
    const stillEmpty = getConnectedPlayers(room).length === 0;
    if (stillEmpty) {
      rooms.delete(room.code);
    }
  }, EMPTY_ROOM_CLEANUP_MS);
}

function clearEmptyRoomTimeout(room) {
  if (room.emptyTimeout) {
    clearTimeout(room.emptyTimeout);
    room.emptyTimeout = null;
  }
}

function setGameMode(room, gameMode) {
  if (!VALID_GAME_MODES.includes(gameMode)) {
    throw new Error(`Invalid game mode: ${gameMode}`);
  }
  room.gameMode = gameMode;
}

function setAiPersonality(room, aiPersonality) {
  if (!VALID_AI_PERSONALITIES.includes(aiPersonality)) {
    throw new Error(`Invalid AI personality: ${aiPersonality}`);
  }
  room.aiPersonality = aiPersonality;
}

// Shape sent to clients - room object minus internal-only fields.
function serializeRoom(room) {
  // require() here (not top-level) to avoid a circular import — game.js
  // doesn't need anything from rooms.js, but keeping the dependency
  // one-directional at the top of the file is one less thing to trip over.
  const { serializeGame } = require("./game");
  return {
    code: room.code,
    players: room.players.map((p) => ({
      id: p.id,
      username: p.username,
      avatarId: p.avatarId,
      isHost: p.isHost,
      connected: p.connected,
      eliminated: p.eliminated,
    })),
    gameMode: room.gameMode,
    aiPersonality: room.aiPersonality,
    game: serializeGame(room),
  };
}

module.exports = {
  MAX_PLAYERS_PER_ROOM,
  VALID_GAME_MODES,
  VALID_AI_PERSONALITIES,
  createRoom,
  getRoom,
  isUsernameTaken,
  addPlayerToRoom,
  getPlayer,
  getConnectedPlayers,
  findRoomBySocketId,
  handleDisconnect,
  setGameMode,
  setAiPersonality,
  serializeRoom,
  rooms,
};
