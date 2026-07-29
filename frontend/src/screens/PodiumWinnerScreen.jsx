import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import Avatar from "../components/Avatar";
import { getAvatarById } from "../data/avatars";
import "./PodiumWinnerScreen.css";

// Groups standings by rank (ties share a rank, e.g. two players both
// ranked 1st) so co-winners genuinely share the podium block rather than
// one arbitrarily bumping the other to 2nd.
function groupByRank(standings) {
  const groups = [];
  for (const entry of standings) {
    let group = groups.find((g) => g.rank === entry.rank);
    if (!group) {
      group = { rank: entry.rank, players: [] };
      groups.push(group);
    }
    group.players.push(entry);
  }
  return groups;
}

function PodiumBlock({ group, place }) {
  if (!group) return <div className={`podium-block podium-block-${place} podium-block-empty`} />;
  return (
    <motion.div
      className={`podium-block podium-block-${place}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: place === 1 ? 0.3 : place === 2 ? 0.1 : 0.5 }}
    >
      <div className="podium-avatars">
        {group.players.map((p) => (
          <div key={p.playerId} className="podium-avatar">
            <Avatar {...getAvatarById(p.avatarId)} size={place === 1 ? 56 : 44} />
            <span className="podium-name">{p.username}</span>
          </div>
        ))}
      </div>
      <div className="podium-pillar">
        <span className="podium-place display">{place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}</span>
      </div>
    </motion.div>
  );
}

export default function PodiumWinnerScreen({ room, isHost, onPlayAgain }) {
  const groups = groupByRank(room.game.standings);
  const [first, second, third] = groups;
  const rest = groups.slice(3);

  return (
    <SwirlBackground theme="light">
      <div className="winner-screen">
        <h1 className="winner-heading display">
          {first?.players.length > 1 ? "It's a tie!" : "We have a survivor!"}
        </h1>

        <div className="podium">
          <PodiumBlock group={second} place={2} />
          <PodiumBlock group={first} place={1} />
          <PodiumBlock group={third} place={3} />
        </div>

        {rest.length > 0 && (
          <ul className="winner-rest">
            {rest.map((group) => (
              <li key={group.rank} className="winner-rest-row mono">
                #{group.rank} — {group.players.map((p) => p.username).join(", ")} ({group.players[0].survivalCount})
              </li>
            ))}
          </ul>
        )}

        {isHost ? (
          <button type="button" className="btn btn-primary winner-play-again" onClick={onPlayAgain}>
            Play Again
          </button>
        ) : (
          <p className="winner-waiting mono">waiting for host to start a new game…</p>
        )}
      </div>
    </SwirlBackground>
  );
}
