import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { io } from "socket.io-client";
import App from "../src/App";

const BACKEND_URL = "http://localhost:3001";

describe("Stage 2 lobby, against the real Stage 1 backend", () => {
  beforeAll(async () => {
    // Fail fast with a clear message if the backend isn't running, rather
    // than a confusing timeout deep in a test.
    const probe = await fetch(`${BACKEND_URL}/health`).catch(() => null);
    if (!probe?.ok) {
      throw new Error(
        `Backend not reachable at ${BACKEND_URL} — start it first: cd backend && npm start`
      );
    }
  });

  it(
    "covers the full lobby flow in one session: create, avatar, live join, game mode",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      // --- name + avatar + create room ---
      const nameInput = await screen.findByLabelText(/your name/i);
      await user.type(nameInput, "TestHost");
      await user.click(screen.getByRole("radio", { name: "Avatar 3" }));
      await user.click(screen.getByRole("button", { name: /create room/i }));

      const roomCodeEl = await screen.findByText(/^[A-Z0-9]{4}$/, {}, { timeout: 8000 });
      const roomCode = roomCodeEl.textContent.trim().slice(0, 4);

      expect(screen.getByText(/1\/8/)).toBeInTheDocument();
      expect(screen.getByText("TestHost")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
      expect(screen.getByText(/need at least 2 players/i)).toBeInTheDocument();

      // --- a second real player joins from a separate connection ---
      const secondClient = io(BACKEND_URL, { transports: ["websocket"] });
      await new Promise((resolve) => secondClient.on("connect", resolve));
      secondClient.emit("join_room", { roomCode, username: "Friend", avatarId: "blob-02" });
      await new Promise((resolve) => secondClient.once("room_joined", resolve));

      await waitFor(() => expect(screen.getByText("Friend")).toBeInTheDocument());
      expect(screen.getByText(/2\/8/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start/i })).not.toBeDisabled();

      // --- host changes game mode, sees it reflected immediately ---
      expect(screen.getByRole("radio", { name: /judgement day/i })).toHaveAttribute(
        "aria-checked",
        "true"
      );
      await user.click(screen.getByRole("radio", { name: /blitz/i }));
      await waitFor(() =>
        expect(screen.getByRole("radio", { name: /blitz/i })).toHaveAttribute("aria-checked", "true")
      );

      // --- second client disconnects, host UI should reflect it ---
      secondClient.disconnect();
      await waitFor(() => expect(screen.getByText(/reconnecting/i)).toBeInTheDocument(), {
        timeout: 8000,
      });
    },
    25000
  );
});
