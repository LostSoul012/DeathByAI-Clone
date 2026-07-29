import { useEffect, useState } from "react";
import Robot from "../../components/Robot";
import "./BoardCard.css";

const REVEAL_DELAY_MS = 120;
const TEXT_REVEAL_DELAY_MS = 400;
const HOLD_BEFORE_CONTINUE_MS = 1300;

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

  return (
    <div className="board-card-stage">
      <Robot
        pose="holding"
        className="board-card-robot"
        heldContent={
          <div className={`board-card ${revealed ? "is-revealed" : ""}`}>
            <span>{username} tries to…</span>
            {textRevealed && <strong>{strategy || "(nothing?!)"}</strong>}
          </div>
        }
      />
    </div>
  );
}
