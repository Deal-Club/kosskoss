"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
// `periode` est un module pur — vérifié : aucun import. Rien de serveur
// n'entre donc dans le paquet du navigateur par cette porte.
import type { Raccourci } from "@/lib/kk/periode";

const RACCOURCIS: { valeur: Raccourci; label: string }[] = [
  { valeur: "7j", label: "7 jours" },
  { valeur: "30j", label: "30 jours" },
  { valeur: "mois", label: "Ce mois" },
  { valeur: "annee", label: "Cette année" },
];

export function VentesPeriodeForm({
  raccourciActif,
  duInitial,
  auInitial,
}: {
  raccourciActif: Raccourci | null;
  duInitial: string;
  auInitial: string;
}) {
  const router = useRouter();
  const [du, setDu] = useState(duInitial);
  const [au, setAu] = useState(auInitial);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Les dates remplacent le raccourci : envoyer les deux afficherait une
    // période dont aucun bouton n'est actif.
    router.push(`/admin/ventes?du=${du}&au=${au}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {RACCOURCIS.map((raccourci) => (
          <Link
            key={raccourci.valeur}
            href={`/admin/ventes?p=${raccourci.valeur}`}
            className={`rounded-sm border px-3 py-1.5 text-sm ${
              raccourciActif === raccourci.valeur
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {raccourci.label}
          </Link>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Du
          <input
            type="date"
            value={du}
            onChange={(event) => setDu(event.target.value)}
            className="ml-2 rounded-sm border border-border px-2 py-1 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Au
          <input
            type="date"
            value={au}
            onChange={(event) => setAu(event.target.value)}
            className="ml-2 rounded-sm border border-border px-2 py-1 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          className="rounded-sm border border-border px-3 py-1.5 text-sm hover:border-primary"
        >
          Afficher
        </button>
      </form>
    </div>
  );
}
