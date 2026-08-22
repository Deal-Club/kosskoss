import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, MessageCircle, Clock } from "lucide-react";
import { CheckoutHeader, SiteFooter } from "@/components/kk/chrome";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { getKossOrder } from "@/server/kk/checkout";
import { lireAccesCommande } from "@/server/kk/acces-commande";
import { getCurrentCustomer } from "@/server/customerSession";
import { formatFcfa } from "@/lib/kk/format";
import { BRAND, CONTACT } from "@/config/brand";
import { getParametres, numeroWhatsappEffectif } from "@/server/kk/parametres";
import { choisirLangue } from "@/lib/kk/langue";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; orderNumber: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;
type ConfirmationT = Awaited<ReturnType<typeof getTranslations>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "commande" });
  return {
    title: t("confirmation.metaTitle", { brand: BRAND.name }),
    robots: { index: false, follow: false },
  };
}

/**
 * Message WhatsApp pré-rempli.
 *
 * `tWa` DOIT être lié à la langue de la COMMANDE (`order.locale`), jamais à
 * celle de la page consultée : un client qui a commandé en anglais peut
 * rouvrir cette page depuis un lien reçu par e-mail sur un navigateur réglé en
 * français, et le message envoyé au vendeur doit rester celui qu'il a choisi
 * à la commande — voir `src/lib/kk/langue.ts`, déjà utilisé pour les e-mails
 * transactionnels avec la même exigence.
 */
function whatsappHref(
  order: Awaited<ReturnType<typeof getKossOrder>>,
  numero: string,
  tWa: ConfirmationT,
): string {
  if (!order) return "#";
  const digits = numero || CONTACT.phone.replace(/\D/g, "");
  const lines = order.items
    .map((i) =>
      tWa("confirmation.whatsapp.itemLine", {
        quantity: i.quantity,
        label: `${i.brand} ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}`,
      }),
    )
    .join("\n");
  const message = [
    tWa("confirmation.whatsapp.greeting", { brand: BRAND.name }),
    tWa("confirmation.whatsapp.orderNumberLine", { orderNumber: order.orderNumber }),
    lines,
    tWa("confirmation.whatsapp.totalLine", { total: formatFcfa(order.totalCents) }),
    tWa("confirmation.whatsapp.nameLine", { name: `${order.billingFirstName} ${order.billingLastName}` }),
    tWa("confirmation.whatsapp.phoneLine", { phone: order.phone }),
    tWa("confirmation.whatsapp.deliveryLocationLine", { location: order.billingStreet }),
    tWa("confirmation.whatsapp.confirmDeliveryLine"),
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
  const t = await getTranslations({ locale, namespace: "commande" });

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

  // La langue de la COMMANDE fait foi pour le message WhatsApp — pas celle de
  // la page consultée. `choisirLangue` filtre toute valeur historique qui ne
  // serait ni « fr » ni « en ».
  const tWa = await getTranslations({ locale: choisirLangue(order.locale), namespace: "commande" });

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
            <h1 className="mt-6 text-deep">{t("confirmation.thankYouTitle")}</h1>
            <p className="mt-3 text-muted-foreground">
              {t("confirmation.orderPrefix")}{" "}
              <span className="font-semibold text-deep">{order.orderNumber}</span>{" "}
              {payee ? t("confirmation.statusPaid") : t("confirmation.statusPending")}
            </p>
          </div>

          {/* Récapitulatif */}
          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">
              {t("confirmation.summaryTitle")}
            </h2>
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
              <span className="font-semibold text-deep">{t("confirmation.total")}</span>
              <span className="figure text-xl font-semibold text-deep">{formatFcfa(order.totalCents)}</span>
            </div>
          </div>

          {/* Action WhatsApp */}
          <a
            href={whatsappHref(order, numeroWhatsapp, tWa)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-4 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <MessageCircle className="h-5 w-5" />
            {payee ? t("confirmation.whatsappButtonPaid") : t("confirmation.whatsappButtonPending")}
          </a>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm text-deep">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{payee ? t("confirmation.infoPaid") : t("confirmation.infoPending")}</p>
          </div>

          {account && (
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-deep">
              {account.loggedIn ? (
                <p>
                  <span className="font-semibold">{t("confirmation.accountCreatedTitle")}</span>{" "}
                  {t("confirmation.accountCreatedText")}{" "}
                  <Link href="/compte" className="font-semibold underline underline-offset-2">
                    {t("confirmation.accountCreatedLink")}
                  </Link>
                  .
                </p>
              ) : (
                <p>
                  <span className="font-semibold">{t("confirmation.accountExistsTitle")}</span>{" "}
                  <Link href="/compte/connexion" className="font-semibold underline underline-offset-2">
                    {t("confirmation.accountExistsLink")}
                  </Link>{" "}
                  {t("confirmation.accountExistsText")}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm font-semibold text-deep underline underline-offset-4">
              {t("confirmation.backHome")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
