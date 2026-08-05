"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  PLACEMENT_LABELS,
  SNIPPET_PLACEMENTS,
  type CodeSnippetInput,
  type SnippetPlacement,
} from "@/server/codeSnippetInput";

/** Ce que la page serveur transmet : la ligne de base, dates comprises. */
export interface SnippetRow extends CodeSnippetInput {
  id: string;
  updatedAt: string;
  updatedBy: string;
}

const VIDE: CodeSnippetInput = {
  name: "",
  placement: "head",
  content: "",
  enabled: false,
  position: 0,
};

/** Explication affichée sous le choix d'emplacement. */
const AIDE_EMPLACEMENT: Readonly<Record<SnippetPlacement, string>> = {
  head: "Balises de vérification, préconnexions, gestionnaires de balises. Les <meta> et <link> sont remontés dans le <head> de la page ; un script en ligne, lui, s'exécute en tête du corps de page — ce qui convient à Google Tag Manager.",
  bodyStart:
    "Juste après l'ouverture du corps de page. C'est là que va le <noscript> d'un gestionnaire de balises.",
  bodyEnd: "En fin de page, après tout le contenu. Le meilleur choix par défaut pour un script de mesure : il ne retarde pas l'affichage.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CodeSnippetManager({ snippets }: { snippets: readonly SnippetRow[] }) {
  const router = useRouter();
  const [edite, setEdite] = useState<{ id: string | null; valeurs: CodeSnippetInput } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function envoyer(methode: "POST" | "PUT" | "DELETE", id: string | null, corps?: unknown) {
    setOccupe(true);
    setErreur(null);
    try {
      const reponse = await fetch(id ? `/api/admin/scripts/${id}` : "/api/admin/scripts", {
        method: methode,
        headers: corps ? { "Content-Type": "application/json" } : undefined,
        body: corps ? JSON.stringify(corps) : undefined,
      });
      if (!reponse.ok) {
        const donnees: unknown = await reponse.json().catch(() => null);
        const message =
          donnees && typeof donnees === "object" && "error" in donnees
            ? String((donnees as { error: unknown }).error)
            : "L'enregistrement a échoué.";
        setErreur(message);
        return false;
      }
      setEdite(null);
      router.refresh();
      return true;
    } finally {
      setOccupe(false);
    }
  }

  async function basculer(ligne: SnippetRow) {
    await envoyer("PUT", ligne.id, { ...ligne, enabled: !ligne.enabled });
  }

  async function supprimer(ligne: SnippetRow) {
    if (!confirm(`Supprimer « ${ligne.name} » ? Le fragment cessera d'être injecté.`)) return;
    await envoyer("DELETE", ligne.id);
  }

  if (edite) {
    const { id, valeurs } = edite;
    const modifier = (champ: Partial<CodeSnippetInput>) =>
      setEdite({ id, valeurs: { ...valeurs, ...champ } });

    return (
      <div className="max-w-3xl rounded-sm border border-border bg-white p-5">
        <h2 className="mb-4 text-sm font-black text-foreground">
          {id ? "Modifier le fragment" : "Nouveau fragment"}
        </h2>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom</span>
          <input
            value={valeurs.name}
            onChange={(e) => modifier({ name: e.target.value })}
            placeholder="Google Tag Manager"
            className="w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Sert uniquement à vous y retrouver ; il n&apos;apparaît pas sur la boutique.
          </span>
        </label>

        <label className="mb-1 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">Emplacement</span>
          <select
            value={valeurs.placement}
            onChange={(e) => modifier({ placement: e.target.value as SnippetPlacement })}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {SNIPPET_PLACEMENTS.map((placement) => (
              <option key={placement} value={placement}>
                {PLACEMENT_LABELS[placement]}
              </option>
            ))}
          </select>
        </label>
        <p className="mb-4 text-xs text-muted-foreground">{AIDE_EMPLACEMENT[valeurs.placement]}</p>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-semibold text-foreground">Code</span>
          <textarea
            value={valeurs.content}
            onChange={(e) => modifier({ content: e.target.value })}
            rows={12}
            spellCheck={false}
            placeholder="<!-- Collez ici le code fourni par le service -->"
            className="w-full rounded-sm border border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            HTML brut, balises <code>&lt;script&gt;</code> comprises. Collez le code tel que le
            service vous le donne, sans rien retirer.
          </span>
        </label>

        <div className="mb-5 flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={valeurs.enabled}
              onChange={(e) => modifier({ enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="font-semibold text-foreground">Actif sur la boutique</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">Ordre</span>
            <input
              type="number"
              min={0}
              max={999}
              value={valeurs.position}
              onChange={(e) => modifier({ position: Number(e.target.value) })}
              className="w-20 rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">
              Croissant, à emplacement égal. Un mode consentement doit précéder ce qu&apos;il
              gouverne.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            type="button"
            disabled={occupe}
            onClick={() => void envoyer(id ? "PUT" : "POST", id, valeurs)}
            className="rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {occupe ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            disabled={occupe}
            onClick={() => {
              setEdite(null);
              setErreur(null);
            }}
            className="rounded-sm border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground/80 hover:border-primary disabled:opacity-50"
          >
            Annuler
          </button>
          {erreur && <p className="w-full text-sm font-semibold text-destructive">{erreur}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEdite({ id: null, valeurs: VIDE })}
        className="mb-4 flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
      >
        <Plus className="h-4 w-4" />
        Ajouter un fragment
      </button>

      {erreur && <p className="mb-4 text-sm font-semibold text-destructive">{erreur}</p>}

      {snippets.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun fragment pour l&apos;instant.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left">
                <th className="px-4 py-3 font-black text-foreground">Fragment</th>
                <th className="px-4 py-3 font-black text-foreground">Emplacement</th>
                <th className="px-4 py-3 font-black text-foreground">État</th>
                <th className="px-4 py-3 font-black text-foreground">Dernière modification</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {snippets.map((ligne) => (
                <tr key={ligne.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span className="font-bold text-foreground">{ligne.name}</span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      {ligne.content.length} caractères
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PLACEMENT_LABELS[ligne.placement]}
                    <span className="mt-0.5 block text-xs">ordre {ligne.position}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={occupe}
                      onClick={() => void basculer(ligne)}
                      title={ligne.enabled ? "Désactiver" : "Activer"}
                      className={
                        ligne.enabled
                          ? "rounded-full bg-primary/15 px-2.5 py-1 text-xs font-black text-primary"
                          : "rounded-full bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground"
                      }
                    >
                      {ligne.enabled ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(ligne.updatedAt)}
                    <span className="mt-0.5 block">{ligne.updatedBy}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEdite({
                            id: ligne.id,
                            valeurs: {
                              name: ligne.name,
                              placement: ligne.placement,
                              content: ligne.content,
                              enabled: ligne.enabled,
                              position: ligne.position,
                            },
                          })
                        }
                        aria-label={`Modifier ${ligne.name}`}
                        className="rounded-sm p-2 text-foreground/60 hover:bg-muted hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={occupe}
                        onClick={() => void supprimer(ligne)}
                        aria-label={`Supprimer ${ligne.name}`}
                        className="rounded-sm p-2 text-foreground/60 hover:bg-muted hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
