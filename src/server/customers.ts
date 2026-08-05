/**
 * Comptes clients de la boutique.
 *
 * Trois principes, tous imposés par le droit applicable à une boutique
 * française :
 *
 *  1. Le compte est facultatif. Rien ici n'est appelé par le tunnel de
 *     commande invité : commander sans compte reste possible et inchangé.
 *     Imposer un compte pour une commande ponctuelle est contraire au principe
 *     de minimisation (art. 5 § 1 c RGPD) — position constante de la CNIL
 *     sur les comptes clients dans le commerce en ligne.
 *
 *  2. Aucune fonction ne révèle si une adresse e-mail est enregistrée.
 *     Connexion, inscription et « mot de passe oublié » renvoient toutes le
 *     même résultat, qu'un compte existe ou non (OWASP Authentication Cheat
 *     Sheet, WSTG-IDNT-04).
 *
 *  3. Supprimer un compte n'efface jamais les commandes : elles restent
 *     soumises aux délais de conservation comptables français — dix ans pour
 *     les livres et pièces justificatives (art. L123-22 du Code de commerce),
 *     six ans au titre du droit de communication de l'administration fiscale
 *     (art. L102 B du Livre des procédures fiscales). L'art. 17 § 3 b RGPD
 *     réserve expressément ce cas. Les
 *     commandes sont détachées du compte et débarrassées des coordonnées qui
 *     ne sont pas exigées par la facture.
 *
 * Le mot de passe n'est jamais renvoyé, même haché, et n'est jamais journalisé.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import {
  buildExistingAccountEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  siteUrl,
  type EmailLocale,
} from "@/server/emails/customerAccount";
import { getOrderByNumber, type OrderRecord } from "@/server/orders";
import { isOrderStatus, isPaymentStatus } from "@/lib/orderStatus";
import type { OrderStatus, PaymentStatus } from "@/lib/orderStatus";
import { COUNTRY_CODES, DEFAULT_COUNTRY, isValidPostalCode } from "@/lib/countries";

// ---- Constantes ----

/**
 * Longueur minimale du mot de passe : douze caractères, sans règle de
 * composition imposée. La longueur prime sur la complexité — la CNIL
 * (délibération 2022-100) et l'OWASP Authentication Cheat Sheet vont dans le
 * même sens, et
 * une contrainte trop bavarde pousse aux mots de passe réutilisés.
 * La borne haute est large (les phrases de passe doivent passer) mais présente,
 * pour qu'une entrée démesurée ne serve pas de levier de déni de service sur
 * scrypt.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

/** Durée de validité d'un lien de réinitialisation. */
export const RESET_TTL_MINUTES = 30;

/**
 * Pays acceptés dans une adresse — la liste ISO complète proposée par le
 * sélecteur du tunnel de commande. Le formulaire et le serveur lisent la même
 * source : un pays affiché est donc toujours un pays enregistrable.
 */
export const SUPPORTED_COUNTRIES = COUNTRY_CODES;

/** Civilités acceptées — texte libre court, pas d'enum Prisma. */
export const SALUTATIONS = ["", "herr", "frau", "divers"] as const;

/** Adresse de remplacement posée sur les commandes d'un compte supprimé. */
const ANONYMIZED_EMAIL = "supprime@compte.invalid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+0-9\s()/.-]{6,40}$/;

/**
 * Haché scrypt d'une valeur inutilisable, vérifié quand l'adresse saisie n'existe
 * pas : la connexion consomme alors le même temps de calcul que pour un compte
 * réel, ce qui interdit de deviner l'existence d'un compte à la durée de la
 * réponse.
 */
const DUMMY_HASH = hashPassword(randomBytes(24).toString("hex"));

// ---- Types publics ----

export interface CustomerAddress {
  salutation: string;
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export const EMPTY_ADDRESS: CustomerAddress = {
  salutation: "",
  firstName: "",
  lastName: "",
  company: "",
  street: "",
  postalCode: "",
  city: "",
  country: "FR",
};

/** Vue publique d'un compte. Ne contient jamais le mot de passe, même haché. */
export interface CustomerRecord {
  id: string;
  email: string;
  salutation: string;
  firstName: string;
  lastName: string;
  phone: string;
  billing: CustomerAddress;
  shippingSameAsBilling: boolean;
  shipping: CustomerAddress;
  locale: string;
  emailVerified: boolean;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderSummary {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  currency: string;
  itemCount: number;
  paymentMethodLabel: string;
}

/** Codes d'erreur ; la couche HTTP les traduit. */
export type AccountErrorCode =
  | "invalid_payload"
  | "invalid_email"
  | "invalid_name"
  | "invalid_salutation"
  | "invalid_phone"
  | "weak_password"
  | "password_mismatch"
  | "invalid_credentials"
  | "account_disabled"
  | "invalid_street"
  | "invalid_postal_code"
  | "invalid_city"
  | "unsupported_country"
  | "invalid_token"
  | "rate_limited"
  | "not_found"
  | "confirmation_required"
  | "mail_failed"
  | "server_error";

export type AccountResult<T> = { ok: true; value: T } | { ok: false; code: AccountErrorCode };

function fail<T>(code: AccountErrorCode): AccountResult<T> {
  return { ok: false, code };
}

function done<T>(value: T): AccountResult<T> {
  return { ok: true, value };
}

// ---- Conversion ----

type CustomerRow = Awaited<ReturnType<typeof prisma.customer.findUnique>>;

function toRecord(row: NonNullable<CustomerRow>): CustomerRecord {
  return {
    id: row.id,
    email: row.email,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    billing: {
      salutation: row.salutation,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.billingCompany,
      street: row.billingStreet,
      postalCode: row.billingPostalCode,
      city: row.billingCity,
      country: row.billingCountry,
    },
    shippingSameAsBilling: row.shippingSameAsBilling,
    shipping: {
      salutation: row.shippingSalutation,
      firstName: row.shippingFirstName,
      lastName: row.shippingLastName,
      company: row.shippingCompany,
      street: row.shippingStreet,
      postalCode: row.shippingPostalCode,
      city: row.shippingCity,
      country: row.shippingCountry,
    },
    locale: row.locale,
    emailVerified: row.emailVerified,
    active: row.active,
    lastLoginAt: row.lastLoginAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---- Lecture / écriture des champs ----

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeEmail(value: unknown): string {
  return text(value, 160).toLowerCase();
}

function normalizeLocale(value: unknown): EmailLocale {
  return text(value, 5) === "en" ? "en" : "fr";
}

function checkPassword(value: unknown): AccountErrorCode | undefined {
  if (typeof value !== "string") return "weak_password";
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return "weak_password";
  }
  return undefined;
}

export function readAddress(value: unknown): CustomerAddress {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    salutation: text(raw.salutation, 20),
    firstName: text(raw.firstName, 80),
    lastName: text(raw.lastName, 80),
    company: text(raw.company, 120),
    street: text(raw.street, 160),
    postalCode: text(raw.postalCode, 12).toUpperCase(),
    city: text(raw.city, 80),
    country: (text(raw.country, 2) || DEFAULT_COUNTRY).toUpperCase(),
  };
}

function isAddressEmpty(address: CustomerAddress): boolean {
  return !address.street && !address.postalCode && !address.city && !address.company;
}

/** Valide une adresse enregistrée. Une adresse entièrement vide est acceptée. */
function validateAddress(address: CustomerAddress, requireName: boolean): AccountErrorCode | undefined {
  if (isAddressEmpty(address) && !requireName) return undefined;
  if (requireName && (address.firstName.length < 2 || address.lastName.length < 2)) {
    return "invalid_name";
  }
  if (isAddressEmpty(address)) return undefined;
  if (address.street.length < 4) return "invalid_street";
  if (!(SUPPORTED_COUNTRIES as readonly string[]).includes(address.country)) {
    return "unsupported_country";
  }
  if (!isValidPostalCode(address.country, address.postalCode)) return "invalid_postal_code";
  if (address.city.length < 2) return "invalid_city";
  return undefined;
}

// ---- Inscription ----

export interface SignUpInput {
  email: string;
  password: string;
  salutation: string;
  firstName: string;
  lastName: string;
  phone: string;
  locale: EmailLocale;
}

export function parseSignUpPayload(payload: unknown): AccountResult<SignUpInput> {
  if (!payload || typeof payload !== "object") return fail("invalid_payload");
  const raw = payload as Record<string, unknown>;

  const email = normalizeEmail(raw.email);
  if (!EMAIL_PATTERN.test(email)) return fail("invalid_email");

  const passwordError = checkPassword(raw.password);
  if (passwordError) return fail(passwordError);

  const salutation = text(raw.salutation, 20).toLowerCase();
  if (!(SALUTATIONS as readonly string[]).includes(salutation)) return fail("invalid_salutation");

  const firstName = text(raw.firstName, 80);
  const lastName = text(raw.lastName, 80);
  if (firstName.length < 2 || lastName.length < 2) return fail("invalid_name");

  const phone = text(raw.phone, 40);
  if (phone && !PHONE_PATTERN.test(phone)) return fail("invalid_phone");

  return done({
    email,
    password: raw.password as string,
    salutation,
    firstName,
    lastName,
    phone,
    locale: normalizeLocale(raw.locale),
  });
}

/**
 * Crée le compte si l'adresse est libre.
 *
 * La valeur de retour est volontairement identique dans les deux cas : c'est
 * l'appelant HTTP qui répond, et il répond toujours la même chose. Le titulaire
 * d'un compte existant est prévenu par e-mail qu'une inscription a été tentée
 * avec son adresse ; personne d'autre n'apprend quoi que ce soit.
 */
export async function registerCustomer(input: SignUpInput): Promise<void> {
  const existing = await prisma.customer.findUnique({
    where: { email: input.email },
    select: { id: true, firstName: true, locale: true },
  });

  if (existing) {
    await deliverMail(
      input.email,
      buildExistingAccountEmail({
        locale: normalizeLocale(existing.locale),
        firstName: existing.firstName,
      }),
      "inscription sur une adresse déjà utilisée",
    );
    return;
  }

  await prisma.customer.create({
    data: {
      email: input.email,
      passwordHash: hashPassword(input.password),
      salutation: input.salutation,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      locale: input.locale,
    },
  });

  await deliverMail(
    input.email,
    buildWelcomeEmail({ locale: input.locale, firstName: input.firstName }),
    "création de compte",
  );
}

// ---- Connexion ----

/**
 * Vérifie les identifiants.
 *
 * Quand l'adresse n'existe pas, un haché factice est tout de même vérifié :
 * la réponse prend le même temps que pour un compte réel. Un compte désactivé
 * est traité exactement comme un mot de passe faux — la boutique n'a pas à
 * dire au visiteur qu'il a été bloqué.
 */
export async function authenticateCustomer(
  email: string,
  password: string,
): Promise<CustomerRecord | null> {
  const normalized = normalizeEmail(email);
  const row = await prisma.customer.findUnique({ where: { email: normalized } });

  if (!row) {
    verifyPassword(typeof password === "string" ? password : "", DUMMY_HASH);
    return null;
  }

  if (!verifyPassword(password, row.passwordHash)) return null;
  if (!row.active) return null;

  return toRecord(row);
}

export async function markCustomerLoggedIn(id: string): Promise<void> {
  await prisma.customer.update({ where: { id }, data: { lastLoginAt: new Date() } });
}

/** Compte actif relu par son identifiant, pour valider une session en cours. */
export async function getActiveCustomer(id: string): Promise<CustomerRecord | null> {
  const row = await prisma.customer.findUnique({ where: { id } });
  if (!row || !row.active) return null;
  return toRecord(row);
}

// ---- Profil et adresses ----

export interface ProfilePatch {
  salutation: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function parseProfilePayload(payload: unknown): AccountResult<ProfilePatch> {
  if (!payload || typeof payload !== "object") return fail("invalid_payload");
  const raw = payload as Record<string, unknown>;

  const salutation = text(raw.salutation, 20).toLowerCase();
  if (!(SALUTATIONS as readonly string[]).includes(salutation)) return fail("invalid_salutation");

  const firstName = text(raw.firstName, 80);
  const lastName = text(raw.lastName, 80);
  if (firstName.length < 2 || lastName.length < 2) return fail("invalid_name");

  const phone = text(raw.phone, 40);
  if (phone && !PHONE_PATTERN.test(phone)) return fail("invalid_phone");

  return done({ salutation, firstName, lastName, phone });
}

export async function updateCustomerProfile(
  id: string,
  patch: ProfilePatch,
): Promise<CustomerRecord | null> {
  const row = await prisma.customer.update({
    where: { id },
    data: {
      salutation: patch.salutation,
      firstName: patch.firstName,
      lastName: patch.lastName,
      phone: patch.phone,
    },
  });
  return toRecord(row);
}

export interface AddressPatch {
  billing: CustomerAddress;
  shippingSameAsBilling: boolean;
  shipping: CustomerAddress;
}

export function parseAddressPayload(payload: unknown): AccountResult<AddressPatch> {
  if (!payload || typeof payload !== "object") return fail("invalid_payload");
  const raw = payload as Record<string, unknown>;

  const billing = readAddress(raw.billing);
  const billingError = validateAddress(billing, false);
  if (billingError) return fail(billingError);

  const shippingSameAsBilling = raw.shippingSameAsBilling !== false;
  const shipping = shippingSameAsBilling ? { ...EMPTY_ADDRESS } : readAddress(raw.shipping);
  if (!shippingSameAsBilling) {
    // Une adresse de livraison distincte doit être complète, nom compris :
    // le transporteur en a besoin.
    const shippingError = validateAddress(shipping, true);
    if (shippingError) return fail(shippingError);
    if (isAddressEmpty(shipping)) return fail("invalid_street");
  }

  return done({ billing, shippingSameAsBilling, shipping });
}

export async function updateCustomerAddresses(
  id: string,
  patch: AddressPatch,
): Promise<CustomerRecord | null> {
  const row = await prisma.customer.update({
    where: { id },
    data: {
      billingCompany: patch.billing.company,
      billingStreet: patch.billing.street,
      billingPostalCode: patch.billing.postalCode,
      billingCity: patch.billing.city,
      billingCountry: patch.billing.country,
      shippingSameAsBilling: patch.shippingSameAsBilling,
      shippingSalutation: patch.shipping.salutation,
      shippingFirstName: patch.shipping.firstName,
      shippingLastName: patch.shipping.lastName,
      shippingCompany: patch.shipping.company,
      shippingStreet: patch.shipping.street,
      shippingPostalCode: patch.shipping.postalCode,
      shippingCity: patch.shipping.city,
      shippingCountry: patch.shipping.country,
    },
  });
  return toRecord(row);
}

// ---- Changement de mot de passe ----

/**
 * Le mot de passe actuel est exigé : un cookie volé ne doit pas suffire à
 * verrouiller le compte de son titulaire.
 */
export async function changeCustomerPassword(
  id: string,
  currentPassword: unknown,
  nextPassword: unknown,
): Promise<AccountResult<true>> {
  const weak = checkPassword(nextPassword);
  if (weak) return fail(weak);

  const row = await prisma.customer.findUnique({
    where: { id },
    select: { passwordHash: true, active: true },
  });
  if (!row || !row.active) return fail("not_found");

  if (typeof currentPassword !== "string" || !verifyPassword(currentPassword, row.passwordHash)) {
    return fail("invalid_credentials");
  }

  await prisma.customer.update({
    where: { id },
    data: { passwordHash: hashPassword(nextPassword as string) },
  });

  // Les liens de réinitialisation encore en circulation deviennent inutiles.
  await prisma.customerPasswordReset.deleteMany({ where: { customerId: id } });

  return done(true);
}

// ---- Mot de passe oublié ----

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Vrai uniquement en développement sans fournisseur d'e-mail configuré. */
export function isAccountMailDevFallback(): boolean {
  return process.env.NODE_ENV === "development" && !isMailConfigured();
}

/**
 * Envoi tolérant aux pannes : une erreur du fournisseur ne doit pas faire
 * échouer une inscription déjà enregistrée, ni révéler par un code HTTP
 * différent qu'un compte existe. Le motif reste dans les journaux du serveur.
 */
async function deliverMail(
  to: string,
  message: { subject: string; html: string; text: string },
  context: string,
): Promise<void> {
  if (isAccountMailDevFallback()) {
    console.info(`[konto] E-mail « ${context} » vers ${to} — aucun fournisseur configuré.`);
    return;
  }
  try {
    await sendMail({ to, ...message });
  } catch (error) {
    console.error(`[konto] Envoi impossible (${context}) :`, error);
  }
}

/**
 * Demande de réinitialisation.
 *
 * Ne renvoie jamais d'indication sur l'existence du compte : adresse inconnue
 * ou compte désactivé, la fonction se termine normalement sans rien envoyer.
 * En développement sans fournisseur d'e-mail, le lien est écrit dans la console
 * du serveur (même repli que le code du back-office) et renvoyé à l'appelant.
 */
export async function requestPasswordReset(
  email: unknown,
  locale: EmailLocale,
): Promise<{ devLink?: string }> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) return {};

  const row = await prisma.customer.findUnique({
    where: { email: normalized },
    select: { id: true, firstName: true, locale: true, active: true },
  });
  if (!row || !row.active) return {};

  // Ménage : les demandes périmées ou consommées ne servent plus à rien.
  await prisma.customerPasswordReset.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }, { customerId: row.id }],
    },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.customerPasswordReset.create({
    data: {
      customerId: row.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
    },
  });

  const language = normalizeLocale(row.locale) === "en" ? "en" : locale;
  const prefix = language === "en" ? "/en" : "";
  const resetUrl = `${siteUrl()}${prefix}/compte/nouveau-mot-de-passe?token=${token}`;

  const message = buildPasswordResetEmail({
    locale: language,
    firstName: row.firstName,
    resetUrl,
    expiresInMinutes: RESET_TTL_MINUTES,
  });

  if (isAccountMailDevFallback()) {
    console.info(`[konto] Lien de réinitialisation pour ${normalized} : ${resetUrl}`);
    return { devLink: resetUrl };
  }

  await deliverMail(normalized, message, "réinitialisation du mot de passe");
  return {};
}

/** Valide le jeton sans le consommer : sert à afficher le formulaire. */
export async function isResetTokenValid(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.length < 20) return false;
  const row = await prisma.customerPasswordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { tokenHash: true, expiresAt: true, consumedAt: true },
  });
  if (!row || row.consumedAt || row.expiresAt < new Date()) return false;
  return safeEqualHex(row.tokenHash, hashToken(token));
}

/** Consomme le jeton et pose le nouveau mot de passe. */
export async function resetPasswordWithToken(
  token: unknown,
  nextPassword: unknown,
): Promise<AccountResult<true>> {
  const weak = checkPassword(nextPassword);
  if (weak) return fail(weak);
  if (typeof token !== "string" || token.length < 20) return fail("invalid_token");

  const row = await prisma.customerPasswordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: { select: { id: true, active: true } } },
  });

  if (!row || row.consumedAt || row.expiresAt < new Date() || !row.customer.active) {
    return fail("invalid_token");
  }
  if (!safeEqualHex(row.tokenHash, hashToken(token))) return fail("invalid_token");

  await prisma.customer.update({
    where: { id: row.customerId },
    data: { passwordHash: hashPassword(nextPassword as string) },
  });

  // Un jeton ne resservira pas, et les autres demandes du même compte tombent.
  await prisma.customerPasswordReset.deleteMany({ where: { customerId: row.customerId } });

  return done(true);
}

// ---- Commandes du client ----

export async function listCustomerOrders(
  customerId: string,
  /** Nombre maximal de lignes ; sans valeur, tout l'historique du compte. */
  limit?: number,
): Promise<CustomerOrderSummary[]> {
  const rows = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : {}),
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      currency: true,
      paymentMethodLabel: true,
      items: { select: { quantity: true } },
    },
  });

  return rows.map((row) => ({
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    status: isOrderStatus(row.status) ? row.status : "eingegangen",
    paymentStatus: isPaymentStatus(row.paymentStatus) ? row.paymentStatus : "offen",
    totalCents: row.totalCents,
    currency: row.currency,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    paymentMethodLabel: row.paymentMethodLabel,
  }));
}

/**
 * Détail d'une commande, à condition qu'elle appartienne bien au compte.
 * Le jeton d'accès est relu en base : le client connecté n'a pas besoin de le
 * porter dans l'URL, mais la lecture passe par la même fonction que la page de
 * confirmation, donc par le même contrôle.
 */
export async function getCustomerOrder(
  customerId: string,
  orderNumber: string,
): Promise<OrderRecord | undefined> {
  const row = await prisma.order.findFirst({
    where: { customerId, orderNumber: orderNumber.trim().toUpperCase() },
    select: { accessToken: true, orderNumber: true },
  });
  if (!row) return undefined;
  return getOrderByNumber(row.orderNumber, row.accessToken);
}

// ---- Droit d'accès et portabilité (art. 15 et 20 RGPD) ----

/**
 * Export complet, en JSON : format structuré, couramment utilisé et lisible par
 * machine, comme l'exige l'art. 20 § 1 RGPD.
 */
export async function exportCustomerData(customerId: string): Promise<Record<string, unknown> | null> {
  const row = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!row) return null;

  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
    include: {
      items: { orderBy: { name: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  const customer = toRecord(row);

  return {
    hinweis:
      "Droit d'accès au titre de l'article 15 du RGPD et portabilité au titre de l'article 20. " +
      "Ce fichier contient toutes les données personnelles que MLC Bois a enregistrées pour " +
      "votre compte client. Votre mot de passe n'y figure pas : il est stocké uniquement sous " +
      "forme d'empreinte non réversible.",
    erstelltAm: new Date().toISOString(),
    konto: {
      kundennummer: customer.id,
      email: customer.email,
      anrede: customer.salutation,
      vorname: customer.firstName,
      nachname: customer.lastName,
      telefon: customer.phone,
      sprache: customer.locale,
      emailBestaetigt: customer.emailVerified,
      aktiv: customer.active,
      registriertAm: customer.createdAt,
      zuletztGeaendertAm: customer.updatedAt,
      letzteAnmeldung: customer.lastLoginAt ?? null,
    },
    adressen: {
      rechnungsadresse: customer.billing,
      lieferadresseEntsprichtRechnungsadresse: customer.shippingSameAsBilling,
      lieferadresse: customer.shipping,
    },
    bestellungen: orders.map((order) => ({
      bestellnummer: order.orderNumber,
      bestelltAm: order.createdAt.toISOString(),
      status: order.status,
      zahlungsstatus: order.paymentStatus,
      zahlungsart: order.paymentMethodLabel,
      waehrung: order.currency,
      zwischensummeCent: order.subtotalCents,
      versandCent: order.shippingCents,
      enthalteneUmsatzsteuerCent: order.taxCents,
      umsatzsteuersatzProzent: order.taxRatePercent,
      gesamtCent: order.totalCents,
      rechnungsadresse: {
        anrede: order.billingSalutation,
        vorname: order.billingFirstName,
        nachname: order.billingLastName,
        firma: order.billingCompany,
        strasse: order.billingStreet,
        plz: order.billingPostalCode,
        ort: order.billingCity,
        land: order.billingCountry,
      },
      lieferadresse: order.shippingSameAsBilling
        ? "entspricht der Rechnungsadresse"
        : {
            anrede: order.shippingSalutation,
            vorname: order.shippingFirstName,
            nachname: order.shippingLastName,
            firma: order.shippingCompany,
            strasse: order.shippingStreet,
            plz: order.shippingPostalCode,
            ort: order.shippingCity,
            land: order.shippingCountry,
          },
      anmerkung: order.customerNote,
      positionen: order.items.map((item) => ({
        marke: item.brand,
        bezeichnung: item.name,
        artikelnummer: item.sku,
        menge: item.quantity,
        einzelpreisCent: item.unitPriceCents,
        positionssummeCent: item.lineTotalCents,
      })),
      verlauf: order.events.map((event) => ({
        art: event.kind,
        von: event.fromValue,
        nach: event.toValue,
        am: event.createdAt.toISOString(),
      })),
    })),
  };
}

// ---- Droit à l'effacement (art. 17 RGPD) ----

/**
 * Supprime le compte et anonymise les commandes qui y étaient rattachées.
 *
 * Ce qui disparaît : identifiants de connexion, mot de passe haché, adresses
 * enregistrées pour le confort, téléphone, demandes de réinitialisation.
 *
 * Ce qui reste, et pourquoi : la commande elle-même. Les justificatifs
 * comptables et les factures se conservent huit ans depuis le BEG IV du
 * 29 octobre 2024 (§ 147 al. 3 AO, § 257 al. 4 HGB ; dix ans pour les livres et
 * les comptes annuels), et l'art. 17 § 3 b RGPD réserve expressément le cas
 * d'une obligation légale de conservation. La commande est détachée du compte,
 * ses coordonnées de contact
 * (e-mail, téléphone, message du client) sont effacées et son jeton d'accès est
 * régénéré pour que les anciens liens de confirmation ne fonctionnent plus.
 * Le nom et l'adresse de facturation subsistent : ce sont des mentions
 * obligatoires de la facture (§ 14 al. 4 UStG), les retirer rendrait la pièce
 * comptable non conforme.
 */
export async function deleteCustomerAccount(
  customerId: string,
  password: unknown,
): Promise<AccountResult<{ anonymizedOrders: number }>> {
  const row = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, passwordHash: true },
  });
  if (!row) return fail("not_found");

  // Le mot de passe est redemandé : une suppression est irréversible.
  if (typeof password !== "string" || !verifyPassword(password, row.passwordHash)) {
    return fail("invalid_credentials");
  }

  const orders = await prisma.order.findMany({
    where: { customerId },
    select: { id: true },
  });

  for (const order of orders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerId: null,
        anonymizedAt: new Date(),
        email: ANONYMIZED_EMAIL,
        phone: "",
        customerNote: "",
        accessToken: randomBytes(16).toString("hex"),
      },
    });
  }

  await prisma.customer.delete({ where: { id: customerId } });

  return done({ anonymizedOrders: orders.length });
}

// ---- Back-office ----

export interface AdminCustomerRow {
  id: string;
  email: string;
  salutation: string;
  firstName: string;
  lastName: string;
  city: string;
  active: boolean;
  emailVerified: boolean;
  orderCount: number;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Liste destinée au back-office. Le mot de passe haché n'est pas sélectionné :
 * il ne doit jamais quitter la couche d'authentification.
 */
export async function listCustomersForAdmin(query?: string): Promise<AdminCustomerRow[]> {
  const search = query?.trim() ?? "";

  const rows = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { billingCity: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      salutation: true,
      firstName: true,
      lastName: true,
      billingCity: true,
      active: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { orders: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    salutation: row.salutation,
    firstName: row.firstName,
    lastName: row.lastName,
    city: row.billingCity,
    active: row.active,
    emailVerified: row.emailVerified,
    orderCount: row._count.orders,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString(),
  }));
}
