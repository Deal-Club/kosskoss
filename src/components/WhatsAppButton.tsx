import { COMPANY } from "@/content/legal";

/**
 * Bouton d'appel WhatsApp, fixé en bas à droite de toutes les pages boutique.
 *
 * Le numéro par défaut est celui de la société (COMPANY.phone) ; il peut être
 * remplacé par une ligne WhatsApp dédiée via NEXT_PUBLIC_WHATSAPP_NUMBER
 * (chiffres uniquement, au format international, ex. « 33635013557 »).
 */
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ||
  COMPANY.phone.replace(/\D/g, "");

const PREFILL = encodeURIComponent("Bonjour, j'ai une question sur un produit KossKoss Select.");

/**
 * Le glyphe OFFICIEL de WhatsApp.
 *
 * Celui d'avant était redessiné à la main : la bulle et le combiné y étaient
 * approximés, et à 28 px l'écart se voyait — combiné trop épais, bulle trop
 * fine, queue mal raccordée. Un logo de marque ne se redessine pas de mémoire ;
 * on sert le tracé de référence (simple-icons, identique au mark officiel), qui
 * est un chemin unique conçu pour être rempli d'une seule couleur.
 *
 * lucide-react v1 a retiré ses icônes de marque pour des raisons d'usage des
 * marques déposées — d'où ce tracé posé ici plutôt qu'un import.
 */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function WhatsAppButton() {
  if (!WHATSAPP_NUMBER) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${PREFILL}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      // Coin bas-DROITE, et au ras du bord.
      //
      // Il a longtemps été à gauche, pour laisser le coin droit à Smartsupp.
      // Ce partage coûtait cher sur mobile : le coin bas-gauche est le DÉBUT
      // de chaque ligne de texte. Relevé au balayage de la page d'accueil sur
      // un écran de 390 px, 42 blocs distincts passaient sous le bouton au fil
      // du défilement. À droite, il ne recouvre que des fins de ligne, presque
      // toujours vides.
      //
      // La cohabitation avec Smartsupp se règle à la verticale : ce bouton
      // garde le ras du coin, le lanceur Smartsupp se place au-dessus (voir
      // `SmartsuppLauncher`).
      //
      // Le retrait intègre la zone sûre de l'écran, sans quoi il se coince
      // derrière la barre gestuelle iOS.
      className={[
        "group fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-40",
        "flex h-14 items-center rounded-full bg-[#25D366] text-white",
        // Anneau blanc translucide : le bouton se pose souvent sur une
        // photographie de peau, dont les tons chauds affaiblissent le contour
        // du disque vert. L'anneau le détache quel que soit le fond.
        "ring-1 ring-white/25",
        // Ombre TEINTÉE du vert de la marque plutôt qu'un `shadow-lg` gris :
        // une ombre neutre sous un aplat saturé se lit comme une salissure.
        "shadow-[0_10px_28px_-8px_rgba(37,211,102,0.65)]",
        "transition-[box-shadow,transform] duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-8px_rgba(37,211,102,0.75)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep",
      ].join(" ")}
    >
      {/* Le disque garde toujours ses 56 px : c'est la cible tactile, elle ne
          doit pas dépendre de l'état de survol. */}
      <span className="grid h-14 w-14 shrink-0 place-items-center">
        <WhatsAppGlyph className="h-7 w-7" />
      </span>

      {/* Libellé qui se déplie au survol et au focus clavier.
          Une pastille ronde ne dit pas ce qu'elle fait — surtout à côté d'un
          second bouton de discussion. Le libellé le dit, sans occuper la place
          en permanence.
          Masqué sous `sm` : sur téléphone, la largeur manque et le logo
          WhatsApp est de toute façon reconnu sans légende.
          `max-w` plutôt que `width` : la transition porte alors sur une valeur
          animable, et le texte n'est jamais recalculé. */}
      <span
        className={[
          "hidden overflow-hidden whitespace-nowrap text-sm font-semibold sm:block",
          "max-w-0 opacity-0 transition-all duration-300 ease-out",
          "group-hover:mr-5 group-hover:max-w-[10rem] group-hover:opacity-100",
          "group-focus-visible:mr-5 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100",
        ].join(" ")}
      >
        Écrivez-nous
      </span>
    </a>
  );
}
