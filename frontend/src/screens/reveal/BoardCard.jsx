import { useEffect, useState } from "react";
import Robot from "../../components/Robot";
import "./BoardCard.css";

const REVEAL_DELAY_MS = 240;
const TEXT_REVEAL_DELAY_MS = 800;
const HOLD_BEFORE_CONTINUE_MS = 5500;

// A single fixed font-size either wasted space on short strategies (they
// looked small and lost in all that empty board) or had to be tuned
// conservatively enough to still fit the longest ones, which made every
// short strategy look needlessly cramped. Scales continuously from 1.2rem
// down to 0.6rem as the text gets longer, rather than a few discrete
// size steps — a fixed board-card size still has a real ceiling on how
// much text it can hold, but this at least makes good use of the room
// available for both ends of that range. FONT_SCALE_END_LEN is set below
// the hard 200-character prompt limit rather than exactly at it, so the
// smallest size is already reached with some room to spare instead of
// only kicking in right at the ceiling.
const MIN_FONT_REM = 0.6;
const MAX_FONT_REM = 1.2;
const FONT_SCALE_START_LEN = 30; // at or below this length, use MAX_FONT_REM
const FONT_SCALE_END_LEN = 180; // at or above this length, use MIN_FONT_REM

function boardTextFontSize(length) {
  if (length <= FONT_SCALE_START_LEN) return MAX_FONT_REM;
  if (length >= FONT_SCALE_END_LEN) return MIN_FONT_REM;
  const t = (length - FONT_SCALE_START_LEN) / (FONT_SCALE_END_LEN - FONT_SCALE_START_LEN);
  return MAX_FONT_REM - t * (MAX_FONT_REM - MIN_FONT_REM);
}

// -webkit-line-clamp caps how many lines show before truncating with an
// ellipsis — it's a line COUNT, not a height, so it has to scale opposite
// to font size: a smaller font fits more lines in the same physical
// space, so it needs a higher clamp or text that would otherwise fit
// gets cut off anyway despite the smaller font. 7 was the tuned baseline
// at 0.82rem; this keeps that same physical-space assumption at any size.
function boardTextLineClamp(fontSizeRem) {
  return Math.round(7 * (0.82 / fontSizeRem));
}

// The board is rendered INSIDE the robot's own SVG (via Robot's
// heldContent prop), positioned exactly where its hands grip — so it
// reads as the robot actually holding a physical board, not two
// separately-positioned elements that happen to sit near each other.
// Calls onComplete once it's had enough time on screen to read.
export default function BoardCard({ username, strategy, onComplete }) {
  const [revealed, setRevealed] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    const t1 = setTimeout(() => setTextRevealed(true), REVEAL_DELAY_MS + TEXT_REVEAL_DELAY_MS);
    const t2 = setTimeout(onComplete, REVEAL_DELAY_MS + TEXT_REVEAL_DELAY_MS + HOLD_BEFORE_CONTINUE_MS);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayText = strategy || "(nothing?!)";
  const fontSizeRem = boardTextFontSize(displayText.length);

  return (
    <div className="board-card-stage">
      <Robot
        pose="holding"
        className="board-card-robot"
        heldContent={
          <div className={`board-card ${revealed ? "is-revealed" : ""}`}>
            <span>{username} tries to…</span>
            {textRevealed && (
              <strong
                style={{ fontSize: `${fontSizeRem}rem`, WebkitLineClamp: boardTextLineClamp(fontSizeRem) }}
              >
                {displayText}
              </strong>
            )}
          </div>
        }
      />
    </div>
  );
}
