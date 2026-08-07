"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import {
  VITESSE_MAX,
  VITESSE_MIN,
  type AnnouncementConfig,
  type AnnouncementItem,
} from "@/lib/kk/announcement";
import { ICONES_DISPONIBLES } from "@/components/kk/announcement-bar";

/**
 * Administration du bandeau d'annonce : les messages d'un côté, l'apparence de
 * l'autre.
 *
 * Chaque action écrit immédiatement puis rafraîchit la page : le bandeau étant
 * monté par le gabarit de la boutique, l'aperçu du haut de cette page montre
 * exactement ce que verra le visiteur.
 */

const CHAMP =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary";

const BOUTON =
  "inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-60";

export function AnnouncementManager({
  items: itemsInitiaux,
  config: configInitiale,
}: {
  items: AnnouncementItem[];
  config: AnnouncementConfig;
}) {
  const router = useRouter();
  const [items, setItems] = useState(itemsInitiaux);
  const [config, setConfig] = useState(configInitiale);
  const [message, setMessage] = useState("");
  const [icone, setIcone] = useState<string>("sparkles");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function appeler(url: string, init: RequestInit): Promise<unknown | null> {
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErreur(data?.error ?? "L'enregistrement a échoué.");
        return null;
      }
      router.refresh();
      return await res.json().catch(() => null);
    } catch {
      setErreur("Impossible de joindre le serveur.");
      return null;
    } finally {
      setOccupe(false);
    }
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    const cree = (await appeler("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ message, icon: icone }),
    })) as AnnouncementItem | null;
    if (cree) {
      setItems((liste) => [...liste, cree]);
      setMessage("");
    }
  }

  async function basculer(item: AnnouncementItem) {
    const modifie = (await appeler(`/api/admin/announcements/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !item.active }),
    })) as AnnouncementItem | null;
    if (modifie) setItems((liste) => liste.map((x) => (x.id === item.id ? modifie : x)));
  }

  async function supprimer(id: string) {
    const ok = await appeler(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (ok) setItems((liste) => liste.filter((x) => x.id !== id));
  }

  async function deplacer(index: number, sens: -1 | 1) {
    const cible = index + sens;
    if (cible < 0 || cible >= items.length) return;
    const ordonne = [...items];
    [ordonne[index], ordonne[cible]] = [ordonne[cible], ordonne[index]];
    setItems(ordonne);
    await appeler("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ ids: ordonne.map((x) => x.id) }),
    });
  }

  async function enregistrerReglages(partiel: Partial<AnnouncementConfig>) {
    const suivant = { ...config, ...partiel };
    setConfig(suivant);
    await appeler("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ config: suivant }),
    });
  }

  const actifs = items.filter((x) => x.active);

  return (
    <div className="space-y-8">
      {erreur && (
        <p role="alert" className="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {/* Aperçu : le rendu exact du bandeau, avec les réglages en cours. */}
      <section>
        <h2 className="mb-2 text-sm font-black text-foreground">Aperçu</h2>
        <div
          className="overflow-hidden rounded-sm"
          style={{ background: config.background, color: config.color }}
        >
          {actifs.length === 0 ? (
            <p className="px-4 py-2 text-center text-[0.7rem] uppercase tracking-[0.2em] opacity-70">
              Aucune annonce active — le bandeau ne s&apos;affiche pas
            </p>
          ) : (
            <p className="flex flex-wrap items-center justify-center gap-6 px-4 py-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.2em]">
              {actifs.map((x) => (
                <span key={x.id}>{x.message}</span>
              ))}
            </p>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {config.enabled
            ? `${actifs.length} annonce${actifs.length > 1 ? "s" : ""} affichée${actifs.length > 1 ? "s" : ""} en boutique.`
            : "Le bandeau est désactivé : rien ne s'affiche en boutique."}
        </p>
      </section>

      {/* Messages */}
      <section>
        <h2 className="mb-3 text-sm font-black text-foreground">Messages</h2>

        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-white p-3"
            >
              <span className="flex flex-col text-muted-foreground">
                <button
                  type="button"
                  onClick={() => deplacer(index, -1)}
                  disabled={index === 0 || occupe}
                  aria-label="Monter"
                  className="px-1 text-xs hover:text-primary disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(index, 1)}
                  disabled={index === items.length - 1 || occupe}
                  aria-label="Descendre"
                  className="px-1 text-xs hover:text-primary disabled:opacity-30"
                >
                  ▼
                </button>
              </span>
              <GripVertical className="h-4 w-4 shrink-0 text-border" aria-hidden />

              <span className="min-w-0 flex-1 text-sm text-foreground">{item.message}</span>
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {item.icon || "—"}
              </span>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={() => basculer(item)}
                  disabled={occupe}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Actif
              </label>

              <button
                type="button"
                onClick={() => supprimer(item.id)}
                disabled={occupe}
                aria-label={`Supprimer « ${item.message} »`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="rounded-sm border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucun message. Ajoutez-en un ci-dessous.
            </li>
          )}
        </ul>

        <form onSubmit={ajouter} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block font-semibold text-foreground">Nouveau message</span>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
              placeholder="Livraison offerte dès 25 000 FCFA"
              className={CHAMP}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Icône</span>
            <select value={icone} onChange={(e) => setIcone(e.target.value)} className={CHAMP}>
              {ICONES_DISPONIBLES.map((nom) => (
                <option key={nom} value={nom}>
                  {nom}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={occupe || !message.trim()} className={BOUTON}>
            {occupe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter
          </button>
        </form>
      </section>

      {/* Apparence */}
      <section>
        <h2 className="mb-3 text-sm font-black text-foreground">Apparence</h2>
        <div className="grid gap-4 rounded-sm border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Couleur de fond</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={config.background}
                onChange={(e) => enregistrerReglages({ background: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-sm border border-border"
              />
              <span className="font-mono text-xs text-muted-foreground">{config.background}</span>
            </span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">Couleur du texte</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) => enregistrerReglages({ color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-sm border border-border"
              />
              <span className="font-mono text-xs text-muted-foreground">{config.color}</span>
            </span>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold text-foreground">
              Vitesse — {config.speedSeconds} s par tour
            </span>
            {/* Le curseur est inversé : glisser vers la droite accélère, ce qui
                est le sens attendu, alors que la valeur stockée est une durée. */}
            <input
              type="range"
              min={VITESSE_MIN}
              max={VITESSE_MAX}
              step={1}
              value={VITESSE_MAX + VITESSE_MIN - config.speedSeconds}
              onChange={(e) =>
                enregistrerReglages({
                  speedSeconds: VITESSE_MAX + VITESSE_MIN - Number(e.target.value),
                })
              }
              className="mt-2 w-full accent-[var(--primary)]"
            />
            <span className="mt-1 flex justify-between text-[0.7rem] text-muted-foreground">
              <span>Lent</span>
              <span>Rapide</span>
            </span>
          </label>

          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => enregistrerReglages({ enabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="font-semibold text-foreground">Bandeau activé</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.scrolling}
                onChange={(e) => enregistrerReglages({ scrolling: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span className="font-semibold text-foreground">Faire défiler</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Sans défilement, les messages restent posés côte à côte.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
