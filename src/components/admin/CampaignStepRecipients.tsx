"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Mail, Send } from "lucide-react";
import {
  CADENCE_LIMITS,
  estimateSendSeconds,
  formatDuration,
  type CampaignLocale,
} from "@/lib/campaigns";
import type { CampaignDraft } from "@/components/admin/campaignDraft";

/**
 * Contact tel qu'il arrive de /api/admin/campaigns/contacts : `lastOrderAt` a
 * traversé JSON, c'est donc une chaîne et non plus une Date.
 */
interface ContactRow {
  email: string;
  firstName: string;
  lastName: string;
  locale: CampaignLocale;
  customerId: string | null;
  source: "compte" | "invite";
  orderCount: number;
  lastOrderAt: string | null;
  unsubscribed: boolean;
}

/** Au-delà, le tableau devient illisible : la recherche prend le relais. */
const MAX_VISIBLE = 200;

const inputClass =
  "rounded-sm border border-border px-3 py-2 text-sm outline-none focus:border-primary";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface CampaignStepRecipientsProps {
  draft: CampaignDraft;
  adminEmail: string;
  selectedEmails: string[];
  onSelectionChange: (emails: string[]) => void;
  onChange: (values: Partial<CampaignDraft>) => void;
  /** Rend l'adresse servie en cas de succès, null en cas d'échec. */
  onTest: (email: string) => Promise<string | null>;
  onLaunch: () => Promise<void>;
  /** Motif qui interdit le lancement, calculé par l'assistant. */
  blocked: string | null;
  pending: boolean;
}

/**
 * Étape 5 : à qui, et à quel rythme.
 *
 * Deux principes tiennent cet écran. Les désinscrits restent visibles mais
 * jamais sélectionnables : les masquer laisserait croire à des adresses
 * perdues, alors que la boutique honore un refus. Et le lancement passe par une
 * confirmation qui rappelle le nombre exact de destinataires — un envoi ne se
 * rattrape pas.
 */
export function CampaignStepRecipients({
  draft,
  adminEmail,
  selectedEmails,
  onSelectionChange,
  onChange,
  onTest,
  onLaunch,
  blocked,
  pending,
}: CampaignStepRecipientsProps) {
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [testDone, setTestDone] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/admin/campaigns/contacts");
      if (!response.ok) {
        if (!cancelled) setLoadError("Impossible de charger la base de contacts.");
        return;
      }
      const rows = (await response.json()) as ContactRow[];
      if (!cancelled) setContacts(rows);
    }

    void load();
    // Le drapeau évite d'écrire dans un composant démonté si l'administrateur
    // revient à l'étape précédente pendant le chargement.
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) =>
      `${contact.email} ${contact.firstName} ${contact.lastName}`.toLowerCase().includes(needle),
    );
  }, [contacts, query]);

  const selectable = filtered.filter((contact) => !contact.unsubscribed);
  const selected = new Set(selectedEmails);
  const allSelected = selectable.length > 0 && selectable.every((row) => selected.has(row.email));
  const someSelected = selectable.some((row) => selected.has(row.email));

  const unsubscribedCount = (contacts ?? []).filter((contact) => contact.unsubscribed).length;

  function toggle(email: string) {
    onSelectionChange(
      selected.has(email)
        ? selectedEmails.filter((entry) => entry !== email)
        : [...selectedEmails, email],
    );
  }

  function toggleAll() {
    if (allSelected) {
      const remove = new Set(selectable.map((row) => row.email));
      onSelectionChange(selectedEmails.filter((email) => !remove.has(email)));
      return;
    }
    const merged = new Set(selectedEmails);
    for (const row of selectable) merged.add(row.email);
    onSelectionChange([...merged]);
  }

  const estimate = estimateSendSeconds(selectedEmails.length, {
    batchMin: draft.batchMin,
    batchMax: draft.batchMax,
    delayMinSec: draft.delayMinSec,
    delayMaxSec: draft.delayMaxSec,
  });

  async function handleTest() {
    setTestDone(null);
    const served = await onTest(testEmail.trim() || adminEmail);
    if (served) setTestDone(served);
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-foreground">Destinataires</h2>
            <p className="text-sm text-muted-foreground">
              {contacts === null
                ? "Chargement de la base de contacts…"
                : `${contacts.length} adresse${contacts.length > 1 ? "s" : ""} connue${contacts.length > 1 ? "s" : ""}`}
              {unsubscribedCount > 0 && `, dont ${unsubscribedCount} désinscrite(s)`}
            </p>
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Recherche</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Adresse ou nom"
              className={`${inputClass} w-64 py-1.5`}
            />
          </label>
        </div>

        {loadError && (
          <p className="mb-3 rounded-sm border border-destructive bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive">
            {loadError}
          </p>
        )}

        <div className="overflow-x-auto rounded-sm border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  <label className="flex items-center gap-2 normal-case">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(element) => {
                        // L'état intermédiaire ne s'exprime qu'en JavaScript :
                        // il dit « une partie seulement est cochée ».
                        if (element) element.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={toggleAll}
                      disabled={selectable.length === 0}
                      className="h-4 w-4"
                    />
                    <span className="text-xs font-bold">Tout</span>
                  </label>
                </th>
                <th scope="col" className="px-4 py-3">
                  Contact
                </th>
                <th scope="col" className="px-4 py-3">
                  Origine
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Commandes
                </th>
                <th scope="col" className="px-4 py-3">
                  Dernière commande
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts === null && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {contacts !== null && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun contact ne correspond à cette recherche.
                  </td>
                </tr>
              )}
              {filtered.slice(0, MAX_VISIBLE).map((contact) => {
                const checked = selected.has(contact.email);
                return (
                  <tr
                    key={contact.email}
                    className={`border-b border-border last:border-0 ${
                      contact.unsubscribed ? "bg-muted/40 text-muted-foreground" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={contact.unsubscribed}
                        onChange={() => toggle(contact.email)}
                        aria-label={`Sélectionner ${contact.email}`}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-foreground">
                        {`${contact.firstName} ${contact.lastName}`.trim() || contact.email}
                      </span>
                      <span className="block text-xs text-muted-foreground">{contact.email}</span>
                      {contact.unsubscribed && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#b45309]">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Désinscrit : plus aucun message commercial ne peut lui être envoyé.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-sm px-2 py-1 text-xs font-bold ${
                          contact.source === "compte"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {contact.source === "compte" ? "client" : "invité"}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground uppercase">
                        {contact.locale}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {contact.orderCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {contact.lastOrderAt
                        ? dateFormatter.format(new Date(contact.lastOrderAt))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > MAX_VISIBLE && (
          <p className="mt-2 text-xs text-muted-foreground">
            {filtered.length - MAX_VISIBLE} contact(s) supplémentaire(s) non affiché(s). La case
            « Tout » sélectionne l&apos;ensemble des contacts filtrés, affichés ou non.
          </p>
        )}
      </div>

      <div className="rounded-sm border border-border bg-white p-6">
        <h2 className="mb-1 text-lg font-black text-foreground">Cadence d&apos;envoi</h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          La taille des lots et la durée des pauses sont tirées au hasard entre ces bornes. Un
          rythme parfaitement régulier est le premier signal qui fait classer un expéditeur comme
          automate, et la réputation d&apos;un domaine se répare en semaines.
        </p>

        <div className="grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Messages par lot (min)</span>
            <input
              type="number"
              min={CADENCE_LIMITS.batchMin}
              max={CADENCE_LIMITS.batchMax}
              step={1}
              value={draft.batchMin}
              onChange={(event) =>
                onChange({ batchMin: Number.parseInt(event.target.value, 10) || 0 })
              }
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Messages par lot (max)</span>
            <input
              type="number"
              min={CADENCE_LIMITS.batchMin}
              max={CADENCE_LIMITS.batchMax}
              step={1}
              value={draft.batchMax}
              onChange={(event) =>
                onChange({ batchMax: Number.parseInt(event.target.value, 10) || 0 })
              }
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Pause min (minutes)</span>
            <input
              type="number"
              min={CADENCE_LIMITS.delayMinSec / 60}
              max={CADENCE_LIMITS.delayMaxSec / 60}
              step={0.5}
              value={draft.delayMinSec / 60}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                onChange({ delayMinSec: Number.isFinite(value) ? Math.round(value * 60) : 0 });
              }}
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Pause max (minutes)</span>
            <input
              type="number"
              min={CADENCE_LIMITS.delayMinSec / 60}
              max={CADENCE_LIMITS.delayMaxSec / 60}
              step={0.5}
              value={draft.delayMaxSec / 60}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                onChange({ delayMaxSec: Number.isFinite(value) ? Math.round(value * 60) : 0 });
              }}
              className={`${inputClass} w-full`}
            />
          </label>
        </div>

        <p className="mt-4 text-sm font-semibold text-foreground">
          {selectedEmails.length === 0
            ? "Sélectionnez des destinataires pour estimer la durée de l'envoi."
            : `Environ ${formatDuration(estimate)} pour ${selectedEmails.length} destinataire${selectedEmails.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      <div className="rounded-sm border border-border bg-white p-6">
        <h2 className="mb-1 text-lg font-black text-foreground">Vérification et lancement</h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          L&apos;envoi de test enregistre d&apos;abord la campagne en brouillon, puis vous adresse le
          message tel qu&apos;il partira. Ses liens de suivi ne comptent dans aucune statistique.
        </p>

        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Adresse de test</span>
            <input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              className={`${inputClass} w-72`}
            />
          </label>
          <button
            type="button"
            onClick={handleTest}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:border-primary disabled:opacity-40"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Mail className="h-4 w-4" aria-hidden />
            )}
            M&apos;envoyer un message de test
          </button>
          {testDone && (
            <p className="py-2 text-sm font-semibold text-[#16a34a]">
              Message de test envoyé à {testDone}.
            </p>
          )}
        </div>

        {confirming ? (
          <div className="rounded-sm border border-primary bg-primary/5 p-5">
            <p className="text-base font-black text-foreground">
              Lancer l&apos;envoi vers {selectedEmails.length} destinataire
              {selectedEmails.length > 1 ? "s" : ""} ?
            </p>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              La liste sera figée telle quelle et les messages partiront par lots, sur environ{" "}
              {formatDuration(estimate)}. Un message envoyé ne se rattrape pas. La campagne pourra
              être mise en pause, mais seulement pour ce qui n&apos;est pas encore parti.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onLaunch()}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Oui, lancer la campagne
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-sm border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary disabled:opacity-40"
              >
                Revenir en arrière
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={blocked !== null || pending}
              className="flex items-center gap-1.5 rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden />
              Lancer la campagne
            </button>
            {blocked && <p className="text-sm text-muted-foreground">{blocked}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
