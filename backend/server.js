// server.js
// Entry point: Express + Socket.io server.

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { registerSocketHandlers } = require("./socketHandlers");

const PORT = process.env.PORT || 3001;
// Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://myapp.vercel.app"
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "deathbyai-backend" });
});

// Simple health check - handy for confirming Render hasn't cold-started
// mid-game later on.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const httpServer = http.createServer(app);

// Socket.io needs its own CORS config - Express's cors() middleware above
// only covers regular HTTP routes, not the WebSocket handshake.
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`Death by AI backend listening on port ${PORT}`);
});
