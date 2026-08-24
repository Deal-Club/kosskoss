/**
 * Signalement d'une erreur survenue chez un visiteur.
 *
 * ── POURQUOI CE MODULE EXISTE AVANT TOUT OUTIL DE SUIVI ─────────────────────
 *
 * Le cahier des charges demande un suivi d'erreurs (Sentry). Le compte n'est
 * pas ouvert, et rien ne servirait de poser une dépendance qui ne peut pas
 * s'authentifier. Mais l'absence d'outil ne justifie pas l'absence de trace :
 * aujourd'hui, une erreur survenue chez un client ne laisse RIEN nulle part.
 *
 * Ce module est la couture. Il journalise côté serveur — donc dans les journaux
 * de l'hébergeur, consultables dès maintenant — et concentre en un seul endroit
 * l'appel qu'il faudra remplacer le jour où un collecteur existe. Brancher
 * Sentry consistera alors à changer le corps d'UNE fonction, pas à parcourir
 * l'application à la recherche des endroits où poser un appel.
 *
 * ── CE QU'IL NE FAUT JAMAIS Y METTRE ────────────────────────────────────────
 *
 * Ni le contenu d'un panier, ni une adresse, ni un numéro de téléphone, ni un
 * moyen de paiement. Un rapport d'erreur part vers un tiers : il porte de quoi
 * comprendre le défaut, jamais de quoi identifier la personne qui l'a subi.
 */

/** Ce qu'on retient d'une erreur, et rien de plus. */
export interface Incident {
  /** Où l'erreur s'est produite, en clair : « fiche produit », « tunnel ». */
  contexte: string;
  message: string;
  /** L'empreinte que Next.js donne à l'erreur en production, quand elle existe. */
  empreinte?: string;
  /** Chemin de la page, sans la chaîne de requête : elle peut porter une recherche. */
  chemin?: string;
}

/**
 * Journalise l'incident. Ne lève jamais.
 *
 * Un signalement qui échoue ne doit pas aggraver l'erreur qu'il rapporte : le
 * visiteur voit déjà une page en défaut, et une exception dans le rapporteur
 * remplacerait un message lisible par un écran blanc.
 */
export function signalerIncident(incident: Incident): void {
  try {
    const parties = [
      `[incident] ${incident.contexte}`,
      incident.chemin ? `chemin=${incident.chemin}` : "",
      incident.empreinte ? `empreinte=${incident.empreinte}` : "",
      incident.message,
    ].filter(Boolean);

    // `console.error` part dans les journaux de l'hébergeur. C'est la seule
    // destination disponible tant qu'aucun collecteur n'est configuré, et elle
    // vaut infiniment mieux que rien.
    console.error(parties.join(" | "));
  } catch {
    // Le rapporteur se tait plutôt que de casser la page d'erreur.
  }
}

/**
 * Réduit une erreur inconnue à un message exploitable.
 *
 * Ce qui remonte à une frontière d'erreur n'est pas toujours une `Error` : une
 * promesse peut être rejetée avec une chaîne, un objet, ou rien du tout.
 */
export function messageDErreur(erreur: unknown): string {
  if (erreur instanceof Error) return erreur.message || erreur.name;
  if (typeof erreur === "string") return erreur;
  return "Erreur sans message";
}
