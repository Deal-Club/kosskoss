import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/dal";
import { isLegalSlug, LEGAL_LOCALES, LEGAL_SLUG_LABELS } from "@/content/legal";
import type { LegalLocale } from "@/content/legal/types";
import { getLegalPageVersion } from "@/server/legalPages";
import { toLegalPageInput } from "@/server/legalPageInput";
import { LegalPageForm, type LegalPageFormData } from "@/components/admin/LegalPageForm";

export default async function EditLegalPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();

  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();

  // Les deux langues sont chargées d'un coup : l'éditeur bascule d'un onglet à
  // l'autre sans aller-retour serveur, et sans perdre une saisie en cours.
  const loaded = await Promise.all(
    LEGAL_LOCALES.map(async (locale) => [locale, await getLegalPageVersion(slug, locale)] as const),
  );

  const versions = {} as Record<LegalLocale, LegalPageFormData>;
  for (const [locale, version] of loaded) {
    versions[locale] = {
      content: toLegalPageInput(version.page),
      customized: version.customized,
      updatedAt: version.updatedAt?.toISOString() ?? null,
      updatedBy: version.updatedBy,
    };
  }

  return (
    <div>
      <Link href="/admin/pages" className="text-sm font-semibold text-primary hover:underline">
        ← Retour aux pages
      </Link>

      <h1 className="mt-2 text-2xl font-black text-foreground">{LEGAL_SLUG_LABELS[slug]}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sélectionnez du texte puis utilisez <strong className="font-bold">B</strong> ou{" "}
        <em>I</em> pour le mettre en forme. L&apos;aperçu sous chaque champ montre le rendu exact de
        la boutique.
      </p>

      <LegalPageForm slug={slug} label={LEGAL_SLUG_LABELS[slug]} versions={versions} />
    </div>
  );
}
