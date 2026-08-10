"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LocalizedLink as Link } from "./localized-link";
import { usePathname } from "next/navigation";
import {
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Heart,
  User,
  Sparkles,
  Package,
} from "lucide-react";
import type { NavGroup } from "@/server/kk/navigation";

/**
 * Les deux commandes interactives de l'en-tête : la recherche et le menu
 * mobile. Elles étaient jusqu'ici de simples boutons sans effet.
 *
 * La navigation leur arrive en props, lue en base par l'en-tête (composant
 * serveur) : ces composants n'interrogent rien eux-mêmes.
 */

/** Ferme au clic hors zone et à la touche Échap. */
function useDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);
}

/**
 * Recherche du site.
 *
 * Un panneau plutôt qu'un champ toujours visible : l'en-tête est centré sur le
 * logotype, et un champ permanent déséquilibrerait la composition sur mobile.
 * La soumission mène à /recherche, qui existait déjà mais n'était atteignable
 * par aucun lien.
 *
 * Le formulaire part en GET natif, sans `router.push` : la recherche fonctionne
 * alors même que le JavaScript n'a pas fini de s'hydrater — un cas courant sur
 * les connexions mobiles auxquelles s'adresse cette boutique.
 */
export function SearchAction({ variant = "desktop" }: { variant?: "desktop" | "icon" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  // La langue est déduite du chemin plutôt que de `useLocale()` : l'en-tête est
  // aussi monté par /preview, qui vit hors du segment [locale] et n'a donc pas
  // de contexte next-intl. Le français est à la racine, l'anglais sous /en
  // (localePrefix « as-needed »).
  const action = pathname.startsWith("/en/") || pathname === "/en" ? "/en/recherche" : "/recherche";

  useDismiss(open, () => setOpen(false));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      {variant === "desktop" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={panelId}
          className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground transition hover:border-deep/40 hover:text-deep lg:inline-flex"
        >
          <Search className="h-4 w-4" />
          Rechercher
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Rechercher"
          aria-expanded={open}
          aria-controls={panelId}
          className="grid h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand lg:hidden"
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div id={panelId} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Rechercher">
          <button
            type="button"
            aria-label="Fermer la recherche"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-deep/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 top-0 bg-cream px-6 py-6 shadow-2xl">
            <form
              action={action}
              method="get"
              role="search"
              className="mx-auto flex max-w-2xl items-center gap-3"
            >
              <label htmlFor="recherche-boutique" className="sr-only">
                Rechercher un produit
              </label>
              <div className="flex flex-1 items-center gap-3 rounded-full border border-border bg-card px-5 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="recherche-boutique"
                  ref={inputRef}
                  type="search"
                  name="q"
                  required
                  maxLength={80}
                  placeholder="Une marque, un produit, un besoin…"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-deep px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-deep/90"
              >
                Chercher
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-deep transition hover:bg-sand"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Panneau de navigation mobile : tout le catalogue, plus l'espace client. */
export function MobileMenu({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);

  useDismiss(open, () => setOpen(false));

  /**
   * Le panneau se referme dès qu'un lien est suivi, sinon il resterait ouvert
   * par-dessus la page demandée. La fermeture est déclenchée par le clic, et
   * non par un effet sur l'URL : un effet qui appelle `setState` provoque un
   * rendu en cascade — et ne se déclencherait pas si le visiteur reclique sur
   * la page où il est déjà.
   */
  const closeOnNavigate = { onClick: () => setOpen(false) };

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full text-deep transition hover:bg-sand lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Monté dans <body> et non sur place.
          L'en-tête porte `backdrop-blur`, et un `backdrop-filter` devient le
          référentiel des positions `fixed` de ses descendants : le panneau se
          calait donc sur la hauteur de l'en-tête (72 px) au lieu de l'écran,
          et son contenu était tronqué juste sous le logotype. */}
      {/* Pas de garde « monté » nécessaire : `open` est faux au rendu serveur
          et ne passe à vrai que sur un clic, donc côté client uniquement. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-deep/40 backdrop-blur-sm"
          />
          <nav className="absolute left-0 top-0 flex h-full w-full max-w-xs flex-col overflow-y-auto bg-cream shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="wordmark text-base text-deep">KOSSKOSS</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="grid h-9 w-9 place-items-center rounded-full text-deep transition hover:bg-sand"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 px-5 py-5">
              {/* Les deux entrées « solution » en tête du menu, avant les
                  rayons : c'est l'ordre de la structure fournie par le client,
                  où les routines et le diagnostic passent devant les produits. */}
              <Link
                href="/routines"
                {...closeOnNavigate}
                className="flex items-center gap-2 rounded-full bg-deep px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" /> Nos routines prêtes à l&rsquo;emploi
              </Link>
              <Link
                href="/diagnostic"
                {...closeOnNavigate}
                className="mt-3 flex items-center justify-center gap-2 rounded-full border border-deep/30 px-5 py-3 text-sm font-semibold text-deep"
              >
                Faire mon diagnostic
              </Link>

              {groups.map((group) => (
                <div key={group.slug} className="mt-7">
                  <Link
                    href={group.href}
                    {...closeOnNavigate}
                    className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {group.label}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <ul className="mt-3 space-y-1">
                    {group.categories.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={category.href}
                          {...closeOnNavigate}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-deep transition hover:bg-sand"
                        >
                          {category.label}
                          <span className="figure text-xs text-muted-foreground">
                            {category.productCount}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4">
              <ul className="space-y-1">
                {[
                  { href: "/compte", label: "Mon compte", icon: User },
                  { href: "/favoris", label: "Mes favoris", icon: Heart },
                  { href: "/compte/commandes", label: "Mes commandes", icon: Package },
                ].map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      {...closeOnNavigate}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-deep transition hover:bg-sand"
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Liens d'univers du bandeau principal, avec soulignement de la rubrique
 * courante. Client, parce que l'état actif dépend de l'URL affichée.
 */
export function DesktopNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  // Les six entrées de la maquette, dans son ordre :
  // Accueil · Boutique · Routines · Marques · Conseils · Diagnostic.
  //
  // Les trois univers du catalogue étaient jusqu'ici déployés à plat dans la
  // barre, ce qui la portait à sept entrées et la faisait basculer d'une
  // hiérarchie à une liste. Ils passent sous « Boutique », en menu déroulant :
  // la barre retrouve sa lisibilité et l'accès direct aux rayons ne se perd
  // pas — il gagne même les catégories, qui n'y figuraient pas.
  const entries = [
    { href: "/", label: "Accueil" },
    { href: groups[0]?.href ?? "/soins-visage", label: "Boutique", deroulant: true },
    { href: "/routines", label: "Routines" },
    { href: "/marques", label: "Marques" },
    { href: "/faq", label: "Conseils" },
    { href: "/diagnostic", label: "Diagnostic" },
  ];

  /** « / » ne doit s'allumer que sur l'accueil, pas sur toutes les pages. */
  function isActive(href: string): boolean {
    const path = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  }

  /** « Boutique » est actif dès qu'on est dans l'un des univers du catalogue. */
  function boutiqueActive(): boolean {
    return groups.some((g) => isActive(g.href));
  }

  return (
    <nav className="hidden flex-1 justify-center lg:flex">
      <ul className="flex items-center gap-8">
        {entries.map((entry) => {
          const active = entry.deroulant ? boutiqueActive() : isActive(entry.href);
          return (
            <li
              key={entry.href}
              // `group` + `relative` : le panneau s'ouvre au survol ET au focus
              // clavier, sans état React. Un menu de navigation qui ne
              // s'atteint qu'à la souris exclut la moitié des usages.
              className={entry.deroulant ? "group relative" : undefined}
            >
              <Link
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center gap-1 py-2 text-[0.82rem] font-medium tracking-[0.02em] transition-colors hover:text-deep ${
                  active ? "text-deep" : "text-muted-foreground"
                }`}
              >
                {entry.label}
                {entry.deroulant && (
                  <ChevronDown
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180"
                    aria-hidden="true"
                  />
                )}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 h-px w-full bg-gold" aria-hidden="true" />
                )}
              </Link>

              {entry.deroulant && groups.length > 0 && (
                <div className="invisible absolute left-1/2 top-full z-50 w-[42rem] -translate-x-1/2 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="grid grid-cols-3 gap-6 rounded-2xl border border-border/70 bg-cream p-6 shadow-2xl shadow-deep/15">
                    {groups.map((group) => (
                      <div key={group.slug}>
                        <Link
                          href={group.href}
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-deep transition hover:text-deep/70"
                        >
                          {group.label}
                        </Link>
                        <ul className="mt-3 space-y-1.5">
                          {group.categories.map((category) => (
                            <li key={category.slug}>
                              <Link
                                href={category.href}
                                className="flex items-center justify-between gap-3 text-sm text-foreground transition hover:text-deep"
                              >
                                {category.label}
                                <span className="figure text-[0.7rem] text-muted-foreground">
                                  {category.productCount}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
