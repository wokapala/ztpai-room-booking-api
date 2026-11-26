const config = require("./config");
const { createApp } = require("./app");

// composition root - jedyne miejsce, w którym wybieramy implementację repositories
let unitOfWork;
let closeDatabase = async () => {};
if (config.REPOSITORY === "memory") {
  if (!config.SEED_PASSWORD) throw new Error("Set SEED_PASSWORD to use the in-memory repositories");
  const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");
  unitOfWork = createInMemoryUnitOfWork(require("./db/memorySeed")(config.SEED_PASSWORD));
} else {
  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
  unitOfWork = createKnexUnitOfWork(db);
  closeDatabase = () => db.destroy();
}

const app = createApp({ config, runInTransaction: unitOfWork.runInTransaction, now: () => new Date() });

const server = app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT} (repository: ${config.REPOSITORY})`);
});

// Graceful shutdown: przestajemy przyjmować połączenia, czekamy na trwające requesty,
// zamykamy pulę połączeń z bazą. Docker wysyła SIGTERM przy docker compose down / stop.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    await closeDatabase();
    console.log("HTTP server closed, database pool closed - bye");
    process.exit(0);
  });
  // keep-alive połączenia mogłyby trzymać server.close() w nieskończoność
  server.closeIdleConnections();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
