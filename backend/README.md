# Death by AI — Backend

Room creation, joining, host migration, game-mode/personality selection, round-robin scenario-writer assignment, the round phase state machine, real scenario/strategy submission with server-authoritative timers, the Groq AI judging call, round history tracking, ranked standings, and Play Again, over Socket.io. This is the complete backend for the game loop — Stage 8 is deployment instructions, not more app code.

Two small additions came from later frontend stages needing them: submission text is included in the serialized state once judging starts (Stage 6's board-flip card needed it — it stays hidden during `writing_prompts` so nobody can peek at another player's strategy before everyone's submitted), and `computeStandings`/history tracking (Stage 7's Standings and Winner screens needed real data to render).

## Set up

```bash
npm install
cp .env.example .env
```

Edit `.env` and add a real `GROQ_API_KEY` (free at [console.groq.com](https://console.groq.com)) if you want real judging — without one, rounds still work end-to-end, they just always fall back to a generic "the AI couldn't reach a verdict" result (see below).

## Run it locally

```bash
npm start
```

Server listens on `http://localhost:3001` by default. `GET /health` returns `{"status": "ok"}` if the server is up.

## Verify it yourself

**Important limitation of this environment:** I can't reach `api.groq.com` from this sandbox (only a specific allowlist of domains is reachable), so I couldn't test a real live call to Groq myself. What I *could* do, and did: separate the prompt-building and response-parsing logic from the network call so both are fully unit-testable without a network, and build a tiny local mock server that speaks the same shape as Groq's chat completions endpoint, so the real `fetch()` call, retry logic, and error handling are all exercised for real — just against a stand-in server instead of the actual internet. You (or a session with real internet access) should still do one live playthrough with a real `GROQ_API_KEY` before trusting this in front of friends.

Six test suites, none of the logic mocked (only the network destination is, and only in the ones that say so):

```bash
# Pure logic — no server, no network, all instant:
node --test test-game-logic.js          # round-robin, disconnects, elimination, timers
node --test test-groq-judge.js          # prompt building, response parsing, fallback shape

# Real HTTP call, against a local mock Groq server (not the real internet):
node --test test-groq-judge-integration.js

# Full socket-level integration — start a real server first:
npm start                                          # terminal 1
npm install                                        # (socket.io-client is a devDependency)
node test-integration.js                           # terminal 2 — Stage 1: rooms/lobby
node test-integration-stage3.js                    #            — Stage 3: start_game, phase machine, writer reassignment
node test-integration-stage4.js                    #            — Stage 4: scenario/strategy submission + a REAL 15s timer test
```

Stage 5's full end-to-end test needs the server started with its own `GROQ_API_KEY`/`GROQ_API_BASE_URL` pointed at the test's mock server:

```bash
GROQ_API_KEY=test-key GROQ_API_BASE_URL=http://localhost:4570 npm start   # terminal 1
node test-integration-stage5.js                                            # terminal 2
```

`run-mock-groq-server.js` starts the same mock server as its own standalone process with an HTTP control endpoint (`POST /__queue`), for cases where the thing driving the test isn't in the same Node process — the frontend's Stage 6 test uses this, since it's a separate `vitest` process from the backend server it's testing against:

```bash
node run-mock-groq-server.js 4571
# then, from anywhere: curl -X POST http://localhost:4571/__queue -d '{"content":"..."}' -H 'Content-Type: application/json'
```

All should print nothing but `PASS` lines. `test-integration-stage3.js` occasionally prints one `SKIP` line (random shuffle happened to make the host the round-2 writer) — expected, not a failure.

Stage 7's test plays two full rounds (submitting, judging via the mock server, continuing) plus drives the game all the way to completion and Play Again — it's the most thorough single test file, worth running whenever touching `game.js`'s round-progression logic:

```bash
GROQ_API_KEY=test-key GROQ_API_BASE_URL=http://localhost:4572 npm start   # terminal 1
node test-integration-stage7.js                                            # terminal 2
```

## Socket events

**Client → Server**
- `create_room` — `{ username, avatarId }` → responds with `room_created`
- `join_room` — `{ roomCode, username, avatarId }` → responds with `room_joined`, broadcasts `room_updated`
- `set_game_mode` — `{ gameMode }`, host-only — `judgement_day` / `blitz` / `elimination`
- `set_ai_personality` — `{ aiPersonality }`, host-only — `grim_reaper` / `wholesome` / `savage`
- `start_game` — host-only, needs ≥2 connected players, can't be called twice. Shuffles active players into a fixed turn order, assigns round 1's scenario writer, arms the scenario timer, broadcasts `room_updated`
- `submit_scenario` — `{ scenarioText }`, only the current `scenarioWriterId`, only while `phase === "waiting_for_scenario"`. Moves to `writing_prompts`, arms the strategy timer
- `submit_strategy` — `{ strategyText }`, any active player, once per round, only while `phase === "writing_prompts"`. If everyone active has now submitted, moves straight to `judging`
- `continue_after_round` — host-only, only while `phase === "revealing_results"` and the game isn't already complete. Moves to the next round (new writer, fresh timer), UNLESS the mode's round count is reached or Elimination's early-end condition is met — in which case it sets `gameComplete = true` instead. This is the real trigger the frontend's Standings screen "Continue" button uses; it does the same job `debug_advance_phase` was standing in for
- `debug_advance_phase` — **dev/test hook, not a real player action.** Steps the round phase machine forward one step, or into the next round once past `round_complete`. Landing on `judging` this way triggers a real judging call too, same as reaching it normally.

**Server → Client**
- `room_created`, `room_joined` — full room state, sent to the requester
- `room_updated` — full room state, broadcast to everyone in the room whenever players, settings, or round state change (including server-driven timer fallbacks and judging results arriving)
- `error_event` — `{ type, message }` — types: `invalid_username`, `room_not_found`, `room_full`, `username_taken`, `not_host`, `invalid_game_mode`, `invalid_ai_personality`, `cannot_start`, `not_scenario_writer`, `cannot_submit_scenario`, `cannot_submit_strategy`, `cannot_continue`

## Room state shape

```js
{
  code: "78UW",
  players: [
    { id, username, avatarId, isHost, connected, eliminated }
  ],
  gameMode: "judgement_day",
  aiPersonality: "grim_reaper",
  game: null, // or, once started:
  // {
  //   started: true,
  //   totalRounds: 5,       // null for elimination — see roundCap instead
  //   roundCap: null,       // 10 for elimination mode
  //   currentRound: 1,
  //   phase: "waiting_for_scenario",
  //   scenarioWriterId: "socket123",
  //   gameComplete: false,
  //   currentScenario: null,        // set once the writer submits
  //   scenarioDeadline: 1720000000000,  // epoch ms, or null before armed
  //   strategyDeadline: null,
  //   submittedPlayerIds: [],       // who has submitted a strategy this round — not what they wrote
  //   submissions: null,             // null during writing_prompts; { playerId: strategyText } once judging starts
  //   results: null,                // [{ username, survived, story, score }] once judging finishes
  //   standings: [ ... ],            // ranked, recomputed fresh every serialize — see below
  // }
}
```

## How standings, history, and Play Again work (game.js)

The instant `judgeRound()` resolves, `recordJudgingResults` does three things: stores `results`, appends each active player's `{ survived, score }` onto `room.game.history[playerId]` (a running array, oldest round first — this is what makes the Standings screen's per-round icon row possible), and — Elimination mode only — sets `player.eliminated = true` for anyone who didn't survive.

`computeStandings(room)` derives everything the frontend needs from that history: survival count, average score (flavor only, never affects ranking), and a rank using standard competition ranking (ties share a rank — 1, 1, 3, 4 — which is exactly what makes co-winners work: anyone ranked 1 is a winner). It's recomputed on every `serializeGame` call rather than cached, since it's cheap over a handful of players and there's no correctness risk to keeping it always fresh.

Play Again doesn't have its own event — it just calls `start_game` again. `startGame`'s guard only blocks a second call while a game is genuinely in progress (`started && !gameComplete`); once the game is complete, calling it again is exactly what Play Again needs: fresh shuffle, round 1, and (new this stage) every player's `eliminated` flag reset to `false`. Since `room.game` is fully replaced with a new object each time, `history` starts empty automatically — no separate reset code needed.

**Why there's no server phase for "showing standings":** `phase` stays `revealing_results` all the way through the per-player reveal AND the Standings screen — there's no separate phase for the latter. That's deliberate: each client paces its own reveal animation independently (per the gamefeel brief), so if the server changed `phase` the moment the *fastest* client finished watching, every other client's `GameScreen` would immediately re-route away from whatever they were still mid-animation on. Showing Standings is a purely local decision each client makes once *its own* `RevealSequence` finishes iterating every player. The only thing that's genuinely server-authoritative again is `continue_after_round` — a real player action, host-only, gated on the phase.

## How the round-robin assignment actually works (game.js)

Turn order is a fixed shuffle of active players, decided once at game start. A single rotating pointer (`nextWriterSearchIndex`) walks that fixed order round by round, skipping anyone currently inactive (disconnected, or eliminated in Elimination mode) — this is what gives the "nobody gets a 2nd turn until everyone's had 1" fairness property for free, without needing to track per-player turn counts separately. If the *current* round's writer disconnects before submitting a scenario, the same lookup re-runs starting from that writer's own slot in the order, which naturally skips them (now inactive) and lands on the next active player.

## How the timers work (game.js)

Both the scenario and strategy phases arm a real server-side `setTimeout` the moment they're entered, using per-mode durations (`getTimerConfig`). If the phase is still active when the timer fires, it auto-advances: a random preset scenario for an unsubmitted writer, or empty strings for anyone who never submitted a strategy. Submitting for real before the timer fires clears it — no double-fire. A disconnect during `writing_prompts` re-checks whether everyone still active has already submitted, and finalizes immediately if so, rather than sitting out a pointless timer. `armScenarioTimer`/`armStrategyTimer` accept an optional override duration for tests — production code never passes one, so it always uses the real per-mode timing.

## How the AI judging works (groqJudge.js)

The moment the room's phase becomes `judging` (however it got there — last strategy submitted, the strategy timer firing, or a disconnect finalizing the round), `socketHandlers.js`'s `broadcastAndMaybeJudge` kicks off `judgeRound()` in the background and broadcasts the "judging" state immediately so clients see the spinner. `judgeRound()`:

1. Builds one system prompt (tone depends on the room's AI Personality) and one user prompt containing the scenario and every active player's strategy, each wrapped in `<player>`/`<username>`/`<strategy>` tags with the values XML-escaped. The system prompt explicitly instructs the model to treat everything inside those tags as narrative content, never as instructions — this is the prompt-injection guard the brief calls for.
2. Calls Groq's chat completions endpoint (`llama-3.3-70b-versatile`).
3. Defensively parses the response: strips markdown code fences if present, requires valid JSON, requires every active player's username to actually appear in the result.
4. On ANY failure (network error, non-2xx, malformed JSON, a missing player) it retries once with a stricter reminder appended to the prompt. A second failure falls back to a generic result for every active player — survived defaults to `true` on fallback, so a technical glitch doesn't cost anyone the round.
5. Stores the results on `room.game.results` and moves the phase to `revealing_results`, broadcasting again.

`score` is included in every result but nothing reads it yet for ranking — per the brief, it's flavor only; Stage 7 may surface it as a supplementary stat.



