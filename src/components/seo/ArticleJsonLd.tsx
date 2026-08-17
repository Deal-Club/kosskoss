import { JsonLd, type JsonLdValue } from "@/components/seo/JsonLd";
import { SHOP_NAME, absoluteUrl, siteUrl } from "@/server/merchant";
import { stripMarks } from "@/lib/richText";
import type { ArticleDetail } from "@/server/journal/read";

/**
 * Balisage `BlogPosting` d'un article, et `FAQPage` quand l'article contient
 * une FAQ.
 *
 * Le `publisher` renvoie à l'entité déclarée par `OrganizationJsonLd` via son
 * `@id` : Google rattache ainsi l'article à la boutique déjà connue, plutôt
 * qu'à un éditeur homonyme créé pour l'occasion.
 *
 * Les questions de FAQ ne sont balisées que si elles sont VISIBLES sur la page.
 * C'est une exigence de Google, et c'est le cas ici : le bloc `faq` est rendu
 * en accordéon HTML natif, dont le contenu est présent dans le document.
 */

export function ArticleJsonLd({
  article,
  canonical,
}: {
  article: ArticleDetail;
  canonical: string;
}) {
  const base = siteUrl();

  const posting: Record<string, JsonLdValue | undefined> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt || undefined,
    image: article.coverImage ? absoluteUrl(article.coverImage) : undefined,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    inLanguage: undefined,
    author: article.author
      ? {
          "@type": "Person",
          name: article.author.name,
          url: absoluteUrl(`/journal/auteur/${article.author.slug}`),
        }
      : { "@type": "Organization", name: SHOP_NAME },
    publisher: {
      "@type": "Organization",
      "@id": `${base}#organization`,
      name: SHOP_NAME,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    articleSection: article.category?.label,
    keywords: article.tags.length > 0 ? article.tags.map((tag) => tag.label).join(", ") : undefined,
    wordCount: undefined,
  };

  // Une seule FAQ par page : plusieurs blocs `faq` sont fusionnés, deux
  // `FAQPage` sur la même page se neutraliseraient.
  const questions = article.blocks
    .filter((block) => block.kind === "faq")
    .flatMap((block) => (block.kind === "faq" ? block.items : []));

  return (
    <>
      <JsonLd data={posting} />
      {questions.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: questions.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: stripMarks(item.answer) },
            })),
          }}
        />
      ) : null}
    </>
  );
}
