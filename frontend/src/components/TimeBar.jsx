import { useCountdown } from "../hooks/useCountdown";
import "./TimeBar.css";

// A thin bar that shrinks from full to empty as a deadline approaches —
// sits under the prompt bar on the scenario/strategy screens as a passive
// visual timer cue, alongside (not instead of) the numeric countdown.
export default function TimeBar({ deadline }) {
  const { fractionRemaining, isLow } = useCountdown(deadline);
  return (
    <div className="time-bar-track">
      <div
        className={`time-bar-fill ${isLow ? "time-bar-fill-low" : ""}`}
        style={{ width: `${fractionRemaining * 100}%` }}
      />
    </div>
  );
}
