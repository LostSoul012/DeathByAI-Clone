import { useEffect, useMemo } from "react";
import Robot from "../../components/Robot";
import Avatar from "../../components/Avatar";
import { getAvatarById } from "../../data/avatars";
import { useTypewriter } from "../../hooks/useTypewriter";
import { useSpeech } from "../../hooks/useSpeech";
import { splitSentences } from "../../utils/sentences";
import "./StoryCard.css";

// Verdict Reader: a full-bleed hero shot rather than a small card next to
// a small robot — the robot is the dominant visual, angled/large, with a
// glow behind it that shifts color with the outcome, and the verdict
// text sits in a scrim fading up from the bottom so the whole thing reads
// as one dramatic scene instead of a split layout.
//
// The story is revealed one sentence at a time, paced by the host:
// `sentencesShown` (derived in RevealSequence from the server-synced
// room.game.revealCursor) says how many sentences should be on screen.
// Everything before the current one is already fully typed out and just
// sits there statically; only the newest sentence gets the typewriter +
// speech treatment. Once it finishes, the host gets a button to reveal
// the next sentence (or move to the next player, once this one's done) —
// everyone else sees a "waiting for host" note instead, same as Standings.
export default function StoryCard({
  player,
  result,
  playerIndex = 0,
  totalPlayers = 1,
  sentencesShown = 1,
  isHost = false,
  onRevealContinue,
}) {
  const sentences = useMemo(() => splitSentences(result.story), [result.story]);
  const totalSentences = Math.max(sentences.length, 1);
  const clampedShown = Math.min(Math.max(sentencesShown, 1), totalSentences);
  const isLastSentence = clampedShown >= totalSentences;

  const previousText = sentences.slice(0, clampedShown - 1).join(" ");
  const currentSentenceText = sentences[clampedShown - 1] ?? result.story ?? "";

  const { displayedText: typedCurrent, isComplete } = useTypewriter(currentSentenceText, 26);
  const { speak, isSpeaking } = useSpeech();

  useEffect(() => {
    if (currentSentenceText) speak(currentSentenceText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceText]);

  const displayedText = previousText ? `${previousText} ${typedCurrent}` : typedCurrent;
  const verdictSettled = isComplete && isLastSentence;

  const eyeState = verdictSettled ? (result.survived ? "survive" : "death") : "idle";
  const moodClass = verdictSettled ? (result.survived ? "is-survive" : "is-death") : "is-idle";

  const isLastPlayer = playerIndex + 1 >= totalPlayers;
  const continueLabel = !isLastSentence ? "Continue" : isLastPlayer ? "View Standings ≫" : "Next Player ≫";

  return (
    <div className={`verdict-stage ${moodClass}`}>
      <div className="verdict-corner-tag">
        <Avatar {...getAvatarById(player.avatarId)} size={32} />
        <span>{player.username}</span>
      </div>

      <div className="verdict-progress" aria-hidden="true">
        {Array.from({ length: totalPlayers }).map((_, i) => (
          <span key={i} className={`verdict-progress-dot ${i === playerIndex ? "is-current" : ""}`} />
        ))}
      </div>

      <div className="verdict-glow" />

      <div className="verdict-robot-wrap">
        <Robot pose="holding" narrating={isSpeaking} eyeState={eyeState} className="verdict-robot" />
      </div>

      <div className="verdict-scrim">
        <span className="verdict-label mono">// AI JUDGE VERDICT</span>
        <p className="verdict-story">{displayedText}</p>

        {verdictSettled && (
          <div className={`verdict-tag ${result.survived ? "verdict-survived" : "verdict-died"}`}>
            <span className="verdict-icon">{result.survived ? "✓" : "☠"}</span>
            {player.username} {result.survived ? "survived" : "did not survive"}
          </div>
        )}

        {isComplete &&
          (isHost ? (
            <button type="button" className="btn btn-primary verdict-continue-btn" onClick={onRevealContinue}>
              {continueLabel}
            </button>
          ) : (
            <p className="verdict-waiting mono">waiting for host to continue…</p>
          ))}
      </div>

      <span className="story-watermark mono">DEATH BY_AI</span>
    </div>
  );
}
