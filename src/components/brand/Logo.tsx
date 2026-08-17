import Image from "next/image";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/kk/motifs";

/**
 * Marque KossKoss Select — logotype en Cinzel (aucune image : recolorable
 * selon le fond). `tone="light"` sur fond sombre (back-office), `dark` sur clair.
 */

interface LogoProps {
  tone?: "light" | "dark";
  className?: string;
  /** Conservé pour compatibilité d'API (l'ancien logo était une image préchargée). */
  priority?: boolean;
}

/**
 * Dimensions natives des deux fichiers officiels. Elles ne servent qu'à donner
 * son rapport d'aspect à next/image : la taille affichée vient de la classe
 * (`h-8 w-auto`), jamais d'ici.
 */
const LOGO_WIDTH = 1070;
const LOGO_HEIGHT = 306;

/**
 * Logo OFFICIEL, le fichier fourni par la marque — à préférer partout où le
 * rendu doit être le logo lui-même et non son approximation typographique.
 *
 * C'est ce composant qu'utilise le back-office. La différence avec `Logo`
 * ci-dessus n'est pas cosmétique : `Logo` redessine le lettrage en Cinzel, ce
 * qui permet de le recolorer au fil des fonds mais laisse le dessin à la merci
 * du chargement de la police et de ses futures versions. L'image, elle, est
 * exacte par construction.
 *
 * Deux fichiers, tous deux à fond transparent :
 *   - `tone="light"`  -> lettrage blanc, pour les fonds sombres (bg-deep) ;
 *   - `tone="dark"`   -> lettrage vert profond, pour les fonds clairs.
 */
export function LogoImage({ tone = "light", className, priority }: LogoProps) {
  return (
    <Image
      src={tone === "light" ? "/images/logo-full-light.png" : "/images/logo-full.png"}
      alt="KossKoss Select"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn("w-auto", className)}
    />
  );
}

export function Logo({ tone = "light", className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-col justify-center leading-none",
        tone === "light" ? "text-[#f3e8dd]" : "text-deep",
        className,
      )}
      aria-label="KossKoss Select"
    >
      <span className="wordmark text-lg">KOSSKOSS</span>
      <span className="mt-0.5 text-[0.5rem] font-medium uppercase tracking-[0.45em] opacity-70">
        Select
      </span>
    </span>
  );
}

/** Sigle seul (monogramme KK), pour les espaces étroits. */
export function BrandMark({ className }: { className?: string }) {
  return <Monogram className={cn("h-9 w-9 text-deep", className)} title="KossKoss Select" />;
}
