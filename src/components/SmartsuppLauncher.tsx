"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/**
 * File d'attente de l'API Smartsupp.
 * Le chargeur rejoue `smartsupp._` une fois prêt : les appels passés avant la
 * fin du chargement — ici « ouvre le chat » — ne sont donc pas perdus.
 */
type SmartsuppQueue = ((...args: unknown[]) => void) & { _: unknown[][] };

declare global {
  interface Window {
    _smartsupp?: { key?: string; language?: string };
    smartsupp?: SmartsuppQueue;
  }
}

const LOADER = "https://www.smartsuppchat.com/loader.js?";

type Etat = "repos" | "chargement" | "ouvert" | "echec";

/**
 * Bouton de chat, en bas à droite de la boutique.
 *
 * POURQUOI UN BOUTON PLUTÔT QUE LE WIDGET DIRECT. Le code d'installation
 * Smartsupp charge le chat sur toutes les pages, pour tous les visiteurs, et
 * dépose un identifiant de visiteur avant que quiconque ait demandé quoi que ce
 * soit. Cet identifiant n'est pas nécessaire au fonctionnement de la boutique :
 * il relève alors du consentement (article 82 de la loi Informatique et
 * Libertés), donc d'un bandeau.
 *
 * Ici, rien ne part tant que le visiteur n'a pas cliqué. Le clic EST la demande
 * expresse du service, ce qui fait tomber l'obligation de recueil préalable —
 * et évite d'imposer un bandeau à tout le monde pour une fonction que peu de
 * gens utilisent. La page « Politique de confidentialité » décrit ce
 * fonctionnement ; les deux doivent rester d'accord.
 */
export function SmartsuppLauncher({
  chatKey,
  language,
  label,
}: {
  chatKey: string;
  language: string;
  label: string;
}) {
  const [etat, setEtat] = useState<Etat>("repos");

  // Le chat, une fois chargé, survit au démontage du composant — un changement
  // de langue remonte cette partie de l'arbre alors que le widget, lui, reste
  // dans la page. Sans cette lecture, le bouton reviendrait se poser par-dessus.
  // `useSyncExternalStore` est la façon prévue de lire une valeur qui vit hors
  // de React : elle rend `false` au rendu serveur, où `window` n'existe pas.
  const dejaCharge = useSyncExternalStore(
    () => () => {},
    () => window.smartsupp != null,
    () => false,
  );

  const ouvrir = useCallback(() => {
    if (etat !== "repos" && etat !== "echec") return;
    setEtat("chargement");

    window._smartsupp = window._smartsupp ?? {};
    window._smartsupp.key = chatKey;
    window._smartsupp.language = language;

    if (!window.smartsupp) {
      const file: SmartsuppQueue = Object.assign(
        (...args: unknown[]) => {
          file._.push(args);
        },
        { _: [] as unknown[][] },
      );
      window.smartsupp = file;
    }

    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = LOADER;
    script.addEventListener("load", () => setEtat("ouvert"));
    // Un bloqueur de publicité filtre couramment ce domaine : mieux vaut
    // rendre la main au visiteur que laisser un bouton qui tourne dans le vide.
    script.addEventListener("error", () => setEtat("echec"));
    document.head.appendChild(script);

    // Mis en file : le chargeur l'exécutera, le chat s'ouvrira sans second clic.
    window.smartsupp("chat:open");
  }, [chatKey, etat, language]);

  // Une fois le chat chargé, c'est le widget Smartsupp qui occupe le coin :
  // notre bouton doit disparaître pour ne pas le recouvrir.
  if (etat === "ouvert" || dejaCharge) return null;

  return (
    <button
      type="button"
      onClick={ouvrir}
      disabled={etat === "chargement"}
      aria-label={label}
      title={label}
      className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:scale-100 disabled:opacity-70"
    >
      {etat === "chargement" ? (
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
          <path d="M12 3C6.9 3 3 6.6 3 11c0 2.3 1.1 4.4 2.9 5.8L5 21l4.4-2.1c.8.2 1.7.3 2.6.3 5.1 0 9-3.6 9-8s-3.9-8-9-8z" />
        </svg>
      )}
    </button>
  );
}
