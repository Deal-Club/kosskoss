"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LocalizedLink as Link } from "./localized-link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
  Store,
  MessageCircleQuestion,
} from "lucide-react";
import { formatFcfa } from "@/lib/kk/format";
import type { NavGroup, NavHighlight } from "@/server/kk/navigation";

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
          <div className="absolute inset-x-0 top-0 bg-background px-6 py-6 shadow-2xl">
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
          <nav className="absolute left-0 top-0 flex h-full w-full max-w-xs flex-col overflow-y-auto bg-background shadow-2xl">
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

              {/* Les univers en accordéons, et non tous déployés.
                  Trois rayons ouverts d'office donnaient une colonne de trente
                  liens : le visiteur faisait défiler à l'aveugle pour retrouver
                  le sien, et les entrées du bas du panneau — compte, favoris,
                  commandes — n'étaient jamais atteintes. Le premier reste
                  ouvert pour que le menu ne s'affiche pas entièrement replié.
                  `details` natif : l'ouverture fonctionne sans JavaScript. */}
              <div className="mt-6 divide-y divide-border border-y border-border">
                {groups.map((group, i) => (
                  <details key={group.slug} open={i === 0} className="group py-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-deep marker:hidden">
                      {group.label}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <ul className="pb-2">
                      {group.categories.map((category) => (
                        <li key={category.slug}>
                          <Link
                            href={category.href}
                            {...closeOnNavigate}
                            className="flex items-baseline gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-sand hover:text-deep"
                          >
                            {category.label}
                            <span className="figure text-xs text-muted-foreground">
                              {category.productCount}
                            </span>
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          href={group.href}
                          {...closeOnNavigate}
                          className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-deep underline-offset-4 hover:underline"
                        >
                          Tout {group.label.toLowerCase()}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    </ul>
                  </details>
                ))}
              </div>

              {/* Marques et Conseils existaient dans la barre du haut mais pas
                  ici : deux rubriques entières inaccessibles au téléphone. */}
              <ul className="mt-5 space-y-1">
                {[
                  { href: "/marques", label: "Nos marques", icon: Store },
                  { href: "/faq", label: "Conseils & questions", icon: MessageCircleQuestion },
                ].map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      {...closeOnNavigate}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-deep transition hover:bg-sand"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" /> {label}
                    </Link>
                  </li>
                ))}
              </ul>
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
export function DesktopNav({
  groups,
  highlights = [],
}: {
  groups: NavGroup[];
  /** Deux produits montrés dans le panneau « Boutique ». */
  highlights?: NavHighlight[];
}) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Ouverture et fermeture différée.
   *
   * Le panneau tenait sur `group-hover` seul : il disparaissait au pixel près
   * dès que le curseur quittait l'entrée, et une diagonale vers la troisième
   * colonne le refermait en route. Les 180 ms de sursis suffisent à traverser
   * le vide entre le lien et le panneau — c'est le délai qu'utilisent les
   * catalogues qui ne se referment pas au nez du visiteur.
   */
  function ouvrir() {
    if (minuterie.current) clearTimeout(minuterie.current);
    setOuvert(true);
  }

  function fermer(delai = 180) {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setOuvert(false), delai);
  }

  useEffect(() => () => {
    if (minuterie.current) clearTimeout(minuterie.current);
  }, []);

  // Échap referme, comme tout panneau superposé du site.
  useDismiss(ouvert, () => setOuvert(false));

  // La fermeture après navigation est déclenchée par le clic sur chaque lien
  // (`onFermer`), et non par un effet sur l'URL : un effet qui appelle
  // `setState` provoque un rendu en cascade, et ne se déclencherait pas si le
  // visiteur reclique sur la page où il se trouve déjà. Même raison que dans
  // `MobileMenu`.
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
    // « Conseils » (la FAQ) a été retiré de la barre : cinq entrées se lisent
    // d'un coup d'œil là où six commencent à se disputer l'attention, et la FAQ
    // reste atteignable depuis le menu mobile, le pied de page et l'accueil.
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
      <ul className="flex items-center gap-7">
        {entries.map((entry) => {
          const active = entry.deroulant ? boutiqueActive() : isActive(entry.href);
          const deploye = Boolean(entry.deroulant) && ouvert;
          return (
            <li
              key={entry.href}
              className={entry.deroulant ? "static" : undefined}
              onMouseEnter={entry.deroulant ? ouvrir : undefined}
              onMouseLeave={entry.deroulant ? () => fermer() : undefined}
              // Le focus clavier ouvre le panneau comme le survol ; il ne le
              // referme que lorsqu'il sort réellement de l'entrée — sinon
              // tabuler du lien vers la première catégorie le ferait
              // disparaître à l'instant où l'on entre dedans.
              onFocus={entry.deroulant ? ouvrir : undefined}
              onBlur={
                entry.deroulant
                  ? (e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) fermer(0);
                    }
                  : undefined
              }
            >
              <Link
                href={entry.href}
                onClick={entry.deroulant ? () => setOuvert(false) : undefined}
                aria-current={active ? "page" : undefined}
                aria-expanded={entry.deroulant ? deploye : undefined}
                aria-haspopup={entry.deroulant ? true : undefined}
                className={`group/lien relative inline-flex items-center gap-1 py-2 text-[0.82rem] font-medium tracking-[0.02em] transition-colors hover:text-deep ${
                  active || deploye ? "text-deep" : "text-muted-foreground"
                }`}
              >
                {entry.label}
                {entry.deroulant && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${deploye ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                )}
                {/* Un seul filet, qui sert deux états : plein sur la rubrique
                    courante, il se déroule de gauche à droite au survol des
                    autres. La barre répondait jusqu'ici par un simple
                    changement de gris — trop discret pour se voir. */}
                <span
                  className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-gold transition-transform duration-300 ${
                    active || deploye ? "scale-x-100" : "scale-x-0 group-hover/lien:scale-x-100"
                  }`}
                  aria-hidden="true"
                />
              </Link>

              {entry.deroulant && groups.length > 0 && (
                <MegaMenu
                  groups={groups}
                  highlights={highlights}
                  ouvert={deploye}
                  onFermer={() => setOuvert(false)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Panneau « Boutique ».
 *
 * Il valait 42 rem au milieu de l'écran et n'alignait que des noms de rayons :
 * une table des matières, là où la boutique a besoin d'une vitrine. Il occupe
 * désormais toute la gouttière — les rayons à gauche, deux produits réels à
 * droite — parce que c'est le premier endroit où un visiteur qui ne sait pas
 * encore ce qu'il veut peut être accroché par un produit plutôt que par un mot.
 */
function MegaMenu({
  groups,
  highlights,
  ouvert,
  onFermer,
}: {
  groups: NavGroup[];
  highlights: NavHighlight[];
  ouvert: boolean;
  onFermer: () => void;
}) {
  const total = groups.reduce(
    (n, g) => n + g.categories.reduce((m, c) => m + c.productCount, 0),
    0,
  );

  return (
    <div
      // `absolute inset-x-0` sur un `li` en `static` : le panneau se cale sur
      // toute la largeur de l'en-tête et non sur celle de son entrée.
      className={`absolute inset-x-0 top-full z-50 pt-2 transition duration-200 ${
        ouvert
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-1 opacity-0"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl shadow-deep/15">
          <div className="grid gap-8 p-7 lg:grid-cols-[1fr_20rem]">
            {/* Les rayons */}
            <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <div key={group.slug}>
                  <Link
                    href={group.href}
                    onClick={onFermer}
                    className="group/univers inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-deep transition hover:text-gold-ink"
                  >
                    {group.label}
                    <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover/univers:translate-x-0.5" />
                  </Link>
                  <ul className="mt-3.5 space-y-0.5">
                    {group.categories.map((category) => (
                      <li key={category.slug}>
                        {/* Le compteur collé au libellé, et non poussé au bout
                            de la colonne : un chiffre séparé de son mot par
                            douze centimètres de vide ne se rattache à rien. */}
                        <Link
                          href={category.href}
                          onClick={onFermer}
                          className="-mx-2.5 flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-sm text-foreground transition hover:bg-sand hover:text-deep"
                        >
                          <span className="min-w-0">{category.label}</span>
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

            {/* La vitrine */}
            {highlights.length > 0 && (
              <aside className="rounded-xl bg-sand p-5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-gold-ink">
                  À découvrir
                </p>
                <ul className="mt-4 space-y-3">
                  {highlights.map((produit) => (
                    <li key={produit.id}>
                      <Link
                        href={produit.href}
                        onClick={onFermer}
                        className="group/produit flex items-center gap-3 rounded-xl bg-background p-2.5 transition hover:shadow-lg hover:shadow-deep/10"
                      >
                        <span className="relative grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]">
                          {produit.image ? (
                            <Image
                              src={produit.image}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover transition-transform duration-500 group-hover/produit:scale-105"
                            />
                          ) : (
                            <Sparkles className="h-5 w-5 text-deep/40" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {produit.brand}
                          </span>
                          <span className="line-clamp-2 block text-sm leading-snug text-foreground">
                            {produit.name}
                          </span>
                          <span className="figure mt-0.5 block text-sm font-semibold text-deep">
                            {formatFcfa(produit.priceFcfa)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>

          {/* Pied du panneau : la sortie vers le catalogue entier, et les deux
              portes d'entrée « par le besoin » — celles qui convertissent un
              visiteur qui ne connaît aucune marque. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-sand/60 px-7 py-3.5">
            <Link
              href={groups[0]?.href ?? "/"}
              onClick={onFermer}
              className="group/tout inline-flex items-center gap-1.5 text-sm font-semibold text-deep"
            >
              Voir tout le catalogue
              {total > 0 && (
                <span className="figure font-normal text-muted-foreground">({total})</span>
              )}
              <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover/tout:translate-x-1" />
            </Link>
            <span className="flex items-center gap-2">
              <Link
                href="/routines"
                onClick={onFermer}
                className="inline-flex items-center gap-1.5 rounded-full bg-deep px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-deep/90"
              >
                <Sparkles className="h-3.5 w-3.5" /> Nos routines
              </Link>
              <Link
                href="/diagnostic"
                onClick={onFermer}
                className="rounded-full border border-deep/30 px-4 py-2 text-xs font-semibold text-deep transition hover:bg-background"
              >
                Faire mon diagnostic
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
