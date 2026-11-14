// Adres bazy testowej: TEST_DATABASE_URL ze środowiska (CI) albo z .env (lokalnie).
// Testy integracyjne czyszczą tabele, więc nigdy nie mogą trafić w bazę deweloperską.
function getTestDatabaseUrl() {
  try {
    process.loadEnvFile();
  } catch {
    // brak .env - np. w CI zmienne przychodzą ze środowiska
  }

  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL (see .env.example) to run integration tests");

  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests on "${name}" - test database name must end with _test`);
  }
  return url;
}

module.exports = { getTestDatabaseUrl };
