/**
 * Bornes de la période consultée au tableau de bord des ventes.
 *
 * ── POURQUOI CE MODULE EST PUR ──────────────────────────────────────────────
 *
 * L'écran, la barre de période (composant client) et la route d'export lisent
 * tous les trois la même période depuis l'URL. En gardant le module sans
 * dépendance, les trois partagent la règle au lieu de la recopier — et surtout
 * rien de serveur n'entre dans le paquet du navigateur.
 *
 * ── TOUT SE JOUE EN HEURE LOCALE ────────────────────────────────────────────
 *
 * Les jours affichés sont ceux du commerçant, pas ceux d'UTC. Une vente de
 * 23 h 30 doit compter pour ce jour-là, et non pour le lendemain.
 */

export type Raccourci = "7j" | "30j" | "mois" | "annee";

export interface Periode {
  du: Date;
  /** Fin de journée incluse : sans quoi le dernier jour perdrait ses ventes. */
  au: Date;
  /** `null` quand la période vient de deux dates saisies à la main. */
  raccourci: Raccourci | null;
}

const RACCOURCIS: readonly string[] = ["7j", "30j", "mois", "annee"];

export function estRaccourci(valeur: string | undefined): valeur is Raccourci {
  return valeur !== undefined && RACCOURCIS.includes(valeur);
}

/** « AAAA-MM-JJ » en heure locale — `toISOString` donnerait le jour UTC. */
export function formatJourIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function debutDeJour(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function finDeJour(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Lit « AAAA-MM-JJ ». Rend `null` sur tout le reste, y compris le 31 février. */
function lireJour(valeur: string | undefined): Date | null {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const [annee, mois, jour] = valeur.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(annee, mois - 1, jour);
  // `new Date(2026, 1, 31)` glisse au 3 mars sans prévenir : on vérifie que la
  // date rendue est bien celle demandée.
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) {
    return null;
  }
  return date;
}

export function bornesRaccourci(raccourci: Raccourci, maintenant: Date): { du: Date; au: Date } {
  const au = finDeJour(maintenant);

  if (raccourci === "mois") {
    return { du: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1), au };
  }
  if (raccourci === "annee") {
    return { du: new Date(maintenant.getFullYear(), 0, 1), au };
  }

  // « 7j » veut dire sept jours en tout, aujourd'hui compris : on remonte de
  // six jours, pas de sept.
  const jours = raccourci === "7j" ? 7 : 30;
  const debut = debutDeJour(maintenant);
  debut.setDate(debut.getDate() - (jours - 1));
  return { du: debut, au };
}

/** Le raccourci par défaut : la fenêtre où l'on décide encore quelque chose. */
const DEFAUT: Raccourci = "30j";

export function periodeDepuisUrl(
  params: { du?: string; au?: string; p?: string },
  maintenant: Date,
): Periode {
  // Le raccourci prime : les boutons réécrivent l'URL, et d'anciennes dates
  // laissées derrière afficheraient une période dont aucun bouton n'est actif.
  if (estRaccourci(params.p)) {
    return { ...bornesRaccourci(params.p, maintenant), raccourci: params.p };
  }

  const du = lireJour(params.du);
  const au = lireJour(params.au);
  // Une saisie illisible, une borne seule ou deux dates inversées retombent sur
  // le défaut : un écran vide sans explication se lit comme une absence de
  // ventes, ce qui est un mensonge différent.
  if (du && au && du.getTime() <= au.getTime()) {
    return { du: debutDeJour(du), au: finDeJour(au), raccourci: null };
  }

  return { ...bornesRaccourci(DEFAUT, maintenant), raccourci: DEFAUT };
}
