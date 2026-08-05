import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { KKProductDetail } from "@/server/kk/product";
import type { KKProductView } from "@/types/kk";
import { BottleMotif, Petal, Monogram } from "./motifs";
import { AddToCart } from "./add-to-cart";
import { ProductRail } from "./home";

const BADGE_LABEL: Record<"bestseller" | "nouveau", string> = {
  bestseller: "Bestseller",
  nouveau: "Nouveau",
};

function Breadcrumb({ product }: { product: KKProductDetail }) {
  const crumbs = [
    { label: "Accueil", href: "/" },
    { label: product.group.label, href: `/${product.group.slug}` },
    { label: product.category.label, href: `/${product.group.slug}/${product.category.slug}` },
    { label: product.name },
  ];
  return (
    <nav aria-label="Fil d'Ariane" className="mx-auto max-w-7xl px-6 py-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {c.href ? (
              <a href={c.href} className="transition hover:text-deep">
                {c.label}
              </a>
            ) : (
              <span className="text-deep">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Gallery({ product }: { product: KKProductDetail }) {
  const hasImage = typeof product.image === "string" && product.image.length > 0;
  return (
    <div className="grid gap-4">
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.5),transparent_55%)]" />
        {hasImage ? (
          <Image src={product.image as string} alt={product.name} fill sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
        ) : (
          <BottleMotif className="h-3/5 w-auto text-deep/80" />
        )}
        <Petal className="absolute -right-4 -top-4 h-20 w-20 text-deep/15" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-[#dde9e8] to-[#bcd2d0]">
          <BottleMotif className="h-1/2 w-auto text-deep/60" />
        </div>
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-[#f4e3e0] to-[#e6c9c4]">
          <Monogram className="h-1/2 w-auto text-deep/40" />
        </div>
      </div>
    </div>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-border py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-deep">
        {title}
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export function ProductDetail({
  product,
  related,
}: {
  product: KKProductDetail;
  related: KKProductView[];
}) {
  return (
    <>
      <Breadcrumb product={product} />

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <Gallery product={product} />

          <div className="lg:pt-4">
            <div className="rounded-[1.75rem] border border-border/70 bg-card p-7 sm:p-9">
              {product.badge && (
                <span className="mb-4 inline-block rounded-full bg-sand px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-deep">
                  {BADGE_LABEL[product.badge]}
                </span>
              )}
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {product.brand}
              </p>
              <h1 className="mt-2 text-3xl leading-tight text-deep sm:text-4xl">{product.name}</h1>
              {product.shortDescription && (
                <p className="mt-3 text-muted-foreground">{product.shortDescription}</p>
              )}

              <div className="mt-6">
                <AddToCart product={product} />
              </div>

              <div className="mt-8">
                <Accordion title="Description" open>
                  {product.description || product.shortDescription}
                </Accordion>
                {product.bullets.length > 0 && (
                  <Accordion title="Ingrédients clés">
                    <ul className="space-y-2">
                      {product.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {b}
                        </li>
                      ))}
                    </ul>
                  </Accordion>
                )}
                <Accordion title="Conseils d'utilisation">
                  Appliquer sur peau propre et sèche, matin et/ou soir selon vos besoins. En cas de
                  doute, réalisez notre diagnostic beauté pour une routine adaptée.
                </Accordion>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">
                Réf. {product.sku} · {product.stock > 0 ? "En stock" : "Indisponible"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bande éditoriale — parti pris de transparence */}
      <section className="bg-sand/50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div className="max-w-xl">
            <p className="eyebrow">Notre parti pris</p>
            <h2 className="mt-3 text-3xl text-deep sm:text-4xl">L&rsquo;art de la transparence</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Chaque produit de la maison est sélectionné pour sa formule et sa tolérance. Nous
              privilégions des marques transparentes et des actifs qui ont fait leurs preuves — pour
              que votre routine soit un choix éclairé, jamais un pari.
            </p>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#e7dccb] to-[#9db6b5]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.5),transparent_60%)]" />
            <Monogram className="absolute inset-0 m-auto h-1/2 w-1/2 text-deep/25" />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <ProductRail
          eyebrow="À associer"
          title="Vous aimerez aussi"
          action="Voir la catégorie"
          products={related}
        />
      )}
    </>
  );
}
