import { randomBytes } from "node:crypto";
import { prisma } from "@/server/prisma";
import { hashPassword } from "@/lib/password";
import { openCustomerSession } from "@/server/customerSession";
import { sendOrderConfirmationEmail, sendAccountAccessEmail } from "@/server/kk/emails";

export type KKPaymentMethod = "orange_money" | "mtn_momo" | "carte";

const PAYMENT_LABELS: Record<KKPaymentMethod, string> = {
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  carte: "Carte bancaire",
};

export type CheckoutItemInput = { productId: string; variantId?: string; quantity: number };
export type CheckoutInput = {
  items: CheckoutItemInput[];
  fullName: string;
  email: string;
  phone: string;
  location: string;
  followOrder: boolean;
  paymentMethod: KKPaymentMethod;
  locale: string;
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
 * Montants en FCFA entiers, sans frais de livraison (coordonnée via WhatsApp).
 */
export async function createKossOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "panier_vide" };
  }
  if (!input.fullName?.trim() || !isValidEmail(input.email ?? "") || !input.phone?.trim() || !input.location?.trim()) {
    return { ok: false, error: "champs_invalides" };
  }
  if (!(input.paymentMethod in PAYMENT_LABELS)) {
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
      variantLabel = v.label;
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
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      image: p.image ?? "",
      path: `/${p.category.group.slug}/${p.category.slug}/${p.slug}`,
      unitPriceCents: unit,
      quantity: qty,
      lineTotalCents: lineTotal,
    });
  }

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
          phone: input.phone.trim(),
          billingCountry: "CM",
          shippingCountry: "CM",
          locale: input.locale === "en" ? "en" : "fr",
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

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        orderNumber,
        accessToken,
        customerId,
        locale: input.locale === "en" ? "en" : "fr",
        email: input.email.trim(),
        phone: input.phone.trim(),
        billingFirstName: firstName,
        billingLastName: lastName,
        billingStreet: input.location.trim(),
        billingPostalCode: "",
        billingCity: input.location.trim(),
        billingCountry: "CM",
        paymentMethodKey: input.paymentMethod,
        paymentMethodLabel: PAYMENT_LABELS[input.paymentMethod],
        shippingMethodKey: "whatsapp",
        shippingMethodLabel: "Livraison coordonnée via WhatsApp",
        // Statuts KossKoss (voir docs/13). Le paiement Mobile Money reste à
        // brancher (CinetPay) : la commande naît en attente de paiement.
        status: "en_attente_paiement",
        paymentStatus: "en_attente",
        subtotalCents: subtotal,
        shippingCents: 0,
        taxCents: 0,
        totalCents: subtotal,
        taxRatePercent: 0,
        currency: "XAF",
        customerNote: input.followOrder ? "Client a demandé le suivi de commande." : "",
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

  // Auto-connexion uniquement pour un compte fraîchement créé.
  if (newCustomer) {
    await openCustomerSession(newCustomer);
  }

  // E-mails transactionnels (best-effort : les fonctions avalent leurs erreurs
  // et ne partent que si le SMTP est configuré — la commande n'échoue jamais).
  await sendOrderConfirmationEmail({
    to: input.email.trim(),
    firstName,
    orderNumber,
    items: orderItems,
    totalFcfa: subtotal,
  });
  if (account === "created" && tempPassword) {
    await sendAccountAccessEmail(emailNorm, firstName, tempPassword);
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
