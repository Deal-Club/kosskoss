/**
 * Contrôle et découpage des fragments de code posés depuis l'administration.
 *
 * Ce module ne connaît ni la base ni Next : il transforme un objet reçu du
 * navigateur en fragment valide, ou explique pourquoi il refuse.
 *
 * LE POINT DÉLICAT : OÙ ATTERRIT LA BALISE.
 *
 * Un fragment est du HTML brut, inséré par `dangerouslySetInnerHTML`. Rendu par
 * le serveur, il est analysé par le navigateur comme le reste du document : les
 * `<script>` qu'il contient s'exécutent normalement. Mais il est inséré LÀ OÙ
 * le composant est monté — dans le `<body>`, puisque le layout de la boutique
 * est imbriqué sous le layout racine.
 *
 * Pour les scripts, c'est sans conséquence : un conteneur Google Tag Manager
 * fonctionne depuis le corps de page. Pour une balise de vérification de
 * propriété, c'en est une : `<meta name="google-site-verification">` n'est lue
 * que dans le `<head>`, et Google ignore purement et simplement la même balise
 * placée dans le corps.
 *
 * D'où le découpage opéré ici : les balises `<meta>` et `<link>` du fragment
 * sont extraites et rendues comme de vrais éléments React, que React 19 remonte
 * de lui-même dans le `<head>` — comportement vérifié sur ce projet. Le reste
 * du fragment part en HTML brut, à sa place.
 *
 * L'analyse est volontairement étroite : elle ne reconnaît que des balises
 * `<meta>` et `<link>` autonomes, aux attributs simples. Tout ce qui sort de ce
 * cadre — guillemets manquants, attribut sans valeur, balise imbriquée — n'est
 * pas « réparé » : il reste dans le HTML brut, où il s'affichera tel quel.
 * Mieux vaut une balise au mauvais endroit qu'une balise silencieusement
 * déformée.
 */

/** Emplacements proposés dans le formulaire. */
export type SnippetPlacement = "head" | "bodyStart" | "bodyEnd";

export const SNIPPET_PLACEMENTS: readonly SnippetPlacement[] = ["head", "bodyStart", "bodyEnd"];

export const PLACEMENT_LABELS: Readonly<Record<SnippetPlacement, string>> = {
  head: "En-tête",
  bodyStart: "Début de page",
  bodyEnd: "Pied de page",
};

/** Ce que le formulaire envoie, avant contrôle. */
export interface CodeSnippetInput {
  name: string;
  placement: SnippetPlacement;
  content: string;
  enabled: boolean;
  position: number;
}

export const SNIPPET_LIMITS = {
  name: 120,
  content: 20_000,
  position: 999,
} as const;

export type SnippetResult =
  | { readonly ok: true; readonly snippet: CodeSnippetInput }
  | { readonly ok: false; readonly error: string };

export function isSnippetPlacement(value: unknown): value is SnippetPlacement {
  return typeof value === "string" && (SNIPPET_PLACEMENTS as readonly string[]).includes(value);
}

/** Contrôle un fragment soumis et le rend prêt à être stocké. */
export function normalizeCodeSnippet(raw: unknown): SnippetResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Requête illisible." };
  }
  const input = raw as Partial<CodeSnippetInput>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    return { ok: false, error: "Donnez un nom au fragment, pour le retrouver dans la liste." };
  }
  if (name.length > SNIPPET_LIMITS.name) {
    return { ok: false, error: `Le nom dépasse ${SNIPPET_LIMITS.name} caractères.` };
  }

  if (!isSnippetPlacement(input.placement)) {
    return { ok: false, error: "Emplacement inconnu." };
  }

  // Seules les fins de ligne sont normalisées : l'indentation d'un fragment
  // collé depuis un tableau de bord tiers ne nous regarde pas.
  const content = typeof input.content === "string" ? input.content.replace(/\r\n?/g, "\n").trim() : "";
  if (!content) {
    return { ok: false, error: "Le fragment est vide." };
  }
  if (content.length > SNIPPET_LIMITS.content) {
    return { ok: false, error: `Le fragment dépasse ${SNIPPET_LIMITS.content} caractères.` };
  }

  const position = Number(input.position);
  if (!Number.isInteger(position) || position < 0 || position > SNIPPET_LIMITS.position) {
    return { ok: false, error: `L'ordre doit être un entier entre 0 et ${SNIPPET_LIMITS.position}.` };
  }

  return {
    ok: true,
    snippet: { name, placement: input.placement, content, enabled: input.enabled === true, position },
  };
}

// ---------------------------------------------------------------------------
// Découpage pour le rendu
// ---------------------------------------------------------------------------

/** Une balise `<meta>` ou `<link>` extraite, prête à devenir un élément React. */
export interface HoistedTag {
  readonly tag: "meta" | "link";
  readonly attributes: Readonly<Record<string, string>>;
}

export interface SplitSnippet {
  /** Balises à remonter dans le `<head>`. */
  readonly hoisted: readonly HoistedTag[];
  /** Ce qui reste, inséré tel quel là où le composant est monté. */
  readonly html: string;
}

/**
 * Balise `<meta …>` ou `<link …>` autonome, avec des attributs entre
 * guillemets. Le corps de la balise interdit `<` et `>` : une balise mal
 * fermée ne peut pas avaler la suite du fragment.
 */
const BALISE_REMONTABLE = /<(meta|link)\s+([^<>]*?)\/?>/gi;

/** Attribut `nom="valeur"` ou `nom='valeur'`. */
const ATTRIBUT = /([a-zA-Z][a-zA-Z0-9:_.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

/**
 * Correspondances entre attribut HTML et propriété React.
 * React accepte les attributs inconnus tels quels ; seuls ceux qu'il renomme
 * doivent être traduits, faute de quoi il les ignore en silence.
 */
const PROPRIETES_REACT: Readonly<Record<string, string>> = {
  charset: "charSet",
  class: "className",
  crossorigin: "crossOrigin",
  "http-equiv": "httpEquiv",
  referrerpolicy: "referrerPolicy",
  hreflang: "hrefLang",
  imagesrcset: "imageSrcSet",
  imagesizes: "imageSizes",
};

function versProprieteReact(nom: string): string {
  return PROPRIETES_REACT[nom.toLowerCase()] ?? nom;
}

/** Lit les attributs d'une balise. Rend null si l'un d'eux n'est pas exploitable. */
function lireAttributs(source: string): Record<string, string> | null {
  const attributs: Record<string, string> = {};
  let reste = source;

  ATTRIBUT.lastIndex = 0;
  for (let m = ATTRIBUT.exec(source); m !== null; m = ATTRIBUT.exec(source)) {
    attributs[versProprieteReact(m[1])] = m[3] ?? m[4] ?? "";
    reste = reste.replace(m[0], " ");
  }

  // Un résidu non vide signale un attribut sans valeur ou sans guillemets :
  // on préfère renoncer plutôt que de rendre une balise amputée.
  if (reste.trim().length > 0) return null;
  if (Object.keys(attributs).length === 0) return null;

  return attributs;
}

/**
 * Sépare les balises remontables du reste du fragment.
 * N'est appliqué qu'à l'emplacement « En-tête » : ailleurs, la position dans la
 * page est précisément ce que l'administrateur a demandé, et rien ne doit
 * bouger.
 */
export function splitSnippetForHead(content: string): SplitSnippet {
  const hoisted: HoistedTag[] = [];

  const html = content.replace(BALISE_REMONTABLE, (balise, nom: string, corps: string) => {
    const attributes = lireAttributs(corps);
    if (!attributes) return balise;
    hoisted.push({ tag: nom.toLowerCase() as "meta" | "link", attributes });
    return "";
  });

  return { hoisted, html: html.trim() };
}
