// src/server/prisma.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getClient } from "./prisma";

/**
 * Remet une variable d'environnement à sa valeur d'avant test — `delete`
 * plutôt qu'une affectation à `undefined`, qui la transformerait en la
 * chaîne littérale "undefined" (process.env ne stocke que des chaînes).
 */
function restaurer(cle: "DATABASE_URL", valeurOrigine: string | undefined): void {
  if (valeurOrigine === undefined) delete process.env[cle];
  else process.env[cle] = valeurOrigine;
}

/**
 * Écrit NODE_ENV. Next.js déclare cette clé `readonly` dans son augmentation
 * de `ProcessEnv` (node_modules/next/types/global.d.ts) : une affectation
 * directe (`process.env.NODE_ENV = ...`) est donc rejetée par `tsc` alors
 * qu'elle fonctionnerait très bien à l'exécution — `npm test` (qui transpile
 * via tsx sans vérifier les types) resterait vert, mais `npm run build`
 * échouerait. `Object.defineProperty` contourne le type sans recourir à
 * `any` : on redéfinit la propriété plutôt que de l'assigner.
 */
function definirNodeEnv(valeur: string | undefined): void {
  if (valeur === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    return;
  }
  Object.defineProperty(process.env, "NODE_ENV", {
    value: valeur,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

test("getClient mémorise le client Prisma y compris en production", () => {
  // C'est précisément le cas qui a cassé : avant ce correctif, la
  // mémorisation dans globalThis n'avait lieu que hors production. En
  // production, chaque accès reconstruisait donc un nouveau client — un
  // nouveau pool `pg` de dix connexions jamais fermé — sur la base Neon de
  // production. Ce test verrouille l'unicité de la référence rendue par
  // deux appels successifs à getClient(), sous NODE_ENV=production.
  const nodeEnvOrigine = process.env.NODE_ENV;
  const databaseUrlOrigine = process.env.DATABASE_URL;

  try {
    definirNodeEnv("production");
    // Syntaxiquement valide mais jamais joignable : Prisma/pg n'ouvrent de
    // connexion réelle qu'à la première requête émise, et ce test n'en émet
    // aucune — il reste entièrement hors ligne.
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/db?sslmode=disable";

    assert.equal(getClient(), getClient());
  } finally {
    definirNodeEnv(nodeEnvOrigine);
    restaurer("DATABASE_URL", databaseUrlOrigine);
  }
});
