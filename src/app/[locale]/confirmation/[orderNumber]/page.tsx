import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Check, MessageCircle, Clock } from "lucide-react";
import { CheckoutHeader, SiteFooter } from "@/components/kk/chrome";
import { getKossOrder } from "@/server/kk/checkout";
import { formatFcfa } from "@/lib/kk/format";
import { BRAND, CONTACT } from "@/config/brand";
import type { Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; orderNumber: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Commande confirmée — KossKoss Select",
  robots: { index: false, follow: false },
};

function whatsappHref(order: Awaited<ReturnType<typeof getKossOrder>>): string {
  if (!order) return "#";
  const digits = (CONTACT.whatsapp || CONTACT.phone).replace(/\D/g, "");
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

  const token = Array.isArray(sp.t) ? sp.t[0] : sp.t;
  const order = await getKossOrder(orderNumber, token ?? "");
  if (!order) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <CheckoutHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-14">
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-deep text-primary-foreground">
              <Check className="h-8 w-8" />
            </span>
            <h1 className="mt-6 text-3xl text-deep sm:text-4xl">Merci pour votre commande !</h1>
            <p className="mt-3 text-muted-foreground">
              Votre commande <span className="font-semibold text-deep">{order.orderNumber}</span> est
              enregistrée. Confirmez-la via WhatsApp pour organiser le paiement et la livraison.
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
            href={whatsappHref(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-4 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <MessageCircle className="h-5 w-5" />
            Confirmer ma commande via WhatsApp
          </a>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sand/60 p-5 text-sm text-deep">
            <Clock className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Le paiement Mobile Money (Orange Money / MTN) sera finalisé lors de la confirmation. La
              livraison est ensuite coordonnée avec vous via WhatsApp.
            </p>
          </div>

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
