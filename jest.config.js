// Dwa projekty: unit testy nie potrzebują bazy (działają przy wyłączonym PostgreSQL),
// integracyjne dostają osobną bazę testową przygotowaną w globalSetup.
module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.test.js"]
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
      globalSetup: "<rootDir>/tests/globalSetup.js",
      setupFiles: ["<rootDir>/tests/setupEnv.js"]
    }
  ]
};
