import { useState } from "react";
import SwirlBackground from "../../components/SwirlBackground";
import BoardCard from "./BoardCard";
import StoryCard from "./StoryCard";

// One player's reveal: board flip-in first (light theme — "stepping into
// the aftermath"), then the verdict-reader narration (dark full-bleed
// stage — the AI judge delivering its verdict is a different, more
// dramatic beat than presenting the board, so it gets its own mood). The
// board flip is still a quick, purely local animation; the verdict
// narration itself is host-paced (see StoryCard/RevealSequence).
export default function PlayerRevealCard({
  player,
  strategy,
  result,
  playerIndex,
  totalPlayers,
  sentencesShown,
  isHost,
  onRevealContinue,
}) {
  const [stage, setStage] = useState("board"); // "board" | "story"

  if (stage === "board") {
    return (
      <SwirlBackground theme="light">
        <BoardCard username={player.username} strategy={strategy} onComplete={() => setStage("story")} />
      </SwirlBackground>
    );
  }

  return (
    <SwirlBackground theme="black">
      <StoryCard
        player={player}
        result={result}
        playerIndex={playerIndex}
        totalPlayers={totalPlayers}
        sentencesShown={sentencesShown}
        isHost={isHost}
        onRevealContinue={onRevealContinue}
      />
    </SwirlBackground>
  );
}
