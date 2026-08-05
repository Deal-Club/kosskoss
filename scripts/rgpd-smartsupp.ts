/**
 * Met la politique de confidentialité FRANÇAISE en accord avec l'ajout du chat
 * Smartsupp.
 *
 * Avant cet ajout, la page affirmait deux choses qui ont cessé d'être vraies le
 * jour où le widget a été activé :
 *   - « Le site n'utilise que des cookies strictement nécessaires » ;
 *   - la liste des destinataires ne mentionnait aucun prestataire de chat.
 *
 * Smartsupp est chargé sur toutes les pages et dépose un identifiant de
 * visiteur. Ce n'est pas un cookie nécessaire au fonctionnement de la boutique :
 * il relève du consentement (article 82 de la loi Informatique et Libertés).
 * La page le dit désormais, et porte la mention d'attente déjà utilisée pour le
 * médiateur — même forme, même raison : le point doit être réglé avant la mise
 * en ligne.
 *
 * Ce script ne touche QUE le français, qui est la version qui engage la
 * société. L'anglais se régénère ensuite :
 *
 *   npx tsx --env-file=.env.local scripts/rgpd-smartsupp.ts --simuler
 *   npx tsx --env-file=.env.local scripts/rgpd-smartsupp.ts
 *   npx tsx --env-file=.env.local scripts/traduire-pages-legales.ts
 *
 * Idempotent : le relancer réécrit les mêmes valeurs. Voir l'en-tête de
 * `scripts/traduire-pages-legales.ts` pour l'usage de `pg` plutôt que Prisma.
 */

import { Client } from "pg";
import { normalizeLegalPage } from "../src/server/legalPageInput";
import type { LegalPage } from "../src/content/legal/types";

const SLUG = "confidentialite" as const;

/** Date de révision portée par la page après modification. */
const REVISION = "2026-08-03";

/** Prestataire ajouté à la liste des destinataires. */
const DESTINATAIRE =
  "Smartsupp s.r.o. (République tchèque), éditeur du chat en direct, pour les seules conversations que vous choisissez d'engager";

/** Corps réécrit de la section « Cookies et traceurs ». */
const COOKIES = [
  "Le fonctionnement du site repose sur des cookies strictement nécessaires : session de connexion, panier et préférence de langue. Ces cookies sont dispensés de consentement au titre de l'article 82 de la loi Informatique et Libertés, tel qu'interprété par la CNIL.",
  "Un chat en direct, fourni par Smartsupp s.r.o. (République tchèque), est proposé par un bouton en bas à droite de l'écran. Il ne se charge qu'après un clic de votre part : tant que vous ne l'ouvrez pas, aucun script ni cookie Smartsupp n'est déposé et aucune donnée ne parvient à ce prestataire.",
  "En ouvrant le chat, vous demandez expressément ce service. L'identifiant de visiteur alors déposé rattache entre eux les messages d'une même conversation ; sa durée de conservation est celle publiée par Smartsupp dans sa propre documentation.",
  "Aucun cookie de mesure d'audience tierce, de publicité ou de réseau social n'est déposé.",
].join("\n\n");

const TITRE_DESTINATAIRES = "Destinataires des données";
const TITRE_COOKIES = "Cookies et traceurs";

/** Applique les deux modifications. Rend la page telle qu'elle doit être stockée. */
function reecrire(page: LegalPage): LegalPage {
  let destinatairesVues = 0;
  let cookiesVues = 0;

  const sections = page.sections.map((section) => {
    if (section.heading === TITRE_DESTINATAIRES) {
      destinatairesVues += 1;
      const liste = section.list ?? [];
      // Idempotence : la ligne n'est ajoutée que si elle n'y est pas déjà.
      const deja = liste.some((item) => item.startsWith("Smartsupp"));
      return { ...section, list: deja ? liste : [...liste, DESTINATAIRE] };
    }
    if (section.heading === TITRE_COOKIES) {
      cookiesVues += 1;
      return { ...section, body: COOKIES };
    }
    return section;
  });

  if (destinatairesVues !== 1 || cookiesVues !== 1) {
    throw new Error(
      `Sections attendues introuvables (« ${TITRE_DESTINATAIRES} » : ${destinatairesVues}, ` +
        `« ${TITRE_COOKIES} » : ${cookiesVues}). La page a été remaniée depuis : ` +
        "reprenez ce script avant de le relancer.",
    );
  }

  return { ...page, sections, updatedAt: REVISION };
}

async function main(): Promise<void> {
  const simuler = process.argv.includes("--simuler");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query<{ data: string }>(
      `SELECT data FROM "LegalContent" WHERE slug = $1 AND locale = 'fr'`,
      [SLUG],
    );
    if (rows.length === 0) {
      throw new Error(
        `Aucune page « ${SLUG} » en français en base : rien à modifier. ` +
          "La page servie vient alors du fichier src/content/legal/fr.ts.",
      );
    }

    const lue = normalizeLegalPage(JSON.parse(rows[0].data), SLUG);
    if (!lue.ok) throw new Error(`Page française illisible : ${lue.error}`);

    const controle = normalizeLegalPage(reecrire(lue.page), SLUG);
    if (!controle.ok) throw new Error(`Page réécrite refusée : ${controle.error}`);

    const destinataires =
      controle.page.sections.find((s) => s.heading === TITRE_DESTINATAIRES)?.list?.length ?? 0;
    console.log(
      `${simuler ? "[simulation] " : ""}${SLUG}/fr — ${destinataires} destinataires, ` +
        `section « ${TITRE_COOKIES} » réécrite, révision ${controle.page.updatedAt}`,
    );

    if (simuler) {
      console.log("\nAucune écriture (--simuler).");
      return;
    }

    await client.query(
      `UPDATE "LegalContent"
          SET data = $1, "updatedBy" = $2, "updatedAt" = NOW()
        WHERE slug = $3 AND locale = 'fr'`,
      [JSON.stringify(controle.page), "scripts/rgpd-smartsupp.ts", SLUG],
    );
    console.log("\nPage française enregistrée. Relancez scripts/traduire-pages-legales.ts.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
