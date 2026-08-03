import { useEffect, useRef, useState } from "react";
import ScenarioWriterScreen from "./ScenarioWriterScreen";
import ScenarioWaitingScreen from "./ScenarioWaitingScreen";
import TransitionSequence from "./TransitionSequence";
import StrategyWritingScreen from "./StrategyWritingScreen";
import JudgingScreen from "./JudgingScreen";
import RevealSequence from "./reveal/RevealSequence";
import PodiumWinnerScreen from "./PodiumWinnerScreen";
import GroupOutcomeScreen from "./GroupOutcomeScreen";
import SwirlBackground from "../components/SwirlBackground";

// round_complete has no real screen — normal play never actually lands
// here (see RevealSequence/StandingsScreen), it's only reachable via the
// debug_advance_phase test hook. Honest placeholder either way.
function NotYetBuiltScreen({ phase }) {
  return (
    <SwirlBackground theme="black">
      <div style={{ margin: "auto", textAlign: "center", padding: "2rem" }}>
        <p className="display" style={{ fontSize: "1.4rem" }}>
          Phase: {phase}
        </p>
        <p className="mono" style={{ color: "var(--swirl-fg-dim)", marginTop: "0.5rem" }}>
          Reached via the debug_advance_phase test hook — normal play doesn't land here.
        </p>
      </div>
    </SwirlBackground>
  );
}

export default function GameScreen({
  room,
  me,
  onSubmitScenario,
  onSubmitStrategy,
  onUpdateStrategyDraft,
  onContinueRound,
  onRevealContinue,
  onPlayAgain,
}) {
  const { phase, currentRound, currentScenario, scenarioWriterId, gameComplete } = room.game;

  // Show the "Scenario Incoming! / Prompt: ..." beat exactly once per
  // round, the moment that round's phase first becomes writing_prompts —
  // not on every re-render, and not again for someone who joins/refreshes
  // mid-phase.
  const seenRoundPhaseRef = useRef(null);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    const key = `${currentRound}:${phase}`;
    if (phase === "writing_prompts" && seenRoundPhaseRef.current !== key) {
      setShowTransition(true);
    }
    seenRoundPhaseRef.current = key;
  }, [currentRound, phase]);

  // Game-over overrides everything else, regardless of the round phase —
  // gameComplete can flip true while phase is still "revealing_results"
  // (the last round's Continue triggers it), so every client needs to
  // switch the moment it sees that flag, not wait on a phase change.
  // All-or-Nothing has no ranked leaderboard (everyone shares one
  // outcome), so it renders the same GroupOutcomeScreen RevealSequence
  // already showed pre-gameComplete, just with gameComplete now true —
  // see GroupOutcomeScreen's own comment for why that's the same
  // component both times, not two different-looking screens.
  if (gameComplete) {
    if (room.gameMode === "all_or_nothing") {
      return (
        <GroupOutcomeScreen room={room} isHost={Boolean(me?.isHost)} onContinue={onContinueRound} onPlayAgain={onPlayAgain} />
      );
    }
    return <PodiumWinnerScreen room={room} isHost={Boolean(me?.isHost)} onPlayAgain={onPlayAgain} />;
  }

  if (showTransition) {
    return (
      <TransitionSequence scenarioText={currentScenario} onComplete={() => setShowTransition(false)} />
    );
  }

  if (phase === "waiting_for_scenario") {
    if (me.id === scenarioWriterId) {
      return <ScenarioWriterScreen room={room} onSubmitScenario={onSubmitScenario} />;
    }
    const writer = room.players.find((p) => p.id === scenarioWriterId);
    return <ScenarioWaitingScreen writerUsername={writer?.username} />;
  }

  if (phase === "writing_prompts") {
    return (
      <StrategyWritingScreen
        room={room}
        me={me}
        onSubmitStrategy={onSubmitStrategy}
        onUpdateStrategyDraft={onUpdateStrategyDraft}
      />
    );
  }

  if (phase === "judging") {
    return <JudgingScreen />;
  }

  if (phase === "revealing_results") {
    return (
      <RevealSequence
        room={room}
        me={me}
        onContinue={onContinueRound}
        onRevealContinue={onRevealContinue}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  return <NotYetBuiltScreen phase={phase} />;
}
