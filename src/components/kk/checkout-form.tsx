"use client";

import { useState } from "react";
import { LocalizedLink as Link } from "./localized-link";
import { useRouter } from "next/navigation";
import { ShieldCheck, HelpCircle, Loader2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import { cartSubtotalFcfa } from "@/lib/kk/cart-totals";
import type { PaymentMethodView } from "@/server/kk/payments";

const ERRORS: Record<string, string> = {
  panier_vide: "Votre panier est vide.",
  champs_invalides: "Merci de vérifier les champs du formulaire.",
  paiement_invalide: "Sélectionnez un moyen de paiement.",
  produit_indisponible: "Un produit de votre panier n'est plus disponible.",
  variante_indisponible: "Une variante sélectionnée n'est plus disponible.",
  stock_insuffisant: "Stock insuffisant pour un produit de votre panier.",
  json_invalide: "Une erreur est survenue. Réessayez.",
};

export function CheckoutForm({
  locale,
  payments,
}: {
  locale: string;
  /** Moyens de paiement activés au back-office, lus en base par la page. */
  payments: PaymentMethodView[];
}) {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const subtotal = cartSubtotalFcfa(lines);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [followOrder, setFollowOrder] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(payments[0]?.key ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Code promo. `remise` n'est qu'un affichage : c'est le serveur qui refait le
  // calcul à la commande, à partir du seul code. Un montant bidouillé ici
  // n'aurait donc aucun effet sur ce qui est facturé.
  const [codeSaisi, setCodeSaisi] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; label: string; discountCents: number } | null>(null);
  const [messageCoupon, setMessageCoupon] = useState<string | null>(null);
  const [verifCoupon, setVerifCoupon] = useState(false);

  const selectedPayment = payments.find((entry) => entry.key === paymentMethod);

  if (ready && lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-deep">Votre panier est vide</h1>
        <Link href="/soins-visage" className="kk-fill mt-6 inline-block rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground">
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  async function verifierCode(e: React.FormEvent) {
    e.preventDefault();
    const code = codeSaisi.trim();
    if (!code) return;
    setVerifCoupon(true);
    setMessageCoupon(null);
    try {
      const res = await fetch("/api/kk/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      const data = (await res.json()) as
        | { ok: true; code: string; label: string; discountCents: number }
        | { ok: false; message: string };
      if (data.ok) {
        setCoupon({ code: data.code, label: data.label, discountCents: data.discountCents });
        setMessageCoupon(null);
      } else {
        setCoupon(null);
        setMessageCoupon(data.message);
      }
    } catch {
      setMessageCoupon("Impossible de vérifier le code pour l'instant.");
    } finally {
      setVerifCoupon(false);
    }
  }

  function retirerCode() {
    setCoupon(null);
    setCodeSaisi("");
    setMessageCoupon(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/kk/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
          fullName,
          email,
          phone,
          location,
          followOrder,
          paymentMethod,
          locale,
          couponCode: coupon?.code,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; orderNumber: string; accessToken: string }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(ERRORS[data.error] ?? "Une erreur est survenue.");
        setSubmitting(false);
        return;
      }
      clear();
      const prefix = locale === "en" ? "/en" : "";
      router.push(`${prefix}/confirmation/${data.orderNumber}?t=${data.accessToken}`);
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-deep";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-deep">Finaliser la commande</h1>
      <p className="mt-2 text-muted-foreground">
        Renseignez vos informations pour recevoir vos produits KossKoss Select.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10">
          {/* Informations de livraison */}
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-deep">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-deep text-xs text-primary-foreground">1</span>
              Informations de livraison
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="block text-sm">
                <span className="font-medium text-foreground">Nom complet</span>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} autoComplete="name" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">E-mail</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" placeholder="exemple@email.com" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">Téléphone</span>
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} autoComplete="tel" placeholder="+237 6XX XX XX XX" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">Lieu de livraison</span>
                <input required value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Quartier, ville, repère…" />
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={followOrder} onChange={(e) => setFollowOrder(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--deep)]" />
                <span className="text-foreground">
                  Je veux suivre ma commande
                  <span className="group relative ml-1 inline-flex align-middle">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-lg bg-deep px-3 py-2 text-xs text-primary-foreground opacity-0 transition group-hover:opacity-100">
                      En cochant, un espace personnel est créé avec l&rsquo;e-mail saisi ; vous recevrez vos identifiants par e-mail pour suivre l&rsquo;avancement.
                    </span>
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* Mode de paiement */}
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-deep">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-deep text-xs text-primary-foreground">2</span>
              Mode de paiement
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {payments.map((p) => {
                const active = p.key === paymentMethod;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPaymentMethod(p.key)}
                    aria-pressed={active}
                    className={`rounded-xl border px-4 py-4 text-left transition ${active ? "border-deep bg-sand" : "border-border bg-card hover:border-deep/40"}`}
                  >
                    <span className="block text-xs font-semibold text-muted-foreground">
                      {p.badge}
                    </span>
                    <span className="mt-1 block text-sm font-medium text-deep">{p.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Le descriptif vient du back-office : c'est là qu'on explique au
                client comment se règle le moyen qu'il vient de choisir. */}
            {selectedPayment?.description && (
              <p className="mt-3 text-xs text-muted-foreground">{selectedPayment.description}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Votre commande est enregistrée, puis confirmée avec vous sur WhatsApp pour le
              paiement et la livraison.
            </p>
          </section>
        </div>

        {/* Résumé */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">
              Résumé de la commande
            </h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId ?? ""}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-foreground">
                    {l.name}
                    {l.variantLabel ? ` · ${l.variantLabel}` : ""}
                    <span className="text-muted-foreground"> × {l.quantity}</span>
                  </span>
                  <span className="figure shrink-0 text-deep">{formatFcfa(l.priceCents * l.quantity)}</span>
                </li>
              ))}
            </ul>
            {/* Code promo. Placé juste au-dessus du total : c'est là que le
                client regarde ce qu'il va payer, donc là qu'il pense à son
                code. Le mettre en tête du tunnel inviterait tout le monde à
                partir en chercher un ailleurs avant de commander. */}
            <div className="mt-5 border-t border-border pt-4">
              {coupon ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-sand px-4 py-3">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-deep">{coupon.code}</span>
                    <span className="ml-2 text-muted-foreground">{coupon.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={retirerCode}
                    className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-4 transition hover:text-deep"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <>
                  {/* `div` et non `form` : ce bloc vit dans le formulaire de
                      commande, et un formulaire imbriqué est invalide en HTML —
                      le navigateur le déplacerait, cassant la soumission. */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="code-promo" className="sr-only">
                      Code promo
                    </label>
                    <input
                      id="code-promo"
                      value={codeSaisi}
                      onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") verifierCode(e);
                      }}
                      placeholder="Code promo"
                      autoComplete="off"
                      maxLength={32}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm uppercase tracking-wider outline-none transition focus:border-deep"
                    />
                    <button
                      type="button"
                      onClick={verifierCode}
                      disabled={verifCoupon || !codeSaisi.trim()}
                      className="shrink-0 rounded-xl border border-deep px-4 py-2.5 text-sm font-semibold text-deep transition hover:bg-sand disabled:opacity-40"
                    >
                      {verifCoupon ? "…" : "Appliquer"}
                    </button>
                  </div>
                  {messageCoupon && (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {messageCoupon}
                    </p>
                  )}
                </>
              )}
            </div>

            {coupon && (
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="figure text-muted-foreground">{formatFcfa(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Remise {coupon.label}</span>
                  <span className="figure text-deep">−{formatFcfa(coupon.discountCents)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold text-deep">Total à payer</span>
              <span className="figure text-xl font-semibold text-deep">
                {formatFcfa(Math.max(0, subtotal - (coupon?.discountCents ?? 0)))}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Livraison coordonnée via WhatsApp après commande.
            </p>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="kk-fill mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-deep px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Enregistrement…" : "Procéder au paiement"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Paiement sécurisé au Cameroun
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
