import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "./socket";
import WelcomeScreen from "./screens/WelcomeScreen";
import LobbyScreen from "./screens/LobbyScreen";
import GameScreen from "./screens/GameScreen";
import "./App.css";

// Wraps each top-level screen with a consistent fade+lift so scene
// changes (welcome -> lobby -> game) feel intentional, not abrupt.
const screenVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit:    { opacity: 0, y: -12, filter: "blur(6px)" },
};
const screenTransition = {
  duration: 0.42,
  ease: [0.2, 0.8, 0.2, 1],
};

function Scene({ id, children }) {
  return (
    <motion.div
      key={id}
      className="scene"
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={screenTransition}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setMyId(socket.id);
    }
    function onRoomCreated(data) {
      setConnecting(false);
      setRoom(data);
    }
    function onRoomJoined(data) {
      setConnecting(false);
      setRoom(data);
    }
    function onRoomUpdated(data) {
      setRoom(data);
    }
    function onErrorEvent(err) {
      setConnecting(false);
      setErrorMessage(err.message || "Something went wrong.");
    }
    function onDisconnect() {
      setMyId(null);
    }

    socket.on("connect", onConnect);
    socket.on("room_created", onRoomCreated);
    socket.on("room_joined", onRoomJoined);
    socket.on("room_updated", onRoomUpdated);
    socket.on("error_event", onErrorEvent);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room_created", onRoomCreated);
      socket.off("room_joined", onRoomJoined);
      socket.off("room_updated", onRoomUpdated);
      socket.off("error_event", onErrorEvent);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(({ username, avatarId }) => {
    setErrorMessage(null);
    setConnecting(true);
    socket.emit("create_room", { username, avatarId });
  }, []);

  const joinRoom = useCallback(({ roomCode, username, avatarId }) => {
    setErrorMessage(null);
    setConnecting(true);
    socket.emit("join_room", { roomCode: roomCode.toUpperCase(), username, avatarId });
  }, []);

  const setGameMode = useCallback((gameMode) => {
    socket.emit("set_game_mode", { gameMode });
  }, []);

  const setAiPersonality = useCallback((aiPersonality) => {
    socket.emit("set_ai_personality", { aiPersonality });
  }, []);

  const startGame = useCallback(() => {
    socket.emit("start_game");
  }, []);

  // Play Again reuses the same start_game event — the backend allows
  // calling it again once gameComplete is true (see game.js's startGame).
  const playAgain = useCallback(() => {
    socket.emit("start_game");
  }, []);

  const continueRound = useCallback(() => {
    socket.emit("continue_after_round");
  }, []);

  const submitScenario = useCallback((scenarioText) => {
    socket.emit("submit_scenario", { scenarioText });
  }, []);

  const submitStrategy = useCallback((strategyText) => {
    socket.emit("submit_strategy", { strategyText });
  }, []);

  const dismissError = useCallback(() => setErrorMessage(null), []);

  const me = room?.players.find((p) => p.id === myId) ?? null;

  const sceneKey = !room
    ? "welcome"
    : !room.game?.started
    ? "lobby"
    : "game";

  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        {sceneKey === "welcome" && (
          <Scene id="welcome">
            <WelcomeScreen
              onCreateRoom={createRoom}
              onJoinRoom={joinRoom}
              connecting={connecting}
              errorMessage={errorMessage}
              onDismissError={dismissError}
            />
          </Scene>
        )}
        {sceneKey === "lobby" && (
          <Scene id="lobby">
            <LobbyScreen
              room={room}
              me={me}
              onSetGameMode={setGameMode}
              onSetAiPersonality={setAiPersonality}
              onStartGame={startGame}
              errorMessage={errorMessage}
              onDismissError={dismissError}
            />
          </Scene>
        )}
        {sceneKey === "game" && me && (
          <Scene id="game">
            <GameScreen
              room={room}
              me={me}
              onSubmitScenario={submitScenario}
              onSubmitStrategy={submitStrategy}
              onContinueRound={continueRound}
              onPlayAgain={playAgain}
            />
          </Scene>
        )}
      </AnimatePresence>
    </div>
  );
}
