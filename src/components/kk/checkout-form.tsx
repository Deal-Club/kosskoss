"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "./localized-link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShieldCheck,
  HelpCircle,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  Lock,
  MessageCircle,
  Tag,
  Pencil,
  ArrowRight,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatFcfa } from "@/lib/kk/format";
import { cartSubtotalFcfa } from "@/lib/kk/cart-totals";
import { normaliserTelephone } from "@/lib/kk/telephone";
import { VILLES_LIVRAISON, estVilleLivraison, fraisLivraisonFcfa } from "@/lib/kk/livraison";
import { mesurerEvenement } from "@/lib/kk/mesureNavigateur";
import { identifiantProduitCatalogue } from "@/lib/kk/mesure";
import type { PaymentMethodView } from "@/server/kk/payments";
import { brandMarksFor } from "@/components/PaymentIcons";
import { BottleMotif } from "./motifs";

// Code d'erreur serveur → clé de message. La table reste hors composant, ce
// ne sont que des chaînes littérales ; c'est `t(...)` qui traduit, appelé au
// moment de l'affichage (voir handleSubmit), jamais ici.
const CLES_ERREUR: Record<string, string> = {
  panier_vide: "errors.cartEmpty",
  champs_invalides: "errors.invalidFields",
  // La route accepte n'importe quel corps JSON : le message nomme le format
  // attendu plutôt que de dire « invalide », pour le cas — rare mais réel —
  // où ce message serveur est ce que le client voit (validation client
  // contournée, JS désactivé…).
  telephone_invalide: "errors.invalidPhone",
  paiement_invalide: "errors.invalidPayment",
  produit_indisponible: "errors.productUnavailable",
  variante_indisponible: "errors.variantUnavailable",
  stock_insuffisant: "errors.insufficientStock",
  json_invalide: "errors.invalidJson",
};

/** Champs de livraison, dans l'ordre où ils sont posés au client. */
type FieldName = "fullName" | "email" | "phone" | "location" | "city" | "cityOther";

/** Type de la fonction de traduction, pour la passer en paramètre à `validate`. */
type Traduire = ReturnType<typeof useTranslations>;

/**
 * Moyens de paiement qui n'ont besoin d'aucune passerelle.
 *
 * Le paiement à la livraison se règle en espèces à la remise du colis : la
 * commande peut donc aller jusqu'au bout dès aujourd'hui. Tous les autres —
 * Orange Money, MTN, carte bancaire — attendent le branchement d'un
 * prestataire de paiement. Tant qu'il n'est pas là, les proposer sans le dire
 * enverrait le client dans une impasse au dernier clic.
 *
 * Il suffira de retirer une clé de cette liste, ou de la vider, au fur et à
 * mesure des passerelles raccordées.
 */
const CLES_HORS_LIGNE = ["paiement-livraison", "paiement-a-la-livraison"];

/**
 * Contrôle d'un champ, côté client uniquement.
 *
 * Le serveur revalide tout : ce qui se joue ici est la conversion, pas la
 * sécurité. Un client qui découvre au clic sur « Commander » que son e-mail
 * est mal saisi remonte quatre champs plus haut et, souvent, abandonne. Le
 * message tombe donc à la sortie du champ, jamais pendant la frappe — corriger
 * quelqu'un qui écrit encore est le meilleur moyen de le braquer.
 *
 * Renvoie `null` quand le champ est bon, sinon la phrase à afficher.
 *
 * Fonction déclarée hors composant : `useTranslations` est un hook et ne
 * peut pas être appelé ici. La fonction de traduction est donc reçue en
 * paramètre plutôt qu'obtenue directement.
 *
 * `city`/`cityOther` n'y passent jamais : leur validation dépend l'une de
 * l'autre (voir `erreurs` dans le composant), ce qu'une fonction à un seul
 * champ ne peut pas exprimer. Le type de `field` l'exclut donc explicitement,
 * plutôt que de laisser un `case` mort ici.
 */
function validate(
  field: Exclude<FieldName, "city" | "cityOther">,
  value: string,
  t: Traduire,
): string | null {
  const v = value.trim();
  switch (field) {
    case "fullName":
      return v.length >= 2 ? null : t("validation.fullName");
    case "email":
      // Volontairement permissif : le rôle de ce test est d'attraper la faute
      // de frappe évidente (« @gmail » sans point), pas de juger de l'existence
      // de l'adresse — ce qu'aucune expression régulière ne sait faire.
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : t("validation.email");
    case "phone":
      // Format camerounais : neuf chiffres, mobile en 6 ou fixe en 2,
      // l'indicatif étant accepté sous toutes ses formes. Le message nomme le
      // format attendu — « numéro invalide » laisserait le client deviner.
      return normaliserTelephone(v) ? null : t("validation.phone");
    case "location":
      return v.length >= 3 ? null : t("validation.location");
  }
}

export function CheckoutForm({
  locale,
  payments,
  passerelleActive,
}: {
  locale: string;
  /** Moyens de paiement activés au back-office, lus en base par la page. */
  payments: PaymentMethodView[];
  /**
   * La passerelle de paiement est-elle configurée côté serveur ?
   *
   * Le navigateur ne peut pas le savoir : les clés vivent dans
   * l'environnement du serveur. La page le lui dit (voir la page /commande).
   */
  passerelleActive: boolean;
}) {
  const t = useTranslations("commande");
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const subtotal = cartSubtotalFcfa(lines);
  const articles = lines.reduce((n, l) => n + l.quantity, 0);

  const [values, setValues] = useState<Record<FieldName, string>>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    city: "",
    cityOther: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [followOrder, setFollowOrder] = useState(true);
  // Un moyen aboutit s'il ne demande aucune passerelle — le paiement à la
  // livraison, encaissé à la remise du colis — ou si la passerelle est
  // réellement configurée côté serveur.
  //
  // Cette seconde branche est nouvelle : le formulaire refusait TOUS les
  // moyens en ligne, une garde écrite quand aucun prestataire n'était raccordé.
  // Elle est restée après le branchement de GeniusPay, et bloquait donc des
  // paiements qui fonctionnaient parfaitement.
  const paiementDisponible = (cle: string) =>
    CLES_HORS_LIGNE.includes(cle) || passerelleActive;

  /**
   * Les deux options présentées, construites à partir des moyens réellement
   * actifs en base.
   *
   * « En ligne » rassemble tout ce qui passera par la passerelle, avec les
   * logos de chaque moyen accolés : le client voit ce qu'il pourra utiliser
   * sans avoir à choisir maintenant. La clé envoyée au serveur reste celle du
   * premier moyen du groupe — provisoire, jusqu'à ce que la passerelle
   * renvoie le moyen réellement employé.
   *
   * Une option dont le groupe est vide n'est pas affichée : si la boutique
   * désactive tous les moyens en ligne au back-office, l'option disparaît
   * plutôt que de proposer un choix sans contenu.
   */
  const OPTIONS_PAIEMENT = useMemo(() => {
    const enLigne = payments.filter((p) => !CLES_HORS_LIGNE.includes(p.key));
    const livraison = payments.filter((p) => CLES_HORS_LIGNE.includes(p.key));

    const options: {
      cle: string;
      titre: string;
      note: string;
      marques: NonNullable<ReturnType<typeof brandMarksFor>>;
      /** Repli visuel quand le moyen n'a aucun logo à montrer. */
      Icone?: LucideIcon;
    }[] = [];

    if (enLigne.length > 0) {
      // Logos de tous les moyens du groupe, sans doublon : la carte bancaire
      // apporte Visa, Mastercard et Amex, qu'on ne veut pas voir deux fois.
      const marques = [...new Set(enLigne.flatMap((p) => brandMarksFor(p.key, "") ?? []))];
      options.push({
        cle: enLigne[0].key,
        titre: t("step2.onlineTitle"),
        note: t("step2.comingSoon"),
        marques,
      });
    }

    for (const p of livraison) {
      options.push({
        cle: p.key,
        titre: p.label,
        note: t("step2.cashNote"),
        // Aucun logo à afficher — ce n'est pas une marque, c'est un geste. La
        // carte se retrouvait donc en texte nu à côté d'une carte illustrée de
        // trois logos, et paraissait la moins sérieuse des deux alors que
        // c'est le seul moyen réellement actif aujourd'hui. Le camion lui rend
        // le même poids visuel.
        marques: [],
        Icone: Truck,
      });
    }

    return options;
  }, [payments, t]);

  const [paymentMethod, setPaymentMethod] = useState(
    // On présélectionne le premier moyen qui fonctionne, pas le premier de la
    // liste : ouvrir la page sur un moyen indisponible est un mauvais départ.
    payments.find((p) => paiementDisponible(p.key))?.key ?? payments[0]?.key ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Code promo. `remise` n'est qu'un affichage : c'est le serveur qui refait le
  // calcul à la commande, à partir du seul code. Un montant bidouillé ici
  // n'aurait donc aucun effet sur ce qui est facturé.
  const [codeSaisi, setCodeSaisi] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; label: string; discountCents: number } | null>(null);
  const [messageCoupon, setMessageCoupon] = useState<string | null>(null);
  const [verifCoupon, setVerifCoupon] = useState(false);
  const [champPromoOuvert, setChampPromoOuvert] = useState(false);

  // Barre d'action basse, sur mobile : elle ne s'affiche que lorsque le vrai
  // bouton est sorti de l'écran. Deux boutons « Commander » visibles en même
  // temps donneraient à croire qu'il y a deux commandes à passer.
  const boutonPrincipal = useRef<HTMLButtonElement | null>(null);
  const [boutonVisible, setBoutonVisible] = useState(true);

  useEffect(() => {
    const cible = boutonPrincipal.current;
    if (!cible) return;
    const observateur = new IntersectionObserver(
      ([entree]) => setBoutonVisible(entree.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" },
    );
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, [ready, lines.length]);

  // `begin_checkout` : une fois par entrée dans le tunnel avec un panier non
  // vide. `ready` distingue le panier réellement lu (localStorage hydraté) du
  // panier vide affiché avant hydratation — sans quoi une visite avec panier
  // enverrait d'abord un événement à zéro article. Le garde par `useRef` évite
  // un second envoi au double montage du Strict Mode.
  const debutTunnelEnvoye = useRef(false);
  useEffect(() => {
    if (!ready || lines.length === 0 || debutTunnelEnvoye.current) return;
    debutTunnelEnvoye.current = true;
    mesurerEvenement({
      type: "begin_checkout",
      // Clé d'événement pour la déduplication navigateur/navigateur (pas de
      // pendant serveur pour `begin_checkout`) : identifie CE panier précis,
      // pas un article — `productId`/`variantId` y restent légitimes.
      reference: lines.map((l) => `${l.productId}:${l.variantId ?? ""}:${l.quantity}`).join("|"),
      // Références PAR ARTICLE, elles, alignées sur le flux Google Merchant
      // (voir `identifiantProduitCatalogue`) — comme aux trois autres points
      // d'émission — pour que Meta/GA4 apparient chaque ligne au bon produit
      // du catalogue plutôt qu'à sa variante ou à son identifiant interne.
      articles: lines.map((l) => ({
        reference: identifiantProduitCatalogue(l.slug, l.productId),
        nom: l.name,
        prixCents: l.priceCents,
        quantite: l.quantity,
      })),
      totalCents: subtotal,
    });
  }, [ready, lines, subtotal]);

  const erreurs = useMemo(
    () => ({
      fullName: validate("fullName", values.fullName, t),
      email: validate("email", values.email, t),
      phone: validate("phone", values.phone, t),
      location: validate("location", values.location, t),
      // Hors de `validate()` : ces deux erreurs dépendent l'une de l'autre
      // (« Autre » n'exige un nom de ville que s'il est choisi), ce que la
      // signature à un seul champ de `validate()` ne porte pas.
      city: estVilleLivraison(values.city) ? null : t("validation.city"),
      cityOther:
        values.city === "autre" && values.cityOther.trim().length < 2
          ? t("validation.cityOther")
          : null,
    }),
    [values, t],
  );
  const formulaireComplet = Object.values(erreurs).every((e) => e === null);
  const remise = coupon?.discountCents ?? 0;
  // Frais de livraison : connu dès qu'une ville valide est choisie, à zéro
  // avant — pas d'estimation affichée avant que le client ait renseigné de
  // quoi la calculer. Recalculé à l'identique côté serveur à la commande
  // (voir le commentaire d'en-tête de `src/lib/kk/livraison.ts`) : ce qui
  // s'affiche ici n'est jamais ce qui fait foi.
  const livraison = estVilleLivraison(values.city) ? fraisLivraisonFcfa(values.city) : 0;
  const total = Math.max(0, subtotal - remise) + livraison;

  // `!submitting` EST INDISPENSABLE, ce n'est pas une précaution décorative.
  // La commande validée, `handleSubmit` vide le panier AVANT de rendre la main
  // au navigateur pour la redirection vers le prestataire. React, lui, re-rend
  // dès que l'état du panier change : sans cette condition, le client voyait
  // l'écran « votre panier est vide » s'afficher une fraction de seconde entre
  // son clic et la page de paiement — au pire moment du tunnel, celui où il
  // confie son argent.
  //
  // `submitting` n'est volontairement jamais relâché sur le chemin de la
  // redirection (voir `handleSubmit`), il couvre donc toute la fenêtre entre le
  // vidage du panier et le départ effectif vers la page du prestataire.
  if (ready && lines.length === 0 && !submitting) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <BottleMotif className="mx-auto h-20 text-deep/30" />
        <h1 className="mt-6 text-deep">{t("emptyCart.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("emptyCart.text")}
        </p>
        <Link
          href="/soins-visage"
          className="kk-fill mt-6 inline-block rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          {t("emptyCart.cta")}
        </Link>
      </div>
    );
  }

  function setField(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
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
        | { ok: false; message: string; error?: string };
      if (data.ok) {
        setCoupon({ code: data.code, label: data.label, discountCents: data.discountCents });
        setMessageCoupon(null);
      } else {
        setCoupon(null);
        // Le motif du refus est traduit ici, dans la langue de la page : le
        // `message` du serveur est en français et ne sert que de repli.
        setMessageCoupon(
          data.error && t.has(`couponErrors.${data.error}`)
            ? t(`couponErrors.${data.error}`)
            : data.message,
        );
      }
    } catch {
      setMessageCoupon(t("errors.couponCheckFailed"));
    } finally {
      setVerifCoupon(false);
    }
  }

  function retirerCode() {
    setCoupon(null);
    setCodeSaisi("");
    setMessageCoupon(null);
    setChampPromoOuvert(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Champ manquant : on marque tout comme visité pour faire apparaître les
    // messages, puis on emmène le client au premier champ fautif. Le bouton,
    // lui, n'est jamais désactivé : un bouton grisé sans explication est la
    // façon la plus sûre de perdre une commande.
    if (!formulaireComplet) {
      setTouched({ fullName: true, email: true, phone: true, location: true, city: true, cityOther: true });
      const premier = (Object.keys(erreurs) as FieldName[]).find((f) => erreurs[f]);
      if (premier) {
        const champ = document.getElementById(`champ-${premier}`);
        champ?.scrollIntoView({ block: "center", behavior: "smooth" });
        champ?.focus({ preventScroll: true });
      }
      return;
    }

    // Moyen non encore raccordé : on arrête ici, avec une phrase qui dit quoi
    // faire, plutôt que de laisser partir une commande qu'on ne pourra pas
    // encaisser.
    if (!paiementDisponible(paymentMethod)) {
      setError(t("errors.paymentUnavailable"));
      document.getElementById("moyens-paiement")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/kk/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          location: values.location,
          city: values.city,
          cityOther: values.city === "autre" ? values.cityOther : undefined,
          followOrder,
          paymentMethod,
          locale,
          couponCode: coupon?.code,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; orderNumber: string; accessToken: string; urlPaiement?: string }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(t(CLES_ERREUR[data.error] ?? "errors.generic"));
        setSubmitting(false);
        return;
      }
      clear();

      // Paiement en ligne ouvert : on sort du site vers la page du prestataire.
      //
      // `window.location.href` et non `router.push` : la destination est un
      // domaine tiers, que le routeur de Next ne sait pas atteindre. Et on ne
      // relâche PAS `submitting` — le formulaire doit rester verrouillé pendant
      // la redirection, sinon un double clic ouvre deux paiements.
      if (data.urlPaiement) {
        window.location.href = data.urlPaiement;
        return;
      }

      // Pas de paiement en ligne : passerelle non configurée, ou moyen choisi
      // qui n'en demande pas (paiement à la livraison). La commande existe, la
      // confirmation prend le relais avec le bouton WhatsApp.
      const prefix = locale === "en" ? "/en" : "";
      router.push(`${prefix}/confirmation/${data.orderNumber}?t=${data.accessToken}`);
    } catch {
      setError(t("errors.network"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
      <FilEtapes />

      <div className="mt-8">
        <h1 className="text-deep">{t("title")}</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <div className="space-y-8">
          {/* ---------------------------------------------- Étape 1 : livraison */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <TitreEtape numero={1} titre={t("step1.title")} />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Champ
                name="fullName"
                label={t("step1.fullNameLabel")}
                icon={User}
                value={values.fullName}
                error={touched.fullName ? erreurs.fullName : null}
                valide={erreurs.fullName === null && values.fullName.length > 0}
                autoComplete="name"
                placeholder={t("step1.fullNamePlaceholder")}
                onChange={(v) => setField("fullName", v)}
                onBlur={() => setTouched((tch) => ({ ...tch, fullName: true }))}
              />
              <Champ
                name="phone"
                label={t("step1.phoneLabel")}
                icon={Phone}
                type="tel"
                value={values.phone}
                error={touched.phone ? erreurs.phone : null}
                valide={erreurs.phone === null && values.phone.length > 0}
                autoComplete="tel"
                placeholder="+237 6XX XX XX XX"
                aide={t("step1.phoneHelp")}
                onChange={(v) => setField("phone", v)}
                onBlur={() => setTouched((tch) => ({ ...tch, phone: true }))}
              />
              <Champ
                name="email"
                label={t("step1.emailLabel")}
                icon={Mail}
                type="email"
                value={values.email}
                error={touched.email ? erreurs.email : null}
                valide={erreurs.email === null && values.email.length > 0}
                autoComplete="email"
                placeholder={t("step1.emailPlaceholder")}
                className="sm:col-span-2"
                aide={t("step1.emailHelp")}
                onChange={(v) => setField("email", v)}
                onBlur={() => setTouched((tch) => ({ ...tch, email: true }))}
              />
              {/* Ville de livraison : détermine le frais de livraison
                  (src/lib/kk/livraison.ts), ajouté au total plus bas. « Autre »
                  ouvre une saisie libre — toutes les villes du Cameroun ne
                  tiennent pas dans une liste de deux. */}
              <div>
                <label htmlFor="champ-city" className="block text-sm font-medium text-foreground">
                  {t("step1.cityLabel")}
                </label>
                <div className="relative mt-1.5">
                  <Truck
                    className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                      touched.city && erreurs.city
                        ? "text-destructive"
                        : erreurs.city === null
                          ? "text-trust"
                          : "text-muted-foreground"
                    }`}
                  />
                  <select
                    id="champ-city"
                    name="city"
                    required
                    value={values.city}
                    aria-invalid={touched.city && erreurs.city ? true : undefined}
                    onChange={(e) => setField("city", e.target.value)}
                    onBlur={() => setTouched((tch) => ({ ...tch, city: true }))}
                    className={`w-full rounded-xl border bg-background py-3 pl-10 pr-10 text-sm text-foreground outline-none transition focus:ring-2 ${
                      touched.city && erreurs.city
                        ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                        : erreurs.city === null
                          ? "border-trust-line focus:border-trust focus:ring-trust/20"
                          : "border-input focus:border-deep focus:ring-deep/15"
                    }`}
                  >
                    <option value="" disabled>
                      {t("step1.cityPlaceholder")}
                    </option>
                    {VILLES_LIVRAISON.map((ville) => (
                      <option key={ville} value={ville}>
                        {t(`step1.cityOption.${ville}`)}
                      </option>
                    ))}
                  </select>
                </div>
                {touched.city && erreurs.city ? (
                  <p role="alert" className="mt-1.5 text-xs text-destructive">
                    {erreurs.city}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">{t("step1.cityHelp")}</p>
                )}
              </div>

              {values.city === "autre" && (
                <Champ
                  name="cityOther"
                  label={t("step1.cityOtherLabel")}
                  icon={MapPin}
                  value={values.cityOther}
                  error={touched.cityOther ? erreurs.cityOther : null}
                  valide={erreurs.cityOther === null && values.cityOther.length > 0}
                  placeholder={t("step1.cityOtherPlaceholder")}
                  onChange={(v) => setField("cityOther", v)}
                  onBlur={() => setTouched((tch) => ({ ...tch, cityOther: true }))}
                />
              )}

              <Champ
                name="location"
                label={t("step1.locationLabel")}
                icon={MapPin}
                value={values.location}
                error={touched.location ? erreurs.location : null}
                valide={erreurs.location === null && values.location.length > 0}
                placeholder={t("step1.locationPlaceholder")}
                className="sm:col-span-2"
                aide={t("step1.locationHelp")}
                onChange={(v) => setField("location", v)}
                onBlur={() => setTouched((tch) => ({ ...tch, location: true }))}
              />
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-xl bg-sand px-4 py-3.5 text-sm">
              <input
                type="checkbox"
                checked={followOrder}
                onChange={(e) => setFollowOrder(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--deep)]"
              />
              <span className="text-foreground">
                {t("step1.followOrder")}
                <span className="group relative ml-1 inline-flex align-middle">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-lg bg-deep px-3 py-2 text-xs text-primary-foreground opacity-0 transition group-hover:opacity-100">
                    {t("step1.followOrderTooltip")}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t("step1.followOrderHint")}
                </span>
              </span>
            </label>
          </section>

          {/* ------------------------------------------------ Étape 2 : paiement */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <TitreEtape numero={2} titre={t("step2.title")} />

            {/* Affichage seul, sans sélection.
                Le choix du moyen de paiement se fait dans la passerelle, après
                la validation de la commande — le proposer ici reviendrait à le
                demander deux fois, et à laisser croire qu'il est arrêté alors
                que la passerelle peut le refuser.
                `ul` et non une rangée de boutons : rien n'est cliquable, donc
                rien ne doit avoir l'apparence d'un contrôle. */}
            <p className="mt-5 text-sm text-foreground">
              {t("step2.chooseLabel")}
            </p>
            {/* Vrais boutons radio, masqués derrière les cartes : on hérite
                du clavier, de la navigation aux flèches entre options et de
                l'annonce « 2 sur 4 » aux lecteurs d'écran — tout ce qu'une
                rangée de <div> cliquables obligerait à reconstruire, moins bien.

                L'état « bientôt disponible » est écrit sur la carte et non
                gardé pour le dernier clic : le client choisit en connaissance
                de cause au lieu d'être arrêté au bout du parcours. */}
            {/* Deux choix, pas quatre.
                Orange Money, MTN et la carte mènent tous au même endroit — la
                passerelle — qui redemandera de toute façon lequel utiliser.
                Les distinguer ici faisait choisir deux fois, et donnait quatre
                options dont trois indisponibles : une liste où l'on ne peut
                rien prendre décourage avant de servir.

                Vrais boutons radio masqués derrière les cartes : on hérite du
                clavier, des flèches entre options et de l'annonce « 1 sur 2 »
                aux lecteurs d'écran. */}
            <div
              id="moyens-paiement"
              role="radiogroup"
              aria-label={t("step2.ariaLabel")}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              {OPTIONS_PAIEMENT.map((option) => {
                const actif = option.cle === paymentMethod;
                return (
                  <label
                    key={option.cle}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition ${
                      actif
                        ? "border-deep bg-sand ring-1 ring-deep"
                        : "border-border bg-background hover:border-deep/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="moyen-paiement"
                      value={option.cle}
                      checked={actif}
                      onChange={() => setPaymentMethod(option.cle)}
                      className="sr-only"
                    />

                    {/* Pastille d'icône pour les moyens sans logo. Elle prend
                        la teinte de sûreté du tunnel quand l'option est
                        retenue, comme les autres validations de cette page. */}
                    {option.Icone && (
                      <span
                        aria-hidden="true"
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                          actif ? "bg-deep text-primary-foreground" : "bg-sand text-deep"
                        }`}
                      >
                        <option.Icone className="h-5 w-5" strokeWidth={1.6} />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-deep">{option.titre}</span>
                      <span className="mt-0.5 block text-[0.72rem] leading-snug text-deep/60">
                        {option.note}
                      </span>
                      {option.marques.length > 0 && (
                        <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {option.marques.map((Marque, i) => (
                            <Marque key={i} />
                          ))}
                        </span>
                      )}
                    </span>

                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        actif ? "border-deep bg-deep" : "border-border"
                      }`}
                    >
                      {actif && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-trust-line bg-trust-soft px-4 py-3.5">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-trust" aria-hidden />
              <p className="text-sm text-foreground">
                <span className="font-semibold text-trust">{t("step2.trustTitle")}</span> {t("step2.trustText")}
              </p>
            </div>
          </section>

          {/* Réassurance — trois faits, pas trois promesses.
              Chacun décrit ce que la boutique fait réellement ; rien n'y est
              annoncé qui ne soit tenu par le tunnel lui-même. */}
          <ul className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Lock, titre: t("reassurance.noCardTitle"), texte: t("reassurance.noCardText") },
              { icon: MessageCircle, titre: t("reassurance.teamTitle"), texte: t("reassurance.teamText") },
              { icon: ShieldCheck, titre: t("reassurance.dataTitle"), texte: t("reassurance.dataText") },
            ].map(({ icon: Icon, titre, texte }) => (
              <li key={titre} className="rounded-xl border border-border bg-card px-4 py-4">
                <Icon className="h-5 w-5 text-trust" aria-hidden />
                <p className="mt-2.5 text-sm font-semibold text-deep">{titre}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{texte}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------------------ Résumé */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">
                {t("summary.title")}
                <span className="ml-2 font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground">
                  {t("summary.itemCount", { count: articles })}
                </span>
              </h2>
              <Link
                href="/panier"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 transition hover:text-deep hover:underline"
              >
                <Pencil className="h-3 w-3" /> {t("summary.edit")}
              </Link>
            </div>

            {/* Les vignettes, et pas seulement des lignes de texte : au moment
                de valider, le client doit reconnaître ce qu'il achète — c'est
                cette reconnaissance qui lève le dernier doute. */}
            <ul className="max-h-[19rem] space-y-3.5 overflow-y-auto px-5 py-5 sm:px-6">
              {lines.map((l) => (
                <li key={`${l.productId}:${l.variantId ?? ""}`} className="flex items-start gap-3">
                  <span className="relative grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]">
                    {l.image ? (
                      <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <BottleMotif className="h-3/5 text-deep/70" />
                    )}
                    <span className="figure absolute -right-1 -top-1 z-10 grid h-5 min-w-5 place-items-center rounded-full bg-deep px-1 text-[0.65rem] font-semibold text-primary-foreground">
                      {l.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {l.brand}
                    </span>
                    <span className="block text-sm leading-snug text-foreground">{l.name}</span>
                    {l.variantLabel && (
                      <span className="block text-xs text-muted-foreground">{l.variantLabel}</span>
                    )}
                  </span>
                  <span className="figure shrink-0 text-sm font-medium text-deep">
                    {formatFcfa(l.priceCents * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Code promo. Replié par défaut et placé juste au-dessus du total :
                c'est là que le client regarde ce qu'il va payer, donc là qu'il
                pense à son code. Un champ ouvert en permanence fait l'effet
                inverse — il envoie chercher ailleurs un code qu'on n'a pas. */}
            <div className="border-t border-border px-5 py-4 sm:px-6">
              {coupon ? (
                <div className="kk-rise flex items-center justify-between gap-3 rounded-xl border border-trust-line bg-trust-soft px-3.5 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-trust" aria-hidden />
                    <span className="min-w-0">
                      <span className="font-semibold text-trust">{coupon.code}</span>
                      <span className="ml-1.5 text-muted-foreground">{coupon.label}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={retirerCode}
                    className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-4 transition hover:text-deep"
                  >
                    {t("summary.couponRemove")}
                  </button>
                </div>
              ) : champPromoOuvert ? (
                <>
                  {/* `div` et non `form` : ce bloc vit dans le formulaire de
                      commande, et un formulaire imbriqué est invalide en HTML —
                      le navigateur le déplacerait, cassant la soumission. */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="code-promo" className="sr-only">
                      {t("summary.couponLabel")}
                    </label>
                    <input
                      id="code-promo"
                      autoFocus
                      value={codeSaisi}
                      onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") verifierCode(e);
                      }}
                      placeholder={t("summary.couponPlaceholder")}
                      autoComplete="off"
                      maxLength={32}
                      className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm uppercase tracking-wider outline-none transition focus:border-deep"
                    />
                    <button
                      type="button"
                      onClick={verifierCode}
                      disabled={verifCoupon || !codeSaisi.trim()}
                      className="shrink-0 rounded-xl border border-deep px-4 py-2.5 text-sm font-semibold text-deep transition hover:bg-sand disabled:opacity-40"
                    >
                      {verifCoupon ? t("summary.couponApplying") : t("summary.couponApply")}
                    </button>
                  </div>
                  {messageCoupon && (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {messageCoupon}
                    </p>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setChampPromoOuvert(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition hover:text-deep hover:underline"
                >
                  <Tag className="h-3.5 w-3.5" /> {t("summary.couponAdd")}
                </button>
              )}
            </div>

            <div className="border-t border-border px-5 py-5 sm:px-6">
              {/* Sous-total et livraison, toujours détaillés : depuis que la
                  livraison a un prix propre (choisi par la ville), le total
                  seul ne dit plus de quoi il est fait. La remise ne s'ajoute
                  que si un code est appliqué. */}
              <div className="mb-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("summary.subtotal")}</span>
                  <span className="figure text-muted-foreground">{formatFcfa(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("summary.shipping")}</span>
                  <span className="figure text-muted-foreground">
                    {estVilleLivraison(values.city) ? formatFcfa(livraison) : t("summary.shippingPending")}
                  </span>
                </div>
                {coupon && (
                  <div className="flex items-center justify-between font-medium text-trust">
                    <span>{t("summary.youSave")}</span>
                    <span className="figure">−{formatFcfa(remise)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-deep">{t("summary.totalToPay")}</span>
                <span className="figure text-2xl font-semibold text-deep">{formatFcfa(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("summary.deliveryNote")}
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              <button
                ref={boutonPrincipal}
                type="submit"
                disabled={submitting}
                className="kk-fill mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-deep px-6 py-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("summary.submitting")}
                  </>
                ) : (
                  <>
                    {t("summary.submit")} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* La preuve de sûreté, à l'endroit exact de l'hésitation : sous
                  le bouton, en vert, assez grande pour être lue. Elle valait
                  une ligne grise de 12 px — autant dire rien. */}
              <p className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-trust-line bg-trust-soft px-4 py-3 text-sm font-semibold text-trust">
                <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden /> {t("summary.securePayment")}
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t.rich("summary.termsNote", {
                  cgv: (chunks) => (
                    <Link href="/cgv" className="underline underline-offset-2 hover:text-deep">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Barre d'action basse — mobile seulement.
          Sur téléphone, le résumé et son bouton passent sous les deux sections
          du formulaire : le client remplit ses champs et ne voit plus rien à
          valider. Cette barre garde le montant et l'action à portée de pouce
          tant que le vrai bouton n'est pas à l'écran. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md transition-transform duration-300 lg:hidden ${
          boutonVisible ? "translate-y-full" : "translate-y-0"
        }`}
        aria-hidden={boutonVisible}
      >
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <span className="min-w-0">
            <span className="block text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              {t("summary.mobileTotal")}
            </span>
            <span className="figure block text-lg font-semibold leading-tight text-deep">
              {formatFcfa(total)}
            </span>
          </span>
          <button
            type="submit"
            disabled={submitting || boutonVisible}
            tabIndex={boutonVisible ? -1 : 0}
            className="kk-fill flex flex-1 items-center justify-center gap-2 rounded-full bg-deep px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {submitting ? t("summary.submitting") : t("summary.submit")}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Fil des étapes du tunnel.
 *
 * La numérotation est ici légitime : ce sont trois moments qui se suivent
 * réellement, et le client a besoin de savoir combien il en reste. C'est la
 * réponse à la question qui fait fermer un tunnel — « ça va durer combien de
 * temps ? ».
 */
function FilEtapes() {
  // Composant à part entière (nom en majuscule, rendu JSX) : contrairement à
  // `validate`, il peut appeler ce hook directement.
  const t = useTranslations("commande");
  const etapes: { label: string; href?: string; etat: "fait" | "encours" | "avenir" }[] = [
    { label: t("steps.cart"), href: "/panier", etat: "fait" },
    { label: t("steps.info"), etat: "encours" },
    { label: t("steps.confirmation"), etat: "avenir" },
  ];

  return (
    <nav aria-label={t("steps.aria")}>
      <ol className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
        {etapes.map((etape, i) => {
          const pastille =
            etape.etat === "fait"
              ? "border-trust bg-trust text-background"
              : etape.etat === "encours"
                ? "border-deep bg-deep text-primary-foreground"
                : "border-border bg-background text-muted-foreground";
          const contenu = (
            <span className="flex items-center gap-2">
              <span
                className={`figure grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.7rem] font-semibold ${pastille}`}
              >
                {etape.etat === "fait" ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span
                className={
                  etape.etat === "encours"
                    ? "font-semibold text-deep"
                    : etape.etat === "fait"
                      ? "text-foreground"
                      : "text-muted-foreground"
                }
              >
                {etape.label}
              </span>
            </span>
          );
          return (
            <li key={etape.label} className="flex items-center gap-2 sm:gap-3">
              {etape.href ? (
                <Link href={etape.href} className="transition hover:opacity-70">
                  {contenu}
                </Link>
              ) : (
                <span aria-current={etape.etat === "encours" ? "step" : undefined}>{contenu}</span>
              )}
              {i < etapes.length - 1 && (
                <span className="h-px w-4 bg-border sm:w-8" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Titre d'étape : le numéro appartient à la séquence, pas à la décoration. */
function TitreEtape({ numero, titre }: { numero: number; titre: string }) {
  return (
    <h2 className="flex items-center gap-3">
      <span className="figure grid h-7 w-7 shrink-0 place-items-center rounded-full bg-deep text-xs font-semibold text-primary-foreground">
        {numero}
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-deep">{titre}</span>
    </h2>
  );
}

/**
 * Champ de saisie du tunnel.
 *
 * Trois états visibles : neutre, validé (coche verte), fautif (filet rouge et
 * phrase). La coche n'est pas un ornement — sur un formulaire de commande, elle
 * dit « celui-là est réglé, passez au suivant », et c'est ce qui donne le
 * sentiment d'avancer.
 */
function Champ({
  name,
  label,
  icon: Icon,
  value,
  error,
  valide,
  type = "text",
  placeholder,
  autoComplete,
  aide,
  className = "",
  onChange,
  onBlur,
}: {
  name: FieldName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  error: string | null;
  valide: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  aide?: string;
  className?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const id = `champ-${name}`;
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = error ? `${id}-erreur` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon
          className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
            error ? "text-destructive" : valide ? "text-trust" : "text-muted-foreground"
          }`}
        />
        <input
          id={id}
          name={name}
          type={type}
          required
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={[idErreur, idAide].filter(Boolean).join(" ") || undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`w-full rounded-xl border bg-background py-3 pl-10 pr-10 text-sm text-foreground outline-none transition focus:ring-2 ${
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : valide
                ? "border-trust-line focus:border-trust focus:ring-trust/20"
                : "border-input focus:border-deep focus:ring-deep/15"
          }`}
        />
        {valide && !error && (
          <Check className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-trust" aria-hidden />
        )}
      </div>
      {error ? (
        <p id={idErreur} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : aide ? (
        <p id={idAide} className="mt-1.5 text-xs text-muted-foreground">
          {aide}
        </p>
      ) : null}
    </div>
  );
}
