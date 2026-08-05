"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Banknote,
  Check,
  CreditCard,
  FileText,
  Gift,
  Landmark,
  Lock,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { AddressFieldset, EMPTY_ADDRESS } from "@/components/checkout/AddressFieldset";
import type { AddressValue } from "@/components/checkout/AddressFieldset";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { ShippingMethodFieldset } from "@/components/checkout/ShippingMethodFieldset";
import { computeTotals, DEFAULT_SHIPPING_METHOD_KEY, formatCents } from "@/lib/cart";
import type { ShippingMethodKey } from "@/lib/cart";
import { brandMarksFor } from "@/components/PaymentIcons";
import type { PaymentMethodRecord } from "@/server/types";

// Tunnel de commande conforme au droit français de la vente à distance.
//
// La dernière étape rassemble, juste au-dessus du bouton, tout ce que
// § 312j Abs. 2 BGB (renvoyant à l'art. 246a § 1 al. 1 phr. 1 nos 1, 5 à 7
// EGBGB) exige : caractéristiques essentielles des articles, prix total TTC,
// frais de livraison et délai. Le bouton lui-même porte la mention imposée par
// § 312j Abs. 3 BGB, sans aucun autre mot.

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

const STEPS = ["contact", "payment", "review"] as const;
type Step = (typeof STEPS)[number];

const INPUT =
  "w-full rounded-sm border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary";
const LABEL = "mb-1 block text-sm font-semibold text-foreground";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CheckoutError {
  code: string;
  values?: Record<string, string | number>;
}

function validateAddress(address: AddressValue): CheckoutError | undefined {
  if (address.firstName.trim().length < 2 || address.lastName.trim().length < 2) {
    return { code: "invalid_name" };
  }
  if (address.street.trim().length < 4) return { code: "invalid_street" };
  if (!/^\d{5}$/.test(address.postalCode.trim())) return { code: "invalid_postal_code" };
  if (address.city.trim().length < 2) return { code: "invalid_city" };
  return undefined;
}

/**
 * Coordonnées pré-remplies quand un client est connecté.
 * Toujours facultatif : sans compte, le tunnel se comporte exactement comme
 * avant. Ces valeurs ne servent qu'au confort de saisie — le rattachement de la
 * commande au compte se décide côté serveur, à partir du cookie de session.
 */
export interface CheckoutCustomer {
  email: string;
  phone: string;
  billing: AddressValue;
  shippingSameAsBilling: boolean;
  shipping: AddressValue;
}

export function CheckoutFlow({
  methods,
  customer,
}: {
  methods: PaymentMethodRecord[];
  customer?: CheckoutCustomer | null;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const { lines, campaign, ready, clear } = useCart();

  const [step, setStep] = useState<Step>("contact");
  const [shippingMethodKey, setShippingMethodKey] = useState<ShippingMethodKey>(
    DEFAULT_SHIPPING_METHOD_KEY,
  );
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [billing, setBilling] = useState<AddressValue>(customer?.billing ?? EMPTY_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = useState(customer?.shippingSameAsBilling ?? true);
  const [shipping, setShipping] = useState<AddressValue>(customer?.shipping ?? EMPTY_ADDRESS);
  const [note, setNote] = useState("");
  const [paymentKey, setPaymentKey] = useState(methods[0]?.key ?? "");
  const [terms, setTerms] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const selectedMethod = methods.find((method) => method.key === paymentKey);

  // Totaux recalculés ici plutôt que repris du panier : seul le tunnel connaît
  // le mode de livraison retenu. Le récapitulatif de droite suit donc le clic du
  // client immédiatement, sans aller-retour serveur. Le serveur refera le même
  // calcul à la commande — c'est lui qui facture.
  const totals = computeTotals(lines, {
    shippingMethodKey,
    freeShipping: campaign.freeShipping,
  });

  function errorMessage(current: CheckoutError): string {
    // Les codes viennent aussi bien de la validation locale que du serveur ;
    // la traduction est la même dans les deux cas.
    return t(`errors.${current.code}` as "errors.order_failed", current.values);
  }

  function goToPayment() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError({ code: "invalid_email" });
      return;
    }
    // Le téléphone est exigé, comme côté serveur. Sans ce test, un champ laissé
    // vide passait l'étape et n'était refusé qu'à l'envoi de la commande, deux
    // écrans plus loin.
    if (!/^[+0-9\s()/.-]{6,40}$/.test(phone.trim())) {
      setError({ code: "invalid_phone" });
      return;
    }
    const billingError = validateAddress(billing);
    if (billingError) {
      setError(billingError);
      return;
    }
    if (!sameAsBilling) {
      const shippingError = validateAddress(shipping);
      if (shippingError) {
        setError(shippingError);
        return;
      }
    }
    setError(null);
    setStep("payment");
  }

  function goToReview() {
    if (!paymentKey) {
      setError({ code: "invalid_payment_method" });
      return;
    }
    setError(null);
    setStep("review");
  }

  async function submit() {
    if (!terms) {
      setError({ code: "terms_required" });
      return;
    }
    if (!withdrawal) {
      setError({ code: "withdrawal_required" });
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          email: email.trim(),
          phone: phone.trim(),
          billing,
          shippingSameAsBilling: sameAsBilling,
          shipping: sameAsBilling ? billing : shipping,
          paymentMethodKey: paymentKey,
          shippingMethodKey,
          customerNote: note.trim(),
          termsAccepted: true,
          withdrawalAcknowledged: true,
          items: lines.map((line) => ({
            productId: line.productId,
            ...(line.variantId !== undefined ? { variantId: line.variantId } : {}),
            quantity: line.quantity,
          })),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        code?: string;
        confirmationPath?: string;
        redirectUrl?: string;
        detail?: { name: string; available: number };
      } | null;

      if (!response.ok || !data?.confirmationPath) {
        setPending(false);
        setError({
          code: data?.code ?? "order_failed",
          values: data?.detail
            ? { name: data.detail.name, available: data.detail.available }
            : undefined,
        });
        return;
      }

      // On garde l'écran de commande le temps de la redirection : vider le
      // panier tout de suite ferait clignoter l'état « panier vide ».
      setDone(true);
      clear();

      // Paiement en ligne : le serveur a ouvert une session chez le prestataire
      // et renvoie une URL externe. On quitte le site vers cette page de
      // paiement (window.location, et non le routeur i18n qui préfixe les URL
      // internes). Sinon, parcours habituel vers la confirmation.
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      router.push(data.confirmationPath);
    } catch {
      setPending(false);
      setError({ code: "network" });
    }
  }

  if (done) {
    return (
      <p role="status" className="rounded-sm border border-border bg-white px-4 py-10 text-center text-sm font-semibold text-foreground">
        {t("submitting")}
      </p>
    );
  }

  if (!ready) {
    return (
      <p className="rounded-sm border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
        {t("submitting")}
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-white px-6 py-14 text-center">
        <ShoppingCart className="mx-auto mb-4 h-10 w-10 text-border" aria-hidden />
        <h2 className="text-xl font-black text-foreground">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("emptyText")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {/* Fil des étapes : le client voit où il en est et peut revenir en arrière. */}
        <ol className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((entry, index) => {
            const reached = index <= stepIndex;
            return (
              <li key={entry}>
                <button
                  type="button"
                  disabled={index > stepIndex}
                  onClick={() => setStep(entry)}
                  aria-current={entry === step ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-bold ${
                    entry === step
                      ? "border-primary bg-primary text-primary-foreground"
                      : reached
                        ? "border-border bg-white text-foreground hover:border-primary"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      entry === step ? "bg-white/25" : "bg-muted"
                    }`}
                  >
                    {index < stepIndex ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
                  </span>
                  {t(`steps.${entry}`)}
                </button>
              </li>
            );
          })}
        </ol>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-sm border border-destructive bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"
          >
            {errorMessage(error)}
          </p>
        )}

        {step === "contact" && (
          <div className="space-y-4">
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-1 text-lg font-black text-foreground">{t("contactTitle")}</h2>
              <p className="mb-4 text-sm text-muted-foreground">{t("contactHint")}</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="checkout-email">
                    {t("email")} <span aria-hidden>*</span>
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={160}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="checkout-phone">
                    {t("phone")} <span aria-hidden>*</span>
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    maxLength={40}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    aria-describedby="checkout-phone-hint"
                    className={INPUT}
                  />
                  <p id="checkout-phone-hint" className="mt-1 text-xs text-muted-foreground">
                    {t("phoneHint")}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-4 text-lg font-black text-foreground">{t("billingTitle")}</h2>
              <AddressFieldset idPrefix="billing" value={billing} onChange={setBilling} />

              <label className="mt-5 flex items-start gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(event) => setSameAsBilling(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                {t("sameAsBilling")}
              </label>
            </section>

            {!sameAsBilling && (
              <section className="rounded-sm border border-border bg-white p-5">
                <h2 className="mb-4 text-lg font-black text-foreground">{t("shippingTitle")}</h2>
                <AddressFieldset idPrefix="shipping" value={shipping} onChange={setShipping} />
              </section>
            )}

            {/* Mode de livraison choisi avant le paiement : le récapitulatif de
                droite, et donc le total, se mettent à jour immédiatement. */}
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-4 text-lg font-black text-foreground">{t("shippingMethodTitle")}</h2>
              <ShippingMethodFieldset value={shippingMethodKey} onChange={setShippingMethodKey} />
            </section>

            <section className="rounded-sm border border-border bg-white p-5">
              <label className={LABEL} htmlFor="checkout-note">
                {t("noteTitle")}
              </label>
              <textarea
                id="checkout-note"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("notePlaceholder")}
                className={INPUT}
              />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/panier" className="text-sm font-semibold text-primary hover:underline">
                {t("backToCart")}
              </Link>
              <button
                type="button"
                onClick={goToPayment}
                className="rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-4">
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-4 text-lg font-black text-foreground">{t("paymentTitle")}</h2>

              {methods.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("paymentNone")}</p>
              ) : (
                <ul className="space-y-2">
                  {methods.map((method) => {
                    const Icon = ICONS[method.icon] ?? CreditCard;
                    const marks = brandMarksFor(method.key, method.icon);
                    const active = method.key === paymentKey;
                    return (
                      <li key={method.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors ${
                            active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.key}
                            checked={active}
                            onChange={() => setPaymentKey(method.key)}
                            className="mt-1 h-4 w-4 accent-primary"
                          />
                          {marks ? (
                            <span className="mt-0.5 flex shrink-0 items-center gap-1">
                              {marks.map((Mark, index) => (
                                <Mark key={index} />
                              ))}
                            </span>
                          ) : (
                            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-foreground">
                              {method.label}
                            </span>
                            {method.description && (
                              <span className="block text-xs text-muted-foreground">
                                {method.description}
                              </span>
                            )}
                          </span>
                          {method.feeLabel && (
                            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                              {method.feeLabel}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep("contact")}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t("back")}
              </button>
              <button
                type="button"
                disabled={methods.length === 0}
                onClick={goToReview}
                className="rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <section className="rounded-sm border border-border bg-white p-5">
              <h2 className="mb-1 text-lg font-black text-foreground">{t("reviewTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("reviewIntro")}</p>
            </section>

            {/* Récapitulatif des données saisies, chacune modifiable en un clic. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReviewCard title={t("reviewContact")} onEdit={() => setStep("contact")} editLabel={t("edit")}>
                <p>{email}</p>
                {phone && <p>{phone}</p>}
              </ReviewCard>

              <ReviewCard title={t("reviewPayment")} onEdit={() => setStep("payment")} editLabel={t("edit")}>
                <p className="font-semibold text-foreground">{selectedMethod?.label}</p>
                {selectedMethod?.description && <p>{selectedMethod.description}</p>}
              </ReviewCard>

              <ReviewCard title={t("reviewBilling")} onEdit={() => setStep("contact")} editLabel={t("edit")}>
                <AddressLines address={billing} />
              </ReviewCard>

              <ReviewCard title={t("reviewShipping")} onEdit={() => setStep("contact")} editLabel={t("edit")}>
                <AddressLines address={sameAsBilling ? billing : shipping} />
              </ReviewCard>

              <ReviewCard
                title={t("reviewShippingMethod")}
                onEdit={() => setStep("contact")}
                editLabel={t("edit")}
              >
                <p className="font-semibold text-foreground">
                  {t(`shippingMethods.${shippingMethodKey}.label`)}
                </p>
                <p>{t(`shippingMethods.${shippingMethodKey}.delay`)}</p>
                <p>
                  {totals.shippingCents === 0
                    ? t("shippingFree")
                    : formatCents(totals.shippingCents)}
                </p>
              </ReviewCard>
            </div>

            {note && (
              <section className="rounded-sm border border-border bg-white p-5">
                <h3 className="mb-1 text-sm font-black text-foreground">{t("reviewNote")}</h3>
                <p className="text-sm whitespace-pre-line text-muted-foreground">{note}</p>
              </section>
            )}

            {/* Caractéristiques essentielles des articles — art. 246a § 1 al. 1
                phr. 1 no 1 EGBGB — reprises juste avant le bouton. */}
            <section className="rounded-sm border border-border bg-white p-5">
              <h3 className="mb-3 text-sm font-black text-foreground">{t("reviewItems")}</h3>
              <ul className="divide-y divide-border">
                {lines.map((line) => (
                  <li key={`${line.productId}::${line.variantId ?? ""}`} className="flex items-start justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                        {line.brand}
                      </span>
                      <Link
                        href={line.path}
                        className="block text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {line.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {t("quantityShort", { count: line.quantity })} {formatCents(line.priceCents)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-foreground">
                      {formatCents(line.priceCents * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Consentements exigés avant l'engagement. */}
            <section className="rounded-sm border border-border bg-white p-5">
              <label className="mb-3 flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  {t.rich("termsLabel", {
                    terms: (chunks) => (
                      <Link href="/cgv" className="font-semibold text-primary hover:underline">
                        {chunks}
                      </Link>
                    ),
                    privacy: (chunks) => (
                      <Link href="/confidentialite" className="font-semibold text-primary hover:underline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={withdrawal}
                  onChange={(event) => setWithdrawal(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  {t.rich("withdrawalLabel", {
                    withdrawal: (chunks) => (
                      <Link
                        href="/retractation"
                        className="font-semibold text-primary hover:underline"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </label>
            </section>

            {/* Bouton de commande : § 312j Abs. 3 BGB impose ce libellé et rien
                d'autre sur la surface cliquable. Le rappel du montant total est
                placé en dessous, hors du bouton. */}
            <div className="rounded-sm border border-primary/40 bg-white p-5">
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="w-full rounded-sm bg-primary px-6 py-4 text-base font-black text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                {pending ? t("submitting") : t("submit")}
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span>{t("submitNote", { total: formatCents(totals.totalCents) })}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep("payment")}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("back")}
            </button>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <CheckoutSummary lines={lines} totals={totals} />
      </aside>
    </div>
  );
}

function ReviewCard({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-border bg-white p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-black text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {editLabel}
        </button>
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function AddressLines({ address }: { address: AddressValue }) {
  return (
    <>
      <p className="font-semibold text-foreground">
        {address.firstName} {address.lastName}
      </p>
      {address.company && <p>{address.company}</p>}
      <p>{address.street}</p>
      <p>
        {address.postalCode} {address.city}
      </p>
    </>
  );
}
