import { getTranslations } from "next-intl/server";
import {
  Banknote,
  CreditCard,
  FileText,
  Gift,
  Landmark,
  ShieldCheck,
  Smartphone,
  Truck,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { listEnabledPaymentMethods } from "@/server/payments";
import { brandMarksFor } from "@/components/PaymentIcons";
import type { PaymentMethodRecord } from "@/server/types";

// Correspondance explicite entre les noms lucide stockés en base et les
// composants importés : pas d'import dynamique, tout est dans le bundle serveur.
// Ces pictogrammes ne servent plus que de repli pour un moyen de paiement créé
// à la main dont la clé n'est pas reconnue par `brandMarksFor`.
const ICONS: Record<string, LucideIcon> = {
  "credit-card": CreditCard,
  wallet: Wallet,
  "file-text": FileText,
  banknote: Banknote,
  zap: Zap,
  landmark: Landmark,
  smartphone: Smartphone,
  "shield-check": ShieldCheck,
  truck: Truck,
  gift: Gift,
};

/**
 * Les moyens de paiement viennent du back-office et n'ont pas de champ traduit.
 * Seule la mention de gratuité, saisie de façon standardisée, est transposée.
 */
function feeLabelFor(feeLabel: string, freeLabel: string): string {
  const normalized = feeLabel.trim().toLowerCase();
  return normalized === "gratuit" || normalized === "kostenlos" ? freeLabel : feeLabel;
}

/**
 * Liste figée du pied de page : elle annonce toujours ces trois moyens, quels
 * que soient les moyens activés dans le back-office. Les clés sont celles que
 * `brandMarksFor` reconnaît, pour obtenir les mêmes logos que la liste pilotée
 * en base : rien pour le virement, les trois cartes, le logotype PayPal.
 */
const VITRINE = [
  { key: "banque", libelle: "vitrine.virement", icon: "landmark" },
  { key: "carte-bancaire", libelle: "vitrine.carte", icon: "credit-card" },
  { key: "paypal", libelle: "vitrine.paypal", icon: "wallet" },
] as const;

interface PaymentMethodsBarProps {
  /**
   * `section` — bandeau autonome avec titre, pour la fiche produit et le pied de page.
   * `inline` — rangée de logos seule, pour le panier, la caisse et le tiroir.
   */
  variant?: "section" | "inline";
  /**
   * `catalogue` — moyens activés dans le back-office, ceux réellement proposés
   *   à la caisse.
   * `vitrine` — liste figée, indépendante du back-office.
   */
  source?: "catalogue" | "vitrine";
  className?: string;
}

export async function PaymentMethodsBar({
  variant = "section",
  source = "catalogue",
  className,
}: PaymentMethodsBarProps = {}) {
  const t = await getTranslations("payment");
  const methods: PaymentMethodRecord[] =
    source === "vitrine"
      ? VITRINE.map((entree, index) => ({
          id: entree.key,
          key: entree.key,
          label: t(entree.libelle),
          description: "",
          icon: entree.icon,
          feeLabel: "",
          enabled: true,
          position: index,
        }))
      : await listEnabledPaymentMethods();
  if (methods.length === 0) return null;

  const freeLabel = t("free");

  if (variant === "inline") {
    return (
      <div className={className}>
        <p className="mb-2 text-[11px] font-black tracking-widest text-muted-foreground uppercase">
          {t("acceptedTitle")}
        </p>
        <ul className="flex flex-wrap items-center gap-1.5">
          {methods.map((method) => {
            const marks = brandMarksFor(method.key, method.icon);
            const Icon = ICONS[method.icon] ?? CreditCard;

            if (!marks) {
              return (
                <li
                  key={method.id}
                  title={method.description || method.label}
                  className="flex h-8 items-center gap-1.5 rounded-sm border border-border bg-white px-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-[11px] font-bold text-foreground">{method.label}</span>
                </li>
              );
            }

            return marks.map((Mark, index) => (
              <li key={`${method.id}-${index}`} title={method.description || method.label}>
                <Mark />
              </li>
            ));
          })}
        </ul>
      </div>
    );
  }

  return (
    <section className={className ?? "border-t border-border bg-muted"}>
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center gap-x-4 gap-y-3 px-3 py-4">
        <span className="text-xs font-black tracking-wide text-foreground uppercase">
          {t("title")}
        </span>
        <ul className="flex flex-wrap items-center gap-2">
          {methods.map((method) => {
            const marks = brandMarksFor(method.key, method.icon);
            const Icon = ICONS[method.icon] ?? CreditCard;
            const fee = method.feeLabel ? feeLabelFor(method.feeLabel, freeLabel) : "";

            if (!marks) {
              return (
                <li
                  key={method.id}
                  title={method.description || method.label}
                  className="flex items-center gap-2 rounded-sm border border-border bg-white px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-xs font-bold text-foreground">{method.label}</span>
                  {fee && <span className="text-[11px] text-muted-foreground">{fee}</span>}
                </li>
              );
            }

            return (
              <li
                key={method.id}
                title={method.description || method.label}
                className="flex items-center gap-2 rounded-sm border border-border bg-white py-1.5 pr-3 pl-1.5"
              >
                <span className="flex items-center gap-1">
                  {marks.map((Mark, index) => (
                    <Mark key={index} />
                  ))}
                </span>
                <span className="text-xs font-bold text-foreground">{method.label}</span>
                {fee && <span className="text-[11px] text-muted-foreground">{fee}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
