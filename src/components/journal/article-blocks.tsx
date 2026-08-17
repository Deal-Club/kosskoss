import Image from "next/image";
import { AlertTriangle, ArrowRight, Info, Lightbulb, Plus } from "lucide-react";
import { LocalizedLink as Link } from "@/components/kk/localized-link";
import { RichText } from "@/components/RichText";
import { ProductCard } from "@/components/kk/product-card";
import { NewsletterBand } from "@/components/kk/newsletter";
import { tableOfContents } from "@/lib/journal/content";
import { cn } from "@/lib/utils";
import type { CalloutTone, JournalBlock } from "@/types/journal";
import type { KKProductView } from "@/types/kk";

/**
 * Rendu des blocs d'un article.
 *
 * Aucun `dangerouslySetInnerHTML` ici, et ce n'est pas un oubli : le contenu
 * n'est jamais du HTML. Le texte porte les marques restreintes de
 * `src/lib/richText.ts` et passe par `<RichText />`, qui produit des éléments
 * React. Un rédacteur qui colle une balise dans le back-office la verra
 * s'afficher telle quelle sur la page — l'injection est impossible par
 * construction, pas par filtrage.
 *
 * Un `kind` inconnu est ignoré silencieusement. Le jour où un type de bloc est
 * retiré, les articles qui l'utilisaient perdent un encadré ; ils ne rendent
 * pas une page blanche.
 */

// ---- Encadrés ----

const CALLOUT_STYLES: Record<CalloutTone, { wrapper: string; icon: typeof Info; label: string }> = {
  info: {
    wrapper: "border-trust-line bg-trust-soft text-deep",
    icon: Info,
    label: "Information",
  },
  conseil: {
    wrapper: "border-gold-soft bg-sand text-deep",
    icon: Lightbulb,
    label: "Conseil",
  },
  avertissement: {
    wrapper: "border-destructive/30 bg-destructive/5 text-deep",
    icon: AlertTriangle,
    label: "À savoir",
  },
};

function Callout({ tone, title, text }: { tone: CalloutTone; title: string; text: string }) {
  const style = CALLOUT_STYLES[tone];
  const Icon = style.icon;

  return (
    <aside className={cn("my-8 rounded-2xl border p-5 sm:p-6", style.wrapper)}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs font-bold tracking-wider uppercase">{title || style.label}</p>
      </div>
      <div className="mt-2 text-[15px] leading-relaxed">
        <RichText text={text} />
      </div>
    </aside>
  );
}

// ---- Vidéo ----

/**
 * L'article ne stocke qu'un identifiant, jamais une URL : le domaine intégré
 * est décidé ici, pas par le rédacteur. `youtube-nocookie` et le lecteur Vimeo
 * standard sont les deux seules destinations possibles.
 */
function VideoEmbed({
  provider,
  videoId,
  title,
}: {
  provider: "youtube" | "vimeo";
  videoId: string;
  title: string;
}) {
  const src =
    provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : `https://player.vimeo.com/video/${videoId}`;

  return (
    <figure className="my-8">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-deep">
        <iframe
          src={src}
          title={title || "Vidéo"}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      {title ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">{title}</figcaption>
      ) : null}
    </figure>
  );
}

// ---- Bloc par bloc ----

function Block({
  block,
  headingId,
  products,
}: {
  block: JournalBlock;
  headingId?: string;
  products: ReadonlyMap<string, KKProductView>;
}) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="my-5 text-[17px] leading-[1.75] text-foreground">
          <RichText text={block.text} />
        </p>
      );

    case "heading": {
      // Le H1 est le titre de l'article : les blocs ne descendent jamais en
      // dessous de H2, la hiérarchie reste lisible pour un lecteur d'écran.
      if (block.level === 3) {
        return (
          <h3 id={headingId} className="mt-8 mb-3 font-display text-xl font-semibold text-deep">
            <RichText text={block.text} />
          </h3>
        );
      }
      return (
        <h2 id={headingId} className="mt-12 mb-4 font-display text-2xl font-bold text-deep sm:text-[28px]">
          <RichText text={block.text} />
        </h2>
      );
    }

    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index} className="text-[17px] leading-[1.7]">
          <RichText text={item} />
        </li>
      ));
      return block.ordered ? (
        <ol className="my-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-deep">{items}</ol>
      ) : (
        <ul className="my-5 list-disc space-y-2 pl-6 marker:text-gold">{items}</ul>
      );
    }

    case "quote":
      return (
        <figure className="my-8 border-l-2 border-gold pl-5">
          <blockquote className="font-display text-xl leading-relaxed text-deep italic">
            <RichText text={block.text} />
          </blockquote>
          {block.attribution ? (
            <figcaption className="mt-2 text-sm text-muted-foreground">
              — {block.attribution}
            </figcaption>
          ) : null}
        </figure>
      );

    case "image":
      return (
        <figure className="my-8">
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-cream">
            <Image
              src={block.src}
              alt={block.alt}
              fill
              sizes="(min-width: 768px) 720px, 100vw"
              className="object-cover"
            />
          </div>
          {block.caption ? (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    case "gallery":
      return (
        <div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {block.items.map((item, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-xl bg-cream">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(min-width: 640px) 240px, 45vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      );

    case "video":
      return <VideoEmbed provider={block.provider} videoId={block.videoId} title={block.title} />;

    case "callout":
      return <Callout tone={block.tone} title={block.title} text={block.text} />;

    case "stats":
      return (
        <div className="my-8 grid gap-4 rounded-2xl bg-cream p-6 sm:grid-cols-3">
          {block.items.map((item, index) => (
            <div key={index} className="text-center">
              <p className="font-display text-3xl font-bold text-deep">{item.value}</p>
              <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{item.label}</p>
            </div>
          ))}
        </div>
      );

    case "cta":
      return (
        <div className="my-10 rounded-2xl border border-border bg-sand p-6 text-center sm:p-8">
          {block.title ? (
            <p className="font-display text-xl font-bold text-deep">{block.title}</p>
          ) : null}
          {block.text ? (
            <div className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-deep/80">
              <RichText text={block.text} />
            </div>
          ) : null}
          <Link
            href={block.href}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
          >
            {block.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      );

    case "productCard": {
      // Un slug qui ne correspond plus à un produit actif disparaît du bloc.
      const found = block.slugs
        .map((slug) => products.get(slug))
        .filter((product): product is KKProductView => Boolean(product));
      if (found.length === 0) return null;

      return (
        <section className="my-10">
          {block.title ? (
            <h2 className="mb-4 font-display text-xl font-bold text-deep">{block.title}</h2>
          ) : null}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {found.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      );
    }

    case "newsletter":
      return (
        <div className="my-10">
          <NewsletterBand />
        </div>
      );

    case "faq":
      // Accordéon HTML natif : ouvrable au clavier, indexable, et sans une
      // ligne de JavaScript.
      return (
        <div className="my-8 space-y-2">
          {block.items.map((item, index) => (
            <details
              key={index}
              className="group rounded-xl border border-border bg-card px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[15px] font-semibold text-deep [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-3 text-[15px] leading-relaxed text-foreground/85">
                <RichText text={item.answer} />
              </div>
            </details>
          ))}
        </div>
      );

    case "table":
      return (
        // Un tableau large défile dans son propre cadre : le corps de la page
        // ne doit jamais défiler horizontalement sur mobile.
        <div className="my-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead className="bg-cream">
              <tr>
                {block.headers.map((header, index) => (
                  <th key={index} scope="col" className="px-4 py-3 font-bold text-deep">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-border">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 align-top text-foreground/85">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "divider":
      return <hr className="my-10 border-t border-border" />;
  }
}

export function ArticleBlocks({
  blocks,
  products,
}: {
  blocks: readonly JournalBlock[];
  products?: ReadonlyMap<string, KKProductView>;
}) {
  // Les ancres sont calculées par la MÊME fonction que le sommaire : les deux
  // ne peuvent donc pas diverger, et un lien du sommaire tombe toujours juste.
  const anchors = tableOfContents(blocks);
  let headingIndex = 0;

  return (
    <>
      {blocks.map((block, index) => {
        const headingId = block.kind === "heading" ? anchors[headingIndex++]?.id : undefined;
        return (
          <Block
            key={index}
            block={block}
            headingId={headingId}
            products={products ?? new Map()}
          />
        );
      })}
    </>
  );
}
