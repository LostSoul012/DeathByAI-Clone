// run-mock-groq-server.js
// Starts the mock Groq server as its own process, controllable via HTTP
// POST to /__queue from any other process (e.g. a frontend test driving a
// separately-started backend server). Usage: node run-mock-groq-server.js [port]
const { createMockGroqServer } = require("./test-mock-groq-server");

const port = Number(process.argv[2]) || 4571;
const mock = createMockGroqServer();
mock.listen(port).then(() => {
  console.log(`Mock Groq server listening on port ${port}`);
});
