const { z } = require("zod");

try {
  process.loadEnvFile();
} catch {
  // brak pliku .env - zmienne mogą przyjść z zewnątrz
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "DATABASE_URL must be a valid postgres:// URL"
  }),
  JWT_SECRET: z.string({ error: "JWT_SECRET is required" })
    .min(32, "JWT_SECRET must have at least 32 characters"),
  JWT_EXPIRES_IN: z.string()
    .regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN must look like 10s, 15m, 1h or 1d")
    .default("15m"),
  REPOSITORY: z.enum(["knex", "memory"]).default("knex"),
  // hasło kont z seeda - potrzebne tylko do seed:run i skryptów testowych
  SEED_PASSWORD: z.string().min(10, "SEED_PASSWORD must have at least 10 characters").optional()
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

module.exports = Object.freeze(result.data);
