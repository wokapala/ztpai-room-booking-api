const config = require("./config");
const { createApp } = require("./app");

// composition root - jedyne miejsce, w którym wybieramy implementację repositories
let unitOfWork;
if (config.REPOSITORY === "memory") {
  if (!config.SEED_PASSWORD) throw new Error("Set SEED_PASSWORD to use the in-memory repositories");
  const { createInMemoryUnitOfWork } = require("./db/unitOfWork.memory");
  unitOfWork = createInMemoryUnitOfWork(require("./db/memorySeed")(config.SEED_PASSWORD));
} else {
  const db = require("./db/knex");
  const { createKnexUnitOfWork } = require("./db/unitOfWork.knex");
  unitOfWork = createKnexUnitOfWork(db);
}

const app = createApp({ config, runInTransaction: unitOfWork.runInTransaction, now: () => new Date() });

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT} (repository: ${config.REPOSITORY})`);
});
