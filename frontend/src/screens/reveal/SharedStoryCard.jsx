import { useEffect, useMemo } from "react";
import Robot from "../../components/Robot";
import { useTypewriter } from "../../hooks/useTypewriter";
import { useSpeech } from "../../hooks/useSpeech";
import { splitSentences } from "../../utils/sentences";
import "./StoryCard.css";

// Shared World / All-or-Nothing's verdict reveal: every entry in
// `results` carries the exact same story text (see
// backend/groqJudge.js's parseSharedJudgeResponse), so there's only one
// real story to read here, not one per player. Same host-paced
// sentence-by-sentence mechanic as StoryCard, just without a "next
// player" step in between — once the last sentence is shown, the whole
// group's outcomes appear together and the only place left to go is
// Standings.
export default function SharedStoryCard({ results, sentencesShown = 1, isHost = false, onRevealContinue }) {
  const story = results[0]?.story ?? "";
  const sentences = useMemo(() => splitSentences(story), [story]);
  const totalSentences = Math.max(sentences.length, 1);
  const clampedShown = Math.min(Math.max(sentencesShown, 1), totalSentences);
  const isLastSentence = clampedShown >= totalSentences;

  const previousText = sentences.slice(0, clampedShown - 1).join(" ");
  const currentSentenceText = sentences[clampedShown - 1] ?? story ?? "";

  const { displayedText: typedCurrent, isComplete } = useTypewriter(currentSentenceText, 26);
  const { speak } = useSpeech();

  useEffect(() => {
    if (currentSentenceText) speak(currentSentenceText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceText]);

  // Same reasoning as StoryCard: driven by the typewriter, not the
  // browser's flaky speechSynthesis state.
  const isTalking = Boolean(currentSentenceText) && !isComplete;

  const displayedText = previousText ? `${previousText} ${typedCurrent}` : typedCurrent;
  const verdictSettled = isComplete && isLastSentence;

  const allSurvived = results.every((r) => r.survived);
  const allDied = results.every((r) => !r.survived);
  // Mixed outcomes (some survived, some didn't) don't cleanly map to a
  // single mood, so default to idle rather than pick one side to imply.
  const eyeState = !verdictSettled ? "idle" : allSurvived ? "survive" : allDied ? "death" : "idle";
  const moodClass = !verdictSettled ? "is-idle" : allSurvived ? "is-survive" : allDied ? "is-death" : "is-idle";

  return (
    <div className={`verdict-stage ${moodClass}`}>
      <div className="verdict-glow" />

      <div className="verdict-robot-wrap">
        <Robot pose="holding" narrating={isTalking} eyeState={eyeState} className="verdict-robot" />
      </div>

      <div className="verdict-scrim">
        <span className="verdict-label mono">// AI JUDGE VERDICT</span>
        <p className="verdict-story">{displayedText}</p>

        {/* Same fixed-height-footer reasoning as StoryCard: this slot is
            always present so the outcomes row + button appearing doesn't
            shift the story text above it. */}
        <div className="verdict-footer">
          {verdictSettled && (
            <div className="verdict-outcomes-row">
              {results.map((r) => (
                <div
                  key={r.username}
                  className={`verdict-tag verdict-tag-compact ${r.survived ? "verdict-survived" : "verdict-died"}`}
                >
                  <span className="verdict-icon">{r.survived ? "✓" : "☠"}</span>
                  {r.username}
                </div>
              ))}
            </div>
          )}

          {isComplete &&
            (isHost ? (
              <button type="button" className="btn btn-primary verdict-continue-btn" onClick={onRevealContinue}>
                {!isLastSentence ? "Continue" : "View Standings ≫"}
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
