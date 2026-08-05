import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { requireAdminSession } from "@/lib/dal";
import { LEGAL_SLUG_LABELS } from "@/content/legal";
import type { LegalLocale } from "@/content/legal/types";
import { listLegalPageSummaries } from "@/server/legalPages";

/**
 * Liste des pages légales et informatives.
 *
 * La colonne qui compte est « État » : elle dit, pour chaque langue, si la page
 * affiche encore le texte livré avec le site ou une version réécrite depuis
 * l'administration — et par qui.
 */

const LOCALES: readonly LegalLocale[] = ["fr", "en"];
const LOCALE_LABELS: Record<LegalLocale, string> = { fr: "FR", en: "EN" };

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminPagesPage() {
  await requireAdminSession();
  const pages = await listLegalPageSummaries();

  const customizedCount = pages.filter((page) =>
    LOCALES.some((locale) => page.versions[locale].customized),
  ).length;

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <FileText className="mt-1 h-6 w-6 shrink-0 text-primary" />
        <div>
          <h1 className="text-2xl font-black text-foreground">Pages &amp; mentions légales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les {pages.length} pages du pied de page : mentions légales, conditions de vente,
            protection des données, informations sur l&apos;entreprise. Une modification publiée est
            visible sur la boutique immédiatement.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-white">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              <th className="px-4 py-3 font-black text-foreground">Page</th>
              <th className="px-4 py-3 font-black text-foreground">Adresse</th>
              <th className="px-4 py-3 font-black text-foreground">État</th>
              <th className="px-4 py-3 font-black text-foreground">Dernière modification</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pages.map(({ slug, versions }) => {
              // La modification la plus récente, toutes langues confondues.
              const lastEdit = LOCALES.map((locale) => versions[locale])
                .filter((version) => version.updatedAt)
                .sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime())[0];

              return (
                <tr key={slug} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pages/${slug}`}
                      className="font-bold text-foreground hover:text-primary"
                    >
                      {LEGAL_SLUG_LABELS[slug]}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {versions.fr.page.sections.length} sections
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">/{slug}</td>

                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {LOCALES.map((locale) => (
                        <span
                          key={locale}
                          title={
                            versions[locale].customized
                              ? `${LOCALE_LABELS[locale]} : contenu réécrit dans l'administration`
                              : `${LOCALE_LABELS[locale]} : contenu d'origine, jamais modifié`
                          }
                          className={
                            versions[locale].customized
                              ? "rounded-sm bg-primary/15 px-2 py-1 text-[11px] font-black text-primary"
                              : "rounded-sm bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground"
                          }
                        >
                          {LOCALE_LABELS[locale]}{" "}
                          {versions[locale].customized ? "personnalisée" : "d'origine"}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {lastEdit?.updatedAt ? (
                      <>
                        {formatDate(lastEdit.updatedAt)}
                        <span className="mt-0.5 block truncate" title={lastEdit.updatedBy ?? ""}>
                          {lastEdit.updatedBy}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/pages/${slug}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {customizedCount === 0
          ? "Aucune page n'a encore été modifiée : toutes affichent le texte livré avec le site."
          : `${customizedCount} page(s) réécrite(s) depuis l'administration. Les autres affichent le texte livré avec le site.`}{" "}
        Une page réécrite peut être ramenée à son contenu d&apos;origine à tout moment depuis son
        formulaire.
      </p>
    </div>
  );
}
