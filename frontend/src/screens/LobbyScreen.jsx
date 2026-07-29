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
      <button
        className="btn btn-ghost settings-btn"
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings and how to play"
      >
        ⚙
      </button>

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
