import "./RoundHistoryIcons.css";

// One small icon per round: skull if they died that round, a check if
// they survived, a dim empty dot for rounds not yet reached (or, for an
// eliminated player, rounds after they were out).
export default function RoundHistoryIcons({ roundHistory, totalRounds }) {
  const slots = Array.from({ length: totalRounds }, (_, i) => {
    if (i >= roundHistory.length) return "empty";
    return roundHistory[i] ? "survived" : "died";
  });

  return (
    <div className="round-history-icons">
      {slots.map((slot, i) => (
        <span key={i} className={`round-icon round-icon-${slot}`} title={`Round ${i + 1}`}>
          {slot === "survived" ? "✓" : slot === "died" ? "✖" : ""}
        </span>
      ))}
    </div>
  );
}
