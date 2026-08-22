"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatCents } from "@/lib/cart";
import { STATUT_BON_LABELS } from "@/lib/kk/approvisionnement";
import type { BonRecord, ReceptionLigneResultat } from "@/server/kk/bons";

export interface ProductOption {
  id: string;
  brand: string;
  name: string;
  stock: number;
}

const STATUT_TONE: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoye: "bg-accent text-accent-foreground",
  recu_partiel: "bg-[#b45309]/10 text-[#b45309]",
  recu: "bg-[#16a34a]/10 text-[#16a34a]",
  annule: "bg-destructive/10 text-destructive",
};

const inputClass =
  "rounded-sm border border-border px-3 py-1.5 text-sm outline-none focus:border-primary";

async function lireErreur(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Échec de l'opération.";
}

export function PurchaseOrderDetail({
  bon,
  products,
}: {
  bon: BonRecord;
  products: ProductOption[];
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Ajout de ligne
  const [productId, setProductId] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [coutUnitaire, setCoutUnitaire] = useState("");

  // Réception
  const [quantitesRecues, setQuantitesRecues] = useState<Record<string, string>>(() =>
    Object.fromEntries(bon.items.map((item) => [item.id, String(item.quantiteRestante || 0)])),
  );
  const [majCoutProduit, setMajCoutProduit] = useState(true);
  const [noteReception, setNoteReception] = useState("");
  const [resultat, setResultat] = useState<ReceptionLigneResultat[] | null>(null);

  const modifiable = bon.status === "brouillon";
  const receptionPossible = bon.status === "envoye" || bon.status === "recu_partiel";
  const peutAnnuler = bon.status !== "annule";

  const produitsDisponibles = useMemo(
    () => products.filter((p) => !bon.items.some((item) => item.productId === p.id)),
    [products, bon.items],
  );

  async function ajouterLigne(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);

    const quantiteNombre = Number.parseInt(quantite, 10);
    const coutNombre = Number.parseInt(coutUnitaire, 10);
    if (!productId || !Number.isInteger(quantiteNombre) || quantiteNombre <= 0) {
      setErreur("Choisissez un produit et une quantité valide.");
      return;
    }
    if (!Number.isInteger(coutNombre) || coutNombre < 0) {
      setErreur("Le coût unitaire doit être un nombre entier positif ou nul, en FCFA.");
      return;
    }

    setPending(true);
    const response = await fetch(`/api/admin/purchase-orders/${bon.id}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantityOrdered: quantiteNombre, unitCostCents: coutNombre }),
    });
    setPending(false);

    if (!response.ok) {
      setErreur(await lireErreur(response));
      return;
    }
    setProductId("");
    setQuantite("1");
    setCoutUnitaire("");
    router.refresh();
  }

  async function retirerLigne(ligneId: string) {
    setErreur(null);
    setPending(true);
    const response = await fetch(`/api/admin/purchase-orders/${bon.id}/lines/${ligneId}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!response.ok) {
      setErreur(await lireErreur(response));
      return;
    }
    router.refresh();
  }

  async function envoyer() {
    setErreur(null);
    setPending(true);
    const response = await fetch(`/api/admin/purchase-orders/${bon.id}/send`, { method: "POST" });
    setPending(false);
    if (!response.ok) {
      setErreur(await lireErreur(response));
      return;
    }
    router.refresh();
  }

  async function annuler() {
    if (!window.confirm(`Annuler le bon ${bon.reference} ? Ce qui a déjà été reçu reste reçu.`)) return;
    setErreur(null);
    setPending(true);
    const response = await fetch(`/api/admin/purchase-orders/${bon.id}/cancel`, { method: "POST" });
    setPending(false);
    if (!response.ok) {
      setErreur(await lireErreur(response));
      return;
    }
    router.refresh();
  }

  async function recevoir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setResultat(null);

    const receptions = bon.items
      .map((item) => ({ ligneId: item.id, quantite: Number.parseInt(quantitesRecues[item.id] || "0", 10) }))
      .filter((r) => Number.isInteger(r.quantite) && r.quantite > 0);

    if (receptions.length === 0) {
      setErreur("Saisissez au moins une quantité reçue.");
      return;
    }

    setPending(true);
    const response = await fetch(`/api/admin/purchase-orders/${bon.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receptions, majCoutProduit, note: noteReception }),
    });
    setPending(false);

    if (!response.ok) {
      setErreur(await lireErreur(response));
      return;
    }

    const data = (await response.json()) as { lignes: ReceptionLigneResultat[] };
    setResultat(data.lignes);
    setNoteReception("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-sm border border-border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">{bon.reference}</h1>
            <p className="text-sm text-muted-foreground">{bon.supplierName}</p>
          </div>
          <span
            className={`rounded-sm px-3 py-1 text-xs font-bold ${STATUT_TONE[bon.status] ?? "bg-muted text-muted-foreground"}`}
          >
            {STATUT_BON_LABELS[bon.status]}
          </span>
        </div>

        {bon.note && <p className="mb-3 text-sm text-muted-foreground">{bon.note}</p>}

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Engagé
            </span>
            <span className="font-black text-foreground">{formatCents(bon.engageCents)}</span>
          </div>
          <div>
            <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Reçu
            </span>
            <span className="font-black text-foreground">{formatCents(bon.recuCents)}</span>
          </div>
          <div>
            <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Restant
            </span>
            <span className="font-black text-foreground">{formatCents(bon.restantCents)}</span>
          </div>
          <div>
            <span className="block text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Envoyé le
            </span>
            <span className="font-black text-foreground">
              {bon.sentAt ? new Date(bon.sentAt).toLocaleDateString("fr-FR") : "—"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {modifiable && (
            <button
              type="button"
              onClick={envoyer}
              disabled={pending || bon.items.length === 0}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              Envoyer au fournisseur
            </button>
          )}
          {peutAnnuler && (
            <button
              type="button"
              onClick={annuler}
              disabled={pending}
              className="rounded-sm border border-destructive px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/5 disabled:opacity-60"
            >
              Annuler le bon
            </button>
          )}
        </div>

        {erreur && (
          <p className="mt-3 rounded-sm border border-destructive bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive">
            {erreur}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-black text-foreground">Lignes</h2>
        {bon.items.length === 0 ? (
          <p className="rounded-sm border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
            Aucune ligne pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Commandé</th>
                  <th className="px-4 py-3">Reçu</th>
                  <th className="px-4 py-3">Reste à recevoir</th>
                  <th className="px-4 py-3">Coût unitaire</th>
                  {modifiable && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {bon.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.brand} {item.name}
                      {!item.productId && (
                        <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                          produit non rattaché
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.quantityOrdered}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.quantityReceived}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.quantiteRestante}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCents(item.unitCostCents)}</td>
                    {modifiable && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void retirerLigne(item.id)}
                          disabled={pending}
                          title="Retirer la ligne"
                          aria-label="Retirer la ligne"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modifiable && (
          <form
            onSubmit={ajouterLigne}
            className="mt-3 flex flex-wrap items-end gap-3 rounded-sm border border-border bg-white p-4"
          >
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Produit</span>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className={`${inputClass} w-64`}
              >
                <option value="">Choisir…</option>
                {produitsDisponibles.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.brand} {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Quantité commandée</span>
              <input
                type="number"
                min={1}
                value={quantite}
                onChange={(event) => setQuantite(event.target.value)}
                className={`${inputClass} w-28`}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-foreground">Coût unitaire (FCFA)</span>
              <input
                type="number"
                min={0}
                value={coutUnitaire}
                onChange={(event) => setCoutUnitaire(event.target.value)}
                className={`${inputClass} w-32`}
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:brightness-125 disabled:opacity-60"
            >
              Ajouter la ligne
            </button>
          </form>
        )}
      </section>

      {receptionPossible && (
        <section>
          <h2 className="mb-3 text-lg font-black text-foreground">Réception</h2>
          <form onSubmit={recevoir} className="rounded-sm border border-border bg-white p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2 pr-4">Produit</th>
                    <th className="py-2 pr-4">Reste à recevoir</th>
                    <th className="py-2 pr-4">Quantité reçue maintenant</th>
                  </tr>
                </thead>
                <tbody>
                  {bon.items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-semibold text-foreground">
                        {item.brand} {item.name}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{item.quantiteRestante}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          value={quantitesRecues[item.id] ?? "0"}
                          onChange={(event) =>
                            setQuantitesRecues((precedent) => ({
                              ...precedent,
                              [item.id]: event.target.value,
                            }))
                          }
                          className={`${inputClass} w-24`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={majCoutProduit}
                onChange={(event) => setMajCoutProduit(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-semibold text-foreground">
                  Mettre à jour le coût d&apos;achat des produits
                </span>
                <span className="block text-xs text-muted-foreground">
                  Le coût du produit devient le coût payé sur cette réception. À décocher pour un achat
                  exceptionnel, qui ne doit pas s&apos;imposer comme référence.
                </span>
              </span>
            </label>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-semibold text-foreground">Note (facultatif)</span>
              <input
                value={noteReception}
                onChange={(event) => setNoteReception(event.target.value)}
                placeholder="ex. livraison partielle, bon de livraison n°…"
                className={`${inputClass} w-full`}
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Réception en cours…" : "Enregistrer la réception"}
            </button>
          </form>
        </section>
      )}

      {resultat && (
        <section>
          <h2 className="mb-3 text-lg font-black text-foreground">Compte rendu de la réception</h2>
          <div className="overflow-x-auto rounded-sm border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Quantité reçue</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Coût</th>
                  <th className="px-4 py-3">Remarque</th>
                </tr>
              </thead>
              <tbody>
                {resultat.map((ligne) => (
                  <tr key={ligne.ligneId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {ligne.brand} {ligne.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      +{ligne.quantiteRecue} (cumul {ligne.quantiteRecueTotale})
                    </td>
                    <td className="px-4 py-3">
                      {ligne.stockTouche ? (
                        <span className="rounded-sm bg-[#16a34a]/10 px-2 py-1 text-xs font-bold text-[#16a34a]">
                          Mis à jour
                        </span>
                      ) : (
                        <span className="rounded-sm bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                          Non touché
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ligne.coutMisAJour ? (
                        <span className="rounded-sm bg-[#16a34a]/10 px-2 py-1 text-xs font-bold text-[#16a34a]">
                          Mis à jour
                        </span>
                      ) : (
                        <span className="rounded-sm bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                          Inchangé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ligne.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
