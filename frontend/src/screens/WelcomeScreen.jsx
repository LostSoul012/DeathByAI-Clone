import { useState } from "react";
import { motion } from "framer-motion";
import SwirlBackground from "../components/SwirlBackground";
import AvatarPicker from "../components/AvatarPicker";
import ErrorToast from "../components/ErrorToast";
import { AVATARS } from "../data/avatars";
import "./WelcomeScreen.css";

const USERNAME_MAX_LENGTH = 20;

export default function WelcomeScreen({ onCreateRoom, onJoinRoom, connecting, errorMessage, onDismissError }) {
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [roomCode, setRoomCode] = useState("");

  const trimmedUsername = username.trim();
  const usernameValid = trimmedUsername.length > 0 && trimmedUsername.length <= USERNAME_MAX_LENGTH;
  const roomCodeValid = mode === "create" || roomCode.trim().length === 4;
  const canSubmit = usernameValid && roomCodeValid && !connecting;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "create") {
      onCreateRoom({ username: trimmedUsername, avatarId });
    } else {
      onJoinRoom({ roomCode: roomCode.trim(), username: trimmedUsername, avatarId });
    }
  }

  return (
    <SwirlBackground theme="purple">
      <div className="welcome">
        <h1 className="welcome-title display">
          DEATH<br />BY <span>//AI</span>
        </h1>
        <p className="welcome-tagline mono">
          Your survival strategy — judged by a robot with no chill.
        </p>

        <motion.form
          className="welcome-card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <label className="field-label mono" htmlFor="username-input">
            Your name
          </label>
          <input
            id="username-input"
            className="text-input"
            type="text"
            value={username}
            maxLength={USERNAME_MAX_LENGTH}
            placeholder="What do we call you?"
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />

          <span className="field-label mono">Pick an avatar</span>
          <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />

          <div className="mode-toggle" role="tablist" aria-label="Create or join a room">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "create"}
              className={`mode-tab ${mode === "create" ? "mode-tab-active" : ""}`}
              onClick={() => setMode("create")}
            >
              Create Room
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "join"}
              className={`mode-tab ${mode === "join" ? "mode-tab-active" : ""}`}
              onClick={() => setMode("join")}
            >
              Join Room
            </button>
          </div>

          {mode === "join" && (
            <>
              <label className="field-label mono" htmlFor="room-code-input">
                Room code
              </label>
              <input
                id="room-code-input"
                className="text-input mono room-code-input"
                type="text"
                value={roomCode}
                maxLength={4}
                placeholder="ABCD"
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                autoComplete="off"
              />
            </>
          )}

          <button type="submit" className="btn btn-primary welcome-submit" disabled={!canSubmit}>
            {connecting ? "Connecting…" : mode === "create" ? "Create Room" : "Join Room"}
          </button>
        </motion.form>
      </div>
      <ErrorToast message={errorMessage} onDismiss={onDismissError} />
    </SwirlBackground>
  );
}
