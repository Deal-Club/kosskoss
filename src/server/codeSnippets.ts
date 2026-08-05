/**
 * Fragments de code injectés dans la boutique, lecture et écriture.
 *
 * La boutique ne lit que les fragments actifs et n'échoue jamais dessus : une
 * base indisponible doit coûter un pixel de mesure, pas la page d'accueil. D'où
 * le `try/catch` qui rend une liste vide au lieu de laisser remonter l'erreur.
 *
 * La lecture est mémorisée pour la durée du rendu : les trois emplacements
 * d'une même page interrogent la base une seule fois.
 */

import { cache } from "react";
import { prisma } from "@/server/prisma";
import type { CodeSnippetInput, SnippetPlacement } from "@/server/codeSnippetInput";

export interface CodeSnippet extends CodeSnippetInput {
  readonly id: string;
  readonly updatedAt: Date;
  readonly updatedBy: string;
}

/** Ligne de base ramenée au type du domaine. */
function versFragment(row: {
  id: string;
  name: string;
  placement: string;
  content: string;
  enabled: boolean;
  position: number;
  updatedAt: Date;
  updatedBy: string;
}): CodeSnippet {
  return { ...row, placement: row.placement as SnippetPlacement };
}

/**
 * Fragments actifs, tous emplacements confondus, dans l'ordre d'insertion.
 * L'ordre compte : un mode consentement doit s'exécuter avant les balises
 * qu'il gouverne.
 */
export const getActiveSnippets = cache(async (): Promise<readonly CodeSnippet[]> => {
  try {
    const rows = await prisma.codeSnippet.findMany({
      where: { enabled: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(versFragment);
  } catch (error) {
    console.error("[codeSnippets] lecture impossible, aucun fragment injecté", error);
    return [];
  }
});

/** Fragments actifs d'un emplacement donné. */
export async function getSnippetsFor(
  placement: SnippetPlacement,
): Promise<readonly CodeSnippet[]> {
  const snippets = await getActiveSnippets();
  return snippets.filter((snippet) => snippet.placement === placement);
}

// ---- Administration ----

/** Tous les fragments, actifs ou non, pour la liste du back-office. */
export async function listSnippets(): Promise<readonly CodeSnippet[]> {
  const rows = await prisma.codeSnippet.findMany({
    orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(versFragment);
}

export async function findSnippet(id: string): Promise<CodeSnippet | null> {
  const row = await prisma.codeSnippet.findUnique({ where: { id } });
  return row ? versFragment(row) : null;
}

export async function createSnippet(
  input: CodeSnippetInput,
  updatedBy: string,
): Promise<CodeSnippet> {
  const row = await prisma.codeSnippet.create({ data: { ...input, updatedBy } });
  return versFragment(row);
}

/** Rend null si le fragment n'existe plus — supprimé depuis un autre onglet. */
export async function updateSnippet(
  id: string,
  input: CodeSnippetInput,
  updatedBy: string,
): Promise<CodeSnippet | null> {
  const modifies = await prisma.codeSnippet.updateMany({
    where: { id },
    data: { ...input, updatedBy },
  });
  if (modifies.count === 0) return null;
  return await findSnippet(id);
}

export async function deleteSnippet(id: string): Promise<boolean> {
  const supprimes = await prisma.codeSnippet.deleteMany({ where: { id } });
  return supprimes.count > 0;
}
