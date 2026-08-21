import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { formatFcfa } from "@/lib/kk/format";
import { formatJourIso, periodeDepuisUrl } from "@/lib/kk/periode";
import { classerParProduit, totaliserVentes, ventesParJour } from "@/lib/kk/ventes";
import { lireEnCours, lireVentes } from "@/server/kk/ventes";
import { VentesPeriodeForm } from "@/components/admin/VentesPeriodeForm";
import { VentesHistogramme } from "@/components/admin/VentesHistogramme";

/** Au-delà, une barre par jour devient illisible ; les chiffres, eux, restent. */
const JOURS_MAX_HISTOGRAMME = 92;

const TOP_PRODUITS = 10;

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
  await requireAdminSession();

  const params = await searchParams;
  const periode = periodeDepuisUrl(params, new Date());
  const [lignes, enCours] = await Promise.all([lireVentes(periode), lireEnCours(periode)]);

  const totaux = totaliserVentes(lignes);
  const produits = classerParProduit(lignes, TOP_PRODUITS);
  const points = ventesParJour(lignes, periode.du, periode.au);

  const lignesSansCout = totaux.lignesTotal - totaux.lignesAvecCout;
  // La marge se dit toujours avec son assiette : muette sur son incomplétude,
  // elle mentirait.
  const mentionMarge =
    totaux.lignesTotal === 0
      ? undefined
      : lignesSansCout === 0
        ? `calculée sur les ${totaux.lignesTotal} lignes de la période`
        : `calculée sur ${totaux.lignesAvecCout} lignes sur ${totaux.lignesTotal} — le coût d’achat manque sur les autres`;

  const exportHref = `/api/admin/ventes/export?du=${formatJourIso(periode.du)}&au=${formatJourIso(periode.au)}`;

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
          mention="produits seuls, hors livraison"
        />
        <Carte
          titre="Marge"
          valeur={
            totaux.margeCents === null
              ? "—"
              : `${formatFcfa(totaux.margeCents)}${totaux.tauxMarge === null ? "" : ` (${totaux.tauxMarge.toString().replace(".", ",")} %)`}`
          }
          mention={
            totaux.margeCents === null
              ? "aucun coût d’achat renseigné sur la période"
              : mentionMarge
          }
        />
        <Carte
          titre="Commandes"
          valeur={totaux.nombreCommandes.toString()}
          mention={`${totaux.quantite} article${totaux.quantite > 1 ? "s" : ""} vendu${totaux.quantite > 1 ? "s" : ""}`}
        />
        <Carte titre="Panier moyen" valeur={formatFcfa(totaux.panierMoyenCents)} />
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
            <Link href="/admin/orders?paymentStatus=en_attente" className="underline">
              Voir les commandes
            </Link>
          </p>
        </div>
      ) : null}

      {points.length <= JOURS_MAX_HISTOGRAMME ? (
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
