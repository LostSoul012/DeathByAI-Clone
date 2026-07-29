import { useEffect, useRef, useState } from "react";
import FateSealedScreen from "../FateSealedScreen";
import PlayerRevealCard from "./PlayerRevealCard";
import StandingsScreen from "../StandingsScreen";

const FATE_SEALED_DURATION_MS = 2400;

// judging -> "Your Fate Has Been Sealed" -> one PlayerRevealCard per active
// player, in order -> Standings. Resets itself once per round (keyed off
// currentRound) rather than on every re-render.
export default function RevealSequence({ room, me, onContinue }) {
  const [stage, setStage] = useState("fate-sealed"); // "fate-sealed" | "players" | "standings"
  const [playerIndex, setPlayerIndex] = useState(0);
  const seenRoundRef = useRef(null);

  useEffect(() => {
    if (seenRoundRef.current !== room.game.currentRound) {
      seenRoundRef.current = room.game.currentRound;
      setStage("fate-sealed");
      setPlayerIndex(0);
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

  if (stage === "standings" || playerIndex >= results.length) {
    return <StandingsScreen room={room} isHost={Boolean(me?.isHost)} onContinue={onContinue} />;
  }

  const currentResult = results[playerIndex];
  const player = room.players.find((p) => p.username === currentResult.username);
  const strategy = player && room.game.submissions ? room.game.submissions[player.id] : "";

  if (!player) {
    // Shouldn't happen — judgeRound only judges active players who exist
    // in room.players — but skip gracefully rather than crash if it does.
    setPlayerIndex((i) => i + 1);
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
      onComplete={() => {
        if (playerIndex + 1 >= results.length) {
          setStage("standings");
        } else {
          setPlayerIndex((i) => i + 1);
        }
      }}
    />
  );
}
