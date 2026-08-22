import Link from "next/link";
import { requireCapacitePage } from "@/lib/dal";
import { formatFcfa } from "@/lib/kk/format";
import { formatJourIso, periodeDepuisUrl } from "@/lib/kk/periode";
import { classerParProduit, totaliserVentes, ventesParJour } from "@/lib/kk/ventes";
import { lireEnCours, lireVentes } from "@/server/kk/ventes";
import { VentesPeriodeForm } from "@/components/admin/VentesPeriodeForm";
import { VentesHistogramme } from "@/components/admin/VentesHistogramme";

/** Au-delà, une barre par jour devient illisible ; les chiffres, eux, restent. */
const JOURS_MAX_HISTOGRAMME = 92;

const TOP_PRODUITS = 10;

/**
 * Nombre de jours d'une période, sans construire la série complète.
 *
 * Reprend le comptage de `ventesParJour` sans son travail : au-delà de
 * `JOURS_MAX_HISTOGRAMME`, l'écran n'affiche pas l'histogramme, et calculer sa
 * série jour par jour pour la jeter aussitôt serait du travail perdu.
 */
function joursDansPeriode(du: Date, au: Date): number {
  const debut = new Date(du.getFullYear(), du.getMonth(), du.getDate());
  const fin = new Date(au.getFullYear(), au.getMonth(), au.getDate());
  return Math.round((fin.getTime() - debut.getTime()) / 86_400_000) + 1;
}

function Carte({
  titre,
  valeur,
  mention,
}: {
  titre: string;
  valeur: string;
  mention?: string;
}) {
  return (
    <div className="rounded-sm border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{valeur}</p>
      {mention ? <p className="mt-1 text-xs text-muted-foreground">{mention}</p> : null}
    </div>
  );
}

export default async function AdminVentesPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string; p?: string }>;
}) {
  await requireCapacitePage("commandes");

  const params = await searchParams;
  const periode = periodeDepuisUrl(params, new Date());
  const [lignes, enCours] = await Promise.all([lireVentes(periode), lireEnCours(periode)]);

  const totaux = totaliserVentes(lignes);
  const produits = classerParProduit(lignes, TOP_PRODUITS);
  const nombreJours = joursDansPeriode(periode.du, periode.au);
  // Ne construit la série jour par jour que si l'histogramme va s'en servir.
  const points = nombreJours <= JOURS_MAX_HISTOGRAMME ? ventesParJour(lignes, periode.du, periode.au) : [];

  const lignesSansCout = totaux.lignesTotal - totaux.lignesAvecCout;
  // La marge se dit toujours avec son assiette : muette sur son incomplétude,
  // elle mentirait. Cette mention n'est lue que lorsque `margeCents` n'est pas
  // `null`, ce qui implique déjà `lignesAvecCout > 0` et donc `lignesTotal > 0` :
  // pas besoin d'un cas à part pour une période sans ligne.
  const mentionMarge =
    lignesSansCout === 0
      ? `calculée sur les ${totaux.lignesTotal} lignes de la période`
      : `calculée sur ${totaux.lignesAvecCout} lignes sur ${totaux.lignesTotal} — le coût d’achat manque sur les autres`;

  const exportHref = `/api/admin/ventes/export?du=${formatJourIso(periode.du)}&au=${formatJourIso(periode.au)}`;

  // La carte dit toujours ce qui est retiré : la livraison, mais aussi les
  // remises — sans quoi « produits seuls, hors livraison » laisserait croire
  // qu'elles seules manquent au compte.
  const mentionEncaisse =
    totaux.remisesCents > 0
      ? // Le montant nu entre parenthèses pourrait se lire comme ce qui est
        // retenu plutôt que ce qui est retiré : « de remises accordées » lève
        // l'ambiguïté.
        `produits seuls, remises déduites (${formatFcfa(totaux.remisesCents)} de remises accordées), livraison exclue`
      : "produits seuls, remises déduites, livraison exclue";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Ventes</h1>
        <Link
          href={exportHref}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Exporter en CSV
        </Link>
      </div>

      <VentesPeriodeForm
        raccourciActif={periode.raccourci}
        duInitial={formatJourIso(periode.du)}
        auInitial={formatJourIso(periode.au)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Carte
          titre="Encaissé"
          valeur={formatFcfa(totaux.chiffreAffairesCents)}
          mention={mentionEncaisse}
        />
        <Carte
          titre="Marge"
          valeur={
            totaux.margeCents === null
              ? "—"
              : `${formatFcfa(totaux.margeCents)}${totaux.tauxMarge === null ? "" : ` (${totaux.tauxMarge.toString().replace(".", ",")} %)`}`
          }
          mention={
            totaux.margeCents !== null
              ? mentionMarge
              : totaux.lignesTotal === 0
                ? "aucune vente sur la période"
                : "aucun coût d’achat renseigné sur la période"
          }
        />
        <Carte
          titre="Commandes"
          valeur={totaux.nombreCommandes.toString()}
          mention={`${totaux.quantite} article${totaux.quantite > 1 ? "s" : ""} vendu${totaux.quantite > 1 ? "s" : ""}`}
        />
        <Carte
          titre="Panier moyen"
          valeur={
            totaux.panierMoyenCents === null ? "—" : formatFcfa(totaux.panierMoyenCents)
          }
          mention={totaux.panierMoyenCents === null ? "aucune commande sur la période" : undefined}
        />
      </div>

      {enCours.nombre > 0 ? (
        <div className="rounded-sm border border-dashed border-border p-4">
          <p className="text-sm">
            <span className="font-semibold">{enCours.nombre}</span> commande
            {enCours.nombre > 1 ? "s" : ""} en attente de paiement, soit{" "}
            <span className="font-semibold">{formatFcfa(enCours.totalCents)}</span>.
          </p>
          {/* Volontairement séparé de l'encaissé : cet argent n'est pas entré. */}
          <p className="mt-1 text-xs text-muted-foreground">
            Ce montant n’est pas compris dans l’encaissé ci-dessus.{" "}
            {/* Le libellé dit ce que le lien montre vraiment : la liste des
                commandes ne filtre ni par période ni sur les annulées, donc
                elle n'aligne pas forcément le même nombre que ci-dessus. */}
            <Link href="/admin/orders?paymentStatus=en_attente" className="underline">
              Voir toutes les commandes en attente
            </Link>
          </p>
        </div>
      ) : null}

      {nombreJours <= JOURS_MAX_HISTOGRAMME ? (
        <VentesHistogramme points={points} />
      ) : (
        <p className="rounded-sm border border-border p-4 text-sm text-muted-foreground">
          La période dépasse {JOURS_MAX_HISTOGRAMME} jours : le détail quotidien n’est pas
          affiché. Les totaux et le classement ci-dessous portent bien sur toute la période.
        </p>
      )}

      <div className="rounded-sm border border-border">
        <h2 className="border-b border-border px-4 py-3 font-semibold">
          Produits les plus vendus
        </h2>
        {produits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Aucune vente encaissée sur cette période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 font-medium">Produit</th>
                <th className="px-4 py-2 font-medium">Quantité</th>
                <th className="px-4 py-2 font-medium">Chiffre d’affaires</th>
                <th className="px-4 py-2 font-medium">Marge</th>
              </tr>
            </thead>
            <tbody>
              {produits.map((produit) => (
                <tr key={produit.cle} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <span className="text-muted-foreground">{produit.brand}</span>{" "}
                    {produit.name}
                    {produit.variantLabel ? (
                      <span className="text-muted-foreground"> — {produit.variantLabel}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{produit.quantite}</td>
                  <td className="px-4 py-2">{formatFcfa(produit.chiffreAffairesCents)}</td>
                  <td className="px-4 py-2">
                    {produit.margeCents === null ? (
                      <span className="text-muted-foreground" title="Coût d’achat non renseigné">
                        —
                      </span>
                    ) : (
                      <>
                        {formatFcfa(produit.margeCents)}
                        {produit.lignesSansCout > 0 ? (
                          <span
                            className="ml-1 text-xs text-muted-foreground"
                            title={`${produit.lignesSansCout} ligne(s) sans coût d’achat`}
                          >
                            (partielle)
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
