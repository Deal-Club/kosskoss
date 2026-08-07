import {
  User,
  Home,
  Sparkles,
  LayoutGrid,
  Heart,
  Phone,
  MessageCircle,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "./localized-link";
import { BRAND, CONTACT } from "@/config/brand";
import { getShopNavigation } from "@/server/kk/navigation";
import { CartButton } from "./cart-button";
import { FavoritesLink, FavoritesTabBadge } from "./favorites-nav";
import { DesktopNav, MobileMenu, SearchAction } from "./header-actions";
import { PatternBackdrop } from "./pattern-backdrop";

// Icônes de marque : lucide a retiré Instagram/Facebook (marques déposées),
// on les redéfinit en SVG inline.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M14 8.5V7c0-.8.2-1 1-1h1.5V3.2C16 3.1 14.9 3 13.9 3 11.5 3 10 4.4 10 7v1.5H7.5V11.5H10V21h3v-9.5h2.3l.4-3H13z" />
    </svg>
  );
}

/**
 * Pages d'aide et pages légales du pied de page.
 *
 * Écrites ici plutôt qu'en base : ce sont des routes du code, pas du contenu
 * éditorial. Chaque entrée pointe vers une page qui existe — un lien mort dans
 * le pied de page d'une boutique en ligne coûte la confiance du visiteur, et
 * les mentions légales doivent rester atteignables depuis toutes les pages.
 *
 * La navigation principale, elle, n'est plus une liste écrite ici : elle est
 * lue en base (`getShopNavigation`) et rendue par `DesktopNav`. C'est ce qui
 * évite qu'un changement d'univers dans le catalogue — « Corps & Cheveux »
 * devenu « Corps & Hygiène », ajout de « Homme » — laisse des entrées de menu
 * pointant vers des pages qui n'existent plus.
 */
const FOOTER_HELP = [
  { label: "Livraison", href: "/livraison" },
  { label: "Suivi de commande", href: "/compte/commandes" },
  { label: "Moyens de paiement", href: "/moyens-de-paiement" },
  { label: "Retours", href: "/retours" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

const FOOTER_LEGAL = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "CGV", href: "/cgv" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Droit de rétractation", href: "/retractation" },
];

const FOOTER_LINK =
  "text-sm text-footer-foreground/85 transition hover:text-footer-foreground";

/**
 * Lien WhatsApp du pied de page. Même source que le bouton flottant : la ligne
 * dédiée si elle est configurée, sinon le téléphone de la société. Vide, le
 * bloc ne s'affiche pas plutôt que de proposer un lien creux.
 */
const WHATSAPP_DIGITS =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || CONTACT.phone.replace(/\D/g, "");
const WHATSAPP_LINK = WHATSAPP_DIGITS
  ? `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(
      "Bonjour, j'ai une question sur un produit KossKoss Select.",
    )}`
  : "";

/** Bandeau d'annonce fin — réassurance marché Cameroun. */
export function AnnouncementBar() {
  return (
    <div className="bg-deep text-primary-foreground">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.2em]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Livraison partout au Cameroun
      </p>
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex flex-col items-center leading-none ${className}`} aria-label={BRAND.name}>
      <span className="wordmark text-[1.15rem] text-deep sm:text-[1.35rem]">KOSSKOSS</span>
      <span className="mt-0.5 text-[0.55rem] font-medium uppercase tracking-[0.5em] text-deep/70">
        Select
      </span>
    </Link>
  );
}

/**
 * En-tête boutique — sticky, transparent sur crème avec léger flou.
 *
 * Composant serveur : il lit la navigation en base et la passe aux quelques
 * éléments interactifs (recherche, menu mobile, lien actif), qui sont les seuls
 * à traverser la frontière client.
 */
export async function SiteHeader() {
  const groups = await getShopNavigation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-6">
        {/* Gauche : recherche (desktop) / menu (mobile) */}
        <div className="flex items-center gap-2">
          <MobileMenu groups={groups} />
          <SearchAction />
        </div>

        {/* Centre : logotype */}
        <Wordmark />

        {/* Droite : recherche (mobile) + favoris + compte + panier */}
        <div className="flex items-center justify-end gap-1">
          <SearchAction variant="icon" />
          <FavoritesLink />
          <Link
            href="/compte"
            aria-label="Mon compte"
            className="hidden h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand sm:grid"
          >
            <User className="h-5 w-5" />
          </Link>
          <CartButton />
        </div>
      </div>

      <DesktopNav groups={groups} />
    </header>
  );
}

/** En-tête minimal des pages transactionnelles (panier → paiement). */
export function CheckoutHeader() {
  return (
    <header className="border-b border-border/60 bg-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-3 items-center px-6 py-4">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm text-deep transition hover:opacity-80">
          <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Continuer mes achats</span>
        </Link>
        <div className="justify-self-center">
          <Wordmark />
        </div>
        <span className="hidden items-center justify-end gap-1.5 justify-self-end text-xs text-muted-foreground sm:inline-flex">
          <ShieldCheck className="h-4 w-4" /> Paiement sécurisé
        </span>
      </div>
    </header>
  );
}

/** Barre de navigation basse — mobile uniquement, Diagnostic mis en avant. */
export function MobileTabBar() {
  const items = [
    { label: "Accueil", href: "/", icon: Home, active: true },
    { label: "Boutique", href: "/soins-visage", icon: LayoutGrid },
    { label: "Diagnostic", href: "/diagnostic", icon: Sparkles, primary: true },
    { label: "Favoris", href: "/favoris", icon: Heart, badge: true },
    { label: "Compte", href: "/compte", icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-cream/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-between px-4 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2">
        {items.map(({ label, href, icon: Icon, active, primary, badge }) => (
          <li key={label}>
            <Link
              href={href}
              className={`flex flex-col items-center gap-1 ${
                active ? "text-deep" : "text-muted-foreground"
              }`}
            >
              {primary ? (
                <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-deep text-primary-foreground shadow-lg shadow-deep/25">
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge && <FavoritesTabBadge />}
                </span>
              )}
              <span className={`text-[0.6rem] font-medium ${primary ? "-mt-2" : ""}`}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Pied de page — bleu profond, colonnes de liens réels.
 *
 * La colonne « Boutique » suit la navigation lue en base plutôt que des
 * rubriques figées. Les douze liens « # » qui l'occupaient auparavant menaient
 * tous au néant : dans une boutique en ligne, un pied de page en trompe-l'œil
 * coûte la confiance, et les mentions légales doivent rester joignables depuis
 * n'importe quelle page.
 *
 * Le formulaire de newsletter a été retiré : il n'envoyait rien nulle part, et
 * la boutique n'a volontairement pas de fichier d'adresses (voir
 * src/server/contacts.ts). À sa place, le canal réellement en service ici —
 * WhatsApp, déjà utilisé pour confirmer les commandes.
 */
export async function SiteFooter() {
  const groups = await getShopNavigation();

  return (
    <footer className="relative overflow-hidden bg-footer text-footer-foreground">
      {/* Motif de marque, présent sur toutes les pages puisque le pied de page
          l'est : il referme chaque page sur l'identité de la maison. */}
      <PatternBackdrop align="footer" opacity="opacity-35" />
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            {/* Le lettrage officiel de la charte, dans sa version claire. Le
                pied de page est le seul endroit assez large pour le porter en
                entier ; l'en-tête garde le mot-symbole composé en Cinzel, qui
                reste net à toutes les tailles et ne coûte aucune requête. */}
            <Link href="/" aria-label={BRAND.name} className="inline-block">
              <Image
                src="/images/logo-full-light.png"
                alt={BRAND.name}
                width={1070}
                height={306}
                sizes="200px"
                className="h-auto w-[11rem]"
              />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-footer-foreground/70">
              {BRAND.slogan} Une sélection cosmétique multimarque, pensée pour votre peau.
            </p>
            <div className="mt-6 flex items-center gap-4 text-footer-foreground/80">
              {/* Comptes réels de la charte (@kosskoss_select) : la marque vit
                  d'abord sur le social, un lien mort y est un aveu d'abandon. */}
              <a
                href={`https://instagram.com/${CONTACT.social.instagram}`}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`Instagram — @${CONTACT.social.instagram}`}
                className="transition hover:text-footer-foreground"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href={`https://facebook.com/${CONTACT.social.facebook}`}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`Facebook — ${CONTACT.social.facebook}`}
                className="transition hover:text-footer-foreground"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
              <span className="h-4 w-px bg-footer-foreground/25" />
              <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm transition hover:text-footer-foreground">
                <Phone className="h-4 w-4" />
                {CONTACT.phone}
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-footer-foreground/60">
              Boutique
            </h4>
            <ul className="mt-4 space-y-3">
              {groups.map((group) => (
                <li key={group.slug}>
                  <Link href={group.href} className={FOOTER_LINK}>
                    {group.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/diagnostic" className={FOOTER_LINK}>
                  Le diagnostic
                </Link>
              </li>
              <li>
                <Link href="/a-propos" className={FOOTER_LINK}>
                  Notre maison
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-footer-foreground/60">
              Aide
            </h4>
            <ul className="mt-4 space-y-3">
              {FOOTER_HELP.map((entry) => (
                <li key={entry.href}>
                  <Link href={entry.href} className={FOOTER_LINK}>
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-footer-foreground/60">
              Une question ?
            </h4>
            <p className="mt-4 text-sm text-footer-foreground/70">
              Conseil produit, suivi de commande, livraison : écrivez-nous sur WhatsApp, on
              répond dans la journée.
            </p>
            {WHATSAPP_LINK && (
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-sand px-5 py-2.5 text-sm font-semibold text-deep transition hover:bg-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                Discuter sur WhatsApp
              </a>
            )}
            <Link
              href="/contact"
              className="mt-4 block text-sm text-footer-foreground/70 underline underline-offset-4 transition hover:text-footer-foreground"
            >
              Toutes nos coordonnées
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-footer-foreground/15 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-footer-foreground/50">
            © 2026 {BRAND.name}. Tous droits réservés.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {FOOTER_LEGAL.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="text-xs text-footer-foreground/60 transition hover:text-footer-foreground"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
