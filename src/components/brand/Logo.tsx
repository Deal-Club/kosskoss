import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Marque de la boutique.
 *
 * Le logo est une image et non plus un assemblage de SVG et de texte : le
 * dessin — deux bûches dressées autour d'une flamme — et le lettrage forment
 * un bloc solidaire dont les proportions ne doivent pas bouger.
 *
 * Deux fichiers, un par fond : le lettrage est noir dans la version courante,
 * crème dans la version claire. Les recolorier en CSS n'est pas possible sur
 * un PNG, et un filtre d'inversion emporterait aussi l'orange de la flamme.
 * Les deux fichiers sont produits par scripts/generer-logos.mjs à partir du
 * même original.
 */

/** Proportions du fichier source, après rognage : 747 × 162. */
const RATIO = 747 / 162;
const HAUTEUR_DE_REFERENCE = 162;

interface LogoProps {
  /** "light" sur fond sombre (pied de page, back-office), "dark" sur fond clair. */
  tone?: "light" | "dark";
  className?: string;
  /**
   * Vrai pour le logo de l'en-tête, qui est le premier élément visible de la
   * page : Next.js le précharge alors au lieu de le charger paresseusement.
   */
  priority?: boolean;
}

export function Logo({ tone = "light", className, priority = false }: LogoProps) {
  return (
    <Image
      src={tone === "light" ? "/images/logo-full-light.png" : "/images/logo-full.png"}
      alt="MLC Bois — bois de chauffage"
      width={Math.round(HAUTEUR_DE_REFERENCE * RATIO)}
      height={HAUTEUR_DE_REFERENCE}
      priority={priority}
      // Vingt-huit pixels sur mobile. Le descripteur « BOIS DE CHAUFFAGE »,
      // qui n'occupe qu'un septième de la hauteur de l'image, n'y est plus
      // qu'un liseré : il ne se lit plus du tout et ne sert que d'assise
      // visuelle au nom. Seul « MLC Bois » reste identifiable. C'est le
      // dernier cran utile de ce fichier — au-delà, le logo complet n'apporte
      // plus rien que le sigle seul (`BrandMark`) ne rendrait mieux.
      className={cn("h-7 w-auto sm:h-12", className)}
    />
  );
}

/**
 * Sigle seul, sans le lettrage. Pour les espaces trop étroits pour le logo
 * complet — une pastille, une vignette, un en-tête réduit.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/logo-icon.png"
      alt=""
      aria-hidden="true"
      width={1072}
      height={1072}
      className={cn("h-9 w-9", className)}
    />
  );
}
