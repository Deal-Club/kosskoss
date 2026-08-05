import Image from "next/image";
import { Plus } from "lucide-react";
import { formatFcfa } from "@/lib/kk/format";
import type { KKProductView, KKTone } from "@/types/kk";
import { BottleMotif } from "./motifs";

const TONE: Record<KKTone, string> = {
  sand: "from-[#f7eee2] to-[#e7d3bd]",
  rose: "from-[#f4e3e0] to-[#e6c9c4]",
  teal: "from-[#dde9e8] to-[#bcd2d0]",
  clay: "from-[#f0e1d3] to-[#d8b79a]",
};

const BADGE_LABEL: Record<"bestseller" | "nouveau", string> = {
  bestseller: "Bestseller",
  nouveau: "Nouveau",
};

export function ProductCard({ product }: { product: KKProductView }) {
  const href = product.href ?? "#";
  const hasImage = typeof product.image === "string" && product.image.length > 0;

  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card">
        <a
          href={href}
          className={`relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br ${TONE[product.tone]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-inset`}
          aria-label={product.name}
        >
          {hasImage ? (
            <Image
              src={product.image as string}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 45vw, 22vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <BottleMotif className="h-3/5 w-auto text-deep transition-transform duration-700 ease-out group-hover:scale-105" />
          )}

          {product.badge && (
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${
                product.badge === "bestseller"
                  ? "bg-deep text-primary-foreground"
                  : "bg-cream text-deep"
              }`}
            >
              {BADGE_LABEL[product.badge]}
            </span>
          )}
        </a>

        <button
          type="button"
          aria-label={`Ajouter ${product.name} au panier`}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-deep text-primary-foreground shadow-lg shadow-deep/20 transition duration-300 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-safe:translate-y-2 motion-safe:opacity-0 motion-safe:group-hover:translate-y-0 motion-safe:group-hover:opacity-100 motion-safe:group-focus-within:translate-y-0 motion-safe:group-focus-within:opacity-100"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <a href={href} className="mt-4 flex flex-1 flex-col focus-visible:outline-none">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="mt-1 font-sans text-[0.95rem] font-medium leading-snug text-foreground group-hover:text-deep">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="figure text-[0.95rem] font-semibold text-deep">
            {formatFcfa(product.priceFcfa)}
          </span>
          {product.oldPriceFcfa && (
            <span className="figure text-xs text-muted-foreground line-through">
              {formatFcfa(product.oldPriceFcfa)}
            </span>
          )}
        </div>
      </a>
    </article>
  );
}
