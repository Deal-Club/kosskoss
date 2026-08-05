/**
 * Formatage restreint des textes éditables depuis l'administration.
 *
 * Trois marques, et rien d'autre :
 *   **gras**        -> <strong>
 *   *italique*      -> <em>
 *   [texte](lien)   -> <a>
 *
 * Le résultat de l'analyse est un arbre de nœuds, jamais une chaîne de HTML :
 * le rendu passe par des éléments React (voir `components/RichText.tsx`) et
 * jamais par `dangerouslySetInnerHTML`. Un administrateur qui colle du HTML
 * dans un champ verra donc ses balises affichées telles quelles — l'injection
 * est impossible par construction, pas par filtrage.
 *
 * Une marque non refermée n'est pas une erreur : elle s'affiche littéralement.
 * Un texte juridique contient parfois une astérisque isolée (renvoi de note),
 * elle ne doit rien casser. Pour écrire une astérisque au milieu d'un mot mis
 * en forme, on l'échappe : `\*`.
 */

export type RichTextNode =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "strong"; readonly children: readonly RichTextNode[] }
  | { readonly kind: "em"; readonly children: readonly RichTextNode[] }
  | { readonly kind: "link"; readonly href: string; readonly children: readonly RichTextNode[] };

/** Caractères qu'une contre-oblique peut neutraliser. */
const ESCAPABLE = new Set(["*", "[", "]", "(", ")", "\\"]);

/**
 * Adresses acceptées dans un lien.
 *
 * L'allowlist est volontaire : tout ce qui n'y figure pas — à commencer par
 * `javascript:` et `data:` — n'est pas « nettoyé » mais refusé, et le lien
 * retombe alors en texte simple.
 */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value || /[\s<>"']/.test(value)) return false;

  // Lien interne : « /mentions-legales ». « //autre-site.tld » est un lien externe
  // déguisé, il ne passe pas.
  if (value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;

  return /^(https?:\/\/|mailto:|tel:)/i.test(value);
}

/** Vrai si le caractère à cette position est neutralisé par une contre-oblique. */
function isEscaped(input: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && input[i] === "\\"; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

/** Première occurrence non échappée de `needle`, ou -1. */
function indexOfUnescaped(input: string, needle: string, from: number): number {
  let index = input.indexOf(needle, from);
  while (index !== -1 && isEscaped(input, index)) {
    index = input.indexOf(needle, index + 1);
  }
  return index;
}

/**
 * Analyse un texte et rend son arbre de formatage.
 * Les sauts de ligne sont conservés dans les nœuds texte : c'est le rendu qui
 * décide d'en faire des `<br />`.
 */
export function parseRichText(input: string): RichTextNode[] {
  const nodes: RichTextNode[] = [];
  let buffer = "";
  let i = 0;

  function flush() {
    if (buffer) {
      nodes.push({ kind: "text", value: buffer });
      buffer = "";
    }
  }

  while (i < input.length) {
    const char = input[i];

    // Échappement : la contre-oblique disparaît, le caractère suivant est pris
    // au pied de la lettre.
    if (char === "\\" && i + 1 < input.length && ESCAPABLE.has(input[i + 1])) {
      buffer += input[i + 1];
      i += 2;
      continue;
    }

    if (char === "*" && input.startsWith("**", i)) {
      let close = indexOfUnescaped(input, "**", i + 2);
      // « ***texte*** » et « **gras *et italique*** » : trois astérisques d'affilée
      // ferment d'abord l'italique. On décale d'un cran pour que le gras englobe
      // bien l'italique au lieu de se refermer trop tôt.
      if (close !== -1 && input[close + 2] === "*") close += 1;

      if (close > i + 2) {
        flush();
        nodes.push({ kind: "strong", children: parseRichText(input.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    if (char === "*") {
      const close = indexOfUnescaped(input, "*", i + 1);
      if (close > i + 1) {
        flush();
        nodes.push({ kind: "em", children: parseRichText(input.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }

    if (char === "[") {
      const labelEnd = indexOfUnescaped(input, "]", i + 1);
      if (labelEnd !== -1 && input[labelEnd + 1] === "(") {
        const hrefEnd = indexOfUnescaped(input, ")", labelEnd + 2);
        if (hrefEnd !== -1) {
          const label = input.slice(i + 1, labelEnd);
          const href = input.slice(labelEnd + 2, hrefEnd).trim();
          const children = parseRichText(label);

          flush();
          if (isSafeHref(href)) {
            nodes.push({ kind: "link", href, children });
          } else {
            // Adresse refusée : on garde le libellé, on jette le lien. Le texte
            // reste lisible, rien de cliquable n'est fabriqué.
            nodes.push(...children);
          }
          i = hrefEnd + 1;
          continue;
        }
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return nodes;
}

/**
 * Texte nu, marques retirées.
 * Sert partout où le formatage n'a pas sa place : `description` des
 * métadonnées, balisage JSON-LD de la FAQ, extraits de l'administration.
 */
export function stripMarks(input: string): string {
  function walk(nodes: readonly RichTextNode[]): string {
    return nodes
      .map((node) => (node.kind === "text" ? node.value : walk(node.children)))
      .join("");
  }
  return walk(parseRichText(input));
}

/** Découpe un corps de texte en paragraphes, sur les lignes vides. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
