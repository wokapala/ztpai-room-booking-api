// Uruchamiane raz przed testami integracyjnymi: tworzy pustą bazę testową, jeżeli jeszcze nie istnieje.
// Schemat tworzą migracje w beforeAll poszczególnych plików testowych.
const { Client } = require("pg");
const { getTestDatabaseUrl } = require("./testDatabaseUrl");

module.exports = async () => {
  const url = new URL(getTestDatabaseUrl());
  const name = url.pathname.slice(1);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
};
