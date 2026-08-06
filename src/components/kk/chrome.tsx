import {
  Search,
  User,
  Menu,
  Home,
  Sparkles,
  LayoutGrid,
  Heart,
  Phone,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { BRAND, CONTACT } from "@/config/brand";
import { Monogram } from "./motifs";
import { CartButton } from "./cart-button";

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

const NAV = [
  { label: "Accueil", href: "/", active: true },
  { label: "Soins du visage", href: "/soins-visage" },
  { label: "Corps & Cheveux", href: "/corps-cheveux" },
  { label: "Diagnostic", href: "/diagnostic" },
];

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

/** En-tête boutique — sticky, transparent sur crème avec léger flou. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-6">
        {/* Gauche : recherche (desktop) / menu (mobile) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="grid h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground transition hover:border-deep/40 hover:text-deep lg:inline-flex"
          >
            <Search className="h-4 w-4" />
            Rechercher
          </button>
        </div>

        {/* Centre : logotype */}
        <Wordmark />

        {/* Droite : compte + panier */}
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label="Rechercher"
            className="grid h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand lg:hidden"
          >
            <Search className="h-5 w-5" />
          </button>
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

      {/* Navigation principale (desktop) */}
      <nav className="hidden border-t border-border/50 lg:block">
        <ul className="mx-auto flex max-w-7xl items-center justify-center gap-10 px-6 py-3">
          {NAV.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`relative text-[0.82rem] font-medium uppercase tracking-[0.14em] transition-colors hover:text-deep ${
                  item.active ? "text-deep" : "text-muted-foreground"
                }`}
              >
                {item.label}
                {item.active && (
                  <span className="absolute -bottom-1.5 left-0 h-px w-full bg-gold" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
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
    { label: "Favoris", href: "/favoris", icon: Heart },
    { label: "Compte", href: "/compte", icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-cream/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-between px-4 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2">
        {items.map(({ label, href, icon: Icon, active, primary }) => (
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
                <Icon className="h-5 w-5" />
              )}
              <span className={`text-[0.6rem] font-medium ${primary ? "-mt-2" : ""}`}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Pied de page — bleu profond, colonnes + newsletter + réseaux. */
export function SiteFooter() {
  const columns = [
    { title: "La Maison", links: ["Notre histoire", "Nos marques", "Le diagnostic", "Boutique"] },
    { title: "Aide", links: ["Livraison", "Suivi de commande", "Contact", "FAQ"] },
    { title: "Légal", links: ["Mentions légales", "CGV", "Confidentialité", "Cookies"] },
  ];
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <div className="flex items-center gap-3">
              <Monogram className="h-11 w-11 text-footer-foreground" />
              <span className="wordmark text-lg text-footer-foreground">KOSSKOSS</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-footer-foreground/70">
              {BRAND.slogan} Une sélection cosmétique multimarque, pensée pour votre peau.
            </p>
            <div className="mt-6 flex items-center gap-4 text-footer-foreground/80">
              <a href="#" aria-label="Instagram" className="transition hover:text-footer-foreground">
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Facebook" className="transition hover:text-footer-foreground">
                <FacebookIcon className="h-5 w-5" />
              </a>
              <span className="h-4 w-px bg-footer-foreground/25" />
              <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm transition hover:text-footer-foreground">
                <Phone className="h-4 w-4" />
                {CONTACT.phone}
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-footer-foreground/60">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-footer-foreground/85 transition hover:text-footer-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-footer-foreground/60">
              Newsletter
            </h4>
            <p className="mt-4 text-sm text-footer-foreground/70">
              Nos nouveautés et conseils beauté, une fois par mois.
            </p>
            <form className="mt-4 flex items-center gap-2" aria-label="Inscription à la newsletter">
              <input
                type="email"
                required
                placeholder="Votre e-mail"
                className="min-w-0 flex-1 rounded-full border border-footer-foreground/25 bg-transparent px-4 py-2.5 text-sm text-footer-foreground placeholder:text-footer-foreground/50 focus:border-footer-foreground/60 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="S'inscrire"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-deep transition hover:bg-primary-foreground"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 border-t border-footer-foreground/15 pt-6 text-center text-xs text-footer-foreground/50">
          © 2026 {BRAND.name}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
