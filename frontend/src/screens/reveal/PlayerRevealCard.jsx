import { useState } from "react";
import SwirlBackground from "../../components/SwirlBackground";
import BoardCard from "./BoardCard";
import StoryCard from "./StoryCard";

// One player's reveal: board flip-in first, then the verdict-reader
// narration. Both stages share the same dark ambient theme now (the board
// stage used to break to a light theme here — "stepping into the
// aftermath" — but that clashed with the rest of the app, per feedback).
// The board itself stays a light physical card/prop the robot holds, same
// as before — only the ambient background behind it changed. The board
// flip is still a quick, purely local animation; the verdict narration
// itself is host-paced (see StoryCard/RevealSequence).
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
      <SwirlBackground theme="black">
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
