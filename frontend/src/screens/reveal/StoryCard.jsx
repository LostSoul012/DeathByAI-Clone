import { useEffect, useRef } from "react";
import Robot from "../../components/Robot";
import Avatar from "../../components/Avatar";
import { getAvatarById } from "../../data/avatars";
import { useTypewriter } from "../../hooks/useTypewriter";
import { useSpeech } from "../../hooks/useSpeech";
import "./StoryCard.css";

const VERDICT_DELAY_MS = 400;
const HOLD_AFTER_VERDICT_MS = 2600;

// Verdict Reader: a full-bleed hero shot rather than a small card next to
// a small robot — the robot is the dominant visual, angled/large, with a
// glow behind it that shifts color with the outcome, and the verdict
// text sits in a scrim fading up from the bottom so the whole thing reads
// as one dramatic scene instead of a split layout.
export default function StoryCard({ player, result, playerIndex = 0, totalPlayers = 1, onComplete }) {
  const { displayedText, isComplete } = useTypewriter(result.story, 26);
  const { speak, isSpeaking } = useSpeech();
  const hasSpokenRef = useRef(false);
  const hasAdvancedRef = useRef(false);

  useEffect(() => {
    if (!hasSpokenRef.current) {
      hasSpokenRef.current = true;
      speak(result.story);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.story]);

  useEffect(() => {
    if (!isComplete || hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    const timer = setTimeout(onComplete, VERDICT_DELAY_MS + HOLD_AFTER_VERDICT_MS);
    return () => clearTimeout(timer);
  }, [isComplete, onComplete]);

  const eyeState = isComplete ? (result.survived ? "survive" : "death") : "idle";
  const moodClass = isComplete ? (result.survived ? "is-survive" : "is-death") : "is-idle";

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

        {isComplete && (
          <div className={`verdict-tag ${result.survived ? "verdict-survived" : "verdict-died"}`}>
            <span className="verdict-icon">{result.survived ? "✓" : "☠"}</span>
            {player.username} {result.survived ? "survived" : "did not survive"}
          </div>
        )}
      </div>

      <span className="story-watermark mono">DEATH BY_AI</span>
    </div>
  );
}
