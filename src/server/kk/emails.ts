import { sendMail, isMailConfigured } from "@/lib/mailer";
import { formatFcfa } from "@/lib/kk/format";
import { BRAND } from "@/config/brand";

const DEEP = "#0f3b46";
const SAND = "#f3e8dd";

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#faf6f0;font-family:Arial,Helvetica,sans-serif;color:#123138">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="text-align:center;padding:20px 0">
      <span style="font-size:20px;letter-spacing:4px;color:${DEEP};font-weight:bold">KOSSKOSS</span>
      <span style="display:block;font-size:10px;letter-spacing:6px;color:${DEEP};opacity:.7">SELECT</span>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 12px;font-size:22px;color:${DEEP}">${title}</h1>
      ${inner}
    </div>
    <p style="text-align:center;color:#6a7a7d;font-size:12px;margin-top:20px">
      ${BRAND.name} · ${BRAND.slogan}
    </p>
  </div></body></html>`;
}

type OrderEmailInput = {
  to: string;
  firstName: string;
  orderNumber: string;
  items: { brand: string; name: string; variantLabel: string; quantity: number; lineTotalCents: number }[];
  totalFcfa: number;
};

/** Confirmation de commande (best-effort : ne bloque jamais la commande). */
export async function sendOrderConfirmationEmail(input: OrderEmailInput): Promise<void> {
  if (!isMailConfigured()) return;
  const rows = input.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.brand} ${i.name}${
          i.variantLabel ? ` · ${i.variantLabel}` : ""
        } × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatFcfa(
          i.lineTotalCents,
        )}</td></tr>`,
    )
    .join("");
  const inner = `
    <p style="margin:0 0 16px">Bonjour ${input.firstName || ""}, merci pour votre commande !</p>
    <p style="margin:0 0 16px;color:#6a7a7d">Commande <strong style="color:${DEEP}">${input.orderNumber}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
      <tr><td style="padding:12px 0;font-weight:bold">Total</td><td style="padding:12px 0;text-align:right;font-weight:bold">${formatFcfa(
        input.totalFcfa,
      )}</td></tr>
    </table>
    <div style="background:${SAND};border-radius:12px;padding:16px;margin-top:20px;font-size:14px">
      Le paiement Mobile Money et la livraison sont ensuite coordonnés avec vous via WhatsApp.
    </div>`;
  const text = `Merci pour votre commande ${input.orderNumber}. Total : ${formatFcfa(
    input.totalFcfa,
  )}. Le paiement et la livraison sont coordonnés via WhatsApp.`;
  try {
    await sendMail({ to: input.to, subject: `Votre commande ${input.orderNumber} — ${BRAND.name}`, html: shell("Merci pour votre commande !", inner), text });
  } catch {
    /* best-effort */
  }
}

/** E-mail d'accès à l'espace client (compte créé à l'opt-in). */
export async function sendAccountAccessEmail(to: string, firstName: string, tempPassword: string): Promise<void> {
  if (!isMailConfigured()) return;
  const inner = `
    <p style="margin:0 0 16px">Bonjour ${firstName || ""}, votre espace client a été créé.</p>
    <p style="margin:0 0 8px">Vos identifiants de connexion :</p>
    <table style="font-size:14px;margin:0 0 16px">
      <tr><td style="color:#6a7a7d;padding:2px 12px 2px 0">E-mail</td><td><strong>${to}</strong></td></tr>
      <tr><td style="color:#6a7a7d;padding:2px 12px 2px 0">Mot de passe</td><td><strong>${tempPassword}</strong></td></tr>
    </table>
    <p style="margin:0;color:#6a7a7d;font-size:13px">Pensez à changer ce mot de passe depuis votre espace client.</p>`;
  const text = `Votre espace client KossKoss Select. E-mail : ${to} — Mot de passe : ${tempPassword}. Changez-le après connexion.`;
  try {
    await sendMail({ to, subject: `Votre espace client — ${BRAND.name}`, html: shell("Bienvenue chez KossKoss Select", inner), text });
  } catch {
    /* best-effort */
  }
}
