import { User, Phone, MessageCircle, ChevronLeft, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "./localized-link";
import { BRAND, CONTACT } from "@/config/brand";
import { getShopNavigation, getNavHighlights, getNavRoutines } from "@/server/kk/navigation";
import { getActiveAnnouncements, getAnnouncementConfig } from "@/server/announcements";
import { AnnouncementBar as AnnouncementBarView } from "./announcement-bar";
import { CartButton } from "./cart-button";
import { FavoritesLink } from "./favorites-nav";
import { DesktopNav, MobileMenu, SearchAction } from "./header-actions";
import { VisaMark, OrangeMoneyMark, MoovMoneyMark } from "@/components/PaymentIcons";
import { PatternBackdrop } from "./pattern-backdrop";
import { CookiePreferencesButton } from "@/components/kk/cookie-consent";

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
 * Ne restent ici que trois catégories :
 *   — les pages EXIGÉES par la vente à distance, qui doivent rester
 *     atteignables depuis n'importe quelle page (mentions, CGV, données
 *     personnelles, rétractation) ;
 *   — les pages qui LÈVENT une objection au moment de payer : les frais et
 *     délais de livraison, les moyens de paiement acceptés, le renvoi ;
 *   — « À propos », qui dit qui vend. Elle n'est due à aucun texte, mais sur un
 *     marché où la contrefaçon est le premier frein, savoir à qui l'on achète
 *     en est un autre : c'est la seule page de cette liste qu'on ouvre par
 *     confiance et non par obligation. Elle vient donc en tête.
 *
 * Tout le reste est parti : le catalogue est dans l'en-tête, et « Le
 * diagnostic », « Suivi de commande » et la FAQ se rejoignent par la
 * navigation ou depuis le compte.
 */
const FOOTER_LEGAL = [
  // Libellé aligné sur celui déclaré pour le slug dans content/legal/index.ts.
  { label: "À propos", href: "/a-propos" },
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
 * Logotype de la marque — le fichier officiel, pas une reconstitution.
 *
 * Le lettrage était jusqu'ici recomposé en CSS : monogramme SVG + « KossKoss »
 * en Cinzel + « Select » en interlettrage large. L'approximation tenait de
 * loin, mais aucune fonte web ne redonne le dessin exact du logotype fourni —
 * empattements, chasse des deux K, position de la ligne « SELECT ». On sert
 * donc l'image de marque elle-même (`public/images/logo-full.png`).
 *
 * `alt` vide et libellé porté par le lien : sans cela, un lecteur d'écran
 * annonce deux fois le nom de la maison sur le seul lien du logo.
 *
 * `priority` : le logo est le premier élément peint de l'en-tête collant, sur
 * toutes les pages. Le laisser en chargement paresseux fait apparaître un
 * trou à l'endroit le plus visible du site.
 *
 * `aligne` sert l'en-tête boutique (logo calé à gauche, à côté du menu) ; le
 * mode par défaut, centré, sert l'en-tête minimal des pages de paiement.
 */
const LOGO_LARGEUR = 1070;
const LOGO_HAUTEUR = 306;

function Wordmark({ className = "", aligne = false }: { className?: string; aligne?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex ${aligne ? "items-center" : "flex-col items-center"} ${className}`}
      aria-label={BRAND.name}
    >
      <Image
        src="/images/logo-full.png"
        alt=""
        width={LOGO_LARGEUR}
        height={LOGO_HAUTEUR}
        priority
        className={aligne ? "h-9 w-auto sm:h-10" : "h-10 w-auto sm:h-11"}
      />
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
  const [groups, highlights, routines] = await Promise.all([
    getShopNavigation(),
    getNavHighlights(),
    getNavRoutines(),
  ]);

  return (
    /*
     * COLLÉ EN HAUT, Y COMPRIS SUR TÉLÉPHONE.
     *
     * La barre d'onglets du bas ayant disparu, cet en-tête est désormais la
     * SEULE navigation d'un mobile : il doit rester atteignable à tout moment,
     * sans quoi il faut remonter toute la page pour ouvrir le menu ou le
     * panier.
     *
     * Le fond devient OPAQUE sous `lg` et ne garde le flou qu'au-delà. Un
     * `backdrop-filter` sur un élément collant est le défaut le plus répandu
     * des en-têtes de boutique sur iOS : Safari recalcule le flou à chaque
     * image du défilement inertiel, la barre scintille, se fige à mi-course ou
     * disparaît le temps de quelques images — exactement l'impression d'un
     * en-tête « qui ne tient pas ». Un aplat coûte zéro composition, et sur un
     * téléphone rien ne dépasse assez sous l'en-tête pour qu'on regrette la
     * transparence.
     *
     * `z-50` : au-dessus du bouton WhatsApp flottant (z-40) et de tout élément
     * collant des pages de catalogue. Les panneaux modaux — menu, recherche,
     * panier — montent eux à z-60, portés dans <body>.
     */
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background lg:bg-background/85 lg:backdrop-blur-md">
      {/* Une seule rangée : logo à gauche, navigation au centre, actions à
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

        <DesktopNav groups={groups} highlights={highlights} routines={routines} />

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

/*
 * `MobileTabBar` — RETIRÉE.
 * ---------------------------------------------------------------------------
 * Une barre de cinq onglets fixée en bas de l'écran, doublant une navigation
 * déjà entièrement présente dans l'en-tête et son menu. Elle coûtait :
 *   — 64 px de hauteur utile en permanence, plus la zone sûre de l'écran, sur
 *     l'appareil où la hauteur est la ressource la plus rare ;
 *   — un retrait `pb-16` sur chaque page pour compenser, à maintenir partout ;
 *   — un empilement à trois étages en bas d'écran, avec le bouton WhatsApp et
 *     la barre d'achat des pages produit qui devaient tous s'éviter ;
 *   — un troisième chemin vers « Favoris » et « Compte », déjà atteignables
 *     depuis l'en-tête et le menu.
 *
 * Tout ce qu'elle donnait se retrouve dans le menu du burger — routines,
 * diagnostic, univers, compte, favoris, commandes — et l'en-tête reste collé
 * en haut à toutes les tailles (voir SiteHeader).
 */

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
            {/* Rouvre le bandeau de consentement. C'est le chemin de retour
                que le bandeau lui-même annonce : les deux doivent rester
                d'accord. */}
            <li>
              <CookiePreferencesButton />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
