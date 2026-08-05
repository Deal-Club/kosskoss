import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Star } from "lucide-react";
import { listReviews } from "@/server/reviews";
import { ReviewForm } from "@/components/ReviewForm";
import { formatRating } from "@/lib/formatRating";

// Format de date par langue : « 5 janvier 2026 » en français,
// « 5 January 2026 » en anglais britannique (le shop livre en Europe).
const DATE_LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB" };

function dateFormatterFor(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(DATE_LOCALES[locale] ?? "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Les barres de répartition sont figées par pas de 10 % : le design system
// interdit les styles inline, donc pas de largeur calculée à la volée.
const BAR_WIDTHS = [
  "w-0",
  "w-[10%]",
  "w-[20%]",
  "w-[30%]",
  "w-[40%]",
  "w-[50%]",
  "w-[60%]",
  "w-[70%]",
  "w-[80%]",
  "w-[90%]",
  "w-full",
] as const;

function barWidthClass(share: number): string {
  return BAR_WIDTHS[Math.min(10, Math.max(0, Math.round(share / 10)))];
}

function StarRating({ value, size, label }: { value: number; size: "sm" | "lg"; label: string }) {
  const starClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span className="flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden
          className={`${starClass} ${index < Math.round(value) ? "fill-primary text-primary" : "text-border"}`}
        />
      ))}
    </span>
  );
}

export async function ProductReviewSection({
  productId,
  editorialRating,
}: {
  productId: string;
  editorialRating?: number;
}) {
  const t = await getTranslations("reviews");
  const locale = await getLocale();
  const dateFormatter = dateFormatterFor(locale);

  // Seuls les avis validés par la modération quittent la base pour la boutique.
  const reviews = await listReviews({ productId, status: "approved" });

  const total = reviews.length;
  const average = total > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((review) => review.rating === star).length;
    return { star, count, share: total > 0 ? (count / total) * 100 : 0 };
  });

  return (
    <section id="bewertungen" className="mx-auto max-w-screen-xl px-3 py-6">
      <h2 className="mb-4 text-xl font-black text-foreground">{t("title")}</h2>

      {total > 0 ? (
        // Résumé resserré : la note, les étoiles et le nombre d'avis tiennent
        // sur une ligne, et les barres de répartition se réduisent à une demi-
        // largeur. Empilé et à pleine hauteur, ce seul bloc occupait un tiers
        // d'écran avant que le premier avis n'apparaisse.
        <div className="mb-4 flex flex-col gap-4 rounded-sm border border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-3 sm:border-r sm:border-border sm:pr-8">
            <p className="text-3xl font-black text-foreground">{formatRating(average, locale)}</p>
            <div>
              <StarRating
                value={average}
                size="sm"
                label={t("starsAria", { rating: formatRating(average, locale) })}
              />
              <p className="mt-0.5 text-xs text-muted-foreground">{t("count", { count: total })}</p>
            </div>
          </div>

          <div className="flex-1 space-y-1 sm:max-w-sm">
            {distribution.map((entry) => (
              <div key={entry.star} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-12 shrink-0">{t("starsLabel", { star: entry.star })}</span>
                <span className="h-1.5 flex-1 rounded-sm bg-muted">
                  <span className={`block h-1.5 rounded-sm bg-primary ${barWidthClass(entry.share)}`} />
                </span>
                <span className="w-6 shrink-0 text-right">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-sm border border-border p-5">
          <p className="font-bold text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
          {typeof editorialRating === "number" && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("editorial", { rating: formatRating(editorialRating, locale) })}
            </p>
          )}
        </div>
      )}

      {total > 0 && (
        <div className="mb-8">
          {/* Trois avis visibles, le reste au défilement.
              Une fiche à soixante avis poussait le formulaire de dépôt et le
              reste de la page hors de portée : il fallait faire défiler
              longtemps pour retrouver quoi que ce soit.

              `tabIndex` n'est pas décoratif : sans lui, une zone à défilement
              ne reçoit pas le focus et son contenu devient inatteignable au
              clavier. La hauteur est en `rem` pour suivre la taille de police
              choisie par la personne, plutôt que de couper le texte quand elle
              l'agrandit. */}
          <div
            tabIndex={0}
            role="region"
            aria-label={t("listAria", { count: total })}
            className="max-h-[22rem] overflow-y-auto overscroll-contain rounded-sm border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ul className="divide-y divide-border">
              {reviews.map((review) => (
                <li key={review.id} className="px-4 py-3">
                  {/* Note, intitulé et date sur une seule ligne. Empilés, ils
                      faisaient à eux seuls la moitié de la hauteur d'un avis. */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <StarRating
                      value={review.rating}
                      size="sm"
                      label={t("starsAria", { rating: formatRating(review.rating, locale) })}
                    />
                    {review.title && (
                      <h3 className="text-sm font-black text-foreground">{review.title}</h3>
                    )}
                    <p className="ml-auto text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(review.createdAt))}
                    </p>
                  </div>
                  {/* Une ligne de texte tirée sur toute la largeur de l'écran se
                      lit mal : on la borne à une longueur de lecture usuelle. */}
                  <p className="mt-1 max-w-prose text-sm text-muted-foreground">{review.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {review.authorName}
                    {review.city ? `, ${review.city}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Sans cette mention, rien ne dit qu'il reste des avis en dessous :
              une zone à défilement interne ne s'annonce pas d'elle-même. */}
          {total > 3 && (
            <p className="mt-2 text-xs text-muted-foreground">{t("scrollHint", { count: total })}</p>
          )}
        </div>
      )}

      {/* Formulaire replié par défaut. Déployé en permanence, il occupait le bas
          de chaque fiche produit alors qu'une infime part des visiteurs vient
          pour déposer un avis — les autres lisent ceux des acheteurs. Le
          <details> natif suffit : il se déplie sans JavaScript, reste
          accessible au clavier et s'imprime ouvert. Même mécanique que la FAQ. */}
      <details className="group rounded-sm border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-lg font-black text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {t("writeTitle")}
          <Plus
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45"
          />
        </summary>
        <div className="border-t border-border px-4 py-4">
          <ReviewForm productId={productId} />
        </div>
      </details>
    </section>
  );
}
