const test = require("node:test");
const assert = require("node:assert/strict");
const { createMockGroqServer } = require("./test-mock-groq-server");
const { judgeRound } = require("./groqJudge");

const PORT = 4569;

function makeRoom() {
  return {
    code: "TEST",
    gameMode: "judgement_day",
    aiPersonality: "grim_reaper",
    players: [
      { id: "p0", username: "Alice", connected: true, eliminated: false },
      { id: "p1", username: "Bob", connected: true, eliminated: false },
    ],
    game: {
      currentScenario: "You are stranded on a sinking ship",
      submissions: { p0: "swim to shore", p1: "build a raft" },
    },
  };
}

const VALID_RESPONSE = JSON.stringify([
  { username: "Alice", survived: true, story: "Alice swam heroically to shore.", score: 8 },
  { username: "Bob", survived: false, story: "Bob's raft fell apart immediately.", score: 2 },
]);

test("groqJudge against a mock server", async (t) => {
  const mock = createMockGroqServer();
  await mock.listen(PORT);
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_API_BASE_URL = `http://localhost:${PORT}`;

  t.afterEach(() => mock.reset());
  t.after(async () => {
    await mock.close();
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_BASE_URL;
  });

  await t.test("succeeds on the first attempt with a clean response", async () => {
    mock.queueSuccess(VALID_RESPONSE);
    const results = await judgeRound(makeRoom());

    assert.equal(results.length, 2);
    assert.equal(results.find((r) => r.username === "Alice").survived, true);
    assert.equal(results.find((r) => r.username === "Bob").survived, false);
    assert.equal(mock.getRequestLog().length, 1); // no retry needed
  });

  await t.test("retries once on malformed JSON, then succeeds", async () => {
    mock.queueSuccess("this is not JSON at all");
    mock.queueSuccess(VALID_RESPONSE);
    const results = await judgeRound(makeRoom());

    assert.equal(results.length, 2);
    assert.equal(mock.getRequestLog().length, 2);
    // The retry's user prompt should include the stricter reminder.
    const secondRequest = mock.getRequestLog()[1];
    const secondUserMessage = secondRequest.messages.find((m) => m.role === "user").content;
    assert.match(secondUserMessage, /IMPORTANT/);
  });

  await t.test("falls back to generic results after two malformed responses", async () => {
    mock.queueSuccess("still not JSON");
    mock.queueSuccess("nope, also not JSON");
    const results = await judgeRound(makeRoom());

    assert.equal(mock.getRequestLog().length, 2);
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.survived === true)); // fallback default
    assert.match(results[0].story, /couldn't reach a verdict/);
  });

  await t.test("retries once on an HTTP error, then succeeds", async () => {
    mock.queueError(500, "internal error");
    mock.queueSuccess(VALID_RESPONSE);
    const results = await judgeRound(makeRoom());

    assert.equal(results.length, 2);
    assert.equal(mock.getRequestLog().length, 2);
  });

  await t.test("falls back after two consecutive HTTP errors", async () => {
    mock.queueError(500, "internal error");
    mock.queueError(503, "still down");
    const results = await judgeRound(makeRoom());

    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.survived === true));
  });

  await t.test("falls back if the response is missing an expected player", async () => {
    const incomplete = JSON.stringify([{ username: "Alice", survived: true, story: "ok", score: 5 }]);
    mock.queueSuccess(incomplete);
    mock.queueSuccess(incomplete); // still missing Bob on retry
    const results = await judgeRound(makeRoom());

    assert.equal(results.length, 2); // fallback covers both players
    assert.ok(results.every((r) => r.survived === true));
  });

  await t.test("sends the request in the shape Groq's chat completions API expects", async () => {
    mock.queueSuccess(VALID_RESPONSE);
    await judgeRound(makeRoom());
    const req = mock.getRequestLog()[0];

    assert.equal(req.model, "llama-3.3-70b-versatile");
    assert.equal(req.messages[0].role, "system");
    assert.equal(req.messages[1].role, "user");
    assert.match(req.messages[0].content, /judge/i);
  });

  await t.test("falls back immediately (no real delay) when GROQ_API_KEY is unset", async () => {
    delete process.env.GROQ_API_KEY;
    const results = await judgeRound(makeRoom());
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.survived === true));
    assert.equal(mock.getRequestLog().length, 0); // never even reached the mock server
    process.env.GROQ_API_KEY = "test-key"; // restore for any subtests after this one
  });
});
