import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import Avatar from "../components/Avatar";
import { getAvatarById } from "../data/avatars";
import "./GroupOutcomeScreen.css";

// All-or-Nothing's dedicated end screen — everyone shares one outcome, so
// a ranked leaderboard (Standings/PodiumWinnerScreen) doesn't make sense
// here; there's nothing to rank. This gets rendered from two places for
// the exact same room state, seamlessly:
//   1. RevealSequence, once the shared story finishes — room.game.
//      gameComplete is still false here, so the button below reads
//      "Continue" and calls onContinue (the same continue_after_round
//      handler used everywhere else), which finalizes the round.
//   2. GameScreen's top-level gameComplete check, once that finalization
//      lands — same screen, same props shape, but now gameComplete is
//      true, so the button switches to "Play Again" / onPlayAgain,
//      matching PodiumWinnerScreen's pattern exactly.
// Same component both times, so there's no visual jump between them.
export default function GroupOutcomeScreen({ room, isHost, onContinue, onPlayAgain }) {
  const results = room.game.results ?? [];
  const survived = results.length > 0 && results.every((r) => r.survived);
  const isFinal = Boolean(room.game.gameComplete);

  return (
    <SwirlBackground theme="black">
      <div className={`group-outcome-screen ${survived ? "is-survived" : "is-perished"}`}>
        <span className="group-outcome-label mono">// FINAL VERDICT</span>
        <h1 className="group-outcome-heading display">
          {survived ? "You All Survived!" : "You All Perished…"}
        </h1>
        <p className="group-outcome-subtext">
          {survived
            ? "Everyone pulled their weight. Nobody got left behind."
            : "One weak link was all it took to bring the whole group down."}
        </p>

        <motion.div
          className="group-outcome-avatars"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {room.players.map((p) => (
            <div key={p.id} className="group-outcome-avatar">
              <Avatar {...getAvatarById(p.avatarId)} size={52} />
              <span className="group-outcome-name">{p.username}</span>
            </div>
          ))}
        </motion.div>

        {isHost ? (
          <button
            type="button"
            className="btn btn-primary group-outcome-btn"
            onClick={isFinal ? onPlayAgain : onContinue}
          >
            {isFinal ? "Play Again" : "Continue"}
          </button>
        ) : (
          <p className="group-outcome-waiting mono">
            {isFinal ? "waiting for host to start a new game…" : "waiting for host to continue…"}
          </p>
        )}
      </div>
    </SwirlBackground>
  );
}
