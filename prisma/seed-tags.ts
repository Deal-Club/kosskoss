/**
 * ⚠️ AVERTISSEMENT (tâche 10) — le vocabulaire ci-dessous est désormais
 * modifiable par le client depuis /admin/products/tags (libellés FR/EN,
 * famille, ordre, activation). Ce seed écrase `family`, `labelFr` et `labelEn`
 * à chaque exécution (seule `position` et `active` sont protégés, voir plus
 * bas) : relancer `npm run db:seed` après que le client a modifié un libellé
 * ou une famille depuis l'écran d'administration effacera silencieusement sa
 * modification. Ne pas relancer ce script en aveugle une fois le site en
 * production.
 *
 * Vocabulaire des tags produits, relevé sur les données existantes.
 *
 * Les clés ci-dessous ne sont pas inventées : elles sont le résultat de la
 * requête suivante, exécutée sur la base (produits actifs + réponses du
 * diagnostic) —
 *
 *   const vues = new Set();
 *   for (const p of produits) for (const t of JSON.parse(p.tags || "[]")) vues.add(t);
 *   for (const r of reponses) for (const k of Object.keys(JSON.parse(r.tags || "{}"))) vues.add(k);
 *
 * Seules les familles « peau » et « preoccupation » deviennent des facettes de
 * catalogue (tâches suivantes) ; les autres tags restent au service du
 * diagnostic et du merchandising interne :
 *   — « budget » : préférence de gamme de prix, lue par buildRoutine()
 *     (src/server/kk/diagnostic.ts) pour départager les candidats à score égal ;
 *   — « categorie » : rayons du catalogue distincts des soins visage (corps,
 *     homme, hygiène — voir prisma/data/kk-catalog.json) ;
 *   — « geste » : l'étape de routine que sert le produit (nettoyer, tonifier,
 *     traiter, protéger du soleil), reprise telle quelle dans seed-routines.ts
 *     et diagnostic.ts ;
 *   — « texture » : une propriété de formule (finition matifiante), ni un type
 *     de peau ni une préoccupation en soi.
 *
 * Deux tags sont d'une famille arbitrée plutôt qu'évidente — voir le rapport
 * de la tâche 7 pour le détail : « apaisant » est rangé en préoccupation
 * (l'irritation est une préoccupation au même titre que le manque d'éclat),
 * et « solaire » en geste (il désigne la catégorie « solaires », comme
 * « nettoyage »/« toner »/« traitement » désignent nettoyants/toniques/
 * traitements) plutôt qu'en préoccupation.
 *
 * Idempotent : upsert sur la clé, relançable sans créer de doublon.
 *
 * Lancement : tsx prisma/seed-tags.ts
 */
import { config as loadEnv } from "dotenv";
import { prisma } from "../src/server/prisma";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const VOCABULAIRE: { key: string; labelFr: string; labelEn: string; family: string }[] = [
  // ---- peau : le type ne change pas, quatre facettes + le cas « normale ».
  { key: "peau_seche", labelFr: "Peau sèche", labelEn: "Dry skin", family: "peau" },
  { key: "peau_grasse", labelFr: "Peau grasse", labelEn: "Oily skin", family: "peau" },
  { key: "peau_mixte", labelFr: "Peau mixte", labelEn: "Combination skin", family: "peau" },
  { key: "peau_sensible", labelFr: "Peau sensible", labelEn: "Sensitive skin", family: "peau" },
  { key: "peau_normale", labelFr: "Peau normale", labelEn: "Normal skin", family: "peau" },

  // ---- preoccupation : ce qui amène l'achat, ça change au fil du temps.
  { key: "imperfections", labelFr: "Imperfections", labelEn: "Blemishes", family: "preoccupation" },
  { key: "eclat", labelFr: "Éclat", labelEn: "Radiance", family: "preoccupation" },
  { key: "hydratation", labelFr: "Hydratation", labelEn: "Hydration", family: "preoccupation" },
  { key: "anti_age", labelFr: "Anti-âge", labelEn: "Anti-ageing", family: "preoccupation" },
  { key: "apaisant", labelFr: "Apaisant", labelEn: "Soothing", family: "preoccupation" },

  // ---- budget : préférence de gamme, lue par buildRoutine() pour départager
  // des candidats à score de tags égal — jamais affichée en facette.
  { key: "budget_eco", labelFr: "Petit budget", labelEn: "Budget-friendly", family: "budget" },
  { key: "premium", labelFr: "Premium", labelEn: "Premium", family: "budget" },

  // ---- categorie : rayons du catalogue distincts des soins visage.
  { key: "corps", labelFr: "Corps", labelEn: "Body", family: "categorie" },
  { key: "homme", labelFr: "Homme", labelEn: "Men", family: "categorie" },
  { key: "hygiene", labelFr: "Hygiène", labelEn: "Hygiene", family: "categorie" },

  // ---- geste : l'étape de routine, reprise de ROUTINE_STEPS (diagnostic.ts).
  { key: "nettoyage", labelFr: "Nettoyage", labelEn: "Cleansing", family: "geste" },
  { key: "toner", labelFr: "Tonique", labelEn: "Toning", family: "geste" },
  { key: "traitement", labelFr: "Traitement", labelEn: "Treatment", family: "geste" },
  { key: "solaire", labelFr: "Solaire", labelEn: "Sun care", family: "geste" },

  // ---- texture : une propriété de formule, ni un type de peau ni une
  // préoccupation.
  { key: "matifiant", labelFr: "Matifiant", labelEn: "Mattifying", family: "texture" },
];

async function main() {
  for (const [index, tag] of VOCABULAIRE.entries()) {
    await prisma.productTag.upsert({
      where: { key: tag.key },
      // Le seed est rejouable : il met à jour les libellés sans écraser
      // l'ordre choisi par l'administrateur (position n'est fixée qu'à la
      // création).
      update: { labelFr: tag.labelFr, labelEn: tag.labelEn, family: tag.family },
      create: { ...tag, position: index },
    });
  }
  console.log(`${VOCABULAIRE.length} tags en place.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
