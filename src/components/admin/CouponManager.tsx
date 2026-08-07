"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { CouponKind, CouponView } from "@/lib/kk/coupon";

/**
 * Administration des codes promo.
 *
 * Les montants sont saisis et affichés en FCFA entiers, comme partout dans la
 * boutique — le champ historique `priceCents` ne porte pas de sous-unité.
 */

const CHAMP =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary";

const BOUTON =
  "inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-60";

const VIDE = {
  code: "",
  kind: "pourcentage" as CouponKind,
  value: 10,
  minSubtotalCents: 0,
  maxDiscountCents: 0,
  maxUses: 0,
  endsAt: "",
  description: "",
};

function formatFcfa(montant: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(montant)} FCFA`;
}

/** Résume la remise en une ligne lisible dans le tableau. */
function resumer(c: CouponView): string {
  const base = c.kind === "pourcentage" ? `−${c.value} %` : `−${formatFcfa(c.value)}`;
  const plafond = c.maxDiscountCents > 0 ? `, max ${formatFcfa(c.maxDiscountCents)}` : "";
  const minimum = c.minSubtotalCents > 0 ? `, dès ${formatFcfa(c.minSubtotalCents)}` : "";
  return base + plafond + minimum;
}

export function CouponManager({ coupons: initiaux }: { coupons: CouponView[] }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initiaux);
  const [form, setForm] = useState(VIDE);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function appeler(url: string, init: RequestInit): Promise<unknown | null> {
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setErreur(data?.error ?? "L'enregistrement a échoué.");
        return null;
      }
      router.refresh();
      return data;
    } catch {
      setErreur("Impossible de joindre le serveur.");
      return null;
    } finally {
      setOccupe(false);
    }
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    const cree = (await appeler("/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({ ...form, endsAt: form.endsAt || null }),
    })) as CouponView | null;
    if (cree) {
      setCoupons((liste) => [cree, ...liste]);
      setForm(VIDE);
    }
  }

  async function basculer(c: CouponView) {
    const modifie = (await appeler(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...c, active: !c.active }),
    })) as CouponView | null;
    if (modifie) setCoupons((liste) => liste.map((x) => (x.id === c.id ? modifie : x)));
  }

  async function supprimer(id: string) {
    const ok = await appeler(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (ok) setCoupons((liste) => liste.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      {erreur && (
        <p role="alert" className="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {/* Création */}
      <section>
        <h2 className="mb-3 text-sm font-black text-foreground">Nouveau code</h2>
        <form
          onSubmit={creer}
          className="grid gap-4 rounded-sm border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Code</span>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="BIENVENUE10"
              maxLength={32}
              required
              className={`${CHAMP} font-mono uppercase`}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Type de remise</span>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as CouponKind })}
              className={CHAMP}
            >
              <option value="pourcentage">Pourcentage</option>
              <option value="montant">Montant fixe</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">
              {form.kind === "pourcentage" ? "Remise (%)" : "Remise (FCFA)"}
            </span>
            <input
              type="number"
              min={1}
              max={form.kind === "pourcentage" ? 100 : undefined}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              required
              className={CHAMP}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Panier minimum (FCFA)</span>
            <input
              type="number"
              min={0}
              value={form.minSubtotalCents}
              onChange={(e) => setForm({ ...form, minSubtotalCents: Number(e.target.value) })}
              className={CHAMP}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">
              Remise maximale (FCFA)
            </span>
            <input
              type="number"
              min={0}
              value={form.maxDiscountCents}
              onChange={(e) => setForm({ ...form, maxDiscountCents: Number(e.target.value) })}
              className={CHAMP}
            />
            <span className="mt-1 block text-xs text-muted-foreground">0 = sans plafond</span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Utilisations max</span>
            <input
              type="number"
              min={0}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
              className={CHAMP}
            />
            <span className="mt-1 block text-xs text-muted-foreground">0 = illimité</span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Expire le</span>
            <input
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className={CHAMP}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Note interne</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opération de lancement"
              className={CHAMP}
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={occupe || !form.code.trim()} className={BOUTON}>
              {occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer le code
            </button>
          </div>
        </form>
      </section>

      {/* Liste */}
      <section>
        <h2 className="mb-3 text-sm font-black text-foreground">
          {coupons.length} code{coupons.length > 1 ? "s" : ""}
        </h2>

        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Remise</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Expire</th>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-foreground">{c.code}</span>
                    {c.description && (
                      <span className="block text-xs text-muted-foreground">{c.description}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{resumer(c)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.usedCount}
                    {c.maxUses > 0 ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.endsAt
                      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(
                          new Date(c.endsAt),
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={() => basculer(c)}
                      disabled={occupe}
                      aria-label={`Activer ${c.code}`}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => supprimer(c.id)}
                      disabled={occupe}
                      aria-label={`Supprimer ${c.code}`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun code promo. Créez-en un ci-dessus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
