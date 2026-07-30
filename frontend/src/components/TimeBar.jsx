import "./TimeBar.css";

// A thin bar that shrinks from full to empty as a deadline approaches —
// sits under the prompt bar on the scenario/strategy screens as a passive
// visual timer cue, alongside (not instead of) the numeric countdown.
// See CountdownTimer's comment — this takes the same pre-computed values
// from a single shared useCountdown call rather than running its own.
export default function TimeBar({ fraction, isLow }) {
  return (
    <div className="time-bar-track">
      <div
        className={`time-bar-fill ${isLow ? "time-bar-fill-low" : ""}`}
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
}
