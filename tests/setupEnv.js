// Ustawiane przed załadowaniem modułu konfiguracji (src/config nie nadpisuje istniejących zmiennych).
const { getTestDatabaseUrl } = require("./testDatabaseUrl");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-not-used-anywhere-else-123";
process.env.JWT_EXPIRES_IN = "15m";
process.env.DATABASE_URL = getTestDatabaseUrl();
