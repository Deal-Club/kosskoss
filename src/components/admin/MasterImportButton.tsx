"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompteRenduMaster } from "@/server/kk/master";

/**
 * Déclenche l'import du master client (71 fiches produits, 14 routines,
 * leurs gestes) et affiche le compte rendu intégral, section par section.
 *
 * Idempotent : relancé sans changement du fichier source, il ne crée ni ne
 * modifie plus rien — les listes « inchangées » en sont la preuve à l'écran.
 */
export function MasterImportButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<CompteRenduMaster | null>(null);

  async function lancer() {
    setPending(true);
    setErreur(null);
    setRapport(null);

    const response = await fetch("/api/admin/master-import", { method: "POST" });
    const data = await response.json().catch(() => null);

    setPending(false);
    if (!response.ok) {
      setErreur((data as { error?: string } | null)?.error ?? "L'import a échoué.");
      return;
    }

    setRapport(data as CompteRenduMaster);
    router.refresh();
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={lancer}
        disabled={pending}
        className="rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary disabled:opacity-60"
      >
        {pending ? "Import en cours…" : "Importer le master (fiches + routines)"}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Relit assets/corrections/KOSSKOSS_CATALOGUE_ROUTINES_V1_2.xlsx, met à jour les fiches et
        les routines dont le contenu a changé, et signale plutôt que de deviner : SKU inconnu,
        produit hors master, catégorie qui ne correspond pas, geste dont le produit est
        introuvable. Peut être relancé sans risque.
      </p>

      {erreur ? (
        <p className="mt-3 rounded-sm border border-destructive bg-white px-3 py-2 text-sm font-semibold text-destructive">
          {erreur}
        </p>
      ) : null}

      {rapport ? <CompteRenduAffiche rapport={rapport} /> : null}
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 font-semibold text-foreground">{titre}</p>
      {children}
    </div>
  );
}

function Liste({ items, vide }: { items: string[]; vide: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">{vide}</p>;
  return (
    <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function CompteRenduAffiche({ rapport }: { rapport: CompteRenduMaster }) {
  const { lecture, fiches, routines } = rapport;

  return (
    <div className="mt-3 space-y-6 rounded-sm border border-border bg-muted p-4 text-sm">
      <div>
        <p className="font-black text-foreground">Compte rendu de l&apos;import du master</p>
      </div>

      <Section titre={`Lecture du classeur — ${lecture.totalFiches} fiches, ${lecture.totalRoutines} routines, ${lecture.totalLiaisons} liaisons`}>
        <Liste
          items={[
            ...lecture.fichesIgnorees.map((l) => `Fiche ligne ${l.ligne} écartée : ${l.raison}`),
            ...lecture.routinesIgnorees.map((l) => `Routine ligne ${l.ligne} écartée : ${l.raison}`),
            ...lecture.liaisonsIgnorees.map((l) => `Liaison ligne ${l.ligne} écartée : ${l.raison}`),
          ]}
          vide="Aucune ligne écartée à la lecture."
        />
      </Section>

      <div>
        <p className="mb-2 font-black text-foreground">Fiches produits</p>

        <Section titre={`Fiches mises à jour (${fiches.misesAJour.length})`}>
          <Liste items={fiches.misesAJour.map((f) => `${f.sku} — ${f.nom}`)} vide="Aucune fiche mise à jour." />
        </Section>

        <Section titre={`Fiches inchangées (${fiches.inchangees.length})`}>
          <Liste items={fiches.inchangees.map((f) => `${f.sku} — ${f.nom}`)} vide="Aucune fiche inchangée." />
        </Section>

        <Section titre={`Prix modifiés (${fiches.prixModifies.length})`}>
          {fiches.prixModifies.length === 0 ? (
            <p className="text-muted-foreground">Aucun prix modifié.</p>
          ) : (
            <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
              {fiches.prixModifies.map((p) => (
                <li key={p.sku}>
                  <span className="font-semibold text-foreground">
                    {p.sku} — {p.nom}
                  </span>{" "}
                  : {p.ancienFcfa.toLocaleString("fr-FR")} FCFA → {p.nouveauFcfa.toLocaleString("fr-FR")} FCFA
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titre={`GTIN écrits (${fiches.gtinModifies.length})`}>
          <Liste
            items={fiches.gtinModifies.map((g) => `${g.sku} : ${g.ancien ?? "(aucun)"} → ${g.nouveau}`)}
            vide="Aucun GTIN écrit."
          />
        </Section>

        <Section titre={`GTIN invalides, non écrits (${fiches.gtinInvalides.length})`}>
          <Liste items={fiches.gtinInvalides.map((g) => `${g.sku} : ${g.ean}`)} vide="Aucun GTIN invalide." />
        </Section>

        <Section titre={`SKU du master introuvables en base (${fiches.skusInconnus.length}) — signalés, jamais créés`}>
          <Liste
            items={fiches.skusInconnus.map((s) => `Ligne ${s.ligne} — ${s.sku} — ${s.nom}`)}
            vide="Aucun SKU inconnu."
          />
        </Section>

        <Section titre={`SKU ambigus, plusieurs produits en base (${fiches.skusAmbigus.length})`}>
          <Liste
            items={fiches.skusAmbigus.map((s) => `${s.sku} : ${s.nombreDeProduits} produits`)}
            vide="Aucun SKU ambigu."
          />
        </Section>

        <Section titre={`Produits en base absents du master (${fiches.produitsHorsMaster.length}) — signalés, jamais supprimés`}>
          <Liste
            items={fiches.produitsHorsMaster.map((f) => `${f.sku} — ${f.nom}`)}
            vide="Aucun produit hors master."
          />
        </Section>

        <Section titre={`Catégories divergentes (${fiches.categoriesDivergentes.length}) — signalées, jamais corrigées`}>
          <Liste
            items={fiches.categoriesDivergentes.map(
              (c) => `${c.sku} — ${c.nom} : master « ${c.categorieMaster} », site « ${c.categorieSite} »`,
            )}
            vide="Aucune catégorie divergente."
          />
        </Section>
      </div>

      <div>
        <p className="mb-2 font-black text-foreground">Routines</p>

        <Section titre={`Routines créées (${routines.creees.length})`}>
          <Liste items={routines.creees.map((r) => `${r.code} — ${r.nom}`)} vide="Aucune routine créée." />
        </Section>

        <Section titre={`Routines mises à jour (${routines.misesAJour.length})`}>
          <Liste items={routines.misesAJour.map((r) => `${r.code} — ${r.nom}`)} vide="Aucune routine mise à jour." />
        </Section>

        <Section titre={`Routines inchangées (${routines.inchangees.length})`}>
          <Liste items={routines.inchangees.map((r) => `${r.code} — ${r.nom}`)} vide="Aucune routine inchangée." />
        </Section>

        <Section titre={`Gestes remplacés (${routines.gestesRemplaces.length})`}>
          <Liste
            items={routines.gestesRemplaces.map(
              (g) => `${g.code} — ${g.nom} : ${g.avant} geste(s) → ${g.apres} geste(s)${g.apres < g.avant ? " (un geste a disparu)" : ""}`,
            )}
            vide="Aucun remplacement de gestes."
          />
        </Section>

        <Section titre={`Routines annulées (${routines.routinesAnnulees.length}) — SKU introuvable, ambigu ou dupliqué`}>
          <Liste
            items={routines.routinesAnnulees.map((r) => `Ligne ${r.ligne} — ${r.code} : ${r.raison}`)}
            vide="Aucune routine annulée."
          />
        </Section>

        <Section titre={`Routines hors master, sans code (${routines.routinesHorsMaster.length}) — à trancher par le client`}>
          <Liste
            items={routines.routinesHorsMaster.map((r) => `${r.slug} — ${r.nom}`)}
            vide="Aucune routine hors master."
          />
        </Section>

        <Section titre={`Codes en base disparus du master (${routines.routinesCodeesDisparuesDuMaster.length})`}>
          <Liste
            items={routines.routinesCodeesDisparuesDuMaster.map((r) => `${r.code} — ${r.nom}`)}
            vide="Aucun code disparu."
          />
        </Section>

        {routines.avertissements.length > 0 ? (
          <Section titre="Avertissements">
            <Liste items={routines.avertissements} vide="" />
          </Section>
        ) : null}
      </div>
    </div>
  );
}
