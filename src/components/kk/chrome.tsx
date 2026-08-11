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
import { getShopNavigation, getNavHighlights } from "@/server/kk/navigation";
import { getActiveAnnouncements, getAnnouncementConfig } from "@/server/announcements";
import { AnnouncementBar as AnnouncementBarView } from "./announcement-bar";
import { CartButton } from "./cart-button";
import { FavoritesLink, FavoritesTabBadge } from "./favorites-nav";
import { DesktopNav, MobileMenu, SearchAction } from "./header-actions";
import { VisaMark, OrangeMoneyMark, MoovMoneyMark } from "@/components/PaymentIcons";
import { Monogram } from "./motifs";
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
/**
 * « Nos routines » et « Nos marques » sont repris ici alors qu'ils figurent
 * aussi dans la barre du haut : le pied de page est la seconde carte du site,
 * celle qu'on consulte quand on a scrollé et qu'on ne veut pas remonter.
 */
/**
 * Liens du pied de page, réduits au strict nécessaire.
 *
 * Le pied de page portait vingt-deux liens répartis en quatre colonnes : les
 * univers du catalogue, le diagnostic, la maison, huit pages d'aide, plus les
 * mentions. Sur une boutique orientée conversion, ce n'est pas une carte du
 * site, c'est une sortie de secours géante placée juste après le bouton
 * d'achat.
 *
 * Ne restent ici que deux catégories :
 *   — les pages EXIGÉES par la vente à distance, qui doivent rester
 *     atteignables depuis n'importe quelle page (mentions, CGV, données
 *     personnelles, rétractation) ;
 *   — les pages qui LÈVENT une objection au moment de payer : les frais et
 *     délais de livraison, les moyens de paiement acceptés, le renvoi.
 *
 * Tout le reste est parti : le catalogue est dans l'en-tête, et « Notre
 * maison », « Le diagnostic », « Suivi de commande » et la FAQ se rejoignent
 * par la navigation ou depuis le compte.
 */
const FOOTER_LEGAL = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "CGV", href: "/cgv" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Rétractation", href: "/retractation" },
  { label: "Livraison", href: "/livraison" },
  { label: "Retours", href: "/retours" },
  { label: "Paiement", href: "/moyens-de-paiement" },
];

/* `FOOTER_LINK` habillait les colonnes de liens du pied de page. Ces colonnes
   ont disparu avec la refonte compacte : la seule liste restante, celle des
   mentions, porte son propre style en petit corps. */

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

/**
 * Bandeau d'annonce, lu en base.
 *
 * Le message était écrit en dur ; il se règle désormais au back-office —
 * contenu, ordre, couleurs, vitesse et défilement. La lecture se fait ici
 * plutôt que dans les seize pages qui montent ce bandeau : aucune n'a eu à
 * changer.
 *
 * Sans annonce active en base, rien ne s'affiche. C'est volontaire : un
 * bandeau vide vaut mieux qu'un message de remplissage que personne n'a écrit.
 */
export async function AnnouncementBar() {
  const [items, config] = await Promise.all([getActiveAnnouncements(), getAnnouncementConfig()]);
  return <AnnouncementBarView items={items} config={config} />;
}

/**
 * Mot-symbole composé.
 *
 * Il s'écrit « KossKoss » et non « KOSSKOSS » : Cinzel n'a pas de vraie
 * bas-de-casse, ses minuscules sont des petites capitales. La casse mixte rend
 * donc les deux K hauts suivis de « OSS » en petites capitales — exactement le
 * dessin du logo officiel (assets/marque/), que le tout-capitales aplatissait.
 *
 * `aligne` place le sigle à gauche du lettrage, comme sur la maquette du
 * client, où l'en-tête porte le monogramme encadré suivi du nom sur deux
 * lignes. Le mode centré subsiste pour les pages transactionnelles, dont
 * l'en-tête minimal n'a que le logotype au milieu.
 */
function Wordmark({ className = "", aligne = false }: { className?: string; aligne?: boolean }) {
  if (aligne) {
    return (
      <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label={BRAND.name}>
        <Monogram className="h-8 w-8 shrink-0 text-deep" title="" />
        <span className="flex flex-col leading-none">
          <span className="wordmark text-[1.05rem] text-deep sm:text-[1.15rem]">KossKoss</span>
          <span className="mt-1 text-[0.52rem] font-medium uppercase tracking-[0.42em] text-deep">
            Select
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className={`inline-flex flex-col items-center leading-none ${className}`} aria-label={BRAND.name}>
      <span className="wordmark text-[1.2rem] text-deep sm:text-[1.4rem]">KossKoss</span>
      <span className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.42em] text-deep">
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
  const [groups, highlights] = await Promise.all([getShopNavigation(), getNavHighlights()]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      {/* Une seule rangée : sigle à gauche, navigation au centre, actions à
          droite — la composition de la maquette du client.
          L'en-tête précédent centrait le logotype et repoussait la navigation
          sur une seconde ligne : il occupait deux fois la hauteur pour la même
          information, et le nom de la maison se retrouvait au milieu de nulle
          part au lieu de tenir le coin où l'œil le cherche. */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-1">
          <MobileMenu groups={groups} />
          <Wordmark aligne className="shrink-0" />
        </div>

        <DesktopNav groups={groups} highlights={highlights} />

        <div className="ml-auto flex items-center justify-end gap-1">
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
    </header>
  );
}

/**
 * En-tête minimal des pages transactionnelles (panier → paiement).
 *
 * La mention « Paiement sécurisé » y était grise, en 12 px, et masquée sous
 * 640 px — c'est-à-dire absente sur la majorité des visites. C'est pourtant la
 * seule preuve de sûreté visible au moment où le client hésite. Elle devient
 * une pastille verte, présente à toutes les tailles : sur mobile le mot
 * « Sécurisé » suffit, la mention complète revient dès qu'il y a la place.
 */
export function CheckoutHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-deep transition hover:opacity-80"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Continuer mes achats</span>
          <span className="sr-only sm:hidden">Continuer mes achats</span>
        </Link>
        <div className="justify-self-center">
          <Wordmark />
        </div>
        <span className="inline-flex items-center gap-1.5 justify-self-end rounded-full border border-trust-line bg-trust-soft px-2.5 py-1.5 text-xs font-semibold text-trust sm:px-3">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Paiement sécurisé</span>
          <span className="sm:hidden">Sécurisé</span>
        </span>
      </div>
    </header>
  );
}

/**
 * Barre de navigation basse — mobile uniquement.
 *
 * C'est « Routines » qui occupe désormais la place centrale, et non le
 * diagnostic. Les deux mènent au même endroit — une routine adaptée — mais
 * l'une la donne en un clic et l'autre en cinq questions. Sur un écran de
 * téléphone, la porte la plus courte doit être la plus visible ; le diagnostic
 * reste en tête du menu, sur l'accueil et sur la page des routines.
 */
export function MobileTabBar() {
  const items = [
    { label: "Accueil", href: "/", icon: Home, active: true },
    { label: "Boutique", href: "/soins-visage", icon: LayoutGrid },
    { label: "Routines", href: "/routines", icon: Sparkles, primary: true },
    { label: "Favoris", href: "/favoris", icon: Heart, badge: true },
    { label: "Compte", href: "/compte", icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-md lg:hidden">
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
 * Pied de page — compact, orienté conversion.
 *
 * ── Ce qu'il n'est plus ───────────────────────────────────────────────────
 * Il portait quatre colonnes et vingt-deux liens : les univers du catalogue,
 * le diagnostic, la maison, huit pages d'aide, les réseaux, les mentions. Sur
 * une boutique dont tout le parcours pousse à commander, un tel pied de page
 * est une sortie de secours géante placée juste après le bouton d'achat — et
 * il occupait plus de hauteur que certaines pages qu'il concluait.
 *
 * ── Ce qu'il garde, et pourquoi ───────────────────────────────────────────
 *   1. WHATSAPP. C'est le canal réellement en service — celui par lequel les
 *      commandes sont confirmées. Une question sans réponse, c'est un panier
 *      abandonné ; il reste donc en évidence, pas en petits caractères.
 *   2. LES MOYENS DE PAIEMENT. Dernière objection levée au dernier moment :
 *      savoir qu'on peut payer avec ce qu'on a déjà dans son téléphone.
 *   3. LES PAGES LÉGALES. Elles ne relèvent pas d'un choix éditorial : la
 *      vente à distance impose que mentions, CGV, données personnelles et
 *      rétractation soient joignables depuis n'importe quelle page. Livraison,
 *      retours et paiement les accompagnent parce qu'elles lèvent, elles
 *      aussi, une objection d'achat.
 *
 * Tout tient désormais en trois rangées, et plus aucune n'est une colonne de
 * liens : le catalogue est dans l'en-tête, c'est là qu'on navigue.
 */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-footer text-footer-foreground">
      {/* Motif de marque en fond. Le pied de page est bien plus court qu'avant
          et ne porte plus de colonnes de liens en petit corps : la trame y
          respire au lieu de courir sous du texte. 12 % d'opacité tout de même,
          contre 18 % ailleurs — il figure sur toutes les pages du site, c'est
          l'endroit le plus répété du parcours. */}
      <PatternBackdrop align="footer" opacity="opacity-[0.12]" />

      <div className="relative mx-auto max-w-7xl px-6 py-8">
        {/* RANGÉE 1 — tout ce qui sert à acheter : l'identité, le contact
            direct, et les moyens de paiement.

            Les logos de paiement tenaient une rangée à eux seuls, sous un
            titre « Paiement accepté ». Le titre est parti et les logos ont
            rejoint cette ligne : trois marques dessinées se reconnaissent sans
            qu'on les annonce, et l'intitulé coûtait une rangée entière pour un
            mot que personne ne lit. */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <Link href="/" aria-label={BRAND.name} className="inline-block shrink-0">
            <Image
              src="/images/logo-full-light.png"
              alt={BRAND.name}
              width={1070}
              height={306}
              sizes="180px"
              className="h-auto w-[9.5rem]"
            />
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {WHATSAPP_LINK && (
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-sand px-5 py-2.5 text-sm font-semibold text-deep transition hover:bg-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                Une question ? WhatsApp
              </a>
            )}

            <a
              href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 text-sm transition hover:text-gold-soft"
            >
              <Phone className="h-4 w-4" />
              {CONTACT.phone}
            </a>

            <span className="hidden h-4 w-px bg-footer-foreground/25 sm:block" />

            {/* Comptes réels de la charte : la marque vit d'abord sur le
                social, un lien mort y est un aveu d'abandon. */}
            <span className="flex items-center gap-4">
              <a
                href={`https://instagram.com/${CONTACT.social.instagram}`}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`Instagram — @${CONTACT.social.instagram}`}
                className="transition hover:text-gold-soft"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href={`https://facebook.com/${CONTACT.social.facebook}`}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`Facebook — ${CONTACT.social.facebook}`}
                className="transition hover:text-gold-soft"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
            </span>

            <span className="hidden h-4 w-px bg-footer-foreground/25 sm:block" />

            {/* Moyens de paiement, sans intitulé. Les marques sont dessinées au
                trait (voir PaymentIcons), jamais reprises des fichiers
                officiels. Un cran plus petites qu'avant, où elles occupaient
                leur propre rangée. */}
            <ul className="flex flex-wrap items-center justify-center gap-3 [&_svg]:h-8 [&_svg]:w-12">
              {[VisaMark, OrangeMoneyMark, MoovMoneyMark].map((Mark, i) => (
                <li key={i} className="transition-transform duration-300 hover:-translate-y-0.5">
                  <Mark />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RANGÉE 2 — mentions. Une seule ligne, en petit corps : obligatoire,
            donc présent ; jamais une invitation à quitter la page. */}
        <div className="mt-7 flex flex-col items-center gap-3 border-t border-footer-foreground/15 pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-footer-foreground">
            © 2026 {BRAND.name}. Tous droits réservés.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {FOOTER_LEGAL.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="text-xs text-footer-foreground transition hover:text-gold-soft"
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
