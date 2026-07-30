import "./CountdownTimer.css";

// Renders from values computed by a single shared useCountdown call in the
// parent screen, rather than polling its own — see StrategyWritingScreen /
// ScenarioWriterScreen, which render this alongside TimeBar off the exact
// same deadline. Two independent useCountdown calls on the same deadline
// used to mean two separate setInterval(200ms) timers ticking slightly out
// of phase with each other — harmless in effect, but doubled the timer/
// render overhead on these screens for the entire strategy/scenario phase
// of every round, for no benefit (they're just two views of one clock).
export default function CountdownTimer({ seconds, isLow }) {
  return (
    <div className={`countdown display ${isLow ? "countdown-low" : ""}`} aria-live="polite">
      {seconds}
    </div>
  );
}
