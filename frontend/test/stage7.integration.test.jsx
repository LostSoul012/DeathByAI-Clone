import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { io } from "socket.io-client";
import App from "../src/App";

const BACKEND_URL = "http://localhost:3001";
const MOCK_GROQ_PORT = 4571;

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

function waitForGameComplete(socket) {
  return new Promise((resolve) => {
    function handler(room) {
      if (room.game.gameComplete) {
        socket.off("room_updated", handler);
        resolve(room);
      }
    }
    socket.on("room_updated", handler);
  });
}

describe("Stage 7: standings and the winner screen", () => {
  beforeAll(async () => {
    const probe = await fetch(`${BACKEND_URL}/health`).catch(() => null);
    if (!probe?.ok) {
      throw new Error("Backend not reachable — see package.json's test:stage6 script for how to start it.");
    }
  });

  it(
    "reaches standings after a round, then the podium winner screen once Elimination ends it",
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

      // Switch to Elimination mode so the game can complete after just one
      // round (2 players, one dies -> 1 active player remains).
      await user.click(screen.getByRole("radio", { name: /elimination/i }));

      const startedPromise = waitForPhase(p2, "waiting_for_scenario");
      await user.click(screen.getByRole("button", { name: /start/i }));
      const started = await startedPromise;

      const hostIsWriter =
        started.players.find((p) => p.username === "HostPlayer")?.id === started.game.scenarioWriterId;
      const writingPromise = waitForPhase(p2, "writing_prompts");
      if (hostIsWriter) {
        await user.click(await screen.findByRole("button", { name: /accept/i }));
      } else {
        p2.emit("submit_scenario", { scenarioText: "A meteor is approaching fast" });
      }
      await writingPromise;

      await queueMockGroqResponse(
        JSON.stringify([
          { username: "HostPlayer", survived: true, story: "Host cleverly survived.", score: 8 },
          { username: "SecondPlayer", survived: false, story: "Second player did not make it.", score: 2 },
        ])
      );

      const revealingPromise = waitForPhase(p2, "revealing_results");
      await screen.findByPlaceholderText(/type your survival strategy/i, {}, { timeout: 5000 });
      await user.type(screen.getByPlaceholderText(/type your survival strategy/i), "run");
      await user.click(screen.getByRole("button", { name: /confirm/i }));
      p2.emit("submit_strategy", { strategyText: "hide" });
      await revealingPromise;

      // --- ride out the real reveal sequence for both players ---
      await screen.findByText(/YOUR FATE HAS BEEN SEALED/i, {}, { timeout: 5000 });
      await screen.findByText(/standings/i, {}, { timeout: 20000 });

      // --- standings shows both players with round 1 recorded ---
      expect(screen.getByText("HostPlayer")).toBeInTheDocument();
      expect(screen.getByText("SecondPlayer")).toBeInTheDocument();
      expect(screen.getByText(/OUT/i)).toBeInTheDocument(); // SecondPlayer eliminated

      // --- host continues; Elimination ends immediately (1 player left) ---
      const completePromise = waitForGameComplete(p2);
      await user.click(screen.getByRole("button", { name: /continue/i }));
      await completePromise;

      // --- podium winner screen ---
      await screen.findByText(/survivor|tie/i, {}, { timeout: 4000 });
      expect(screen.getAllByText("HostPlayer").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: /play again/i })).toBeInTheDocument();

      p2.disconnect();
    },
    40000
  );
});
