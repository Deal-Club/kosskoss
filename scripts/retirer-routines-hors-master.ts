/**
 * Retire de la vitrine les routines qui ne viennent pas du master du client.
 *
 * ── POURQUOI DÉSACTIVER PLUTÔT QUE SUPPRIMER ────────────────────────────────
 *
 * Le client a demandé de retirer les cinq routines historiques, remplacées par
 * les quatorze du master. « Retirer » veut dire « ne plus les montrer », et la
 * désactivation le fait : elles disparaissent de la vitrine, des recommandations
 * et du méga-menu.
 *
 * La suppression, elle, emporterait aussi leurs gestes en cascade, et rien ne
 * les ramènerait. Sur une base partagée avec la production, une opération
 * irréversible ne se fait pas au détour d'un lot de contenu : si le client
 * veut vraiment les effacer, cela se décide en connaissance de cause, et cela
 * reste possible ensuite. L'inverse n'est pas vrai.
 *
 * Le script est idempotent : relancé, il ne trouve plus rien à désactiver.
 *
 *   npx tsx scripts/retirer-routines-hors-master.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { prisma } from "../src/server/prisma";

async function main() {
  // `code` est renseigné par l'import du master. Une routine sans code n'en
  // vient pas : c'est le seul critère fiable, le nom et le slug pouvant changer.
  const horsMaster = await prisma.routine.findMany({
    where: { code: null },
    select: { id: true, slug: true, name: true, active: true },
    orderBy: { slug: "asc" },
  });

  const aDesactiver = horsMaster.filter((routine) => routine.active);

  console.log(`Routines hors master : ${horsMaster.length}`);
  console.log(`Déjà retirées        : ${horsMaster.length - aDesactiver.length}`);
  console.log(`À retirer            : ${aDesactiver.length}`);

  for (const routine of aDesactiver) {
    await prisma.routine.update({ where: { id: routine.id }, data: { active: false } });
    console.log(`  retirée : ${routine.slug} (${routine.name})`);
  }

  // Relecture indépendante : on ne se fie pas au compte rendu de l'écriture.
  const restantes = await prisma.routine.count({ where: { code: null, active: true } });
  const duMaster = await prisma.routine.count({ where: { NOT: { code: null }, active: true } });
  console.log(`Vérification : ${restantes} routine(s) hors master encore visible(s), ${duMaster} du master visibles.`);
}

void main().finally(() => prisma.$disconnect());
