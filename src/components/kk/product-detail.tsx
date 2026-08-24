import Image from "next/image";
import { ChevronRight, ArrowDown, Check, ArrowUp } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { KKProductDetail } from "@/server/kk/product";
import { BADGE_LABEL } from "@/lib/kk/badges";
import { PREOCCUPATIONS, TYPES_DE_PEAU, libellesPourTags } from "@/lib/kk/besoins";
import { formatFcfa } from "@/lib/kk/format";
import { getRoutinesForProduct } from "@/server/kk/routines";
import { getEnabledPaymentMethods } from "@/server/kk/payments";
import type { KKProductView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";
import { BottleMotif, Petal } from "./motifs";
import { LocalizedLink as Link } from "./localized-link";
import { AddToCart } from "./add-to-cart";
import { ProductRail } from "./home";
import { ProductReviews } from "./product-reviews";
import { ProductZoom } from "./product-zoom";
import type { KKProductReviews } from "@/server/kk/product-reviews";

// Libellés partagés : voir `lib/kk/badges`.

function Breadcrumb({
  product,
  homeLabel,
  ariaLabel,
}: {
  product: KKProductDetail;
  homeLabel: string;
  ariaLabel: string;
}) {
  const crumbs = [
    { label: homeLabel, href: "/" },
    { label: product.group.label, href: `/${product.group.slug}` },
    { label: product.category.label, href: `/${product.group.slug}/${product.category.slug}` },
    { label: product.name },
  ];
  return (
    <nav aria-label={ariaLabel} className="mx-auto max-w-7xl px-6 py-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="transition hover:text-deep">
                {c.label}
              </Link>
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

function Gallery({
  product,
  additionalViewAlt,
}: {
  product: KKProductDetail;
  additionalViewAlt: (number: number) => string;
}) {
  const hasImage = typeof product.image === "string" && product.image.length > 0;
  // Les entrées vides sont écartées : une chaîne vide en base ferait un cadre
  // gris et casserait `next/image`, qui refuse un `src` vide.
  const vues = product.images.filter((s) => typeof s === "string" && s.trim().length > 0);
  return (
    <div className="grid gap-4">
      {/* Le zoom au survol vit dans son propre composant client (ProductZoom) :
          il suit le pointeur, ce que la fiche — rendue sur le serveur — ne peut
          pas faire. `data-visuel-produit` reste porté par ce cadre : c'est le
          point de départ du vol vers le panier (lib/kk/fly-to-cart).
          Sans image, on garde le motif et aucun zoom : il n'y a rien à
          approcher sur un flacon dessiné. */}
      {hasImage ? (
        <ProductZoom
          src={product.image as string}
          alt={product.name}
          /* Fond blanc, et non le dégradé beige qui habillait ce cadre : les
             packshots sont des JPEG shootés sur fond blanc, ils y dessinaient
             un rectangle clair au milieu du dégradé. Même correction que sur
             les cartes produit. Le filet remplace le dégradé pour délimiter le
             visuel, qui sans lui flotterait sur la page. */
          className="aspect-square rounded-[1.75rem] border border-border/70 bg-card"
        />
      ) : (
        <div
          data-visuel-produit
          className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#f7eee2] to-[#dcc7ab]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.5),transparent_55%)]" />
          <BottleMotif className="h-3/5 w-auto text-deep/80" />
          <Petal className="absolute -right-4 -top-4 h-20 w-20 text-deep/15" />
        </div>
      )}
      {/* LES VUES COMPLÉMENTAIRES, ET RIEN SI LE PRODUIT N'EN A PAS.
          Deux carrés étaient posés ici EN DUR sur toutes les fiches : un aplat
          vert d'eau portant un flacon dessiné, un aplat rose portant le
          monogramme. Ce n'étaient pas des photos du produit — c'étaient des
          images inventées, identiques sur les soixante-onze fiches, et elles
          promettaient au visiteur des vues supplémentaires qui n'existaient
          pas. Sur une boutique dont le premier frein est la contrefaçon, un
          faux visuel de produit coûte exactement ce qu'on cherche à gagner.

          Le champ `images` existe pourtant en base depuis l'origine (voir
          prisma/schema.prisma) et le type le porte déjà : la galerie
          l'ignorait. Elle l'affiche maintenant, et disparaît quand il est
          vide. */}
      {vues.length > 0 && (
        <ul className="grid grid-cols-2 gap-4">
          {vues.map((src, i) => (
            <li
              key={src}
              className="relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <Image
                src={src}
                alt={additionalViewAlt(i + 2)}
                fill
                sizes="(max-width: 1024px) 45vw, 22vw"
                className="object-contain p-2"
              />
            </li>
          ))}
        </ul>
      )}
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

/**
 * En-tête d'une section pleine largeur du corps de fiche (« Pourquoi vous
 * allez l'aimer », « Est-ce pour ma peau ? »…). Reprend l'échelle de titres du
 * site (chapitre 1 du document de structure) : aucune taille posée en dur ici.
 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-deep">{children}</h2>;
}

export async function ProductDetail({
  product,
  related,
  reviews,
}: {
  product: KKProductDetail;
  related: KKProductView[];
  reviews: KKProductReviews;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("product");
  const tCommon = await getTranslations("common");

  // Ligne de préoccupations (haut de fiche) et tableau « en bref » puisent
  // dans les MÊMES tags — voir `lib/kk/besoins.ts`. Un produit dont le master
  // n'a posé aucun tag de préoccupation/peau reconnu rend un tableau vide :
  // c'est un état normal (voir la garde plus bas), pas une erreur.
  const besoinLabels = libellesPourTags(product.tags, PREOCCUPATIONS, locale);
  const peauLabels = libellesPourTags(product.tags, TYPES_DE_PEAU, locale);

  // La routine (ou les routines) qui contiennent ce produit, et les moyens de
  // paiement actifs : deux lectures propres à la présentation du lot 7D,
  // faites ici pour ne pas changer la signature de la page appelante.
  const [routines, paymentMethods] = await Promise.all([
    getRoutinesForProduct(product.id, locale),
    getEnabledPaymentMethods(locale),
  ]);

  // Le format affiché au tableau « en bref » suit la même contenance de
  // référence que le bloc d'achat au premier rendu (la première variante
  // active, triée par position) — voir `AddToCart`, qui la préselectionne à
  // l'identique. Un produit sans variante n'a simplement pas de ligne Format :
  // aucune valeur n'existe pour lui en base, en inventer une serait mentir.
  const referenceVariant = product.variants[0];
  const briefRows: { label: string; value: string }[] = [
    besoinLabels.length > 0 && { label: t("briefNeedLabel"), value: besoinLabels.join(" / ") },
    peauLabels.length > 0 && { label: t("briefSkinLabel"), value: peauLabels.join(" / ") },
    product.actifsCles && { label: t("briefActionLabel"), value: product.actifsCles },
    product.frequence && { label: t("briefUsageLabel"), value: product.frequence },
    referenceVariant && { label: t("briefFormatLabel"), value: referenceVariant.label },
    { label: t("briefPriceLabel"), value: formatFcfa(referenceVariant?.priceFcfa ?? product.priceFcfa) },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <>
      <Breadcrumb product={product} homeLabel={tCommon("home")} ariaLabel={tCommon("breadcrumb")} />

      <section id="acheter-produit" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-8">
        {/* `items-start` sur la grille, `sticky` sur le bloc d'achat : la
            galerie est plus haute que lui, et le prix comme le bouton
            disparaissaient dès qu'on descendait voir les autres vues du
            produit. Ils suivent maintenant la lecture. */}
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <Gallery
            product={product}
            additionalViewAlt={(number) => t("galleryAdditionalViewAlt", { name: product.name, number })}
          />

          <div className="lg:sticky lg:top-24 lg:pt-4">
            <div className="rounded-[1.75rem] border border-border/70 bg-card p-5 sm:p-7 lg:p-9">
              {/* Mêmes couleurs que sur la vignette — vert profond pour la
                  meilleure vente, laiton pour la nouveauté. Le badge était ici
                  en `bg-sand` quel que soit son sens : un client qui reconnaît
                  une pastille verte dans la grille ne devait pas la retrouver
                  beige sur la fiche. */}
              {product.badge && (
                <span
                  className={`mb-4 inline-block rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${
                    product.badge === "bestseller"
                      ? "bg-deep text-primary-foreground"
                      : "bg-gold text-deep"
                  }`}
                >
                  {BADGE_LABEL[product.badge][locale === "en" ? "en" : "fr"]}
                </span>
              )}
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {product.brand}
              </p>
              {/* Le h1 global démarre à 2,5 rem (40 px) — une taille pensée
                  pour un titre de page court, pas pour un nom de produit.
                  « Crème solaire au riz et probiotiques » dans les 286 px
                  utiles d'un téléphone y tenait sur cinq lignes et occupait à
                  lui seul le tiers du premier écran, repoussant le prix et le
                  bouton d'achat hors de vue.
                  Il redescend à 1,6 rem sur mobile et retrouve progressivement
                  sa taille : le nom reste la tête de série de la fiche, il
                  cesse d'en être le contenu principal. */}
              <h1 className="mt-2 text-[1.6rem] leading-tight text-deep sm:text-[1.9rem] lg:text-[2.15rem]">
                {product.name}
              </h1>

              {/* Ligne de préoccupations — modèle client : « Boutons •
                  Brillance • Marques post-boutons ». Puise dans les mêmes tags
                  que le tableau « en bref » plus bas (voir `besoinLabels`) :
                  aucune donnée n'est demandée deux fois au master. */}
              {besoinLabels.length > 0 && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-ink">
                  {besoinLabels.join(" • ")}
                </p>
              )}

              {/* Question d'accroche — le problème que le visiteur se pose
                  avant de lire la solution juste en dessous. */}
              {product.problemeAccroche && (
                <p className="mt-3 font-display text-lg leading-snug text-deep">
                  {product.problemeAccroche}
                </p>
              )}

              {/* Solution en une phrase. */}
              {product.shortDescription && (
                <p className="mt-3 text-muted-foreground">{product.shortDescription}</p>
              )}

              <div className="mt-6">
                <AddToCart product={product} />
              </div>

              {/* Mentions de livraison et de paiement — factuelles et
                  communes à tout le catalogue (voir TARGET.md : la livraison
                  est coordonnée par WhatsApp, sans zone ni délai calculé), pas
                  un champ du master. Les moyens de paiement viennent du
                  back-office (`getEnabledPaymentMethods`) : les citer en dur
                  aurait désynchronisé cette ligne du réglage réel dès la
                  première désactivation d'un moyen de paiement. */}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {t("deliveryMention")}
                {paymentMethods.length > 0 && (
                  <>
                    {" · "}
                    {t("paymentMention", { methods: paymentMethods.map((m) => m.label).join(", ") })}
                  </>
                )}
              </p>

              <div className="mt-8">
                <Accordion title={t("sectionDescription")} open>
                  {product.description || product.shortDescription}
                </Accordion>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">
                {t("sku")} {product.sku} · {product.stock > 0 ? t("inStockShort") : t("unavailable")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La bande « Notre parti pris » vivait ici : un discours général sur la
         sélection, identique sur les soixante-onze fiches, illustré par un
         aplat dégradé et le monogramme. Retirée à la demande du client. Elle
         séparait la fiche de ses produits associés par un écran de texte qui
         n'apprenait rien sur le produit qu'on est en train de regarder — le
         même propos est tenu à sa place sur l'accueil et sur /marques. */}

      {/* --- Pourquoi vous allez l'aimer --------------------------------- */}
      {product.bullets.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 py-10">
          <SectionTitle>{t("whyLoveTitle")}</SectionTitle>
          <ul className="mt-5 space-y-3">
            {product.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-deep" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Est-ce pour ma peau ? ---------------------------------------- */}
      {product.idealPour && (
        <section className="border-t border-border/60 bg-sand/40">
          <div className="mx-auto max-w-4xl px-6 py-10">
            <SectionTitle>{t("idealForTitle")}</SectionTitle>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">
              <span className="font-semibold text-deep">{t("idealForLabel")}</span> {product.idealPour}
            </p>
          </div>
        </section>
      )}

      {/* --- Comment l'utiliser ? ------------------------------------------
          Matin et soir n'apparaissent que si le master les a renseignés — un
          produit corps sans étape matin, par exemple, n'affiche que le soir. */}
      {(product.usageMatin || product.usageSoir || product.conseilKossKoss) && (
        <section className="mx-auto max-w-4xl px-6 py-10">
          <SectionTitle>{t("howToUseTitle")}</SectionTitle>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {product.usageMatin && (
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-deep">
                  {t("morningLabel")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{product.usageMatin}</p>
              </div>
            )}
            {product.usageSoir && (
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-deep">
                  {t("eveningLabel")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{product.usageSoir}</p>
              </div>
            )}
          </div>
          {product.conseilKossKoss && (
            <p className="mt-5 rounded-2xl bg-sand/60 p-5 text-sm leading-relaxed text-foreground/85">
              <span className="font-semibold text-deep">{t("kosskossAdviceLabel")}</span>{" "}
              {product.conseilKossKoss}
            </p>
          )}
        </section>
      )}

      {/* --- Complétez votre routine ---------------------------------------
          Un produit peut appartenir à plusieurs routines (par exemple un
          nettoyant repris en version Éco et en version Premium) : elles sont
          TOUTES montrées, plutôt qu'une seule choisie arbitrairement — voir
          le rapport du lot 7D. */}
      {routines.length > 0 && (
        <section className="border-t border-border/60 bg-sand/40">
          <div className="mx-auto max-w-4xl px-6 py-10">
            <SectionTitle>{t("completeRoutineTitle")}</SectionTitle>
            <div className="mt-6 space-y-6">
              {routines.map((routine) => (
                <div key={routine.id} className="rounded-2xl border border-border/70 bg-card p-6">
                  <h3 className="text-deep">{routine.name}</h3>
                  <ol className="mt-4 space-y-1.5">
                    {routine.steps.map((step, i) => (
                      <li key={step.id}>
                        <div className="flex items-baseline gap-2 text-sm">
                          <span className="figure font-semibold text-deep">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={
                              step.product.id === product.id
                                ? "font-semibold text-deep"
                                : "text-foreground/85"
                            }
                          >
                            {step.product.brand} — {step.product.name}
                          </span>
                        </div>
                        {i < routine.steps.length - 1 && (
                          <ArrowDown className="ml-1.5 mt-1 h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
                        )}
                      </li>
                    ))}
                  </ol>
                  <Link
                    href={routine.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-deep kk-underline"
                  >
                    {t("completeRoutineCta")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- En bref --------------------------------------------------------
          Besoin / peau / action / utilisation / format / prix : six valeurs
          qui existent déjà ailleurs sur la fiche (tags, actifs clés,
          fréquence, variante, prix) — reprises ici en tableau, jamais
          redemandées au client. La section entière disparaît si aucune ligne
          n'a de valeur (produit sans tag reconnu et sans variante, par
          exemple), plutôt que de montrer un tableau vide. */}
      {briefRows.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 py-10">
          <SectionTitle>{t("briefTitle")}</SectionTitle>
          <dl className="mt-5 divide-y divide-border rounded-2xl border border-border/70 bg-card">
            {briefRows.map((row) => (
              <div key={row.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <dt className="font-semibold text-deep">{row.label}</dt>
                <dd className="text-right text-foreground/85">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* --- Rappel du bouton d'achat ---------------------------------------
          Après plusieurs sections de lecture, le prix et le bouton d'achat
          sont loin au-dessus — surtout sur mobile, où le bloc d'achat n'est
          pas collant (voir la grille plus haut). Un renvoi ancré plutôt qu'un
          second `AddToCart` : dupliquer le composant client dupliquerait
          aussi ses mesures (`view_item`, `add_to_cart`), ce qui compterait la
          même visite deux fois côté GA4/Meta. */}
      <section className="mx-auto max-w-4xl px-6 pb-10">
        <Link
          href={`${product.href}#acheter-produit`}
          aria-label={t("reminderAria", { name: product.name })}
          className="kk-fill kk-fill-deep group flex items-center justify-between gap-4 rounded-full bg-deep px-6 py-4 text-primary-foreground"
        >
          <span className="text-sm font-semibold">{product.name}</span>
          <span className="figure flex shrink-0 items-center gap-2 text-sm font-semibold">
            {formatFcfa(product.priceFcfa)}
            <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
          </span>
        </Link>
      </section>

      {/* Les avis AVANT les produits associés : ils portent sur le produit
          qu'on regarde, alors que le rail propose d'aller voir ailleurs. */}
      <ProductReviews productId={product.id} reviews={reviews} />

      {related.length > 0 && (
        <ProductRail
          eyebrow={t("relatedEyebrow")}
          title={t("relatedTitle")}
          action={t("relatedAction")}
          products={related}
        />
      )}
    </>
  );
}
