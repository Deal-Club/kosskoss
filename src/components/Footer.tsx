import { getLocale, getTranslations } from "next-intl/server";
import { CreditCard, Mail, Phone, ShieldCheck, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { PaymentMethodsBar } from "@/components/PaymentMethodsBar";
import { COMPANY, isLegalLocale } from "@/content/legal";

const TEL_HREF = `tel:+${COMPANY.phone.replace(/\D/g, "")}`;
import { getLegalFooterGroups } from "@/server/legalPages";

export async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  // Les libellés sont les titres des pages : renommer une page depuis
  // l'administration renomme aussi son lien ici.
  const footerGroups = await getLegalFooterGroups(isLegalLocale(locale) ? locale : "fr");

  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="mx-auto max-w-screen-xl px-3 py-8">
        <div className="mb-8 grid grid-cols-1 gap-6 border-b border-white/10 pb-8 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">{t("deliveryTitle")}</p>
              <p className="text-xs text-white/60">{t("deliveryDetail")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">{t("warrantyTitle")}</p>
              <p className="text-xs text-white/60">{t("warrantyDetail")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">{t("paymentTitle")}</p>
              <p className="text-xs text-white/60">{t("paymentDetail")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              aria-label={t("homeAriaLabel")}
              className="mb-4 inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <Logo tone="light" />
            </Link>
            <h3 className="mb-3 font-bold">{t("contact")}</h3>
            <p className="mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <Link href="/contact" className="hover:underline">
                {COMPANY.email}
              </Link>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {/* Lien téléphonique : hors routage multilingue */}
              <a href={TEL_HREF} className="messwert hover:underline">
                {COMPANY.phone}
              </a>
            </p>
            <p className="mt-4 text-xs leading-relaxed text-white/55">{t("oeffnung")}</p>
          </div>

          {/* Colonnes issues du contenu légal : libellés et pages restent
              toujours synchronisés, dans les deux langues. */}
          {footerGroups.map((group) => (
            <div key={group.id}>
              <h3 className="mb-3 font-bold">{group.title}</h3>
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.slug}>
                    {/* href sans préfixe : Link ajoute lui-même la langue */}
                    <Link href={`/${link.slug}`} className="hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Liste figée : le pied de page annonce toujours virement, carte et
            PayPal, même si l'un d'eux est désactivé dans /admin/payments. */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <PaymentMethodsBar source="vitrine" />
        </div>

        <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-white/60">
          {/* Année passée en chaîne : sinon ICU l'afficherait comme « 2.026 » */}
          <p>{t("copyright", { year: String(new Date().getFullYear()) })}</p>
        </div>
      </div>
    </footer>
  );
}
