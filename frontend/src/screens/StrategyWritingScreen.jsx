import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import CountdownTimer from "../components/CountdownTimer";
import TimeBar from "../components/TimeBar";
import { getTimerConfig } from "../data/timerConfig";
import { getActivePlayers } from "../data/gameLogic";
import { useCountdown } from "../hooks/useCountdown";
import "./StrategyWritingScreen.css";

export default function StrategyWritingScreen({ room, me, onSubmitStrategy }) {
  const [text, setText] = useState("");
  const hasSubmitted = room.game.submittedPlayerIds.includes(me.id);
  const charLimit = getTimerConfig(room.gameMode).strategyCharLimit;
  const { secondsRemaining } = useCountdown(room.game.strategyDeadline);

  const activeCount = getActivePlayers(room).length;
  const submittedCount = room.game.submittedPlayerIds.length;

  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (secondsRemaining === 0 && !hasSubmitted && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      onSubmitStrategy(text);
    }
  }, [secondsRemaining, hasSubmitted, text, onSubmitStrategy]);

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
        <TimeBar deadline={room.game.strategyDeadline} />
      </div>

      <motion.div
        className="strategy-writing"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CountdownTimer deadline={room.game.strategyDeadline} />
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
