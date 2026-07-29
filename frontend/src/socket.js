import { io } from "socket.io-client";

// Vite exposes env vars prefixed VITE_ on import.meta.env.
// Falls back to localhost:3001 (the Stage 1 backend's default) for local dev.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// autoConnect: false — App.jsx connects once on mount so we don't open a
// socket before React is even ready to handle its events.
export const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket"],
});
