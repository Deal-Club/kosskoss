"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StockProductRow, StockReason } from "@/server/stock";

// Seuls les types viennent du module serveur — la liste de choix reste locale
// pour qu'aucun code Prisma n'atterrisse dans le bundle client.
const REASON_OPTIONS: { value: StockReason; label: string }[] = [
  { value: "korrektur", label: "Correction" },
  { value: "wareneingang", label: "Réception marchandise" },
  { value: "verkauf", label: "Vente" },
  { value: "retoure", label: "Retour" },
];

interface StockTableProps {
  products: StockProductRow[];
}

interface AdjustPayload {
  productId: string;
  delta?: number;
  stock?: number;
  reason: StockReason;
  note?: string;
}

const controlClass =
  "rounded-sm border border-border px-2 py-1.5 text-sm outline-none focus:border-primary";

export function StockTable({ products }: StockTableProps) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState("");
  const [reason, setReason] = useState<StockReason>("korrektur");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function send(payload: AdjustPayload) {
    setPendingId(payload.productId);
    setError(null);

    const response = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPendingId(null);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "L'enregistrement du mouvement a échoué.");
      return false;
    }
    router.refresh();
    return true;
  }

  function openRow(product: StockProductRow) {
    setOpenId(product.id);
    setTargetValue(product.stock.toString());
    setReason("korrektur");
    setNote("");
    setError(null);
  }

  async function handleAbsolute(product: StockProductRow) {
    const value = Number.parseInt(targetValue, 10);
    if (!Number.isInteger(value) || value < 0) {
      setError("Veuillez saisir un stock supérieur ou égal à 0.");
      return;
    }
    if (value === product.stock) {
      setError("Le stock correspond déjà à cette valeur.");
      return;
    }
    const done = await send({ productId: product.id, stock: value, reason, note });
    if (done) setOpenId(null);
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-sm border border-destructive px-3 py-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Seuil d&apos;alerte</th>
              <th className="px-4 py-3 text-right">Mouvement</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun produit disponible.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const soldOut = product.stock <= 0;
              const low = !soldOut && product.stock <= product.lowStockThreshold;
              const busy = pendingId === product.id;

              return (
                <tr key={product.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">{product.brand}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.categoryLabel}</td>
                  <td className="px-4 py-3">
                    {soldOut ? (
                      <span className="rounded-sm bg-destructive px-2 py-1 text-xs font-bold text-white">
                        En rupture
                      </span>
                    ) : low ? (
                      <span className="rounded-sm bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                        {product.stock}
                      </span>
                    ) : (
                      <span className="font-black text-foreground">{product.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.lowStockThreshold}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy || soldOut}
                        onClick={() =>
                          send({ productId: product.id, delta: -1, reason: "korrektur" })
                        }
                        className="rounded-sm border border-border px-2 py-1 text-xs font-black text-foreground hover:border-primary disabled:opacity-40"
                      >
                        −1
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          send({ productId: product.id, delta: 1, reason: "korrektur" })
                        }
                        className="rounded-sm border border-border px-2 py-1 text-xs font-black text-foreground hover:border-primary disabled:opacity-40"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => (openId === product.id ? setOpenId(null) : openRow(product))}
                        className="rounded-sm bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground hover:brightness-125 disabled:opacity-40"
                      >
                        {openId === product.id ? "Fermer" : "Ajuster"}
                      </button>
                    </div>

                    {openId === product.id && (
                      <div className="mt-3 flex flex-wrap items-end justify-end gap-2 border-t border-border pt-3">
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-foreground">
                            Nouveau stock
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={targetValue}
                            onChange={(event) => setTargetValue(event.target.value)}
                            className={`${controlClass} w-24`}
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-foreground">Motif</span>
                          <select
                            value={reason}
                            onChange={(event) => setReason(event.target.value as StockReason)}
                            className={controlClass}
                          >
                            {REASON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-foreground">
                            Note (facultatif)
                          </span>
                          <input
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="ex. Livraison 4711"
                            className={`${controlClass} w-52`}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAbsolute(product)}
                          className="rounded-sm bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
                        >
                          {busy ? "Enregistrement…" : "Enregistrer"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
