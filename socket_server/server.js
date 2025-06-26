// Import necessary modules
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { connectToRedis } = require("./redis_client");
const { setupSocketIO } = require("./socket_handler");
const { serveHtmlPage } = require("./html_page");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

serveHtmlPage(app);

async function main() {
  const client = await connectToRedis();
  setupSocketIO(io, client);

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to run the application:", err);
  process.exit(1);
});
