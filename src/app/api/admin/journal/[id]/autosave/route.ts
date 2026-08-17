/**
 * Enregistrement automatique d'un brouillon.
 *
 * Deux règles, et elles sont volontairement strictes.
 *
 *  1. **Seuls les brouillons sont concernés.** Sur un article publié, une
 *     sauvegarde silencieuse toutes les trois secondes mettrait en ligne des
 *     phrases inachevées : le rédacteur n'aurait plus aucun moment où il décide
 *     que son texte est prêt. L'éditeur signale que l'auto-enregistrement est
 *     suspendu et le bouton « Enregistrer » reprend la main.
 *
 *  2. **Écriture conditionnée à `expectedUpdatedAt`.** Si l'article a bougé
 *     depuis le chargement du formulaire — deuxième onglet, collègue sur le
 *     même article —, la requête est refusée en 409 plutôt que d'écraser. Perdre
 *     une sauvegarde automatique est réparable ; écraser le travail de
 *     quelqu'un d'autre ne l'est pas.
 *
 * Le contenu passe par le même normalisateur que l'enregistrement manuel :
 * l'auto-enregistrement n'est pas une porte dérobée qui contournerait les
 * contrôles.
 */

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/server/prisma";
import { autoExcerpt, readingMinutes } from "@/lib/journal/content";
import { normalizeBlocks, serializeBlocks } from "@/lib/journal/blocks";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    excerpt?: unknown;
    blocks?: unknown;
    expectedUpdatedAt?: unknown;
  } | null;

  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const article = await prisma.article.findUnique({
    where: { id },
    select: { id: true, status: true, updatedAt: true, deletedAt: true },
  });
  if (!article || article.deletedAt) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  if (article.status !== "draft") {
    return NextResponse.json(
      { error: "L'enregistrement automatique ne s'applique qu'aux brouillons." },
      { status: 409 },
    );
  }

  const expected = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";
  if (expected && expected !== article.updatedAt.toISOString()) {
    return NextResponse.json(
      {
        error: "L'article a été modifié ailleurs depuis l'ouverture de cet écran.",
        currentUpdatedAt: article.updatedAt.toISOString(),
      },
      { status: 409 },
    );
  }

  const parsed = normalizeBlocks(body.blocks ?? []);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.replace(/\s+/g, " ").trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";

  const saved = await prisma.article.update({
    where: { id },
    data: {
      // Un titre vidé en cours de frappe ne doit pas effacer celui qui est en
      // base : l'auto-enregistrement conserve la dernière valeur non vide.
      ...(title ? { title } : {}),
      excerpt: excerpt || autoExcerpt(parsed.blocks),
      blocks: serializeBlocks(parsed.blocks),
      readingMinutes: readingMinutes(parsed.blocks),
      updatedBy: session.email,
    },
    select: { updatedAt: true },
  });

  // Pas de revalidation : un brouillon n'est servi nulle part.
  return NextResponse.json({ savedAt: saved.updatedAt.toISOString() });
}
