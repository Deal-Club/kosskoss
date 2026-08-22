"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Code2,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Menu,
  Newspaper,
  Package,
  Plug,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Tags,
  Ticket,
  TrendingUp,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoImage } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { capaciteDeFamille } from "@/lib/kk/routesAdmin";
import type { Capacite } from "@/lib/kk/roles";

interface NavEntry {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  /** Ce que compte la pastille : un nombre seul n'est lisible par personne. */
  badgeTitle?: string;
  /**
   * Famille de routes (premier segment après `/admin/`) que réclame cette
   * entrée. Résolue en capacité via `CAPACITE_PAR_FAMILLE`, la source unique :
   * la recopier ici aurait permis à cette règle de diverger de celle qui garde
   * réellement les écrans.
   */
  famille?: string;
}

interface NavSection {
  title?: string;
  entries: NavEntry[];
}

export function AdminSidebar({
  email,
  pendingReviews,
  capacites,
}: {
  email: string;
  pendingReviews: number;
  capacites: readonly Capacite[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function ouverte(famille: string | undefined): boolean {
    if (!famille) return true;
    const capacite = capaciteDeFamille(famille);
    return capacite === null || capacites.includes(capacite);
  }

  const sectionsBrutes: NavSection[] = [
    {
      entries: [{ label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard }],
    },
    {
      title: "Catalogue",
      entries: [
        { label: "Univers produits", href: "/admin/groups", icon: Layers, famille: "groups" },
        { label: "Catégories", href: "/admin/categories", icon: Tags, famille: "categories" },
        { label: "Produits", href: "/admin/products", icon: Package, famille: "products" },
        // Vocabulaire des tags (types de peau, préoccupations…) : labels FR/EN,
        // famille et activation, éditables sans redéploiement (tâche 10).
        {
          label: "Tags produits",
          href: "/admin/products/tags",
          icon: Tag,
          famille: "products",
        },
        { label: "Stock", href: "/admin/stock", icon: Warehouse, famille: "stock" },
        {
          label: "Diagnostic beauté",
          href: "/admin/diagnostic",
          icon: Sparkles,
          famille: "diagnostic",
        },
        // Gestes du diagnostic : libellés FR/EN, catégorie source, ordre et
        // activation — leur nombre actif fixe le nombre de produits proposés
        // par le diagnostic (critère 08), sans redéploiement.
        {
          label: "Gestes du diagnostic",
          href: "/admin/diagnostic/gestes",
          icon: ListChecks,
          famille: "diagnostic",
        },
      ],
    },
    {
      title: "Boutique",
      entries: [
        { label: "Ventes", href: "/admin/ventes", icon: TrendingUp, famille: "ventes" },
        { label: "Commandes", href: "/admin/orders", icon: Receipt, famille: "orders" },
        // « Clients » est retiré du menu : les coordonnées du client figurent
        // déjà dans le détail de chaque commande. L'écran existe toujours et
        // reste joignable par son adresse (/admin/customers).
        {
          label: "Avis clients",
          href: "/admin/reviews",
          icon: Star,
          badge: pendingReviews,
          badgeTitle: "avis en attente de validation",
          famille: "reviews",
        },
        // « Campagnes » est retiré du menu : la partie e-mailing n'est pas
        // ouverte. Les écrans existent toujours et restent joignables par leur
        // adresse (/admin/campaigns) ; seule l'entrée du menu disparaît.
        {
          label: "Moyens de paiement",
          href: "/admin/payments",
          icon: CreditCard,
          famille: "payments",
        },
        { label: "Codes promo", href: "/admin/coupons", icon: Ticket, famille: "coupons" },
        {
          label: "Bandeau d'annonce",
          href: "/admin/announcements",
          icon: Megaphone,
          famille: "announcements",
        },
        {
          label: "Google Merchant",
          href: "/admin/merchant",
          icon: ShoppingBag,
          famille: "merchant",
        },
        {
          label: "Intégrations",
          href: "/admin/integrations",
          icon: Plug,
          famille: "integrations",
        },
      ],
    },
    {
      title: "Éditorial",
      entries: [
        // Une seule entrée : les rubriques, tags et auteurs sont accessibles
        // depuis l'écran du Journal. Trois lignes de menu de plus pour des
        // réglages qu'on touche au démarrage puis presque jamais auraient
        // surtout allongé la barre.
        { label: "Le Journal", href: "/admin/journal", icon: Newspaper, famille: "journal" },
      ],
    },
    {
      title: "Système",
      entries: [
        { label: "Pages & mentions légales", href: "/admin/pages", icon: FileText, famille: "pages" },
        { label: "Scripts & balises", href: "/admin/scripts", icon: Code2, famille: "scripts" },
        // Numéro WhatsApp, lien du formulaire d'évaluation et identifiants de
        // mesure — modifiables sans redéploiement (critère 16).
        {
          label: "Paramètres",
          href: "/admin/parametres",
          icon: Settings,
          famille: "parametres",
        },
        { label: "Accès", href: "/admin/users", icon: Users, famille: "users" },
      ],
    },
  ];

  // Une entrée dont la capacité est refusée disparaît ; une section dont plus
  // aucune entrée ne subsiste disparaît à son tour, titre compris — un titre
  // de section vide se lit comme un bogue d'affichage, pas comme un droit
  // absent.
  const sections: NavSection[] = sectionsBrutes
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => ouverte(entry.famille)),
    }))
    .filter((section) => section.entries.length > 0);

  // "/admin" ne doit pas rester surligné sur les sous-pages
  function isActive(href: string): boolean {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  const panel = (
    <div className="flex h-full flex-col bg-deep text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="block"
          aria-label="KossKoss Select — administration"
        >
          {/* Logo officiel, variante claire : le fond est sombre (bg-deep).
              `priority` parce qu'il est au-dessus de la ligne de flottaison sur
              chaque écran du back-office. */}
          <LogoImage tone="light" priority className="h-8 w-auto" />
          <span className="mt-1.5 block text-[11px] font-semibold tracking-widest text-sand uppercase">
            Administration
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.title ?? `section-${index}`} className="mb-5 last:mb-0">
            {section.title && (
              <p className="mb-2 px-2 text-[10px] font-black tracking-widest text-white/40 uppercase">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.entries.map(({ label, href, icon: Icon, badge, badgeTitle }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-sm px-2.5 py-2 text-sm transition-colors",
                      isActive(href)
                        ? "bg-white/10 font-bold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive(href) ? "text-sand" : "text-white/50",
                      )}
                    />
                    <span className="flex-1">{label}</span>
                    {badge ? (
                      <span
                        title={badgeTitle}
                        aria-label={badgeTitle ? `${badge} ${badgeTitle}` : undefined}
                        className="rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-black text-deep"
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <Link
          href="/"
          className="mb-3 flex items-center gap-2 text-xs text-white/60 transition-colors hover:text-sand"
        >
          <Store className="h-3.5 w-3.5" />
          Voir la boutique
        </Link>
        <p className="mb-2 truncate text-xs text-white/50" title={email}>
          {email}
        </p>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      {/* Le fond sombre couvre toute la hauteur du document, le menu reste visible au défilement */}
      <aside className="hidden w-60 shrink-0 bg-deep lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{panel}</div>
      </aside>

      {/* Barre mobile : la même navigation, ouverte par-dessus le contenu */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-deep px-4 py-3 text-white lg:hidden">
        <Link href="/admin" aria-label="KossKoss Select — administration">
          <LogoImage tone="light" priority className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-sm bg-white/10 p-2 hover:bg-white/20"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="animate-in slide-in-from-left absolute inset-y-0 left-0 w-64 duration-200">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer le menu"
              className="absolute top-4 right-3 z-10 rounded-sm p-1 text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
