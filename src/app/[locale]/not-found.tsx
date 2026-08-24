import { getTranslations } from "next-intl/server";
import { LocalizedLink as Link } from "@/components/kk/localized-link";

/**
 * Page 404 de la boutique.
 *
 * Sans elle, une adresse inconnue rendait l'écran par défaut de Next.js :
 * anglais, sans marque, sans issue. Or une 404 n'est pas rare — un lien
 * partagé qui vieillit, un produit retiré, une faute de frappe — et c'est
 * souvent la première page qu'un visiteur voit du site.
 *
 * Elle propose donc trois issues plutôt qu'un constat : le catalogue, le
 * diagnostic, l'accueil. Une page qui dit seulement « introuvable » renvoie le
 * visiteur au moteur de recherche, c'est-à-dire chez un concurrent.
 */
export default async function PageIntrouvable() {
  const t = await getTranslations("erreur");

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-deep">{t("introuvableTitre")}</h1>
      <p className="lead mt-4">{t("introuvableTexte")}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/soins-visage"
          className="kk-fill rounded-full bg-deep px-7 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          {t("versCatalogue")}
        </Link>
        <Link
          href="/diagnostic"
          className="rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-deep"
        >
          {t("versDiagnostic")}
        </Link>
        <Link href="/" className="px-4 py-3.5 text-sm font-semibold text-deep underline">
          {t("accueil")}
        </Link>
      </div>
    </main>
  );
}
