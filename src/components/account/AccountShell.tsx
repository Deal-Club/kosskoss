import { getTranslations } from "next-intl/server";
import { LayoutDashboard, MapPin, Receipt, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AccountLogoutButton } from "@/components/account/AccountLogoutButton";

export type AccountSection = "dashboard" | "orders" | "addresses" | "data";

/**
 * Ossature des pages protégées de l'espace client : en-tête de boutique, fil
 * d'Ariane, menu latéral et contenu. La page appelante indique seulement quelle
 * entrée du menu est active — pas besoin de `usePathname`, donc pas de
 * composant client pour la navigation.
 */
export async function AccountShell({
  locale,
  active,
  title,
  intro,
  children,
}: {
  locale: string;
  active: AccountSection;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "account" });
  const common = await getTranslations({ locale, namespace: "common" });

  const entries: { key: AccountSection; href: string; label: string; icon: typeof Receipt }[] = [
    { key: "dashboard", href: "/compte", label: t("nav.dashboard"), icon: LayoutDashboard },
    { key: "orders", href: "/compte/commandes", label: t("nav.orders"), icon: Receipt },
    { key: "addresses", href: "/compte/adresses", label: t("nav.addresses"), icon: MapPin },
    { key: "data", href: "/compte/informations", label: t("nav.data"), icon: ShieldCheck },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/40">
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-screen-xl px-3 py-3">
            <Breadcrumb
              items={
                active === "dashboard"
                  ? [{ label: common("home"), href: "/" }, { label: t("title") }]
                  : [
                      { label: common("home"), href: "/" },
                      { label: t("title"), href: "/compte" },
                      { label: title },
                    ]
              }
            />
          </div>
        </div>

        <div className="mx-auto max-w-screen-xl px-3 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav aria-label={t("nav.aria")} className="lg:sticky lg:top-24 lg:self-start">
              <ul className="space-y-1">
                {entries.map(({ key, href, label, icon: Icon }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={key === active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-sm border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        key === active
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : "border-border bg-white font-semibold text-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-3">
                <AccountLogoutButton />
              </div>
            </nav>

            <div className="min-w-0">
              <h1 className="text-2xl font-black text-foreground sm:text-3xl">{title}</h1>
              {intro && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{intro}</p>}
              <div className="mt-6 space-y-6">{children}</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Ossature des pages ouvertes à tous : connexion, inscription, mot de passe
 * oublié. Une carte centrée, sans menu de compte — le visiteur n'en a pas encore.
 */
export async function AccountAuthShell({
  locale,
  title,
  intro,
  children,
}: {
  locale: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/40">
        <div className="mx-auto max-w-screen-sm px-3 py-10">
          <div className="rounded-sm border border-border bg-white p-6 sm:p-8">
            <h1 className="text-2xl font-black text-foreground">{title}</h1>
            {intro && <p className="mt-2 mb-6 text-sm text-muted-foreground">{intro}</p>}
            {!intro && <div className="mb-6" />}
            {children}
          </div>

          {/* Rappel permanent : le compte n'est jamais une condition pour
              commander (minimisation, art. 5 § 1 c RGPD). */}
          <p className="mt-4 rounded-sm border border-border bg-white px-4 py-3 text-xs text-muted-foreground">
            {t("guestNotice")}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
