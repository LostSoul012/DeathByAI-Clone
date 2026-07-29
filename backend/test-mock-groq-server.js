// test-mock-groq-server.js
// A tiny local stand-in for Groq's chat completions endpoint, so tests can
// exercise the REAL fetch() call in groqJudge.js — retries, malformed
// JSON, HTTP errors — without needing actual internet access (api.groq.com
// isn't reachable from this environment anyway).
const http = require("node:http");

function createMockGroqServer() {
  const responseQueue = [];
  let requestLog = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsedBody = JSON.parse(body || "{}");

      // Control endpoint for queuing a response from a SEPARATE process
      // (e.g. a frontend test driving a backend server that was started
      // independently, pointed at this mock server via GROQ_API_BASE_URL).
      if (req.url === "/__queue" && req.method === "POST") {
        if (parsedBody.status && parsedBody.status !== 200) {
          responseQueue.push({ status: parsedBody.status, errorMessage: parsedBody.errorMessage });
        } else {
          responseQueue.push({ status: 200, content: parsedBody.content });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ queued: true }));
        return;
      }

      requestLog.push(parsedBody);

      const next = responseQueue.shift() ?? { status: 200, content: "[]" };

      if (next.status !== 200) {
        res.writeHead(next.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: next.errorMessage ?? "mock error" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: next.content } }],
        })
      );
    });
  });

  return {
    server,
    listen(port) {
      return new Promise((resolve) => server.listen(port, resolve));
    },
    close() {
      return new Promise((resolve) => server.close(resolve));
    },
    // Queue a successful response with the given raw `content` string
    // (exactly what would go in choices[0].message.content).
    queueSuccess(content) {
      responseQueue.push({ status: 200, content });
    },
    // Queue an HTTP error response (network/server failure simulation).
    queueError(status, errorMessage) {
      responseQueue.push({ status, errorMessage });
    },
    getRequestLog() {
      return requestLog;
    },
    reset() {
      responseQueue.length = 0;
      requestLog = [];
    },
  };
}

module.exports = { createMockGroqServer };
