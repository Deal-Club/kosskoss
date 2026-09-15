import Image from "next/image";
import {
  ChevronRight,
  Check,
  Heart,
  ScanFace,
  SunMoon,
  Sun,
  Moon,
  Layers,
  ClipboardList,
  ShieldCheck,
  Award,
  Info,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { KKProductDetail } from "@/server/kk/product";
import { BADGE_LABEL } from "@/lib/kk/badges";
import { PREOCCUPATIONS, TYPES_DE_PEAU, libellesPourTags } from "@/lib/kk/besoins";
import { formatFcfa, formatProductTitle } from "@/lib/kk/format";
import { getRoutinesForProduct } from "@/server/kk/routines";
import { getEnabledPaymentMethods } from "@/server/kk/payments";
import type { KKProductView } from "@/types/kk";
import type { Locale } from "@/i18n/routing";
import { BottleMotif, Petal } from "./motifs";
import { LocalizedLink as Link } from "./localized-link";
import { AddToCart } from "./add-to-cart";
import { RoutineAddToCart } from "./routine-add";
import { tintClass } from "./routine-card";
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
          il suit le pointeur, ce que la fiche - rendue sur le serveur - ne peut
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
          monogramme. Ce n'étaient pas des photos du produit - c'étaient des
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

/**
 * Ligne d'une grappe d'information - « Pourquoi vous allez l'aimer », « Est-ce
 * pour ma peau ? », « Comment l'utiliser ? », « Le Choix KossKoss Select ? »,
 * « En bref » regroupées sous UN SEUL panneau plutôt qu'en bandes plein écran
 * empilées.
 *
 * ── POURQUOI CE REGROUPEMENT ─────────────────────────────────────────────
 * Des bandes successives, chacune son titre-pastille et sa largeur max-w-7xl,
 * se lisaient comme des répétitions du même gabarit - un défilement long où
 * rien ne distinguait « ce qu'il faut savoir » de la suite. Rassemblées dans
 * un seul cadre à accordéon, elles deviennent UNE réponse structurée à
 * « qu'est-ce que j'ai besoin de savoir ? », que le visiteur ouvre ligne par
 * ligne au lieu de tout faire défiler. La première ligne renseignée s'ouvre
 * par défaut (`open`) : la grappe n'apparaît jamais entièrement fermée.
 *
 * Reste HORS de cette grappe : « Complétez votre routine » (des cartes
 * produit, pas du texte - un autre registre visuel).
 */
function DetailRow({
  icon: Icon,
  title,
  open = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className="group px-6 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl open:bg-sand/50"
    >
      {/* Trois signaux d'état ouvert, pas un seul : le fond de ligne
          (`open:bg-sand/50` ci-dessus), la pastille d'icône qui passe au vert
          profond plein - même bascule que les boutons de variante actifs
          (`add-to-cart.tsx`) -, et le chevron qui prend la même teinte. Un
          survol au clavier/tactile qui manquerait le fond (contraste faible
          en plein soleil, p. ex.) retrouve l'état par l'icône ou la rotation. */}
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-deep marker:content-none">
        <span className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-deep transition-colors group-open:bg-deep group-open:text-primary-foreground">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          {title}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 group-open:text-deep" />
      </summary>
      <div className="mt-3 pl-[2.375rem] text-sm leading-relaxed text-foreground/85">{children}</div>
    </details>
  );
}

/**
 * En-tête d'une section pleine largeur du corps de fiche (« Pourquoi vous
 * allez l'aimer », « Est-ce pour ma peau ? »…). Reprend l'échelle de titres du
 * site (chapitre 1 du document de structure) : aucune taille posée en dur ici.
 *
 * L'icône est décorative (`aria-hidden`) : le titre se suffit. Elle est
 * dessinée au trait dans une pastille sable - le registre d'accents de la
 * charte -, jamais un emoji : les emoji changent de dessin d'un appareil à
 * l'autre et sortent du ton de la marque.
 */
function SectionTitle({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      {Icon && (
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-deep"
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <h2 className="text-deep">{children}</h2>
    </div>
  );
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
  const tRoutine = await getTranslations("routine");

  // Ligne de préoccupations (haut de fiche) et tableau « en bref » puisent
  // dans les MÊMES tags - voir `lib/kk/besoins.ts`. Un produit dont le master
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
  // active, triée par position) - voir `AddToCart`, qui la préselectionne à
  // l'identique. Un produit sans variante n'a simplement pas de ligne Format :
  // aucune valeur n'existe pour lui en base, en inventer une serait mentir.
  const referenceVariant = product.variants[0];
  // « Utilisation » résume Matin/Soir en une valeur - mêmes libellés que la
  // section « Comment l'utiliser ? » juste au-dessus (`morningLabel` /
  // `eveningLabel`), jamais une troisième formulation inventée ici.
  const usageSummary = [product.usageMatin && t("morningLabel"), product.usageSoir && t("eveningLabel")]
    .filter((v): v is string => Boolean(v))
    .join(t("briefUsageJoiner"));
  const briefRows: { label: string; value: string }[] = [
    besoinLabels.length > 0 && { label: t("briefNeedLabel"), value: besoinLabels.join(" / ") },
    peauLabels.length > 0 && { label: t("briefSkinLabel"), value: peauLabels.join(" / ") },
    product.zone && { label: t("briefZoneLabel"), value: product.zone },
    product.actifsCles && { label: t("briefActionLabel"), value: product.actifsCles },
    usageSummary && { label: t("briefUsageLabel"), value: usageSummary },
    product.frequence && { label: t("briefFrequenceLabel"), value: product.frequence },
    product.cible && { label: t("briefTargetLabel"), value: product.cible },
    referenceVariant && { label: t("briefFormatLabel"), value: referenceVariant.label },
    { label: t("briefPriceLabel"), value: formatFcfa(referenceVariant?.priceFcfa ?? product.priceFcfa) },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  // Grappe « En savoir plus » - voir le commentaire de `DetailRow` : quatre
  // sections plein écran (« Est-ce pour ma peau ? », « Comment l'utiliser ? »,
  // « Le Choix KossKoss Select ? », « En bref ») rassemblées sous un seul
  // panneau à accordéon, plutôt que quatre bandes empilées qui se lisaient
  // comme une répétition du même gabarit. Un tableau, pas quatre `&&` en
  // JSX : c'est lui qui décide laquelle s'ouvre par défaut (`i === 0`) et si
  // le panneau existe du tout - un produit sans aucun des quatre champs
  // (encore non enrichi par le master) n'affiche pas de panneau vide.
  type DetailRowSpec = { key: string; icon: LucideIcon; title: string; content: React.ReactNode };
  const detailRows = [
    // « Pourquoi vous allez l'aimer » - anciennement une section à part,
    // toujours visible sans clic ; déplacée dans le panneau « En savoir
    // plus » à la demande du client.
    product.bullets.length > 0 && {
      key: "whyLove",
      icon: Heart,
      title: t("whyLoveTitle"),
      content: (
        <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {product.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-deep" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      ),
    },
    product.idealPour && {
      key: "ideal",
      icon: ScanFace,
      title: t("idealForTitle"),
      content: <>{product.idealPour}</>,
    },
    (product.usageMatin ||
      product.usageSoir ||
      product.frequence ||
      product.conseilKossKoss ||
      product.precautions) && {
      key: "usage",
      icon: SunMoon,
      title: t("howToUseTitle"),
      content: (
        <>
          {(product.usageMatin || product.usageSoir) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {product.usageMatin && (
                <p>
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-deep">
                    <Sun className="h-3.5 w-3.5 shrink-0 text-gold-ink" strokeWidth={1.75} aria-hidden="true" />
                    {t("morningLabel")}
                  </span>
                  <span className="mt-1 block">{product.usageMatin}</span>
                </p>
              )}
              {product.usageSoir && (
                <p>
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-deep">
                    <Moon className="h-3.5 w-3.5 shrink-0 text-gold-ink" strokeWidth={1.75} aria-hidden="true" />
                    {t("eveningLabel")}
                  </span>
                  <span className="mt-1 block">{product.usageSoir}</span>
                </p>
              )}
            </div>
          )}
          {/* Fréquence - même libellé que la ligne « En bref »
              (`briefFrequenceLabel`), jamais reformulé ici. */}
          {product.frequence && (
            <p className={product.usageMatin || product.usageSoir ? "mt-4" : ""}>
              <span className="font-semibold text-deep">{t("briefFrequenceLabel")} :</span> {product.frequence}
            </p>
          )}
          {product.conseilKossKoss && (
            <p
              className={`rounded-xl bg-sand/60 p-4 ${
                product.usageMatin || product.usageSoir || product.frequence ? "mt-4" : ""
              }`}
            >
              <span className="font-semibold text-deep">{t("kosskossAdviceLabel")}</span> {product.conseilKossKoss}
            </p>
          )}
          {/* Précautions - modèle client. Le champ existe en base depuis le
              lot 7A mais n'était encore ni sélectionné ni affiché : donnée
              dormante, pas nouvelle. */}
          {product.precautions && (
            <p className="mt-3 text-muted-foreground">
              <span className="font-semibold text-deep">{t("precautionsLabel")}</span> {product.precautions}
            </p>
          )}
        </>
      ),
    },
    // « Le Choix KossKoss Select ? » - pourquoi L'ÉQUIPE l'a choisi, distinct
    // d'« Est-ce pour ma peau ? » (à qui il s'adresse). `product.pourquoiKossKoss`
    // - voir la note du champ dans prisma/schema.prisma. Vide tant que le
    // master ne l'a pas renseigné.
    product.pourquoiKossKoss && {
      key: "chosen",
      icon: Award,
      title: t("chosenTitle"),
      content: <>{product.pourquoiKossKoss}</>,
    },
    // « En bref » - même contenu que `briefRows`, en tableau serré : reprend
    // ici ce qui est dit en prose dans les lignes précédentes (besoin, peau,
    // zone, actifs, usage, fréquence, cible, format, référence, EAN, prix),
    // jamais redemandé au client. `-mx`/`-mt` neutralisent le padding de
    // `DetailRow` : le tableau va bord à bord avec le panneau qui le contient,
    // comme il allait bord à bord avec sa propre carte avant le regroupement.
    briefRows.length > 0 && {
      key: "brief",
      icon: ClipboardList,
      title: t("briefTitle"),
      content: (
        <dl className="-mx-[1.65rem] -mb-4 -mt-3 divide-y divide-border">
          {briefRows.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-6 py-3 text-sm">
              <dt className="font-semibold text-deep">{row.label}</dt>
              <dd className="text-right text-foreground/85">{row.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ].filter(Boolean) as DetailRowSpec[];

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
              {/* Mêmes couleurs que sur la vignette - vert profond pour la
                  meilleure vente, laiton pour la nouveauté. Le badge était ici
                  en `bg-sand` quel que soit son sens : un client qui reconnaît
                  une pastille verte dans la grille ne devait pas la retrouver
                  beige sur la fiche. */}
              {product.badge && (
                <span
                  className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    product.badge === "bestseller"
                      ? "bg-deep text-primary-foreground"
                      : "bg-gold text-deep"
                  }`}
                >
                  {BADGE_LABEL[product.badge][locale === "en" ? "en" : "fr"]}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {product.brand}
              </p>
              {/* Le h1 global démarre à 2,5 rem (40 px) - une taille pensée
                  pour un titre de page court, pas pour un nom de produit.
                  « Crème solaire au riz et probiotiques » dans les 286 px
                  utiles d'un téléphone y tenait sur cinq lignes et occupait à
                  lui seul le tiers du premier écran, repoussant le prix et le
                  bouton d'achat hors de vue.
                  Il redescend à 1,35 rem sur mobile et retrouve progressivement
                  sa taille : le nom reste la tête de série de la fiche, il
                  cesse d'en être le contenu principal. */}
              {/* Contenance intégrée AU TITRE (« ... - 50 ml »), demande
                  client - voir `formatProductTitle`. Même variante de
                  référence que la ligne Format du tableau « en bref »
                  ci-dessous et que la présélection du bloc d'achat. */}
              <h1 className="mt-2 text-[1.35rem] leading-tight text-deep sm:text-[1.6rem] lg:text-[1.85rem]">
                {formatProductTitle(product.name, referenceVariant?.label)}
              </h1>

              {/* Puce de traçabilité - modèle client : n'affirme « EAN
                  traçable » que lorsqu'un EAN validé existe réellement (voir
                  `isValidGtin`, src/server/kk/master.ts) ; l'annoncer sans
                  donnée serait une allégation trompeuse (Code de la
                  consommation, comme pour la note moyenne - voir
                  `KKReviewsSummary` dans src/types/kk.ts). */}
              {product.gtin && (
                <p className="mt-2 flex items-center gap-1.5 text-base font-medium text-green-700">
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("authenticityBadge")}
                </p>
              )}

              {/* Question d'accroche - le problème que le visiteur se pose
                  avant de lire la solution juste en dessous. Même style que
                  la description courte juste après - retour client : trop de
                  tailles/graisses différentes dans le bloc d'achat (badge,
                  marque, titre, traçabilité, accroche, description...). Deux
                  styles suffisent ici : le petit texte (badge, marque,
                  traçabilité, livraison, réf/stock) et ce texte courant. */}
              {product.problemeAccroche && (
                <p className="mt-3 text-base leading-relaxed text-foreground/85">
                  {product.problemeAccroche}
                </p>
              )}

              {/* Solution en une phrase. */}
              {product.shortDescription && (
                <p className="mt-3 text-base leading-relaxed text-foreground/85">
                  {product.shortDescription}
                </p>
              )}

              <div className="mt-6">
                <AddToCart product={product} />
              </div>

              {/* Mentions de livraison et de paiement - factuelles et
                  communes à tout le catalogue (voir TARGET.md : la livraison
                  est coordonnée par WhatsApp, sans zone ni délai calculé), pas
                  un champ du master. Les moyens de paiement viennent du
                  back-office (`getEnabledPaymentMethods`) : les citer en dur
                  aurait désynchronisé cette ligne du réglage réel dès la
                  première désactivation d'un moyen de paiement. */}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                · {t("deliveryMention")}
                {paymentMethods.length > 0 && (
                  <>
                    <br />· {t("paymentMention", { methods: paymentMethods.map((m) => m.label).join(", ") })}
                  </>
                )}
              </p>

              {/* La description longue est descendue tout en bas de la fiche
                  (dernier bloc, après avis et produits associés) - retour
                  client : elle encombrait le bloc d'achat, qui doit rester
                  court (prix, CTA, livraison) plutôt que porter le premier
                  pavé de texte de la page. */}

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
         n'apprenait rien sur le produit qu'on est en train de regarder - le
         même propos est tenu à sa place sur l'accueil et sur /marques. */}

      {/* --- En savoir plus ---------------------------------------------------
          « Pourquoi vous allez l'aimer », « Est-ce pour ma peau ? », « Comment
          l'utiliser ? », « Le Choix KossKoss Select ? » et « En bref » : cinq
          bandes plein écran rassemblées en UN SEUL panneau à accordéon - voir
          `DetailRow` et le tableau `detailRows` plus haut pour le raisonnement
          complet. « Pourquoi vous allez l'aimer » vivait à part, toujours
          visible sans clic ; repliée ici dans l'accordéon à la demande du
          client. Placé avant « Complétez votre routine » (des cartes produit,
          un autre registre visuel que ce panneau de texte). */}
      {detailRows.length > 0 && (
        <section className="border-t border-border/60 bg-sand/40">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <SectionTitle icon={Info}>{t("moreInfoTitle")}</SectionTitle>
            <div className="mt-6 divide-y divide-border rounded-2xl border border-border/70 bg-card">
              {detailRows.map((row, i) => (
                <DetailRow key={row.key} icon={row.icon} title={row.title} open={i === 0}>
                  {row.content}
                </DetailRow>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- Complétez votre routine ---------------------------------------
          Un produit peut appartenir à plusieurs routines (par exemple un
          nettoyant repris en version Éco et en version Premium) : elles sont
          TOUTES montrées, plutôt qu'une seule choisie arbitrairement - voir
          le rapport du lot 7D.

          Fond CLAIR : la section précédente (« En savoir plus ») est déjà sur
          sable - deux bandes sable consécutives fusionnent en un seul aplat
          sans coupure visible, le filet du haut ne suffit pas à les
          distinguer. L'alternance clair/sable reprend ici. */}
      {routines.length > 0 && (
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <SectionTitle icon={Layers}>{t("completeRoutineTitle")}</SectionTitle>
            {/* Grille à deux colonnes dès `sm` : un produit dans deux
                routines (version Éco + Premium, par exemple) les montre côte
                à côte plutôt qu'empilées. Étirement par défaut de la grille
                (pas de `items-start`) - retour client : les cartes doivent
                toutes avoir la même taille, même si leurs routines n'ont pas
                le même nombre d'étapes. */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {/* Teinte de la routine (`routine.tint`), pas `bg-card` neutre :
                  c'est le même repère de couleur qui identifie chaque routine
                  sur l'accueil et sur sa propre page (voir `tintClass`,
                  routine-card.tsx). Deux routines côte à côte ici se
                  distinguent donc au coup d'œil, sans couleur inventée pour
                  l'occasion. */}
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className={`flex flex-col rounded-2xl border border-border/70 p-6 ${tintClass(routine.tint)}`}
                >
                  {/* `flex-1` - le bouton d'achat qui suit doit s'aligner sur
                      la même ligne d'une carte à l'autre, quel que soit le
                      nombre d'étapes de chaque routine : ce bloc absorbe
                      l'écart de hauteur, le bouton garde un écart constant. */}
                  <div className="flex-1">
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
                              {step.product.brand} · {step.product.name}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {/* Prix total + achat direct sur la même ligne - retour
                      client. Le bouton envoie directement au paiement, pas
                      vers la page de la routine : même bouton que les
                      vignettes de routine de l'accueil (`RoutineAddToCart`,
                      mode="achat") - dépose tous les produits au panier puis
                      file au tunnel. Hors du bloc `flex-1` ci-dessus : avec
                      des cartes de même taille, une routine à deux étapes et
                      une à cinq laissaient cette ligne à deux hauteurs
                      différentes ; elle est maintenant alignée d'une carte à
                      l'autre. */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-deep">
                      {tRoutine("priceFrom", { value: formatFcfa(routine.totalFcfa) })}
                    </p>
                    <RoutineAddToCart routine={routine} mode="achat" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- Relance Diagnostic Beauté ---------------------------------------
          Modèle client : « Vous hésitez sur le soin adapté à votre peau ? »
          suivi de [Faire le quiz beauté]. Le rappel du bouton d'achat
          (`BuyNowReminder`) qui suivait ce bloc est retiré - retour client :
          doublon du bouton d'achat déjà présent en haut de fiche. */}
      <section className="mx-auto max-w-7xl px-6 pb-10 text-center">
        <p className="text-sm text-muted-foreground">
          {t("quizPrompt")}{" "}
          <Link href="/diagnostic" className="font-semibold text-deep kk-underline">
            {t("quizCta")}
          </Link>
        </p>
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
