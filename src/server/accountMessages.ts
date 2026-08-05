import { NextResponse } from "next/server";
import { PASSWORD_MIN_LENGTH, type AccountErrorCode } from "@/server/customers";

/**
 * Réponses d'erreur des routes de l'espace client.
 *
 * La boutique est française : `error` porte le message français, seul texte
 * qu'un appelant brut (curl, intégration) verra. L'interface, elle, traduit à
 * partir de `code` via le namespace « account » — l'anglais est donc complet
 * sans dupliquer les libellés ici.
 *
 * Aucun message ne distingue « adresse inconnue » de « mot de passe faux » :
 * l'OWASP Authentication Cheat Sheet demande un libellé unique, et la CNIL
 * recommande la même chose dans son guide de la sécurité des données
 * personnelles — un message distinct permettrait d'énumérer les comptes.
 */
const MESSAGES: Record<AccountErrorCode, { fr: string; en: string }> = {
  invalid_payload: {
    fr: "La demande n'a pas pu être lue.",
    en: "The request could not be read.",
  },
  invalid_email: {
    fr: "Merci d'indiquer une adresse e-mail valide.",
    en: "Please enter a valid email address.",
  },
  invalid_name: {
    fr: "Merci d'indiquer vos nom et prénom.",
    en: "Please enter a first and last name.",
  },
  invalid_salutation: {
    fr: "Merci de choisir une civilité valide.",
    en: "Please choose a valid salutation.",
  },
  invalid_phone: {
    fr: "Merci d'indiquer un numéro de téléphone valide.",
    en: "Please enter a valid phone number.",
  },
  weak_password: {
    fr: `Le mot de passe doit compter au moins ${PASSWORD_MIN_LENGTH} caractères.`,
    en: `The password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
  },
  password_mismatch: {
    fr: "Les deux mots de passe ne correspondent pas.",
    en: "The two passwords do not match.",
  },
  invalid_credentials: {
    fr: "L'adresse e-mail ou le mot de passe est incorrect.",
    en: "Email address or password is incorrect.",
  },
  account_disabled: {
    fr: "L'adresse e-mail ou le mot de passe est incorrect.",
    en: "Email address or password is incorrect.",
  },
  invalid_street: {
    fr: "Merci d'indiquer le numéro et le nom de la rue.",
    en: "Please enter a street and house number.",
  },
  invalid_postal_code: {
    fr: "Merci d'indiquer un code postal valide.",
    en: "Please enter a valid postcode.",
  },
  invalid_city: { fr: "Merci d'indiquer une ville.", en: "Please enter a city." },
  unsupported_country: {
    fr: "Merci d'indiquer un pays valide.",
    en: "Please enter a valid country.",
  },
  invalid_token: {
    fr: "Ce lien a expiré ou a déjà été utilisé. Merci d'en demander un nouveau.",
    en: "This link has expired or was already used. Please request a new one.",
  },
  rate_limited: {
    fr: "Trop de tentatives. Merci de patienter un instant avant de réessayer.",
    en: "Too many attempts. Please wait a moment and try again.",
  },
  not_found: { fr: "Introuvable.", en: "Not found." },
  confirmation_required: {
    fr: "Merci de confirmer explicitement la suppression.",
    en: "Please confirm the deletion explicitly.",
  },
  mail_failed: {
    fr: "L'e-mail n'a pas pu être envoyé. Merci de réessayer plus tard.",
    en: "The email could not be sent. Please try again later.",
  },
  server_error: {
    fr: "Une erreur est survenue. Merci de réessayer plus tard.",
    en: "Something went wrong. Please try again later.",
  },
};

export function accountErrorResponse(
  code: AccountErrorCode,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  const message = MESSAGES[code];
  return NextResponse.json(
    { code, error: message.fr, messages: message, ...(extra ?? {}) },
    { status },
  );
}
