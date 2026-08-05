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
  const { speak } = useSpeech();

  useEffect(() => {
    if (currentSentenceText) speak(currentSentenceText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceText]);

  // The mouth animation is driven by the typewriter (isComplete), NOT by
  // the browser's speechSynthesis isSpeaking state. Web Speech is
  // unreliable across browsers/devices — voices can still be loading,
  // autoplay policy can block it until a user gesture, or a fast repeat
  // cancel()+speak() (see useSpeech) can silently drop an utterance so
  // onstart never fires. Any of those left the mouth simply never
  // animating some of the time. The typewriter runs on our own timer and
  // always ticks, so tying the mouth to "is this sentence still being
  // typed out" makes the animation fire every single time, regardless of
  // whether real speech audio happens to be playing alongside it.
  const isTalking = Boolean(currentSentenceText) && !isComplete;

  const displayedText = previousText ? `${previousText} ${typedCurrent}` : typedCurrent;
  const verdictSettled = isComplete && isLastSentence;

  const eyeState = verdictSettled ? (result.survived ? "survive" : "death") : "idle";
  const moodClass = verdictSettled ? (result.survived ? "is-survive" : "is-death") : "is-idle";

  const isLastPlayer = playerIndex + 1 >= totalPlayers;
  const continueLabel = !isLastSentence ? "Continue" : isLastPlayer ? "View Standings ≫" : "Next Player ≫";

  return (
    <div className={`verdict-stage ${moodClass}`}>
      <div className="verdict-player-card">
        <Avatar {...getAvatarById(player.avatarId)} size={52} />
        <div className="verdict-player-text">
          <span className="verdict-player-step mono">player {playerIndex + 1} of {totalPlayers}</span>
          <span className="verdict-player-name">{player.username}</span>
        </div>
      </div>

      <div className="verdict-progress" aria-hidden="true">
        {Array.from({ length: totalPlayers }).map((_, i) => (
          <span key={i} className={`verdict-progress-dot ${i === playerIndex ? "is-current" : ""}`} />
        ))}
      </div>

      <div className="verdict-glow" />

      <div className="verdict-robot-wrap">
        <Robot pose="holding" narrating={isTalking} eyeState={eyeState} className="verdict-robot" />
      </div>

      <div className="verdict-scrim">
        <span className="verdict-label mono">// AI JUDGE VERDICT</span>
        <p className="verdict-story">{displayedText}</p>

        {/* Fixed-height slot, always present, regardless of which of the
            three states (still typing / button / waiting-for-host) is
            showing. Previously the tag+button block only existed in the
            DOM once isComplete flipped true, so the scrim's height (and
            everything above it) jumped every single time a sentence
            finished or the host clicked through — this reserves the max
            space up front so nothing above it ever moves. */}
        <div className="verdict-footer">
          {verdictSettled && (
            <div className={`verdict-tag ${result.survived ? "verdict-survived" : "verdict-died"}`}>
              <span className="verdict-icon">{result.survived ? "✓" : "✖"}</span>
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
      </div>

      <span className="story-watermark mono">DEATH BY_AI</span>
    </div>
  );
}
