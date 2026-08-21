import { requireAdminApi } from "@/lib/adminApi";
import { buildCsv } from "@/lib/kk/csv";
import { formatJourIso, periodeDepuisUrl } from "@/lib/kk/periode";
import { lireVentes } from "@/server/kk/ventes";
import { margeUnitaire, tauxMarge } from "@/lib/kk/marge";

/**
 * Export comptable des ventes encaissées : une ligne par ligne de commande.
 *
 * ── LES MONTANTS SORTENT EN ENTIERS NUS ─────────────────────────────────────
 *
 * Ni séparateur de milliers, ni symbole : un tableur doit pouvoir additionner
 * la colonne, et « 12 000 FCFA » n'est pas un nombre. La devise est dite une
 * fois, dans l'en-tête. Rappel : le FCFA n'a pas de sous-unité — les entiers
 * de la base SONT des francs, on ne divise jamais par 100.
 *
 * ── UNE CASE VIDE N'EST PAS UN ZÉRO ─────────────────────────────────────────
 *
 * Coût inconnu ⇒ colonnes de coût et de marge vides. Y écrire 0 ferait entrer
 * une ligne non renseignée dans le total du comptable, et le fausserait sans
 * que rien ne le signale.
 */

export const dynamic = "force-dynamic";

const COLONNES = [
  "Date",
  "N° commande",
  "Marque",
  "Produit",
  "Variante",
  "SKU",
  "Quantité",
  "Prix unitaire (FCFA)",
  "Total ligne (FCFA)",
  "Coût unitaire (FCFA)",
  "Coût total (FCFA)",
  "Marge (FCFA)",
  "Taux de marge (%)",
] as const;

/** Nombre décimal à la française : le tableur francophone attend la virgule. */
function nombreFr(valeur: number): string {
  return valeur.toString().replace(".", ",");
}

export async function GET(request: Request): Promise<Response> {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  // Exactement la même lecture que l'écran : le fichier exporté doit
  // correspondre au tableau que l'administrateur avait sous les yeux.
  const periode = periodeDepuisUrl(
    {
      du: url.searchParams.get("du") ?? undefined,
      au: url.searchParams.get("au") ?? undefined,
      p: url.searchParams.get("p") ?? undefined,
    },
    new Date(),
  );

  const lignes = await lireVentes(periode);

  const corps = lignes.map((ligne) => {
    const coutTotal =
      ligne.unitCostCents === null ? null : ligne.unitCostCents * ligne.quantity;
    const marge =
      coutTotal === null ? null : margeUnitaire(ligne.lineTotalCents, coutTotal);
    const taux =
      coutTotal === null ? null : tauxMarge(ligne.lineTotalCents, coutTotal);

    return [
      formatJourIso(ligne.date),
      ligne.orderNumber,
      ligne.brand,
      ligne.name,
      ligne.variantLabel,
      ligne.sku,
      ligne.quantity.toString(),
      ligne.unitPriceCents.toString(),
      ligne.lineTotalCents.toString(),
      // Vide, jamais zéro : la ligne n'a pas de coût connu.
      ligne.unitCostCents === null ? "" : ligne.unitCostCents.toString(),
      coutTotal === null ? "" : coutTotal.toString(),
      marge === null ? "" : marge.toString(),
      taux === null ? "" : nombreFr(taux),
    ];
  });

  // Les bornes figurent dans le nom : un export sans sa période ne se relit pas
  // six mois plus tard.
  const nom = `ventes-${formatJourIso(periode.du)}_${formatJourIso(periode.au)}.csv`;

  return new Response(buildCsv([...COLONNES], corps), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
