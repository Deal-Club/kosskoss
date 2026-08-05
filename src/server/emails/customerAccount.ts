/**
 * Gabarits des e-mails de l'espace client.
 *
 * Mêmes contraintes que src/server/emails/adminOtp.ts : mise en page en
 * tableaux, styles en ligne, `color-scheme: light` pour empêcher l'inversion
 * automatique des couleurs, fonds déclarés sur chaque cellule.
 *
 * Ces messages partent vers des clients : ils sont rédigés en français, avec
 * une version anglaise complète choisie d'après la langue du compte.
 */

import type { MailMessage } from "@/lib/mailer";

export type EmailLocale = "fr" | "en";

const LOGO_WIDTH = 220;
// Rapport d'origine du fichier : 747 × 162
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 162) / 747);

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LayoutInput {
  locale: EmailLocale;
  preheader: string;
  heading: string;
  /** Paragraphes déjà échappés côté appelant si besoin. */
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
}

/** Ossature commune : logo, filet rouge, contenu, pied de page. */
function layout(input: LayoutInput): string {
  const logo = `${siteUrl()}/images/logo-full.png`;
  const lang = input.locale;
  const footer =
    lang === "en"
      ? "MLC Bois — automated message, please do not reply."
      : "MLC Bois — message automatique, merci de ne pas y répondre.";

  const body = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:24px; color:#3f4854;">${paragraph}</p>`,
    )
    .join("\n");

  const action = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px 0;">
                  <tr>
                    <td align="center" bgcolor="#c24400" style="background-color:#c24400; border-radius:4px;">
                      <a href="${escapeHtml(input.action.url)}" style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">${escapeHtml(input.action.label)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:20px; color:#4b5563; word-break:break-all;">${escapeHtml(input.action.url)}</p>`
    : "";

  const footnote = input.footnote
    ? `<p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:21px; color:#4b5563;">${input.footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f2f4; color-scheme:light;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(input.preheader)}</div>

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
                <h1 style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:20px; line-height:28px; font-weight:bold; color:#001424;">${escapeHtml(input.heading)}</h1>
                ${body}
                ${action}
                ${footnote}
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; padding:0 32px 32px 32px;">&nbsp;</td>
            </tr>
          </table>

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
            <tr>
              <td align="center" style="padding:20px 16px 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:20px; color:#4b5563;">
                ${escapeHtml(footer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---- Réinitialisation du mot de passe ----

export interface PasswordResetEmailInput {
  locale: EmailLocale;
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): Omit<MailMessage, "to"> {
  const name = escapeHtml(input.firstName);
  const fr = input.locale === "fr";

  const heading = fr ? "Réinitialiser votre mot de passe" : "Reset your password";
  const paragraphs = fr
    ? [
        `Bonjour ${name},`,
        "une réinitialisation du mot de passe a été demandée pour votre compte client. Le lien ci-dessous vous permet d'en choisir un nouveau.",
      ]
    : [
        `Hello ${name},`,
        "a password reset was requested for your customer account. Use the link below to choose a new password.",
      ];

  const footnote = fr
    ? `Le lien est valable ${input.expiresInMinutes} minutes et ne peut servir qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe reste inchangé.`
    : `The link is valid for ${input.expiresInMinutes} minutes and can be used only once. If you did not request the reset, simply ignore this email — your password stays unchanged.`;

  const html = layout({
    locale: input.locale,
    preheader: fr
      ? "Nouveau mot de passe pour votre compte client"
      : "New password for your customer account",
    heading,
    paragraphs,
    action: {
      label: fr ? "Choisir un nouveau mot de passe" : "Choose a new password",
      url: input.resetUrl,
    },
    footnote: escapeHtml(footnote),
  });

  const text = [
    heading,
    "",
    ...(fr
      ? [
          `Bonjour ${input.firstName},`,
          "une réinitialisation du mot de passe a été demandée pour votre compte client.",
        ]
      : [
          `Hello ${input.firstName},`,
          "a password reset was requested for your customer account.",
        ]),
    "",
    input.resetUrl,
    "",
    footnote,
  ].join("\n");

  return { subject: fr ? "Réinitialiser votre mot de passe" : "Reset your password", html, text };
}

// ---- Confirmation d'inscription ----

export interface WelcomeEmailInput {
  locale: EmailLocale;
  firstName: string;
}

export function buildWelcomeEmail(input: WelcomeEmailInput): Omit<MailMessage, "to"> {
  const name = escapeHtml(input.firstName);
  const fr = input.locale === "fr";
  const url = `${siteUrl()}${fr ? "" : "/en"}/compte/connexion`;

  const heading = fr ? "Votre compte client est créé" : "Your customer account is ready";
  const paragraphs = fr
    ? [
        `Bonjour ${name},`,
        "votre compte client MLC Bois a été créé. Vous pouvez dès maintenant vous connecter, consulter vos commandes et gérer vos adresses.",
      ]
    : [
        `Hello ${name},`,
        "your MLC Bois customer account has been created. You can sign in right away to review your orders and manage your addresses.",
      ];

  const footnote = fr
    ? "Le compte est facultatif : vous pouvez à tout moment commander en tant qu'invité. Vous pouvez également supprimer vous-même votre compte et toutes les données qu'il contient."
    : "An account is always optional: you can order as a guest at any time. You can delete your account and its data yourself whenever you want.";

  const html = layout({
    locale: input.locale,
    preheader: heading,
    heading,
    paragraphs,
    action: { label: fr ? "Accéder à mon compte" : "Go to my account", url },
    footnote: escapeHtml(footnote),
  });

  const text = [heading, "", ...paragraphs.map((p) => p.replace(/&[a-z]+;/g, "")), "", url, "", footnote].join(
    "\n",
  );

  return { subject: heading, html, text };
}

// ---- Tentative d'inscription sur une adresse déjà utilisée ----
// Envoyé au titulaire du compte existant : la réponse HTTP, elle, reste
// strictement identique à celle d'une inscription réussie, pour qu'un tiers ne
// puisse pas découvrir quelles adresses sont enregistrées (OWASP, énumération
// de comptes).

export function buildExistingAccountEmail(input: WelcomeEmailInput): Omit<MailMessage, "to"> {
  const name = escapeHtml(input.firstName);
  const fr = input.locale === "fr";
  const url = `${siteUrl()}${fr ? "" : "/en"}/compte/mot-de-passe-oublie`;

  const heading = fr ? "Un compte existe déjà" : "An account already exists";
  const paragraphs = fr
    ? [
        `Bonjour ${name},`,
        "quelqu'un vient d'essayer de créer un compte client avec votre adresse e-mail. Un compte existe déjà pour cette adresse : aucun second compte n'a donc été créé.",
        "S'il s'agissait de vous et que vous ne vous souvenez plus de votre mot de passe, réinitialisez-le simplement.",
      ]
    : [
        `Hello ${name},`,
        "someone just tried to create a new customer account with your email address. An account already exists for it, so no second one was created.",
        "If that was you and you no longer remember your password, simply reset it.",
      ];

  const footnote = fr
    ? "Si ce n'était pas vous, vous n'avez rien à faire. Votre compte et votre mot de passe n'ont pas été modifiés."
    : "If this was not you, no action is needed. Your account and password have not been changed.";

  const html = layout({
    locale: input.locale,
    preheader: heading,
    heading,
    paragraphs,
    action: { label: fr ? "Réinitialiser le mot de passe" : "Reset password", url },
    footnote: escapeHtml(footnote),
  });

  const text = [heading, "", ...paragraphs, "", url, "", footnote].join("\n");

  return { subject: heading, html, text };
}
