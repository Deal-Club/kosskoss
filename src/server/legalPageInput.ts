/**
 * Normalisation et contrôle du contenu d'une page légale soumis par
 * l'administration.
 *
 * Ce module ne connaît ni la base ni Next : il transforme un objet reçu du
 * navigateur en page valide, ou explique pourquoi il refuse. Le contrôle est
 * refait ici même si le formulaire l'a déjà fait — une requête peut arriver
 * sans passer par le formulaire.
 *
 * Les bornes de longueur ne protègent pas d'une attaque mais d'une erreur :
 * un copier-coller malheureux ne doit pas remplir une colonne de plusieurs
 * mégaoctets ni faire d'une page juridique un mur illisible.
 */

import type { LegalPage, LegalSection, LegalSlug } from "@/content/legal/types";

/** Ce que le formulaire envoie, avant contrôle. */
export interface LegalPageInput {
  title: string;
  /** Chapeau. Vide = pas d'encadré d'introduction sur la page. */
  intro: string;
  sections: LegalSectionInput[];
  /** Date de révision affichée en bas de page, au format AAAA-MM-JJ. */
  updatedAt: string;
}

export interface LegalSectionInput {
  heading: string;
  body: string;
  list: string[];
}

export const LIMITS = {
  title: 200,
  intro: 8_000,
  heading: 300,
  body: 40_000,
  listItem: 1_000,
  listItems: 100,
  sections: 100,
} as const;

export type NormalizeResult =
  | { readonly ok: true; readonly page: LegalPage }
  | { readonly ok: false; readonly error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Nettoie les fins de ligne et les espaces en fin de ligne, sans toucher au reste. */
function tidy(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

/** Vrai pour une date réelle au format AAAA-MM-JJ (2026-02-31 est refusée). */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Contrôle un contenu soumis et rend la page prête à être stockée.
 * `slug` n'est jamais lu depuis la requête : il vient de l'URL.
 */
export function normalizeLegalPage(raw: unknown, slug: LegalSlug): NormalizeResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Contenu illisible." };
  }
  const input = raw as Partial<LegalPageInput>;

  const title = tidy(asString(input.title));
  if (!title) {
    return { ok: false, error: "Le titre de la page est obligatoire." };
  }
  if (title.length > LIMITS.title) {
    return { ok: false, error: `Le titre dépasse ${LIMITS.title} caractères.` };
  }

  const intro = tidy(asString(input.intro));
  if (intro.length > LIMITS.intro) {
    return { ok: false, error: `Le chapeau dépasse ${LIMITS.intro} caractères.` };
  }

  const rawSections = Array.isArray(input.sections) ? input.sections : [];
  if (rawSections.length > LIMITS.sections) {
    return { ok: false, error: `Une page ne peut pas dépasser ${LIMITS.sections} sections.` };
  }

  const sections: LegalSection[] = [];
  for (const [index, rawSection] of rawSections.entries()) {
    const position = index + 1;
    if (!rawSection || typeof rawSection !== "object") {
      return { ok: false, error: `Section ${position} illisible.` };
    }

    const heading = tidy(asString(rawSection.heading));
    const body = tidy(asString(rawSection.body));
    const list = (Array.isArray(rawSection.list) ? rawSection.list : [])
      .map((item) => tidy(asString(item)))
      .filter(Boolean);

    // Une section entièrement vide est le résidu d'un « ajouter » suivi d'un
    // abandon : on la retire au lieu de refuser tout l'enregistrement.
    if (!heading && !body && list.length === 0) continue;

    if (!heading) {
      return { ok: false, error: `La section ${position} n'a pas de titre.` };
    }
    if (heading.length > LIMITS.heading) {
      return { ok: false, error: `Le titre de la section ${position} est trop long.` };
    }
    if (body.length > LIMITS.body) {
      return { ok: false, error: `Le texte de la section « ${heading} » est trop long.` };
    }
    if (list.length > LIMITS.listItems) {
      return {
        ok: false,
        error: `La liste de la section « ${heading} » dépasse ${LIMITS.listItems} entrées.`,
      };
    }
    if (list.some((item) => item.length > LIMITS.listItem)) {
      return { ok: false, error: `Une entrée de liste de « ${heading} » est trop longue.` };
    }
    if (!body && list.length === 0) {
      return { ok: false, error: `La section « ${heading} » est vide.` };
    }

    sections.push(list.length > 0 ? { heading, body, list } : { heading, body });
  }

  if (sections.length === 0) {
    return { ok: false, error: "La page doit contenir au moins une section." };
  }

  const updatedAt = asString(input.updatedAt).trim();
  if (!isIsoDate(updatedAt)) {
    return { ok: false, error: "La date de révision doit être au format AAAA-MM-JJ." };
  }

  return {
    ok: true,
    page: { slug, title, ...(intro ? { intro } : {}), sections, updatedAt },
  };
}

/** Convertit une page en valeurs de formulaire, listes comprises. */
export function toLegalPageInput(page: LegalPage): LegalPageInput {
  return {
    title: page.title,
    intro: page.intro ?? "",
    sections: page.sections.map((section) => ({
      heading: section.heading,
      body: section.body,
      list: [...(section.list ?? [])],
    })),
    updatedAt: page.updatedAt,
  };
}

/**
 * Relit une page stockée en base.
 * Un contenu illisible — colonne tronquée, format d'une version précédente —
 * ne doit pas faire tomber une page obligatoire : l'appelant retombera sur le
 * contenu d'origine.
 */
export function parseStoredLegalPage(json: string, slug: LegalSlug): LegalPage | null {
  try {
    const result = normalizeLegalPage(JSON.parse(json), slug);
    return result.ok ? result.page : null;
  } catch {
    return null;
  }
}
