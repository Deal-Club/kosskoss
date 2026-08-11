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
      // Mesuré sur cette base : la REQUÊTE prend 221 ms, mais OUVRIR une
      // connexion en demande 2 000 à 3 000. Le calcul est en `us-east-2`,
      // les postes de travail sont en Europe : l'établissement TLS et
      // l'authentification Postgres coûtent chacun plusieurs allers-retours
      // transatlantiques. S'y ajoute le réveil du calcul Neon, mis en veille
      // après inactivité, qui peut demander plusieurs secondes de plus.
      //
      // Une page comme le catalogue lance trois requêtes en parallèle : sur un
      // pool froid, ce sont trois ouvertures simultanées, et l'ancien plafond
      // de quinze secondes était atteint — d'où les « timeout exceeded when
      // trying to connect » intermittents, toujours après un moment sans
      // activité, jamais en usage soutenu.
      connectionTimeoutMillis: 30_000,
      // Conserver les connexions ouvertes plus longtemps en développement :
      // chaque réouverture coûte les 2 à 3 secondes ci-dessus, et un poste de
      // travail alterne des rafales de requêtes et de longues pauses. En
      // production, les sessions restent courtes — le pooler Neon préfère, et
      // le calcul est facturé au temps d'activité.
      idleTimeoutMillis: process.env.NODE_ENV === "production" ? 30_000 : 300_000,
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
