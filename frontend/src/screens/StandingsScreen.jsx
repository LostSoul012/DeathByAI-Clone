import SwirlBackground from "../components/SwirlBackground";
import Avatar from "../components/Avatar";
import RoundHistoryIcons from "../components/RoundHistoryIcons";
import { getAvatarById } from "../data/avatars";
import "./StandingsScreen.css";

export default function StandingsScreen({ room, isHost, onContinue }) {
  const { standings, currentRound, totalRounds, roundCap } = room.game;

  let roundLabel;
  if (totalRounds) {
    roundLabel = `round ${currentRound}/${totalRounds}`;
  } else if (roundCap) {
    roundLabel = `round ${currentRound} / ${roundCap} max`;
  } else {
    roundLabel = `round ${currentRound}`;
  }

  return (
    <SwirlBackground theme="light">
      <div className="standings-screen">
        <h1 className="standings-heading display">Standings</h1>
        <p className="standings-round mono">{roundLabel}</p>

        <ul className="standings-list">
          {standings.map((entry) => (
            <li key={entry.playerId} className="standings-row">
              <Avatar {...getAvatarById(entry.avatarId)} size={52} />
              <span className="standings-name">
                {entry.username}
                {entry.eliminated && <span className="standings-out-tag mono">OUT</span>}
              </span>
              <RoundHistoryIcons roundHistory={entry.roundHistory} totalRounds={currentRound} />
              <span className="standings-count mono">{entry.survivalCount}</span>
            </li>
          ))}
        </ul>

        {isHost ? (
          <button type="button" className="btn btn-primary standings-continue" onClick={onContinue}>
            Continue ≫
          </button>
        ) : (
          <p className="standings-waiting mono">waiting for host to continue…</p>
        )}
      </div>
    </SwirlBackground>
  );
}
