import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawerKK } from "@/components/kk/cart-drawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { SmartsuppChat } from "@/components/SmartsuppChat";
import { CodeSnippets } from "@/components/CodeSnippets";
import { CookieConsent } from "@/components/kk/cookie-consent";
import { MesureAudience } from "@/components/kk/mesure-audience";
import { tracageActif } from "@/server/consent";
import { getParametres } from "@/server/kk/parametres";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Permet le rendu statique des pages qui utilisent les traductions
  setRequestLocale(locale);

  // Mémoïsé par requête (voir server/kk/parametres.ts) : le pied de page et le
  // bouton WhatsApp le lisent déjà, cet appel ne coûte rien de plus.
  const parametres = await getParametres();

  // Le panier vit dans localStorage : le fournisseur enveloppe toute la
  // boutique pour que le Header et les fiches produit y accèdent. Les pages
  // restent des composants serveur, seul le contexte est côté client.
  //
  // Le tiroir est monté ici pour être disponible sur toutes les pages. Les
  // moyens de paiement lui sont passés déjà rendus : la lecture en base reste
  // côté serveur, le tiroir n'embarque aucune requête.
  return (
    <NextIntlClientProvider>
      {/* Fragments posés depuis « Scripts & balises ». Placés ici, ils ne
          touchent que la boutique : /admin ne traverse pas ce layout. */}
      <CodeSnippets placement="head" />
      <CodeSnippets placement="bodyStart" />
      <CartProvider>
        {children}
        <CartDrawerKK />
        {/* GA4 et le Pixel Meta : ne charge et n'émet RIEN sans identifiant
            configuré ET consentement — voir @/lib/kk/mesureNavigateur. Monté
            même si les deux identifiants sont vides : le composant ne fait
            alors rien, `initialiserMesure` sort au premier test. */}
        <MesureAudience ga4Id={parametres.ga4} metaPixelId={parametres.metaPixel} />
        {/* Boutons de contact flottants : WhatsApp à gauche, chat Smartsupp à
            droite. Smartsupp ne s'affiche que si sa clé d'environnement est
            renseignée. */}
        <WhatsAppButton />
        <SmartsuppChat />
        {/* Le bandeau est monté en dernier : il se superpose au reste et n'a
            aucune raison d'entrer dans l'ordre de lecture avant le contenu.

            Et il n'est monté QUE si la boutique dépose autre chose que du
            strictement nécessaire — c'est-à-dire si un fragment de mesure ou de
            publicité est actif au back-office. Sans traceur, il n'y a rien à
            faire consentir : demander quand même reviendrait à déranger chaque
            visiteur pour une question sans objet. Voir `tracageActif`. */}
        {(await tracageActif()) && <CookieConsent locale={locale} />}
        <CodeSnippets placement="bodyEnd" />
      </CartProvider>
    </NextIntlClientProvider>
  );
}
