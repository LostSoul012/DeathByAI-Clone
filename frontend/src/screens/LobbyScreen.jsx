import { useState } from "react";
import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import Robot from "../components/Robot";
import PlayerList from "../components/PlayerList";
import OptionList from "../components/OptionList";
import SettingsModal from "../components/SettingsModal";
import ErrorToast from "../components/ErrorToast";
import { GAME_MODES, getGameMode } from "../data/gameModes";
import "./LobbyScreen.css";

const MIN_PLAYERS = 2;

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

export default function LobbyScreen({
  room,
  me,
  onSetGameMode,
  onSetAiPersonality,
  onStartGame,
  errorMessage,
  onDismissError,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = Boolean(me?.isHost);
  const connectedCount = room.players.filter((p) => p.connected).length;
  const canStart = isHost && connectedCount >= MIN_PLAYERS;

  function handleCopyCode() {
    navigator.clipboard?.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <SwirlBackground theme="purple">
      <motion.button
        type="button"
        className="settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings and how to play"
        title="Settings"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        whileHover={{ rotate: 25 }}
        whileTap={{ scale: 0.92 }}
      >
        <SettingsIcon />
      </motion.button>

      <div className="lobby">
        <header className="lobby-header">
          <span className="room-code-label mono">Room Code</span>
          <button className="room-code display" onClick={handleCopyCode} title="Copy to clipboard">
            {room.code}
            <span className="room-code-copy mono">{copied ? "copied!" : "copy"}</span>
          </button>
        </header>

        <div className="lobby-robot-stage">
          <Robot pose="reaching" className="lobby-robot" />
        </div>

        <div className="lobby-panels">
          <motion.section
            className="lobby-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h2 className="panel-heading mono">
              Players <span className="player-count">{connectedCount}/8</span>
            </h2>
            <PlayerList players={room.players} />
          </motion.section>

          <motion.section
            className="lobby-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="panel-heading mono">Game Mode</h2>
            <OptionList
              options={GAME_MODES}
              selectedId={room.gameMode}
              onSelect={onSetGameMode}
              disabled={!isHost}
            />
            {!isHost && (
              <p className="settings-note">
                Host picked <strong>{getGameMode(room.gameMode).label}</strong>.
              </p>
            )}
          </motion.section>
        </div>

        <footer className="lobby-footer">
          {isHost ? (
            <>
              <button className="btn btn-primary start-btn" disabled={!canStart} onClick={onStartGame}>
                Start ≫
              </button>
              {!canStart && <p className="start-hint mono">need at least {MIN_PLAYERS} players</p>}
            </>
          ) : (
            <p className="waiting-hint mono">waiting for host to start…</p>
          )}
        </footer>
      </div>

      {settingsOpen && (
        <SettingsModal
          room={room}
          isHost={isHost}
          onSetAiPersonality={onSetAiPersonality}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <ErrorToast message={errorMessage} onDismiss={onDismissError} />
    </SwirlBackground>
  );
}
