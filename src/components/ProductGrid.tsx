import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import type { Product } from "@/types/home";

export function ProductGrid({
  eyebrow,
  heading,
  ctaLabel,
  ctaHref,
  products,
}: {
  /** Surtitre en chasse fixe, facultatif : les pages catégorie n'en ont pas. */
  eyebrow?: string;
  heading: string;
  ctaLabel: string;
  ctaHref: string;
  products: Product[];
}) {
  return (
    <section className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="eyebrow mb-3 text-primary">{eyebrow}</p>
          )}
          <h2 className="font-heading text-3xl leading-tight font-black text-foreground sm:text-[2.6rem]">
            {heading}
          </h2>
        </div>
        <Link
          href={ctaHref}
          className="group flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      {/* Quatre par ligne sur grand écran : à six, la vignette devenait trop
          étroite pour que le nom du modèle et la liste d'arguments tiennent
          sans être coupés. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <Reveal key={product.slug ?? product.name} delay={Math.min(index * 60, 300)}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
