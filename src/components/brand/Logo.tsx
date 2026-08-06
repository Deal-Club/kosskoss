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
