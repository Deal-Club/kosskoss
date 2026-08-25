"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, Save, Loader2 } from "lucide-react";
import type { RoutineAdmin, ProduitChoisissable } from "@/server/kk/routine-admin";

/**
 * Éditeur d'une routine — création et modification.
 * Objectif « très facile » : les éléments essentiels (nom, besoin, niveau,
 * code, accroche, description, état) puis les produits dans l'ordre (ajouter,
 * monter/descendre, retirer, nommer le geste).
 */
type Step = { productId: string; productLabel: string; label: string; servable: boolean };
type Option = { value: string; label: string };

const CHAMP =
  "w-full rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";

export function RoutineEditor({
  routine,
  produits,
  besoins,
  niveaux,
}: {
  routine: RoutineAdmin | null;
  produits: ProduitChoisissable[];
  besoins: Option[];
  niveaux: Option[];
}) {
  const router = useRouter();
  const creation = routine === null;

  const [name, setName] = useState(routine?.name ?? "");
  const [besoinTag, setBesoinTag] = useState(routine?.besoinTag ?? besoins[0]?.value ?? "");
  const [niveau, setNiveau] = useState(routine?.niveau ?? niveaux[0]?.value ?? "eco");
  const [code, setCode] = useState(routine?.code ?? "");
  const [claim, setClaim] = useState(routine?.claim ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [active, setActive] = useState(routine?.active ?? true);
  const [steps, setSteps] = useState<Step[]>(routine?.steps ?? []);

  const [ajout, setAjout] = useState("");
  const [pending, setPending] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  const dejaLa = new Set(steps.map((s) => s.productId));
  const disponibles = produits.filter((p) => !dejaLa.has(p.id));
  const servables = steps.filter((s) => s.servable).length;

  function ajouter() {
    const p = produits.find((x) => x.id === ajout);
    if (!p) return;
    setSteps((prev) => [
      ...prev,
      { productId: p.id, productLabel: p.label, label: p.categorie, servable: p.servable },
    ]);
    setAjout("");
    setMessage(null);
  }
  function deplacer(i: number, sens: -1 | 1) {
    setSteps((prev) => {
      const j = i + sens;
      if (j < 0 || j >= prev.length) return prev;
      const c = [...prev];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }
  const retirer = (i: number) => setSteps((prev) => prev.filter((_, k) => k !== i));
  const majLabel = (i: number, v: string) =>
    setSteps((prev) => prev.map((s, k) => (k === i ? { ...s, label: v } : s)));

  async function enregistrer() {
    setPending(true);
    setMessage(null);
    const payload = {
      name,
      besoinTag,
      niveau,
      code,
      claim,
      description,
      active,
      steps: steps.map((s) => ({ productId: s.productId, label: s.label })),
    };
    try {
      const res = await fetch(
        creation ? "/api/admin/diagnostic/routines" : `/api/admin/diagnostic/routines/${routine!.id}`,
        {
          method: creation ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) {
        setMessage({ type: "erreur", texte: data?.error ?? "Enregistrement impossible." });
        return;
      }
      if (creation && data?.id) {
        router.push(`/admin/diagnostic/routines/${data.id}`);
        router.refresh();
        return;
      }
      setMessage({ type: "ok", texte: "Routine enregistrée." });
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Enregistrement impossible. Réessayez." });
    } finally {
      setPending(false);
    }
  }

  async function supprimer() {
    if (!routine) return;
    if (!window.confirm(`Supprimer définitivement la routine « ${routine.name} » ?`)) return;
    setSuppression(true);
    try {
      const res = await fetch(`/api/admin/diagnostic/routines/${routine.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/admin/diagnostic/routines");
      router.refresh();
    } catch {
      setMessage({ type: "erreur", texte: "Suppression impossible." });
      setSuppression(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/diagnostic/routines"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Toutes les routines
      </Link>

      <h1 className="mb-4 text-2xl font-black text-foreground">
        {creation ? "Créer une routine" : "Modifier la routine"}
      </h1>

      {/* Éléments de la routine */}
      <div className="mb-5 grid gap-4 rounded-xl border border-border bg-white p-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-semibold text-foreground">Nom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={CHAMP} placeholder="ex. Teint Net Essentielle" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Besoin</span>
          <select value={besoinTag} onChange={(e) => setBesoinTag(e.target.value)} className={CHAMP}>
            {besoins.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-foreground">Niveau</span>
          <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={CHAMP}>
            {niveaux.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            Code diagnostic <span className="font-normal text-muted-foreground">(facultatif)</span>
          </span>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={CHAMP} placeholder="ex. TAC-ECO" />
          <span className="mt-1 block text-xs text-muted-foreground">
            Pour apparaître dans l&apos;arbre du diagnostic, le code doit correspondre à un
            emplacement de la matrice (ex. TAC-ECO, IMP-PREM…). Laissez vide pour une routine hors
            diagnostic (visible seulement sur la page Routines).
          </span>
        </label>

        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-semibold text-foreground">Accroche</span>
          <input value={claim} onChange={(e) => setClaim(e.target.value)} className={CHAMP} placeholder="Une phrase courte : le bénéfice de la routine" />
        </label>

        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block font-semibold text-foreground">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={CHAMP} />
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          Routine active (visible)
        </label>
      </div>

      {/* Produits */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Produits, dans l&apos;ordre</p>
        <span className={`text-xs font-semibold ${servables < 2 ? "text-destructive" : "text-[#16a34a]"}`}>
          {servables} servable{servables > 1 ? "s" : ""} {servables < 2 && "— 2 minimum pour s'afficher au client"}
        </span>
      </div>

      {steps.length === 0 ? (
        <p className="mb-3 rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucun produit. Ajoutez-en au moins deux ci-dessous.
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {steps.map((s, i) => (
            <li
              key={s.productId}
              className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-xl border p-2.5 ${
                s.servable ? "border-border bg-white" : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex flex-col">
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === steps.length - 1} aria-label="Descendre" className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{s.productLabel}</p>
                {!s.servable && <p className="text-xs text-destructive">Inactif ou en rupture — ignoré côté client</p>}
              </div>
              <label className="text-xs">
                <span className="sr-only">Nom du geste</span>
                <input value={s.label} onChange={(e) => majLabel(i, e.target.value)} placeholder="Geste" className="w-28 rounded-sm border border-border px-2 py-1.5 text-sm outline-none focus:border-primary" />
              </label>
              <button type="button" onClick={() => retirer(i)} aria-label="Retirer" className="rounded-sm p-2 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={ajout} onChange={(e) => setAjout(e.target.value)} className="min-w-0 flex-1 rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary">
          <option value="">＋ Ajouter un produit…</option>
          {disponibles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} {p.servable ? "" : "(inactif/rupture)"}
            </option>
          ))}
        </select>
        <button type="button" onClick={ajouter} disabled={!ajout} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-white px-3 py-2 text-sm font-bold text-foreground hover:border-primary disabled:opacity-50">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={enregistrer} disabled={pending} className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {creation ? "Créer la routine" : "Enregistrer"}
        </button>
        {!creation && (
          <button type="button" onClick={supprimer} disabled={suppression} className="inline-flex items-center gap-2 rounded-sm border border-destructive px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60">
            {suppression ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Supprimer
          </button>
        )}
        {message && (
          <span className={`text-sm font-semibold ${message.type === "ok" ? "text-[#16a34a]" : "text-destructive"}`}>
            {message.texte}
          </span>
        )}
      </div>
    </div>
  );
}
