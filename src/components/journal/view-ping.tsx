"use client";

import { useEffect } from "react";

/**
 * Signal de lecture.
 *
 * Le comptage a lieu ICI, côté client, et non pendant le rendu de la page. La
 * raison n'est pas idéologique : les pages du site sont générées
 * statiquement. Incrémenter un compteur pendant le rendu rendrait chaque
 * article dynamique et coûterait une écriture en base par visite — on paierait
 * un chiffre indicatif au prix du cache de tout le Journal.
 *
 * Le dédoublonnage passe par `sessionStorage` : un lecteur qui rafraîchit, revient
 * en arrière ou rouvre l'article dans la même session ne compte qu'une fois.
 * Ce n'est pas de la mesure d'audience — pour ça il y a les balises posées
 * depuis « Scripts & balises » — c'est un indicateur interne pour classer « les
 * plus lus ».
 *
 * Le composant ne rend rien et ne bloque rien : si la requête échoue, la
 * lecture n'en sait rien.
 */
export function ViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `kk-journal-vu:${slug}`;

    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Navigation privée ou stockage refusé : on laisse passer le signal,
      // le serveur a son propre frein.
    }

    const controller = new AbortController();
    void fetch(`/api/journal/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // Un compteur de vues ne dérange jamais un lecteur.
    });

    return () => controller.abort();
  }, [slug]);

  return null;
}
