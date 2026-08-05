import { getLocale, getTranslations } from "next-intl/server";
import { Phone, Search, User } from "lucide-react";
import { Link, getPathname } from "@/i18n/navigation";
import { CategoryMenu } from "@/components/CategoryMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/brand/Logo";
import { CartIndicator } from "@/components/cart/CartIndicator";
import { WishlistIndicator } from "@/components/wishlist/WishlistIndicator";
import { categoryGroups } from "@/data/categoryNav";
import { COMPANY } from "@/content/legal";
import type { Locale } from "@/i18n/routing";

// Numéro composable : COMPANY.phone est mis en forme pour la lecture, le lien
// « tel: » le veut sans espaces.
const TEL_HREF = `tel:+${COMPANY.phone.replace(/\D/g, "")}`;

/**
 * En-tête de la boutique.
 *
 * Fond clair — aubier, pas écorce — pour que la coupure avec le hero sombre
 * soit nette au lieu de noyer trois bandeaux bruns les uns sous les autres.
 * La braise ne sert plus qu'aux accents qui doivent vraiment attirer l'œil :
 * le bouton de recherche, le prix, le nom de marque.
 *
 * L'en-tête entier reste fixé en haut de l'écran pendant tout le défilement,
 * barre de service comprise : sur ce catalogue, le délai et le numéro doivent
 * rester joignables à tout moment, pas seulement en haut de page.
 *
 * Le téléphone est traité comme un bouton et pas comme une mention : dans ce
 * métier, une commande sur deux se conclut par un appel.
 */
export async function Header() {
  const t = await getTranslations("header");
  const common = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  // Chemin absolu et déjà préfixé par la langue : un <form> a besoin d'une
  // chaîne, pas d'un <Link>, qui résout ça lui-même au clic.
  const searchAction = getPathname({ href: "/recherche", locale });

  const essenzen = categoryGroups.flatMap((group) => group.items);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-[#150e0b] text-[0.72rem] text-white/65">
        <div className="mx-auto flex max-w-screen-xl items-center gap-5 px-4 py-1.5">
          {/* Choix de la langue : dans la barre de service pour rester visible
              en permanence, desktop comme mobile, sans encombrer la rangée
              d'icônes juste en dessous. */}
          <LanguageSwitcher tone="light" className="ml-auto shrink-0" />
        </div>
      </div>

      {/* Pas de filet en bas : la bande des catégories est noire et le tracerait
          en clair juste sous elle. L'ombre portée suffit à détacher l'en-tête. */}
      <div className="shadow-[0_1px_12px_rgba(27,19,16,0.08)]">
        <div className="bg-splint text-foreground">
          <div className="mx-auto flex max-w-screen-xl flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap lg:gap-6">
            {/* Le menu déroulant ne sert qu'en dessous de « lg » : au-delà, la
                rangée des types de bois affiche déjà tout le catalogue. */}
            <div className="lg:hidden">
              <CategoryMenu />
            </div>

            <Link
              href="/"
              aria-label={t("homeAriaLabel")}
              className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <Logo tone="dark" priority />
            </Link>

            {/* La recherche ne prend pas toute la largeur disponible : au-delà
                de 32 rem elle écrase le reste sans rien gagner en utilité. */}
            <div className="hidden max-w-lg flex-1 sm:block">
              <SearchField
                placeholder={common("searchPlaceholder")}
                label={t("search")}
                action={searchAction}
              />
            </div>

            {/* Appel direct : cible tactile pleine, numéro lisible sur grand
                écran, icône seule sur mobile. */}
            <a
              href={TEL_HREF}
              className="ml-auto hidden items-center gap-2.5 rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted md:flex"
            >
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span className="leading-tight">
                <span className="messwert block text-sm font-bold text-foreground">
                  {COMPANY.phone}
                </span>
                <span className="block text-[0.66rem] text-muted-foreground">
                  {t("beratung")}
                </span>
              </span>
            </a>

            <nav className="ml-auto flex items-center gap-3 text-[0.7rem] md:ml-6 md:gap-4">
              {/* Sur téléphone, appeler est l'action la plus probable : le
                  numéro reste accessible même quand le bloc d'appel complet
                  n'a plus la place de s'afficher. */}
              <a
                href={TEL_HREF}
                aria-label={t("anrufenAria", { nummer: COMPANY.phone })}
                className="flex flex-col items-center gap-1 rounded-sm transition-colors hover:text-primary md:hidden"
              >
                <Phone className="h-5 w-5" />
              </a>
              {/* Espace client. La cible est toujours « /compte » : cette page rend
                  le tableau de bord au client connecté et renvoie les autres vers
                  « /compte/connexion » (requireCustomer). Lire le cookie de session
                  ici forcerait le rendu dynamique de tout le catalogue, qui est
                  prérendu — le lien resterait juste, mais les fiches produits
                  perdraient leur rendu statique. */}
              <Link
                href="/compte"
                prefetch={false}
                className="flex flex-col items-center gap-1 rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{common("account")}</span>
              </Link>
              {/* Comme le panier, la liste de souhaits vit dans le navigateur */}
              <WishlistIndicator className="flex flex-col items-center gap-1 transition-colors hover:text-primary" />
              {/* Le compteur d'articles vit côté client : le panier est en localStorage */}
              <CartIndicator className="relative flex flex-col items-center gap-1 transition-colors hover:text-primary" />
            </nav>
          </div>

          {/* En dessous de « sm », la recherche passe sur sa propre ligne
              plutôt que de rétrécir jusqu'à l'illisible. */}
          <div className="mx-auto max-w-screen-xl px-4 pb-3 sm:hidden">
            <SearchField
              placeholder={common("searchPlaceholder")}
              label={t("search")}
              action={searchAction}
            />
          </div>
        </div>

        {/* Rangée des types de bois. Défilable au doigt sur mobile : sans
            elle, un visiteur au téléphone devait ouvrir un menu pour voir
            qu'on vend du hêtre.
            Tant que le catalogue est vide, la bande ne s'affiche pas : un
            bandeau ne portant qu'un lien perdu à droite ferait un trou entre
            l'en-tête et le hero. */}
        {essenzen.length > 0 && (
          <div className="bg-footer">
            <div className="mx-auto flex max-w-screen-xl items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {essenzen.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-[0.82rem] font-bold whitespace-nowrap text-white transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  {common(`categoryNames.${item.slug}`)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Champ de recherche : même balisage aux deux emplacements, un seul endroit à
 * corriger. Un <form> qui pointe vers /recherche en GET — la recherche
 * fonctionne donc sans JavaScript, y compris au clavier (Entrée soumet).
 */
function SearchField({
  placeholder,
  label,
  action,
}: {
  placeholder: string;
  label: string;
  action: string;
}) {
  return (
    <form
      action={action}
      role="search"
      className="flex h-10 items-stretch overflow-hidden rounded-md border border-border"
    >
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        aria-label={label}
        className="w-full flex-1 border-0 bg-white px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        aria-label={label}
        className="flex items-center justify-center bg-primary px-4 text-primary-foreground transition-[filter] hover:brightness-110"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
