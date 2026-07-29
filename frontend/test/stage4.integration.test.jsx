import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { io } from "socket.io-client";
import App from "../src/App";

const BACKEND_URL = "http://localhost:3001";

describe("Stage 4: scenario picker, transitions, strategy writing", () => {
  beforeAll(async () => {
    const probe = await fetch(`${BACKEND_URL}/health`).catch(() => null);
    if (!probe?.ok) {
      throw new Error(
        `Backend not reachable at ${BACKEND_URL} — start it first: cd backend && npm start`
      );
    }
  });

  it(
    "plays a full round: scenario pick, transition beats, simultaneous strategy writing",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      // --- host creates a room ---
      const nameInput = await screen.findByLabelText(/your name/i);
      await user.type(nameInput, "HostPlayer");
      await user.click(screen.getByRole("button", { name: /create room/i }));
      const roomCodeEl = await screen.findByText(/^[A-Z0-9]{4}$/, {}, { timeout: 8000 });
      const roomCode = roomCodeEl.textContent.trim().slice(0, 4);

      // --- a second real player joins directly via socket, and starts the game ---
      const p2 = io(BACKEND_URL, { transports: ["websocket"] });
      await new Promise((resolve) => p2.on("connect", resolve));
      const joinedRoom = await new Promise((resolve) => {
        p2.emit("join_room", { roomCode, username: "SecondPlayer", avatarId: "blob-02" });
        p2.once("room_joined", resolve);
      });

      await waitFor(() => expect(screen.getByText(/2\/8/)).toBeInTheDocument());

      const startedPromise = new Promise((resolve) => p2.once("room_updated", resolve));
      await user.click(screen.getByRole("button", { name: /start/i }));
      const started = await startedPromise;

      const hostPlayer = joinedRoom.players.find((p) => p.username === "HostPlayer");
      const hostIsWriter = hostPlayer?.id === started.game.scenarioWriterId;

      if (hostIsWriter) {
        // --- host is the writer: sees the picker, accepts a preset ---
        await screen.findByText(/confirm your scenario/i);
        const acceptButton = screen.getByRole("button", { name: /accept/i });
        expect(acceptButton).not.toBeDisabled();

        const p2SeesTransitionPromise = new Promise((resolve) => {
          p2.once("room_updated", (room) => {
            if (room.game.phase === "writing_prompts") resolve(room);
          });
        });
        await user.click(acceptButton);
        await p2SeesTransitionPromise;
      } else {
        // --- p2 is the writer: submit a scenario directly over its socket ---
        await screen.findByText(/is selecting a scenario/i);
        const scenarioAccepted = new Promise((resolve) => p2.once("room_updated", resolve));
        p2.emit("submit_scenario", { scenarioText: "You are stuck in traffic during a meteor shower" });
        await scenarioAccepted;
      }

      // --- everyone sees the transition beats, then the strategy screen ---
      await screen.findByText(/scenario incoming/i, {}, { timeout: 3000 });
      await screen.findByText(/HostPlayer tries to/i, {}, { timeout: 5000 });

      const promptBar = screen.getByText(/^Prompt:/);
      expect(promptBar).toBeInTheDocument();

      // --- host submits a strategy ---
      const textarea = screen.getByPlaceholderText(/type your survival strategy/i);
      await user.type(textarea, "climb onto the roof of the car");
      await user.click(screen.getByRole("button", { name: /confirm/i }));

      await screen.findByText(/waiting for others/i);

      // --- second player submits too, via raw socket — round should move to judging ---
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

      const judgingPromise = waitForPhase(p2, "judging");
      // With no GROQ_API_KEY set for this test's server, judging falls back
      // near-instantly — register this BEFORE emitting so it can't miss a
      // fast transition straight through to revealing_results.
      const revealingPromise = waitForPhase(p2, "revealing_results");

      p2.emit("submit_strategy", { strategyText: "hide under an overpass" });
      const judgingState = await judgingPromise;
      expect(judgingState.game.phase).toBe("judging");
      const revealedState = await revealingPromise;
      expect(revealedState.game.results.length).toBe(2);

      // Stage 6's real reveal sequence should now be rendering — the
      // fate-sealed beat shows for a couple seconds, giving this a
      // reliable window to catch, unlike the instant judging flash.
      await screen.findByText(/YOUR FATE HAS BEEN SEALED/i, {}, { timeout: 4000 });

      p2.disconnect();
    },
    25000
  );
});
