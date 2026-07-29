import { useEffect, useRef, useState } from "react";
import FateSealedScreen from "../FateSealedScreen";
import PlayerRevealCard from "./PlayerRevealCard";
import StandingsScreen from "../StandingsScreen";
import { splitSentences } from "../../utils/sentences";

const FATE_SEALED_DURATION_MS = 2400;

// judging -> "Your Fate Has Been Sealed" -> one PlayerRevealCard per active
// player, in order -> Standings. Resets itself once per round (keyed off
// currentRound) rather than on every re-render.
//
// The player-by-player verdict reveal is host-paced: room.game.revealCursor
// is a single server-synced counter of how many "Continue" / "Next Player"
// clicks the host has made since this round's results came in. Every
// client derives the same (playerIndex, sentencesShown) pair from that one
// counter plus each player's sentence-split story below. Because the
// counter only ever changes in response to a broadcast the whole room
// receives together, the reveal can't drift out of sync the way
// independent per-client timers used to — there's nothing left to drift,
// since nobody is running their own clock for it anymore.
export default function RevealSequence({ room, me, onContinue, onRevealContinue }) {
  const [stage, setStage] = useState("fate-sealed"); // "fate-sealed" | "players"
  const seenRoundRef = useRef(null);

  useEffect(() => {
    if (seenRoundRef.current !== room.game.currentRound) {
      seenRoundRef.current = room.game.currentRound;
      setStage("fate-sealed");
    }
  }, [room.game.currentRound]);

  useEffect(() => {
    if (stage !== "fate-sealed") return undefined;
    const timer = setTimeout(() => setStage("players"), FATE_SEALED_DURATION_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  if (stage === "fate-sealed") {
    return <FateSealedScreen />;
  }

  const results = room.game.results ?? [];
  const revealCursor = room.game.revealCursor ?? 0;

  // Walk the cumulative per-player sentence counts to find which player
  // revealCursor currently points at, and how many of their sentences
  // have been shown so far. Every player "costs" exactly
  // sentenceCount clicks to fully pass through: one click per sentence
  // after the first (which shows automatically), plus one more to move
  // on to the next player — see StoryCard for the matching client-side
  // sentence-by-sentence reveal and button labeling.
  let playerIndex = 0;
  let sentencesShown = 0;
  let cursorRemaining = revealCursor;
  for (; playerIndex < results.length; playerIndex++) {
    const total = Math.max(splitSentences(results[playerIndex].story).length, 1);
    if (cursorRemaining < total) {
      sentencesShown = cursorRemaining + 1;
      break;
    }
    cursorRemaining -= total;
  }

  if (playerIndex >= results.length) {
    return <StandingsScreen room={room} isHost={Boolean(me?.isHost)} onContinue={onContinue} />;
  }

  const currentResult = results[playerIndex];
  const player = room.players.find((p) => p.username === currentResult.username);
  const strategy = player && room.game.submissions ? room.game.submissions[player.id] : "";

  if (!player) {
    // Shouldn't happen — judgeRound only judges active players who exist
    // in room.players — but skip gracefully rather than crash if it does.
    return null;
  }

  return (
    <PlayerRevealCard
      key={currentResult.username}
      player={player}
      strategy={strategy}
      result={currentResult}
      playerIndex={playerIndex}
      totalPlayers={results.length}
      sentencesShown={sentencesShown}
      isHost={Boolean(me?.isHost)}
      onRevealContinue={onRevealContinue}
    />
  );
}
