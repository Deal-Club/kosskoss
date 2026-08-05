/**
 * Gabarit de l'e-mail contenant le code de connexion au back-office.
 *
 * Contraintes propres à l'e-mail, respectées ici :
 * - mise en page en tableaux et styles en ligne (Outlook ignore le CSS externe
 *   et la plupart des propriétés modernes) ;
 * - `color-scheme: light` + `supported-color-schemes: light` pour empêcher
 *   Apple Mail et Outlook d'inverser automatiquement les couleurs — le logo est
 *   sombre sur fond transparent, une inversion le rendrait illisible ;
 * - couleurs de fond déclarées explicitement sur chaque cellule, jamais héritées ;
 * - contrastes vérifiés sur fond blanc : texte principal #001424 (≈ 17:1),
 *   texte secondaire #3f4854 (≈ 9:1), mention d'alerte #b3000b (≈ 7:1),
 *   pied de page #4b5563 sur #f1f2f4 (≈ 6,6:1). Tous au-dessus du seuil AA.
 * - l'orange de la marque, #ff5c00, ne tient que 3,1:1 sur blanc : il est
 *   réservé au filet décoratif sous le logo. Partout où il porte du texte,
 *   c'est sa version assombrie #c24400 (≈ 5,1:1) qui est employée.
 */

import type { MailMessage } from "@/lib/mailer";

const LOGO_WIDTH = 220;
// Rapport d'origine du fichier : 747 × 162
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 162) / 747);

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface AdminOtpEmailInput {
  code: string;
  name: string;
  expiresInMinutes: number;
}

export function buildAdminOtpEmail(input: AdminOtpEmailInput): Omit<MailMessage, "to"> {
  const { code, name, expiresInMinutes } = input;
  const logo = `${siteUrl()}/images/logo-full.png`;
  const safeName = escapeHtml(name);

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Code de connexion</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f2f4; color-scheme:light;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Votre code de connexion : ${code}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f2f4;">
      <tr>
        <td align="center" style="padding:32px 16px;">

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%; background-color:#ffffff; border:1px solid #e0e2e6; border-radius:6px;">

            <!-- Le logo reste sur fond blanc : le lettrage est presque noir,
                 il disparaîtrait sur un bandeau sombre. -->
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
                <h1 style="margin:0 0 16px 0; font-family:Arial,Helvetica,sans-serif; font-size:20px; line-height:28px; font-weight:bold; color:#001424;">
                  Votre code de connexion
                </h1>
                <p style="margin:0 0 24px 0; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:24px; color:#3f4854;">
                  Bonjour ${safeName},<br />
                  Saisissez ce code sur la page de connexion pour terminer votre accès à l'administration.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="background-color:#ffffff; padding:0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f7f8f9; border:1px solid #d6d9de; border-radius:6px;">
                  <tr>
                    <td align="center" style="padding:24px 16px;">
                      <div style="font-family:'Courier New',Courier,monospace; font-size:34px; line-height:42px; font-weight:bold; letter-spacing:6px; color:#001424;">
                        ${code}
                      </div>
                      <div style="margin-top:8px; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:20px; color:#4b5563;">
                        Valable ${expiresInMinutes} minutes
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background-color:#ffffff; padding:24px 32px 32px 32px;">
                <p style="margin:0 0 12px 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:22px; color:#b3000b; font-weight:bold;">
                  Ne communiquez ce code à personne.
                </p>
                <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:22px; color:#3f4854;">
                  Si vous n'êtes pas à l'origine de cette connexion, ignorez ce message et changez votre mot de passe :
                  quelqu'un connaît vos identifiants.
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
            <tr>
              <td align="center" style="padding:20px 16px 0 16px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:20px; color:#4b5563;">
                MLC Bois — message automatique, merci de ne pas y répondre.
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Votre code de connexion à l'administration MLC Bois",
    "",
    `Bonjour ${name},`,
    "Saisissez ce code sur la page de connexion pour terminer votre accès à l'administration.",
    "",
    `Code : ${code}`,
    `Valable ${expiresInMinutes} minutes.`,
    "",
    "Ne communiquez ce code à personne.",
    "Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe.",
  ].join("\n");

  return {
    subject: `Code de connexion : ${code}`,
    html,
    text,
  };
}
