import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import CountdownTimer from "../components/CountdownTimer";
import TimeBar from "../components/TimeBar";
import { useCountdown } from "../hooks/useCountdown";
import { getTimerConfig } from "../data/timerConfig";
import { getActivePlayers } from "../data/gameLogic";
import "./StrategyWritingScreen.css";

const DRAFT_DEBOUNCE_MS = 400;

// Auto-submit-on-timeout used to be decided here, on the client, off its
// own local countdown — racing against the server's OWN independent
// strategy timer. Clock skew/network latency meant the server's timer
// could (and sometimes did) fire first, finalizing the round with a
// blank submission before this component's late auto-submit even
// reached it — silently discarding whatever the player had actually
// typed. There's now only one clock that matters: the server's. This
// component's only job is to keep the server's copy of the draft
// current (debounced, so it's not a socket message per keystroke) so
// that when the server's timer fires, it already has the real text to
// fall back to — see updateStrategyDraft/finalizeStrategyPhase in
// backend/game.js.
export default function StrategyWritingScreen({ room, me, onSubmitStrategy, onUpdateStrategyDraft }) {
  const [text, setText] = useState("");
  const hasSubmitted = room.game.submittedPlayerIds.includes(me.id);
  const charLimit = getTimerConfig(room.gameMode).strategyCharLimit;
  const { secondsRemaining, fractionRemaining, isLow } = useCountdown(room.game.strategyDeadline);

  const activeCount = getActivePlayers(room).length;
  const submittedCount = room.game.submittedPlayerIds.length;

  useEffect(() => {
    if (hasSubmitted) return undefined;
    const t = setTimeout(() => onUpdateStrategyDraft(text), DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, hasSubmitted, onUpdateStrategyDraft]);

  function handleConfirm() {
    if (hasSubmitted) return;
    onSubmitStrategy(text);
  }

  return (
    <SwirlBackground theme="dark">
      <div className="strategy-top-bar">
        <span className="strategy-top-bar-text mono">
          Prompt: <strong>{room.game.currentScenario}</strong>
        </span>
        <TimeBar fraction={fractionRemaining} isLow={isLow} />
      </div>

      <motion.div
        className="strategy-writing"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CountdownTimer seconds={secondsRemaining} isLow={isLow} />
        <h1 className="strategy-heading display">Enter your survival strategy</h1>

        {hasSubmitted ? (
          <p className="strategy-waiting mono">
            waiting for others ({submittedCount}/{activeCount} submitted)…
          </p>
        ) : (
          <>
            <div className="strategy-box">
              <span className="strategy-label mono">{me.username} tries to…</span>
              <textarea
                id="strategy-input"
                className="strategy-input"
                value={text}
                maxLength={charLimit}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              <span className="strategy-char-count mono">
                {text.length}/{charLimit}
              </span>
            </div>
            <button type="button" className="btn btn-primary strategy-confirm" onClick={handleConfirm}>
              Confirm
            </button>
          </>
        )}
      </motion.div>
    </SwirlBackground>
  );
}
