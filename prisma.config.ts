import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Même ordre de priorité que Next.js : .env.local (secrets, non versionné)
// l'emporte sur .env. Sans ça, la CLI Prisma et l'application ne viseraient pas
// forcément la même base.
// `quiet` est indispensable : la bannière de dotenv part sur la sortie standard
// et se retrouverait au milieu du SQL produit par `prisma migrate diff`.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
