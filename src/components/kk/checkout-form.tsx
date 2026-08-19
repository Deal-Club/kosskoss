"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { PaymentMethodView } from "@/server/kk/payments";
import { brandMarksFor } from "@/components/PaymentIcons";
import { BottleMotif } from "./motifs";

const ERRORS: Record<string, string> = {
  panier_vide: "Votre panier est vide.",
  champs_invalides: "Merci de vérifier les champs du formulaire.",
  paiement_invalide: "Sélectionnez un moyen de paiement.",
  produit_indisponible: "Un produit de votre panier n'est plus disponible.",
  variante_indisponible: "Une variante sélectionnée n'est plus disponible.",
  stock_insuffisant: "Stock insuffisant pour un produit de votre panier.",
  json_invalide: "Une erreur est survenue. Réessayez.",
};

/** Champs de livraison, dans l'ordre où ils sont posés au client. */
type FieldName = "fullName" | "email" | "phone" | "location";

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
 */
function validate(field: FieldName, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "fullName":
      return v.length >= 2 ? null : "Indiquez votre nom et votre prénom.";
    case "email":
      // Volontairement permissif : le rôle de ce test est d'attraper la faute
      // de frappe évidente (« @gmail » sans point), pas de juger de l'existence
      // de l'adresse — ce qu'aucune expression régulière ne sait faire.
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : "Vérifiez votre adresse e-mail.";
    case "phone":
      // Au moins huit chiffres : un numéro camerounais en compte neuf, et le
      // client peut le saisir avec ou sans indicatif, avec ou sans espaces.
      return (v.match(/\d/g) ?? []).length >= 8 ? null : "Un numéro joignable sur WhatsApp.";
    case "location":
      return v.length >= 3 ? null : "Quartier et ville, au minimum.";
  }
}

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
  const articles = lines.reduce((n, l) => n + l.quantity, 0);

  const [values, setValues] = useState<Record<FieldName, string>>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [followOrder, setFollowOrder] = useState(true);
  // Le paiement à la livraison est le seul moyen qui aboutit aujourd'hui : il
  // ne demande aucune passerelle, l'argent est encaissé à la remise du colis.
  // Les autres attendent le branchement d'un prestataire — les proposer sans
  // le dire enverrait le client dans une impasse au dernier clic.
  const paiementDisponible = (cle: string) => CLES_HORS_LIGNE.includes(cle);

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
        titre: "Paiement en ligne",
        note: "Bientôt disponible",
        marques,
      });
    }

    for (const p of livraison) {
      options.push({
        cle: p.key,
        titre: p.label,
        note: "Réglez en espèces à la remise du colis",
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
  }, [payments]);

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

  const erreurs = useMemo(
    () => ({
      fullName: validate("fullName", values.fullName),
      email: validate("email", values.email),
      phone: validate("phone", values.phone),
      location: validate("location", values.location),
    }),
    [values],
  );
  const formulaireComplet = Object.values(erreurs).every((e) => e === null);
  const remise = coupon?.discountCents ?? 0;
  const total = Math.max(0, subtotal - remise);

  if (ready && lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <BottleMotif className="mx-auto h-20 text-deep/30" />
        <h1 className="mt-6 text-deep">Votre panier est vide</h1>
        <p className="mt-3 text-muted-foreground">
          Choisissez vos soins, ils vous attendront ici.
        </p>
        <Link
          href="/soins-visage"
          className="kk-fill mt-6 inline-block rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          Découvrir la boutique
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
    setChampPromoOuvert(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Champ manquant : on marque tout comme visité pour faire apparaître les
    // messages, puis on emmène le client au premier champ fautif. Le bouton,
    // lui, n'est jamais désactivé : un bouton grisé sans explication est la
    // façon la plus sûre de perdre une commande.
    if (!formulaireComplet) {
      setTouched({ fullName: true, email: true, phone: true, location: true });
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
      setError(
        "Ce moyen de paiement n'est pas encore actif. Choisissez « Paiement à la livraison » pour finaliser votre commande dès maintenant.",
      );
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
        setError(ERRORS[data.error] ?? "Une erreur est survenue.");
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
      setError("Impossible de joindre le serveur. Réessayez.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
      <FilEtapes />

      <div className="mt-8">
        <h1 className="text-deep">Finaliser la commande</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Deux minutes, quatre champs. Payez en ligne ou à la livraison, comme
          il vous arrange.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-12">
        <div className="space-y-8">
          {/* ---------------------------------------------- Étape 1 : livraison */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <TitreEtape numero={1} titre="Où vous livrer" />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Champ
                name="fullName"
                label="Nom complet"
                icon={User}
                value={values.fullName}
                error={touched.fullName ? erreurs.fullName : null}
                valide={erreurs.fullName === null && values.fullName.length > 0}
                autoComplete="name"
                placeholder="Nom et prénom"
                onChange={(v) => setField("fullName", v)}
                onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              />
              <Champ
                name="phone"
                label="Téléphone"
                icon={Phone}
                type="tel"
                value={values.phone}
                error={touched.phone ? erreurs.phone : null}
                valide={erreurs.phone === null && values.phone.length > 0}
                autoComplete="tel"
                placeholder="+237 6XX XX XX XX"
                aide="C'est sur ce numéro que nous vous appelons pour la livraison."
                onChange={(v) => setField("phone", v)}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              />
              <Champ
                name="email"
                label="E-mail"
                icon={Mail}
                type="email"
                value={values.email}
                error={touched.email ? erreurs.email : null}
                valide={erreurs.email === null && values.email.length > 0}
                autoComplete="email"
                placeholder="exemple@email.com"
                className="sm:col-span-2"
                aide="Pour recevoir le récapitulatif de votre commande."
                onChange={(v) => setField("email", v)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
              <Champ
                name="location"
                label="Lieu de livraison"
                icon={MapPin}
                value={values.location}
                error={touched.location ? erreurs.location : null}
                valide={erreurs.location === null && values.location.length > 0}
                placeholder="Quartier, ville, repère…"
                className="sm:col-span-2"
                aide="Un repère connu du quartier accélère la livraison."
                onChange={(v) => setField("location", v)}
                onBlur={() => setTouched((t) => ({ ...t, location: true }))}
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
                Je veux suivre ma commande
                <span className="group relative ml-1 inline-flex align-middle">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-60 -translate-x-1/2 rounded-lg bg-deep px-3 py-2 text-xs text-primary-foreground opacity-0 transition group-hover:opacity-100">
                    En cochant, un espace personnel est créé avec l&rsquo;e-mail saisi ; vous recevrez vos identifiants par e-mail pour suivre l&rsquo;avancement.
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Un espace personnel est créé pour suivre l&rsquo;avancement de la livraison.
                </span>
              </span>
            </label>
          </section>

          {/* ------------------------------------------------ Étape 2 : paiement */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <TitreEtape numero={2} titre="Comment vous payez" />

            {/* Affichage seul, sans sélection.
                Le choix du moyen de paiement se fait dans la passerelle, après
                la validation de la commande — le proposer ici reviendrait à le
                demander deux fois, et à laisser croire qu'il est arrêté alors
                que la passerelle peut le refuser.
                `ul` et non une rangée de boutons : rien n'est cliquable, donc
                rien ne doit avoir l'apparence d'un contrôle. */}
            <p className="mt-5 text-sm text-foreground">
              Choisissez comment vous réglez :
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
              aria-label="Moyen de paiement"
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
                <span className="font-semibold text-trust">Vous choisissez votre moyen.</span> Réglez en
                ligne à la validation, ou en espèces à la remise du colis.
              </p>
            </div>
          </section>

          {/* Réassurance — trois faits, pas trois promesses.
              Chacun décrit ce que la boutique fait réellement ; rien n'y est
              annoncé qui ne soit tenu par le tunnel lui-même. */}
          <ul className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Lock, titre: "Aucune donnée bancaire", texte: "Aucun numéro de carte n'est saisi ni stocké ici." },
              { icon: MessageCircle, titre: "Une équipe joignable", texte: "Sur WhatsApp, avant comme après la commande." },
              { icon: ShieldCheck, titre: "Coordonnées protégées", texte: "Utilisées pour la livraison, rien d'autre." },
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
                Votre commande
                <span className="ml-2 font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground">
                  {articles} article{articles > 1 ? "s" : ""}
                </span>
              </h2>
              <Link
                href="/panier"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 transition hover:text-deep hover:underline"
              >
                <Pencil className="h-3 w-3" /> Modifier
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
                    Retirer
                  </button>
                </div>
              ) : champPromoOuvert ? (
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
                      autoFocus
                      value={codeSaisi}
                      onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") verifierCode(e);
                      }}
                      placeholder="Code promo"
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
                      {verifCoupon ? "…" : "Appliquer"}
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
                  <Tag className="h-3.5 w-3.5" /> J&rsquo;ai un code promo
                </button>
              )}
            </div>

            <div className="border-t border-border px-5 py-5 sm:px-6">
              {coupon && (
                <div className="mb-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="figure text-muted-foreground">{formatFcfa(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between font-medium text-trust">
                    <span>Vous économisez</span>
                    <span className="figure">−{formatFcfa(remise)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-deep">Total à payer</span>
                <span className="figure text-2xl font-semibold text-deep">{formatFcfa(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Livraison coordonnée via WhatsApp après commande.
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
                  </>
                ) : (
                  <>
                    Valider ma commande <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* La preuve de sûreté, à l'endroit exact de l'hésitation : sous
                  le bouton, en vert, assez grande pour être lue. Elle valait
                  une ligne grise de 12 px — autant dire rien. */}
              <p className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-trust-line bg-trust-soft px-4 py-3 text-sm font-semibold text-trust">
                <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden /> Paiement sécurisé
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                En validant, vous acceptez nos{" "}
                <Link href="/cgv" className="underline underline-offset-2 hover:text-deep">
                  conditions de vente
                </Link>
                .
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
              Total
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
            {submitting ? "Enregistrement…" : "Valider ma commande"}
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
  const etapes: { label: string; href?: string; etat: "fait" | "encours" | "avenir" }[] = [
    { label: "Panier", href: "/panier", etat: "fait" },
    { label: "Vos informations", etat: "encours" },
    { label: "Confirmation", etat: "avenir" },
  ];

  return (
    <nav aria-label="Étapes de la commande">
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
