import { getTranslations } from "next-intl/server";
import { COMPANY } from "@/content/legal";
import { getParametres, numeroWhatsappEffectif } from "@/server/kk/parametres";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";

/**
 * Composant serveur : le numéro vient du réglage en base
 * (`numeroWhatsappEffectif`), avec repli sur COMPANY.phone si ni le réglage
 * ni la variable d'environnement ne sont renseignés. `getParametres` est
 * mémoïsé par requête, donc cet appel ne coûte pas de requête supplémentaire
 * même si l'en-tête ou le pied de page l'ont déjà lu.
 *
 * Le message pré-rempli suit la langue du visiteur (next-intl) : c'est le
 * canal de contact principal de la boutique, il ne doit pas rester figé en
 * français pour un visiteur anglophone.
 */
export async function WhatsAppButton() {
  const t = await getTranslations("common");
  const parametres = await getParametres();
  const numero = numeroWhatsappEffectif(parametres) || COMPANY.phone.replace(/\D/g, "");
  if (!numero) return null;

  const prefill = encodeURIComponent(t("whatsappPrefill"));

  return (
    <a
      href={`https://wa.me/${numero}?text=${prefill}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsappAriaLabel")}
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
        {t("whatsappWriteToUs")}
      </span>
    </a>
  );
}
