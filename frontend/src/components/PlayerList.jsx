import { getAvatarById } from "../data/avatars";
import Avatar from "./Avatar";
import "./PlayerList.css";

const MAX_SLOTS = 8;

export default function PlayerList({ players }) {
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => players[i] ?? null);

  return (
    <ul className="player-list">
      {slots.map((player, i) => (
        <li key={player?.id ?? `empty-${i}`} className="player-slot">
          {player ? (
            <>
              <div className={`player-avatar ${player.connected ? "" : "player-avatar-disconnected"}`}>
                <Avatar {...getAvatarById(player.avatarId)} size={36} />
              </div>
              <span className="player-name">{player.username}</span>
              {player.isHost && (
                <span className="host-badge" title="Host">
                  ♛
                </span>
              )}
              {!player.connected && <span className="player-status mono">reconnecting…</span>}
            </>
          ) : (
            <span className="player-slot-empty mono">No Player</span>
          )}
        </li>
      ))}
    </ul>
  );
}
