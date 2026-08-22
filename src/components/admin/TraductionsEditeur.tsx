"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import {
  etatTraduction,
  type ModeleTraduisible,
  type ChampTraduisible,
} from "@/lib/kk/traductions";

/**
 * Écran des traductions : une vue d'ensemble, des filtres, puis la liste
 * éditable — dans cet ordre, comme le veut la spécification (le chiffre
 * qu'on vient chercher d'abord, le formulaire ensuite).
 *
 * Le français est TOUJOURS affiché en lecture seule, à gauche de l'anglais :
 * on traduit en regardant l'original, jamais en le retapant de mémoire.
 */

type Filtre = "tout" | "a-traduire" | "traduit";

interface EtatVue {
  traduits: number;
  aTraduire: number;
  total: number;
  complet: boolean;
}

interface LigneVue {
  id: string;
  libelle: string;
  valeurs: Record<string, string>;
  etat: EtatVue;
}

interface Apercu {
  cle: string;
  libelle: string;
  total: number;
  complets: number;
}

const CHAMP_LECTURE =
  "w-full rounded-sm border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground";
const CHAMP_EDITION =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary";

function nombreDeLignes(texte: string): number {
  return texte
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter(Boolean).length;
}

export function TraductionsEditeur({
  modeles,
  apercu: apercuInitial,
  modeleInitial,
  filtreInitial,
  lignesInitiales,
}: {
  modeles: ModeleTraduisible[];
  apercu: Apercu[];
  modeleInitial: string;
  filtreInitial: Filtre;
  lignesInitiales: LigneVue[];
}) {
  const router = useRouter();
  const [apercu, setApercu] = useState(apercuInitial);
  const [modele, setModele] = useState(modeleInitial);
  const [filtre, setFiltre] = useState<Filtre>(filtreInitial);
  const [lignes, setLignes] = useState(lignesInitiales);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Copies éditées, indexées par id d'enregistrement — permet de modifier une
  // ligne sans perdre la saisie des autres pendant qu'on navigue la liste.
  const [editions, setEditions] = useState<Record<string, Record<string, string>>>({});
  const [enregistrementEnCours, setEnregistrementEnCours] = useState<string | null>(null);

  const modeleActuel = modeles.find((m) => m.cle === modele);

  async function changerFiltre(nouveauModele: string, nouveauFiltre: Filtre) {
    setModele(nouveauModele);
    setFiltre(nouveauFiltre);
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(
        `/api/admin/traductions?modele=${encodeURIComponent(nouveauModele)}&filtre=${nouveauFiltre}`,
      );
      const data = (await res.json().catch(() => null)) as LigneVue[] | { error?: string } | null;
      if (!res.ok || !Array.isArray(data)) {
        setErreur((data as { error?: string } | null)?.error ?? "Chargement impossible.");
        setLignes([]);
        return;
      }
      setLignes(data);
      setEditions({});
    } catch {
      setErreur("Impossible de joindre le serveur.");
      setLignes([]);
    } finally {
      setChargement(false);
    }
  }

  function valeurEditee(ligne: LigneVue, champ: ChampTraduisible): string {
    return editions[ligne.id]?.[champ.en] ?? ligne.valeurs[champ.en] ?? "";
  }

  function modifier(ligne: LigneVue, champ: ChampTraduisible, valeur: string) {
    setEditions((precedent) => ({
      ...precedent,
      [ligne.id]: { ...precedent[ligne.id], [champ.en]: valeur },
    }));
  }

  async function enregistrer(ligne: LigneVue) {
    if (!modeleActuel) return;
    setEnregistrementEnCours(ligne.id);
    setErreur(null);

    const valeursEnvoyees: Record<string, string> = {};
    for (const champ of modeleActuel.champs) {
      valeursEnvoyees[champ.en] = valeurEditee(ligne, champ);
    }

    try {
      const res = await fetch("/api/admin/traductions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modele, id: ligne.id, valeurs: valeursEnvoyees }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setErreur(data?.error ?? "L'enregistrement a échoué.");
        return;
      }

      const valeursAJour = { ...ligne.valeurs, ...valeursEnvoyees };
      const nouvelEtat = etatTraduction(valeursAJour, modeleActuel.champs);

      // Le complément qui vient d'être traduit doit s'ajuster à l'écran (et à
      // la vue d'ensemble) sans attendre un rechargement : traduire un champ
      // doit se voir tout de suite, y compris par sa disparition du filtre
      // « à traduire ».
      setApercu((precedent) =>
        precedent.map((entree) => {
          if (entree.cle !== modele) return entree;
          const etaitComplet = ligne.etat.complet;
          const delta = nouvelEtat.complet && !etaitComplet ? 1 : !nouvelEtat.complet && etaitComplet ? -1 : 0;
          return { ...entree, complets: entree.complets + delta };
        }),
      );

      setLignes((precedent) => {
        const misesAJour = precedent.map((l) =>
          l.id === ligne.id ? { ...l, valeurs: valeursAJour, etat: nouvelEtat } : l,
        );
        if (filtre === "a-traduire") return misesAJour.filter((l) => !l.etat.complet);
        if (filtre === "traduit") return misesAJour.filter((l) => l.etat.complet);
        return misesAJour;
      });

      setEditions((precedent) => {
        const reste = { ...precedent };
        delete reste[ligne.id];
        return reste;
      });

      router.refresh();
    } catch {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setEnregistrementEnCours(null);
    }
  }

  const totalGeneral = useMemo(
    () => apercu.reduce((s, a) => s + a.total, 0),
    [apercu],
  );
  const completsGeneral = useMemo(
    () => apercu.reduce((s, a) => s + a.complets, 0),
    [apercu],
  );

  return (
    <div className="space-y-8">
      {erreur && (
        <p role="alert" className="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {/* 1. La vue d'ensemble */}
      <section>
        <h2 className="mb-3 text-sm font-black text-foreground">
          Vue d&apos;ensemble — {completsGeneral} / {totalGeneral} enregistrements complets
        </h2>
        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Modèle</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Complets</th>
                <th className="px-4 py-3">À traduire</th>
                <th className="px-4 py-3">Pourcentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apercu.map((a) => {
                const aTraduire = a.total - a.complets;
                const pourcentage = a.total > 0 ? Math.round((a.complets / a.total) * 100) : 100;
                return (
                  <tr
                    key={a.cle}
                    className={a.cle === modele ? "bg-muted/40" : undefined}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">{a.libelle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.total}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.complets}</td>
                    <td className="px-4 py-3 text-muted-foreground">{aTraduire}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pourcentage} %</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Les filtres */}
      <section className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Modèle</span>
          <select
            value={modele}
            onChange={(e) => changerFiltre(e.target.value, filtre)}
            className={CHAMP_EDITION}
          >
            {modeles.map((m) => (
              <option key={m.cle} value={m.cle}>
                {m.libelle}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">État</span>
          <select
            value={filtre}
            onChange={(e) => changerFiltre(modele, e.target.value as Filtre)}
            className={CHAMP_EDITION}
          >
            <option value="a-traduire">À traduire</option>
            <option value="traduit">Traduit</option>
            <option value="tout">Tout</option>
          </select>
        </label>

        {chargement && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </span>
        )}
      </section>

      {/* 3. La liste et l'éditeur */}
      <section className="space-y-4">
        {modele === "Article" && (
          <p className="rounded-sm border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Le corps de chaque article (ses blocs) ne se traduit pas ici : il se modifie dans
            l&apos;éditeur d&apos;article, article par article. Cet écran ne couvre que le titre,
            le chapeau, le texte alternatif de couverture et les champs SEO.
          </p>
        )}

        {!chargement && lignes.length === 0 && (
          <p className="rounded-sm border border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun enregistrement pour ce modèle et ce filtre.
          </p>
        )}

        {modeleActuel &&
          lignes.map((ligne) => (
            <article key={ligne.id} className="rounded-sm border border-border bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground">{ligne.libelle}</h3>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      ligne.etat.complet
                        ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                        : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive"
                    }
                  >
                    {ligne.etat.traduits} / {ligne.etat.total} traduits
                  </span>
                  {modele === "Article" && (
                    <Link
                      href={`/admin/journal/${ligne.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Éditeur d&apos;article <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {modeleActuel.champs.map((champ) => {
                  const fr = ligne.valeurs[champ.fr] ?? "";
                  const en = valeurEditee(ligne, champ);

                  if (champ.format === "liste") {
                    const nbFr = nombreDeLignes(fr);
                    const nbEn = nombreDeLignes(en);
                    return (
                      <div key={champ.en} className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-foreground">
                            {champ.libelle} (français) — {nbFr} puce{nbFr > 1 ? "s" : ""}
                          </span>
                          <textarea
                            value={fr}
                            readOnly
                            rows={Math.max(3, nbFr)}
                            className={CHAMP_LECTURE}
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-foreground">
                            {champ.libelle} (anglais) — {nbEn} puce{nbEn > 1 ? "s" : ""} sur {nbFr}
                          </span>
                          <textarea
                            value={en}
                            onChange={(e) => modifier(ligne, champ, e.target.value)}
                            rows={Math.max(3, nbFr)}
                            placeholder="Une puce par ligne"
                            className={CHAMP_EDITION}
                          />
                        </label>
                      </div>
                    );
                  }

                  const long = champ.format === "texte-long";
                  return (
                    <div key={champ.en} className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs">
                        <span className="mb-1 block font-semibold text-foreground">
                          {champ.libelle} (français)
                        </span>
                        {long ? (
                          <textarea value={fr} readOnly rows={3} className={CHAMP_LECTURE} />
                        ) : (
                          <input value={fr} readOnly className={CHAMP_LECTURE} />
                        )}
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-semibold text-foreground">
                          {champ.libelle} (anglais)
                        </span>
                        {long ? (
                          <textarea
                            value={en}
                            onChange={(e) => modifier(ligne, champ, e.target.value)}
                            rows={3}
                            className={CHAMP_EDITION}
                          />
                        ) : (
                          <input
                            value={en}
                            onChange={(e) => modifier(ligne, champ, e.target.value)}
                            className={CHAMP_EDITION}
                          />
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => enregistrer(ligne)}
                  disabled={enregistrementEnCours === ligne.id}
                  className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-60"
                >
                  {enregistrementEnCours === ligne.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Enregistrer
                </button>
              </div>
            </article>
          ))}
      </section>
    </div>
  );
}
