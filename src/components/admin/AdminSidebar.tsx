"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Code2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Layers,
  Menu,
  Package,
  Plug,
  Receipt,
  ShoppingBag,
  Star,
  Store,
  Tags,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/admin/LogoutButton";

interface NavEntry {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  /** Ce que compte la pastille : un nombre seul n'est lisible par personne. */
  badgeTitle?: string;
}

interface NavSection {
  title?: string;
  entries: NavEntry[];
}

export function AdminSidebar({
  email,
  pendingReviews,
}: {
  email: string;
  pendingReviews: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections: NavSection[] = [
    {
      entries: [{ label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard }],
    },
    {
      title: "Catalogue",
      entries: [
        { label: "Univers produits", href: "/admin/groups", icon: Layers },
        { label: "Catégories", href: "/admin/categories", icon: Tags },
        { label: "Produits", href: "/admin/products", icon: Package },
        { label: "Stock", href: "/admin/stock", icon: Warehouse },
      ],
    },
    {
      title: "Boutique",
      entries: [
        { label: "Commandes", href: "/admin/orders", icon: Receipt },
        // « Clients » est retiré du menu : les coordonnées du client figurent
        // déjà dans le détail de chaque commande. L'écran existe toujours et
        // reste joignable par son adresse (/admin/customers).
        {
          label: "Avis clients",
          href: "/admin/reviews",
          icon: Star,
          badge: pendingReviews,
          badgeTitle: "avis en attente de validation",
        },
        // « Campagnes » est retiré du menu : la partie e-mailing n'est pas
        // ouverte. Les écrans existent toujours et restent joignables par leur
        // adresse (/admin/campaigns) ; seule l'entrée du menu disparaît.
        { label: "Moyens de paiement", href: "/admin/payments", icon: CreditCard },
        { label: "Google Merchant", href: "/admin/merchant", icon: ShoppingBag },
        { label: "Intégrations", href: "/admin/integrations", icon: Plug },
      ],
    },
    {
      title: "Système",
      entries: [
        { label: "Pages & mentions légales", href: "/admin/pages", icon: FileText },
        { label: "Scripts & balises", href: "/admin/scripts", icon: Code2 },
        { label: "Accès", href: "/admin/users", icon: Users },
      ],
    },
  ];

  // "/admin" ne doit pas rester surligné sur les sous-pages
  function isActive(href: string): boolean {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  const panel = (
    <div className="flex h-full flex-col bg-secondary text-secondary-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="block"
          aria-label="MLC Bois — administration"
        >
          {/* Fond sombre : c'est la variante claire du logo qui s'impose. */}
          <Logo tone="light" className="h-8 w-auto" />
          <span className="mt-1.5 block text-[11px] font-semibold tracking-widest text-primary uppercase">
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
                        ? "bg-primary/15 font-bold text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive(href) ? "text-primary" : "text-white/50",
                      )}
                    />
                    <span className="flex-1">{label}</span>
                    {badge ? (
                      <span
                        title={badgeTitle}
                        aria-label={badgeTitle ? `${badge} ${badgeTitle}` : undefined}
                        className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground"
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
          className="mb-3 flex items-center gap-2 text-xs text-white/60 transition-colors hover:text-primary"
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
      <aside className="hidden w-60 shrink-0 bg-secondary lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{panel}</div>
      </aside>

      {/* Barre mobile : la même navigation, ouverte par-dessus le contenu */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-secondary px-4 py-3 text-secondary-foreground lg:hidden">
        <Link href="/admin" aria-label="MLC Bois — administration">
          <Logo tone="light" className="h-7 w-auto sm:h-7" />
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
