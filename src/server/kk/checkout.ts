import { randomBytes } from "node:crypto";
import { prisma } from "@/server/prisma";
import { hashPassword } from "@/lib/password";
import { openCustomerSession } from "@/server/customerSession";
import { sendOrderConfirmationEmail, sendAccountAccessEmail } from "@/server/kk/emails";
import { resolvePaymentMethod } from "@/server/kk/payments";
import { consommerCoupon, validerCoupon } from "@/server/coupons";
import { normaliserTelephone } from "@/lib/kk/telephone";
import { choisirLangue } from "@/lib/kk/langue";
import { pickText, needsTranslation } from "@/server/localizedContent";
import { serverAllows } from "@/server/consent";
import { estVilleLivraison, fraisLivraisonFcfa, type VilleLivraison } from "@/lib/kk/livraison";

/** Nom affichable d'une ville de livraison — jamais le nom anglais pour une commande francophone, ni l'inverse. */
const LIBELLE_VILLE: Record<Exclude<VilleLivraison, "autre">, Record<"fr" | "en", string>> = {
  douala: { fr: "Douala", en: "Douala" },
  yaounde: { fr: "Yaoundé", en: "Yaoundé" },
};

/**
 * Clé d'un moyen de paiement, telle qu'enregistrée en base (table
 * PaymentMethod). Volontairement une chaîne libre et non une union figée : la
 * liste est administrable, et le contrôle se fait contre la base — voir
 * `resolvePaymentMethod`.
 */
export type KKPaymentMethod = string;

export type CheckoutItemInput = { productId: string; variantId?: string; quantity: number };
export type CheckoutInput = {
  items: CheckoutItemInput[];
  fullName: string;
  email: string;
  phone: string;
  location: string;
  /** Clé de `VILLES_LIVRAISON` (src/lib/kk/livraison.ts) — pas un nom libre. */
  city: string;
  /** Nom de ville saisi, uniquement quand `city === "autre"`. */
  cityOther?: string;
  followOrder: boolean;
  paymentMethod: KKPaymentMethod;
  locale: string;
  /** Code promo saisi par le client. Revalidé côté serveur, jamais cru sur parole. */
  couponCode?: string;
};

export type CheckoutResult =
  | { ok: true; orderNumber: string; accessToken: string; account: "created" | "linked" | "none" }
  | { ok: false; error: string };

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * Crée une commande KossKoss. Le prix, le stock et le total sont TOUJOURS
 * recalculés côté serveur à partir de la base — jamais fiés au navigateur.
 * Montants en FCFA entiers. Le frais de livraison (src/lib/kk/livraison.ts)
 * est recalculé ICI à partir de la seule `city` reçue, jamais reçu comme
 * montant : c'est lui qui, ajouté au sous-total, forme `totalCents` — le
 * montant réellement transmis à la passerelle de paiement.
 */
export async function createKossOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "panier_vide" };
  }
  if (!input.fullName?.trim() || !isValidEmail(input.email ?? "") || !input.location?.trim()) {
    return { ok: false, error: "champs_invalides" };
  }
  if (!estVilleLivraison(input.city)) {
    return { ok: false, error: "champs_invalides" };
  }
  // « Autre » exige un nom de ville saisi ; Douala/Yaoundé n'en ont pas besoin
  // et ignorent silencieusement une valeur envoyée quand même.
  const villeAutre = input.city === "autre" ? input.cityOther?.trim() : "";
  if (input.city === "autre" && !villeAutre) {
    return { ok: false, error: "champs_invalides" };
  }
  // Le numéro stocké est TOUJOURS en +237XXXXXXXXX, quelle que soit la saisie :
  // le service client, les rappels et l'export ne doivent pas avoir à deviner
  // le format. Refuser ici et non seulement dans le formulaire — la route
  // accepte n'importe quel corps JSON, la validation du formulaire ne protège
  // de rien.
  const telephone = normaliserTelephone(input.phone ?? "");
  if (!telephone) {
    return { ok: false, error: "telephone_invalide" };
  }
  // Langue de l'acheteur, résolue ICI — AVANT de construire les lignes de
  // commande, pas seize lignes plus bas comme précédemment.
  //
  // Une commande fige la langue dans laquelle l'achat a été fait, parce que
  // c'est celle qui fait foi entre l'acheteur et la boutique : le nom et le
  // libellé de variante inscrits sur la ligne sont ceux montrés au client au
  // moment où il a payé, pas ceux du catalogue à l'instant où quelqu'un
  // rouvre la commande. Résoudre la langue après coup fige alors la mauvaise
  // — le français, quel que soit l'acheteur — et aucune traduction ultérieure
  // de la fiche produit ne peut plus corriger une commande déjà écrite.
  //
  // SANS CETTE NOTE : ne re-traduis JAMAIS `name`/`variantLabel` à l'affichage
  // (confirmation, e-mails, espace client, facture) une fois la commande
  // écrite — un client verrait sa commande changer de langue après coup, ce
  // qui n'a pas de sens pour un document historique.
  const langue = choisirLangue(input.locale);
  const traduireLignes = needsTranslation(langue);

  // Le moyen de paiement est revalidé contre la base : une clé désactivée
  // depuis le back-office, ou fabriquée par le navigateur, est refusée ici.
  // Résolu APRÈS la langue : le libellé figé sur la commande est celui montré
  // à l'acheteur dans sa langue, même règle que les lignes ci-dessous.
  const payment = await resolvePaymentMethod(input.paymentMethod, langue);
  if (!payment) {
    return { ok: false, error: "paiement_invalide" };
  }

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    include: { variants: true, category: { include: { group: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const orderItems: {
    productId: string;
    variantId?: string;
    variantLabel: string;
    brand: string;
    name: string;
    sku: string;
    slug: string;
    image: string;
    path: string;
    unitPriceCents: number;
    // Coût d'achat unitaire figé à la vente, comme dans createOrder
    // (src/server/orders.ts) : recopié depuis la fiche produit au moment de
    // la commande, jamais relu depuis le catalogue par la suite.
    unitCostCents: number | null;
    quantity: number;
    lineTotalCents: number;
  }[] = [];
  let subtotal = 0;

  for (const item of input.items) {
    const p = byId.get(item.productId);
    if (!p) return { ok: false, error: "produit_indisponible" };
    const qty = Math.max(1, Math.floor(item.quantity || 1));

    let unit = p.priceCents;
    let variantLabel = "";
    let variantId: string | undefined;
    if (item.variantId) {
      const v = p.variants.find((x) => x.id === item.variantId && x.active);
      if (!v) return { ok: false, error: "variante_indisponible" };
      unit = v.priceCents;
      // Libellé figé dans la langue de l'acheteur — voir le commentaire sur
      // `langue` ci-dessus. Repli par `pickText`, comme partout ailleurs.
      variantLabel = pickText(v.label, traduireLignes ? v.labelEn : undefined);
      variantId = v.id;
    }
    if (p.stock < qty) return { ok: false, error: "stock_insuffisant" };

    const lineTotal = unit * qty;
    subtotal += lineTotal;
    orderItems.push({
      productId: p.id,
      variantId,
      variantLabel,
      brand: p.brand,
      // Nom figé dans la langue de l'acheteur — même règle que `variantLabel`.
      name: pickText(p.name, traduireLignes ? p.nameEn : undefined),
      sku: p.sku,
      slug: p.slug,
      image: p.image ?? "",
      path: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
      unitPriceCents: unit,
      // Figé à la vente, comme le prix. `?? null` et non `?? 0` : un produit
      // sans coût renseigné laisse la case vide, il ne devient pas gratuit.
      unitCostCents: p.costCents ?? null,
      quantity: qty,
      lineTotalCents: lineTotal,
    });
  }

  // Code promo — revalidé ici, sur le sous-total qu'on vient de recalculer à
  // partir des prix en base. Le montant de la remise affiché par le tunnel n'est
  // jamais transmis, et ne serait pas lu : seul ce calcul-ci fait foi.
  //
  // Un code refusé (expiré, épuisé, désactivé entre-temps) ne fait pas échouer
  // la commande : elle passe au prix plein. Bloquer un client au moment de payer
  // pour un code promotionnel coûte plus cher que la remise elle-même.
  let couponCode = "";
  let discountCents = 0;
  if (input.couponCode) {
    const resultat = await validerCoupon(input.couponCode, subtotal);
    if (resultat.ok) {
      couponCode = resultat.coupon.code;
      discountCents = resultat.coupon.discountCents;
    }
  }
  // Frais de livraison — voir le commentaire d'en-tête de la fonction.
  const shippingCents = fraisLivraisonFcfa(input.city);
  const total = Math.max(0, subtotal - discountCents) + shippingCents;

  // Nom affichable de la ville, dans la langue de la commande (même principe
  // que `name`/`variantLabel` plus haut) : Douala/Yaoundé viennent de
  // `LIBELLE_VILLE`, « Autre » reprend tel quel ce que le client a saisi — un
  // nom de ville ne se traduit pas.
  const villeAffichee =
    input.city === "autre" ? (villeAutre ?? "") : LIBELLE_VILLE[input.city as "douala" | "yaounde"][langue];

  // `langue` est déjà résolue plus haut (avant la construction des lignes) ;
  // elle sert aussi au compte client et aux e-mails transactionnels ci-dessous
  // : trois écritures qui doivent s'accorder, une seule résolution.

  const name = input.fullName.trim();
  const space = name.indexOf(" ");
  const firstName = space > 0 ? name.slice(0, space) : name;
  const lastName = space > 0 ? name.slice(space + 1) : name;

  // Compte client à l'opt-in (« suivre ma commande »). Un compte neuf ouvre une
  // session (auto-connexion) ; si l'e-mail a déjà un compte, on rattache la
  // commande sans ouvrir de session (on ne connecte jamais quelqu'un à un compte
  // existant sur simple saisie d'e-mail).
  const emailNorm = input.email.trim().toLowerCase();
  let customerId: string | undefined;
  let account: "created" | "linked" | "none" = "none";
  let newCustomer: { id: string; email: string } | null = null;
  let tempPassword: string | null = null;
  if (input.followOrder) {
    const existing = await prisma.customer.findUnique({ where: { email: emailNorm } });
    if (existing) {
      customerId = existing.id;
      account = "linked";
    } else {
      tempPassword = randomBytes(12).toString("base64url");
      const created = await prisma.customer.create({
        data: {
          email: emailNorm,
          passwordHash: await hashPassword(tempPassword),
          firstName,
          lastName,
          phone: telephone,
          billingCountry: "CM",
          shippingCountry: "CM",
          locale: langue,
          active: true,
        },
      });
      customerId = created.id;
      account = "created";
      newCustomer = { id: created.id, email: created.email };
    }
  }

  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const orderNumber = `KOSS-${year}-${String(count + 1).padStart(6, "0")}`;
  const accessToken = randomBytes(24).toString("hex");

  // Consentement « marketing » figé ICI, à la commande — voir le commentaire
  // sur la colonne `marketingConsent` dans le schéma. C'est un cookie de la
  // REQUÊTE EN COURS (cette fonction est appelée depuis la route
  // `/api/kk/checkout`, qui a `cookies()` dans sa portée) : la CAPI, elle,
  // partira plus tard depuis un webhook du prestataire de paiement, qui n'a
  // par construction aucun cookie de navigateur à relire.
  const marketingConsent = await serverAllows("marketing");

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        orderNumber,
        accessToken,
        customerId,
        locale: langue,
        email: input.email.trim(),
        phone: telephone,
        billingFirstName: firstName,
        billingLastName: lastName,
        billingStreet: input.location.trim(),
        billingPostalCode: "",
        // La ville structurée (Douala / Yaoundé / saisie libre), pas le champ
        // « repère de quartier » : `billingCity` était détourné pour porter
        // les deux avant que la ville ait son propre champ.
        billingCity: villeAffichee,
        billingCountry: "CM",
        paymentMethodKey: payment.key,
        // Libellé figé sur la commande : le renommer au back-office ne doit pas
        // réécrire ce qui a été présenté au client le jour de l'achat.
        paymentMethodLabel: payment.label,
        shippingMethodKey: "whatsapp",
        shippingMethodLabel:
          langue === "en"
            ? `Delivery to ${villeAffichee} — appointment arranged via WhatsApp`
            : `Livraison à ${villeAffichee} — rendez-vous coordonné via WhatsApp`,
        // Statuts KossKoss (voir docs/13). La commande naît TOUJOURS en attente
        // de paiement : c'est le webhook signé de la passerelle, et lui seul,
        // qui la fera basculer en « payée » (voir server/kk/paiement.ts).
        status: "en_attente_paiement",
        paymentStatus: "en_attente",
        subtotalCents: subtotal,
        shippingCents,
        taxCents: 0,
        totalCents: total,
        couponCode,
        discountCents,
        taxRatePercent: 0,
        currency: "XAF",
        customerNote: input.followOrder ? "Client a demandé le suivi de commande." : "",
        marketingConsent,
        items: { create: orderItems },
      },
    });

    for (const line of orderItems) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      });
    }
  });

  // Le compteur d'usage n'est incrémenté qu'une fois la commande réellement
  // écrite : un panier abandonné au moment de payer ne doit pas consommer le
  // code. Hors transaction, à dessein — un échec d'incrément ne doit pas
  // annuler une commande déjà valide.
  if (couponCode) {
    await consommerCoupon(couponCode);
  }

  // Auto-connexion uniquement pour un compte fraîchement créé.
  if (newCustomer) {
    await openCustomerSession(newCustomer);
  }

  // E-mails transactionnels (best-effort : les fonctions avalent leurs erreurs
  // et ne partent que si le SMTP est configuré — la commande n'échoue jamais).
  // Ils partent dans la `langue` résolue plus haut, celle-là même qui a été
  // écrite sur la commande.
  await sendOrderConfirmationEmail({
    to: input.email.trim(),
    firstName,
    orderNumber,
    items: orderItems,
    totalFcfa: total,
    langue,
  });
  if (account === "created" && tempPassword) {
    await sendAccountAccessEmail(emailNorm, firstName, tempPassword, langue);
  }

  return { ok: true, orderNumber, accessToken, account };
}

/** Charge une commande pour la page de confirmation (jeton d'accès requis). */
export async function getKossOrder(orderNumber: string, token: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order || !token || order.accessToken !== token) return null;
  return order;
}
