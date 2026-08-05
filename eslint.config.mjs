import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dossiers de travail hors application : scripts de récupération d'assets
    // et captures de navigateur. Ils ne partent pas en production et ne suivent
    // pas les règles du projet.
    ".tmp-*/**",
    ".playwright-mcp/**",
    // Client Prisma généré : code machine, jamais relu à la main.
    "src/generated/**",
  ]),
  {
    // Point d'entrée de Passenger. Il est exécuté par Node tel quel, sans
    // passer par le compilateur de Next : `require` y est la seule forme
    // d'import possible.
    files: ["server.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
