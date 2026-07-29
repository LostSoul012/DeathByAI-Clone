import { useCountdown } from "../hooks/useCountdown";
import "./CountdownTimer.css";

export default function CountdownTimer({ deadline }) {
  const { secondsRemaining, isLow } = useCountdown(deadline);
  return (
    <div className={`countdown display ${isLow ? "countdown-low" : ""}`} aria-live="polite">
      {secondsRemaining}
    </div>
  );
}
