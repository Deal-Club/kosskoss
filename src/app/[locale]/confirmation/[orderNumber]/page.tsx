import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Check, MessageCircle, Clock } from "lucide-react";
import { CheckoutHeader, SiteFooter } from "@/components/kk/chrome";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { getKossOrder } from "@/server/kk/checkout";
import { lireAccesCommande } from "@/server/kk/acces-commande";
import { getCurrentCustomer } from "@/server/customerSession";
import { formatFcfa } from "@/lib/kk/format";
import { BRAND, CONTACT } from "@/config/brand";
import { getParametres, numeroWhatsappEffectif } from "@/server/kk/parametres";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; orderNumber: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Commande confirmée — KossKoss Select",
  robots: { index: false, follow: false },
};

function whatsappHref(order: Awaited<ReturnType<typeof getKossOrder>>, numero: string): string {
  if (!order) return "#";
  const digits = numero || CONTACT.phone.replace(/\D/g, "");
  const lines = order.items
    .map((i) => `- ${i.quantity}× ${i.brand} ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}`)
    .join("\n");
  const message = [
    `Bonjour ${BRAND.name}`,
    `Commande ${order.orderNumber}`,
    lines,
    `Total : ${formatFcfa(order.totalCents)}`,
    `Nom : ${order.billingFirstName} ${order.billingLastName}`,
    `Tél : ${order.phone}`,
    `Lieu de livraison : ${order.billingStreet}`,
    "Merci de me confirmer l'acheminement.",
  ].join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, orderNumber } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  // Deux preuves d'accès acceptées, dans cet ordre.
  //
  // Le COOKIE d'abord : c'est la voie normale depuis que le retour de paiement
  // ne peut plus emporter le jeton dans l'adresse — le prestataire enregistre
  // cette adresse chez lui, un jeton n'y a pas sa place.
  //
  // Le paramètre `?t=` ensuite, pour les accès qui ne viennent pas du
  // navigateur d'achat : lien de suivi reçu par e-mail, commande rouverte
  // depuis un autre appareil.
  const parUrl = Array.isArray(sp.t) ? sp.t[0] : sp.t;
  const parCookie = await lireAccesCommande(orderNumber);
  const order = await getKossOrder(orderNumber, parCookie ?? parUrl ?? "");
  if (!order) notFound();

  // Même source que le pied de page et le bouton flottant : `getParametres`
  // est mémoïsé par requête, cet appel ne coûte donc rien de plus qu'une
  // lecture déjà faite ailleurs sur la page. Le numéro rendu est en chiffres
  // seuls — c'est tout ce que `wa.me` accepte — donc utilisable tel quel dans
  // le lien construit par `whatsappHref`, sans nettoyage supplémentaire.
  const numeroWhatsapp = numeroWhatsappEffectif(await getParametres());

  const account = order.customerId
    ? { loggedIn: Boolean(await getCurrentCustomer()) }
    : null;

  // ── LA PAGE DOIT DIRE CE QUI S'EST RÉELLEMENT PASSÉ ──────────────────────
  //
  // Elle sert deux parcours devenus très différents depuis le branchement de
  // la passerelle :
  //   — le client a payé en ligne et revient de GeniusPay ; le webhook a déjà
  //     fait basculer la commande en « payée » ;
  //   — le client a choisi le paiement à la livraison, ou la passerelle n'était
  //     pas configurée : le règlement se cale par WhatsApp.
  //
  // Le texte était écrit pour le second cas uniquement. Il disait à quelqu'un
  // QUI VENAIT DE PAYER d'aller « organiser le paiement » par WhatsApp —
  // c'est-à-dire l'invitait à régler une seconde fois.
  const payee = order.paymentStatus === "payee";

  return (
    <div className="flex min-h-screen flex-col">
      <CheckoutHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-14">
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-deep text-primary-foreground">
              <Check className="h-8 w-8" />
            </span>
            <h1 className="mt-6 text-deep">Merci pour votre commande !</h1>
            <p className="mt-3 text-muted-foreground">
              Votre commande <span className="font-semibold text-deep">{order.orderNumber}</span>{" "}
              {payee
                ? "est payée. Nous vous contactons sur WhatsApp pour organiser la livraison."
                : "est enregistrée. Confirmez-la via WhatsApp pour organiser le paiement et la livraison."}
            </p>
          </div>

          {/* Récapitulatif */}
          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">Récapitulatif</h2>
            <ul className="mt-4 divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span className="text-foreground">
                    {i.brand} {i.name}
                    {i.variantLabel ? ` · ${i.variantLabel}` : ""}
                    <span className="text-muted-foreground"> × {i.quantity}</span>
                  </span>
                  <span className="figure shrink-0 text-deep">{formatFcfa(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold text-deep">Total</span>
              <span className="figure text-xl font-semibold text-deep">{formatFcfa(order.totalCents)}</span>
            </div>
          </div>

          {/* Action WhatsApp */}
          <a
            href={whatsappHref(order, numeroWhatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-4 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <MessageCircle className="h-5 w-5" />
            {payee ? "Organiser la livraison via WhatsApp" : "Confirmer ma commande via WhatsApp"}
          </a>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm text-deep">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {payee
                ? "Votre paiement est bien reçu — vous n'avez plus rien à régler. La livraison est coordonnée avec vous via WhatsApp."
                : "Le paiement Mobile Money (Orange Money / MTN) sera finalisé lors de la confirmation. La livraison est ensuite coordonnée avec vous via WhatsApp."}
            </p>
          </div>

          {account && (
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-deep">
              {account.loggedIn ? (
                <p>
                  <span className="font-semibold">Espace client créé.</span> Vous êtes connecté —{" "}
                  <Link href="/compte" className="font-semibold underline underline-offset-2">
                    accéder à mes commandes
                  </Link>
                  .
                </p>
              ) : (
                <p>
                  <span className="font-semibold">Un compte existe déjà pour cet e-mail.</span>{" "}
                  <Link href="/compte/connexion" className="font-semibold underline underline-offset-2">
                    Connectez-vous
                  </Link>{" "}
                  pour suivre cette commande.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm font-semibold text-deep underline underline-offset-4">
              Retour à l&rsquo;accueil
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
