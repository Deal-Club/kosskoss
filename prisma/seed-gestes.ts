/**
 * Gestes du Diagnostic Beauté.
 *
 * Repris de la constante ROUTINE_STEPS qui vivait dans
 * src/server/kk/diagnostic.ts, avec les traductions anglaises qui lui
 * manquaient : un visiteur sur /en lisait « Nettoyer ».
 *
 * Idempotent : upsert sur la clé, relançable sans créer de doublon. Sur une
 * ligne existante, seuls les libellés sont rafraîchis — voir plus bas.
 *
 * Lancement : tsx prisma/seed-gestes.ts
 */
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const GESTES = [
  { key: "nettoyer", labelFr: "Nettoyer", labelEn: "Cleanse", category: "nettoyants" },
  { key: "traiter", labelFr: "Traiter", labelEn: "Treat", category: "traitements" },
  { key: "hydrater", labelFr: "Hydrater", labelEn: "Moisturise", category: "hydratants" },
  { key: "proteger", labelFr: "Protéger", labelEn: "Protect", category: "solaires" },
];

async function main() {
  for (const [index, geste] of GESTES.entries()) {
    await prisma.diagStep.upsert({
      where: { key: geste.key },
      // Sur une ligne existante, on ne met à jour QUE les libellés. Ni
      // `position`, ni `active`, ni `category` : ce sont des choix que le
      // client fait depuis l'administration, et un seed rejoué ne doit jamais
      // revenir dessus. C'est la leçon du seed des tags, au lot précédent.
      update: { labelFr: geste.labelFr, labelEn: geste.labelEn },
      create: { ...geste, position: index },
    });
  }
  console.log(`${GESTES.length} gestes en place.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
