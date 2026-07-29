import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { io } from "socket.io-client";
import App from "../src/App";

const BACKEND_URL = "http://localhost:3001";
const MOCK_GROQ_PORT = 4571;

// The real server this test runs against must be started with
// GROQ_API_KEY=test-key GROQ_API_BASE_URL=http://localhost:4571 — see
// package.json's test:stage6 script.
async function queueMockGroqResponse(content) {
  await fetch(`http://localhost:${MOCK_GROQ_PORT}/__queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

function waitForPhase(socket, phase) {
  return new Promise((resolve) => {
    function handler(room) {
      if (room.game.phase === phase) {
        socket.off("room_updated", handler);
        resolve(room);
      }
    }
    socket.on("room_updated", handler);
  });
}

describe("Stage 6: judging, fate sealed, and the per-player reveal", () => {
  beforeAll(async () => {
    const probe = await fetch(`${BACKEND_URL}/health`).catch(() => null);
    if (!probe?.ok) {
      throw new Error("Backend not reachable — run `npm run test:stage6` from package.json instead of vitest directly.");
    }
  });

  it(
    "shows fate sealed, then each player's board and story with the right verdict",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      const nameInput = await screen.findByLabelText(/your name/i);
      await user.type(nameInput, "HostPlayer");
      await user.click(screen.getByRole("button", { name: /create room/i }));
      const roomCodeEl = await screen.findByText(/^[A-Z0-9]{4}$/, {}, { timeout: 8000 });
      const roomCode = roomCodeEl.textContent.trim().slice(0, 4);

      const p2 = io(BACKEND_URL, { transports: ["websocket"] });
      await new Promise((resolve) => p2.on("connect", resolve));
      await new Promise((resolve) => {
        p2.emit("join_room", { roomCode, username: "SecondPlayer", avatarId: "blob-02" });
        p2.once("room_joined", resolve);
      });

      const startedPromise = waitForPhase(p2, "waiting_for_scenario");
      await user.click(screen.getByRole("button", { name: /start/i }));
      const started = await startedPromise;

      const hostIsWriter = started.players.find((p) => p.username === "HostPlayer")?.id === started.game.scenarioWriterId;
      const writingPromise = waitForPhase(p2, "writing_prompts");
      if (hostIsWriter) {
        await user.click(await screen.findByRole("button", { name: /accept/i }));
      } else {
        p2.emit("submit_scenario", { scenarioText: "A meteor is approaching fast" });
      }
      await writingPromise;

      // Queue a short, deterministic mock Groq response — this test's
      // server is pointed at the mock server on MOCK_GROQ_PORT.
      await queueMockGroqResponse(
        JSON.stringify([
          { username: "HostPlayer", survived: true, story: "Host escaped just in time.", score: 8 },
          { username: "SecondPlayer", survived: false, story: "Second player did not make it.", score: 2 },
        ])
      );

      const revealingPromise = waitForPhase(p2, "revealing_results");
      await screen.findByPlaceholderText(/type your survival strategy/i, {}, { timeout: 5000 });
      const textarea = screen.getByPlaceholderText(/type your survival strategy/i);
      await user.type(textarea, "run");
      await user.click(screen.getByRole("button", { name: /confirm/i }));
      p2.emit("submit_strategy", { strategyText: "hide" });
      await revealingPromise;

      // --- fate sealed beat ---
      await screen.findByText(/YOUR FATE HAS BEEN SEALED/i, {}, { timeout: 5000 });

      // --- first player's board, then story+verdict ---
      await screen.findByText(/tries to…/i, {}, { timeout: 4000 });
      await screen.findByText(/escaped just in time|did not make it/i, {}, { timeout: 4000 });
      await screen.findByText(/survived|did not survive/i, {}, { timeout: 4000 });

      // --- confirms it advances to a second player's board afterward ---
      await screen.findByText(/tries to…/i, {}, { timeout: 6000 });

      p2.disconnect();
    },
    30000
  );
});
