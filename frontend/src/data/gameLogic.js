// Mirrors backend/game.js's isPlayerActive — connected, and (Elimination
// mode only) not eliminated. Used for "X/Y submitted" style progress
// displays; doesn't affect anything server-authoritative.
export function isPlayerActive(room, player) {
  if (!player.connected) return false;
  if (room.gameMode === "elimination" && player.eliminated) return false;
  return true;
}

export function getActivePlayers(room) {
  return room.players.filter((p) => isPlayerActive(room, p));
}
