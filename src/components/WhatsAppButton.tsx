import { COMPANY } from "@/content/legal";

/**
 * Bouton d'appel WhatsApp, fixé en bas à gauche de toutes les pages boutique.
 *
 * Le numéro par défaut est celui de la société (COMPANY.phone) ; il peut être
 * remplacé par une ligne WhatsApp dédiée via NEXT_PUBLIC_WHATSAPP_NUMBER
 * (chiffres uniquement, au format international, ex. « 33635013557 »).
 * Smartsupp occupant le coin bas-droite, WhatsApp prend le coin opposé.
 */
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ||
  COMPANY.phone.replace(/\D/g, "");

const PREFILL = encodeURIComponent("Bonjour, j'ai une question sur une commande de bois.");

export function WhatsAppButton() {
  if (!WHATSAPP_NUMBER) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${PREFILL}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous contacter sur WhatsApp"
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.257.59 4.463 1.712 6.41L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.234 1.588h.005c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.332-6.635-3.75-9.053A12.72 12.72 0 0 0 16.004 3.2zm0 2.133c2.848 0 5.523 1.11 7.537 3.124a10.58 10.58 0 0 1 3.126 7.543c0 5.885-4.788 10.667-10.668 10.667h-.004a10.6 10.6 0 0 1-5.4-1.48l-.387-.23-4.003 1.05 1.068-3.903-.252-.4a10.57 10.57 0 0 1-1.62-5.637c0-5.885 4.787-10.667 10.667-10.667zm-5.83 5.74c-.276 0-.724.104-1.104.518-.38.414-1.45 1.417-1.45 3.457 0 2.04 1.485 4.01 1.692 4.287.207.276 2.92 4.46 7.078 6.253.99.427 1.762.682 2.365.873.993.316 1.897.271 2.612.164.797-.119 2.454-1.003 2.8-1.972.345-.97.345-1.8.242-1.972-.104-.173-.38-.276-.795-.483-.414-.207-2.454-1.212-2.834-1.35-.38-.14-.656-.207-.932.207-.276.414-1.07 1.35-1.312 1.627-.242.276-.483.31-.897.104-.414-.207-1.75-.645-3.332-2.057-1.232-1.099-2.064-2.456-2.306-2.87-.242-.414-.026-.638.181-.844.187-.186.414-.483.622-.725.207-.242.276-.414.414-.69.138-.276.07-.518-.035-.725-.104-.207-.913-2.257-1.283-3.086-.318-.712-.646-.73-.932-.742a13.9 13.9 0 0 0-.275-.005z" />
      </svg>
    </a>
  );
}
