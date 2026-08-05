/**
 * Peuple le catalogue d'avis de DÉMONSTRATION.
 *
 * Chaque avis produit porte `moderatorNote = MARQUEUR_DEMO` et
 * `moderatedBy = MODERATEUR_DEMO` : `scripts/purge-avis-demo.ts` s'en sert pour
 * tout retirer d'un coup, sans risque de toucher un avis véritable.
 *
 * REFUS DE S'EXÉCUTER SUR LA PRODUCTION. Le script compare la base visée à
 * l'hôte de production et s'arrête s'ils coïncident, à moins qu'on ne le force
 * explicitement. Un avis fabriqué présenté à un acheteur relève de la pratique
 * commerciale trompeuse (article L121-4 21° du code de la consommation) et vaut
 * au flux marchand une suspension de compte.
 *
 * Lancement :
 *   DATABASE_URL="postgresql://…base-de-demo…" npx tsx scripts/seed-avis-demo.ts
 */
import { prisma } from "../src/server/prisma";
import {
  MARQUEUR_DEMO,
  MODERATEUR_DEMO,
  PRENOMS,
  INITIALES,
  VILLES,
  POSITIFS,
  NEGATIFS,
  type Famille,
} from "./data/avis-demo-corpus";

/** Hôte de la base de production. Le script refuse d'y écrire. */
const HOTE_PRODUCTION = "ep-polished-heart-ayfsuz8k";

/** Bornes du nombre d'avis par produit. */
const MIN_AVIS = 15;
const MAX_AVIS = 200;

/** Part d'avis négatifs (1 ou 2 étoiles). */
const PART_NEGATIVE = 0.03;

/** Étalement des dates : les avis remontent jusqu'à deux ans. */
const JOURS_HISTORIQUE = 730;

/**
 * Générateur pseudo-aléatoire à graine.
 *
 * `Math.random()` rendrait chaque exécution différente : impossible de
 * reproduire un jeu de démonstration, ni de comprendre après coup pourquoi une
 * fiche affiche telle note. Ici la graine dérive du slug, donc un même produit
 * reçoit toujours les mêmes avis.
 */
function generateur(graine: string) {
  let etat = 0;
  for (let i = 0; i < graine.length; i++) {
    etat = (etat * 31 + graine.charCodeAt(i)) >>> 0;
  }
  return () => {
    // xorshift32 : court, sans dépendance, suffisant pour du contenu.
    etat ^= etat << 13;
    etat >>>= 0;
    etat ^= etat >> 17;
    etat ^= etat << 5;
    etat >>>= 0;
    return etat / 0x1_0000_0000;
  };
}

function entier(rnd: () => number, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

function choisir<T>(rnd: () => number, liste: readonly T[]): T {
  return liste[Math.floor(rnd() * liste.length)];
}

/** Déduit la famille de produit du slug et de la catégorie. */
function familleDe(slug: string, categorieSlug: string, nom: string): Famille {
  const s = `${slug} ${categorieSlug} ${nom}`.toLowerCase();
  if (s.includes("poele") || s.includes("poêle")) return "poele";
  if (s.includes("granule") || s.includes("granulé") || s.includes("pellet")) return "granules";
  if (s.includes("compress") || s.includes("densifi") || s.includes("buche-compress")) {
    return "compressees";
  }
  if (s.includes("palette")) return "palette";
  if (s.includes("vrac")) return "vrac";
  return "buches";
}

/**
 * Compose un avis. La longueur varie volontairement : un corpus où chaque texte
 * fait trois phrases se repère au premier coup d'œil.
 */
function rediger(rnd: () => number, famille: Famille, positif: boolean) {
  const bloc = positif ? POSITIFS[famille] : NEGATIFS[famille];
  const parts = [choisir(rnd, bloc.ouvertures)];

  // Un avis sur deux ajoute un détail, un sur trois une seconde phrase de
  // détail : c'est cette irrégularité qui rend un corpus crédible.
  if (rnd() < 0.75) parts.push(choisir(rnd, bloc.details));
  if (rnd() < 0.3) {
    const second = choisir(rnd, bloc.details);
    if (!parts.includes(second)) parts.push(second);
  }
  const fermeture = choisir(rnd, bloc.fermetures);
  if (fermeture) parts.push(fermeture);

  return {
    body: parts.join(" ").trim(),
    title: choisir(rnd, bloc.titres),
  };
}

/** Note d'un avis positif : très majoritairement 5, sinon 4. */
function notePositive(rnd: () => number): number {
  return rnd() < 0.68 ? 5 : 4;
}

/** Note d'un avis négatif : 2 le plus souvent, 1 parfois. */
function noteNegative(rnd: () => number): number {
  return rnd() < 0.7 ? 2 : 1;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const force = process.argv.includes("--je-sais-ce-que-je-fais");

  if (!url) {
    console.error("DATABASE_URL est absente. Vise une base de démonstration, pas la production.");
    process.exitCode = 1;
    return;
  }

  if (url.includes(HOTE_PRODUCTION) && !force) {
    console.error(
      [
        "REFUS : DATABASE_URL vise la base de PRODUCTION.",
        "",
        "mlc-bois.fr est en ligne : des avis fabriqués y seraient lus par de vrais",
        "acheteurs et repris dans le balisage envoyé à Google. C'est une pratique",
        "commerciale trompeuse (L121-4 21° du code de la consommation) et un motif",
        "de suspension du compte Merchant.",
        "",
        "Vise une branche Neon de développement ou une base locale.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const produits = await prisma.product.findMany({
    select: { id: true, slug: true, name: true, category: { select: { slug: true } } },
    orderBy: { slug: "asc" },
  });

  if (produits.length === 0) {
    console.error("Aucun produit en base : rien à commenter.");
    process.exitCode = 1;
    return;
  }

  console.log(`${produits.length} produits. Génération des avis de démonstration…`);

  const maintenant = Date.now();
  let total = 0;
  let negatifs = 0;

  for (const produit of produits) {
    const rnd = generateur(produit.slug);
    const famille = familleDe(produit.slug, produit.category.slug, produit.name);
    const combien = entier(rnd, MIN_AVIS, MAX_AVIS);

    const lignes = Array.from({ length: combien }, () => {
      const positif = rnd() >= PART_NEGATIVE;
      const { body, title } = rediger(rnd, famille, positif);
      if (!positif) negatifs += 1;

      // Les dates s'étalent sur deux ans, avec une densité plus forte sur les
      // mois récents : une boutique reçoit plus d'avis à mesure qu'elle vend.
      const anciennete = Math.floor(rnd() ** 1.7 * JOURS_HISTORIQUE);
      const createdAt = new Date(maintenant - anciennete * 86_400_000);

      return {
        productId: produit.id,
        authorName: `${choisir(rnd, PRENOMS)} ${choisir(rnd, INITIALES)}.`,
        city: rnd() < 0.82 ? choisir(rnd, VILLES) : null,
        rating: positif ? notePositive(rnd) : noteNegative(rnd),
        title,
        body,
        status: "approved",
        moderatorNote: MARQUEUR_DEMO,
        moderatedBy: MODERATEUR_DEMO,
        moderatedAt: createdAt,
        createdAt,
      };
    });

    await prisma.review.createMany({ data: lignes });
    total += lignes.length;
    console.log(`  ${produit.slug.padEnd(52).slice(0, 52)} ${String(combien).padStart(3)} avis [${famille}]`);
  }

  const part = ((negatifs / total) * 100).toFixed(1);
  console.log(`\n${total} avis créés, dont ${negatifs} négatifs (${part} %).`);
  console.log(`Tous portent « ${MARQUEUR_DEMO} » : purge par scripts/purge-avis-demo.ts.`);
}

main()
  .catch((erreur) => {
    console.error("Échec de la génération :", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
