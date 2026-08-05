/**
 * Sortie de campagne : tout lien d'un message commercial passe par ici.
 *
 * Trois choses arrivent en une seule requête : le clic est enregistré, le
 * cookie d'attribution est posé, et le visiteur repart vers la page voulue.
 * Faire pointer les messages directement sur la fiche produit ferait gagner une
 * redirection et perdrait toute la mesure — c'est le compromis assumé.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { CAMPAIGN_COOKIE } from "@/lib/campaigns";
import { campaignCookieOptions } from "@/server/campaignContext";
import { recordEvent } from "@/server/campaigns";

// La route écrit en base à chaque appel : rien à mettre en cache, et un cache
// intermédiaire ferait disparaître des clics des statistiques.
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

/**
 * Valide la destination demandée. Une redirection qui accepte n'importe quelle
 * cible est une faille classique : elle permet d'envoyer un lien portant le
 * domaine de la boutique qui atterrit sur un site de hameçonnage, et la
 * confiance du client dans le domaine fait le reste.
 *
 * Seuls les chemins internes sont acceptés. Les formes « //ailleurs.example »
 * et « /\ailleurs.example » sont refusées : les navigateurs les traitent comme
 * des adresses absolues.
 */
function safeInternalPath(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("://")) return null;
  // Un retour à la ligne dans un en-tête « Location » permettrait d'en injecter
  // un second.
  if (/[\r\n\t]/.test(value)) return null;
  return value;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { token } = await params;
  const url = new URL(request.url);
  const requested = safeInternalPath(url.searchParams.get("ziel"));

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { token },
    select: {
      id: true,
      campaignId: true,
      firstClickedAt: true,
      campaign: {
        select: {
          landingSlug: true,
          products: {
            take: 1,
            select: {
              product: {
                select: {
                  slug: true,
                  category: { select: { slug: true, group: { select: { slug: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Jeton inconnu : le visiteur est ramené sans un mot. Répondre « ce jeton
  // n'existe pas » permettrait d'éprouver des jetons au hasard et de savoir
  // lesquels sont valides.
  if (!recipient) {
    return redirectTo(request, requested ?? "/");
  }

  const now = new Date();
  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      clickCount: { increment: 1 },
      // La date du premier clic ne bouge plus : c'est elle qui date l'entrée
      // du client dans la campagne.
      ...(recipient.firstClickedAt ? {} : { firstClickedAt: now }),
    },
  });
  await recordEvent(recipient.campaignId, "clic", recipient.id);

  const destination = requested ?? defaultDestination(recipient.campaign);
  const response = redirectTo(request, destination);
  response.cookies.set(CAMPAIGN_COOKIE, token, campaignCookieOptions());
  return response;
}

/**
 * Où envoyer le visiteur quand le lien ne précise rien : la page d'action si la
 * campagne en a une, sinon la fiche de son premier produit, sinon l'accueil.
 */
function defaultDestination(campaign: {
  landingSlug: string;
  products: { product: { slug: string; category: { slug: string; group: { slug: string } } } }[];
}): string {
  if (campaign.landingSlug) return `/promo/${campaign.landingSlug}`;

  const first = campaign.products[0]?.product;
  if (first) {
    return `/${first.category.group.slug}/${first.category.slug}/${first.slug}`;
  }
  return "/";
}

function redirectTo(request: Request, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url), 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
