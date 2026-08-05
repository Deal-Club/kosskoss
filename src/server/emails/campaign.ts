/**
 * Gabarit des messages de campagne.
 *
 * Mêmes contraintes techniques que src/server/emails/customerAccount.ts : mise
 * en page en tableaux, styles en ligne, `color-scheme: light` pour empêcher
 * l'inversion automatique des couleurs, fond déclaré sur chaque cellule. Rien
 * de tout cela n'est du zèle : les clients de messagerie ignorent les feuilles
 * de style externes et beaucoup réécrivent les couleurs en mode sombre.
 *
 * Deux différences de fond avec les messages transactionnels :
 *
 *  1. Tous les liens passent par /c/<jeton>. Un lien direct vers la fiche
 *     produit serait plus court, mais le clic ne serait pas mesuré et la remise
 *     ne serait attribuée à personne.
 *
 *  2. Le pied de page porte l'identification du fournisseur (§ 5 DDG) et un
 *     lien de désinscription. Un message commercial sans ces deux mentions est
 *     attaquable en France, indépendamment du consentement recueilli.
 */

import type { MailMessage } from "@/lib/mailer";
import { formatCents } from "@/lib/cart";
import {
  campaignTypeDefinition,
  renderTemplate,
  type CampaignLocale,
  type CampaignType,
  type DiscountKind,
  type TemplateVariable,
} from "@/lib/campaigns";
import { siteUrl } from "@/server/emails/customerAccount";

const LOGO_WIDTH = 220;
// Rapport d'origine du fichier : 747 × 162
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 162) / 747);

/**
 * Identification du fournisseur reprise de src/content/legal/fr.ts.
 *
 * Recopiée ici et non importée : ce module ne doit dépendre d'aucun contenu de
 * page. Toute modification doit donc être répercutée ici EN MÊME TEMPS que dans
 * les pages légales — voir docs/LEGAL.md.
 */
const IMPRESSUM = {
  name: "MLC BOIS",
  street: "27 Grande Rue",
  city: "21700 Villebichot",
  country: "France",
  managingDirector: "Prénom Nom (à compléter)",
  register: "RCS Dijon 990 527 871",
  vatId: "FR71990527871",
} as const;

// ---- Entrées ----

export interface CampaignMailCampaign {
  id: string;
  code: string;
  type: CampaignType;
  subject: string;
  headline: string;
  bodyText: string;
  ctaLabel: string;
  subjectEn: string;
  headlineEn: string;
  bodyTextEn: string;
  ctaLabelEn: string;
  discountKind: DiscountKind;
  discountValue: number;
  endsAt: Date;
  landingSlug: string;
}

export interface CampaignMailProduct {
  name: string;
  brand: string;
  image: string;
  /** Prix de référence figé à l'entrée dans la campagne, affiché barré. */
  basePriceCents: number;
  /** Prix remisé, déjà calculé par l'appelant avec `discountedPriceCents()`. */
  priceCents: number;
  /** Chemin de la fiche produit, par ex. « /kuechengeraete/kuehlschraenke/xyz ». */
  path: string;
}

export interface CampaignMailRecipient {
  token: string;
  firstName: string;
  locale: CampaignLocale;
}

export interface CampaignMailInput {
  campaign: CampaignMailCampaign;
  products: readonly CampaignMailProduct[];
  recipient: CampaignMailRecipient;
}

// ---- Outils de rendu ----

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Repli français quand la variante anglaise est vide. Règle appliquée partout
 * dans la boutique : une traduction manquante n'efface jamais le contenu.
 */
function pick(fr: string, en: string, locale: CampaignLocale): string {
  if (locale === "en") return en.trim() || fr.trim();
  return fr.trim();
}

/**
 * Rattrape les blancs laissés par une variable vide.
 *
 * Les modèles écrivent « Bonjour {prenom}, ». Sans prénom, le rendu brut donne
 * « Bonjour  , » : la formule neutre attendue est « Bonjour, ». On recolle donc la
 * ponctuation et on écrase les espaces doubles, plutôt que de prévoir une
 * seconde version de chaque modèle.
 */
function tidy(value: string): string {
  return value
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/** Une image de catalogue peut être relative : un message doit tout porter en absolu. */
function absoluteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${siteUrl()}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/** Lien de suivi du destinataire. Toute sortie du message passe par là. */
function clickUrl(token: string, path?: string): string {
  const base = `${siteUrl()}/c/${token}`;
  // La destination voulue voyage en paramètre : la route /c sait ainsi vers
  // quelle fiche renvoyer quand la campagne porte plusieurs produits. Si elle
  // l'ignore, le client atterrit simplement sur la page d'action — le clic
  // reste compté dans les deux cas.
  if (!path) return base;
  return `${base}?ziel=${encodeURIComponent(path)}`;
}

function pixelUrl(token: string): string {
  return `${siteUrl()}/p/${token}`;
}

function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/desinscription/${token}`;
}

/** « -20 % », « -99,80 € » ou la mention de livraison offerte. */
function discountLabel(kind: DiscountKind, value: number, locale: CampaignLocale): string {
  switch (kind) {
    case "percent":
      return `-${Math.round(value)} %`;
    case "amount":
      return `-${formatCents(Math.round(value))}`;
    case "free_shipping":
      return locale === "en" ? "Free shipping" : "Livraison offerte";
    case "none":
      return "";
  }
}

/**
 * Date de fin dans la langue du destinataire, toujours à l'heure de Paris :
 * l'offre s'arrête à l'heure de la boutique, pas à celle du serveur.
 */
function formatEndDate(date: Date, locale: CampaignLocale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(date);
}

/** Durée restante annoncée : « 48 heures », « 3 jours », « 12 hours ». */
function remainingLabel(endsAt: Date, locale: CampaignLocale, now: Date): string {
  const milliseconds = endsAt.getTime() - now.getTime();
  if (milliseconds <= 0) return locale === "en" ? "a few hours" : "quelques heures";

  const hours = Math.ceil(milliseconds / 3_600_000);
  if (hours < 48) {
    if (locale === "en") return hours === 1 ? "1 hour" : `${hours} hours`;
    return hours === 1 ? "1 heure" : `${hours} heures`;
  }

  const days = Math.ceil(hours / 24);
  return locale === "en" ? `${days} days` : `${days} jours`;
}

/** Prix barré puis prix remisé, ou prix seul quand la remise ne touche pas l'article. */
function priceHtml(product: CampaignMailProduct): string {
  const base = escapeHtml(formatCents(product.basePriceCents));
  if (product.priceCents >= product.basePriceCents) {
    return `<span style="font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#001424;">${base}</span>`;
  }
  const promo = escapeHtml(formatCents(product.priceCents));
  return (
    `<span style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#6b7280; text-decoration:line-through;">${base}</span>` +
    `&nbsp;&nbsp;` +
    `<span style="font-family:Arial,Helvetica,sans-serif; font-size:18px; font-weight:bold; color:#c24400;">${promo}</span>`
  );
}

function priceText(product: CampaignMailProduct, locale: CampaignLocale): string {
  const base = formatCents(product.basePriceCents);
  if (product.priceCents >= product.basePriceCents) return base;
  const promo = formatCents(product.priceCents);
  return locale === "en" ? `${promo} instead of ${base}` : `${promo} statt ${base}`;
}

function productCardHtml(product: CampaignMailProduct, token: string): string {
  const url = escapeHtml(clickUrl(token, product.path));
  const image = absoluteUrl(product.image);
  const name = escapeHtml(product.name);
  const brand = escapeHtml(product.brand);

  const picture = image
    ? `<a href="${url}" style="text-decoration:none;"><img src="${escapeHtml(image)}" alt="${brand} ${name}" width="112" style="display:block; width:112px; height:auto; border:0; outline:none; text-decoration:none;" /></a>`
    : "&nbsp;";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0; border:1px solid #e0e2e6; border-radius:6px; background-color:#ffffff;">
                  <tr>
                    <td width="144" valign="top" align="center" style="background-color:#ffffff; padding:16px; border-radius:6px 0 0 6px;">${picture}</td>
                    <td valign="top" style="background-color:#ffffff; padding:16px 16px 16px 0;">
                      <p style="margin:0 0 4px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:18px; font-weight:bold; text-transform:uppercase; letter-spacing:0.4px; color:#6b7280;">${brand}</p>
                      <p style="margin:0 0 10px 0; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:22px; color:#001424;"><a href="${url}" style="color:#001424; text-decoration:none;">${name}</a></p>
                      <p style="margin:0;">${priceHtml(product)}</p>
                    </td>
                  </tr>
                </table>`;
}

// ---- Message complet ----

/**
 * Compose le message d'un destinataire précis.
 *
 * Rien n'est mutualisé entre destinataires : le jeton apparaît dans le lien
 * d'action, dans le pixel et dans le lien de désinscription, donc chaque
 * message est unique. C'est ce qui rend le suivi possible, et accessoirement ce
 * qui évite qu'un filtre traite mille messages identiques comme un publipostage.
 */
export function buildCampaignEmail(input: CampaignMailInput): Omit<MailMessage, "to"> {
  const { campaign, products, recipient } = input;
  const locale = recipient.locale;
  const isEnglish = locale === "en";
  const now = new Date();

  const definition = campaignTypeDefinition(campaign.type);
  const fallback = isEnglish ? definition.en : definition.fr;

  // Le produit de tête alimente les variables du sujet et du corps : un objet
  // parle d'un article, pas d'une liste.
  const lead = products[0];

  const values: Partial<Record<TemplateVariable, string>> = {
    prenom: recipient.firstName.trim(),
    produit: lead?.name ?? "",
    marque: lead?.brand ?? "",
    prix: lead ? formatCents(lead.basePriceCents) : "",
    prix_promo: lead ? formatCents(lead.priceCents) : "",
    remise: discountLabel(campaign.discountKind, campaign.discountValue, locale),
    fin: formatEndDate(campaign.endsAt, locale),
    duree: remainingLabel(campaign.endsAt, locale, now),
  };

  const subject = tidy(
    renderTemplate(pick(campaign.subject, campaign.subjectEn, locale) || fallback.subject, values),
  );
  const headline = tidy(
    renderTemplate(pick(campaign.headline, campaign.headlineEn, locale) || fallback.headline, values),
  );
  const bodyText = tidy(
    renderTemplate(pick(campaign.bodyText, campaign.bodyTextEn, locale) || fallback.bodyText, values),
  );
  const ctaLabel = tidy(
    renderTemplate(pick(campaign.ctaLabel, campaign.ctaLabelEn, locale) || fallback.ctaLabel, values),
  );

  const action = clickUrl(recipient.token);
  const legalUrl = `${siteUrl()}${isEnglish ? "/en" : ""}/mentions-legales`;
  const privacyUrl = `${siteUrl()}${isEnglish ? "/en" : ""}/confidentialite`;
  const optOutUrl = unsubscribeUrl(recipient.token);

  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => escapeHtml(block).replace(/\n/g, "<br />"));

  return {
    subject,
    html: renderHtml({
      locale,
      headline,
      paragraphs,
      ctaLabel,
      action,
      products,
      token: recipient.token,
      legalUrl,
      privacyUrl,
      optOutUrl,
    }),
    text: renderText({
      locale,
      headline,
      bodyText,
      ctaLabel,
      action,
      products,
      legalUrl,
      privacyUrl,
      optOutUrl,
    }),
  };
}

interface RenderInput {
  locale: CampaignLocale;
  headline: string;
  ctaLabel: string;
  action: string;
  products: readonly CampaignMailProduct[];
  legalUrl: string;
  privacyUrl: string;
  optOutUrl: string;
}

function renderHtml(input: RenderInput & { paragraphs: string[]; token: string }): string {
  const isEnglish = input.locale === "en";
  const logo = `${siteUrl()}/images/logo-full.png`;

  const body = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:24px; color:#3f4854;">${paragraph}</p>`,
    )
    .join("\n                ");

  const button = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
                  <tr>
                    <td align="center" bgcolor="#c24400" style="background-color:#c24400; border-radius:4px;">
                      <a href="${escapeHtml(input.action)}" style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">${escapeHtml(input.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>`;

  const cards = input.products.map((product) => productCardHtml(product, input.token)).join("\n                ");

  const identity = [
    IMPRESSUM.name,
    IMPRESSUM.street,
    IMPRESSUM.city,
    IMPRESSUM.country,
  ].join(" &middot; ");
  const identityDetail = [
    isEnglish
      ? `Managing director: ${IMPRESSUM.managingDirector}`
      : `Président : ${IMPRESSUM.managingDirector}`,
    IMPRESSUM.register,
    isEnglish ? `VAT ID: ${IMPRESSUM.vatId}` : `TVA intracommunautaire : ${IMPRESSUM.vatId}`,
  ].join(" &middot; ");

  const optOutLabel = isEnglish
    ? "No longer want to receive offers? Unsubscribe"
    : "Ne plus recevoir nos offres ? Se désinscrire";

  return `<!doctype html>
<html lang="${input.locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(input.headline)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f2f4; color-scheme:light;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(input.headline)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f2f4;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; background-color:#ffffff; border:1px solid #e0e2e6; border-radius:6px;">
            <tr>
              <td align="center" style="background-color:#ffffff; padding:32px 24px 24px 24px; border-radius:6px 6px 0 0;">
                <img src="${logo}" alt="MLC Bois — bois de chauffage" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display:block; width:${LOGO_WIDTH}px; height:auto; border:0; outline:none; text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ff5c00; font-size:0; line-height:0; height:4px;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:22px; line-height:30px; font-weight:bold; color:#001424;">${escapeHtml(input.headline)}</h1>
                ${body}
                ${button}
                ${cards}
                <img src="${escapeHtml(pixelUrl(input.token))}" width="1" height="1" alt="" style="display:block; width:1px; height:1px; border:0;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; padding:0 32px 32px 32px;">&nbsp;</td>
            </tr>
          </table>

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
            <tr>
              <td align="center" style="padding:20px 16px 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:18px; color:#6b7280;">
                ${identity}<br />
                ${identityDetail}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 16px 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:18px; color:#6b7280;">
                <a href="${escapeHtml(input.legalUrl)}" style="color:#6b7280; text-decoration:underline;">${isEnglish ? "Legal notice" : "Mentions légales"}</a>
                &nbsp;&middot;&nbsp;
                <a href="${escapeHtml(input.privacyUrl)}" style="color:#6b7280; text-decoration:underline;">${isEnglish ? "Privacy policy" : "Politique de confidentialité"}</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 16px 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:18px; color:#9aa1ab;">
                <a href="${escapeHtml(input.optOutUrl)}" style="color:#9aa1ab; text-decoration:underline;">${escapeHtml(optOutLabel)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Version texte. Elle doit se suffire à elle-même : certains clients de
 * messagerie n'affichent jamais le HTML, et un message sans partie texte
 * lisible est un signal de spam à lui seul. Les URL y figurent en entier.
 */
function renderText(input: RenderInput & { bodyText: string }): string {
  const isEnglish = input.locale === "en";

  const lines: string[] = [input.headline, "", input.bodyText, "", `${input.ctaLabel}: ${input.action}`];

  if (input.products.length > 0) {
    lines.push("");
    for (const product of input.products) {
      lines.push(`- ${product.brand} ${product.name} — ${priceText(product, input.locale)}`);
    }
  }

  lines.push(
    "",
    "---",
    `${IMPRESSUM.name}, ${IMPRESSUM.street}, ${IMPRESSUM.city}, ${IMPRESSUM.country}`,
    isEnglish
      ? `Managing director: ${IMPRESSUM.managingDirector} — ${IMPRESSUM.register} — VAT ID: ${IMPRESSUM.vatId}`
      : `Président : ${IMPRESSUM.managingDirector} — ${IMPRESSUM.register} — TVA intracommunautaire : ${IMPRESSUM.vatId}`,
    `${isEnglish ? "Legal notice" : "Mentions légales"} : ${input.legalUrl}`,
    `${isEnglish ? "Privacy policy" : "Politique de confidentialité"} : ${input.privacyUrl}`,
    "",
    isEnglish
      ? `No longer want to receive offers? Unsubscribe: ${input.optOutUrl}`
      : `Ne plus recevoir nos offres ? Se désinscrire : ${input.optOutUrl}`,
  );

  return lines.join("\n");
}
