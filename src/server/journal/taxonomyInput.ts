/**
 * Normalisation des catégories, tags et auteurs soumis par le back-office.
 *
 * Même parti pris que `parseArticleInput` : contrôle refait côté serveur, quelle
 * que soit la confiance qu'on accorde au formulaire.
 */

import { isSafeImageSource } from "@/lib/journal/blocks";
import { isSafeHref } from "@/lib/richText";
import type { AuthorInput, CategoryInput } from "./taxonomy";

export const TAXONOMY_LIMITS = {
  label: 120,
  description: 2_000,
  bio: 2_000,
  role: 120,
  socials: 8,
} as const;

export type TaxonomyResult<T> =
  | { readonly ok: true; readonly values: T }
  | { readonly ok: false; readonly error: string };

function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function multiLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

function asInt(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseCategoryInput(raw: unknown): TaxonomyResult<CategoryInput> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Contenu illisible." };
  const input = raw as Record<string, unknown>;

  const label = oneLine(input.label);
  if (!label) return { ok: false, error: "Le nom de la catégorie est obligatoire." };
  if (label.length > TAXONOMY_LIMITS.label) {
    return { ok: false, error: `Le nom dépasse ${TAXONOMY_LIMITS.label} caractères.` };
  }

  const image = oneLine(input.image);
  if (image && !isSafeImageSource(image)) {
    return { ok: false, error: "L'adresse de l'image n'est pas valide." };
  }

  const description = multiLine(input.description);
  if (description.length > TAXONOMY_LIMITS.description) {
    return { ok: false, error: `La description dépasse ${TAXONOMY_LIMITS.description} caractères.` };
  }

  return {
    ok: true,
    values: {
      label,
      labelEn: oneLine(input.labelEn),
      description,
      descriptionEn: multiLine(input.descriptionEn),
      image,
      metaTitle: oneLine(input.metaTitle),
      metaDescription: multiLine(input.metaDescription),
      parentId: oneLine(input.parentId) || null,
      position: asInt(input.position),
      active: input.active !== false,
    },
  };
}

export function parseTagInput(raw: unknown): TaxonomyResult<{ label: string; labelEn: string }> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Contenu illisible." };
  const input = raw as Record<string, unknown>;

  const label = oneLine(input.label);
  if (!label) return { ok: false, error: "Le nom du tag est obligatoire." };
  if (label.length > TAXONOMY_LIMITS.label) {
    return { ok: false, error: `Le nom dépasse ${TAXONOMY_LIMITS.label} caractères.` };
  }

  return { ok: true, values: { label, labelEn: oneLine(input.labelEn) } };
}

export function parseAuthorInput(raw: unknown): TaxonomyResult<AuthorInput> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Contenu illisible." };
  const input = raw as Record<string, unknown>;

  const name = oneLine(input.name);
  if (!name) return { ok: false, error: "Le nom de l'auteur est obligatoire." };
  if (name.length > TAXONOMY_LIMITS.label) {
    return { ok: false, error: `Le nom dépasse ${TAXONOMY_LIMITS.label} caractères.` };
  }

  const avatar = oneLine(input.avatar);
  if (avatar && !isSafeImageSource(avatar)) {
    return { ok: false, error: "L'adresse de la photo n'est pas valide." };
  }

  const bio = multiLine(input.bio);
  if (bio.length > TAXONOMY_LIMITS.bio) {
    return { ok: false, error: `La biographie dépasse ${TAXONOMY_LIMITS.bio} caractères.` };
  }

  // Les réseaux sociaux deviennent des liens sortants : ils passent par la même
  // allowlist que le reste du site.
  const rawSocials = (input.socials ?? {}) as Record<string, unknown>;
  const socials: Record<string, string> = {};
  for (const [network, url] of Object.entries(rawSocials).slice(0, TAXONOMY_LIMITS.socials)) {
    const href = oneLine(url);
    if (!href) continue;
    if (!isSafeHref(href)) {
      return { ok: false, error: `L'adresse du profil « ${network} » n'est pas autorisée.` };
    }
    socials[oneLine(network)] = href;
  }

  return {
    ok: true,
    values: {
      name,
      role: oneLine(input.role),
      roleEn: oneLine(input.roleEn),
      bio,
      bioEn: multiLine(input.bioEn),
      avatar,
      socials,
      active: input.active !== false,
    },
  };
}
