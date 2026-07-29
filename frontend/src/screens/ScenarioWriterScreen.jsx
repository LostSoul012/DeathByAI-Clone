import { useState } from "react";
import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import CountdownTimer from "../components/CountdownTimer";
import TimeBar from "../components/TimeBar";
import { PRESET_SCENARIOS } from "../data/scenarios";
import { getTimerConfig } from "../data/timerConfig";
import "./ScenarioWriterScreen.css";

export default function ScenarioWriterScreen({ room, onSubmitScenario }) {
  const [mode, setMode] = useState("preset"); // "preset" | "custom"
  const [presetIndex, setPresetIndex] = useState(() => Math.floor(Math.random() * PRESET_SCENARIOS.length));
  const [customText, setCustomText] = useState("");

  const charLimit = getTimerConfig(room.gameMode).scenarioCharLimit;
  const currentText = mode === "preset" ? PRESET_SCENARIOS[presetIndex] : customText;
  const canAccept = currentText.trim().length > 0;

  function cyclePreset() {
    setPresetIndex((i) => (i + 1) % PRESET_SCENARIOS.length);
  }

  function handleAccept() {
    if (!canAccept) return;
    onSubmitScenario(currentText.trim());
  }

  return (
    <SwirlBackground theme="purple">
      <motion.div
        className="scenario-writer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CountdownTimer deadline={room.game.scenarioDeadline} />
        <div className="scenario-timebar">
          <TimeBar deadline={room.game.scenarioDeadline} />
        </div>
        <h1 className="scenario-writer-heading display">
          {mode === "custom" ? "Enter a Deadly Scenario" : "Confirm your scenario"}
        </h1>

        <div className="scenario-box">
          {mode === "preset" ? (
            <p className="scenario-preview">{currentText}</p>
          ) : (
            <textarea
              className="scenario-custom-input"
              value={customText}
              maxLength={charLimit}
              onChange={(e) => setCustomText(e.target.value)}
              autoFocus
            />
          )}
          <span className="scenario-char-count mono">
            {currentText.length}/{charLimit}
          </span>
        </div>

        <div className="scenario-controls">
          <button
            type="button"
            className="icon-btn"
            title="Try another preset"
            aria-label="Try another preset scenario"
            onClick={() => {
              setMode("preset");
              cyclePreset();
            }}
          >
            ↻
          </button>
          <button
            type="button"
            className={`icon-btn ${mode === "custom" ? "icon-btn-active" : ""}`}
            title="Write your own"
            aria-label="Write your own scenario"
            onClick={() => setMode("custom")}
          >
            ✎
          </button>
        </div>

        <button type="button" className="btn btn-primary scenario-accept" disabled={!canAccept} onClick={handleAccept}>
          Accept
        </button>
      </motion.div>
    </SwirlBackground>
  );
}
