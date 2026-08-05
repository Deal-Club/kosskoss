import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/adminApi";
import { isLegalLocale, isLegalSlug, LEGAL_SLUG_LABELS } from "@/content/legal";
import type { LegalLocale, LegalSlug } from "@/content/legal/types";
import { normalizeLegalPage, toLegalPageInput } from "@/server/legalPageInput";
import {
  getLegalPageVersion,
  getOriginLegalPage,
  resetLegalPage,
  saveLegalPage,
} from "@/server/legalPages";

/**
 * Édition d'une page légale depuis l'administration.
 *
 *   GET    …/pages/mentions-legales?locale=fr   contenu actuel + contenu d'origine
 *   PUT    …/pages/mentions-legales?locale=fr   publie une réécriture
 *   DELETE …/pages/mentions-legales?locale=fr   revient au contenu d'origine
 *
 * Le contrôle du contenu est refait ici : le formulaire du back-office n'est
 * qu'une commodité, il ne fait pas autorité.
 */

type Params = Promise<{ slug: string }>;

interface Target {
  readonly slug: LegalSlug;
  readonly locale: LegalLocale;
}

/** Extrait la page visée, ou la réponse d'erreur à renvoyer telle quelle. */
function resolveTarget(
  slug: string,
  request: Request,
): { target: Target; error: null } | { target: null; error: NextResponse } {
  if (!isLegalSlug(slug)) {
    return {
      target: null,
      error: NextResponse.json({ error: "Cette page n'existe pas." }, { status: 404 }),
    };
  }

  const locale = new URL(request.url).searchParams.get("locale") ?? "fr";
  if (!isLegalLocale(locale)) {
    return {
      target: null,
      error: NextResponse.json({ error: "Langue inconnue." }, { status: 400 }),
    };
  }

  return { target: { slug, locale }, error: null };
}

/**
 * Rafraîchit la boutique.
 * Le passage par la racine n'est pas une précaution excessive : le pied de page
 * reprend les titres des pages légales et apparaît sur toutes les pages du site.
 */
function refreshShop() {
  revalidatePath("/", "layout");
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const { target, error } = resolveTarget(slug, request);
  if (error) return error;

  const version = await getLegalPageVersion(target.slug, target.locale);

  return NextResponse.json({
    slug: target.slug,
    locale: target.locale,
    label: LEGAL_SLUG_LABELS[target.slug],
    customized: version.customized,
    updatedBy: version.updatedBy,
    updatedAt: version.updatedAt?.toISOString() ?? null,
    content: toLegalPageInput(version.page),
    // Le contenu du dépôt accompagne toujours la réponse : le formulaire peut
    // ainsi proposer « revenir à l'original » sans second aller-retour.
    origin: toLegalPageInput(getOriginLegalPage(target.slug, target.locale)),
  });
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { session, unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const { target, error } = resolveTarget(slug, request);
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = normalizeLegalPage(body.content, target.slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await saveLegalPage(target.slug, target.locale, result.page, session.email);
  refreshShop();

  return NextResponse.json({ success: true, content: toLegalPageInput(result.page) });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { unauthorized } = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const { target, error } = resolveTarget(slug, request);
  if (error) return error;

  const removed = await resetLegalPage(target.slug, target.locale);
  if (!removed) {
    return NextResponse.json(
      { error: "Cette page n'a jamais été modifiée : elle affiche déjà le contenu d'origine." },
      { status: 409 },
    );
  }

  refreshShop();

  return NextResponse.json({
    success: true,
    content: toLegalPageInput(getOriginLegalPage(target.slug, target.locale)),
  });
}
