import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// La connexion dépend uniquement de DATABASE_URL :
//   postgresql://user:pw@host/db?sslmode=require  -> PostgreSQL (Neon)
// Le schéma Prisma est figé sur le provider « postgresql » : changer de moteur
// demanderait de le régénérer, pas seulement de changer cette variable.
function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL est absente : la base ne peut pas être ouverte.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      // Neon met le calcul en veille après une période d'inactivité : le
      // premier appel qui le réveille peut demander plusieurs secondes.
      connectionTimeoutMillis: 15_000,
      // Une connexion inactive est rendue au bout de trente secondes plutôt
      // que gardée ouverte : Neon facture le temps de calcul, pas les
      // connexions, et le pooler préfère des sessions courtes.
      idleTimeoutMillis: 30_000,
      max: 10,
    }),
  });
}

// En développement, le client survit au rechargement à chaud : sinon chaque
// enregistrement de fichier ouvrirait de nouvelles connexions.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Mémorisation dans une variable de module : elle doit être inconditionnelle,
// quel que soit NODE_ENV. `globalThis` ne sert qu'au rechargement à chaud du
// développement, qui réévalue les modules — pas à la mémorisation elle-même.
// (Une mémorisation conditionnée à `NODE_ENV !== "production"` a longtemps
// été sans conséquence, tant que le client était construit une seule fois à
// l'évaluation du module. Une fois cette construction déplacée derrière un
// Proxy déclenché à chaque accès de propriété, la même garde rappelait
// `createClient()` — donc un nouveau pool `pg` de dix connexions jamais
// fermé — à chaque `prisma.product`, chaque `prisma.$transaction`, en
// production. Voir `getClient` et `src/server/prisma.test.ts`.)
let client: PrismaClient | undefined;

/**
 * Rend le client, en l'ouvrant au premier appel. La variable de module suffit
 * à garantir l'unicité dans un processus ; `globalThis` ne sert qu'au
 * rechargement à chaud du développement, qui réévalue les modules.
 */
export function getClient(): PrismaClient {
  client ??= globalForPrisma.prisma ?? createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

/**
 * Client instancié à la première utilisation plutôt qu'à l'import : un module
 * qui importe merchant.ts pour sa logique pure — les tests, par exemple — n'a
 * pas à disposer d'une base.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_cible, propriete) {
    const cible = getClient();
    const valeur: unknown = Reflect.get(cible, propriete);
    // Les méthodes Prisma (ex. product.findMany) accèdent à `this` en interne :
    // les renvoyer telles quelles depuis le Proxy les détacherait du client
    // réel. On les relie explicitement pour préserver leur contexte.
    return typeof valeur === "function" ? valeur.bind(cible) : valeur;
  },
});
