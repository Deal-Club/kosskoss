/**
 * Reconnaissance des marques écrites de plusieurs façons.
 *
 * ── DEUX FONCTIONS, DEUX RÔLES ──────────────────────────────────────────────
 *
 * `slugify` (src/lib/slugify.ts) fabrique un identifiant d'URL : il écrase tout
 * ce qui n'est pas alphanumérique en tirets. `cleMarque` sert à autre chose —
 * décider si deux écritures désignent la même marque.
 *
 * Les confondre ferait fondre « La Roche Posay » et « LaRochePosay », qui sont
 * peut-être deux gammes distinctes. Le rapprochement ignore donc la casse et
 * les accents, ET RIEN D'AUTRE : ce sont les deux seules variations qu'une
 * saisie au clavier produit sans intention.
 */
import { slugify } from "@/lib/slugify";

export function cleMarque(nom: string): string {
  return nom
    .trim()
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Identifiant d'URL d'une marque. Délégué : une seule règle de slug dans le dépôt. */
export function slugMarque(nom: string): string {
  return slugify(nom);
}
