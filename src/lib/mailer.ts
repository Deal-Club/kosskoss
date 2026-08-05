/**
 * Envoi d'e-mails transactionnels par SMTP (boîte Hostinger de la boutique).
 *
 * Variables d'environnement :
 *   SMTP_HOST       serveur d'envoi, ex. "smtp.hostinger.com"
 *   SMTP_PORT       465 (SSL implicite) ou 587 (STARTTLS)
 *   SMTP_USER       adresse complète du compte, ex. "contact@mlc-bois.fr"
 *   SMTP_PASSWORD   mot de passe de cette boîte
 *   MAIL_FROM       adresse expéditrice (défaut : SMTP_USER)
 *   MAIL_FROM_NAME  nom affiché (facultatif, défaut « MLC Bois »)
 *
 * Tant que la configuration est incomplète, `isMailConfigured()` renvoie false :
 * en développement le code de connexion est alors affiché dans la console au
 * lieu d'être envoyé, ce qui évite de bloquer le back-office en local.
 *
 * L'expéditeur doit rester une adresse de la boîte authentifiée. Écrire au nom
 * d'un autre domaine ferait échouer SPF et DKIM, et le message partirait droit
 * en indésirable — quand le serveur ne le refuse pas d'emblée.
 */
import nodemailer, { type Transporter } from "nodemailer";

const DEFAULT_FROM_NAME = "MLC Bois";

/** Fichier joint au message, transmis tel quel à nodemailer. */
export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Facture PDF de la confirmation de commande, le cas échéant. */
  attachments?: MailAttachment[];
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

function readSettings(): SmtpSettings | null {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const password = process.env.SMTP_PASSWORD?.trim() ?? "";
  if (!host || !user || !password) return null;

  return {
    host,
    // 465 par défaut : c'est le port SSL, celui que Hostinger recommande.
    port: Number(process.env.SMTP_PORT?.trim() || 465),
    user,
    password,
    // Sans MAIL_FROM explicite, on expédie depuis le compte authentifié.
    from: process.env.MAIL_FROM?.trim() || user,
  };
}

export function isMailConfigured(): boolean {
  return readSettings() !== null;
}

function formatSender(settings: SmtpSettings): string {
  const name = process.env.MAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME;
  return `"${name}" <${settings.from}>`;
}

/**
 * Le transporteur est réutilisé d'un envoi à l'autre : ouvrir une connexion
 * SMTP par message coûterait une poignée de main TLS à chaque fois, et les
 * campagnes en enchaînent des dizaines.
 */
let transporter: Transporter | null = null;
let transporterKey = "";

function getTransporter(settings: SmtpSettings): Transporter {
  const key = `${settings.host}:${settings.port}:${settings.user}`;
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    // 465 chiffre dès la connexion ; les autres ports montent en TLS ensuite.
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.password },
    // Un envoi bloqué ne doit pas retenir une requête HTTP indéfiniment.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  transporterKey = key;
  return transporter;
}

/**
 * Envoie un message. Lève une erreur si le serveur refuse, pour que l'appelant
 * puisse répondre autre chose qu'un faux « code envoyé ».
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const settings = readSettings();
  if (!settings) {
    throw new Error("SMTP_HOST, SMTP_USER ou SMTP_PASSWORD n'est pas configuré.");
  }

  await getTransporter(settings).sendMail({
    from: formatSender(settings),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.attachments?.length ? { attachments: message.attachments } : {}),
    // Les réponses arrivent dans la boîte de la boutique, pas dans le vide.
    replyTo: settings.from,
  });
}

/**
 * Ouvre une connexion et s'authentifie, sans envoyer de message. Sert au
 * diagnostic : distingue « identifiants refusés » de « message refusé ».
 */
export async function verifyMailConnection(): Promise<void> {
  const settings = readSettings();
  if (!settings) {
    throw new Error("SMTP_HOST, SMTP_USER ou SMTP_PASSWORD n'est pas configuré.");
  }
  await getTransporter(settings).verify();
}
